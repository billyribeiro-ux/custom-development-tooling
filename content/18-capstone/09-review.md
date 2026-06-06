# Capstone Review, Checklist, and Where to Go Next

You did it. You've built a complete, automated tooling suite for Linkboard — and along the way, you've learned to build *any* custom development tooling you want. This final lesson reviews what you've assembled, gives you a reusable checklist for future projects, and points the way forward.

## What you built

Linkboard went from an empty folder to a fully-automated project across seven steps:

```text title=the-journey
Step 1  Scaffolding     package.json, pyproject.toml, tsconfig.json, dotfiles
Step 2  Bootstrap       bootstrap.sh + .env validation (idempotent setup)
Step 3  Build           build-assets.ts (TS) + generate-pages.py (Python)
Step 4  Migrations      0001_init.sql + migrate.mjs + seed.mjs
Step 5  Containers      multi-stage Dockerfile + docker-compose.yml
Step 6  Makefile        one front door for every task
Step 7  CI + E2E        Playwright tests + GitHub Actions pipeline
```

Every file type from the course title — `.mjs`, `.py`, `.sh`, `.sql`, `.ts`, `.json`, `.env`, `.yml`, `.toml`, `Makefile`, `Dockerfile`, `.config.*` — is there, each doing a real job, all composed into a system where **`make bootstrap`** and **`make dev`** are all a newcomer needs (Module 18.1's promise, delivered).

## The principles that tie it all together

Step back from the specific files and notice the *principles* that recurred in every module — these are what you actually learned:

1. **Executable beats written** (Module 1.1) — a script that runs beats a README that rots.
2. **Shorten the feedback loop** (Module 1.2) — fast, trustworthy automation keeps you in flow.
3. **Source vs artifact** (Module 1.3) — commit source, generate artifacts, never edit the output.
4. **Idempotency, determinism, reproducibility** (Module 1.4) — safe to re-run, same input → same output, same result everywhere.
5. **Design the failure first** (Module 1.5, 5.5) — fail fast, fail loud, with clear messages and non-zero exit codes.
6. **Single source of truth** (Module 0.4) — one place defines order/version/config; everything else derives from it.
7. **Match the tool to the task** (Module 6.5) — bash for glue, Node/Python for data, the right format for config.
8. **Compose small things** (Module 17.1) — small scripts behind a task runner behind CI; one set of commands, called everywhere.
9. **Let machines check the mechanical stuff** (Modules 3.8, 7.3, 10.3) — linters, type-checkers, tests, in CI.
10. **Separate config from code** (Module 9) — and keep secrets out of both.

The *files* will change from project to project. These *principles* won't. That's the transferable skill — the thing that lets you build "whatever drip you want."

## A reusable checklist for any new project

When you start your next project, walk this list — it's the capstone, generalized:

```text title=tooling-checklist
□ Scaffold: manifest(s), config, .gitignore, .gitattributes, .env.example
□ Lockfile committed (npm ci / uv sync for reproducible installs)
□ A bootstrap path: one command from clone to running (idempotent)
□ Config from the environment, validated at startup, secrets gitignored
□ Build scripts: source → artifact, in the right language(s)
□ Database: versioned migrations + a runner + idempotent seeds (if you have a DB)
□ A Makefile (or just/task): named tasks for build/test/lint/clean/dev
□ Linters + type-checker wired into the Makefile
□ Tests (unit/integration/E2E as the pyramid suggests)
□ Containers if the environment is hard to reproduce
□ CI: run the same make targets on every push/PR; gate merges on green
□ Deploy: only what passed, only from main, automated
□ Versioning + a changelog when you start releasing
```

Print it, adapt it, use it. Most projects don't need *every* item (a static site needs no database; a library needs no compose) — match it to the task (Module 6.5). But this list is the shape of mature tooling.

## How to keep growing

You now have the foundation. To deepen it:

- **Build your own tools.** The fastest learning is doing. Automate something annoying in your daily workflow — that's a real tool with a real user (you).
- **Read others' tooling.** Open the `Makefile`, `package.json` scripts, and CI of projects you admire on GitHub. You can now *read* them fluently. Steal good patterns.
- **Go deeper where you specialize.** Each module is a doorway: advanced bash, Playwright's full API, Kubernetes (beyond compose, Module 14.4), observability platforms (beyond logging, Module 17.2), monorepo tooling, build systems like Bazel.
- **Stay current.** Tooling evolves (this is the 2026 edition). The *principles* are stable, but the *tools* improve — new Node built-ins, faster linters, better runners. Re-evaluate periodically (Module 11.6's "don't over-optimize, but do reassess").

> [!TIP]
> The mark of a principal-level engineer isn't knowing every tool — it's the *instinct* for when a manual process should become a script, which language fits, how to make it reproducible, and how to compose it into the system. You've built that instinct by building real things. Trust it, keep building, and your tooling will keep getting better. The leverage compounds (Module 1.2).

> [!DOGFOOD]
> One last dogfood, the biggest of all: **this entire course is itself a capstone.** It has a manifest (`course.json`), generators (`generate-pages.mjs`/`.py`), example scripts, a Makefile, Playwright tests, a Dockerfile, and CI — every single thing you just built for Linkboard. The pages you read were produced by the exact patterns you learned. You didn't just study custom development tooling; you experienced a complete, working example of it, end to end. Now go build your own.

> [!TRY]
> Your real final exercise: pick something you do manually and repeatedly — and automate it. A script to set up a new project, generate a report, clean up files, deploy something. Apply the checklist. Make it idempotent, give it a `--help`, wire it into a Makefile, add a test. That tool — built by you, for you — is the proof you've mastered this. Welcome to the craft.

> [!KEY]
> - You built **every file type from the course title** into one automated system (Linkboard), delivering the **two-command** experience (`make bootstrap`, `make dev`).
> - The transferable skill is the **principles** (executable-beats-written, feedback loops, source-vs-artifact, idempotency, fail-fast, single-source-of-truth, right-tool, composition, machine-checks, config-vs-code) — files change, principles don't.
> - Keep the **reusable checklist** for any new project; apply only what each task needs (Module 6.5).
> - Grow by **building your own tools**, reading others' tooling fluently, specializing deeper, and staying current.
> - **This course is itself the capstone** — built by the tooling it teaches. Now go build whatever you want.
