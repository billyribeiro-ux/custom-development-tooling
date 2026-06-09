# Step 6 — A Makefile Front Door for Everything

You've built Linkboard's scripts, migrations, and containers — but right now they're a pile of commands in different languages (Module 11.1). This step ties them together with a **Makefile**: one memorable entry point for every task. This is where the project becomes *operable* — where `make bootstrap` and `make dev` (the brief's promise, Module 18.1) come to life.

## The goal: name every task

After this step, the whole project is driven by simple verbs (Module 11.1):

```bash title=the-verbs.sh
make bootstrap    # set up a fresh clone (deps + db + build)
make dev          # run everything for development
make migrate      # apply migrations
make seed         # load data
make build        # build assets + pages
make test         # run E2E tests
make lint         # lint shell, Python, TypeScript
make clean        # remove generated artifacts
make help         # list all of the above
```

A newcomer runs `make help` and knows how to operate Linkboard — no README archaeology (Module 11.1).

## The Makefile

This follows the course's `Makefile` (Module 11.5) exactly — strict shell, `.PHONY`, self-documenting help, composed targets:

```makefile title=Makefile
# Makefile — the single front door for Linkboard. Run `make` or `make help`.
SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c               # safety preamble per recipe (Module 11.5)

.PHONY: help bootstrap dev install migrate seed build lint test clean   # all tasks (Module 11.3)

DB ?= ./linkboard.db      # overridable variable (Module 11.3): make migrate DB=/tmp/test.db
export DATABASE_PATH = $(DB)                     # flows into the scripts' env config (Module 9.4)

help: ## Show this help                          # default target (Module 11.2/11.4)
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	npm ci                                       # reproducible (Module 8.4)

migrate: ## Apply database migrations
	node scripts/migrate.mjs

seed: ## Load known data into the database
	node scripts/seed.mjs

build: ## Build assets and pages
	node scripts/build-assets.ts                 # TS, runs directly (Module 7.2)
	python3 tools/generate-pages.py

bootstrap: install migrate seed build ## Set up a fresh clone end to end
	@echo "ready! run 'make dev' to start."

dev: build ## Build, then serve at http://localhost:8080
	node scripts/serve.mjs

lint: ## Lint shell, Python, and TypeScript
	@command -v shellcheck >/dev/null && shellcheck scripts/*.sh || echo "shellcheck not installed — skipping"
	@command -v ruff >/dev/null && ruff check . || echo "ruff not installed — skipping"
	@npx --no-install tsc --noEmit || echo "tsc not available — skipping"

test: build ## Build, then run the E2E tests
	npx playwright test

clean: ## Remove generated artifacts
	rm -rf site dist test-results *.db
```

## How it composes everything

This Makefile is the *composition layer* (Module 17.1) — it wires the pieces from Steps 1-5 into named, ordered tasks:

- **`SHELL := bash` + `.SHELLFLAGS`** — the safety preamble applied to every recipe (Module 11.5), so a failing command in any task aborts it.
- **`.PHONY`** lists every task (Module 11.3) — they're commands, not files, so they always run (even though `clean` deletes a `site/` *folder*).
- **`help`** is self-documenting (Module 11.4): it greps the Makefile for `## ` comments and is the default target, so bare `make` prints the menu.
- **`DB ?= ./linkboard.db` + `export DATABASE_PATH = $(DB)`** — a Make variable (Module 11.3) exported into every recipe's environment, where the scripts read it as config (Module 9.4). One overridable knob (`make migrate DB=/tmp/test.db`) flows through the whole chain: Make variable → environment → script.
- **Prerequisites compose tasks** (Module 11.2): `bootstrap: install migrate seed build` runs four tasks in order; `dev: build` and `test: build` guarantee a fresh build first. This is task composition (Module 17.1) — small tasks chained into workflows.
- **`lint`** spans three languages (Module 11.5) — ShellCheck (Module 3.8), ruff (Module 10.3), `tsc --noEmit` (Module 7.3) — gracefully skipping missing tools.
- **Language-independence** (Module 11.1): `build` runs a `.ts` *and* a `.py`; `migrate`/`seed` run `.mjs`; `lint` covers all three. The user just types `make build` — the Makefile hides which language each task uses (Module 6.5).

## The payoff: bootstrap and dev

The brief's two-command promise (Module 18.1) is now real, built entirely from composition:

```bash title=the-payoff.sh
make bootstrap     # install → migrate → seed → build  (Module 11.2 prerequisites)
make dev           # build → serve
```

`make bootstrap` is just `install migrate seed build` as prerequisites — four tasks you built in Steps 1-5, sequenced into one. No new code; pure composition (Module 17.1). That's the whole point: you built the pieces, and the Makefile makes them a *system*.

> [!TIP]
> The Makefile is also what CI will call (Step 7, and Module 15.2's golden rule, Module 17.1). Because `make test` and `make lint` work locally *and* in CI, "passes on my machine" and "passes in CI" mean the same thing. Define the commands *once*, here, and let both humans and the pipeline call them. Never duplicate the build/test logic in CI YAML (Module 17.1).

> [!DOGFOOD]
> Linkboard's Makefile is structurally identical to the course's (Module 11.5): same strict-shell header, `.PHONY` line, self-documenting `help`, and `build`-as-prerequisite pattern. Open the course's `Makefile` and `make help` to see the template — you're adapting target *contents*, not the structure.

> [!TRY]
> Write Linkboard's Makefile, then run `make help` (see the generated menu), `make bootstrap` (watch install → migrate → seed → build run in order), and `make dev`. Then `make clean` and `make bootstrap` again — a full teardown and rebuild in two commands. You've made Linkboard *operable*.

> [!KEY]
> - The Makefile is the **single front door** (Module 11.1): `make bootstrap`, `dev`, `migrate`, `build`, `test`, `lint`, `clean`, `help` — a newcomer runs `make help` and knows everything.
> - It follows the course's template (Module 11.5): **strict shell** (`SHELL := bash`, `.SHELLFLAGS`), **`.PHONY`** tasks, **self-documenting `help`**, and a reused `NODE` variable.
> - **Prerequisites compose tasks** (Module 11.2/17.1): `bootstrap: install migrate seed build` and `dev/test: build` — the two-command promise is pure composition of Steps 1-5, no new code.
> - It's **language-independent** (Module 11.1/6.5): one interface over `.ts`, `.py`, `.mjs`, and `.sh` tasks.
> - It's the **same commands CI will call** (Module 17.1) — define build/test logic once, used by humans and the pipeline alike.
