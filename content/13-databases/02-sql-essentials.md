# SQL Essentials for Tooling (DDL vs DML)

To write migrations and seed scripts, you need enough SQL to be dangerous — specifically, the difference between *changing the structure* and *changing the data*, plus the handful of statements tooling uses most. This isn't a full SQL course; it's the practical subset that powers the database tooling in this module.

## The two halves of SQL

SQL splits into categories. The two that matter most for tooling:

- **DDL — Data Definition Language**: changes the *structure* (the schema). `CREATE`, `ALTER`, `DROP`. This is what **migrations** are made of (Module 13.1).
- **DML — Data Manipulation Language**: changes the *data* (the rows). `INSERT`, `UPDATE`, `DELETE`, `SELECT`. This is what **seed scripts** and your app use (Module 5.6).

```text title=ddl-vs-dml
DDL (structure)              DML (data)
-------------               -----------
CREATE TABLE ...            INSERT INTO ...
ALTER TABLE ...             UPDATE ...
DROP TABLE ...              DELETE FROM ...
CREATE INDEX ...            SELECT ...
```

Keep these straight: a *migration* changes structure (DDL); a *seed* changes data (DML). They're different jobs with different files.

## DDL: defining structure

### CREATE TABLE

The foundational DDL statement — define a table, its columns, types, and constraints:

```sql title=create-table.sql
CREATE TABLE authors (
  id         INTEGER PRIMARY KEY,        -- a unique identifier for each row
  email      TEXT    NOT NULL UNIQUE,    -- required, and no two rows can share it
  name       TEXT    NOT NULL,           -- required
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))  -- auto-filled if not given
);
```

The pieces:

- **Column = name + type** (`email TEXT`). Types vary by database (SQLite: `INTEGER`, `TEXT`, `REAL`, `BLOB`; Postgres has many more).
- **Constraints** are the rules the database *enforces* (your last line of data-integrity defense, Module 1.5):
  - `PRIMARY KEY` — uniquely identifies each row.
  - `NOT NULL` — the column must have a value.
  - `UNIQUE` — no two rows may share this value (makes duplicate emails *impossible* at the database level).
  - `DEFAULT` — a value used when none is provided.

> [!TIP]
> Push data rules into the *database* with constraints, not just into your application code. A `UNIQUE` constraint guarantees no duplicate emails *even if* a bug in your app tries to insert one — the database refuses. This is defense in depth: app validation for nice error messages, database constraints for an unbreakable guarantee. The seed script in Module 5.6 relies on exactly this (`ON CONFLICT` against the `UNIQUE` email).

### FOREIGN KEY: relationships

A foreign key links a row in one table to a row in another, and stops "orphan" rows:

```sql title=foreign-key.sql
CREATE TABLE posts (
  id        INTEGER PRIMARY KEY,
  author_id INTEGER NOT NULL,
  title     TEXT    NOT NULL,
  FOREIGN KEY (author_id) REFERENCES authors (id) ON DELETE CASCADE
);
```

`FOREIGN KEY (author_id) REFERENCES authors (id)` means "every post's `author_id` must match a real author's `id`." You can't insert a post for a non-existent author, and `ON DELETE CASCADE` means deleting an author automatically deletes their posts (no orphans left behind).

### Indexes

An index speeds up lookups on a column, at the cost of a little space and write speed:

```sql title=index.sql
CREATE INDEX idx_posts_author ON posts (author_id);
```

Without an index, "find all posts by author 5" scans *every* row. With it, the database jumps straight to the matching rows. Index the columns you frequently filter or join on. (This connects to feedback-loop speed, Module 1.2, at the data layer.)

### ALTER and DROP

```sql title=alter-drop.sql
ALTER TABLE authors ADD COLUMN bio TEXT;        -- add a column (a common migration)
ALTER TABLE authors RENAME COLUMN name TO full_name;
DROP TABLE old_logs;                             -- remove a table entirely (careful!)
```

`ALTER` modifies an existing table — the bread and butter of later migrations. `DROP` removes things permanently.

