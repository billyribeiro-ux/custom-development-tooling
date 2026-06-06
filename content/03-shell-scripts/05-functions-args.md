# Functions, Arguments, and Return Values

Functions let you name a chunk of script and reuse it — the same reason functions exist in any language. But bash functions have their own peculiar rules around arguments and "return values" that surprise people coming from other languages. Let's get them right.

## Defining and calling functions

```bash title=functions.sh
greet() {
  echo "Hello!"
}

greet        # call it — just write its name, NO parentheses
```

> [!GOTCHA]
> You call a bash function by writing its name *with no parentheses and no commas*: `greet`, not `greet()`. Arguments are passed space-separated like command arguments: `greet Ada 42`. If you write `greet(Ada)` you'll get a syntax error. Functions are called exactly like commands, because to bash they basically *are* commands.

## Arguments: $1, $2, $@, $#

Functions receive arguments the same way scripts do — through numbered positional parameters:

```bash title=function-args.sh
greet() {
  echo "first arg:  $1"
  echo "second arg: $2"
  echo "all args:   $@"
  echo "arg count:  $#"
}

greet Ada Lovelace
# first arg:  Ada
# second arg: Lovelace
# all args:   Ada Lovelace
# arg count:  2
```

| Variable | Meaning |
| --- | --- |
| `$1`, `$2`, ... | the 1st, 2nd, ... argument |
| `$@` | all arguments, as separate words (use `"$@"`) |
| `$*` | all arguments as one string |
| `$#` | the number of arguments |
| `$0` | the script's name (not the function's) |

> [!WARNING]
> Always write **`"$@"`** (quoted) to pass arguments along correctly. Quoted `"$@"` preserves each argument as a distinct word, even ones containing spaces. Unquoted `$@` word-splits and breaks on spaces — the Module 2 bug again. `"$@"` is one of the most important idioms in bash.

These same `$1`, `$@`, `$#` work at the *script* level too — that's how a script reads *its* command-line arguments:

```bash title=script-args.sh
#!/usr/bin/env bash
echo "you ran me with $# arguments: $@"
echo "the first was: ${1:-none}"
```

## "Return values": the bash twist

Here's the big surprise. In bash, `return` does **not** return a value like in other languages — it sets the function's **exit code** (0–255). Functions communicate success/failure through exit codes, and *data* through stdout.

```bash title=return-vs-output.sh
# WRONG mental model (coming from other languages):
add() {
  return $(( $1 + $2 ))    # this sets the EXIT CODE, not a value! breaks for >255
}

# RIGHT: "return" data by PRINTING it; capture with $(...)
add() {
  echo $(( $1 + $2 ))      # print the result to stdout
}
result="$(add 3 4)"        # capture stdout into a variable
echo "$result"             # 7
```

So bash functions have two output channels, matching the streams lesson:

- **Exit code** (via `return N` or the last command) = success/failure, checkable with `$?` or `if`.
- **stdout** (via `echo`/`printf`) = the actual data, capturable with `$(...)`.

```bash title=function-as-predicate.sh
# A function used as a true/false test, via its exit code:
is_installed() {
  command -v "$1" >/dev/null 2>&1   # exit 0 if found, non-zero if not
}

if is_installed node; then
  echo "node is available"
fi
```

This is elegant: `is_installed` returns no data, just a yes/no via its exit code, so it slots right into an `if`.

## Local variables: avoid surprises

By default, all bash variables are **global** — a variable set inside a function leaks out and can clobber others. Use `local` to scope a variable to the function:

```bash title=local.sh
process() {
  local tmp="$1.processing"    # local: doesn't leak out of process()
  local i                       # declare locals even before assigning in loops
  for i in 1 2 3; do echo "$tmp $i"; done
}
```

> [!WARNING]
> Forgetting `local` causes maddening bugs: a function's loop variable `i` overwrites a `i` used by the caller. **Make every function-internal variable `local`.** It's the bash equivalent of not polluting the global namespace.

> [!GOTCHA]
> A subtle one: `local result="$(some_cmd)"` *hides* the exit code of `some_cmd`, because `local` itself succeeds. Under `set -e`, this means a failing command goes undetected. If you need to catch the failure, split it: `local result; result="$(some_cmd)"`.

## Structuring a script with functions

A clean bash script often looks like this — small functions, then a `main` that orchestrates:

```bash title=structured.sh
#!/usr/bin/env bash
set -euo pipefail

log()  { printf '[%s] %s\n' "${0##*/}" "$*" >&2; }   # log to stderr
die()  { log "ERROR: $*"; exit 1; }                   # log and exit

build() {
  local target="$1"
  log "building $target"
  # ...
}

main() {
  [[ $# -ge 1 ]] || die "usage: ${0##*/} <target>"
  build "$1"
  log "done"
}

main "$@"     # call main with all the script's arguments
```

That `main "$@"` at the bottom is a beloved pattern: it keeps definitions at the top and execution in one clear place, and passes the script's arguments through to `main`. The `log`/`die` helpers are reusable in every script you write.

> [!TRY]
> Write a `die() { echo "$*" >&2; exit 1; }` function and use it: `[[ -f config.json ]] || die "no config"`. Run it with and without a `config.json` present, and check `echo $?` after the failing case — you'll see exit code 1.

> [!KEY]
> - Call functions by name, **no parentheses**: `greet Ada 42`. They take args like commands.
> - Inside: `$1`, `$2`, `"$@"` (all args — always quote it), `$#` (count).
> - **`return` sets the exit code, not a value.** Return *data* by printing to stdout and capturing with `$(...)`.
> - Functions have two channels: **exit code** (success/failure) and **stdout** (data) — great for predicates in `if`.
> - Declare internal variables **`local`** to avoid clobbering the caller; structure scripts as small functions + a `main "$@"`.
