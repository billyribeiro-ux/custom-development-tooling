# CI/CD Concepts: What Runs, When, and Why

CI/CD is the automation that runs your checks and ships your code *every time you push*. It's where all the tooling in this course comes together — the linters, type-checkers, tests, builds, and deploys you've built become *automatic gates* that protect your project. This lesson is the *why* and *what*; the next builds an actual pipeline.

## What the letters mean

- **CI — Continuous Integration**: automatically *build and test* your code every time it changes, so problems are caught immediately. "Integration" because it ensures everyone's changes work together continuously, not in a painful big-bang merge later.
- **CD — Continuous Delivery/Deployment**: automatically *ship* code that passes CI. *Delivery* = always ready to deploy at the push of a button; *Deployment* = actually deploy automatically.

Together: every push triggers checks, and passing code flows toward production — automatically, with no manual ceremony.

## The problem CI/CD solves

Without CI, quality depends on everyone *remembering* to run the tests, linters, and build before merging — on their own machine, where "works on mine" lurks (Module 1.3). People forget. Environments differ. Broken code lands on the main branch and blocks the whole team.

CI fixes this by running the checks **automatically, on a clean machine, every single time** — no one can forget, and the environment is consistent. It's the ultimate expression of Module 1.1's "executable instructions beat written ones" and the feedback loop (Module 1.2): the machine checks every change, fast, the same way.

> A pull request with a green CI check means: *the linters passed, the types check, the tests pass, and it builds — verified, automatically, on a neutral machine.* That green check is trust, manufactured by automation.

## The pipeline: a sequence of gates

A CI/CD **pipeline** is an ordered series of stages, each a *gate* the code must pass:

```text title=a-typical-pipeline
push/PR ──> [ lint ] ──> [ type-check ] ──> [ test ] ──> [ build ] ──> [ deploy ]
              │              │                 │            │             │
            fail?          fail?             fail?        fail?      (only on main)
              └──────────────┴─────────────────┴────────────┘
                        any failure STOPS the pipeline
```

Each gate runs a tool you already know (Modules 3.8, 7.3, 16, 5.7) and reports success or failure *via its exit code* (Module 2.5 — this is why exit codes matter so much!). A non-zero exit fails the gate, which fails the pipeline, which blocks the merge/deploy. The whole pipeline is just a chain of exit-code checks (Module 2.7's `&&` logic, automated and visualized).

## What runs, and when (triggers)

CI runs in response to **events**:

| Trigger | When it runs | Typical purpose |
| --- | --- | --- |
| **on push** | every commit pushed to a branch | run checks continuously |
| **on pull_request** | a PR is opened/updated | gate code *before* it merges |
| **on schedule** | a cron timer (e.g. nightly) | scheduled jobs, dependency checks |
| **manual** | a person clicks "run" | on-demand deploys |
| **on tag/release** | a version tag is pushed | publish a release (Module 17.4) |

The most important pattern: **run checks on every `pull_request`**, so broken code is caught *before* it reaches the main branch, and **deploy on push to `main`**, so passing code ships. We implement exactly this in Module 15.5.

## The killer feature: pull request gates

The single most valuable CI use is **blocking merges on failing checks.** Configure your repository so a PR *cannot be merged* until CI is green:

```text title=pr-gate
PR opened ──> CI runs ──> ✅ green ──> merge button enabled
                     └──> ❌ red  ──> merge BLOCKED until fixed
```

Now it's *impossible* for a teammate to merge code that breaks the build or fails tests — the gate enforces it, no human vigilance required. This transforms code quality from "everyone please remember" into "the machine guarantees it." It's the highest-leverage tooling investment a team can make.

## CI/CD systems

The concepts are universal; the systems differ:

| System | Where | Config file |
| --- | --- | --- |
| **GitHub Actions** | GitHub repos | `.github/workflows/*.yml` |
| GitLab CI | GitLab | `.gitlab-ci.yml` |
| CircleCI | hosted | `.circleci/config.yml` |
| Jenkins | self-hosted | `Jenkinsfile` |

They all share the same model: *events trigger a pipeline of jobs that run your checks on clean machines and report pass/fail.* We use **GitHub Actions** (the most common today) in this module, but the concepts transfer directly to any of them — learn the model, and a new CI system is just new YAML syntax.

> [!NOTE]
> Notice CI/CD doesn't introduce *new* tools — it *orchestrates the ones you've already built.* Your linters (Module 3.8, 10.3), type-checker (Module 7.3), tests (Module 16), and build (Module 5.7) are the gates; CI just runs them automatically on every change. This is why we saved CI for late in the course: it's the capstone of tooling, the thing that ties everything together and makes it run without you.

> [!TIP]
> Make your CI run the *same commands you run locally* — ideally your `Makefile` targets (Module 11). If CI runs `make lint && make test && make build`, then "passes locally" and "passes CI" mean the same thing, and you can reproduce any CI failure on your machine by running the same target. Divergence between local and CI commands is a common source of "but it works locally!" frustration. One set of commands, run everywhere.

> [!DOGFOOD]
> This course's `.github/workflows/ci.yml` (Module 15.5) runs on every push and pull request: it lints shell scripts (Module 3.8), type-checks the TypeScript (Module 7.3), builds the site with the generator (Module 5.7), and runs the Playwright end-to-end tests (Module 16) — then deploys to GitHub Pages on `main`. Every gate is a tool you've learned, now automated. It's CI/CD as the culmination of the whole course.

> [!TRY]
> Think of your last project. List the things you *should* run before merging (lint? test? build?). Now imagine each as a CI gate that runs automatically and blocks merging if it fails. That mental pipeline — and the fact that no one can forget it — is the entire value of CI/CD. You'll build it for real in Module 15.5.

> [!KEY]
> - **CI** automatically builds and tests every change on a clean machine; **CD** automatically ships what passes — catching problems immediately, no one forgets.
> - A **pipeline** is an ordered series of **gates** (lint → type-check → test → build → deploy), each passing/failing via **exit codes** (Module 2.5); any failure stops it.
> - **Triggers** (events) decide when it runs: `on push`, `on pull_request`, schedules, tags. The key pattern: **gate PRs, deploy `main`**.
> - The killer feature: **block merges on red CI** — quality becomes machine-guaranteed, not human-remembered.
> - CI/CD **orchestrates the tools you already built** (linters, type-checker, tests, build); make CI run your **`Makefile` targets** so local and CI stay identical.
