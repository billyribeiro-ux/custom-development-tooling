# pyproject.toml: The Modern Python Standard

For years Python projects were configured by a scattered mess of files: `setup.py`, `setup.cfg`, `requirements.txt`, `MANIFEST.in`, plus a separate config file per tool. **`pyproject.toml`** consolidates all of it into one standardized, TOML file. In 2026 it's *the* way to configure a Python project — the Python equivalent of `package.json`.

## What pyproject.toml replaces

```text title=before-and-after
BEFORE (scattered):              AFTER (one file):
  setup.py                          pyproject.toml
  setup.cfg                         (everything lives here)
  requirements.txt
  requirements-dev.txt
  .flake8, .isort.cfg, etc.
```

A single file now holds project metadata, dependencies, the build system, and tool configuration. One place to look, one file to commit and review. This consolidation (defined by Python standards PEP 518, 517, and 621) is a big quality-of-life improvement.

## The [project] table: metadata and dependencies

The standardized `[project]` table describes your project — the Python analog of `package.json`'s identity and dependency fields (Module 8.2):

```toml title=pyproject.toml
[project]
name = "my-tool"
version = "1.0.0"
description = "A small Python tool."
readme = "README.md"
requires-python = ">=3.11"        # like package.json's "engines" (Module 8.2)
dependencies = [
  "requests>=2.31",               # runtime dependencies with version ranges
  "rich>=13.0",
]
```

- **`name`/`version`/`description`** — identity, same idea as `package.json`.
- **`requires-python`** — the Python version constraint (parallels `engines.node`).
- **`dependencies`** — runtime packages with version specifiers (`>=2.31` is like npm's range syntax, Module 8.2).

## Dependency groups: dev vs runtime

The modern way to separate development-only dependencies (test runners, linters) from runtime ones — the Python parallel to `devDependencies` (Module 8.2):

```toml title=pyproject.toml
[dependency-groups]
dev = ["ruff>=0.6", "pytest>=8.0"]   # installed only for development
```

```bash title=install-groups.sh
pip install -e .                  # install the project + its runtime dependencies
pip install --group dev           # install the dev group too
# or with uv (Module 6.3):
uv sync                           # install everything per the lockfile
```

> [!NOTE]
> `[dependency-groups]` (PEP 735, the 2026 standard) cleanly separates dev tools from runtime needs — exactly the `dependencies` vs `devDependencies` distinction from Module 8.2, and for the same reason: you don't ship your test runner to production. Older projects used `[project.optional-dependencies]` (extras) for this; you'll still see it.

## The [build-system] table

This tells Python *how to build* your project into an installable package — which "build backend" to use:

```toml title=pyproject.toml
[build-system]
requires = ["hatchling"]               # the build tool needed
build-backend = "hatchling.build"      # the backend that does the building
```

You mostly set this once and forget it. Common backends: `hatchling`, `setuptools`, `flit`, `pdm`. For a project that's *only tooling scripts* (not a published package), you may not need a build system at all.

## Tool configuration: [tool.*]

Here's where `pyproject.toml` really shines for tooling. Every tool gets its own `[tool.<name>]` table, so *all* tool config lives in one file instead of a dozen dotfiles:

```toml title=pyproject.toml
[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "W", "F", "I", "UP", "B"]

[tool.pytest.ini_options]
testpaths = ["tests"]

[tool.mypy]
strict = true
```

One file configures the linter (`ruff`), the test runner (`pytest`), and the type-checker (`mypy`). Compare to the old world of `.flake8`, `pytest.ini`, `mypy.ini`, `setup.cfg`... all replaced by clearly-namespaced `[tool.*]` tables. We cover tool config in depth next lesson.

## A complete pyproject.toml

```toml title=pyproject.toml
[project]
name = "my-tool"
version = "1.0.0"
description = "A small Python tool."
requires-python = ">=3.11"
dependencies = ["requests>=2.31"]

[dependency-groups]
dev = ["ruff>=0.6", "pytest>=8.0"]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.ruff]
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B"]
```

That single file is the entire configuration of a modern Python project: what it is, what it needs, how it's built, and how its tools behave. Read it and you understand the project — the Python equivalent of reading `package.json` (Module 8.2).

> [!DOGFOOD]
> This course's `pyproject.toml` (open it) has a `[project]` table (with `requires-python = ">=3.11"` and an empty `dependencies = []` — the Python generator is deliberately dependency-free, Module 6.4), a `[dependency-groups]` dev group with `ruff`, and `[tool.ruff]` + `[tool.ruff.lint]` configuring the linter. It's a real, minimal, modern `pyproject.toml`.

> [!TIP]
> When starting a new Python project in 2026, reach for `uv` (Module 6.3): `uv init` scaffolds a `pyproject.toml` for you, and `uv add requests` adds a dependency *and* updates the file and lockfile. You rarely hand-write the whole thing — but you should understand every section, which is why we walked through them.

> [!TRY]
> Open this repo's `pyproject.toml` and find: the `requires-python` constraint, the `dev` dependency group, and a `[tool.*]` section. Then compare its structure to `package.json` (Module 8.2) — notice how `[project]`↔identity, `dependencies`↔dependencies, `[dependency-groups].dev`↔devDependencies map across the two ecosystems.

> [!KEY]
> - **`pyproject.toml`** consolidates Python project config (replacing `setup.py`, `requirements.txt`, and per-tool dotfiles) into one standardized TOML file — the Python `package.json`.
> - **`[project]`** holds metadata, `requires-python`, and runtime `dependencies` (with version ranges).
> - **`[dependency-groups]`** (e.g. `dev`) separates dev-only tools from runtime deps — the `devDependencies` equivalent.
> - **`[build-system]`** declares how to build the package (set once); tooling-only projects may not need it.
> - **`[tool.*]`** tables configure each tool (ruff, pytest, mypy) in one place. In 2026, scaffold and manage it with **`uv`**.
