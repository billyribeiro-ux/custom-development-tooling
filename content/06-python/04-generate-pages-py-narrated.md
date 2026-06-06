# Worked Example: generate-pages.py Narrated

Here's something special: this course has *two* generators that do the same job — the Node `generate-pages.mjs` (Module 5.7) and a Python `generate-pages.py`. Reading the Python one teaches Python tooling *and* lets you compare two ecosystems solving an identical problem, line by line. That comparison is one of the most instructive things in the whole course.

> [!DOGFOOD]
> `tools/generate-pages.py` is a real, runnable parallel build. Run `python3 tools/generate-pages.py --out site-py` and you'll get the same site the Node version produces, built by Python. It uses **only the standard library** — no venv, no pip install needed.

## Why two generators?

To make a point you can *see*: "one job, two languages" is ordinary. The Node version is the primary build; the Python version proves the architecture isn't tied to a language. Where the Node version uses `marked` for Markdown, the Python version includes a small hand-written Markdown renderer (a teaching subset) — itself a nice example of building a focused tool.

## Imports and constants

```python title=generate-pages.py
from __future__ import annotations
import argparse, html, json, re, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
```

All standard library (Module 6.2): `argparse` (CLI), `html` (escaping), `json` (the manifest), `re` (regex for the Markdown parser), `shutil` (copying the assets tree), and `pathlib`. `Path(__file__).resolve().parent.parent` is the Python equivalent of the Node generator's `__dirname`/`ROOT` computation — the repo root, two levels up from this file. Computing paths relative to the *script* (not the working directory) keeps the build location-independent.

## The same data, mapped to Python

```python title=generate-pages.py
MONACO_LANG = { "sh": "shell", "js": "javascript", "ts": "typescript", ... }
CALLOUTS = { "NOTE": ("Note", "note"), "DOGFOOD": ("Dogfooding", "dogfood"), ... }
```

These are direct ports of the Node generator's lookup tables — a Python `dict` where the `.mjs` version used an object literal. Same data, same purpose (map fence languages to Monaco language ids; map callout markers to labels and CSS classes). Seeing the two side by side shows how *little* changes between ecosystems at the data level.

## Inline Markdown rendering

