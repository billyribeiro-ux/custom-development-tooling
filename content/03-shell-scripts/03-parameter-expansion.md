# Variables, Parameter Expansion, and Defaults

Bash variables look simple, but bash has a rich, terse syntax for transforming them inline — called **parameter expansion**. Learning the handful that matter makes your scripts dramatically cleaner and safer. We'll skip the obscure ones and focus on what you'll actually use.

## Variables: the basics (and the no-spaces rule)

```bash title=variables.sh
name="Ada"          # assign — NO spaces around the =
greeting="Hello, $name"
echo "$greeting"    # Hello, Ada
```

> [!GOTCHA]
> `name = "Ada"` (with spaces) does **not** assign a variable — bash reads it as "run the command `name` with arguments `=` and `Ada`." Assignment requires *no spaces* around `=`. This is the #1 beginner bash error.

Always read variables with `"$var"` (quoted, from Module 2). Curly braces `"${var}"` are equivalent but let you disambiguate where the name ends:

```bash title=braces.sh
file="report"
echo "$file_final"     # looks for a variable named "file_final" -> empty!
echo "${file}_final"   # report_final  (braces show where the name ends)
```

## Defaults: the most useful expansions

These four handle "what if the variable is unset or empty?" — a constant need, especially under `set -u`:

```bash title=defaults.sh
echo "${NAME:-guest}"      # use $NAME, or "guest" if unset/empty (doesn't change NAME)
echo "${NAME:=guest}"      # use $NAME, or set NAME="guest" and use it
echo "${NAME:?name required}"   # use $NAME, or print error + EXIT if unset/empty
echo "${NAME:+yes}"        # "yes" if NAME is set, otherwise empty (the opposite)
```

| Syntax | Meaning |
| --- | --- |
| `${V:-default}` | value, or `default` if unset/empty |
| `${V:=default}` | value, or *assign and use* `default` |
| `${V:?message}` | value, or *exit with error* `message` |
| `${V:+alt}` | `alt` if set, else empty |

These are everywhere in real scripts:

```bash title=defaults-in-action.sh
out_dir="${OUT_DIR:-./dist}"          # configurable output, sensible default
src="${1:?usage: build.sh <source>}"  # require the first argument or die
verbose="${VERBOSE:+--verbose}"       # add a flag only if VERBOSE is set
```

> [!TIP]
> The `:` matters: `${V:-x}` treats *empty* as "use default," while `${V-x}` (no colon) only uses the default if `V` is fully *unset* (an empty value counts as set). Usually you want the colon version. Mostly you can just always use `:`.

## String manipulation without external tools

Bash can slice and dice strings without calling `sed`/`cut` — faster and dependency-free:

```bash title=string-ops.sh
path="/home/user/report.txt"

echo "${path##*/}"    # report.txt   — remove longest match of */ from FRONT (basename)
echo "${path%/*}"     # /home/user   — remove shortest match of /* from END (dirname)
echo "${path%.txt}"   # /home/user/report — remove ".txt" suffix
echo "${path/user/me}" # /home/me/report.txt — replace first "user" with "me"
echo "${#path}"       # 22 — the LENGTH of the string
```

The mnemonics: `#` is "front" (it's on the left of `$` on the keyboard), `%` is "back" (right side). Single (`#`/`%`) removes the *shortest* match; doubled (`##`/`%%`) removes the *longest*.

```bash title=front-back-mnemonic.sh
f="archive.tar.gz"
echo "${f%.*}"    # archive.tar   — shortest from back: removes ".gz"
echo "${f%%.*}"   # archive       — longest from back: removes ".tar.gz"
echo "${f#*.}"    # tar.gz        — shortest from front: removes "archive."
echo "${f##*.}"   # gz            — longest from front: removes "archive.tar."
```

> [!NOTE]
> `${path##*/}` and `${path%/*}` are the pure-bash equivalents of the `basename` and `dirname` commands. Using parameter expansion avoids launching external processes, which matters in loops that run thousands of times. But `basename`/`dirname` are clearer to readers — choose readability unless performance demands otherwise.

## Case conversion (bash 4+)

```bash title=case.sh
name="Ada"
echo "${name,,}"   # ada   — all lowercase
echo "${name^^}"   # ADA   — all uppercase
```

> [!WARNING]
> Case-conversion (`,,`/`^^`) needs bash 4+. macOS's ancient bash 3.2 doesn't have it. For portable scripts, use `tr '[:upper:]' '[:lower:]'` instead. This is the kind of portability gotcha to keep in mind (Module 1's reproducibility).

## A worked example

Combining these into a realistic snippet:

```bash title=expansion-example.sh
#!/usr/bin/env bash
set -euo pipefail

# Require an input file (or print usage and exit)
input="${1:?usage: convert.sh <file> [outdir]}"
# Optional output dir with a default
outdir="${2:-./out}"
# Derive the output name: strip directory and extension, add .json
stem="${input##*/}"        # strip path -> "data.csv"
stem="${stem%.*}"          # strip extension -> "data"
output="${outdir}/${stem}.json"

mkdir -p "$outdir"
echo "converting $input -> $output"
```

Every transformation here is pure bash — no `basename`, no `sed`, no subprocess.

> [!TRY]
> In a terminal, set `p="/var/log/app.log"` then run each of: `echo "${p##*/}"`, `echo "${p%/*}"`, `echo "${p%.log}.txt"`. Predict each result before pressing Enter, then check yourself.

> [!KEY]
> - Assign with **no spaces** around `=`; read with `"$var"` or `"${var}"`.
> - Defaults are essential under `set -u`: `${V:-default}`, `${V:=default}`, `${V:?error}`, `${V:+alt}`.
> - Bash slices strings inline: `##*/` (basename), `%/*` (dirname), `%.ext` (strip suffix), `/a/b` (replace), `${#v}` (length).
> - `#`/`##` trim from the **front**, `%`/`%%` from the **back**; doubled = longest match.
> - Case conversion (`,,`/`^^`) is **bash 4+ only** — use `tr` for portability.
