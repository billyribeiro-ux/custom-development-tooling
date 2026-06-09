# Worked Example: This Project's Makefile Narrated

Let's read the course's actual `Makefile` top to bottom. It's the single front door to everything — building, serving, testing, linting — and it ties together every language you've learned (bash, Node, Python, Playwright) behind simple verbs. Every quirk from this module appears here, handled deliberately.

> [!DOGFOOD]
> This is the real `Makefile` at the repo root. Run `make help` to see it in action, or open it alongside this lesson. It's what *you*, your teammates, and CI (Module 15) all call.

## The header: comments and strict shell

```makefile title=Makefile
# Makefile — the single "front door" for this project.
# Run `make` or `make help` to see everything you can do.

SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
```

- A **comment block** explaining what the file is — always include one (Module 1.1).
- **`SHELL := bash`** — by default, make runs recipes with `/bin/sh`, which is more limited. Setting bash gives us bash features in recipes. (`:=` simple assignment, Module 11.3.)
- **`.SHELLFLAGS := -eu -o pipefail -c`** — this is the *safety preamble* from Module 3.2, applied to *every recipe line*! It makes each recipe fail on errors (`-e`), unset variables (`-u`), and broken pipes (`pipefail`). A recipe that runs a failing command now aborts instead of barrelling on. This is a principal-level touch most Makefiles miss.

## .PHONY: declaring the tasks

```makefile title=Makefile
.PHONY: help install build build-py serve test test-unit lint clean
```

Every target is a *task* (a command to run), not a *file* to produce — so all are declared **`.PHONY`** (Module 11.3). This guarantees they always run, even if a file or folder named `build`, `test`, or `clean` happens to exist (and `clean` deletes a `site/` folder, so this matters!). One line of insurance against the most common make gotcha.

## help: the self-documenting default

```makefile title=Makefile
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
```

The self-documenting `help` from Module 11.4: it greps *this file* for `target: ## description` lines and formats them into a colored menu. Because it's the **first target**, a bare `make` (no arguments) prints it (Module 11.2) — the friendliest default. Every target below carries a `## ` comment, so they all appear automatically.

## install: setup

```makefile title=Makefile
install: ## Install Node + Playwright browser dependencies
	npm install
	npx playwright install --with-deps chromium
```

Two recipe lines (each its own shell, Module 11.2 — fine here since they're independent): install npm dependencies (using the lockfile-aware `npm install`, Module 8.4), then download the Chromium browser Playwright needs (Module 16). One command, `make install`, gets a fresh clone ready.

## build and build-py: the two generators

```makefile title=Makefile
build: ## Build the site with the Node generator (primary)
	node tools/generate-pages.mjs

build-py: ## Build the site with the Python generator (study artifact)
	python3 tools/generate-pages.py
```

Here's the language-independence payoff (Module 11.1): `make build` runs the **Node** generator (Module 5.7), `make build-py` runs the **Python** one (Module 6.4). The caller doesn't care which language — they just say `make build`. Two languages, one uniform interface. This is the "mix languages, unify behind one entry point" idea (Module 6.5) made real.

## serve and test: composition via prerequisites

```makefile title=Makefile
serve: build ## Build, then serve the site at http://localhost:8080
	node tools/serve.mjs

test-unit: ## Run the generator unit tests (node:test)
	node --test tests/unit/*.test.mjs

test: build test-unit ## Build, run unit tests, then the Playwright end-to-end tests
	npx playwright test
```

Note the prerequisites (Module 11.2): `serve: build` and `test: build test-unit` mean **"do those first, then this."** Run `make test` and make automatically runs `build`, then the fast **unit tests** (Module 16.1's pyramid — cheap checks before expensive ones), and only then the Playwright E2E suite — you can never accidentally test a stale or missing site, and a broken pure function fails in milliseconds instead of after a browser spins up. Task composition: small tasks chained into workflows. This is why prerequisites matter.

## lint: best-effort, multi-language

```makefile title=Makefile
lint: ## Lint shell, Python, and TypeScript (best-effort; skips missing tools)
	@command -v shellcheck >/dev/null && shellcheck examples/shell/*.sh || echo "shellcheck not installed — skipping"
	@command -v ruff >/dev/null && ruff check . || echo "ruff not installed — skipping"
	@npx --no-install tsc --noEmit || echo "tsc not available — skipping"
```

This one target lints *three* languages (Module 10.3's "linter in every language" pattern): ShellCheck for shell (Module 3.8), ruff for Python (Module 10.3), and `tsc --noEmit` for TypeScript (Module 7.3). The `command -v tool >/dev/null && ... || echo "skipping"` idiom (Modules 2.7 and 3.5) gracefully skips a linter if it isn't installed, rather than failing — convenient for local use. (CI, Module 15, installs the linters and does *not* skip — failures there are real gates.)

## clean: teardown

```makefile title=Makefile
clean: ## Remove the generated site/ directory
	rm -rf site
```

Removes the generated artifact (Module 1.3 — `site/` is gitignored output). Because `clean` is `.PHONY`, it runs even though a `site/` *folder* exists — the exact case `.PHONY` protects (Module 11.3).

## The whole picture

Step back: this ~30-line file is the operational manual for the entire project. A newcomer runs `make help`, sees a handful of verbs, and can build, serve, test, lint, and clean — without knowing that `build` is Node, `build-py` is Python, `lint` spans three languages, or that `test` depends on `build`. The complexity is *hidden behind names*. And CI (Module 15) calls the *same* targets, so "works locally" and "works in CI" are the same commands. That's the entire value of a task runner (Module 11.1), realized in one small, careful file.

> [!TRY]
> In the repo, run `make help` (see the generated menu), then `make build` (Node generator runs), then `make test` (watch it run `build` *first* because of the prerequisite, then Playwright). Finally `make clean`. You've operated the whole project through one interface — exactly as intended.

> [!KEY]
> - The Makefile sets **`SHELL := bash`** and **`.SHELLFLAGS := -eu -o pipefail -c`** — the Module 3.2 safety preamble applied to *every recipe*.
> - All targets are **`.PHONY`** (they're tasks, not files); `help` is the self-documenting first/default target (Module 11.4).
> - **`build`** (Node) and **`build-py`** (Python) show language-independence: one interface over many languages (Module 11.1, 6.5).
> - **Prerequisites compose tasks**: `test: build test-unit` and `serve: build` guarantee a fresh build (and fast unit checks) first.
> - One **`lint`** target spans shell/Python/TS (Module 10.3 pattern), skipping missing tools gracefully. CI calls the **same targets** — local and CI stay identical.
