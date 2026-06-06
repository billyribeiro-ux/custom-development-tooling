# pathlib, os, and subprocess for Tooling

Python's standard library is famously "batteries included." For tooling, three areas matter most: working with files and paths (`pathlib`), the environment and process info (`os`), and running other programs (`subprocess`). These are Python's answers to the Node built-ins from Module 5 — and to the shell itself.

## pathlib: the modern way to handle paths

Older Python code uses `os.path.join` and string manipulation. Modern Python uses **`pathlib.Path`**, which treats paths as objects with clean methods and operators. Prefer it.

```python title=pathlib_tour.py
from pathlib import Path

root = Path("content")
file = root / "01-intro.md"        # the / operator joins paths — readable!

file.name          # '01-intro.md'      (filename)
file.stem          # '01-intro'         (filename without extension)
file.suffix        # '.md'              (extension)
file.parent        # Path('content')    (directory)
file.exists()      # True / False
file.is_file()     # True / False
file.is_dir()      # True / False
```

That `/` operator is the headline feature: `root / "sub" / "file.md"` reads naturally and handles separators cross-platform (the Python analog of Node's `path.join`, Module 5.2). Never concatenate path strings by hand.

## Reading and writing with pathlib

`Path` objects can read and write files directly — no separate `open()` needed for simple cases:

```python title=pathlib_io.py
from pathlib import Path

text = Path("config.txt").read_text(encoding="utf-8")    # read a whole file
Path("out.txt").write_text("hello\n", encoding="utf-8")  # write a whole file

import json
config = json.loads(Path("config.json").read_text())     # read + parse JSON
Path("config.json").write_text(json.dumps(config, indent=2) + "\n")  # pretty-print + trailing newline
```

> [!TIP]
> Pass `encoding="utf-8"` explicitly. Python's default text encoding can vary by platform/locale, which is a subtle cross-platform reproducibility bug (Module 1.3). Being explicit makes your tooling behave the same everywhere — the same discipline as passing `'utf8'` to Node's `readFile` (Module 5.3).

## Directories: create, list, glob

```python title=pathlib_dirs.py
from pathlib import Path

Path("dist/assets").mkdir(parents=True, exist_ok=True)   # like mkdir -p (idempotent!)

for entry in Path("src").iterdir():                       # list a directory
    print(entry.name, "dir" if entry.is_dir() else "file")

# Glob patterns (Module 2.6) work as methods:
for md in Path("content").glob("*.md"):                   # top level
    print(md)
for md in Path("content").rglob("*.md"):                  # rglob = recursive, all depths
    print(md)
```

> [!NOTE]
> `mkdir(parents=True, exist_ok=True)` is the idempotent directory creation (Module 1.4) — `parents=True` makes intermediate dirs (like `-p`), `exist_ok=True` means "fine if it already exists." Forgetting `exist_ok=True` makes re-running crash with `FileExistsError`. This is the Python version of `mkdir -p` and Node's `{ recursive: true }`.

## os: environment and process info

```python title=os_tour.py
import os

os.environ.get("PORT", "3000")    # read an env var with a default (Module 2.3)
os.environ["DEBUG"] = "1"          # set one (for child processes you launch)
os.getcwd()                        # current working directory
os.cpu_count()                     # number of CPUs (useful for parallelism)
```

> [!GOTCHA]
> Use `os.environ.get("KEY", default)`, not `os.environ["KEY"]`, for variables that might be missing. The bracket form raises `KeyError` (a crash) if the variable isn't set; `.get()` returns the default. Always plan for "not set" (Module 2.3, Module 9).

For most path work, prefer `pathlib` over the older `os.path` functions — but `os` remains the home for environment and process-level info.

## subprocess: running other programs

`subprocess` is Python's `child_process` (Module 5.4) — and the same security rule applies.

```python title=subprocess_tour.py
import subprocess

# Run a program and capture its output. Pass args as a LIST (not a string).
result = subprocess.run(
    ["git", "rev-parse", "HEAD"],
    capture_output=True,    # capture stdout/stderr
    text=True,              # decode bytes to str (like Node's 'utf8')
    check=True,             # raise CalledProcessError on non-zero exit (Module 2.5)
)
commit = result.stdout.strip()
print(f"commit: {commit}")
```

Three options to always remember:

- **args as a list** `["git", "rev-parse", "HEAD"]` — separate program and arguments. This avoids the shell, preventing command injection (exactly like Module 5.4).
- **`text=True`** decodes output to strings (otherwise you get bytes).
- **`check=True`** makes a non-zero exit code raise an exception, so failures aren't silently ignored. *Without it, you must inspect `result.returncode` yourself.*

```python title=subprocess_stream.py
# Stream output live (like Node's spawn with stdio:'inherit') — omit capture_output:
subprocess.run(["npm", "test"], check=True)   # output goes straight to your terminal
```

> [!WARNING]
> **Never use `shell=True` with untrusted input.** `subprocess.run(f"cat {filename}", shell=True)` runs through a shell, so a malicious `filename` like `"x; rm -rf ~"` executes arbitrary commands — the same injection vulnerability as Node's `exec` (Module 5.4). Use the list form, which never invokes a shell. Reserve `shell=True` for cases where you fully control the string and genuinely need shell features.

## Handling subprocess failure

```python title=subprocess_errors.py
import subprocess, sys

try:
    subprocess.run(["tsc", "--noEmit"], check=True)
except subprocess.CalledProcessError as err:
    print(f"type-check failed (exit {err.returncode})", file=sys.stderr)
    sys.exit(1)                 # propagate the failure (Module 2.5)
except FileNotFoundError:
    print("tsc not found — is it installed?", file=sys.stderr)
    sys.exit(127)               # 127 = command not found (Module 2.5)
```

This handles both "the program ran and failed" (`CalledProcessError`) and "the program doesn't exist" (`FileNotFoundError`) — two different problems deserving two different messages, exactly the kind of care from Module 4.5.

> [!DOGFOOD]
> The course's `tools/generate-pages.py` uses `pathlib` throughout — `Path(__file__).resolve().parent.parent` for the repo root, `.read_text()` / `.write_text()` for I/O, `.mkdir(parents=True)` for output dirs, and `shutil.copytree` for assets. It needs no `subprocess` because it does pure file transformation — but a deploy script that runs `docker` and `git` would lean on `subprocess.run([...], check=True)`.

> [!TRY]
> Write a Python script using `pathlib` that prints every `.md` file under a folder (`Path("content").rglob("*.md")`) with its line count (`len(p.read_text().splitlines())`). Then add a `subprocess.run(["git", "log", "--oneline", "-3"], check=True)` to print recent commits. You'll exercise both modules.

> [!KEY]
> - Use **`pathlib.Path`** (with the `/` operator) for all path work — readable and cross-platform; avoid string concatenation and prefer it over `os.path`.
> - `Path.read_text()`/`write_text(encoding="utf-8")` for simple I/O; `mkdir(parents=True, exist_ok=True)` for idempotent dirs.
> - **`os.environ.get("KEY", default)`** for env vars (never bracket-access a possibly-missing key).
> - **`subprocess.run([...], text=True, check=True)`** runs programs safely: **list args (no shell)**, decode to text, raise on failure.
> - **Never `shell=True` with untrusted input** (injection); handle `CalledProcessError` and `FileNotFoundError` distinctly.
