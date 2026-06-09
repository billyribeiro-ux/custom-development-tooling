# Step 4 — .sql Migrations + a Migration Runner

Linkboard needs a database (Module 18.1). We give it a versioned schema via a `.sql` migration and a runner that applies migrations safely — exactly the system from Module 13, adapted. We also wire up the seed (Module 13.6) so a fresh database starts with known data.

## The migration: 0001_init.sql

Recall the table you sketched in the brief (Module 18.1): a link has an id, url, title, and timestamp. Here's migration `0001`, following every convention from Module 13:

```sql title=migrations/0001_init.sql
-- 0001_init.sql — create the links table. Migration 0001 (Module 13.1).
BEGIN;                                              -- atomic (Module 13.3)

CREATE TABLE IF NOT EXISTS links (                 -- idempotent DDL (Module 13.2)
  id         INTEGER PRIMARY KEY,
  url        TEXT    NOT NULL UNIQUE,              -- required + no duplicate URLs (Module 13.2)
  title      TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_links_created ON links (created_at);  -- we sort by this (Module 13.2)

COMMIT;
```

The conventions (Module 13.2-13.4):

- **Numbered `0001`** — ordered history (Module 13.1).
- **Wrapped in `BEGIN`/`COMMIT`** — atomic (Module 13.3).
- **`CREATE TABLE IF NOT EXISTS`** — idempotent (Module 13.2/13.3).
- **`UNIQUE` on `url`** — makes duplicate links impossible at the DB level (Module 13.2), and enables the seed's `ON CONFLICT` idempotency (Module 13.6).
- **An index on `created_at`** — because the generator sorts links by it (Module 18.4's `ORDER BY created_at DESC`) — index what you query by (Module 13.2).

## The migration runner: migrate.mjs

This is the course's `migrate.mjs` (Module 13.5), pointed at Linkboard's `migrations/` folder. It tracks applied migrations and applies new ones atomically:

```javascript title=scripts/migrate.mjs
#!/usr/bin/env node
import { DatabaseSync } from 'node:sqlite';
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));   // ESM __dirname (Module 5.1)
const DB = process.env.DATABASE_PATH ?? './linkboard.db';    // config with default (Module 9.4)
const DIR = join(__dirname, '..', 'migrations');

const db = new DatabaseSync(DB);
db.exec('PRAGMA foreign_keys = ON;');                        // enforce FKs (Module 13.5)
db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (      -- tracking table (Module 13.1)
  name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')));`);

const applied = new Set(db.prepare('SELECT name FROM schema_migrations').all().map((r) => r.name));
const files = (await readdir(DIR)).filter((f) => f.endsWith('.sql')).sort();  // ordered (Module 1.4)

let count = 0;
for (const file of files) {                                  // sequential — order matters (Module 5.5)
  if (applied.has(file)) { console.log(`  skip   ${file}`); continue; }       // idempotent (Module 13.3)
  const sql = await readFile(join(DIR, file), 'utf8');
  db.exec('BEGIN');                                          // atomic per migration (Module 13.3)
  try {
    db.exec(sql);
    db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(file);  // record in same txn (Module 13.5)
    db.exec('COMMIT');
    console.log(`  apply  ${file} ✅`); count++;
  } catch (err) {
    db.exec('ROLLBACK');                                     // crash-safe (Module 13.5)
    console.error(`  FAIL   ${file}: ${err.message}`);
    process.exit(1);                                         // fail loudly (Module 2.5)
  }
}
console.log(count ? `Applied ${count} migration(s)` : 'Up to date');
db.close();
```

This is the crash-safe runner from Module 13.5: it tracks applied migrations in `schema_migrations`, sorts files for deterministic order (Module 1.4), applies each in a transaction with the tracking insert in the *same* transaction (the crash-safety key, Module 13.5), and exits non-zero on failure (Module 2.5). It reads `DATABASE_PATH` from the env with a default (Module 9.4).

## The seed: seed.mjs

A fresh database needs starting links (Module 13.6). The seed is idempotent and deterministic:

```javascript title=scripts/seed.mjs
#!/usr/bin/env node
import { DatabaseSync } from 'node:sqlite';

const DB = process.env.DATABASE_PATH ?? './linkboard.db';
const db = new DatabaseSync(DB);

const links = [                                             // fixed, known data (Module 13.6)
  { url: 'https://nodejs.org', title: 'Node.js' },
  { url: 'https://playwright.dev', title: 'Playwright' },
];

const insert = db.prepare(
  `INSERT INTO links (url, title) VALUES (?, ?) ON CONFLICT(url) DO NOTHING`  // idempotent (Module 13.6)
);
db.exec('BEGIN');                                           // transactional (Module 13.6)
try {
  for (const l of links) insert.run(l.url, l.title);
  db.exec('COMMIT');
} catch (err) { db.exec('ROLLBACK'); console.error(err.message); process.exit(1); }

console.log(`Seeded: ${db.prepare('SELECT count(*) AS n FROM links').get().n} links`);  // summary
db.close();
```

It uses fixed data (deterministic, Module 13.6), `ON CONFLICT DO NOTHING` against the `UNIQUE(url)` constraint (idempotent, Module 13.6), and a transaction (atomic, Module 5.6). Run it twice — the count stays the same.

## Run the sequence

```bash title=db-setup.sh
node scripts/migrate.mjs    # create the schema
node scripts/seed.mjs       # load known links
```

Migrate then seed (Module 13.6) — the same sequence the bootstrap (Step 2) runs and the Makefile (Step 6) will wrap as `make migrate` + `make seed`. A fresh clone goes from empty to a populated database with these two commands.

> [!GOTCHA]
> Keep migrations and seeds *separate* (Module 13.6). `0001_init.sql` defines the *structure* (run once, tracked, append-only history — Module 13.1); `seed.mjs` inserts *data* (re-runnable, can change freely). Don't put the example links *in* the migration — you'd be unable to refresh dev data without faking a migration, and your schema history would be polluted with data churn. Structure and data are different jobs.

> [!DOGFOOD]
> Linkboard's `migrate.mjs` is the course's `examples/node/migrate.mjs` (Module 13.5) adapted to read `DATABASE_PATH`; its `seed.mjs` mirrors `examples/node/seed-database.mjs` (Module 5.6/13.6); and `0001_init.sql` follows `examples/sql/migrate.sql` (Module 13.4). All three are runnable references in this repo — adapt them.

> [!TRY]
> Write `migrations/0001_init.sql`, adapt `migrate.mjs` and `seed.mjs`, then run migrate and seed. Run *both again* — migrate says "up to date," seed keeps the count stable. That double-run proving idempotency (Module 1.4) is the test that your database tooling is solid.

> [!KEY]
> - Linkboard's schema is a versioned **`0001_init.sql`** migration: numbered, transactional, idempotent (`IF NOT EXISTS`), with a `UNIQUE(url)` constraint and an index on the sorted-by column (Module 13.2-13.4).
> - **`migrate.mjs`** is the crash-safe runner from Module 13.5: tracks applied migrations, sorts for order, applies each atomically with the tracking insert in the *same* transaction, exits non-zero on failure.
> - **`seed.mjs`** loads fixed data idempotently (`ON CONFLICT DO NOTHING`, Module 13.6) in a transaction — re-running keeps the count stable.
> - The flow is **migrate then seed** (Module 13.6) — the same sequence bootstrap runs and the Makefile wraps.
> - **Keep structure (migrations) and data (seeds) separate** (Module 13.6); adapt the course's runnable examples as templates.