```python title=generate-pages.py
def render_inline(text: str) -> str:
    placeholders: list[str] = []
    def stash_code(m): placeholders.append(f"<code>{html.escape(m.group(1))}</code>"); ...
    text = re.sub(r"`([^`]+)`", stash_code, text)   # protect `code` spans first
    text = html.escape(text)                          # escape the rest
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', text)  # links
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)          # bold
    ...
```

This renders inline Markdown (code spans, links, bold, italic) with regular expressions. Note the careful *ordering*: it stashes inline-code spans first, then HTML-escapes everything (so a `<` in prose becomes `&lt;`, just like the Node generator's `escapeHtml`, Module 5.7), then restores the code. Order matters because escaping after extracting code prevents double-escaping. This is the kind of sequencing detail that separates a working text transformer from a buggy one.

## Block rendering: a tiny parser

```python title=generate-pages.py
def render_markdown(md: str) -> str:
    lines = md.split("\n")
    out, i, n = [], 0, len(lines)
    while i < n:
        line = lines[i]
        fence = re.match(r"^```(.*)$", line)
        if fence:
            # gather lines until the closing ```, then render a Monaco block
        elif line.startswith(">"):
            # gather the blockquote; if it starts with [!TYPE], make a callout
        elif re.match(r"^(#{1,6})\s+", line):
            # heading with an id slug
        # ...lists, horizontal rules, paragraphs...
```

This is a **block-level Markdown parser** written from scratch — a `while` loop that walks the lines and dispatches on what each block looks like (a fence, a blockquote, a heading, a list, a paragraph). It's a deliberately *simple* parser covering the subset this course uses, and it's a great study in how parsers work: read a token, decide what it is, consume its lines, emit HTML, repeat.

> [!NOTE]
> This is the one real difference from the Node version: Node *delegates* Markdown parsing to the `marked` library (Module 5.7's "extend a parser, don't write one"), while the Python version *writes its own* subset. Both are valid engineering choices: use a library when a great one exists; write your own when you want zero dependencies and full control. Seeing both teaches you the trade-off concretely.

## The Monaco block: identical output

```python title=generate-pages.py
def render_code(code: str, infostring: str) -> str:
    parts = infostring.strip().split()
    lang_key = (parts[0] if parts else "text").lower()
    lang = MONACO_LANG.get(lang_key, "plaintext")
    title_match = re.search(r"title=(\S+)", infostring)
    filename = title_match.group(1) if title_match else ""
    escaped = html.escape(code)
    return f"""<figure class="monaco-block" data-lang="{lang}" ...>..."""
```

Compare this to the Node `code` renderer (Module 5.7) — it produces *byte-for-byte the same HTML structure*: a `<figure class="monaco-block">` with the language, filename pill, and the escaped code in a `<textarea>`. That's why the same `app.js` and `styles.css` work for both builds. The output contract is shared; only the language producing it differs.

## Templating and the main flow

```python title=generate-pages.py
def fill(template: str, mapping: dict) -> str:
    return re.sub(r"{{\s*(\w+)\s*}}", lambda m: str(mapping.get(m.group(1), "")), template)
```

`fill` is the Python twin of the Node `fill` (Module 5.7) — replace `{{placeholder}}` tokens using a function (so `$` in content is safe). Same idea, Python syntax.

```python title=generate-pages.py
def main() -> None:
    parser = argparse.ArgumentParser(description="Build the course site (Python port).")
    parser.add_argument("--out", default="site-py")
    args = parser.parse_args()

    course = json.loads((ROOT / "course.json").read_text())
    # flatten lessons, compute prev/next (same algorithm as buildLessonGraph)
    # clean out_dir, copy assets with shutil.copytree
    # render each lesson, then the index
```

`main` mirrors the Node `main`: read the manifest, flatten lessons and wire prev/next (the same single-source-of-truth navigation logic from Module 0.4 and 5.7), clean the output directory, copy assets, render every page. `argparse` gives the `--out` flag and auto-help (Module 4.4) — note the Python version got help text *for free*, while the Node version hand-wrote it.

## The comparison, distilled

| Aspect | Node `generate-pages.mjs` | Python `generate-pages.py` |
| --- | --- | --- |
| CLI parsing | `util.parseArgs` (hand-write help) | `argparse` (auto help) |
| Paths | `node:path` + `__dirname` fix | `pathlib.Path` |
| File I/O | `fs/promises` (async) | `Path.read_text` (sync) |
| Markdown | `marked` (a dependency) | hand-written subset (zero deps) |
| Templating | regex `fill` | regex `fill` (identical idea) |
| Output | **identical HTML** | **identical HTML** |

The architecture — manifest → flatten → render → write — is *the same in both*. The differences are surface syntax and library choices. That's the deep lesson: **good design transcends language.** Once you understand the shape of a static-site generator, you can build it in whatever language a job calls for.

> [!TRY]
> Run both generators: `node tools/generate-pages.mjs` (into `site/`) and `python3 tools/generate-pages.py --out site-py`. Open a lesson from each in your browser. They look the same — built by two different languages from the same source. Then `diff` a page from each to see how close the output really is.

> [!KEY]
> - This course ships **two generators** (Node and Python) doing the same job — proving the architecture is language-independent.
> - The Python version uses **only the standard library** (`argparse`, `pathlib`, `html`, `json`, `re`, `shutil`) — no venv needed.
> - It **writes its own Markdown subset** (zero deps) where Node **uses `marked`** — a concrete look at the "library vs build-your-own" trade-off.
> - Both produce **identical HTML**, so they share `app.js`/`styles.css` — the output contract is what matters.
> - **Good design transcends language**: same architecture, different syntax. Learn the shape, build it anywhere.
