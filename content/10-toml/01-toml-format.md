# TOML the Format and Where It's Used

TOML is the config format you'll meet in modern Python (`pyproject.toml`), Rust (`Cargo.toml`), and many tools' config files. It was designed specifically for *human-edited configuration* — fixing JSON's biggest config weaknesses (no comments, fussy syntax). Let's learn to read and write it.

## Why TOML exists

Recall JSON's limitations for config (Module 8.1): no comments, strict commas, everything-quoted. YAML (Module 15) added comments but brought its own pitfalls (significant whitespace, surprising type coercion). **TOML** (Tom's Obvious Minimal Language) aims for a sweet spot: obvious, minimal, comment-friendly, and unambiguous.

> The design goal: a config file that's *easy for humans to read and write*, and *maps cleanly to a dictionary/hash table* for programs.

## The basics

TOML is `key = value`, grouped into `[sections]`:

```toml title=example.toml
# Comments start with # — finally! (JSON couldn't do this)

title = "My Project"          # strings use double quotes
version = "1.0.0"
port = 8080                    # numbers are unquoted
debug = true                  # booleans: true / false
tags = ["web", "tooling"]     # arrays
released = 2026-06-06          # dates are a NATIVE type (JSON has none!)
```

Already you can see the wins over JSON: comments, no trailing-comma anxiety, unquoted keys, and even native dates. It reads like an `.ini` file but with real types.

## Tables (sections)

The headline feature is `[table]` headers, which group related keys into nested structures:

```toml title=tables.toml
[server]
host = "localhost"
port = 8080

[database]
url = "postgres://localhost/app"
pool_size = 10
```

This maps to a nested structure — `server.host`, `server.port`, `database.url`. The equivalent JSON shows why TOML is nicer for humans:

```json title=equivalent.json
{
  "server": { "host": "localhost", "port": 8080 },
  "database": { "url": "postgres://localhost/app", "pool_size": 10 }
}
```

Same data, but TOML's flat `[section]` style is easier to scan and edit than nested braces — especially as config grows.

## Nested tables and dotted keys

```toml title=nested.toml
[tool.ruff]                   # dotted table name -> tool.ruff
line-length = 100

[tool.ruff.lint]              # deeper nesting
select = ["E", "F", "I"]

# Dotted keys (an alternative for shallow nesting):
database.host = "localhost"
database.port = 5432
```

The `[tool.ruff]` syntax (a dotted header) creates nested tables — `tool` → `ruff` → settings. This is exactly the pattern `pyproject.toml` uses to give each tool its own config section (Module 10.3).

## Arrays of tables

For a *list* of structured items, TOML uses `[[double brackets]]`:

```toml title=array-of-tables.toml
[[plugins]]
name = "auth"
enabled = true

[[plugins]]
name = "logging"
enabled = false
```

This makes `plugins` an *array* of two table objects — equivalent to JSON's `"plugins": [{...}, {...}]`. The `[[ ]]` double-bracket syntax is the one piece of TOML that surprises newcomers, so remember: single `[ ]` = a table, double `[[ ]]` = an item appended to an array of tables.

## TOML vs JSON vs YAML

A practical comparison of the three config formats:

| Feature | JSON | YAML | TOML |
| --- | --- | --- | --- |
| Comments | ❌ | ✅ | ✅ |
| Trailing-comma safe | ❌ | ✅ | ✅ |
| Native dates | ❌ | ✅ | ✅ |
| Whitespace-significant | no | **yes** (error-prone) | no |
| Surprising type coercion | no | **yes** (the "Norway problem", Module 15) | no |
| Best for | data exchange | CI/CD, k8s | human config |

TOML's pitch: the readability of YAML *without* YAML's whitespace and type-coercion footguns, and with comments unlike JSON. That's why the Python and Rust communities adopted it for project config.

> [!NOTE]
> No format is "best" universally (Module 8.1). JSON wins for machine data exchange (universal, unambiguous). YAML dominates CI/CD and Kubernetes (Module 15) by convention. TOML wins for *human-edited project config*. Use the format the surrounding ecosystem expects — `pyproject.toml` for Python, `*.yml` for GitHub Actions — rather than fighting convention.

## Where you'll meet TOML

- **`pyproject.toml`** — the standard Python project file (Module 10.2). Dependencies, metadata, and tool config.
- **`Cargo.toml`** — Rust's project manifest.
- **Tool config** — `ruff`, many formatters and linters read TOML (Module 10.3).
- **App config** — lots of CLIs and apps use TOML for user-editable settings.

> [!DOGFOOD]
> This repo's `pyproject.toml` (open it) uses all of this: a `[project]` table for metadata, `[dependency-groups]` for dev dependencies, and `[tool.ruff]` / `[tool.ruff.lint]` nested tables to configure the linter — with comments throughout explaining each setting. It's TOML doing exactly what it's good at.

> [!TRY]
> Open this repo's `pyproject.toml`. Identify a `[table]`, a nested `[tool.ruff]` table, a string value, an array, and a comment. Then mentally translate the `[tool.ruff]` section into the equivalent JSON — notice how much more nesting JSON needs.

> [!KEY]
> - **TOML** is built for **human-edited config**: `key = value`, `[tables]` for grouping, with comments, native dates, and no whitespace/coercion traps.
> - `[table]` headers create nested structures; **`[tool.ruff]`** (dotted) nests deeper; **`[[array]]`** (double brackets) makes a list of tables.
> - It maps cleanly to a dictionary, like JSON, but is far easier to read and edit at scale.
> - Vs others: JSON for **data exchange**, YAML for **CI/CD** (with footguns), TOML for **human config** — use what the ecosystem expects.
> - You'll meet it as **`pyproject.toml`**, `Cargo.toml`, and tool config (`ruff`).
