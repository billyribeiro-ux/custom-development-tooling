# Anatomy of a Migration: up/down, Ordering, Idempotency

Now that you know *why* migrations exist (Module 13.1) and the *SQL* they contain (Module 13.2), let's look at how a migration is *structured* — the conventions for naming, ordering, the "up/down" idea, transactions, and idempotency. These conventions are what make a pile of SQL files into a reliable system.

## Naming and ordering

Migrations *must* run in a defined order — `0002` depends on `0001` having created the table it alters. The order is encoded in the **filename**, and there are two common schemes:

```text title=naming-schemes
# Scheme A: sequential numbers
0001_create_authors.sql
0002_add_posts.sql
0003_add_posts_index.sql

# Scheme B: timestamps (avoids merge collisions on teams)
20260601120000_create_authors.sql
20260602093000_add_posts.sql
```

- **Sequential** (`0001`, `0002`) is simple and readable, but two teammates branching simultaneously might both create `0005`, colliding on merge.
- **Timestamps** (`20260601120000`) avoid collisions (two people rarely pick the same second) at the cost of less-readable names. Most production tools use timestamps for this reason.

> [!TIP]
> Whatever the scheme, the runner **sorts filenames** to determine order (Module 1.4 — sort explicitly for determinism). Zero-pad sequential numbers (`0001`, not `1`) so string sorting matches numeric order — otherwise `10` sorts before `2`. The course's runner does `(await readdir(dir)).sort()`, relying on this.

## The "up" and "down" concept

A migration conceptually has two directions:

- **up** — apply the change (create the table, add the column). This is what runs normally.
- **down** — *reverse* the change (drop the table, remove the column). This is the rollback.

```sql title=migration-with-down.sql
-- == UP: apply the change ==
ALTER TABLE authors ADD COLUMN bio TEXT;

-- == DOWN: undo it (for rollback) ==
-- ALTER TABLE authors DROP COLUMN bio;
```

Some tools put up and down in separate files (`0003_add_bio.up.sql` / `0003_add_bio.down.sql`); others use one file with marked sections; others (like our simple runner) are *forward-only* and skip `down` entirely.

> [!NOTE]
> **Forward-only migrations** (no `down`) are increasingly common, and it's a legitimate philosophy. The reasoning: rollbacks are rare, hard to get right (how do you "un-drop" a column without losing the data that was in it?), and dangerous in production. Many teams instead *always roll forward* — if `0005` broke something, you write `0006` to fix it, rather than reversing `0005`. This course's runner (Module 13.5) is forward-only for simplicity. Know that `down` exists; know that many teams skip it deliberately.

> [!WARNING]
> A `down` migration that *loses data* isn't a real rollback. Dropping a column you just added is fine (it was empty). But reversing a migration that *deleted* or *transformed* data can't restore what's gone. This is the deep reason rollbacks are hard and "roll forward" is often safer. Treat any destructive migration as effectively irreversible — and back up before running it on production.

## Transactions: all-or-nothing

A single migration often has *multiple* statements. If statement 3 fails, you don't want statements 1 and 2 to have applied, leaving the schema half-changed. Wrap the migration in a **transaction** (Module 5.6): all statements succeed together, or none do.

```sql title=transactional-migration.sql
BEGIN;
  CREATE TABLE comments (id INTEGER PRIMARY KEY, post_id INTEGER NOT NULL, body TEXT);
  CREATE INDEX idx_comments_post ON comments (post_id);
  ALTER TABLE posts ADD COLUMN comment_count INTEGER DEFAULT 0;
COMMIT;
-- If ANY statement fails, the whole thing ROLLs BACK — the schema is untouched.
```

This makes each migration **atomic**: it either fully applies or not at all, never halfway. The runner (Module 13.5) wraps each migration in `BEGIN`/`COMMIT` and `ROLLBACK`s on error, so a failed migration leaves the database exactly as it was.

> [!GOTCHA]
> Some databases can't run *all* DDL inside a transaction. PostgreSQL is great at transactional DDL (most schema changes can be rolled back). MySQL historically **could not** — many DDL statements auto-commit, so a multi-statement migration that fails midway leaves a partial change. SQLite supports transactional DDL well. Know your database's behavior; on MySQL, keep migrations small and be prepared for partial application on failure.

## Idempotency in migrations

Recall idempotency (Module 1.4) — safe to re-run. There are *two* layers of it for migrations:

1. **The runner tracks applied migrations** (the `schema_migrations` table, Module 13.1), so it never runs the same file twice. This is the primary mechanism — the runner makes the *system* idempotent.
2. **Defensive SQL** (`CREATE TABLE IF NOT EXISTS`, Module 13.2) makes individual statements safe even if somehow run again — a belt-and-suspenders backup.

```sql title=defensive-migration.sql
CREATE TABLE IF NOT EXISTS authors (...);      -- safe even if re-run
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts (author_id);
```

> [!TIP]
> Rely primarily on the *runner's tracking* for idempotency (it's the clean mechanism), and use `IF NOT EXISTS` as extra insurance. The combination means a re-run, a crash mid-migration, or running on a partially-set-up database all resolve safely — exactly the resilience idempotency buys (Module 1.4).

## The complete shape

Putting the conventions together, a well-formed migration:

```sql title=0004_add_comments.sql
-- 0004_add_comments.sql — add a comments table linked to posts.
BEGIN;

CREATE TABLE IF NOT EXISTS comments (
  id         INTEGER PRIMARY KEY,
  post_id    INTEGER NOT NULL,
  body       TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments (post_id);

COMMIT;
```

It's **ordered** (the `0004` prefix), **atomic** (wrapped in a transaction), **idempotent** (`IF NOT EXISTS`), uses **constraints** (Module 13.2), and has a **comment** explaining its purpose. That's a migration you can trust in production.

> [!DOGFOOD]
> The course's `examples/sql/migrate.sql` (Module 13.4) follows these conventions: it's migration `0001`, uses `CREATE TABLE IF NOT EXISTS` (idempotent), defines constraints and a foreign key, and comments each part. The runner `examples/node/migrate.mjs` (Module 13.5) wraps *each* migration in `BEGIN`/`COMMIT` with `ROLLBACK` on error (atomicity) and tracks applied ones in `schema_migrations` (the primary idempotency mechanism). It's forward-only — deliberately (per the note above).

> [!TRY]
> Write a migration file `0005_add_user_bio.sql` that wraps an `ALTER TABLE authors ADD COLUMN bio TEXT` in `BEGIN`/`COMMIT` and includes a commented-out `down` (`ALTER TABLE authors DROP COLUMN bio`). You've practiced ordering (the `0005` prefix), atomicity (the transaction), and the up/down concept in one file.

> [!KEY]
> - Migrations run in a **defined order** encoded in filenames (sequential `0001` or collision-resistant timestamps); the runner **sorts** them (zero-pad for correct string sort).
> - **up** applies a change, **down** reverses it — but **forward-only** (no down) is a legitimate, common choice, because rollbacks are hard and can lose data.
> - Wrap each migration in a **transaction** (`BEGIN`/`COMMIT`) so it's **atomic** — all statements apply or none do (mind MySQL's non-transactional DDL).
> - Two layers of **idempotency**: the runner's `schema_migrations` tracking (primary) plus defensive `IF NOT EXISTS` SQL (insurance).
> - A trustworthy migration is **ordered, atomic, idempotent, constrained, and commented**.
