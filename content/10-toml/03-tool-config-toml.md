# Tool Config in TOML (ruff, Cargo.toml)

TOML's `[tool.*]` tables are where a lot of real tooling configuration lives. This lesson makes that concrete by configuring **ruff** — the fast, modern Python linter and formatter that has largely replaced the old patchwork of Python tools — and peeking at Rust's `Cargo.toml`. The goal is to make you comfortable *configuring* tools, not just running them.

## ruff: one tool replacing many

For years, Python linting meant running several tools: `flake8` (style/errors), `isort` (import ordering), `black` (formatting), `pyupgrade` (modernizing syntax), and more — each with its own config file. **`ruff`** does all of it, written in Rust, and is *dramatically* faster (often 10-100x). In 2026 it's the default choice. Crucially, it's configured in `pyproject.toml` under `[tool.ruff]`:

```toml title=pyproject.toml
[tool.ruff]
line-length = 100              # max line length (the famous "black" default is 88)
target-version = "py311"      # assume Python 3.11 features

[tool.ruff.lint]
# Each code is a FAMILY of checks. Selecting families turns them on:
select = [
  "E",   # pycodestyle errors
  "W",   # pycodestyle warnings
  "F",   # pyflakes (unused imports/variables, undefined names)
  "I",   # isort (import sorting)
  "UP",  # pyupgrade (modernize old syntax)
  "B",   # flake8-bugbear (likely bugs)
]
ignore = ["E501"]             # optionally turn specific checks back off
```

Reading this config: lint with families E/W/F/I/UP/B, allow lines up to 100 characters, target Python 3.11. The `select` list is additive (turn families *on*); `ignore` subtracts specific rules. This single `[tool.ruff.lint]` table replaces several separate tool configs.

## Running ruff

```bash title=run-ruff.sh
ruff check .              # lint everything (like ShellCheck for shell, Module 3.8)
ruff check . --fix       # auto-fix what it safely can (e.g. sort imports, remove unused)
ruff format .            # format code (the "black" replacement)
```

`ruff check` exits non-zero if it finds problems (Module 2.5), so — just like ShellCheck (Module 3.8) and `tsc --noEmit` (Module 7.3) — it slots straight into CI as a gate.

> [!TIP]
> Notice the *pattern* repeating across every language: a **linter** for correctness + a **formatter** for style, configured declaratively and run in CI. Shell has ShellCheck + shfmt (Module 3.8); TypeScript has tsc + ESLint/Prettier (Module 7); Python has ruff (which does both). The names change; the discipline — *let machines check the mechanical stuff* — is identical. Recognizing this pattern means you can set up quality tooling in any language.

## Why config-in-pyproject.toml is better

Before `[tool.*]`, each tool had its own file: `.flake8`, `.isort.cfg`, `pyproject.toml` for black, `mypy.ini`... A new contributor had to find and understand all of them. Now:

- **One file** holds all tool config — easy to find, review, and keep consistent.
- **Namespaced** under `[tool.<name>]`, so tools never collide.
- **Versioned and shared** with the project, so everyone's tools behave identically (reproducibility, Module 1.3 — your `ruff` and your teammate's `ruff` use the same rules).

> [!DOGFOOD]
> This repo's `pyproject.toml` configures ruff exactly as shown above — `[tool.ruff]` sets `line-length = 100`, and `[tool.ruff.lint]` selects the `E, W, F, I, UP, B` families. The `Makefile` (Module 11) has a `lint` target that runs `ruff check .`, and CI runs it on every push (Module 15). Open the file to see it.

## Cargo.toml: TOML in the Rust world

Rust's project manifest, `Cargo.toml`, is another TOML file you'll likely encounter (many fast dev tools — including ruff and `uv` — are written in Rust). It mirrors `pyproject.toml`/`package.json` conceptually:

```toml title=Cargo.toml
[package]
name = "my-tool"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = "1.0"              # a dependency with a version (^1.0, by Cargo's rules)
clap = { version = "4", features = ["derive"] }   # dependency with options

[dev-dependencies]
criterion = "0.5"         # dev-only (benchmarks/tests) — like devDependencies
```

You can see the now-familiar shape: a `[package]` identity table, `[dependencies]` (runtime), and `[dev-dependencies]` (dev-only) — the same concepts as `package.json` (Module 8.2) and `pyproject.toml` (Module 10.2), expressed in TOML. And Rust commits a `Cargo.lock` lockfile (Module 8.4), exactly like the others.

> [!NOTE]
> Once you've seen `package.json`, `pyproject.toml`, and `Cargo.toml`, the universal pattern is unmistakable: **a manifest declaring identity + dependencies (runtime and dev) + tool config, paired with a lockfile.** Every modern ecosystem has this. Learn the *pattern* and each new ecosystem's manifest takes minutes to understand. That transferable recognition is worth more than memorizing any one file.

## Reading tool config in the wild

When you open an unfamiliar project and see `[tool.something]` in `pyproject.toml`, you now know exactly what it is: configuration for the `something` tool. Want to know what the project lints with? Look for `[tool.ruff]`. Tests? `[tool.pytest.ini_options]`. Types? `[tool.mypy]`. The config tells you the project's whole quality toolchain at a glance — self-documenting, like `package.json`'s `scripts` (Module 8.2).

> [!TRY]
> In this repo, run `ruff check .` (install it with `pip install ruff` or `uv tool install ruff` first). It reads `[tool.ruff]` from `pyproject.toml` automatically. Try changing `line-length = 100` to `line-length = 60` and re-run — watch new line-length warnings appear, configured entirely from the TOML file.

> [!KEY]
> - **ruff** is the fast, modern Python linter+formatter replacing flake8/isort/black/pyupgrade, configured under **`[tool.ruff]`** in `pyproject.toml`.
> - `select` turns on **check families** (E/W/F/I/UP/B); `ignore` subtracts specific rules; `ruff check`/`--fix`/`format` run it (non-zero exit → CI gate).
> - The repeating pattern across languages: **a linter + a formatter, configured declaratively, run in CI** (ShellCheck, tsc/ESLint, ruff).
> - Putting all tool config in **one namespaced file** (`[tool.*]`) makes it findable, reviewable, and consistent across the team.
> - **`Cargo.toml`** shows the same universal shape — identity + dependencies + dev-dependencies + lockfile — confirming the pattern across every ecosystem.
