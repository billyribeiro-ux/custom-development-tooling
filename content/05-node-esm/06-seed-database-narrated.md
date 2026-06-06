# Worked Example: seed-database.mjs Narrated

Let's read a complete, real Node tooling script end to end: `examples/node/seed-database.mjs`. It fills a database with known starting data — a task every project needs (Module 1: same data for every dev and every test run). It ties together this whole module *and* previews the database work of Module 13. Run it as you read.

> [!DOGFOOD]
> This is a runnable file in the repo. It uses Node's built-in `node:sqlite`, so you need **no database server and no npm packages** — just Node. Open `examples/node/seed-database.mjs` alongside this lesson.

## Setup: imports and arguments

```javascript title=seed-database.mjs
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    db: { type: 'string', default: join('/tmp', 'course-app.db') },
    reset: { type: 'boolean', default: false },
  },
});
```

- **`node:sqlite`** (Module 5.2) — a real SQL database *built into Node*. `DatabaseSync` opens a database file. No driver, no install.
- **`parseArgs`** (Module 4.3) gives a `--db <path>` option (where the database lives) and a `--reset` flag (wipe before seeding). Both have sensible defaults, so it runs with no arguments.

## Opening the database

```javascript title=seed-database.mjs
const db = new DatabaseSync(values.db);
db.exec('PRAGMA foreign_keys = ON;');
```

`new DatabaseSync(path)` opens (or creates) the SQLite file. The `PRAGMA foreign_keys = ON` turns on foreign-key enforcement — SQLite has it *off* by default (a historical quirk), so we must enable it per connection or our `FOREIGN KEY` constraints (Module 13) won't be enforced. A small but important gotcha.

## Data as data

```javascript title=seed-database.mjs
const authors = [
  { email: 'ada@example.com', name: 'Ada Lovelace' },
  { email: 'alan@example.com', name: 'Alan Turing' },
  { email: 'grace@example.com', name: 'Grace Hopper' },
];

const posts = [
  { author: 'ada@example.com', title: 'Notes on the Analytical Engine', published: 1 },
  // ...
];
```

The seed data lives as plain JavaScript arrays, **separate from the insert logic** — the same data/logic separation you saw in `clean-cache.sh`'s `TARGETS` array (Module 3.7). Adding a record is a one-line data edit. This is a recurring hallmark of clean tooling.

## A pure helper

```javascript title=seed-database.mjs
const slugify = (s) =>
  s.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
```

`slugify` turns `"Notes on the Analytical Engine"` into `"notes-on-the-analytical-engine"` — a URL-safe identifier. It's a **pure function** (Module 1.5): input in, output out, no side effects. Pure helpers are easy to reason about and test. (The same `slugify` idea appears in the generator's heading anchors.)

## Optional reset

```javascript title=seed-database.mjs
if (values.reset) {
  db.exec('DELETE FROM posts; DELETE FROM authors;');
  console.log('  reset: cleared existing rows');
}
```

The `--reset` flag wipes the tables first. We delete `posts` *before* `authors` because posts reference authors via a foreign key — deleting an author with posts still pointing at it would violate the constraint. Order matters with relational data.

## Prepared statements: fast and safe

```javascript title=seed-database.mjs
const insertAuthor = db.prepare(
  `INSERT INTO authors (email, name) VALUES (?, ?)
   ON CONFLICT(email) DO NOTHING`,
);
const insertPost = db.prepare(
  `INSERT INTO posts (author_id, title, slug, published) VALUES (?, ?, ?, ?)
   ON CONFLICT(slug) DO NOTHING`,
);
```

Two crucial ideas here:

1. **Prepared statements** with `?` placeholders. The values are *bound* separately, never concatenated into the SQL string. This is the database equivalent of Module 5.4's command-injection lesson: just as you keep user input out of shell strings, you keep values out of SQL strings. It prevents **SQL injection** and is faster (the query is compiled once, reused many times).
2. **`ON CONFLICT ... DO NOTHING`** makes the seed **idempotent** (Module 1.4). The `email` and `slug` columns are `UNIQUE` (Module 13), so re-running would normally crash on a duplicate — but `DO NOTHING` makes it skip duplicates silently. Run the seed ten times; you still get three authors.

## The transaction

```javascript title=seed-database.mjs
db.exec('BEGIN');
try {
  for (const a of authors) insertAuthor.run(a.email, a.name);
  for (const p of posts) {
    const author = getAuthorId.get(p.author);
    if (!author) throw new Error(`unknown author: ${p.author}`);
    insertPost.run(author.id, p.title, slugify(p.title), p.published);
  }
  db.exec('COMMIT');
} catch (err) {
  db.exec('ROLLBACK');
  console.error('seed failed:', err.message);
  process.exit(1);
}
```

This is the heart, and it shows production-grade error handling (Module 5.5):

- **`BEGIN` ... `COMMIT`** wraps everything in a *transaction*: all the inserts succeed together, or none do. The database is never left half-seeded.
- The loop inserts authors, then for each post looks up its author's `id` and inserts the post. (Note this loop is *sequential* and that's fine — these are fast local writes, and a transaction is inherently sequential.)
- The guard `if (!author) throw` catches bad data — a post referencing a non-existent author — with a clear message instead of a cryptic constraint error.
- **`catch` → `ROLLBACK`**: if *anything* throws, we undo the whole transaction, print the error to **stderr**, and `process.exit(1)`. The failure is visible and the database is clean. This is exactly the "fail loudly, leave no mess" discipline from Modules 2 and 5.

## The summary

```javascript title=seed-database.mjs
const counts = {
  authors: db.prepare('SELECT count(*) AS n FROM authors').get().n,
  posts: db.prepare('SELECT count(*) AS n FROM posts').get().n,
};
console.log(`Seeded ${values.db}: ${counts.authors} authors, ${counts.posts} posts ✅`);
db.close();
```

It queries the actual counts and reports them — confirming the work, closing the feedback loop (Module 1.2). Finally `db.close()` releases the database. Good tools tell you what happened and clean up after themselves.

## What to take away

This 60-line script demonstrates the whole module: ESM imports with `node:` built-ins, `parseArgs` for the CLI, async-free SQLite, data/logic separation, a pure helper, idempotency via `ON CONFLICT`, injection-safe prepared statements, a transaction with rollback, and a clear summary. None of it is exotic — it's the same handful of principles, applied with care.

> [!TRY]
> In the repo, run `node --experimental-sqlite examples/node/migrate.mjs` then `node --experimental-sqlite examples/node/seed-database.mjs`. Run the seed a *second* time and watch the counts stay at 3/3 — that's idempotency you can see. Then try `--reset` and observe the "cleared" message.

> [!KEY]
> - A real seed script uses `node:sqlite` (no server, no deps), `parseArgs` for options, and data kept separate from logic.
> - Enable `PRAGMA foreign_keys = ON` — SQLite defaults it off.
> - **Prepared statements with `?`** prevent SQL injection and run faster (the DB analog of avoiding shell-string injection).
> - **`ON CONFLICT DO NOTHING`** makes seeding idempotent against `UNIQUE` constraints.
> - Wrap writes in a **transaction**; on any error, **ROLLBACK**, report to stderr, and `exit(1)` — fail loudly, leave no mess.
