# Parsing Args in Bash with getopts

In Module 3 you saw a hand-rolled `while`/`case` argument loop. That's perfect for a couple of flags. For anything more — combined short flags, options that take values, proper error messages — bash has a built-in helper: **`getopts`**. Let's learn it, and learn when *not* to use it.

## The hand-rolled approach (recap)

For one or two flags, the `while`/`case` pattern from `clean-cache.sh` is clear and fine:

```bash title=hand-rolled.sh
while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) FORCE=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown: $1" >&2; exit 64 ;;
  esac
  shift
done
```

It's explicit and readable. Use it when you have few options and don't need to combine short flags.

## getopts: the built-in parser

`getopts` handles *short* options (`-v`, `-o file`) including the niceties: combining flags (`-vf`), options-with-values (`-o output.txt`), and standard error messages.

```bash title=getopts-basic.sh
#!/usr/bin/env bash
set -euo pipefail

verbose=false
output="out.txt"

# The optstring "vo:h" means: -v (flag), -o (needs a value, hence the colon), -h (flag)
while getopts ":vo:h" opt; do
  case "$opt" in
    v) verbose=true ;;
    o) output="$OPTARG" ;;        # OPTARG holds the value given to -o
    h) echo "usage: $0 [-v] [-o file]"; exit 0 ;;
    \?) echo "$0: invalid option: -$OPTARG" >&2; exit 64 ;;   # unknown flag
    :)  echo "$0: option -$OPTARG needs a value" >&2; exit 64 ;;  # missing value
  esac
done
shift $((OPTIND - 1))             # drop the parsed options; positionals remain in "$@"

echo "verbose=$verbose output=$output remaining args: $*"
```

Let's decode the magic pieces:

- The **optstring** `":vo:h"` declares the valid options. A letter alone (`v`, `h`) is a boolean flag; a letter followed by `:` (`o:`) takes a value.
- The **leading colon** (`:vo:h`) turns on *silent error mode*, so you handle errors yourself via the `\?` (unknown option) and `:` (missing value) cases — giving clean, custom messages.
- **`$OPTARG`** holds the value of an option that takes one, or the offending letter on an error.
- **`$OPTIND`** is the index of the next argument to process. After the loop, `shift $((OPTIND - 1))` discards all the parsed options, leaving only positional arguments in `"$@"`.

## What getopts handles for you

```bash title=getopts-usage.sh
./tool -v -o result.txt input1 input2   # separate
./tool -vo result.txt input1 input2     # -v and -o combined
./tool -voresult.txt input1             # value attached to -o
# All three parse identically. getopts understands them all.
```

That flexibility — which users expect from real Unix tools — is exactly what's tedious to hand-roll.

## The big limitation: no long options

Here's the catch, and it's a real one:

> [!WARNING]
> Bash's built-in `getopts` only handles **short** options (`-v`), **not** long ones (`--verbose`). There is no portable, built-in way to parse `--long` flags in bash. If you need `--verbose`, you either hand-roll a `while`/`case` loop (which handles long flags naturally) or accept short-only flags.

This limitation is a big reason many engineers reach for Node or Python once a tool's CLI gets non-trivial — their parsers handle long options, subcommands, and help generation out of the box (next two lessons).

> [!GOTCHA]
> There's an external `getopt` (no `s`) command that *can* do long options, but its behavior differs between systems (the GNU vs BSD split), making scripts non-portable. Stick with the built-in `getopts` for short flags, or hand-roll for long flags. Avoid relying on external `getopt`.

## Choosing your bash approach

| Situation | Use |
| --- | --- |
| 1-2 flags, short or long | hand-rolled `while`/`case` |
| Several short flags, some with values | `getopts` |
| Need `--long` flags or subcommands | hand-roll, or step up to Node/Python |
| Complex CLI (many subcommands, rich help) | use Node/Python, honestly |

The principal-engineer move: **match the tool to the complexity.** A 10-line bash script with two short flags shouldn't import a framework. But once you're fighting bash to parse `--long` options and generate help, that's a signal the tool has outgrown bash — rewrite it in a language with a real argument parser. Knowing *when to switch languages* is itself a senior skill.

> [!TRY]
> Save the `getopts-basic.sh` example. Run it three ways: `./tool -v`, `./tool -o myfile`, and `./tool -x` (an invalid flag). Watch how `getopts` sets `verbose`, captures `OPTARG`, and rejects the unknown `-x` with your custom error and exit code 64.

> [!KEY]
> - For 1-2 flags, the **hand-rolled `while`/`case`** loop is clearest (and handles long flags).
> - **`getopts`** parses short options elegantly: the optstring (`"vo:h"`) declares flags, `:` marks value-taking options, `$OPTARG` holds values.
> - A **leading colon** enables custom error handling via the `\?` and `:` cases; `shift $((OPTIND-1))` leaves positionals.
> - Built-in `getopts` does **not** support `--long` options — hand-roll those, or move to Node/Python.
> - **Match the tool to the complexity**: switch languages when bash argument parsing gets painful.
