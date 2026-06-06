# Worked Example: clean-cache.sh Narrated

Time to put the whole module together by reading a *real, complete, production-quality* script line by line. This is `examples/shell/clean-cache.sh` from the course repository — a tool that removes build caches and generated artifacts. Every technique from this module appears here. Run it yourself as you read.

> [!DOGFOOD]
> This is not a toy. It's a genuine utility in this repo. Open `examples/shell/clean-cache.sh` alongside this lesson, or click the link at the bottom of the page.

## The header and safety preamble

```bash title=clean-cache.sh
#!/usr/bin/env bash
# clean-cache.sh — safely remove build caches and generated artifacts.
set -euo pipefail
```

- **Shebang** `#!/usr/bin/env bash`: portable, finds bash via `PATH` (Module 3.1).
- A **comment** stating what the script does — always include one.
- **`set -euo pipefail`**: abort on errors, error on unset variables, fail on broken pipes (Module 3.2). The foundation of a safe script.

## Naming the program and defaults

```bash title=clean-cache.sh
readonly PROG="${0##*/}"
FORCE=false
```

- `${0##*/}` strips the directory from `$0`, leaving just the script's filename (Module 3.3's parameter expansion — this is a pure-bash `basename`). We use it in every message so they're consistent.
- `readonly` makes `PROG` a constant — a small touch that prevents accidental reassignment.
- `FORCE=false` sets the default mode. Notice the script is **safe by default**: it won't delete anything unless you ask.

## The usage function

```bash title=clean-cache.sh
usage() {
  cat <<EOF
$PROG — remove build caches and generated artifacts

Usage:
  $PROG [--force] [--help]

Options:
  --force   Actually delete (default is a safe dry run)
  --help    Show this help and exit
EOF
}
```

- A **function** (Module 3.5) that prints help.
- `cat <<EOF ... EOF` is a **heredoc** — a clean way to print a multi-line block. Everything between `<<EOF` and the closing `EOF` is printed literally, with `$PROG` expanded (because `EOF` is unquoted).

## Parsing arguments: the while + case pattern

```bash title=clean-cache.sh
while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) FORCE=true ;;
    -h | --help) usage; exit 0 ;;
    *)
      echo "$PROG: unknown option: $1" >&2
      usage >&2
      exit 64
      ;;
  esac
  shift
done
```

This is *the* standard hand-rolled argument parser, combining Module 3.4's `while`, `case`, and `[[ ]]`:

- `while [[ $# -gt 0 ]]` loops as long as there are arguments left (`$#` is the count).
- `case "$1" in` matches the current first argument against patterns.
- `--force` sets the flag; `-h | --help` matches *either* spelling and exits 0 (success).
- `*)` is the catch-all for unknown options: it prints an error **to stderr** (`>&2`, Module 2.4), shows usage, and exits **64** — the conventional `EX_USAGE` "you used me wrong" code (Module 2.5).
- `shift` discards `$1` and moves the rest down (`$2` becomes `$1`), so the loop advances. Forgetting `shift` makes an infinite loop.

## The data: what to clean

```bash title=clean-cache.sh
readonly TARGETS=(
  "node_modules/.cache"
  ".cache"
  "dist"
  "build"
  "site"
  "coverage"
  ".pytest_cache"
  "__pycache__"
)
```

An **array** of paths, kept *separate from the logic*. Adding a new cache location is a one-line data change — you don't touch the code that does the deleting. This separation of data from behavior is a hallmark of maintainable scripts.

## The work loop

```bash title=clean-cache.sh
deleted_count=0
log() { printf '%s %s\n' "[$PROG]" "$*"; }

for target in "${TARGETS[@]}"; do
  [[ -e "$target" ]] || continue
  size="$(du -sh "$target" 2>/dev/null | cut -f1)"
  if [[ "$FORCE" == true ]]; then
    rm -rf -- "$target"
    log "removed   $target ($size)"
  else
    log "would rm  $target ($size)"
  fi
  deleted_count=$((deleted_count + 1))
done
```

Line by line:

- `log()` is a tiny **helper function** (Module 3.5) so every message has a consistent `[clean-cache.sh] ...` prefix.
- `for target in "${TARGETS[@]}"` iterates the array, with `"${TARGETS[@]}"` **quoted** so paths with spaces stay intact (Module 2.6).
- `[[ -e "$target" ]] || continue` — a **guard**: if the path doesn't exist, skip to the next iteration. The `|| continue` is the "or else" idiom (Module 2.7).
- `du -sh ... | cut -f1` computes a human-readable size; `2>/dev/null` discards any stderr noise (Module 2.4).
- The **`if`** branches on `$FORCE`. The dry-run path just *describes* what it would do — this is the `--dry-run` discipline from Module 1.5, and it's why the script is safe by default.
- `rm -rf -- "$target"` deletes. The **`--`** stops a path beginning with `-` from being misread as a flag — defensive programming (you saw this in Module 2.6).

## The summary

```bash title=clean-cache.sh
if [[ "$deleted_count" -eq 0 ]]; then
  log "nothing to clean — already tidy ✨"
elif [[ "$FORCE" == true ]]; then
  log "done: removed $deleted_count item(s)"
else
  log "dry run: $deleted_count item(s) would be removed. Re-run with --force to delete."
fi
```

Good tools tell you what happened. This three-way summary covers "nothing to do," "deleted N things," and "here's what a real run would do." Clear feedback closes the loop for the user.

## What makes this "principal-level"

Step back and notice the *judgment* embedded here, beyond mere syntax:

1. **Safe by default** (dry-run) — destructive action requires explicit `--force`.
2. **Idempotent** — run it twice, no errors; missing paths are skipped (Module 1.4).
3. **Robust** — `set -euo pipefail`, quoted variables, `--` guards, stderr for errors.
4. **Data/logic separation** — the `TARGETS` array vs the loop.
5. **Clear feedback** — consistent logging and an honest summary.
6. **Conventional** — `EX_USAGE` exit code, `--help`, `>&2` for errors.

None of these is exotic. Together they're the difference between a script you trust in automation and one that surprises you.

> [!TRY]
> Run `bash examples/shell/clean-cache.sh` (dry run) in the course repo — it lists what it *would* remove. Then build the site (`node tools/generate-pages.mjs`) to create `site/`, and run the dry run again to see `site` appear in the list. Only add `--force` once you're sure.

> [!KEY]
> - A real script combines everything: shebang, `set -euo pipefail`, functions, `while`+`case` parsing, arrays, guards, and clear output.
> - **Safe-by-default (dry-run)** plus an explicit `--force` is the pattern for any destructive tool.
> - Keep **data (the `TARGETS` array) separate from logic (the loop)**.
> - Small touches — `${0##*/}` for the program name, `--` before paths, `>&2` for errors, `EX_USAGE` exit codes — add up to a trustworthy tool.
