# Reading TOML from Your Scripts

Sometimes your *own* tooling needs to read a TOML file — to pull the version from `pyproject.toml`, check a dependency, or load a TOML config you provide. This lesson shows how to parse TOML in Python and Node, and reinforces the safe config-reading patterns from Module 8.5.

## Python: tomllib is built in

Since Python 3.11, the standard library includes **`tomllib`** — no dependency needed (the same "built-in beats a library" theme as Node's `--env-file`, Module 9.2):

```python title=read_toml.py
import tomllib                          # built in since Python 3.11
from pathlib import Path

# IMPORTANT: tomllib reads BYTES, so open in binary mode ("rb")
with open("pyproject.toml", "rb") as f:
    data = tomllib.load(f)

print(data["project"]["name"])         # nested tables become nested dicts
print(data["project"]["version"])

# Or parse from a string:
config = tomllib.loads(Path("config.toml").read_text())
```

TOML maps cleanly to Python dictionaries: `[project]` becomes `data["project"]`, `[tool.ruff]` becomes `data["tool"]["ruff"]`, arrays become lists. It's as natural as `json.loads` (Module 6.2).

> [!GOTCHA]
> `tomllib.load()` requires the file be opened in **binary mode** (`"rb"`, not `"r"`). This surprises people — most file reading uses text mode. It's deliberate: TOML is defined as UTF-8, and binary mode avoids any platform encoding ambiguity (the encoding concern from Module 6.2). If you get a `TypeError` about `str` vs `bytes`, you forgot the `b`.

> [!NOTE]
> `tomllib` only *reads* TOML — there's no `tomllib.dump` to *write* it. That's intentional: TOML is meant for *humans* to write and *programs* to read. If you genuinely need to generate TOML programmatically, use the third-party `tomli-w` package — but it's rarely needed. Tools read config; humans edit it.

## A real example: get the project version

A common tooling task — read the version from `pyproject.toml` so a script doesn't hard-code it (single source of truth, Module 4.5):

```python title=get_version.py
#!/usr/bin/env python3
import tomllib
from pathlib import Path

def project_version() -> str:
    with open(Path(__file__).parent / "pyproject.toml", "rb") as f:
        return tomllib.load(f)["project"]["version"]

if __name__ == "__main__":
    print(project_version())            # prints e.g. 1.0.0
```

Now `--version` (Module 4.5) can read from this single source, and bumping the version in `pyproject.toml` updates everything automatically.

## Node: no built-in (yet) — use a small library

Node does *not* have a built-in TOML parser as of 2026. You have two practical options:

```javascript title=read-toml-node.mjs
// Option A: a tiny dependency (e.g. 'smol-toml' or '@iarna/toml')
import { parse } from 'smol-toml';      // npm install smol-toml
import { readFile } from 'node:fs/promises';

const data = parse(await readFile('pyproject.toml', 'utf8'));
console.log(data.project.name);
```

> [!TIP]
> If you only need *one value* from a TOML file and don't want a dependency, a small regex can work for simple, stable files — but it's fragile (Module 6.5's warning about parsing structured data with regex applies). For anything beyond a trivial lookup, use a real TOML parser. Don't reinvent a parser for a format with edge cases (multiline strings, arrays of tables) — that's exactly when a focused dependency is worth it (Module 1's dependency judgment).

## Apply the safe-reading patterns

Reading TOML has the *same* failure modes as reading JSON (Module 8.5) — handle them the same way:

```python title=safe_toml.py
import tomllib
import sys
from pathlib import Path

def load_config(path: str) -> dict:
    try:
        with open(path, "rb") as f:
            return tomllib.load(f)
    except FileNotFoundError:
        return {}                                   # missing -> defaults (Module 8.5)
    except tomllib.TOMLDecodeError as err:
        print(f"{path} is not valid TOML: {err}", file=sys.stderr)
        sys.exit(1)                                 # invalid -> clear error, fail fast
```

This mirrors the safe JSON loader exactly (Module 8.5): a missing file falls back to defaults, invalid TOML produces a clear message naming the file and exits non-zero (Module 9.5's fail-fast), and you'd then merge with defaults and validate. The *format* changed; the *discipline* is identical. That transferability is the point.

## Don't forget defaults and validation

Just like JSON config (Module 8.5) and env vars (Module 9.4/9.5), TOML values may be missing or wrong. Merge with defaults and validate:

```python title=toml_defaults.py
DEFAULTS = {"line_length": 88, "target": "py311"}
user = load_config("config.toml").get("tool", {}).get("mytool", {})
config = {**DEFAULTS, **user}            # user overrides defaults (Module 8.5 / 9.4)
# ...then validate types/values (Module 9.5)...
```

> [!DOGFOOD]
> Python's `tomllib` is exactly how Python tools read this repo's `pyproject.toml` — `ruff` reads `[tool.ruff]`, a build backend reads `[project]`. You could write a tiny script using `tomllib.load` to print the project version or list the dev dependencies, all with zero third-party packages. Try it as the exercise below.

## The mental model

Reading any config format — JSON (Module 8.5), env (Module 9), or TOML — follows one shape: **parse safely (handle missing/invalid), merge with defaults, validate, then use.** Only the parser changes (`JSON.parse`, `--env-file`, `tomllib.load`). Internalize that pipeline and you can robustly consume configuration in any format, in any language.

> [!TRY]
> Write a Python script that reads this repo's `pyproject.toml` with `tomllib` (remember `"rb"`!) and prints the project name and version, plus the list under `[dependency-groups].dev`. You'll practice the binary-mode gotcha and nested-dict access — and have a handy version-reading tool.

> [!KEY]
> - **Python's `tomllib`** (built in since 3.11) parses TOML into nested dicts — but you must open files in **binary mode (`"rb"`)**.
> - `tomllib` only **reads** TOML (no writer) — by design: humans write config, programs read it.
> - **Node has no built-in** TOML parser — use a small library (`smol-toml`, `@iarna/toml`); avoid regex for non-trivial TOML.
> - Reading TOML has the **same failure modes as JSON** — handle missing (→ defaults) and invalid (→ clear error, fail fast) identically (Module 8.5, 9.5).
> - The universal config pipeline: **parse safely → merge defaults → validate → use.** Only the parser changes across formats.
