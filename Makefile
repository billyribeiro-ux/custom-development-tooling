# Makefile — the single "front door" for this project. Every common task has a
# short, memorable name here, so nobody has to memorize long commands.
# We dissect this exact file in Module 11, "This Project's Makefile Narrated".
#
# Run `make` or `make help` to see everything you can do.

# Use bash with strict flags for every recipe (default is /bin/sh).
SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c

# .PHONY tells Make these targets are commands, not files to build/check.
.PHONY: help install build build-py serve test test-unit lint clean

# The default target (first one) prints help.
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install Node + Playwright browser dependencies
	npm install
	npx playwright install --with-deps chromium

build: ## Build the site with the Node generator (primary)
	node tools/generate-pages.mjs

build-py: ## Build the site with the Python generator (study artifact)
	python3 tools/generate-pages.py

serve: build ## Build, then serve the site at http://localhost:8080
	node tools/serve.mjs

test-unit: ## Run the generator unit tests (node:test)
	node --test tests/unit/*.test.mjs

test: build test-unit ## Build, run unit tests, then the Playwright end-to-end tests
	npx playwright test

lint: ## Lint shell, Python, and TypeScript (best-effort; skips missing tools)
	@command -v shellcheck >/dev/null && shellcheck examples/shell/*.sh || echo "shellcheck not installed — skipping"
	@command -v ruff >/dev/null && ruff check . || echo "ruff not installed — skipping"
	@npx --no-install tsc --noEmit || echo "tsc not available — skipping"

clean: ## Remove the generated site/ directory
	rm -rf site
