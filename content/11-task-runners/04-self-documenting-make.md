# Self-Documenting Makefiles (make help)

A Makefile is only useful if people know what's in it. The best Makefiles *document themselves*: running `make help` prints a clean, always-current list of every task with a description. This lesson teaches the elegant trick that makes it happen — and it's a beautiful little demonstration of the shell skills from Modules 2-3.

## The goal

```bash title=make-help.sh
make help
```
```text title=help-output
  build        Build the site with the Node generator
  build-py     Build the site with the Python generator
  serve        Build, then serve at http://localhost:8080
  test         Build, then run the Playwright tests
  lint         Lint shell, Python, and TypeScript
  clean        Remove the generated site/ directory
```

Clean, aligned, color-coded, and — crucially — *generated from the Makefile itself*, so it can never go out of date (the single-source-of-truth principle again, Module 0.4).

## The naive way (and why it's bad)

You *could* hard-code the help text:

```makefile title=naive-help.mk
help:
	@echo "  build   - build the site"
	@echo "  test    - run tests"
	# ...manually listed, in a second place...
```

But now you have two sources of truth: the actual targets, and this hand-written list. Add a target, forget to update the help, and the documentation lies (the exact drift problem from Module 0.4 and Module 1.3). We can do better.

## The self-documenting trick

The idea: put a description in a **comment right after each target**, using a recognizable marker (`## `), then have `help` *scan the Makefile* and extract them. The description lives *next to* the target, so it can't drift:

```makefile title=self-documenting.mk
.PHONY: help build test clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

build: ## Build the site with the Node generator
	node tools/generate-pages.mjs

test: ## Run the Playwright tests
	npx playwright test

clean: ## Remove the generated site/ directory
	rm -rf site
```

The magic is one line in the `help` target. Let's decode it — it's pure Module 2/3 shell composition (a pipe, `grep`, `awk`):

## Decoding the help line

```makefile title=help-line.mk
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
```

Reading it piece by piece (you have all the tools to understand this now):

- **`@`** — silence the command echo (Module 11.2), so only the output shows.
- **`grep -E '^[a-zA-Z_-]+:.*?## .*$$'`** — find lines that look like `target: ... ## description`. The regex matches a target name, a colon, anything, then the `## ` marker. (`$$` is make's escaped `$` for the shell's end-of-line `$`, Module 11.3.)
- **`$(MAKEFILE_LIST)`** — a built-in make variable holding the Makefile's own filename. So `grep` searches *this very file* — that's the self-documenting part.
- **`|`** — pipe the matching lines into `awk` (Module 2.4 — pipes connect programs).
- **`awk 'BEGIN {FS = ":.*?## "}; {printf ...}'`** — split each line on the `:...## ` separator (so `$$1` = target name, `$$2` = description) and print them aligned. `%-12s` left-pads the name to 12 characters for a tidy column.
- **`\033[36m ... \033[0m`** — ANSI color codes: `36m` turns text cyan, `0m` resets. This colors the target names.

So the whole thing is: *grep this file for `target: ## desc` lines, and format them into an aligned, colored menu.* A pipe of two classic Unix tools (Module 2.4) reading the Makefile itself. It's a lovely real-world payoff of the shell fundamentals.

## Why this is the right pattern

- **It never drifts.** The description is a comment *on the target*. Add a target with a `## ` comment and it *automatically* appears in `make help`. Remove the target, it disappears. One source of truth (Module 0.4).
- **It's discoverable.** New contributors run `make help` and see everything (Module 11.1's discoverability benefit).
- **It's conventional.** This `## ` trick is widely used — many engineers recognize it instantly, so your Makefile feels familiar.

> [!TIP]
> Make `help` the **first target** in the file (Module 11.2) so a bare `make` (no arguments) prints the help. Then the friendliest possible thing happens when someone types `make` not knowing what to do: they get the menu. Pair "help is the default" with "help is self-documenting" and your Makefile is maximally welcoming.

> [!DOGFOOD]
> This course's `Makefile` uses *exactly* this self-documenting pattern — its `help` target has the `grep | awk` line above, and every target (`build`, `serve`, `test`, `lint`, `clean`) carries a `## description` comment. Run `make help` in the repo (or `make` with no args) to see it generate the menu from itself. Open the file and find the `## ` comments.

## The broader lesson

This pattern embodies a principle worth generalizing: **derive documentation from the code, don't write it separately.** The same idea drives `argparse`'s auto-generated `--help` (Module 4.4), TypeScript types as living docs (Module 7.1), and this course's manifest-driven navigation (Module 0.4). Whenever documentation and code can drift apart, find a way to *generate* the docs from the code so they can't. Self-documenting `make help` is a small, elegant instance of a deep idea.

> [!TRY]
> Add the self-documenting `help` target to a Makefile, give two targets `## ` comments, and run `make help`. Then add a *third* target with a `## ` comment and run `make help` again — it appears automatically, no edit to `help` needed. That auto-updating behavior is the whole point.

> [!KEY]
> - The best Makefiles **document themselves**: `make help` lists every task with a description, generated from the file.
> - Put each description in a **`## ` comment after the target**; a `grep | awk` line in `help` extracts and formats them.
> - The trick searches **`$(MAKEFILE_LIST)`** (the Makefile itself) — it's a real-world payoff of pipes, grep, and awk (Module 2-3).
> - It **never drifts** (description lives on the target) and is **discoverable** and **conventional** — make `help` the default (first) target.
> - It embodies "**derive docs from code**" — the same principle as `argparse --help`, TS types, and manifest-driven nav.
