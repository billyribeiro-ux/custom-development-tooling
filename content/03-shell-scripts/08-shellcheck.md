# ShellCheck and Writing Lint-Clean Scripts

You've learned a lot of shell gotchas — unquoted variables, the `[ ]` vs `[[ ]]` trap, word-splitting. Here's the good news: a free tool catches almost all of them *automatically*, before they ever bite you. It's called **ShellCheck**, and running it should be as automatic as saving the file.

## What a linter is

A **linter** is a tool that reads your code *without running it* (this is called *static analysis*) and points out likely mistakes, risky patterns, and style issues. Every language has them. For shell scripts, the standard is **ShellCheck**.

Think of it as a tireless expert reviewer who has memorized every shell footgun and checks your script in milliseconds.

## Running ShellCheck

```bash title=run-shellcheck.sh
# Install it (macOS: brew install shellcheck; Debian/Ubuntu: apt install shellcheck)
shellcheck examples/shell/clean-cache.sh

# Check all scripts in a folder:
shellcheck examples/shell/*.sh
```

If your script is clean, it prints nothing and exits 0 (remember exit codes — that 0 is what lets CI use it as a pass/fail gate). If there are issues, it prints each with a code like `SC2086`, the line, and an explanation.

## What it catches — the greatest hits

Here's a script riddled with the exact mistakes this module warned about:

```bash title=buggy.sh
#!/bin/bash
file=$1
if [ $file == "test" ]; then
  rm -rf $TMPDIR/cache
fi
```

ShellCheck flags every problem:

```text title=shellcheck-output
In buggy.sh line 2:
file=$1
     ^-- SC2086: Double quote to prevent globbing and word splitting.

In buggy.sh line 3:
if [ $file == "test" ]; then
   ^-- SC2086: Double quote to prevent globbing and word splitting.
     ^-- SC2039: In POSIX sh, == is undefined. Use = or [[ ]].

In buggy.sh line 4:
  rm -rf $TMPDIR/cache
         ^-- SC2086: Double quote to prevent globbing and word splitting.
         ^-- (if TMPDIR is empty, this is rm -rf /cache!)
```

Every one of these is a bug you now recognize: unquoted variables (the word-splitting danger from Module 2.6), and that unquoted `$TMPDIR` could become a catastrophic `rm -rf /cache` if the variable is empty. The fixed version:

```bash title=fixed.sh
#!/usr/bin/env bash
set -euo pipefail
file="${1:?usage: fixed.sh <file>}"
if [[ "$file" == "test" ]]; then
  rm -rf "${TMPDIR:?}/cache"
fi
```

> [!TIP]
> Each ShellCheck warning has a code (e.g. `SC2086`). Search "shellcheck SC2086" and you'll find a wiki page explaining the problem, why it matters, and how to fix it — with examples. It's one of the best ways to *learn* shell, not just fix one script.

## Suppressing a warning (rarely, and deliberately)

Occasionally ShellCheck flags something you've decided is fine. You can disable a specific check for the next line — but always with a comment explaining *why*:

```bash title=suppress.sh
# We genuinely want word-splitting here to pass multiple flags:
# shellcheck disable=SC2086
some-command $FLAGS
```

> [!WARNING]
> Treat suppression as a last resort, and always justify it. A wall of `disable` comments means you're fighting the tool instead of fixing the code. Nine times out of ten, the warning is right and the fix is correct.

## Making it automatic

A linter you have to *remember* to run is a linter you'll forget. Wire it into your workflow so it runs without thinking:

```bash title=lint-everywhere.sh
# In your Makefile (Module 11):
lint:
	shellcheck examples/shell/*.sh

# In CI (Module 15) — fails the build if any script has issues:
#   - run: shellcheck scripts/*.sh
```

> [!DOGFOOD]
> This course's `Makefile` has a `lint` target that runs ShellCheck on the example scripts, and the CI workflow (`.github/workflows/ci.yml`) runs `shellcheck examples/shell/*.sh` on every push. Because ShellCheck exits non-zero on problems, a shell bug fails CI *before* it can be merged. That's the whole point: catch it automatically, every time.

## Beyond ShellCheck: shfmt

There's also `shfmt`, an auto-*formatter* for shell scripts (like Prettier/Black for shell). It fixes indentation and spacing consistently so you never argue about style. ShellCheck finds *bugs*; shfmt fixes *formatting*. Many teams run both.

## The bigger lesson

This is a pattern you'll see for *every* language in this course: a **linter** for correctness and a **formatter** for style, both run automatically in CI. ShellCheck for shell, `ruff` for Python (Module 10), `tsc`/ESLint for TypeScript (Module 7). The names change; the discipline is identical. *Let machines check the mechanical stuff so humans can review the ideas.*

> [!TRY]
> Save the `buggy.sh` above and run `shellcheck buggy.sh` (install it first if needed). Read each warning, then fix the script until ShellCheck prints nothing. You'll have internalized several gotchas permanently.

> [!KEY]
> - A **linter** statically analyzes code for likely bugs without running it; **ShellCheck** is the standard for shell.
> - It catches exactly the gotchas you've learned: unquoted variables, `[ ]` vs `[[ ]]`, dangerous empty-variable deletes.
> - Each warning has a code (`SC2086`) with a wiki page — a great way to *learn*, not just patch.
> - Suppress warnings only rarely, with a justifying comment.
> - Run it **automatically** in your `Makefile` and CI, so bugs fail the build before merge. (Same pattern, every language: linter + formatter in CI.)
