# Driving Migrations from a Script (migrate.mjs)

A migration *file* (Module 13.4) is inert until something *applies* it. That something is a **migration runner** — and you can write a real one in about 50 lines. Reading `examples/node/migrate.mjs` line by line shows how the whole migration system (Module 13.1) actually works under the hood, and ties together this module with everything from Module 5 (Node scripting).

> [!DOGFOOD]
> Run it: `node examples/node/migrate.mjs`. It applies every `.sql` file in `examples/sql/` in order, tracking what it's done. Run it twice — the second time it skips everything. Open `examples/node/migrate.mjs` alongside this lesson.

## Setup: imports and the database

```javascript title=migrate.mjs
import { DatabaseSync } from 'node:sqlite';
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const __dirname = dirname(fileURLToPath(import.meta.url));
```

All `node:` built-ins (Module 5.2): `node:sqlite` for the database (no driver needed!), `fs/promises` to read migration files, `path`/`url` for paths (the `__dirname` reconstruction from Module 5.1), and `parseArgs` for options. Zero npm dependencies.

```javascript title=migrate.mjs
const { values } = parseArgs({
  options: {
    db: { type: 'string', default: join('/tmp', 'course-app.db') },
    dir: { type: 'string', default: join(__dirname, '..', 'sql') },
  },
});

const db = new DatabaseSync(values.db);
db.exec('PRAGMA foreign_keys = ON;');
```

`parseArgs` (Module 4.3) gives `--db` (where the database lives) and `--dir` (where migrations are). Then it opens the SQLite database and enables foreign-key enforcement (`PRAGMA foreign_keys = ON` — SQLite defaults it off, Module 5.6).

## The tracking table: migration zero

```javascript title=migrate.mjs
db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name       TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
```

This is the heart of the system (Module 13.1): a table that records *which migrations have run*. It's created idempotently (`IF NOT EXISTS`) — it's effectively "migration zero," the one that bootstraps the tracking itself. Each applied migration gets a row here.

## Discovering what's already applied

```javascript title=migrate.mjs
const applied = new Set(
  db.prepare('SELECT name FROM schema_migrations').all().map((r) => r.name),
);
```

Query the tracking table for every migration already applied, into a `Set` for fast lookup. This is how the runner knows what to *skip* — the basis of idempotency (Module 13.3): applied migrations won't run again.

## Finding and ordering migration files

```javascript title=migrate.mjs
const files = (await readdir(values.dir)).filter((f) => f.endsWith('.sql')).sort();
```

List the migrations directory (Module 5.3), keep only `.sql` files, and **`.sort()`** them. That sort is critical (Module 1.4, 13.3): it guarantees migrations run in filename order (`0001`, `0002`, ...) *deterministically*, every time, on every machine. Relying on filesystem order without sorting would be non-deterministic — a classic bug.

## The apply loop — the core

```javascript title=migrate.mjs
let count = 0;
for (const file of files) {
  if (applied.has(file)) {
    console.log(`  skip   ${file} (already applied)`);
    continue;                               // skip migrations already run (idempotency)
  }
  const sql = await readFile(join(values.dir, file), 'utf8');

  db.exec('BEGIN');                          // start a transaction (atomicity)
  try {
    db.exec(sql);                            // run the migration's SQL
    db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(file);  // record it
    db.exec('COMMIT');                       // commit: SQL + tracking row together
    console.log(`  apply  ${file} ✅`);
    count++;
  } catch (err) {
    db.exec('ROLLBACK');                     // on ANY error, undo everything
    console.error(`  FAIL   ${file}: ${err.message}`);
    process.exit(1);                         // fail loudly (Module 2.5)
  }
}
```

This loop *is* the migration runner. For each file, in sorted order:

1. **Skip if applied** (`applied.has(file)`) — the idempotency check (Module 13.3). This is why re-running does nothing.
2. **Read the SQL** (Module 5.3).
3. **`BEGIN` a transaction** (Module 13.3) — so the migration is atomic.
4. **Run the SQL** (`db.exec(sql)`) *and* **record the migration** in `schema_migrations` — both inside the transaction.
5. **`COMMIT`** — the schema change *and* its tracking row land together. This is crucial: if the SQL succeeded but recording failed (or vice versa), they'd disagree. The transaction binds them.
6. **On any error, `ROLLBACK`** (Module 13.3) — the schema is left *exactly* as before, the tracking row is not written, and the script exits non-zero (Module 2.5) so CI/the caller knows it failed. A failed migration leaves no mess.

> [!TIP]
> Notice the migration's SQL *and* the "mark it applied" insert are in the **same transaction**. This is the principal-level detail: if applying the SQL and recording it weren't atomic together, a crash between them would leave the database changed but unrecorded (so the runner would try to apply it *again* next time) — or recorded but unchanged. Binding them in one transaction makes the runner crash-safe. That single design choice is what makes the system trustworthy.

> [!NOTE]
> This loop is *intentionally sequential* (`for...of` with `await`) — migrations **must** run in order, one after another (`0002` depends on `0001`). This is the case from Module 5.5 where sequential is *correct*, not slow: you would never parallelize migrations with `Promise.all`, because order is the whole point.

## The summary

```javascript title=migrate.mjs
console.log(count ? `Applied ${count} migration(s) to ${values.db}` : `Up to date (${values.db})`);
db.close();
```

Report how many migrations were applied (or "up to date" if none were new), closing the feedback loop (Module 1.2), then close the database. Clear feedback, clean shutdown.

## What you've learned to build

In ~50 lines you have a *real* migration runner with everything the production tools (Module 13.1) provide: ordered application, a tracking table, idempotent skipping, atomic transactions with rollback, and loud failure. You could point it at a folder of dozens of migrations and it would apply exactly the new ones, in order, safely. And you understand *every line* — so you could extend it (add `down`/rollback, add a `--dry-run`, swap SQLite for Postgres) however you need. That's the goal of this whole course: not to memorize a tool, but to be able to *build* one.

> [!TRY]
> Run the runner once (`node examples/node/migrate.mjs`) — it applies `migrate.sql`. Now create a *second* migration, `examples/sql/0002_add_comments.sql` (use the example from Module 13.3), and run the runner again. Watch it *skip* `migrate.sql` ("already applied") and *apply* your new `0002`. You've extended a real migration system.

> [!KEY]
> - A **migration runner** applies migration files in order and tracks what it's done — ~50 lines with `node:sqlite` and no dependencies.
> - It uses a **`schema_migrations` tracking table** to know which files are applied, **skipping** them on re-runs (idempotency, Module 13.3).
> - It **sorts** filenames for deterministic order (Module 1.4) and applies each in a **transaction** (`BEGIN`/`COMMIT`, `ROLLBACK` on error) for atomicity.
> - The migration's SQL and its "mark applied" insert share **one transaction** — the key design choice that makes the runner **crash-safe**.
> - The loop is **deliberately sequential** (migrations depend on order) — the case where sequential `await` is correct, not slow (Module 5.5). You now understand it well enough to **extend it**.
