# Secrets Hygiene and the .env.example Pattern

A *secret* — a password, API key, token, private key — is the most dangerous kind of data in your project. One leaked secret can mean a breached database, a drained cloud account, or stolen user data. This lesson is about the discipline ("hygiene") that keeps secrets safe, and the `.env.example` pattern that makes safety the default.

## What counts as a secret

If knowing it lets someone *do something they shouldn't*, it's a secret:

- Database passwords and connection strings
- API keys and tokens (Stripe, AWS, OpenAI, GitHub...)
- Private keys, signing keys, encryption keys
- OAuth client secrets, webhook signing secrets
- Anything labeled "secret," "key," "token," "password," or "credential"

Non-secrets (a port number, a log level, a public URL) can live anywhere. Secrets need care.

## The core rules of secret hygiene

```text title=the-rules
1. NEVER commit secrets to git.
2. NEVER hard-code secrets in source files.
3. NEVER log secrets (they end up in log files, crash reports, CI output).
4. Keep secrets in the environment / a secret manager, not in code.
5. If a secret leaks, ROTATE it (invalidate + replace), don't just hide it.
6. Give each environment its own secrets; never reuse prod secrets in dev.
```

> [!WARNING]
> **A secret in git history is compromised forever.** Deleting it in a later commit does *not* remove it — it's in the history, in every clone, and likely already scraped by automated bots that scan public (and sometimes private) repos within seconds. There is no "undo." The only safe response to a leaked secret is to **rotate** it: generate a new one and revoke the old. Removing it from history (with tools like `git filter-repo`) is cleanup, not a fix.

## Rule 1 in practice: gitignore secrets from day one

The first commit of any project should already ignore secret files:

```bash title=.gitignore
.env
.env.local
.env.*.local
*.pem
*.key
secrets.json
```

> [!GOTCHA]
> `.gitignore` only prevents *untracked* files from being added. If you `git add .env` *before* ignoring it (or it was committed earlier), gitignore won't help — the file is already tracked. You must `git rm --cached .env` to untrack it (and then rotate the secret, since it was committed). Set up the ignore *before* the first `git add`, and this never happens.

## Rule 3 in practice: don't log secrets

A subtle leak: secrets ending up in logs, error messages, or CI output.

```javascript title=logging-secrets.mjs
// BAD: dumps the whole config — including secrets — into the log
console.log('config:', config);                    // config.apiToken is now in your logs!
console.log(`connecting to ${process.env.DATABASE_URL}`);  // password in the URL -> logged

// GOOD: log non-secrets, and redact secrets
console.log('config:', { ...config, apiToken: '***redacted***' });
console.log('connecting to database');             // no credentials in the message
```

CI logs are especially dangerous because they're often visible to more people (and sometimes public for open-source projects). Never `echo $API_TOKEN` in a CI script. Most CI systems (Module 15) automatically *mask* registered secrets in output, but don't rely on it — just don't print them.

## The .env.example pattern in depth

The tension: secrets can't be committed, but a newcomer needs to know *which* variables to set. The resolution (introduced in Module 9.1) is a committed *template* with no real values:

```bash title=.env.example
# Copy to .env and fill in real values:  cp .env.example .env

# --- Database ---
# Local dev connection string. The real prod one lives only in the secret store.
DATABASE_URL=postgres://dev:dev@localhost:5432/app_dev

# --- Secrets (fill these in; never commit the real .env) ---
API_TOKEN=replace-me-with-a-real-token
WEBHOOK_SECRET=replace-me

# --- Behavior (non-secret) ---
LOG_LEVEL=info
```

What makes a *good* `.env.example`:

- **Lists every variable** the app reads — it's the documentation of what's required.
- **Placeholder values** for secrets (`replace-me`), safe dummy values for non-secrets.
- **Comments** explaining each variable's purpose and where real values come from.
- **Committed** to git (it has no real secrets), so it's always available and reviewed.

```bash title=onboarding.sh
# A newcomer's entire config setup:
cp .env.example .env       # get the template
# ...edit .env, fill in real values...
npm run dev                # configured!
```

> [!TIP]
> Keep `.env.example` in sync with the variables your code actually reads. A drifted example (missing a newly-added required variable) means a newcomer's app crashes mysteriously. A nice trick: a startup validation that checks all required variables are present (Module 9.5) effectively *enforces* that `.env.example` and the code agree.

## Where real secrets live in production

`.env` files are for *local development*. Production secrets belong in a purpose-built **secret manager**:

- **Platform env vars / secret stores** — Vercel/Netlify/Heroku config, AWS Secrets Manager, GCP Secret Manager.
- **CI secret stores** — GitHub Actions secrets (Module 15), encrypted and masked in logs.
- **Orchestrator secrets** — Kubernetes Secrets, Docker secrets.

These provide encryption at rest, access control, audit logs, and rotation — things a plaintext `.env` file can't. Your code reads them the same way (`process.env.X`); only the *source* and *security* improve.

> [!DOGFOOD]
> This repo commits `.env.example` (with documented, placeholder values) and gitignores `.env`, `.env.local`, and `.env.*.local`. The CI workflow (Module 15) references secrets through GitHub Actions' secret store, never inline. That's the pattern: example committed, real secrets in a secure store, nothing sensitive in git.

> [!TRY]
> Audit a project you have: run `git log --all -- .env` (does a `.env` appear in history? if so, those secrets need rotating). Check that `.env` is in `.gitignore` and that a `.env.example` exists and matches the variables your code reads. Fixing any gaps is real, valuable security work.

> [!KEY]
> - A **secret** is anything that lets someone do what they shouldn't (keys, tokens, passwords). Treat them with care.
> - Core hygiene: never **commit**, **hard-code**, or **log** secrets; keep them in the environment/secret manager; **rotate** on any leak.
> - A secret in **git history is compromised forever** — deleting it isn't enough; rotate it. Gitignore secret files *before* the first `add`.
> - The **`.env.example` pattern**: commit a documented template (placeholders, comments, every variable) so newcomers configure with `cp .env.example .env` — no secret ever committed.
> - **Production secrets** live in a secret manager (platform/CI/orchestrator), not a `.env` file — same code, far better security.
