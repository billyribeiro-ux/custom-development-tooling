# set -euo pipefail, Explained Line by Line

If you remember one line from this entire module, make it this one:

```bash title=the-preamble.sh
set -euo pipefail
```

This goes near the top of nearly every serious bash script. It transforms bash from a language that *silently ignores errors by default* into one that *stops the moment something goes wrong*. Let's understand each piece, because each fixes a real, dangerous default.

## The problem: bash's defaults are dangerous

By default, bash keeps going after an error. Watch this horror:

```bash title=the-danger.sh
#!/usr/bin/env bash
cd /some/important/dir     # what if this directory doesn't exist?
rm -rf ./*                 # ...this still runs, in whatever directory you were in!
```

If the `cd` fails, bash prints an error *and keeps going* — and now `rm -rf ./*` runs in the wrong directory. This exact pattern has destroyed real systems. The default "ignore errors and continue" is the root cause.

`set -euo pipefail` fixes the defaults so this can't happen.

## -e : exit on error

```bash title=set-e.sh
set -e
```

`-e` means: **if any command fails (exits non-zero), stop the whole script immediately.** No more barrelling past a failed `cd`. The script aborts at the first sign of trouble, which is almost always what you want in automation.

```bash title=set-e-demo.sh
set -e
cd /nonexistent     # fails -> script STOPS here
rm -rf ./*          # never runs. Disaster averted.
```

> [!NOTE]
> `-e` has nuances. It does *not* trigger for commands in `if` conditions, `&&`/`||` chains, or `while` loops — places where a non-zero result is expected and handled. So `if grep ...; then` won't abort even if grep finds nothing. This is the behavior you want, but it surprises people, so remember: `-e` aborts on *unhandled* failures.

## -u : error on unset variables

```bash title=set-u.sh
set -u
```

`-u` means: **using a variable that was never set is an error**, instead of silently expanding to an empty string. This catches typos and prevents the catastrophic empty-variable bug from Module 2:

```bash title=set-u-demo.sh
set -u
rm -rf "$BUILD_DIR/cache"   # if BUILD_DIR is unset/typo'd -> ERROR and stop
                            # WITHOUT -u, this would be  rm -rf "/cache"  (!)
```

A misspelled variable name (`$BUILDDIR` vs `$BUILD_DIR`) becomes a loud error rather than a silent, dangerous empty value.

> [!TIP]
> With `-u`, intentionally-optional variables need a default to avoid erroring: `"${OPTIONAL:-}"` gives an empty string when unset, telling bash "yes, I know this might be unset, that's fine." We cover this `${VAR:-default}` syntax fully in the next lesson.

## pipefail : catch failures inside pipes

```bash title=pipefail.sh
set -o pipefail
```

Recall from Module 2 that a pipeline's exit code is, by default, only its *last* command's. So a failure in the middle gets hidden:

```bash title=pipefail-demo.sh
# Without pipefail: exit code is 0 (grep succeeded) even though the download failed!
curl -s https://broken-url | grep "data"

set -o pipefail
# With pipefail: if curl fails, the whole pipeline fails. The error surfaces.
curl -s https://broken-url | grep "data"
```

`pipefail` makes a pipeline fail if *any* stage fails, so errors can't hide behind a successful final command. Combined with `-e`, the script then aborts. Essential for any script that uses pipes.

## Putting it together

```bash title=full-preamble.sh
#!/usr/bin/env bash
set -euo pipefail

# From here on:
#   -e          a failed command aborts the script
#   -u          an unset variable is an error
#   -o pipefail a failed pipe stage fails the whole pipe
```

`-euo` is just three short flags combined: `-e`, `-u`, and `-o pipefail`. Together they turn bash's "keep going, ignore problems" defaults into "stop at the first real problem."

## The optional fourth: IFS

You'll sometimes see a fourth line for extra robustness around word-splitting:

```bash title=strict-ifs.sh
IFS=$'\n\t'   # split words only on newlines and tabs, not spaces
```

This narrows where bash splits unquoted variables (Module 2). It's a nice extra, but quoting your variables properly matters more. Don't cargo-cult it without understanding it.

> [!DOGFOOD]
> Open `examples/shell/clean-cache.sh` — its third line is `set -euo pipefail`, with a comment explaining each flag. Every shell script in this course starts this way. It's not optional ceremony; it's the difference between a script that fails safely and one that does damage when something unexpected happens.

> [!WARNING]
> `set -e` is a safety net, not a substitute for thinking. It catches *unexpected* failures, but you should still handle *expected* ones explicitly (with `if`, `||`, guard clauses). Treat `-e` as "abort on surprises," and handle the non-surprises yourself.

> [!TRY]
> Write a two-line script: `set -e` then `false` then `echo "reached"`. Run it — "reached" never prints because `false` aborted the script. Remove `set -e` and run again — now "reached" prints. You've seen `-e` in action.

> [!KEY]
> - `set -euo pipefail` near the top of every serious bash script turns dangerous defaults into safe ones.
> - **`-e`**: abort on any unhandled command failure (no more barrelling past a failed `cd`).
> - **`-u`**: unset variables become errors, catching typos and the empty-variable disaster.
> - **`pipefail`**: a failing stage *anywhere* in a pipe fails the whole pipe, so errors can't hide.
> - It's a net for *surprises* — still handle *expected* failures explicitly.
