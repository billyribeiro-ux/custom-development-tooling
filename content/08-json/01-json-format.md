# JSON the Format: Rules, Pitfalls, JSON5/JSONC

JSON is the lingua franca of configuration and data exchange. You'll read and write it constantly. It's deceptively simple — and its strictness causes a few classic, frustrating errors. Let's master the format, its sharp edges, and the variants that soften them.

## What JSON is

**JSON** (JavaScript Object Notation) is a text format for structured data. It has exactly six value types:

```json title=all-of-json.json
{
  "string": "text in double quotes",
  "number": 42,
  "boolean": true,
  "null": null,
  "array": [1, 2, 3],
  "object": { "nested": "value" }
}
```

That's the *entire* type system: strings, numbers, booleans, `null`, arrays, and objects. No dates, no comments, no functions — just data. Its simplicity is why it's everywhere: every language can read and write it.

## The strict rules that trip people up

JSON is *strict*, and the parser rejects anything that doesn't conform — often with an unhelpful "Unexpected token" error. The rules people forget:

```json title=common-errors.json
{
  "keys must be": "double-quoted",
  'single quotes': "are INVALID for keys or strings",
  "no trailing comma": "after the last item",
  "numbers": 42,
  "no comments": "allowed in strict JSON"
}
```

The four that cause 90% of JSON errors:

1. **Double quotes only.** `'single'` quotes are invalid. Both keys and string values need `"double quotes"`.
2. **No trailing commas.** `[1, 2, 3,]` ← that last comma is a syntax error. (This one bites *everyone*.)
3. **No comments.** `// like this` or `/* this */` are invalid in strict JSON.
4. **Keys must be quoted.** `{ name: "x" }` is invalid JSON (that's *JavaScript*); it must be `{ "name": "x" }`.

> [!GOTCHA]
> The **trailing comma** is the single most common JSON mistake. You add an item to a list, leave the old last item's comma, and the parser chokes with a cryptic error pointing at the *next* line. When a JSON file "won't parse," check for a trailing comma first — it's the usual culprit.

> [!WARNING]
> JSON looks like JavaScript object literals, but it is **not** the same. JS allows single quotes, trailing commas, comments, unquoted keys, and functions; JSON allows none of these. Don't assume "it's valid JS, so it's valid JSON." This mismatch is a frequent source of confusion when copying snippets.

## Numbers have limits

```json title=number-pitfalls.json
{
  "safe": 9007199254740991,
  "danger": 9007199254740993,
  "noNaN": "NaN and Infinity are NOT valid JSON"
}
```

JSON numbers are double-precision floats. Integers beyond `2^53` (about 9 quadrillion) lose precision — a real problem for large IDs (e.g. Twitter/X learned this the hard way). If you have huge integers, transmit them as *strings*. Also, `NaN`, `Infinity`, and `-Infinity` are *not* valid JSON, even though JavaScript has them.

## Validating and formatting JSON

Use tools to check and pretty-print JSON instead of eyeballing it:

```bash title=json-tools.sh
# Validate + pretty-print with jq (a fantastic JSON CLI tool):
jq . config.json                  # prints formatted; errors if invalid

# Or with Node:
node -e "JSON.parse(require('fs').readFileSync('config.json','utf8')); console.log('valid')"

# Pretty-print in place (2-space indent), the Node way:
node -e "const f='config.json'; const o=JSON.parse(require('fs').readFileSync(f)); require('fs').writeFileSync(f, JSON.stringify(o,null,2)+'\n')"
```

> [!TIP]
> Learn **`jq`** — it's the standard command-line tool for querying and transforming JSON. `jq '.scripts' package.json` extracts a field; `jq 'keys' x.json` lists keys. It's invaluable in shell scripts that need to read JSON (and far safer than `grep`-ing JSON, which we warned against in Module 6.5).

## JSONC and JSON5: JSON with comments

Strict JSON's lack of *comments* is genuinely painful for config files — you can't explain why a setting exists. Two relaxed variants fix this:

- **JSONC** ("JSON with Comments") — plain JSON plus `//` and `/* */` comments. Used by VS Code's settings, `tsconfig.json`, and many tools.
- **JSON5** — a bigger superset: comments, trailing commas, single quotes, unquoted keys, and more. More lenient, less universal.

```jsonc title=tsconfig.jsonc
{
  // Comments are allowed in JSONC! Great for explaining config.
  "compilerOptions": {
    "strict": true,   // trailing comment, fine in JSONC
  },
}
```

> [!NOTE]
> Here's the catch: **`JSON.parse` does NOT accept JSONC or JSON5** — they need a special parser. So a file *named* `.json` with comments will break `JSON.parse`. Tools like TypeScript and VS Code use their own lenient parsers for *their* config files (which is why `tsconfig.json` can have comments), but if *your* code reads a config with `JSON.parse`, it must be strict JSON. Know which parser will read your file. We use comments freely in this course's `tsconfig.json` precisely because TypeScript parses it leniently — but `course.json`, which our generator reads with `JSON.parse`, is strict.

## When to use JSON (and when not)

JSON is great for *data* and *machine-generated* config. But for *human-edited* config with lots of comments and logic, other formats are often better:

- **TOML** (Module 10) — designed for config; supports comments natively; used by `pyproject.toml`.
- **YAML** (Module 15) — common in CI/CD; supports comments; but has its own pitfalls.
- **Config-as-code** (`*.config.mjs`, Module 12) — when you need logic, not just data.

JSON's strictness is a *feature* for data interchange (unambiguous, universal) and a *limitation* for hand-edited config (no comments). Pick accordingly.

> [!TRY]
> Create a JSON file with a deliberate trailing comma and run `jq . file.json` (or `JSON.parse` via Node). Read the error message — note how it points near, but not exactly at, the problem. Fix the comma. You've now experienced and diagnosed the #1 JSON error.

> [!KEY]
> - JSON has exactly six types: string, number, boolean, null, array, object — just data, no comments/dates/functions.
> - The strict rules that bite: **double quotes only**, **no trailing commas**, **no comments**, **quoted keys**. JSON ≠ JavaScript object literals.
> - Numbers are floats — integers beyond `2^53` lose precision (send big IDs as strings); no `NaN`/`Infinity`.
> - **`JSON.parse` rejects JSONC/JSON5** — a `.json` with comments needs a lenient parser; know which parser reads your file.
> - Use **`jq`** to validate/query JSON; prefer TOML/YAML/config-as-code for heavily human-edited config.
