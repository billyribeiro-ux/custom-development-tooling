# The Tab Gotcha, .PHONY, and Variables in Make

Make is powerful but has a few infamous quirks that trip up everyone. This lesson confronts them head-on — the tab requirement, `.PHONY`, and variables — so they never cost you an afternoon. These three things account for the vast majority of "why won't my Makefile work?!" moments.

## The Tab Gotcha

The single most notorious make rule:

> **Recipe lines MUST be indented with a literal TAB character, not spaces.**

```makefile title=tabs-not-spaces.mk
build:
	node tools/generate-pages.mjs     # this MUST start with a TAB
```

If you use spaces, make fails with the legendarily cryptic error:

```text title=the-error
Makefile:2: *** missing separator.  Stop.
```

"Missing separator" means "you used spaces where I demanded a tab." It tells you *nothing* useful unless you know the secret.

> [!GOTCHA]
> This is the #1 make frustration, made worse because **tabs and spaces look identical on screen.** Your editor may even auto-convert tabs to spaces, silently breaking your Makefile. Configure your editor to keep real tabs in Makefiles (most detect `Makefile` and do this automatically; VS Code shows whitespace if you enable "Render Whitespace"). When you see "missing separator," the answer is *always*: that line has spaces instead of a tab.

> [!TIP]
> To check, reveal whitespace in your editor, or run `cat -A Makefile` — real tabs show as `^I`. If a recipe line starts with spaces instead of `^I`, that's your bug. This one check resolves most mysterious Makefile failures.

## .PHONY: tasks vs files

Recall from Module 11.2 that make targets are, by default, *files* — make skips a recipe if a file with the target's name is newer than its prerequisites. This causes a baffling failure when you use make as a *task runner*:

```makefile title=phony-problem.mk
build:
	node tools/generate-pages.mjs
```

```bash title=the-confusion.sh
mkdir build              # now a DIRECTORY named 'build' exists
make build
# make: 'build' is up to date.      <- it refuses to run your recipe!
```

Make sees a thing named `build` exists and is "up to date," so it skips the recipe. Maddening. The fix is to declare such targets **`.PHONY`** — meaning "this is a task name, NOT a file; always run it regardless of any file by that name":

```makefile title=phony-fix.mk
.PHONY: build test lint clean

build:
	node tools/generate-pages.mjs
```

> [!WARNING]
> **Declare every task-runner target `.PHONY`.** Any target that's a *command to run* (not a file to produce) — `build`, `test`, `lint`, `clean`, `install`, `deploy` — should be listed in `.PHONY`. Forgetting it works *until* a file/folder with that name appears (like a `build/` output dir or a `test/` folder!), then breaks confusingly. It's a one-line insurance policy against a very common, very confusing bug. List them all at the top.

## Variables

Make has variables for reusing values and configuring behavior:

```makefile title=variables.mk
# Define (no spaces issues here, unlike bash — but conventions vary)
OUT_DIR := site
NODE := node

build:
	$(NODE) tools/generate-pages.mjs --out $(OUT_DIR)
```

Key points about make variables:

- **Reference with `$(VAR)`** — note the parentheses (not bash's `$VAR`).
- **`:=` vs `=`** — `:=` is *simple* assignment (evaluated once, immediately — what you usually want). `=` is *recursive* (re-evaluated each use, which can cause surprises). **Prefer `:=`.**
- **Override from the command line:** `make build OUT_DIR=dist` overrides the variable for that run — handy configurability.

```bash title=override-var.sh
make build                  # uses OUT_DIR = site
make build OUT_DIR=dist     # overrides it -> --out dist
```

> [!GOTCHA]
> The `$` collision: inside a recipe, `$(VAR)` is a *make* variable, but if you want a *shell* variable or command substitution, you must **double the dollar sign**: `$$`. So a shell loop in a recipe looks like:
> ```makefile title=double-dollar.mk
> list:
> 	@for f in *.md; do echo "$$f"; done    # $$f -> shell's $f
> ```
> A single `$f` would be interpreted by *make* (as an empty variable `$(f)`), not the shell. When a recipe mixes make and shell variables, remember: `$(...)` is make, `$$...` is shell.

## Special variables and automatic variables

Make provides some built-in variables, most useful for file-building rules:

```makefile title=auto-vars.mk
site/index.html: course.json templates/page.html
	@echo "building $@ from $^"
	node tools/generate-pages.mjs
# $@ = the target (site/index.html)
# $^ = all prerequisites (course.json templates/page.html)
# $< = the first prerequisite (course.json)
```

These automatic variables (`$@`, `$^`, `$<`) shine in file-compilation rules. For pure task running you'll use them less, but you'll see them in Makefiles in the wild, so recognize them.

## Putting the gotchas together

A correct task-runner Makefile header that sidesteps all three quirks:

```makefile title=correct-header.mk
# Use bash with strict flags (default is /bin/sh) — Module 11.5
SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c

# Declare all task targets phony so they always run (the .PHONY fix)
.PHONY: help build test lint clean

OUT_DIR := site          # := simple assignment

build:
	node tools/generate-pages.mjs --out $(OUT_DIR)    # remember: TAB-indented!
```

> [!DOGFOOD]
> This course's `Makefile` (Module 11.5) starts with exactly this pattern: `SHELL := bash`, strict `.SHELLFLAGS`, a `.PHONY` line listing every target, and TAB-indented recipes. Open it — every quirk in this lesson is handled deliberately. The comments even point out the tab gotcha for readers.

> [!TRY]
> Create a Makefile with a `clean` target that runs `rm -rf build`. Run `make clean` — works. Now `mkdir build` and run `make clean` again — if you *didn't* add `.PHONY: clean`, you'll see "make: 'clean' is up to date" (refusing to run!). Add `.PHONY: clean` and watch it work again. You've reproduced and fixed the most common make gotcha.

> [!KEY]
> - **Recipes must be indented with a literal TAB**, not spaces — spaces cause the cryptic "missing separator" error. Check with `cat -A` (tabs show as `^I`).
> - **Declare task targets `.PHONY`** (`.PHONY: build test lint clean`) so make always runs them, even if a file/folder shares the name.
> - Variables: reference with **`$(VAR)`**, prefer **`:=`** (simple) over `=` (recursive), and override on the command line (`make build OUT_DIR=dist`).
> - In recipes, **`$(...)` is a make variable, `$$...` is a shell variable** — double the dollar for shell.
> - Automatic vars (`$@` target, `$^` all prereqs, `$<` first prereq) appear in file-build rules — recognize them.
