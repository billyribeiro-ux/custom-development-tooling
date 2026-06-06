# Validating env at Startup (Fail Fast)

The final piece of robust configuration: **check that everything you need is present and valid the moment your program starts** — and refuse to run if it isn't. This "fail fast" discipline turns confusing, deep-in-the-code crashes into a single clear error at launch. It's a small habit with an outsized payoff.

## The problem: failing late

Without validation, a missing or wrong environment variable doesn't fail *now* — it fails *later*, far from the cause, with a confusing message:

```javascript title=failing-late.mjs
// No validation. DATABASE_URL is missing/typo'd...
const port = process.env.PORT;            // undefined — no error yet
// ...500 lines and 3 seconds later, when the first request comes in:
await db.connect(process.env.DATABASE_URL); // 💥 "connect ECONNREFUSED undefined:undefined"
```

The error appears deep in the database layer, at request time, with a message that doesn't mention "you forgot to set DATABASE_URL." Someone burns 30 minutes debugging a problem that a one-line check would have explained instantly. Late failure is *expensive failure*.

## Fail fast: validate at startup

Check all required configuration *before doing any work*, and exit with a clear message if anything's wrong:

```javascript title=validate-startup.mjs
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    console.error(`See .env.example for the full list.`);
    process.exit(1);                         // refuse to start (Module 2.5)
  }
  return value;
}

// At the very top of your program, before anything else runs:
const config = {
  databaseUrl: requireEnv('DATABASE_URL'),
  apiToken: requireEnv('API_TOKEN'),
  port: Number(process.env.PORT ?? 8080),
  logLevel: process.env.LOG_LEVEL ?? 'info',
};
```

Now a missing `DATABASE_URL` produces, *at launch*: `Missing required environment variable: DATABASE_URL. See .env.example for the full list.` — pointing straight at the problem and the fix. The program never reaches the confusing deep failure because it refused to start.

## Validate types and ranges, not just presence

Presence isn't enough — a value can be present but *wrong* (Module 9.4's `NaN` trap). Validate the shape:

```javascript title=validate-values.mjs
const port = Number(process.env.PORT ?? 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`PORT must be an integer 1-65535, got: ${process.env.PORT}`);
  process.exit(1);
}

const level = process.env.LOG_LEVEL ?? 'info';
const VALID_LEVELS = ['debug', 'info', 'warn', 'error'];
if (!VALID_LEVELS.includes(level)) {
  console.error(`LOG_LEVEL must be one of ${VALID_LEVELS.join(', ')}, got: ${level}`);
  process.exit(1);
}
```

This catches `PORT=80a0` (not a number), `PORT=99999` (out of range), and `LOG_LEVEL=verbose` (not a valid choice) — each with a message stating exactly what's allowed and what was given. (This is the runtime-validation point from Module 8.5: types guard your code, but only runtime checks guard the actual values.)

## The Python version

```python title=validate_env.py
import os
import sys

def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        print(f"Missing required environment variable: {name}", file=sys.stderr)
        print("See .env.example for the full list.", file=sys.stderr)
        sys.exit(1)
    return value

database_url = require_env("DATABASE_URL")
port = int(os.environ.get("PORT", "8080"))   # raises ValueError if not numeric -> handle if needed
```

Same shape (Module 6.1): check at startup, error to stderr, `sys.exit(1)`. The discipline is language-independent.

## Collect all errors, don't fail on the first

A nicer-to-use variant: report *every* problem at once, so the user fixes them all in one pass instead of one-error-at-a-time:

```javascript title=collect-errors.mjs
const errors = [];
const required = ['DATABASE_URL', 'API_TOKEN', 'WEBHOOK_SECRET'];
for (const name of required) {
  if (!process.env[name]) errors.push(`Missing required env var: ${name}`);
}
if (errors.length > 0) {
  console.error('Configuration errors:\n  ' + errors.join('\n  '));
  process.exit(1);
}
```

> [!TIP]
> Reporting all errors at once respects the user's time: they see "you're missing `DATABASE_URL`, `API_TOKEN`, and `WEBHOOK_SECRET`" in one go, instead of running, fixing one, running, fixing the next. The best tools fail *informatively* — they tell you everything that's wrong, clearly, in one shot.

## Schema validation libraries

For substantial config, a validation library declares the whole expected shape once and validates (and type-coerces) against it:

```javascript title=zod-style.mjs
// Illustrative (e.g. with Zod): declare the schema, parse, get typed + validated config
const ConfigSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});
const config = ConfigSchema.parse(process.env);   // throws a detailed error if anything's invalid
```

For small tooling, the hand-written checks above are perfectly fine (and dependency-free). For larger or user-facing config, a schema library is worth it — it centralizes the rules and gives great error messages. Same trade-off as Module 8.5.

## Why this is a principal-engineer habit

Fail-fast validation embodies a deep principle (Module 1.5's "design the failure"): **detect problems as close to their cause as possible.** A missing env var detected at startup, with a clear message, costs seconds. The same problem detected at request time in production, with a cryptic message, can cost an outage. Senior engineers instinctively push validation to the boundary and fail loudly there, so failures are obvious and cheap rather than mysterious and expensive.

> [!DOGFOOD]
> This course's `.env.example` lists every variable the project understands — which *is* the contract that startup validation would check against. A production build of the app would call `requireEnv` for each secret at launch, so a missing `DATABASE_URL` fails immediately with "see .env.example," not three seconds later with a database stack trace.

> [!TRY]
> Write a `requireEnv` function and use it for a made-up `API_TOKEN`. Run your script *without* setting it — see the clear startup error and exit code 1. Set it and watch the script proceed. You've turned a future cryptic crash into an immediate, actionable message.

> [!KEY]
> - **Validate all required config at startup** and refuse to run if it's wrong — turn confusing late crashes into one clear early error.
> - Check **presence** *and* **type/range/choices** (a present-but-wrong value, like `PORT=80a0`, is still a bug — runtime checks guard the data, Module 8.5).
> - Error to **stderr** with a message that states what's required and where to look (e.g. `.env.example`), then **`exit(1)`**.
> - **Collect and report all errors at once** so users fix everything in one pass; use a schema library for large/user-facing config.
> - It embodies "**detect problems closest to their cause**" — cheap, obvious failure beats expensive, mysterious failure.
