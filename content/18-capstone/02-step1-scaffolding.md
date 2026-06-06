# Step 1 — package.json + pyproject.toml Scaffolding

Every project starts with its foundation: the manifests and config files that declare what it is, what it needs, and how it's operated. We scaffold Linkboard's `package.json`, `pyproject.toml`, `tsconfig.json`, and the supporting dotfiles. Get this right and everything else has somewhere to live.

## Start the repo

```bash title=scaffold.sh
mkdir linkboard && cd linkboard
git init
mkdir -p scripts tools migrations tests/e2e .github/workflows
```

A fresh git repo (so version control is there from commit one) and the directory skeleton from the brief (Module 18.1).

## package.json: the Node foundation

The control center for the Node side (Module 8.2). Define identity, the module system, and the *scripts* that name every command:

```json title=package.json
{
  "name": "linkboard",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "migrate": "node --experimental-sqlite scripts/migrate.mjs",
    "seed": "node --experimental-sqlite scripts/seed.mjs",
    "build:assets": "node scripts/build-assets.ts",
    "build:pages": "python3 tools/generate-pages.py",
    "test:e2e": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "1.60.0",
    "@types/node": "22.10.5",
    "typescript": "5.7.3"
  }
}
```

The choices, each grounded in a module:

- **`"version": "0.1.0"`** — start pre-1.0 (Module 17.4 — "unstable, may change" while you're building).
- **`"private": true`** — never accidentally publish (Module 8.2).
- **`"type": "module"`** — modern ESM (Module 5.1).
- **`"engines": { "node": ">=22" }`** — declare the Node requirement (Module 8.2), since we use `--experimental-sqlite` and native TS.
- **`scripts`** — named entry points (Module 8.2). These are the *verbs* the Makefile (Step 6) will wrap.
- **`devDependencies`** — Playwright, TypeScript, types — all *dev* tools, not runtime (Module 8.2). Linkboard's tooling needs no *runtime* npm dependencies (it uses Node built-ins), so there's no `dependencies` block — deliberately minimal (Module 5.2).

## pyproject.toml: the Python foundation

The Python generator (Step 3) needs a project file (Module 10.2):

```toml title=pyproject.toml
[project]
name = "linkboard"
version = "0.1.0"
description = "Tooling for the Linkboard capstone."
requires-python = ">=3.11"
dependencies = []                      # stdlib only — no runtime deps (Module 6.4)

[dependency-groups]
dev = ["ruff>=0.6"]                     # the linter (Module 10.3)

[tool.ruff]
line-length = 100

[tool.ruff.lint]
select = ["E", "W", "F", "I", "UP", "B"]
```

Mirroring the course's own `pyproject.toml`: a `[project]` table with `requires-python` (Module 10.2), an empty `dependencies` (the generator uses only the stdlib, Module 6.4), a `dev` group with `ruff`, and `[tool.ruff]` config (Module 10.3). One file for Python metadata *and* tool config.

## tsconfig.json: TypeScript settings

For the `.ts` build script and the Playwright tests (Module 8.3):

```jsonc title=tsconfig.json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "types": ["node"],
    "strict": true,                              // mandatory (Module 8.3)
    "noUncheckedIndexedAccess": true,
    "noEmit": true,                              // run .ts directly, only check (Module 7.5)
    "forceConsistentCasingInFileNames": true     // catch case bugs before CI (Module 17.3)
  },
  "include": ["scripts/**/*.ts", "tests/**/*.ts"]
}
```

`strict: true` (non-negotiable, Module 8.3), `noEmit` (we run `.ts` directly, Module 7.5), and `forceConsistentCasingInFileNames` (the cross-platform safeguard, Module 17.3).

## The supporting dotfiles

The small files that prevent big problems:

```text title=.gitignore
/dist/                 # generated assets (Module 1.3)
/site/                 # generated pages
node_modules/
.env                   # secrets — NEVER commit (Module 9.3)
.env.*.local
/test-results/         # Playwright output (Module 16)
*.db                   # the SQLite database (an artifact)
```

```text title=.gitattributes
* text=auto            # normalize line endings (Module 17.3)
*.sh text eol=lf       # shell scripts MUST be LF
```

```bash title=.env.example
# Copy to .env and fill in real values:  cp .env.example .env  (Module 9.3)
DATABASE_PATH=./linkboard.db
LOG_LEVEL=info
SITE_OUTPUT_DIR=site
```

- **`.gitignore`** — ignore artifacts (Module 1.3) and *especially* `.env` (Module 9.3).
- **`.gitattributes`** — normalize line endings so `.sh` scripts work cross-platform (Module 17.3).
- **`.env.example`** — the committed template documenting every variable (Module 9.3), with safe placeholder values.

## Lock and commit

```bash title=lock-and-commit.sh
npm install              # creates package-lock.json (Module 8.4)
git add -A
git commit -m "scaffold: project manifests and config"
```

`npm install` generates the **lockfile** (Module 8.4) — commit it (the deliberate exception, Module 1.3). This first commit is the foundation; everything else builds on it.

> [!TIP]
> Notice how *much* is decided in the scaffolding: the module system (ESM), the language versions (Node 22, Python 3.11), strictness (TS strict, ruff rules), what's ignored, what's documented. These choices, made once at the start, shape every later file. A few minutes of deliberate scaffolding saves hours of inconsistency later — it's the highest-leverage time in a project. (This *is* the project's "constitution.")

> [!DOGFOOD]
> Every file here mirrors one in *this* repo — compare Linkboard's `package.json` to the course's (Module 8.2), its `pyproject.toml` to the course's (Module 10.2), its `tsconfig.json` to the course's (Module 8.3). The course's scaffolding *is* your reference. Open them side by side.

> [!TRY]
> Create the `linkboard/` folder and add all the files from this lesson, adapting them from the course's equivalents. Run `npm install` to generate the lockfile, then `git commit`. You now have a properly-scaffolded project — the foundation for every following step.

> [!KEY]
> - Scaffolding lays the foundation: **`package.json`** (identity, `type: module`, `engines`, **scripts**, devDependencies — Module 8.2), **`pyproject.toml`** (Module 10.2), **`tsconfig.json`** (strict, noEmit — Modules 8.3/7.5).
> - Supporting dotfiles prevent big problems: **`.gitignore`** (artifacts + `.env`, Modules 1.3/9.3), **`.gitattributes`** (line endings, Module 17.3), **`.env.example`** (documented template, Module 9.3).
> - **`npm install`** generates the **lockfile** — commit it (Module 8.4/1.3).
> - Scaffolding choices (module system, versions, strictness) **shape every later file** — deliberate setup is the highest-leverage time in a project.
> - The course's own scaffolding files are your **reference implementation**.
