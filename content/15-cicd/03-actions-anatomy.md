# GitHub Actions Anatomy: Workflows, Jobs, Steps, Runners

Now the concrete mechanics. GitHub Actions is the most widely-used CI/CD system, configured with YAML files (Module 15.1) in `.github/workflows/`. This lesson teaches its building blocks — workflows, jobs, steps, runners, and actions — so you can read and write real pipelines.

## The hierarchy

GitHub Actions has a clear nesting:

```text title=hierarchy
Workflow (a .yml file)
└── Jobs (run on separate machines, in parallel by default)
    └── Steps (run in sequence, on the same machine)
        └── each step is either a SHELL COMMAND or an ACTION
Runner = the machine a job runs on
```

Let's build one from the top down.

## Workflow: the file

A **workflow** is one `.yml` file in `.github/workflows/`. It has a name, triggers (`on`), and jobs:

```yaml title=.github/workflows/ci.yml
name: CI                    # display name

on:                         # triggers (Module 15.2)
  push:
    branches: ["main"]
  pull_request:             # run on every PR

jobs:
  # ...jobs go here...
```

The `on:` block defines *when* it runs (Module 15.2) — here, on pushes to `main` and on every pull request.

## Jobs: parallel units of work

A **job** is a unit of work that runs on its own fresh **runner** (a clean virtual machine). By default, jobs run *in parallel*:

```yaml title=jobs.yaml
jobs:
  build:
    runs-on: ubuntu-latest      # the runner: a fresh Ubuntu VM
    steps:
      - # ...
  deploy:
    needs: build                # wait for 'build' to succeed first (creates order)
    runs-on: ubuntu-latest
    steps:
      - # ...
```

- **`runs-on: ubuntu-latest`** — the **runner**: GitHub spins up a clean Ubuntu machine for this job (also available: `windows-latest`, `macos-latest`). "Clean" is the point — no leftover state, reproducible every time (Module 1.3).
- **`needs: build`** — declares a dependency: `deploy` waits until `build` succeeds. Without `needs`, jobs run in parallel; with it, you create order (like Make prerequisites, Module 11.2, or compose `depends_on`, Module 14.4).

## Steps: the sequence within a job

A **job** contains **steps** that run *in order* on the same runner. Each step is either a shell command (`run:`) or a reusable **action** (`uses:`):

```yaml title=steps.yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4      # an ACTION: check out your repo's code
      - name: Install
        run: npm ci                     # a COMMAND: shell (Module 15.1's run:)
      - name: Build
        run: node tools/generate-pages.mjs
```

Two kinds of step:

- **`run:`** — runs a shell command on the runner (Module 15.1's `run: |` for multi-line). This is where your `Makefile` targets, linters, tests, and builds execute.
- **`uses:`** — runs a prebuilt **action**: a packaged, reusable step published by GitHub or the community.

> [!GOTCHA]
> The very first step of almost every job must be `uses: actions/checkout@v4`. The runner starts *empty* — it does NOT have your code by default! `checkout` clones your repository onto the runner so subsequent steps can see your files. Forgetting it is the #1 beginner Actions mistake: "why can't it find my files?" Because you never checked them out.

## Actions: reusable steps

An **action** (`uses:`) is a packaged, shareable step — like an npm package for CI steps. You reference it as `owner/repo@version`:

```yaml title=actions.yaml
steps:
  - uses: actions/checkout@v4          # check out code (official GitHub action)
  - uses: actions/setup-node@v4        # install Node and put it on PATH (Module 2.2!)
    with:
      node-version: 22                  # 'with:' passes inputs to the action
      cache: npm                        # cache ~/.npm for faster installs
```

- **`actions/checkout@v4`** — clones your repo.
- **`actions/setup-node@v4`** — installs a specific Node version and *adds it to the runner's PATH* (exactly the PATH mechanism from Module 2.2 — this is how `node` becomes available!).
- **`with:`** passes inputs (parameters) to the action.

> [!TIP]
> **Pin actions to a version** (`@v4`, or even a full commit SHA for maximum safety) rather than a moving target. `actions/checkout@v4` is reproducible (Module 1.3); `actions/checkout@main` could change under you and break or, worse, introduce malicious code (a supply-chain risk — you're running someone else's code on a machine with access to your repo and secrets). Pinning is both reproducibility and security.

## A complete minimal workflow

Putting workflow + job + steps + runner + actions together:

```yaml title=.github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4         # 1. get the code (don't forget!)
      - uses: actions/setup-node@v4       # 2. install Node (onto PATH)
        with:
          node-version: 22
          cache: npm
      - run: npm ci                        # 3. install deps (reproducibly, Module 8.4)
      - run: node tools/generate-pages.mjs # 4. build
      - run: npx playwright test           # 5. test (Module 16)
```

Read it: on any push or PR, spin up a clean Ubuntu runner, check out the code, install Node, install dependencies, build, and test. Each step's exit code (Module 2.5) gates the next — any failure fails the job, which fails the workflow, which blocks the PR (Module 15.2). That's a complete CI pipeline.

## Workflow context and expressions

Actions provides *context* about the run via `${{ }}` expressions:

```yaml title=expressions.yaml
steps:
  - run: echo "Building commit ${{ github.sha }} on ${{ github.ref }}"
  - if: github.ref == 'refs/heads/main'    # conditional step: only on main
    run: ./deploy.sh
```

`${{ github.sha }}`, `${{ github.ref }}`, etc. expose info about the event (Module 15.2), and `if:` makes steps/jobs conditional — e.g. "only deploy on the main branch" (Module 15.5/15.6).

> [!DOGFOOD]
> This course's `.github/workflows/ci.yml` (narrated in Module 15.5) has exactly this anatomy: a `build` job on `ubuntu-latest` that `checkout`s, `setup-node`s (with npm cache), runs `npm ci`, lints, type-checks, builds, and tests; plus a `deploy` job with `needs: build` and `if: github.ref == 'refs/heads/main'`. Open it and map each piece to the concepts here.

> [!TRY]
> Create `.github/workflows/hello.yml` with `on: [push]`, one `build` job on `ubuntu-latest`, and steps that `uses: actions/checkout@v4` then `run: echo "hello from CI"`. Push it to a GitHub repo and watch it run in the Actions tab. You've created a real (if tiny) CI pipeline — checkout, runner, step, all in action.

> [!KEY]
> - GitHub Actions nests: **workflow** (`.yml` file) → **jobs** (separate clean **runners**, parallel by default) → **steps** (sequential, same runner).
> - **`on:`** sets triggers (Module 15.2); **`runs-on:`** picks the runner; **`needs:`** orders jobs (like prerequisites).
> - A step is either a **`run:`** shell command or a **`uses:`** reusable **action** (`owner/repo@version`, with `with:` inputs).
> - **`actions/checkout@v4` must usually be the first step** — the runner starts empty, without your code. `setup-node` installs Node onto PATH (Module 2.2).
> - **Pin action versions** for reproducibility and security; use **`${{ }}`** expressions and **`if:`** for context and conditionals.
