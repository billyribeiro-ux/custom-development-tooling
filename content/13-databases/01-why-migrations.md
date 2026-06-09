# Why Migrations Exist: Schema as Versioned History

Databases hold your application's most precious asset: its data. But the *structure* of that data — the tables, columns, and constraints (the **schema**) — has to change over time as your app evolves. Doing that safely, repeatably, and as a team is what **migrations** are for. This module brings everything you've learned about scripts and reproducibility to the database.

## The problem: schemas change, and that's dangerous

When you add a feature, you often need a schema change — a new column, a new table, an index. The naive approach is to log into the production database and run SQL by hand:

```sql title=the-dangerous-way.sql
-- typed directly into the production database console 😬
ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
```

This is fraught with problems — exactly the issues tooling exists to solve (Module 1):

1. **No record.** What changes were made, in what order, when? Nobody knows. The schema's history is lost.
2. **No reproducibility** (Module 1.3). Your dev database, a teammate's, staging, and production all drift apart. "Works on my machine" — but the column is missing in production.
3. **No review.** A hand-typed `ALTER TABLE` on production isn't code-reviewed. A typo or a missing `WHERE` can corrupt or destroy data.
4. **No rollback.** If the change breaks something, how do you undo it precisely?
5. **Not as a team.** How does a teammate get the *same* schema you just created? They can't, without copying your manual steps.

## The solution: migrations

A **migration** is a small, ordered, *version-controlled* file describing a schema change as code. Instead of typing SQL into a console, you write it in a file, commit it, and a **migration runner** applies it. The schema becomes *code* — reviewed, versioned, and reproducible like everything else.

```text title=migrations-folder
migrations/
├── 0001_create_users.sql      # the first change
├── 0002_add_posts.sql         # the second
├── 0003_add_last_login.sql    # the third
└── 0004_add_posts_index.sql   # ...applied in numeric order
```

Each file is one change. They're numbered so the order is unambiguous and deterministic (Module 1.4 — sort explicitly!). A new teammate runs the migration runner, which applies all of them in order, and gets *exactly* the schema everyone else has.

## Schema as versioned history

This is the key mental model: **your migrations folder is the complete, ordered history of how your schema came to be.** Reading it top to bottom tells the story: "first we created users, then added posts, then added a login timestamp, then indexed posts." It's `git log` for your database structure.

Because it's just files in your repo:

- **It's reviewed** — a migration goes through code review like any change (a teammate catches the missing `WHERE` *before* it hits production).
- **It's versioned** — `git` tracks every schema change with its author, date, and the feature it went with.
- **It's reproducible** (Module 1.3) — anyone, anywhere, anytime gets the identical schema by running the migrations.
- **It's automated** — CI can spin up a fresh database, run all migrations, and test against it (Module 15).

> [!NOTE]
> This is the same source-vs-artifact distinction from Module 1.3, applied to databases. The migration *files* are the **source** (committed, reviewed). The actual database schema is the **artifact** — *derived* by running the migrations. You never hand-edit the artifact (the live schema); you write a migration and run it, exactly as you'd never edit generated HTML but instead edit the source and rebuild.

## How the runner tracks what's applied

The migration runner needs to know which migrations have *already* run, so it applies each one exactly once (and re-running is safe — idempotency, Module 1.4). It does this with a small tracking table in the database:

```sql title=tracking-table.sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  name       TEXT PRIMARY KEY,           -- e.g. '0003_add_last_login.sql'
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

When the runner starts, it reads `schema_migrations` to see what's done, then applies only the *new* files, recording each as it goes. Run the runner twice and the second run does nothing — "up to date." We build exactly this runner in Module 13.5.

> [!WARNING]
> The cardinal rule of migrations: **never edit a migration that has already been applied** (especially in production). Once `0003_add_last_login.sql` has run on production, changing that file does nothing to the live database (the runner thinks it's done) but *will* run differently on a fresh database — creating drift. To change something, write a *new* migration (`0005_fix_login.sql`). Migrations are an append-only history, like git commits — you add to it, you don't rewrite it.

## Migrations are universal

Every serious database setup uses migrations, via a runner — hand-written (Module 13.5) or a framework's:

| Ecosystem | Migration tool |
| --- | --- |
| Node | Knex, Prisma Migrate, Drizzle, node-pg-migrate |
| Python | Alembic (SQLAlchemy), Django migrations |
| Ruby | Rails (Active Record migrations) |
| Any | Flyway, Liquibase (language-agnostic) |

They differ in syntax, but *all* implement the same idea: ordered, versioned, tracked, reproducible schema changes. Learn the concept and any specific tool is just details.

> [!DOGFOOD]
> This course's `examples/sql/migrate.sql` (Module 13.4) is migration `0001`, and `examples/node/migrate.mjs` (Module 13.5) is a real migration runner using a `schema_migrations` tracking table. Run `node examples/node/migrate.mjs` once (it applies the migration), then again (it skips — "up to date"). That's versioned, idempotent, reproducible schema management you can run yourself. (Node 22.x prints a harmless `ExperimentalWarning` for `node:sqlite`; Node 24 doesn't.)

> [!TRY]
> Think about a database change you might make (adding a "phone number" to users). Sketch it as a migration file name and one line of SQL. Then ask: how would a teammate get this same change? How would you undo it? Those questions — answered by "they run the migration" and "I write a reverting migration" — are the whole reason migrations exist.

> [!KEY]
> - A database's **schema** must change over time; doing it by hand on production is unrecorded, irreproducible, unreviewed, and dangerous.
> - A **migration** is an ordered, version-controlled file describing a schema change as code; a **runner** applies them in order.
> - Your migrations folder is the **versioned history** of the schema — reviewed, reproducible, automated (the source-vs-artifact idea, Module 1.3, applied to databases).
> - A **tracking table** (`schema_migrations`) records what's applied, so each runs once and re-running is **idempotent** (Module 1.4).
> - **Never edit an applied migration** — write a new one (append-only history, like git). Every ecosystem has a migration tool; the concept is universal.
