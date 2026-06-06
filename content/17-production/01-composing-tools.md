# Composing Tools: Makefile to Scripts to CI

You've built many individual tools across this course. The final module is about *judgment* — how they fit together into a coherent system, and the production-grade qualities that separate scripts from systems. We start with **composition**: how a Makefile, scripts, and CI form one layered whole where each layer calls the one below.

## The layers of a tooling system

A mature project's tooling is *layered*, each layer a thin wrapper over the next:

```text title=the-layers
CI/CD (.yml)        "run the whole pipeline on every push"   (Module 15)
   │ calls
Task runner (Make)  "named entry points: build, test, lint"  (Module 11)
   │ calls
Scripts (.mjs/.py/.sh)  "the actual work"                     (Modules 3,5,6,7)
   │ use
Config + libraries  "settings and building blocks"           (Modules 8-12)
```

The crucial property: **each layer calls the one below, and CI calls the *same* commands you call locally.** This isn't accidental — it's the design principle that makes the whole system coherent and debuggable.

## The golden rule: one set of commands, called everywhere

The single most important composition principle (foreshadowed in Modules 11.1 and 15.2):

> **CI should call the same `make` targets you run locally, which call the same scripts. There is exactly one definition of "how to build/test/lint," used by humans and machines alike.**

```text title=one-definition
You (local):   make test
CI (.yml):     run: make test       ← the SAME command
                    │
              both run: build, then playwright test
                    │
              which runs: node tools/generate-pages.mjs && npx playwright test
```

When CI runs `make test` and you run `make test`, "passes locally" and "passes in CI" *mean the same thing*. A CI failure is reproducible on your machine by running the identical command. There's no "works locally, fails in CI" mystery, because there's no divergence to cause one.

> [!WARNING]
> The anti-pattern: CI re-specifies the build/test commands inline in YAML, *separately* from the Makefile/scripts. Now there are *two* definitions that drift apart — CI installs a flag you don't, or runs tests differently — and "but it works locally!" becomes a recurring nightmare. **Don't duplicate the commands; have CI call the task runner.** One source of truth (Module 0.4) for how to operate the project.

## Why layering works: each layer has one job

Each layer does *one thing well* and delegates the rest (the Unix philosophy, Module 2.4, applied to tooling architecture):

- **Scripts** do the actual work — generate pages, run migrations, hash assets. They don't know about CI or `make`; they just take inputs and produce outputs (Module 1.5).
- **The task runner (Make)** gives those scripts memorable names and composes them (`test` depends on `build`, Module 11.2). It doesn't do work itself — it *orchestrates* scripts.
- **CI** decides *when* things run (on push, on PR, Module 15.2) and on *what machine* (clean runners). It doesn't define *how* — it calls `make`.

This separation means you can change a layer without disturbing the others: rewrite a script's internals (the `make` target still works), reorganize `make` targets (CI still calls `make test`), switch CI providers (the Makefile is untouched). Loose coupling between layers is what makes the system maintainable.

## A concrete trace through the layers

Follow one command down through every layer:

```text title=tracing-make-test
1. CI workflow (Module 15.5):  - run: npx playwright test   (and earlier: node tools/generate-pages.mjs)
2. Locally you'd run:           make test
3. Makefile (Module 11.5):      test: build → npx playwright test
4. The 'build' prereq:          build: node tools/generate-pages.mjs
5. The generator (Module 5.7):  reads course.json + content/, writes site/
6. Playwright (Module 16.3):    webServer starts 'npm run serve', tests run against it
```

Every layer is thin and calls the next. No layer reimplements another's job. That's composition — and you've built every single layer in this course.

## Composition in the scripts themselves

The principle recurses *within* scripts too. Small, single-purpose scripts compose into workflows (Module 2.4's pipes, Module 2.7's `&&`):

```bash title=script-composition.sh
# A bootstrap script composes other commands, each doing one job:
make install            # dependencies
make migrate            # set up the database schema (Module 13)
make seed               # load known data (Module 13.6)
make build              # build the site (Module 5.7)
```

```makefile title=composed-target.mk
# A higher-level target composes lower ones (Module 11.2 prerequisites):
bootstrap: install migrate seed build   ## one command sets up everything
	@echo "ready! run 'make dev' to start."
```

`make bootstrap` composes four smaller tasks into one newcomer-friendly command (Module 11.1) — exactly the capstone pattern (Module 18). Each piece remains independently runnable and testable; the composition just sequences them.

> [!TIP]
> Build *small, composable* tools and let higher layers combine them, rather than one giant do-everything script. A 500-line "build-and-test-and-deploy" script is hard to understand, test, and reuse. Four 50-line scripts plus a Makefile that composes them is clearer, each piece is independently runnable, and you can recombine them freely. Compose small things; don't build monoliths. (Same lesson as the testing pyramid, Module 16.1, and `clean-cache.sh`'s data/logic separation, Module 3.7.)

> [!DOGFOOD]
> This course is layered exactly this way: scripts (`generate-pages.mjs`, `serve.mjs`, `clean-cache.sh`) do the work; the **Makefile** (Module 11.5) names and composes them (`test: build`, `serve: build`); **CI** (Module 15.5) calls the same operations. Run `make test` locally and read `ci.yml` — they run the same generator and the same Playwright tests. One definition, called by you and by the robots.

> [!TRY]
> Trace `make test` through the course's layers yourself: open the `Makefile` (find `test: build`), see that `build` runs the generator, and that `test` runs Playwright; then open `ci.yml` and confirm CI runs those same operations. You're seeing one set of commands, called locally and in CI — the golden rule, live.

> [!KEY]
> - A tooling system is **layered**: CI → task runner → scripts → config/libraries, each layer **calling the one below**.
> - **The golden rule: CI calls the same `make` targets you run locally** — so "passes locally" and "passes in CI" are identical and failures are reproducible. Never duplicate commands inline in CI.
> - Each layer does **one job**: scripts do work, the task runner orchestrates, CI decides when/where — loose coupling makes the system maintainable.
> - The principle recurses: **compose small, single-purpose scripts** into workflows (e.g. `make bootstrap`) rather than building monoliths.
> - You've built every layer in this course — composition is how they become one coherent system.