> [!WARNING]
> DDL on a *large, live* table can be slow and can *lock* the table (blocking your app) while it runs. Adding a column is usually fast; adding an index or rewriting a table can take minutes on millions of rows, during which queries may stall. On production, big schema changes need care — run them in low-traffic windows, or use online/concurrent variants (`CREATE INDEX CONCURRENTLY` in Postgres). For small tables it's instant. Know the size of what you're altering.

## DML: working with data

### INSERT

```sql title=insert.sql
INSERT INTO authors (email, name) VALUES ('ada@example.com', 'Ada Lovelace');
```

### SELECT (querying)

```sql title=select.sql
SELECT id, title FROM posts WHERE author_id = 1 ORDER BY created_at DESC;
SELECT count(*) AS n FROM posts;                 -- count rows (used in the seed summary, Module 5.6)
```

### UPDATE and DELETE — handle with care

```sql title=update-delete.sql
UPDATE posts SET published = 1 WHERE id = 42;     -- the WHERE limits which rows!
DELETE FROM posts WHERE id = 42;
```

> [!GOTCHA]
> **The most dangerous SQL mistake: `UPDATE` or `DELETE` without a `WHERE`.** `DELETE FROM posts;` deletes *every row in the table.* `UPDATE posts SET published = 1;` publishes *everything.* The `WHERE` clause is what limits the operation to specific rows — forget it and you've changed the whole table. Always write the `WHERE` first, double-check it, *then* the action. Some teams run a `SELECT` with the same `WHERE` first to preview exactly which rows will be affected.

## Idempotent DDL

Recall idempotency (Module 1.4) — running twice should be safe. SQL supports it:

```sql title=idempotent-ddl.sql
CREATE TABLE IF NOT EXISTS authors (...);    -- won't error if it already exists
DROP TABLE IF EXISTS old_logs;                -- won't error if it's already gone
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts (author_id);
```

`IF NOT EXISTS` / `IF EXISTS` make migrations safe to re-run — important for the migration runner (Module 13.5) and for resilience.

> [!DOGFOOD]
> The course's `examples/sql/migrate.sql` (Module 13.4) uses *all* of this: `CREATE TABLE IF NOT EXISTS` (idempotent DDL) for `authors` and `posts`, `NOT NULL`/`UNIQUE`/`DEFAULT` constraints, a `FOREIGN KEY ... ON DELETE CASCADE` linking posts to authors, and a `CREATE INDEX IF NOT EXISTS` on `author_id`. The seed script (Module 5.6) uses the DML side — `INSERT`, `SELECT count(*)`, `DELETE`. Open both to see DDL and DML in context.

> [!TRY]
> Mentally classify each as DDL or DML: `CREATE INDEX`, `INSERT INTO`, `ALTER TABLE`, `SELECT`, `DROP TABLE`, `UPDATE`. (Structure changes are DDL: CREATE INDEX, ALTER TABLE, DROP TABLE. Data changes are DML: INSERT, SELECT, UPDATE.) Then write a `CREATE TABLE IF NOT EXISTS` for a "comments" table with an id, a `post_id` foreign key, and a `body`.

> [!KEY]
> - SQL splits into **DDL** (structure: `CREATE`/`ALTER`/`DROP` — what **migrations** use) and **DML** (data: `INSERT`/`UPDATE`/`DELETE`/`SELECT` — what **seeds**/apps use).
> - `CREATE TABLE` defines columns + **constraints** (`PRIMARY KEY`, `NOT NULL`, `UNIQUE`, `DEFAULT`, `FOREIGN KEY`) — push data rules into the DB as a hard guarantee.
> - **Index** the columns you filter/join on for speed; `ALTER` modifies tables (the staple of later migrations); big DDL can lock large tables (be careful on production).
> - **Never `UPDATE`/`DELETE` without a `WHERE`** — it affects every row. Preview with a matching `SELECT` first.
> - Make DDL **idempotent** with `IF NOT EXISTS` / `IF EXISTS` (Module 1.4) so migrations are safe to re-run.
