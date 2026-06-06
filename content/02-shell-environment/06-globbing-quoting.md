# Globbing, Quoting, and Word-Splitting Gotchas

This is the lesson that prevents the most painful, hardest-to-spot shell bugs. The shell does surprising things to your text *before* your command ever runs. Understanding these transformations — and how quoting controls them — is what separates fragile scripts from solid ones.

## The shell transforms your line before running it

Remember the shell's job: it *expands* your command line before launching the program. Two expansions cause most trouble: **globbing** and **word-splitting**.

## Globbing: wildcards become filenames

A **glob** is a wildcard pattern the shell expands into matching filenames:

```bash title=globbing.sh
echo *.txt          # the shell replaces *.txt with: a.txt b.txt c.txt
ls src/*.js         # expands to every .js file in src/
cp *.png images/    # copy all PNGs
```

| Pattern | Matches |
| --- | --- |
| `*` | any characters (except a leading dot) |
| `?` | exactly one character |
| `[abc]` | one of a, b, or c |
| `**` | (with `globstar` on) any depth of directories |

The critical insight: **globbing happens in the shell, not in the program.** When you run `ls *.js`, `ls` never sees `*.js` — it sees the already-expanded list of filenames. The program has no idea a wildcard was involved.

> [!GOTCHA]
> If a glob matches *nothing*, bash (by default) passes the **literal pattern** through unchanged. So `ls *.xyz` with no `.xyz` files runs `ls *.xyz` literally and errors with "No such file." Set `shopt -s nullglob` to make non-matching globs expand to *nothing* instead — often what you actually want in scripts.

## Word-splitting: spaces break things apart

After expanding variables, the shell **splits the result on whitespace** into separate words. This is the source of the most infamous shell bug:

```bash title=the-classic-bug.sh
file="my report.txt"     # a filename WITH A SPACE
rm $file                 # DANGER: becomes  rm my report.txt  -> TWO arguments!
                         # tries to delete "my" AND "report.txt"
```

Because `$file` is unquoted, the shell splits `my report.txt` into two words. `rm` receives two arguments and deletes (or fails on) the wrong things. With a malicious or unexpected filename, this is how scripts cause real damage.

## The fix: quote your variables

Wrapping a variable in **double quotes** prevents word-splitting and glob expansion of its value:

```bash title=the-fix.sh
file="my report.txt"
rm "$file"               # SAFE: one argument, exactly "my report.txt"
```

> [!WARNING]
> **Quote every variable expansion** unless you have a specific, deliberate reason not to. `"$file"`, `"$@"`, `"${array[@]}"`. This one habit eliminates a whole category of bugs. When in doubt, quote. The linter ShellCheck (Module 3) will flag unquoted variables for you.

## Single vs double quotes

```bash title=quote-types.sh
name="Ada"
echo "hello $name"    # double quotes: variables EXPAND -> hello Ada
echo 'hello $name'    # single quotes: everything LITERAL -> hello $name
```

- **Double quotes** (`"..."`): prevent word-splitting/globbing, but *still* expand variables (`$var`), command substitution (`$(...)`), etc. Use these most of the time.
- **Single quotes** (`'...'`): completely literal. Nothing is expanded. Use when you want the exact text, like a regex or a literal `$`.

## Command substitution

`$(...)` runs a command and substitutes its output into the line. Quote it too:

```bash title=command-sub.sh
today="$(date +%Y-%m-%d)"     # capture output into a variable
echo "Backup for $today"

# Quote it when used, especially if output could contain spaces:
mkdir "backup-$(date +%F)"
```

## The "unset variable" trap

If a variable is unset and you don't guard it, you can get nasty surprises:

```bash title=unset-danger.sh
# If $DIR is accidentally empty/unset, this becomes a catastrophic  rm -rf /
rm -rf "$DIR/build"      # if DIR="" -> rm -rf "/build" ... still bad
```

This is exactly why `set -u` (Module 3) exists — it makes the shell *error* on any unset variable instead of silently treating it as empty. Combined with quoting, it prevents disasters.

> [!DOGFOOD]
> Look at `examples/shell/clean-cache.sh`: every variable is quoted (`"$target"`, `rm -rf -- "$target"`), it uses `set -euo pipefail`, and the `--` before the path stops a filename starting with `-` from being read as a flag. That's defensive shell programming, demonstrated.

## The mental model

Whenever a shell command behaves strangely, ask: *what did the shell turn my line into before running it?* Mentally perform the expansions — variables, then globs, then word-splitting — and the surprise usually becomes obvious. The fix is almost always "add quotes."

> [!TRY]
> Run `touch "a b.txt"` to make a file with a space. Then run `for f in *.txt; do echo "[$f]"; done` and notice it correctly shows `[a b.txt]` (the `for` glob is safe). Now try the buggy `x=*.txt; echo $x` vs the safe `echo "$x"` and watch the difference between expansion and literal.

> [!KEY]
> - The shell **expands** your line (globs, variables, splitting) *before* the program runs — the program sees the result.
> - **Globbing** turns `*.js` into matching filenames *in the shell*; a non-matching glob passes through literally (unless `nullglob`).
> - **Word-splitting** breaks unquoted variable values on whitespace — the cause of the classic spaces-in-filenames bug.
> - **Quote your variables** (`"$var"`) to prevent splitting/globbing. Double quotes expand; single quotes are literal.
> - Combine quoting with `set -u` to avoid empty-variable disasters; let **ShellCheck** catch what you miss.
