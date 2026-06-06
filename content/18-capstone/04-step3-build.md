# Step 3 — A .mjs/.ts Build Script and a .py Generator

Now the *work*: the scripts that turn Linkboard's data and source into the finished site. We build three, each in the language that fits it best (Module 6.5): a `.ts` asset hasher, a `.py` page generator, and the glue that runs them. This is "read, transform, write" (Module 0.4) applied across three languages.

## The build, in pieces

Linkboard's build has two distinct jobs, so we use two scripts (composition over a monolith, Module 17.1):

1. **`build-assets.ts`** — hash the CSS/JS for cache-busting (Module 7.4).
2. **`generate-pages.py`** — turn saved links (from the database) into static HTML (Module 6).

Each does one thing; the Makefile (Step 6) composes them into `make build`.

## build-assets.ts: cache-busting in TypeScript

This is essentially the course's `build-assets.ts` (Module 7.4), adapted. It hashes each asset's contents into its filename so browsers always fetch fresh files (Module 7.4):

```typescript title=scripts/build-assets.ts
#!/usr/bin/env node
import { readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { createHash } from 'node:crypto';

interface BuildOptions { src: string; out: string; }     // typed contract (Module 7.3)
type AssetManifest = Record<string, string>;

function hashContents(buf: Buffer): string {              // pure helper (Module 1.5)
  return createHash('sha256').update(buf).digest('hex').slice(0, 8);
}

async function build({ src, out }: BuildOptions): Promise<void> {
  await rm(out, { recursive: true, force: true });        // idempotent (Module 1.4)
  await mkdir(out, { recursive: true });
  const manifest: AssetManifest = {};
  for (const entry of await readdir(src, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const bytes = await readFile(join(src, entry.name));   // Buffer (no encoding — Module 5.3)
    const hashed = `${basename(entry.name, extname(entry.name))}.${hashContents(bytes)}${extname(entry.name)}`;
    await writeFile(join(out, hashed), bytes);
    manifest[entry.name] = hashed;
  }
  await writeFile(join(out, 'asset-manifest.json'), JSON.stringify(manifest, null, 2));
}

await build({ src: 'assets', out: 'dist/assets' });        // top-level await (Module 5.5)
```

It runs directly with `node scripts/build-assets.ts` (native type-stripping, Module 7.2) and type-checks with `tsc --noEmit` (Module 7.3). Types document the data (`BuildOptions`, `AssetManifest`, Module 7.1); the hashing is pure and deterministic (Module 1.4). *Why TypeScript here?* The asset manifest is structured data that benefits from typing (Module 6.5).

## generate-pages.py: the page generator in Python

Linkboard reads its links from the database and renders HTML. This mirrors the course's `generate-pages.py` (Module 6.4), reading from SQLite instead of Markdown files:

```python title=tools/generate-pages.py
#!/usr/bin/env python3
"""Generate Linkboard's static HTML from the links database."""
import argparse, html, sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # repo root (Module 6.2)

def render(links: list[sqlite3.Row]) -> str:
    items = "\n".join(
        f'  <li><a href="{html.escape(l["url"])}">{html.escape(l["title"])}</a></li>'
        for l in links                                  # escape output (Module 5.7)
    )
    return f"<!DOCTYPE html><html><body><h1>Linkboard</h1><ul>\n{items}\n</ul></body></html>\n"

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)   # auto help (Module 4.4)
    parser.add_argument("--db", default="linkboard.db")
    parser.add_argument("--out", default="site")
    args = parser.parse_args()

    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    links = conn.execute("SELECT url, title FROM links ORDER BY created_at DESC").fetchall()
    conn.close()

    out_dir = ROOT / args.out
    out_dir.mkdir(parents=True, exist_ok=True)          # idempotent (Module 6.2)
    (out_dir / "index.html").write_text(render(links), encoding="utf-8")  # explicit encoding (Module 6.2)
    print(f"Generated {len(links)} links -> {args.out}/index.html")        # summary (Module 17.2)
    return 0

if __name__ == "__main__":                              # __main__ idiom (Module 6.1)
    raise SystemExit(main())                             # exit code from main (Module 6.1)
```

It uses `pathlib` (Module 6.2), `argparse` with auto-help (Module 4.4), the `__main__` idiom returning an exit code (Module 6.1), HTML-escaping for safety (Module 5.7), explicit `encoding="utf-8"` (Module 6.2), and idempotent output (Module 6.2). *Why Python here?* It's a clean fit for reading rows and producing text, and demonstrates the polyglot mix (Module 6.5) — but you could equally write it in Node (Module 5.7). The point is *choosing per task*.

## Why three scripts, three languages?

This is Module 6.5's "choose the right language" made concrete:

- **`build-assets.ts`** in TypeScript — structured manifest data benefits from types.
- **`generate-pages.py`** in Python — comfortable text/data generation.
- **`bootstrap.sh`** (Step 2) in bash — pure orchestration/glue.

Each task uses the language that fits, and the Makefile (Step 6) unifies them behind one interface (Module 11.1) — so a user runs `make build` without caring that it's two languages underneath. That's the polyglot-but-unified pattern (Module 6.5, 17.1).

> [!NOTE]
> You could write *all three* in one language — that's a valid choice too (consistency has value, Module 6.5). The capstone uses three to *demonstrate* the polyglot pattern and reinforce that the architecture (read → transform → write, composed behind a task runner) is language-independent (Module 6.4). In a real project, weigh "right tool per task" against "one toolchain to maintain." Either way, the Makefile hides the difference.

> [!DOGFOOD]
> Linkboard's build scripts are adaptations of the course's own: `build-assets.ts` is nearly identical to `examples/typescript/build-assets.ts` (Module 7.4), and `generate-pages.py` follows `tools/generate-pages.py` (Module 6.4), just reading from SQLite instead of Markdown. Open those as your starting templates — adapt rather than write from scratch.

> [!TRY]
> Adapt the course's `build-assets.ts` and `generate-pages.py` for Linkboard. Run `node scripts/build-assets.ts` (hashes assets) and `python3 tools/generate-pages.py` (you'll need the database from Step 4 first, or point it at a test DB). Then `npx tsc --noEmit` to type-check the `.ts`. You've built the transform layer in two languages.

> [!KEY]
> - Linkboard's build is **two focused scripts** (composition, not a monolith — Module 17.1): `build-assets.ts` (cache-busting, Module 7.4) and `generate-pages.py` (links → HTML, Module 6).
> - **`build-assets.ts`** uses types (Module 7.1/7.3), runs directly (Module 7.2), is pure/idempotent/deterministic (Modules 1.4, 1.5).
> - **`generate-pages.py`** uses `pathlib`/`argparse`/`__main__` (Modules 6.1/6.2/4.4), escapes output (Module 5.7), and reads links from SQLite.
> - The **polyglot mix** (bash glue + TS + Python) demonstrates "right language per task" (Module 6.5) — unified behind one `make build` (Module 11.1).
> - Adapt the course's own build scripts as **templates**; the architecture (read → transform → write) is language-independent (Module 6.4).
