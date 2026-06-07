# Zero-Downtime Migrations: The Expand/Contract Pattern

Module 13 taught you to version your schema with migrations. That's necessary but not sufficient at the level where the database is *live*, serving traffic, and a deploy takes minutes. The principal-level question is: *how do you change a running database's schema without breaking the running application — with zero downtime?* The answer is one of the most important patterns in production engineering, and almost nobody learns it until they break production once.

## The trap: a "simple" rename takes down the site

Consider the most innocent-looking migration: rename `users.name` to `users.full_name`. You write it, deploy, and take an outage. Why?

```text title=why-the-naive-rename-breaks
Deploys are NOT atomic with migrations. For a window, OLD code and NEW schema coexist:

  t0: old app running, expects column `name`
  t1: migration runs → column is now `full_name`
  t2: old app (still serving!) does SELECT name → 💥 column does not exist → 500s
  t3: new app finally rolls out
```

Between the migration and the last old instance shutting down, the old code queries a column that no longer exists. During a *rolling deploy* (Module 15.6), old and new versions run *simultaneously* by design. A rename — or a `NOT NULL` add, or a drop — that assumes code and schema change in lockstep is a guaranteed outage.

> [!NOTE]
> The root cause is a distributed-systems truth: **you cannot atomically change code and schema together** across a fleet. There is *always* a window where version N-1 of the app talks to version N of the schema (and sometimes vice versa). Therefore every schema change must be **backward-compatible with the currently-running code.** This single rule — "migrations must be compatible with N-1" — is the whole game.

## The pattern: expand / contract (a.k.a. parallel change)

The solution is to **never make a breaking change in one step.** You split it into a sequence of *individually safe, backward-compatible* steps, separated by deploys. The pattern is called **expand/contract** or **parallel change**:

```text title=expand-contract
EXPAND   →   MIGRATE/BACKFILL   →   CONTRACT
(add the new, keep the old)  (move data, switch code)  (remove the old, once nothing uses it)
```

Let's do the `name → full_name` rename safely, the way it's actually done in production:

### Step 1 — Expand: add the new column (additive, safe)
```sql title=01_expand.sql
ALTER TABLE users ADD COLUMN full_name TEXT;   -- additive: old code ignores it, new code can use it
```
Deploy this migration. Old code still reads/writes `name` and is completely unaffected — `full_name` is just an unused column. **Additive changes are always backward-compatible.**

### Step 2 — Dual-write: make the app write *both*
Deploy app code that writes `name` *and* `full_name` on every update, and reads from `name` (or prefers `full_name`, falling back). Now both columns stay in sync going forward. Crucially, *old instances still work* — they only touch `name`, which still exists.

### Step 3 — Backfill: copy existing data
```sql title=03_backfill.sql
-- Backfill historical rows IN BATCHES (never one giant UPDATE — Module 13.2's locking warning)
UPDATE users SET full_name = name WHERE full_name IS NULL LIMIT 1000;  -- repeat until done
```
Backfilling in *batches* avoids locking the whole table for minutes (Module 13.2). This is idempotent (Module 1.4) — re-running only fills remaining gaps.

### Step 4 — Switch reads: app reads from `full_name`
Deploy code that reads from `full_name` (now fully populated) and still writes both. Verify everything works on the new column.

### Step 5 — Contract: stop writing the old, then drop it
Deploy code that no longer touches `name` at all. *Then*, in a final migration — once you're certain no running code references it — drop the old column:
```sql title=05_contract.sql
ALTER TABLE users DROP COLUMN name;   -- safe now: nothing reads or writes it
```

A one-line rename became *five* deploys. That is not bureaucracy — it's the price of *not taking an outage*, and every step is independently safe and reversible-by-rolling-forward.

> [!WARNING]
> **Never combine an expand and a contract in the same release.** The instant you both add the new *and* remove the old, you've recreated the lockstep assumption that causes outages. The discipline is brutal but simple: **a single deploy may only contain backward-compatible schema changes.** Removing things is always a *separate, later* deploy, gated on "nothing references this anymore."

## This pattern is everywhere, not just columns

Expand/contract generalizes to *any* breaking change in a system with rolling deploys or multiple consumers:

- **API changes**: add the new field/endpoint (expand), migrate clients, remove the old (contract) — never break a field clients still send.
- **Message queues / events**: producers and consumers deploy independently, so add new event fields additively; never remove a field a consumer still reads.
- **Config & feature flags**: introduce the new behavior behind a flag (expand), ramp it, then remove the old path (contract).
- **Renaming anything in a distributed system**: support both names during the transition.

It's the same deep principle as semver's backward-compatibility contract (Module 17.4) and Hyrum's Law (Module 19.6): *in a system you don't fully control the timing of, you can only add and deprecate — never abruptly remove.*

## Decoupling deploy from migrate

A related principal-level practice: **separate "run the migration" from "deploy the code."** If your migration runs automatically as part of app startup (a common anti-pattern), a rolling deploy can have instances racing to migrate, and a failed migration takes down the deploy. Mature setups run migrations as a *distinct, controlled step* (a job, gated, observable — Module 19.5) so you decide exactly when schema changes apply, independent of code rollout. Expand/contract *requires* this decoupling: the whole point is that schema and code change at different, carefully-ordered times.

> [!DOGFOOD]
> The course's `migrate.mjs` (Module 13.5) is intentionally a *separate command*, not bolted onto app startup — exactly the decoupling this lesson requires. Its forward-only, tracked, idempotent design (Module 13.3) is the foundation expand/contract builds on: each of the five steps above is just another tracked, forward-only migration in the sequence. The capstone's `migrate` and `seed` being distinct from `dev` (Module 18.6) reflects the same separation of concerns.

> [!TRY]
> Take a breaking change you might make — splitting a `name` column into `first_name`/`last_name`, or changing a column's type, or making a nullable column `NOT NULL` — and write out the expand/contract sequence: which additive migration first, what dual-write code, what backfill (in batches), when you switch reads, and the final contracting migration. Notice that *every intermediate state* is one where old and new code both work. That property — never a moment where running code is incompatible with the schema — *is* zero-downtime.

> [!KEY]
> - Deploys and migrations are **not atomic** — old code and new schema *always* coexist for a window (especially during rolling deploys), so **every schema change must be backward-compatible with N-1 code.**
> - A naive rename/drop/`NOT NULL`-add in one step causes outages; split it with **expand/contract (parallel change)**: add new → dual-write → backfill (in batches) → switch reads → drop old.
> - **Never put an expand and a contract in the same release** — removal is always a separate, later, gated deploy.
> - The pattern generalizes to **APIs, events, flags, and any rename in a distributed system** — you can only *add and deprecate*, never abruptly remove (cf. semver, Hyrum's Law).
> - **Decouple migrate from deploy** (a separate, controlled, observable step) — which the course's standalone `migrate.mjs` already does.
