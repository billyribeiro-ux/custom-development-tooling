# Exit Codes, Usage Errors, and --version

You learned what exit codes *are* in Module 2. Now let's make your CLIs use them *correctly and conventionally*, plus add the two finishing touches every polished tool has: proper usage errors and a `--version` flag. These small details are what make a tool feel professional and behave well in automation.

## Exit codes are your tool's API to other programs

Reframe it: your CLI's exit code is its machine-readable contract. A human reads your error message; a script reads your exit code to decide what to do next. Get the codes right and your tool composes cleanly into pipelines, Makefiles, and CI.

```bash title=composing.sh
# Other tools rely on YOUR exit code:
mytool build && mytool deploy        # deploy only if build exits 0
mytool check || send-alert           # alert only if check fails
```

## A practical exit-code scheme

You don't need elaborate codes, but a little structure helps callers distinguish *kinds* of failure:

| Code | Meaning | When to use |
| --- | --- | --- |
| `0` | success | the tool did its job |
| `1` | general failure | the operation failed (most errors) |
| `2` | usage error | bad/missing arguments (argparse's default) |
| `64` | usage error (`EX_USAGE`) | the BSD `sysexits.h` convention some tools prefer |
| `>2` (custom) | specific failures | e.g. `3` = config invalid, `4` = network down |

> [!NOTE]
> There are two common conventions for "you used me wrong": `2` (what Python's `argparse` emits) and `64` (`EX_USAGE` from the old BSD `sysexits.h` header). Either is fine — just **be consistent within a tool**. Don't use `2` in one place and `64` in another. This course's bash scripts use `64`; its Python uses argparse's `2`.

## Distinguishing usage errors from operation errors

A subtle but important distinction:

- A **usage error** means the *user* invoked the tool wrong (bad flag, missing argument). The fix is to change the command. Print usage, exit `2`/`64`.
- An **operation error** means the command was valid but the *work* failed (file not found, network down, test failed). Print what went wrong, exit `1` (or a specific code).

```bash title=two-kinds-of-error.sh
mytool                       # usage error: missing argument -> print usage, exit 64
mytool build missing.txt     # operation error: file doesn't exist -> print error, exit 1
```

Treating these the same confuses users. "Did I type it wrong, or did something break?" The exit code and message should answer that instantly.

## Where errors go: stderr, always

Revisit Module 2.4: **errors and diagnostics go to stderr, results go to stdout.** This lets users pipe your real output while still seeing errors:

```bash title=errors-to-stderr.sh
mytool export > data.json      # the JSON goes to the file...
# ...any error message still appears on screen (it's on stderr)
```

In each language:

```bash title=stderr-bash.sh
echo "error: file not found" >&2; exit 1
```
```javascript title=stderr-node.mjs
console.error('error: file not found');   // console.error writes to stderr
process.exit(1);
```
```python title=stderr-py.py
import sys
print("error: file not found", file=sys.stderr)
sys.exit(1)
```

> [!WARNING]
> A frequent mistake: printing errors to *stdout*. Now anyone capturing your tool's output gets error text mixed into their data, and silence on the error channel makes scripts think all is well. Errors **must** go to stderr. (Your linter and code review should catch this.)

## The --version flag

Every real tool reports its version. It's essential for bug reports ("which version are you on?") and for scripts that need a minimum version.

```javascript title=version-node.mjs
import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';

const { values } = parseArgs({ options: { version: { type: 'boolean' } } });
if (values.version) {
  const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url)));
  console.log(pkg.version);     // print the version from package.json (single source of truth)
  process.exit(0);
}
```

```python title=version-py.py
parser.add_argument("--version", action="version", version="%(prog)s 1.2.0")
# argparse handles it entirely: prints the version and exits 0
```

> [!TIP]
> Read the version from a *single source* — `package.json`, `pyproject.toml`, a `VERSION` file — rather than hard-coding it in the code. Then bumping the version in one place is enough, and `--version` can never lie. Same single-source-of-truth principle as everything else in this course.

## The "good citizen" checklist

A CLI that behaves well in automation:

1. Exits **0** on success, **non-zero** on failure — always.
2. Distinguishes **usage errors** (`2`/`64`) from **operation errors** (`1`/custom).
3. Sends **errors to stderr**, results to stdout.
4. Supports **`--help`** (clear, complete) and **`--version`**.
5. Never **hangs** waiting for input in non-interactive contexts (Module 3.6).
6. Is **quiet on success** by default (print results, not chatter) — add `--verbose` for more.

> [!DOGFOOD]
> The course's generators follow this: `generate-pages.mjs` exits `1` if the build throws (so CI fails), prints progress to the console, and supports `--help`. `clean-cache.sh` exits `64` on a bad flag and sends all errors to stderr. These aren't accidents — they're the checklist applied.

> [!TRY]
> Take any script you've written and audit it against the six-point checklist. Most scripts fail at least two points (often: errors to stdout, or no `--help`). Fix them — it's the fastest way to make a script feel professional.

> [!KEY]
> - A CLI's **exit code is its contract** with other programs — get it right and your tool composes cleanly.
> - Distinguish **usage errors** (bad invocation → `2`/`64`) from **operation errors** (work failed → `1`/custom); be consistent.
> - **Errors to stderr, results to stdout** — never mix them.
> - Add **`--help`** and **`--version`**; read the version from a single source so it can't lie.
> - Be a "good citizen": correct exit codes, no hanging on input, quiet on success.
