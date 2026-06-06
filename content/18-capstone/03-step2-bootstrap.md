# Step 2 — A .sh Bootstrap + .env Validation

With the scaffolding in place (Module 18.2), we write the script that gets a fresh clone *ready*: `scripts/bootstrap.sh`. It installs dependencies, sets up the environment, and validates configuration — applying everything from the shell modules (2-4) and env module (9). This is the script behind `make bootstrap`.

## The bootstrap's job

A bootstrap script answers "I just cloned this — now what?" It should be **idempotent** (Module 1.4 — safe to run repeatedly), **fail loudly** (Module 5.5), and leave the project ready to use. For Linkboard it will: ensure tools exist, install dependencies, create `.env` from the template, and validate the config.

## The script

```bash title=scripts/bootstrap.sh
#!/usr/bin/env bash
# bootstrap.sh — get a fresh Linkboard clone ready to run. Idempotent.
set -euo pipefail                                  # safety preamble (Module 3.2)

readonly PROG="${0##*/}"                            # program name (Module 3.3)
log() { printf '[%s] %s\n' "$PROG" "$*" >&2; }     # log to stderr (Module 2.4)
die() { log "ERROR: $*"; exit 1; }                 # fail loudly (Module 3.5)

# 1. Check required tools exist (fail fast with a clear message — Module 9.5)
for tool in node npm python3; do
  command -v "$tool" >/dev/null || die "$tool is required but not found on PATH"
done
log "tools OK"

# 2. Check Node major version (we need >= 22 — Module 8.2's engines, enforced)
node_major="$(node -p 'process.versions.node.split(".")[0]')"
(( node_major >= 22 )) || die "Node 22+ required, found v$node_major"

# 3. Install dependencies reproducibly (Module 8.4)
log "installing dependencies..."
npm ci                                              # exact versions from the lockfile

# 4. Create .env from the template if it doesn't exist (idempotent — Module 1.4)
if [[ ! -f .env ]]; then
  cp .env.example .env                              # the .env.example pattern (Module 9.3)
  log "created .env from template — review it and fill in any secrets"
else
  log ".env already exists, leaving it alone"
fi

# 5. Set up the database (migrate + seed — Steps 4, and Module 13)
log "setting up database..."
npm run migrate
npm run seed

log "bootstrap complete ✨  run 'make dev' to start"
```

## Walking through the design

Every line draws on a module you've completed:

- **Safety preamble** `set -euo pipefail` (Module 3.2) — abort on errors, unset vars, broken pipes.
- **`log`/`die` helpers** (Module 3.5) — consistent messages to stderr (Module 2.4); `die` fails loudly with a clear message (Module 5.5).
- **Tool check** (step 1) — `command -v tool || die` (Modules 2.7, 3.5) verifies `node`/`npm`/`python3` are on PATH (Module 2.2) *before* doing work, with a clear error if not (fail fast, Module 9.5).
- **Version check** (step 2) — confirms Node 22+ (matching `engines`, Module 8.2), using arithmetic comparison `(( ))` (Module 3.4).
- **`npm ci`** (step 3) — reproducible install from the lockfile (Module 8.4), not `npm install`.
- **`.env` creation** (step 4) — the `.env.example` → `.env` pattern (Module 9.3), made *idempotent* with the `[[ ! -f .env ]]` guard (Module 1.4): it won't clobber an existing `.env` on re-run.
- **Database setup** (step 5) — runs the migrate and seed scripts (Module 13), composing smaller commands (Module 17.1).

The whole thing is idempotent: run it ten times and it converges to the same ready state without errors or duplicates (Module 1.4) — exactly what you want from setup.

## Add env validation to the scripts

The bootstrap creates `.env`, but the *scripts that use it* should validate it at startup (Module 9.5 — fail fast). Add a tiny shared validator the Node scripts call:

```javascript title=scripts/env.mjs
// env.mjs — load and validate configuration once, fail fast (Module 9.5)
function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name} (see .env.example)`);
    process.exit(1);                               // fail fast (Module 2.5, 9.5)
  }
  return v;
}

export const config = {
  databasePath: process.env.DATABASE_PATH ?? './linkboard.db',  // default (Module 9.4)
  logLevel: process.env.LOG_LEVEL ?? 'info',
};
```

Scripts run with `node --env-file=.env scripts/migrate.mjs` (Module 9.2 — built-in env loading) so `.env` populates `process.env`, then read validated config from this module. (You'd add `requireEnv` calls for any real secrets.) Config precedence (Module 9.4): the env var wins, with a sane default fallback.

> [!GOTCHA]
> Make the bootstrap safe to run on a machine that's *already* set up (re-running after a `git pull`, for instance). That's why step 4 guards `.env` creation and steps 3-5 use idempotent operations (`npm ci`, `IF NOT EXISTS` migrations, `ON CONFLICT` seeds — Module 13). A bootstrap that *breaks* or *duplicates* on the second run (Module 1.4) is a bootstrap people stop trusting. Idempotency is non-negotiable for setup scripts.

> [!DOGFOOD]
> This bootstrap follows the same patterns as the course's `clean-cache.sh` (Module 3.7): `set -euo pipefail`, a `log` helper, `${0##*/}` for the program name, guards before actions, and clear summary output. And the env loading mirrors the course's `.env.example` (Module 9.3) read via Node's `--env-file` (Module 9.2). Reuse those files as templates.

> [!TRY]
> Write `scripts/bootstrap.sh`, `chmod +x` it (Module 3.1), and run `./scripts/bootstrap.sh` *twice*. The first run sets everything up; the second run should complete cleanly without errors or duplicates — proving idempotency (Module 1.4). Then run it with a tool renamed/hidden and watch it `die` with a clear message (fail fast, Module 9.5).

> [!KEY]
> - `bootstrap.sh` makes a fresh clone ready: check tools (Module 2.7), verify versions, `npm ci` (Module 8.4), create `.env` from the template (Module 9.3), set up the database (Module 13).
> - It uses the **shell discipline** from Modules 2-4: `set -euo pipefail`, `log`/`die` helpers to stderr, guards before actions, clear summary.
> - It must be **idempotent** (Module 1.4) — safe to re-run (guard `.env` creation, use idempotent installs/migrations/seeds) — or people stop trusting it.
> - Scripts **load `.env` via `--env-file`** (Module 9.2) and **validate config at startup** (`requireEnv`, fail fast — Module 9.5), with default fallbacks (Module 9.4).
> - It **composes** smaller commands (`npm ci`, `npm run migrate`, `npm run seed`) — Module 17.1 — and becomes the `make bootstrap` target (Step 6).
