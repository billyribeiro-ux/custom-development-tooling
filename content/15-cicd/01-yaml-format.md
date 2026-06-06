# YAML the Format: Indentation, Anchors, Gotchas

Before we build CI/CD pipelines, we need to master the format they're written in: **YAML**. GitHub Actions, Docker Compose (Module 14.4), Kubernetes, and countless other tools use it. YAML is designed to be human-readable, but its flexibility hides some genuinely dangerous gotchas. Knowing them prevents hours of confusion.

## What YAML is

YAML ("YAML Ain't Markup Language") is a format for structured data — like JSON (Module 8.1), but optimized for *humans to read and write*. The same data:

```json title=data.json
{ "name": "ci", "on": ["push"], "jobs": { "build": { "runs-on": "ubuntu-latest" } } }
```

```yaml title=data.yaml
name: ci
on:
  - push
jobs:
  build:
    runs-on: ubuntu-latest
```

The YAML is more readable: no braces, no quotes everywhere, comments allowed. That readability is why config-heavy tools chose it. But the readability comes from *significant whitespace*, which is the source of most YAML pain.

## Indentation is structure (and it must be spaces)

In YAML, **indentation defines nesting** — like Python. Deeper indentation means "inside" the thing above it.

```yaml title=indentation.yaml
jobs:              # top level
  build:           # 2 spaces in -> inside jobs
    runs-on: ubuntu-latest   # 4 spaces in -> inside build
    steps:                    # also inside build
      - uses: actions/checkout@v4   # inside steps
```

> [!WARNING]
> **YAML forbids tabs for indentation — you must use spaces.** (The opposite of Makefiles, Module 11.3, which *demand* tabs! A cruel irony.) A tab where YAML expects spaces causes a parse error. Configure your editor to insert spaces in `.yml`/`.yaml` files. Inconsistent indentation is the #1 YAML error — and because whitespace is invisible, it's maddening to spot. Use a YAML linter (below) to catch it.

> [!GOTCHA]
> Wrong indentation often doesn't *error* — it silently produces the *wrong structure*. Indent a key one level too far and it becomes a child of the wrong parent, so your tool ignores it or misbehaves with no clear message. Always verify the structure, not just that it parses. This silent-misnesting is YAML's most insidious trap.

## The two collection types

```yaml title=collections.yaml
# A MAPPING (key: value pairs, like a JSON object):
server:
  host: localhost
  port: 8080

# A SEQUENCE (a list, with leading dashes):
fruits:
  - apple
  - banana
  - cherry

# A list of mappings (very common in CI steps):
steps:
  - name: Checkout
    uses: actions/checkout@v4
  - name: Build
    run: npm run build
```

- **Mappings** are `key: value` (note the space after the colon — required).
- **Sequences** are items prefixed with `- ` (dash space).
- They nest freely, and "a list of mappings" (each `- ` introducing a block of `key: value`) is *the* shape of CI steps (Module 15.3).

## The infamous type-coercion gotchas

YAML tries to be helpful by *guessing* the types of unquoted values — and sometimes guesses wrong, with surprising results:

```yaml title=coercion-traps.yaml
version: 1.20          # parsed as the NUMBER 1.2 (trailing zero lost!) — wanted "1.20"
enabled: yes           # parsed as the BOOLEAN true (yes/no/on/off are booleans!)
country: NO            # parsed as the BOOLEAN false — the famous "Norway problem"!
zip: 01234             # may be parsed as a number, losing the leading zero
time: 22:30            # may be parsed as a sexagesimal number (!)
```

> [!GOTCHA]
> **The "Norway Problem":** the country code `NO` (Norway) parses as the *boolean* `false`, because YAML treats `no`, `yes`, `on`, `off` as booleans. Similarly `version: 1.20` becomes `1.2` (a number, dropping the zero), and `01234` may lose its leading zero. **The fix: quote values that should stay strings** — `country: "NO"`, `version: "1.20"`, `zip: "01234"`. When a value *looks* like it could be a number, boolean, or date but should be text, *quote it*. This single habit avoids a whole category of baffling bugs.

## Multi-line strings

YAML has special syntax for multi-line text, common in CI for shell scripts:

```yaml title=multiline.yaml
# | (literal block) PRESERVES newlines — use for shell scripts:
run: |
  npm ci
  npm run build
  npm test

# > (folded block) JOINS lines into one (newlines become spaces):
description: >
  This is a long description
  that becomes a single line.
```

The `run: |` form is what you'll use constantly in CI to run multiple shell commands (Module 15.3). The `|` preserves each line as a separate command (it runs in one shell, unlike a Makefile's separate-shell-per-line, Module 11.2).

## Comments and anchors

```yaml title=comments-anchors.yaml
# Comments start with # (a big win over JSON, Module 8.1)

# Anchors (&) and aliases (*) let you reuse a block — DRY:
defaults: &defaults
  timeout: 30
  retries: 3

job-a:
  <<: *defaults        # merge in the anchored block
  name: A
job-b:
  <<: *defaults        # reuse it again
  name: B
```

Anchors (`&name`) and aliases (`*name`) avoid repetition. They're powerful but can hurt readability when overused — use them sparingly, for genuinely shared config.

## Validate your YAML

Because of all these gotchas, *don't eyeball* YAML — lint it:

```bash title=lint-yaml.sh
# yamllint catches indentation, type, and style issues:
yamllint .github/workflows/ci.yml

# Many tools also validate their OWN yaml against a schema:
#   GitHub validates workflow files; your editor (with the right extension) does too
```

> [!TIP]
> Use an editor extension that knows the *schema* of the file you're editing (GitHub Actions, Compose, Kubernetes). It autocompletes valid keys and flags typos and bad structure *as you type* — turning YAML's silent-misnesting trap into an instant red squiggle. This is the same "let the editor catch mechanical errors" value as TypeScript types (Module 7.1) and `defineConfig` (Module 12.3).

> [!DOGFOOD]
> This course's `.github/workflows/ci.yml` (Module 15.5) and `examples/docker/docker-compose.yml` (Module 14.4) are both YAML. Open them and notice: space indentation throughout, lists of mappings for steps/services, `run: |` blocks for multi-command scripts, and comments explaining each part. They're real YAML you've already partly seen.

> [!TRY]
> Write a tiny YAML file with `enabled: yes` and `country: NO`, then parse it (e.g. `python3 -c "import yaml,sys; print(yaml.safe_load(open('x.yaml')))"` if you have PyYAML). Watch `yes` become `True` and `NO` become `False`. Then quote them (`"yes"`, `"NO"`) and see them stay strings. You've experienced the Norway problem and its fix.

> [!KEY]
> - **YAML** is human-readable structured data (like JSON, but with comments and no braces) used by GitHub Actions, Compose, Kubernetes.
> - **Indentation defines structure and must be SPACES, never tabs** (opposite of Makefiles!) — wrong indentation often *silently misnests* rather than erroring.
> - Two collections: **mappings** (`key: value`) and **sequences** (`- item`); CI uses **lists of mappings** heavily.
> - **Type-coercion traps**: `NO`→false (Norway problem), `yes`→true, `1.20`→1.2, leading zeros lost. **Quote values meant to stay strings.**
> - Use **`run: |`** for multi-line scripts, comments and anchors for clarity/DRY, and **lint/schema-validate** YAML rather than eyeballing it.
