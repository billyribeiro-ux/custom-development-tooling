#!/usr/bin/env node
// =============================================================================
// migrate.mjs — a tiny but real database migration runner, narrated in
// Module 13. It applies every *.sql file in a migrations directory exactly
// once, in filename order, and records what it applied in a tracking table.
//
// Run it:
//   node --experimental-sqlite examples/node/migrate.mjs
//   node --experimental-sqlite examples/node/migrate.mjs --db /tmp/app.db
//
// node:sqlite is a built-in (Node 22.5+). No npm install, no driver. In 2026
// this is the simplest way to get a real SQL database for tooling and tests.
// =============================================================================

import { DatabaseSync } from 'node:sqlite';
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

// Reconstruct __dirname in ESM (it does not exist by default).
const __dirname = dirname(fileURLToPath(import.meta.url));

const { values } = parseArgs({
  options: {
    db: { type: 'string', default: join('/tmp', 'course-app.db') },
    dir: { type: 'string', default: join(__dirname, '..', 'sql') },
  },
});

// Open (or create) the database file.
const db = new DatabaseSync(values.db);
db.exec('PRAGMA foreign_keys = ON;'); // SQLite needs this on per-connection

// The tracking table is itself created idempotently — it is migration zero.
db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name       TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Which migrations have already run?
const applied = new Set(
  db.prepare('SELECT name FROM schema_migrations').all().map((r) => r.name),
);

// Find migration files, sorted so order is deterministic (0001, 0002, ...).
const files = (await readdir(values.dir)).filter((f) => f.endsWith('.sql')).sort();

let count = 0;
for (const file of files) {
  if (applied.has(file)) {
    console.log(`  skip   ${file} (already applied)`);
    continue;
  }
  const sql = await readFile(join(values.dir, file), 'utf8');

  // Wrap each migration in a transaction: if the SQL throws halfway, the whole
  // migration rolls back and the tracking row is never written. All-or-nothing.
  db.exec('BEGIN');
  try {
    db.exec(sql);
    db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(file);
    db.exec('COMMIT');
    console.log(`  apply  ${file} ✅`);
    count++;
  } catch (err) {
    db.exec('ROLLBACK');
    console.error(`  FAIL   ${file}: ${err.message}`);
    process.exit(1);
  }
}

console.log(count ? `Applied ${count} migration(s) to ${values.db}` : `Up to date (${values.db})`);
db.close();
