# Worked Example: A Workflow That Lints, Tests, Builds

Let's read this course's actual CI pipeline — `.github/workflows/ci.yml` — line by line. It's the culmination of the entire course: every tool you've built (linters, type-checker, generator, tests) becomes an automatic gate. By the end you'll be able to write a real, production-grade pipeline for any project.

> [!DOGFOOD]
> This is the real workflow that runs on this repository. Open `.github/workflows/ci.yml` alongside this lesson. When you push to the course repo, *this* runs.

## Header: name, triggers, permissions, concurrency

```yaml title=ci.yml
name: CI

on:
  push:
    branches: ["main"]
  pull_request:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

- **`name: CI`** — what shows in the Actions tab.
- **`on:`** the triggers (Module 15.2): every push to `main`, and *every pull request*. This implements the key pattern — gate PRs, run on main.
- **`permissions: contents: read`** — least privilege for the whole workflow (Module 15.4); the deploy job will widen this narrowly.
- **`concurrency` with `cancel-in-progress: true`** (Module 15.4) — if you push again, the old run is cancelled. No wasted minutes on superseded code.

## The build job: setup

```yaml title=ci.yml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci
```

The job runs on a fresh `ubuntu-latest` runner (Module 15.3). The first three steps are setup:

- **`actions/checkout@v4`** — clone the repo onto the empty runner (Module 15.3 — never forget this!).
- **`actions/setup-node@v4`** with `node-version: 22` and `cache: npm` — install Node 22 onto PATH (Module 2.2) and cache the npm download cache keyed on the lockfile (Module 15.4) for fast installs.
- **`npm ci`** — install dependencies *reproducibly* from the lockfile (Module 8.4), not `npm install`. This is the production-correct choice.

Each is pinned to `@v4` for reproducibility and security (Module 15.3).

## The gates: lint, type-check, build, test

```yaml title=ci.yml
      - name: Lint shell scripts
        run: |
          sudo apt-get update && sudo apt-get install -y shellcheck
          shellcheck examples/shell/*.sh

      - name: Type-check TypeScript
        run: npx tsc --noEmit

      - name: Build the site
        run: node tools/generate-pages.mjs

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run end-to-end tests
        run: npx playwright test
```

This is the heart — each step is a *gate* (Module 15.2), and each runs a tool you built earlier in the course:

- **Lint shell** — installs and runs **ShellCheck** (Module 3.8) on the example scripts. A `run: |` multi-line block (Module 15.1). If any script has a bug, ShellCheck exits non-zero (Module 2.5) and the job fails.
- **Type-check** — `npx tsc --noEmit` (Module 7.3) verifies the TypeScript. Note `--noEmit`: it only *checks*, doesn't compile (Module 7.5). A type error fails the gate.
- **Build the site** — runs the generator (Module 5.7). If the build throws (bad manifest, missing template), its `main().catch(... exit(1))` (Module 5.5) makes it exit non-zero, failing the gate. This is *why* the generator exits non-zero on failure — so CI catches it.
- **Install Playwright browsers** then **Run e2e tests** — download Chromium, then run the Playwright tests (Module 16) against the built site. A failing test fails the gate.

The steps run *in order*; any non-zero exit (Module 2.5) stops the job. This is the pipeline-as-chain-of-exit-codes from Module 15.2, made concrete. Every gate is a tool from this course, now automatic.

> [!NOTE]
> Notice CI runs essentially the same commands as the `Makefile` (Module 11.5) and as you would locally — `shellcheck`, `tsc --noEmit`, the generator, `playwright test`. That alignment (Module 15.2's tip) means "passes locally" and "passes CI" are the same thing, and any CI failure is reproducible on your machine. No "works locally, fails in CI" mystery.

## Uploading the build artifact

```yaml title=ci.yml
      - name: Upload the built site
        uses: actions/upload-pages-artifact@v3
        with:
          path: site
```

After a successful build, this uploads the generated `site/` directory as a *Pages artifact* — handing it off to the deploy job (Module 15.6). The artifact is the built site (Module 1.3 — the artifact, derived from source), packaged for deployment.

## The deploy job

```yaml title=ci.yml
  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

The second job, `deploy`:

- **`needs: build`** (Module 15.3) — only runs *after* `build` succeeds. You never deploy a failed build.
- **`if: github.ref == 'refs/heads/main'`** (Module 15.3) — only deploys on the **main** branch. Pull requests run all the *checks* (the build job) but do *not* deploy — exactly the "gate PRs, deploy main" pattern (Module 15.2). This is also a security boundary (Module 15.4): forked PRs can't trigger a deploy.
- **`permissions: pages: write, id-token: write`** (Module 15.4) — this job *widens* the workflow's default read-only permissions, narrowly, to what deployment needs.
- **`actions/deploy-pages@v4`** — publishes the uploaded artifact to GitHub Pages (Module 15.6).

## The complete flow

Step back and see the whole pipeline:

```text title=the-pipeline
push/PR ──> build job: checkout → setup-node → npm ci → lint → type-check
                      → build → playwright → upload artifact
                                    │
                          (on main only, after build succeeds)
                                    ▼
            deploy job: publish artifact to GitHub Pages
```

On a **pull request**: the build job runs all the gates and reports green/red — blocking the merge if anything fails (Module 15.2), but *not* deploying. On a **push to main**: the same gates run, *then* the site deploys. This is a complete, production-grade CI/CD pipeline — and every gate is a tool you understand deeply because you built it.

> [!TIP]
> This workflow is a *template you can adapt to almost any project.* Swap the specific commands (your linter, your test runner, your build) and the structure — checkout, setup, cached install, gates in order, conditional deploy on main — stays the same. You've now seen the canonical shape of CI/CD; the rest is filling in your project's commands.

> [!TRY]
> In the repo, read `.github/workflows/ci.yml` top to bottom and map each step to its course module: checkout/setup (15.3), npm ci (8.4), shellcheck (3.8), tsc (7.3), generator (5.7), playwright (16), deploy (15.6). Then identify the two things that make deploy *conditional*: `needs: build` and `if: github.ref == 'refs/heads/main'`.

> [!KEY]
> - The workflow runs on **push to main and every PR** (Module 15.2), with least-privilege `permissions` and `concurrency` cancellation (Module 15.4).
> - The **build job** sets up (checkout, setup-node + npm cache, `npm ci`) then runs **gates in order**: ShellCheck (3.8), `tsc --noEmit` (7.3), the generator (5.7), and Playwright (16) — each failing the job via its **exit code**.
> - It runs essentially the **same commands as the Makefile/local** (Module 11.5, 15.2), so CI and local stay in sync.
> - The **deploy job** uses **`needs: build`** + **`if: github.ref == 'refs/heads/main'`** to deploy only on main after success — gating PRs, shipping main (Module 15.2), and widening `permissions` narrowly (15.4).
> - This is a **reusable template**: swap the commands, keep the structure (checkout → setup → cached install → gates → conditional deploy).
