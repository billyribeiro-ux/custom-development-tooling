# Reading Input, trap for Cleanup, and Temp Files

Real scripts create temporary files, and real scripts get interrupted — by errors, by Ctrl+C, by the system. This lesson covers how to clean up reliably no matter how the script ends, which is the mark of a production-grade tool.

## The problem: scripts leave messes

Consider a script that creates a temp file to work in:

```bash title=leaky.sh
tmp="/tmp/work.$$"     # $$ = the script's process ID, for a unique-ish name
do-step-one > "$tmp"
do-step-two < "$tmp"   # what if do-step-one fails here, under set -e?
rm "$tmp"              # this cleanup line NEVER RUNS if we aborted above
```

Under `set -e`, if `do-step-one` fails, the script exits *before* reaching `rm "$tmp"`, leaving garbage in `/tmp`. Press Ctrl+C and the same thing happens. Manual cleanup at the end of a script is unreliable, because the script might not *reach* the end.

## trap: run cleanup no matter what

`trap` registers a command to run when the script receives a **signal** or **exits**. The magic word is `EXIT` — a pseudo-signal that fires *whenever the script terminates*, for any reason: normal finish, error, or interruption.

```bash title=trap-cleanup.sh
#!/usr/bin/env bash
set -euo pipefail

tmp="$(mktemp)"                 # create a safe temp file (see below)
trap 'rm -f "$tmp"' EXIT       # ALWAYS remove it when the script ends

do-step-one > "$tmp"           # even if THIS fails...
do-step-two < "$tmp"           # ...or this is interrupted...
# ...the trap still runs rm -f "$tmp" on the way out. Guaranteed cleanup.
```

Because the trap fires on `EXIT`, cleanup happens whether the script finishes normally, hits an error (and aborts via `-e`), or is killed with Ctrl+C. This is *the* idiom for reliable cleanup.

> [!TIP]
> Register the trap *immediately after* creating the resource, so there's no window where the resource exists but the cleanup isn't armed. Create temp file → set trap → use temp file.

## mktemp: safe temporary files

Don't hand-roll temp filenames like `/tmp/work.$$` — they're predictable (a security risk) and can collide. Use `mktemp`, which creates a guaranteed-unique file (or directory) with safe permissions and prints its name:

```bash title=mktemp.sh
tmpfile="$(mktemp)"                    # a unique temp FILE
tmpdir="$(mktemp -d)"                  # a unique temp DIRECTORY
trap 'rm -rf "$tmpdir"' EXIT          # clean up the whole dir on exit

echo "working in $tmpdir"
```

> [!WARNING]
> Predictable temp filenames (`/tmp/myapp.tmp`) are a classic security vulnerability: an attacker can pre-create or symlink that path. `mktemp` avoids this by generating an unpredictable name and creating the file atomically. Always use `mktemp` for temp files in scripts that might run on shared systems.

## Signals: what trap can catch

A **signal** is how the OS (or a user) tells a process something happened. The ones you'll care about:

| Signal | Triggered by | Typical use |
| --- | --- | --- |
| `EXIT` | the script ending (any reason) | **cleanup — use this** |
| `INT` | Ctrl+C | optional: custom interrupt message |
| `TERM` | `kill <pid>` (polite shutdown) | graceful shutdown |
| `ERR` | a command failing (with `set -e`) | optional: error reporting |

For cleanup, trapping `EXIT` alone is usually enough, because `INT` and `TERM` lead to exit, which fires the `EXIT` trap anyway.

```bash title=multiple-traps.sh
cleanup() { rm -rf "$tmpdir"; }
trap cleanup EXIT                       # always clean up
trap 'echo "interrupted!" >&2' INT     # extra message on Ctrl+C (EXIT still fires after)
```

## Reading input from the user

Sometimes a script needs to ask a question. `read` pulls a line from stdin into a variable:

```bash title=read-input.sh
read -r -p "Continue? [y/N] " answer    # -p shows a prompt; -r is literal
case "$answer" in
  [yY]|[yY][eE][sS]) echo "proceeding";;
  *) echo "aborted"; exit 1;;
esac

# Read a secret without echoing it to the screen (-s = silent):
read -r -s -p "Password: " pass
echo                                     # print a newline after the hidden input
```

> [!GOTCHA]
> Interactive prompts break automation — CI has no human to answer them, so the script hangs forever. Make prompts skippable: default to the safe choice on empty input, support a `--yes`/`-y` flag, or detect non-interactive mode with `[[ -t 0 ]]` (true only if stdin is a terminal). A tool that hangs waiting for input in CI is a broken tool.

## Putting it together: a safe, self-cleaning script

```bash title=safe-script.sh
#!/usr/bin/env bash
set -euo pipefail

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT          # guaranteed cleanup, armed immediately

log() { printf '[%s] %s\n' "${0##*/}" "$*" >&2; }

log "downloading into $workdir"
# ... download, process, etc. — if anything fails, the trap still cleans up ...
log "done"
# On exit (success OR failure OR Ctrl+C), $workdir is removed automatically.
```

This pattern — `mktemp -d` + `trap ... EXIT` — is something you'll reach for constantly. It makes a script a good citizen that never litters the filesystem.

> [!TRY]
> Write a script that does `tmp="$(mktemp)"; trap 'echo "cleaning up $tmp"; rm -f "$tmp"' EXIT; echo "working..."; sleep 5`. Run it and press Ctrl+C during the sleep. You'll see the cleanup message fire even though you interrupted it — that's the `EXIT` trap working.

> [!KEY]
> - Cleanup at the *end* of a script is unreliable — the script may abort or be interrupted first.
> - **`trap 'cleanup' EXIT`** runs cleanup whenever the script ends, for *any* reason. The core reliability idiom.
> - Use **`mktemp`** / `mktemp -d` for safe, unique temp files/dirs — never predictable names.
> - Arm the trap *immediately* after creating the resource.
> - `read -r -p` prompts for input (`-s` for secrets); **make prompts skippable** so they don't hang automation.
