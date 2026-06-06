# Seeding Data Safely

Migrations create the *structure* (Module 13.1-13.5). **Seeding** fills it with *data* — the known starting rows that every developer and every test needs. We met the seed script in Module 5.6; here we focus on the *principles* of safe seeding: idempotency, determinism, environment-awareness, and the line between seed data and migrations.

## What seeding is for

A fresh, empty database isn't useful for development or testing — you need *data* to work with. Seeding provides it, as a repeatable script (Module 1: executable beats manual):

- **Development**: every developer's database starts with the same known authors, posts, products, etc. — so "click on the first post" means the same thing for everyone.
- **Testing**: tests need predictable data to assert against. Seeding gives every test run the *identical* starting state (determinism, Module 1.4).
- **Demos**: a populated database that shows the app off well.

Without seeding, each person hand-enters data (slow, inconsistent) and tests are flaky because the data differs each run.

## Seeding vs migrations: keep them separate

A crucial distinction people blur:

| Migrations | Seeds |
| --- | --- |
| Change *structure* (DDL) | Insert *data* (DML) |
| Run **once**, in order, tracked | Re-runnable; often reset-and-refill |
| Same in all environments | Often **differ** per environment |
| Append-only history | Can change freely |

> [!WARNING]
> **Don't put seed data in migrations** (a very common mistake). Migrations are an append-only, run-once history (Module 13.1) — but seed data you'll want to *change* and *re-run* freely. Mixing them means you can't refresh your dev data without faking a new migration, and your "history" gets polluted with data churn. Keep `migrate` (structure, once) and `seed` (data, repeatable) as separate commands. (The exception: *reference data* that's truly part of the schema's meaning — like a fixed list of country codes — can legitimately live in a migration.)

## Principle 1: seeds must be idempotent

You'll run a seed many times (every time you reset your dev database). It must be safe to re-run (Module 1.4) — no duplicates, no crashes. Two strategies:

```javascript title=idempotent-seed.mjs
// Strategy A: upsert — insert, or do nothing if it already exists
db.prepare(`INSERT INTO authors (email, name) VALUES (?, ?)
            ON CONFLICT(email) DO NOTHING`).run('ada@example.com', 'Ada Lovelace');

// Strategy B: reset then insert (a --reset flag)
db.exec('DELETE FROM posts; DELETE FROM authors;');   // wipe first
// ...then insert fresh...
```

`ON CONFLICT DO NOTHING` (Strategy A) relies on the `UNIQUE` constraints from your schema (Module 13.2) — re-running skips rows that already exist. `--reset` (Strategy B) wipes and refills for a guaranteed-clean state. The course's seed (Module 5.6) offers *both*.

## Principle 2: seeds must be deterministic

The seed should produce the *same* data every time (Module 1.4) — fixed values, not random ones — so tests can rely on it:

```javascript title=deterministic-seed.mjs
// GOOD: fixed, known data — tests can assert "the first author is Ada"
const authors = [
  { email: 'ada@example.com', name: 'Ada Lovelace' },
  { email: 'alan@example.com', name: 'Alan Turing' },
];

// AVOID for seeds you test against: random data changes every run
// const authors = Array.from({length: 10}, () => ({ email: randomEmail(), name: randomName() }));
```

> [!TIP]
> If you *do* want lots of realistic fake data (for performance testing or demos), use a **seeded random generator** — one given a fixed starting seed so it produces the *same* "random" data every run. That's deterministic randomness: varied-looking but reproducible. Libraries like Faker support a fixed seed. The principle holds: even your randomness should be reproducible (Module 1.4).

## Principle 3: respect relationships and order

Seed data has the same foreign-key constraints as real data (Module 13.2). You must insert in dependency order — parents before children:

```javascript title=order-matters.mjs
// Insert authors FIRST (posts reference them via FOREIGN KEY)...
for (const a of authors) insertAuthor.run(a.email, a.name);

// ...THEN posts, looking up each author's real id:
for (const p of posts) {
  const author = getAuthorId.get(p.author);
  if (!author) throw new Error(`unknown author: ${p.author}`);   // guard bad data (Module 1.5)
  insertPost.run(author.id, p.title, slugify(p.title), p.published);
}
```

You can't insert a post before its author exists — the foreign key forbids it (Module 13.2). And when *deleting* for a reset, reverse the order (children before parents): delete posts, then authors (Module 5.6).

## Principle 4: be environment-aware

What you seed should depend on *where* you are (Module 9 — config per environment):

```javascript title=env-aware-seed.mjs
const env = process.env.NODE_ENV ?? 'development';
if (env === 'production') {
  console.error('Refusing to run dev seed against production!');
  process.exit(1);                           // safety guard (Module 2.5)
}
```

> [!WARNING]
> **Guard seeds against production.** A dev seed often *deletes* existing data (`--reset`) — running it against the production database would be catastrophic (the `DELETE FROM` without the safety you'd want). Add an explicit check that refuses to seed dev/test data into production. Production data comes from real users and (occasionally) carefully-reviewed *data migrations*, never from a dev seed script. This guard has saved many careers.

## Principle 5: wrap it in a transaction

Like migrations (Module 13.3), wrap the whole seed in a transaction so it's atomic — all the data lands, or none of it (Module 5.6):

```javascript title=transactional-seed.mjs
db.exec('BEGIN');
try {
  // ...all inserts...
  db.exec('COMMIT');
} catch (err) {
  db.exec('ROLLBACK');                       // never leave the DB half-seeded
  console.error('seed failed:', err.message);
  process.exit(1);
}
```

## The complete picture: migrate, then seed

The two commands work in sequence — structure first, then data:

```bash title=setup-database.sh
node --experimental-sqlite examples/node/migrate.mjs        # 1. create the schema
node --experimental-sqlite examples/node/seed-database.mjs  # 2. fill it with data
```

This pair — `make migrate && make seed`, often combined into `make db-setup` (Module 11) — is how a developer goes from "fresh clone" to "working database" in one step. It's a cornerstone of the capstone's `bootstrap` (Module 18).

> [!DOGFOOD]
> The course's `examples/node/seed-database.mjs` (fully narrated in Module 5.6) embodies every principle here: it's **idempotent** (`ON CONFLICT DO NOTHING` + a `--reset` flag), **deterministic** (fixed author/post data), respects **order** (authors before posts, with a guard for unknown authors), and is wrapped in a **transaction** with rollback. Run it twice and watch the counts stay at 3/3 — safe re-running, observable.

> [!TRY]
> Run `migrate.mjs` then `seed-database.mjs`. Run the seed a second time — the counts don't change (idempotency). Then run it with `--reset` and watch it report "cleared" before re-seeding. Finally, imagine adding the production guard from Principle 4 — where would it go, and what would it protect against?

> [!KEY]
> - **Seeding** fills the schema with known starting **data** (DML) — for consistent development, testing, and demos.
> - **Keep seeds separate from migrations**: migrations change structure once (append-only history); seeds insert data and are re-runnable.
> - Seeds must be **idempotent** (`ON CONFLICT DO NOTHING` or `--reset`) and **deterministic** (fixed data; seeded randomness if you need fakes).
> - Respect **foreign-key order** (parents before children; reverse to delete) and **guard against production** (a dev seed deletes data!).
> - Wrap seeds in a **transaction** (atomic). The flow is **migrate then seed** — one step from fresh clone to working database.
