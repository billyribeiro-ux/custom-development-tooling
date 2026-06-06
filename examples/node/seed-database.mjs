#!/usr/bin/env node
// =============================================================================
// seed-database.mjs — fill a fresh database with realistic example data.
// This is the script narrated in Module 5, "seed-database.mjs Narrated".
//
// Run it (after migrate.mjs has created the tables):
//   node --experimental-sqlite examples/node/migrate.mjs
//   node --experimental-sqlite examples/node/seed-database.mjs
//
// Why a seed script? Every developer and every test run needs the SAME known
// starting data. Seeding by hand is slow and inconsistent; a script makes it
// one command, identical every time (determinism).
// =============================================================================

import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    db: { type: 'string', default: join('/tmp', 'course-app.db') },
    reset: { type: 'boolean', default: false }, // wipe existing rows first
  },
});

const db = new DatabaseSync(values.db);
db.exec('PRAGMA foreign_keys = ON;');

// The data to insert lives as plain data, separate from the insert logic.
const authors = [
  { email: 'ada@example.com', name: 'Ada Lovelace' },
  { email: 'alan@example.com', name: 'Alan Turing' },
  { email: 'grace@example.com', name: 'Grace Hopper' },
];

const posts = [
  { author: 'ada@example.com', title: 'Notes on the Analytical Engine', published: 1 },
  { author: 'alan@example.com', title: 'On Computable Numbers', published: 1 },
  { author: 'grace@example.com', title: 'Why I Invented the Compiler', published: 0 },
];

// A slug is a URL-safe version of a title: "Hello, World!" -> "hello-world".
const slugify = (s) =>
  s.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');

if (values.reset) {
  db.exec('DELETE FROM posts; DELETE FROM authors;');
  console.log('  reset: cleared existing rows');
}

// Prepared statements are compiled once and reused — faster and injection-safe,
// because values are bound as parameters (?), never string-concatenated.
const insertAuthor = db.prepare(
  // "ON CONFLICT ... DO NOTHING" makes re-seeding idempotent: running twice does
  // not create duplicates or crash on the UNIQUE(email) constraint.
  `INSERT INTO authors (email, name) VALUES (?, ?)
   ON CONFLICT(email) DO NOTHING`,
);
const getAuthorId = db.prepare('SELECT id FROM authors WHERE email = ?');
const insertPost = db.prepare(
  `INSERT INTO posts (author_id, title, slug, published) VALUES (?, ?, ?, ?)
   ON CONFLICT(slug) DO NOTHING`,
);

// Wrap the whole seed in one transaction: it is fast and atomic (all rows land,
// or none do).
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

const counts = {
  authors: db.prepare('SELECT count(*) AS n FROM authors').get().n,
  posts: db.prepare('SELECT count(*) AS n FROM posts').get().n,
};
console.log(`Seeded ${values.db}: ${counts.authors} authors, ${counts.posts} posts ✅`);
db.close();
