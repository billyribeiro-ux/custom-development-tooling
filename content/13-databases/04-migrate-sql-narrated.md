# Worked Example: migrate.sql Narrated

Let's read a complete migration file: `examples/sql/migrate.sql`. It's migration `0001` — the one that creates the initial schema for a tiny blog (authors and posts). Every SQL and migration concept from this module appears here, in a file you can actually run.

> [!DOGFOOD]
> Run it via the migration runner: `node examples/node/migrate.mjs`. The runner reads this `.sql` file and applies it. Open `examples/sql/migrate.sql` alongside this lesson.

## The header

```sql title=migrate.sql
-- =============================================================================
-- migrate.sql — an example database migration.
-- This file is migration 0001: it creates the initial tables for a tiny blog app.
-- =============================================================================
```

A comment block explaining what this migration does (Module 1.1). SQL comments start with `--`. Stating the migration's *number and purpose* up front is good practice — it's the "story" entry for this step of the schema's history (Module 13.1).

## The authors table

```sql title=migrate.sql
CREATE TABLE IF NOT EXISTS authors (
  id         INTEGER PRIMARY KEY,
  email      TEXT    NOT NULL UNIQUE,
  name       TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

Line by line, applying Module 13.2:

- **`CREATE TABLE IF NOT EXISTS`** — idempotent DDL (Module 13.2, 13.3). Re-running won't error if the table already exists. Belt-and-suspenders alongside the runner's tracking (Module 13.3).
- **`id INTEGER PRIMARY KEY`** — each author gets a unique id. (A comment in the file notes the Postgres equivalent is `GENERATED ALWAYS AS IDENTITY` — same idea, different dialect.)
- **`email TEXT NOT NULL UNIQUE`** — required *and* unique. The `UNIQUE` constraint makes duplicate emails *impossible at the database level* (Module 13.2) — which is exactly what lets the seed script use `ON CONFLICT(email) DO NOTHING` for idempotency (Module 5.6).
- **`name TEXT NOT NULL`** — required.
- **`created_at TEXT NOT NULL DEFAULT (datetime('now'))`** — auto-filled with the current time if not provided. (The file notes Postgres would use `TIMESTAMPTZ DEFAULT now()` — SQLite stores timestamps as text.)

## The posts table

```sql title=migrate.sql
CREATE TABLE IF NOT EXISTS posts (
  id         INTEGER PRIMARY KEY,
  author_id  INTEGER NOT NULL,
  title      TEXT    NOT NULL,
  slug       TEXT    NOT NULL UNIQUE,
  body       TEXT    NOT NULL DEFAULT '',
  published  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (author_id) REFERENCES authors (id) ON DELETE CASCADE
);
```

The interesting parts:

- **`author_id INTEGER NOT NULL`** + the **`FOREIGN KEY`** at the bottom — links each post to a real author (Module 13.2). `REFERENCES authors (id)` means a post's `author_id` *must* match an existing author. `ON DELETE CASCADE` means deleting an author automatically deletes their posts — no orphaned rows.
- **`slug TEXT NOT NULL UNIQUE`** — the URL-safe identifier (like `notes-on-the-engine`). `UNIQUE` so two posts can't share a slug — and again, this is what makes the seed's `ON CONFLICT(slug) DO NOTHING` work (Module 5.6).
- **`published INTEGER NOT NULL DEFAULT 0`** — a comment notes *SQLite has no boolean type*, so the `0`/`1` integer idiom represents false/true. A small but important cross-database difference (Module 1.3 portability).
- **`body TEXT NOT NULL DEFAULT ''`** — required but defaults to empty, so you can create a draft with just a title.

## The index

```sql title=migrate.sql
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts (author_id);
```

An index (Module 13.2) on `author_id` — the column we filter by most ("show me this author's posts"). Without it, that query scans every post; with it, the database jumps straight to the matches. Note `IF NOT EXISTS` again for idempotency. The comment in the file explains exactly this trade-off — indexing the column you query by is a deliberate performance choice (feedback-loop speed at the data layer, Module 1.2).

## How it all fits the migration model

This file is migration `0001` (Module 13.1) — the *source* from which the schema *artifact* is derived (Module 1.3). Reading it tells the schema's origin story: "we created authors, then posts (each owned by an author), then indexed posts by author." It's:

- **Idempotent** — every statement uses `IF NOT EXISTS` (Module 13.3).
- **Constrained** — `NOT NULL`, `UNIQUE`, `FOREIGN KEY` enforce integrity at the database level (Module 13.2).
- **Portable-minded** — comments note the Postgres equivalents, so you could adapt it (Module 1.3).
- **Run atomically** — the *runner* (Module 13.5) wraps it in a transaction, so it fully applies or not at all (Module 13.3).

## SQLite vs Postgres dialect notes

The file targets SQLite (so the runnable `migrate.mjs` needs no database server), but flags the dialect differences:

| Concept | SQLite (this file) | PostgreSQL |
| --- | --- | --- |
| Auto-increment id | `INTEGER PRIMARY KEY` | `GENERATED ALWAYS AS IDENTITY` |
| Timestamp | `TEXT DEFAULT (datetime('now'))` | `TIMESTAMPTZ DEFAULT now()` |
| Boolean | `INTEGER` (0/1) | `BOOLEAN` (true/false) |

The *shape* of the migration — tables, constraints, foreign keys, indexes — is identical across databases; only these surface details differ. Learn the shape and you can write migrations for any SQL database (the same "good design transcends the specific tool" theme as Module 6.4).

> [!TRY]
> Run `node examples/node/migrate.mjs` — it applies this migration. Then open the resulting database (`sqlite3 /tmp/course-app.db ".schema"` if you have the SQLite CLI) and see the exact tables this file created. Run the migrate command again and watch it say "up to date" — the runner's idempotency (Module 13.5) in action.

> [!KEY]
> - `migrate.sql` is migration **0001**, creating `authors` and `posts` — the schema's origin story (Module 13.1).
> - It uses **idempotent DDL** (`CREATE TABLE/INDEX IF NOT EXISTS`), **constraints** (`NOT NULL`, `UNIQUE`, `DEFAULT`), and a **`FOREIGN KEY ... ON DELETE CASCADE`** linking posts to authors (Module 13.2).
> - The **`UNIQUE`** constraints on `email`/`slug` are what enable the seed script's idempotent `ON CONFLICT DO NOTHING` (Module 5.6).
> - SQLite quirks (no boolean → `0`/`1`; text timestamps) are noted with their **Postgres equivalents** — the *shape* is portable, only dialect differs.
> - The **runner** wraps it in a transaction (atomic) and tracks it (idempotent) — Module 13.5.
