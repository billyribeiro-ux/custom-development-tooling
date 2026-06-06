# Idempotency, Determinism, and Reproducibility

Three words that sound academic but are the difference between tooling you trust and tooling that bites you at 2am. Master these and your scripts become *boring* — which, for tooling, is the highest praise.

## Idempotency: safe to run again

A script is **idempotent** if running it twice has the same effect as running it once. No duplicates, no errors, no damage from the second run.

The name comes from math, but the intuition is simple: pressing a "floor 3" elevator button twice doesn't take you to floor 6. It's already handled.

Why does this matter so much? Because **things fail halfway.** A network blips, a script crashes, you hit Ctrl+C. If your script is idempotent, the fix is trivial: *just run it again.* If it isn't, re-running might create duplicate database rows, or crash because "the folder already exists," and now you're cleaning up by hand.

Compare:

```bash title=not-idempotent.sh
mkdir build              # fails the SECOND time: "File exists"
echo "user" >> users.txt  # appends a DUPLICATE every run
```

```bash title=idempotent.sh
mkdir -p build           # -p: fine if it already exists
# Write the whole file each time instead of appending:
echo "user" > users.txt  # same result no matter how many times you run it
```

The same idea in SQL — note the `IF NOT EXISTS` and the conflict handling:

```sql title=idempotent.sql
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT UNIQUE);

-- Running this twice won't create a duplicate or crash:
INSERT INTO users (email) VALUES ('a@example.com')
  ON CONFLICT(email) DO NOTHING;
```

> [!DOGFOOD]
> The course's `seed-database.mjs` (Module 5) uses exactly this `ON CONFLICT DO NOTHING` pattern, so you can re-seed any time without creating duplicate authors. The migration runner records which migrations ran, so re-running skips applied ones. Both are idempotent on purpose.

> [!TIP]
> Design for idempotency by asking: "If this script dies on line 12 and I run it again, what happens?" If the answer is "it cleanly finishes the job," you're idempotent. If it's "it duplicates things or crashes," fix that.

## Determinism: same input, same output

A process is **deterministic** if the same input always produces the same output. No randomness, no "depends on what time it is," no "depends on which files happened to be lying around."

Determinism is what makes results *trustworthy* and *cacheable*. If a build is deterministic, you can cache its output keyed on its input — and that's how fast CI and incremental builds work.

Non-determinism sneaks in through:

- **Time** — embedding `new Date()` in output makes every build differ.
- **Randomness** — unseeded random IDs.
- **Ordering** — iterating a set/map in an undefined order (one of the most common culprits).
- **The environment** — reading whatever version of a tool happens to be installed.

```javascript title=non-deterministic.mjs
// BAD: output changes every run, even with identical input
const id = Math.random();
const builtAt = new Date().toISOString();
```

```javascript title=deterministic.mjs
// GOOD: derive IDs from the input itself, so identical input -> identical output
import { createHash } from 'node:crypto';
const id = createHash('sha256').update(content).digest('hex').slice(0, 8);
```

> [!GOTCHA]
> Iteration order is the silent determinism killer. `Object.keys()` order in JS is mostly stable, but iterating a `Set` built from filesystem reads, or relying on directory listing order, is not guaranteed across systems. **Sort explicitly** when order matters. This course's generator sorts migration files before applying them for exactly this reason.

## Reproducibility: same result, anywhere, anytime

**Reproducibility** is determinism extended across *machines and time*: your build produces the same result on your laptop, your teammate's laptop, the CI server, and six months from now.

This is the holy grail of tooling, and it's why so many things exist:

- **Lockfiles** pin exact dependency versions (Module 8).
- **Containers** pin the whole operating environment (Module 14).
- **Version pinning** (`node-version: 22`, not "latest") pins the tools themselves.
- **Vendoring / caching** removes dependence on a server being up.

"It works on my machine" is precisely a *failure of reproducibility* — your machine has some state (a version, an env var, a file) that the other machine lacks.

## How they relate

```text title=the-hierarchy
idempotent     = safe to re-run            (resilience to failure)
deterministic  = same input -> same output  (trust + caching)
reproducible   = same result everywhere     (determinism across machines/time)
```

You'll reach for these constantly. When a script feels flaky or "works sometimes," it's almost always violating one of these three.

> [!TRY]
> Take a script you've written (or `examples/node/seed-database.mjs`). Run it twice. Did anything break or duplicate? If yes, it's not idempotent — figure out which line is the culprit and how `-p`, `IF NOT EXISTS`, or `ON CONFLICT` would fix it.

> [!KEY]
> - **Idempotent**: running twice = running once. Achieve it with `mkdir -p`, `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, and writing-not-appending.
> - **Deterministic**: same input → same output. Avoid time, randomness, and undefined ordering (**sort explicitly**).
> - **Reproducible**: same result across machines and time. Achieved via lockfiles, containers, and version pinning.
> - Flaky, "works sometimes" tooling almost always breaks one of these three.
