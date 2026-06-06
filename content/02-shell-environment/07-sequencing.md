# Subshells, &&, ||, and Command Sequencing

You now know about exit codes. This lesson shows how to *chain* commands based on those exit codes — to run things in sequence, conditionally, or in isolated subshells. These operators are the connective tissue of every shell script and Makefile.

## Running commands one after another

The simplest sequencing operators:

```bash title=sequencing.sh
cmd1; cmd2        # run cmd1, THEN cmd2 — regardless of whether cmd1 succeeded
cmd1 && cmd2      # run cmd2 only if cmd1 SUCCEEDED (exit 0)
cmd1 || cmd2      # run cmd2 only if cmd1 FAILED (non-zero)
```

- `;` is "and then," unconditionally. Use it to put several commands on one line.
- `&&` is "and if it worked." This is the workhorse of safe pipelines.
- `||` is "or else." Great for fallbacks and error messages.

## && — the safety chain

`&&` ensures each step only proceeds if the previous one succeeded. This is how you avoid building on failure:

```bash title=safety-chain.sh
# Only test if the build worked; only deploy if the tests passed:
npm run build && npm test && npm run deploy
```

If `npm run build` fails (non-zero), the chain stops immediately — `npm test` and `npm run deploy` never run. You'll never deploy a broken build. This single operator encodes "stop on first failure."

## || — fallbacks and error messages

```bash title=fallbacks.sh
# Provide a friendly message on failure:
npm test || echo "tests failed — see output above" >&2

# Try the fast way, fall back to the slow way:
use-cache || rebuild-from-scratch

# A common idiom: "do X, or die"
command -v node >/dev/null || { echo "node is required" >&2; exit 1; }
```

That last line reads: "check node exists; *or else* print an error and exit." It's a clean guard clause.

> [!GOTCHA]
> Combining `&&` and `||` like `A && B || C` is **not** an if/else! If `A` succeeds but `B` *fails*, `C` still runs. It reads like "if A then B else C" but doesn't behave like it. For real branching, use `if` (Module 3). Reserve `A && B || C` for cases where you're sure `B` can't fail.

## Grouping commands

Sometimes you want several commands to share a condition. Two ways to group:

```bash title=grouping.sh
# { ...; } runs in the CURRENT shell (note the spaces and trailing ;)
mkdir -p out && { cp a out/; cp b out/; }

# ( ... ) runs in a SUBSHELL — a separate child process
( cd build && make )      # the cd only affects the subshell
pwd                       # you're STILL in the original directory
```

## Subshells: isolation you can rely on

A **subshell** `( ... )` runs commands in a *child process* with a *copy* of the environment (remember inheritance from the env-vars lesson). Changes inside it — the current directory, variables, `set` options — **don't leak back out**.

```bash title=subshell-isolation.sh
echo "before: $PWD"
(
  cd /tmp                 # only changes the subshell's directory
  export TEMP_FLAG=1      # only set in the subshell
  do-something-in-tmp
)
echo "after:  $PWD"       # unchanged! still where you started
echo "${TEMP_FLAG:-gone}" # "gone" — the export didn't escape
```

This is invaluable in scripts: you can `cd` into a directory to do work without worrying about where the rest of the script ends up. The subshell cleans up after itself automatically.

> [!TIP]
> Prefer `( cd dir && do-stuff )` over a bare `cd dir; do-stuff` in scripts. If `do-stuff` is the last thing, the subshell guarantees you don't accidentally leave the script in the wrong directory for later commands. Isolation by default.

## How this connects to set -e

The relationship between `&&`, `||`, and `set -e` (Module 3) has a subtle rule worth previewing: under `set -e`, a command that *fails* aborts the script — **except** when it's part of a `&&`/`||` chain or an `if` condition, where a non-zero result is *expected* and handled. This is exactly the design you want, but it surprises people, so we'll revisit it.

## Pipelines and exit codes

Recall pipes from the streams lesson. By default, a pipeline's exit code is its *last* command's, which can hide failures earlier in the pipe:

```bash title=pipefail.sh
# Without pipefail: this "succeeds" (exit 0) even though 'false' failed,
# because the LAST command (echo) succeeded.
false | echo "hi"; echo $?     # prints 0  (!)

# 'set -o pipefail' makes the pipeline fail if ANY stage fails — much safer.
set -o pipefail
false | echo "hi"; echo $?     # prints non-zero
```

This is the third piece of the `set -euo pipefail` safety preamble we'll assemble in Module 3.

> [!TRY]
> Run `false && echo yes` (prints nothing — `false` failed, so `&&` stops). Then `false || echo yes` (prints `yes` — the fallback ran). Then `(cd /tmp && pwd); pwd` and watch the directory change *inside* the subshell but not outside.

> [!KEY]
> - `;` = then (unconditional); `&&` = and-if-success; `||` = or-if-failure. All driven by exit codes.
> - `&&` chains encode "**stop on first failure**" — perfect for build/test/deploy pipelines.
> - `A && B || C` is **not** if/else — use `if` for real branching.
> - `( ... )` runs in a **subshell**: directory changes, variables, and options **don't leak out** — isolation by default.
> - A pipeline's exit code is the last stage's unless you set **`pipefail`**, which makes any failing stage fail the pipe.
