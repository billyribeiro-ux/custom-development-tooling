# Exit Codes and What "Success" Means

How does one program tell another whether it succeeded? Not with words — with a single number called the **exit code** (or *exit status*, or *return code*). This tiny integer is the glue that holds all automation together. Get it wrong and your CI lies to you.

## The rule

When any program finishes, it returns an integer from 0 to 255:

> **0 means success. Anything else (1–255) means failure.**

That's the universal convention. `0` = "everything's fine." Non-zero = "something went wrong," and the specific number can indicate *what* went wrong.

This feels backwards at first (zero is "good"?), but there's a reason: there's only *one* way to succeed, but *many* ways to fail — so 0 is success, and the other 255 values are available to distinguish different failures.

## Seeing the exit code

The shell stores the last command's exit code in the special variable `$?`:

```bash title=check-status.sh
ls /etc
echo "$?"        # 0  (ls succeeded)

ls /nonexistent
echo "$?"        # 1 or 2  (ls failed: no such directory)
```

> [!GOTCHA]
> `$?` holds the exit code of the **most recent** command only, and it's overwritten by the *next* command — including by `echo` itself. So capture it immediately if you need it: `status=$?` right after the command, before anything else runs.

## Why exit codes are the foundation of automation

Humans read error messages. *Programs* read exit codes. Every piece of automation — `&&`, `||`, `if`, `set -e`, Make, CI — makes decisions based on exit codes, not on the text a program printed.

```bash title=decisions-on-exit-codes.sh
# Run the build; only deploy if it SUCCEEDED (exit 0)
npm run build && npm run deploy

# Run the test; print a message if it FAILED (non-zero)
npm test || echo "tests failed!"

# Branch on success/failure
if grep -q "TODO" *.js; then
  echo "found TODOs"   # grep exits 0 when it finds a match
fi
```

`&&` means "run the next command only if the previous *succeeded*." `||` means "only if it *failed*." `if` runs its body when the condition command exits 0. All of this is built on exit codes (full details next lesson).

> [!WARNING]
> This is why a script that does nothing useful but exits 0 is so dangerous: every tool built on top of it believes it succeeded. **Your scripts must exit non-zero when they fail**, or automation will happily build on a broken foundation. In a CI pipeline, an exit code of 0 means "this step passed" — so an incorrectly-zero exit can ship a bug to production.

## Setting exit codes in your own scripts

```bash title=exit-codes.sh
#!/usr/bin/env bash
if [[ ! -f config.json ]]; then
  echo "config.json not found" >&2
  exit 1                         # signal failure explicitly
fi
# ... do the work ...
exit 0                           # explicit success (often optional; see below)
```

A script's exit code is that of its **last command**, unless you `exit N` explicitly. So a script can succeed or fail "by accident" based on its final line — another reason to be deliberate.

```javascript title=node-exit.mjs
// Node
if (!ok) {
  console.error('something failed');
  process.exit(1);   // non-zero = failure
}
// (an uncaught exception also exits non-zero, which is usually what you want)
```

```python title=py_exit.py
import sys
if not ok:
    print("something failed", file=sys.stderr)
    sys.exit(1)
# (an uncaught exception exits with code 1 too)
```

## Conventional codes

While "non-zero = failure" is the only hard rule, some conventions are widely followed:

| Code | Meaning |
| --- | --- |
| 0 | Success |
| 1 | General/unspecified error |
| 2 | Misuse of the command (often: bad arguments) |
| 64 | Command-line usage error (`EX_USAGE`, from `sysexits.h`) |
| 126 | Found but not executable (permission problem) |
| 127 | Command not found |
| 130 | Terminated by Ctrl+C (SIGINT) |

> [!DOGFOOD]
> The course's `clean-cache.sh` exits `64` on an unknown option — the conventional "you used me wrong" code. Its `generate-pages.mjs` calls `process.exit(1)` if the build throws, so CI fails loudly instead of deploying a broken site. The whole CI pipeline is just a chain of exit-code checks.

> [!TIP]
> `set -e` (Module 3) makes a script abort the moment any command returns non-zero. It turns "exit codes" from something you check manually into automatic, strict error handling. It's the first line of nearly every good script.

> [!TRY]
> Run `true; echo $?` then `false; echo $?`. The commands `true` and `false` exist for exactly this — they do nothing but exit 0 and 1 respectively. Then try `ls /etc && echo "yes"` versus `ls /nope && echo "yes"` and watch how `&&` respects the exit code.

> [!KEY]
> - Every program returns an **exit code**: **0 = success**, non-zero = failure.
> - `$?` holds the last command's exit code (capture it immediately — it's overwritten fast).
> - **All automation** (`&&`, `||`, `if`, `set -e`, Make, CI) decides based on exit codes, not printed text.
> - Your scripts **must exit non-zero on failure**, or automation will build on broken results.
> - A script's exit code defaults to its **last command's**; use `exit N` to be deliberate.
