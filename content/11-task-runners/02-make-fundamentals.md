# Make Fundamentals: Targets, Prerequisites, Recipes

Let's learn how `make` actually works. A `Makefile` is built from one repeating structure — the *rule* — and once you understand its three parts, you can read and write Makefiles confidently.

## The anatomy of a rule

Every Makefile is a list of **rules**, each with this shape:

```makefile title=rule-anatomy
target: prerequisites
	recipe
```

```makefile title=concrete-rule
build: install
	node tools/generate-pages.mjs
```

The three parts:

- **target** (`build`) — the name of the thing to make. You run `make build`.
- **prerequisites** (`install`) — other targets (or files) that must be done *first*. Here, `build` depends on `install`.
- **recipe** (`node tools/generate-pages.mjs`) — the shell command(s) to run. **It must be indented with a TAB**, not spaces (Module 11.3 — this is *the* famous gotcha).

You run a target by name:

```bash title=run-make.sh
make build        # runs the 'build' target (after its prerequisite 'install')
make              # runs the FIRST target in the file (the default)
```

## Prerequisites create order and dependencies

The prerequisites are the powerful part: they let tasks *depend on* other tasks, and `make` runs them in the right order automatically:

```makefile title=dependencies.mk
test: build
	npx playwright test

build: install
	node tools/generate-pages.mjs

install:
	npm install
```

```bash title=dependency-chain.sh
make test
# make sees: test needs build, build needs install
# so it runs:  install -> build -> test   (in that order, automatically)
```

You ask for `test`; `make` figures out it must `install`, then `build`, then `test`, and does them in sequence. You declare *what depends on what*; `make` works out the *order*. This is task composition (Module 11.1) — small tasks chained into workflows.

## The default target

Running `make` with no arguments runs the **first target** in the file. By convention, make that first target a `help` that lists everything (Module 11.4), so a bare `make` is friendly:

```makefile title=default-target.mk
help:            # first target = default; running `make` shows help
	@echo "Available targets: build, test, lint, clean"

build:
	node tools/generate-pages.mjs
```

## Make's original purpose: file targets

Here's the part that explains make's quirks. Make was built to **compile programs efficiently** — to rebuild only the files that changed. In its original mode, a target is a *file*, and prerequisites are the *files it's built from*:

```makefile title=file-target.mk
# "site/index.html depends on these source files"
site/index.html: course.json templates/page.html
	node tools/generate-pages.mjs
```

Make compares *timestamps*: if `site/index.html` is **newer** than all its prerequisites, make says "already up to date" and skips the recipe. If a prerequisite changed (is newer), make re-runs the recipe. This is **incremental builds** — only redo work when inputs changed, a direct application of the source-vs-artifact idea (Module 1.3) and feedback-loop speed (Module 1.2).

```bash title=incremental.sh
make site/index.html      # builds it
make site/index.html      # "make: 'site/index.html' is up to date." (skipped!)
# ...edit course.json...
make site/index.html      # rebuilds, because a prerequisite is now newer
```

> [!NOTE]
> This timestamp-based skipping is make's killer original feature — and the source of its biggest confusion when used as a *task runner*. If you name a target `build` and a *file or folder named `build` exists*, make sees the file is "up to date" and **refuses to run your recipe** ("nothing to be done for 'build'"). The fix is `.PHONY`, which we cover next lesson. For now, just know: make targets can be either *files to build* or *tasks to run*, and the two modes interact confusingly.

## Multiple commands in a recipe

A recipe can have several lines — each indented with a tab. But beware a crucial detail:

```makefile title=multi-line-recipe.mk
deploy:
	echo "step 1"
	echo "step 2"
	echo "step 3"
```

> [!GOTCHA]
> **Each recipe line runs in its OWN separate shell.** So a `cd` on one line does *not* affect the next line — the next line starts back in the original directory:
> ```makefile title=cd-trap.mk
> broken:
> 	cd build      # this cd...
> 	ls            # ...does NOT apply here! ls runs in the original dir
> ```
> To run multiple commands in *one* shell (so `cd` sticks), join them with `&&` on one logical line, or set `.ONESHELL`:
> ```makefile title=cd-fixed.mk
> fixed:
> 	cd build && ls    # one shell, cd applies to ls
> ```
> This catches everyone at least once. Remember: one tab-line = one shell.

## Echoing and silencing

By default, make *prints each command* before running it. Prefix a line with `@` to suppress that echo (useful for `echo` statements, so you see the message but not the command):

```makefile title=silencing.mk
greet:
	@echo "Hello!"      # @ -> prints just "Hello!" (not the echo command itself)

noisy:
	echo "Hello!"       # prints the command AND its output:  echo "Hello!" \n Hello!
```

> [!DOGFOOD]
> This course's `Makefile` (Module 11.5) uses `@` on its help command so the menu prints cleanly, and joins multi-step recipes appropriately. Open it and notice the tab indentation and the `@` prefixes — you'll recognize them now.

> [!TRY]
> Create a `Makefile` with three targets: `install` (echo "installing"), `build: install` (echo "building"), and `test: build` (echo "testing"). Run `make test` and watch all three fire in dependency order. Then add a `cd /tmp` and `pwd` as two separate recipe lines and observe the `cd` *not* carrying over — the gotcha, live.

> [!KEY]
> - A Makefile is a list of **rules**: `target: prerequisites` then a TAB-indented **recipe**.
> - **Prerequisites** are other targets that must run first — `make` resolves the order automatically (task composition).
> - Bare `make` runs the **first target**; make it a `help`.
> - Make's original job is **incremental file builds**: it skips a recipe if the target file is newer than its prerequisites (timestamp-based) — great, but the source of file-vs-task confusion (fixed by `.PHONY`, next lesson).
> - **Each recipe line runs in its own shell** (so `cd` doesn't persist — use `&&`); prefix `@` to silence command echoing.
