# Worked Example: build-assets.ts Narrated

Let's read a complete, typed TypeScript tooling script: `examples/typescript/build-assets.ts`. It implements **content-hashing** (a.k.a. cache-busting) for static assets — a real technique used by virtually every web build tool. You'll see types as guardrails (Module 7.1) on a genuine task, and run it with native type-stripping (Module 7.2).

> [!DOGFOOD]
> Run it: `node examples/typescript/build-assets.ts --src assets --out /tmp/dist`. No compile step — Node strips the types and runs it. Then `npx tsc --noEmit` type-checks it. Open the file alongside this lesson.

## The problem: cache-busting

Browsers *cache* files by their URL. If you ship `styles.css` and a user visits, their browser caches it. Next week you change `styles.css` — but the browser may keep serving the *old* cached copy, because the URL didn't change. Users see a broken, half-updated site.

The fix: put a **hash of the file's contents** in its filename — `styles.a1b2c3d4.css`. When the contents change, the hash changes, so the filename changes, so the URL changes, so the browser fetches the new file. When contents *don't* change, the name stays identical and caching still works. This is deterministic naming (Module 1.4) put to work.

## The header and how to run it

```typescript title=build-assets.ts
#!/usr/bin/env node
import { readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
```

All `node:` built-ins (Module 5.2): `fs/promises` for files, `path` for names, `crypto` for hashing, `util` for argument parsing. Zero npm dependencies — a TypeScript script that needs nothing but Node to run.

## Types as the contract

```typescript title=build-assets.ts
interface BuildOptions {
  src: string;
  out: string;
}

type AssetManifest = Record<string, string>;
```

Two type declarations document the whole script's data:

- **`BuildOptions`** — an `interface` (Module 7.3) describing the inputs: a source dir and an output dir. Any function taking `BuildOptions` is guaranteed to receive both as strings.
- **`AssetManifest`** — a `Record<string, string>`: a dictionary mapping original filenames to hashed ones. This is the output that lets your HTML look up "what's the real URL for `styles.css`?"

These types are *erased* at runtime (Module 7.1) — they exist purely to guard the code while you write it and to document intent for the next reader.

## Parsing options, with a typed return

```typescript title=build-assets.ts
function parseOptions(): BuildOptions {
  const { values } = parseArgs({
    options: {
      src: { type: 'string', default: 'assets' },
      out: { type: 'string', default: join('/tmp', 'dist') },
    },
  });
  return { src: values.src!, out: values.out! };
}
```

`parseArgs` (Module 4.3) gives `--src` and `--out` with defaults. The return type annotation `: BuildOptions` is a contract: this function *must* return an object with `src` and `out` strings, and `tsc` enforces it. The `!` (non-null assertion) tells TypeScript "I know these are defined" — safe here precisely *because* both options have defaults, so they can never be undefined. That's a deliberate, justified use of `!`.

## The hash helper — pure and typed

```typescript title=build-assets.ts
function hashContents(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex').slice(0, 8);
}
```

A **pure function** (Module 1.5): given the same bytes, it always returns the same 8-character hash (determinism, Module 1.4 — same input, same output). The signature `(buf: Buffer): string` documents exactly what goes in and out. `sha256` produces a long hash; we take the first 8 characters, which is plenty to detect changes while keeping filenames short. *Because it's deterministic, an unchanged file gets the same name on every build* — so caching keeps working.

## The build function

```typescript title=build-assets.ts
async function build({ src, out }: BuildOptions): Promise<void> {
  await rm(out, { recursive: true, force: true });   // clean output (idempotent)
  await mkdir(out, { recursive: true });

  const entries = await readdir(src, { withFileTypes: true });
  const manifest: AssetManifest = {};

  for (const entry of entries) {
    if (!entry.isFile()) continue;                    // skip subdirectories
    const contents = await readFile(join(src, entry.name));   // read bytes (no encoding = Buffer)
    const hash = hashContents(contents);
    const ext = extname(entry.name);                  // '.css'
    const stem = basename(entry.name, ext);           // 'styles'
    const hashedName = `${stem}.${hash}${ext}`;        // 'styles.a1b2c3d4.css'

    await writeFile(join(out, hashedName), contents);
    manifest[entry.name] = hashedName;                 // record original -> hashed
    console.log(`  ${entry.name}  ->  ${hashedName}`);
  }

  await writeFile(join(out, 'asset-manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Built ${Object.keys(manifest).length} asset(s) -> ${out}/`);
}
```

Reading it through the lens of the course:

- **Destructured, typed parameter** `{ src, out }: BuildOptions` — clean and contract-checked.
- **`Promise<void>`** return type — it does work (side effects) but returns no data; the type says so.
- **Idempotent output** — `rm` then `mkdir` with `{ recursive: true }` (Module 5.2) means every run starts clean and never errors on a second run (Module 1.4).
- **`readdir({ withFileTypes: true })`** (Module 5.3) so we can skip subdirectories with `entry.isFile()`.
- **Reading without an encoding** returns a `Buffer` (raw bytes) — *correct* here, because we hash the exact bytes and copy them verbatim (this is the one time you *don't* pass `'utf8'`, Module 5.3).
- **`path` helpers** `extname`/`basename` split the name safely (never string-slicing, Module 5.2), then we assemble the hashed name.
- **The manifest** records each mapping, written out as pretty-printed JSON (Module 5.3) so the HTML (or another build step) can resolve `styles.css` → `styles.a1b2c3d4.css`.

## Running it

```typescript title=build-assets.ts
await build(parseOptions());
```

Top-level await (Module 5.5) — parse the options, run the build. Because the whole thing is erasable TypeScript (Module 7.2), `node build-assets.ts` strips the types and runs it directly; no compile, no `.js` output.

## What this teaches

This ~60-line script shows typed tooling done right: small interfaces that document the data, a pure hashing helper, idempotent file operations, correct `Buffer` vs string handling, and a manifest output — all guarded by types you can check with `tsc --noEmit` and run instantly with `node`. It's also a *genuinely useful* technique: content-hashing is how real sites stay cacheable yet always up to date.

> [!TRY]
> Run `node examples/typescript/build-assets.ts --src assets --out /tmp/dist`, then `cat /tmp/dist/asset-manifest.json` to see the original→hashed mapping. Now change one byte in `assets/styles.css`, rebuild, and watch *only that file's* hash change — proof of content-addressed, deterministic naming. Finally run `npx tsc --noEmit` to type-check it.

> [!KEY]
> - **Content-hashing** (`styles.a1b2c3.css`) busts browser caches: the name changes only when contents change — deterministic naming (Module 1.4) in action.
> - The script uses **only `node:` built-ins** and runs **directly** (native type-stripping, Module 7.2).
> - **`interface BuildOptions`** and **`Record<string,string>` manifest** document and guard the data; `Promise<void>` says "effects, no return."
> - It reads bytes as a **`Buffer`** (the one case where you omit `'utf8'`), uses **`path` helpers** for names, and is **idempotent** (`rm`+`mkdir` recursive).
> - Run it with `node`, **check it with `tsc --noEmit`** — typed tooling you can iterate on fast and trust.
