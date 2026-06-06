# Reading and Writing Files and Walking Directories

Most tooling is, at heart, *moving and transforming files*: read some inputs, do something, write some outputs (remember "read, transform, write" from Module 0). This lesson covers the file operations you'll use constantly, plus the patterns that keep them safe and correct.

## Read and write text

```javascript title=read-write.mjs
import { readFile, writeFile } from 'node:fs/promises';

// Read — ALWAYS pass an encoding ('utf8') to get a string back
const text = await readFile('input.md', 'utf8');

// ...transform...
const upper = text.toUpperCase();

// Write — creates or overwrites the file
await writeFile('output.md', upper, 'utf8');
```

> [!GOTCHA]
> If you call `readFile('x.txt')` *without* an encoding, you get a raw `Buffer` (bytes), not a string — and then `text.split('\n')` fails confusingly. For text files, always pass `'utf8'`. (Omitting the encoding is correct only when you genuinely want binary bytes, e.g. copying an image.)

## Working with JSON

JSON is the most common config/data format in tooling. The pattern is read → parse → use, and build → stringify → write:

```javascript title=json-io.mjs
import { readFile, writeFile } from 'node:fs/promises';

// Read and parse
const config = JSON.parse(await readFile('config.json', 'utf8'));
console.log(config.name);

// Modify and write back, pretty-printed (the `2` = 2-space indentation)
config.updated = true;
await writeFile('config.json', JSON.stringify(config, null, 2) + '\n');
```

> [!TIP]
> `JSON.stringify(obj, null, 2)` pretty-prints with 2-space indentation — essential for files humans will read or diff. And append a trailing `'\n'`: most tools and editors expect files to end with a newline (it keeps git diffs clean). Small touches, professional output.

## Checking existence (the right way)

A common need: "does this file exist?" The clean approach uses `access`:

```javascript title=exists.mjs
import { access } from 'node:fs/promises';

async function exists(path) {
  try {
    await access(path);     // throws if the path doesn't exist
    return true;
  } catch {
    return false;
  }
}
```

> [!WARNING]
> Beware the "check then act" race condition: `if (await exists(f)) { await readFile(f); }` — the file could vanish between the check and the read. For most tooling this is harmless, but the more robust pattern is often to *just try the operation* and handle the error (e.g. `ENOENT`) if it fails. Check-then-act is fine for "should I create this?"; try-then-catch is better for "read this if it's there."

```javascript title=try-then-catch.mjs
import { readFile } from 'node:fs/promises';

let config = {};
try {
  config = JSON.parse(await readFile('config.json', 'utf8'));
} catch (err) {
  if (err.code !== 'ENOENT') throw err;   // ENOENT = "no such file"; ignore that, rethrow others
  // file is optional — fall back to defaults
}
```

That `err.code` check is a key Node idiom: filesystem errors carry a `code` (`ENOENT`, `EACCES`, `EEXIST`...) so you can handle specific cases precisely.

## Directories: create, list, delete

```javascript title=directories.mjs
import { mkdir, readdir, rm, cp } from 'node:fs/promises';

await mkdir('dist/assets', { recursive: true });   // create nested dirs (idempotent)
const names = await readdir('src');                  // ['a.js', 'b.js', 'sub']
await rm('dist', { recursive: true, force: true });  // delete a tree (idempotent)
await cp('public', 'dist', { recursive: true });     // copy a tree
```

To know whether each entry is a file or a directory, pass `withFileTypes`:

```javascript title=dirents.mjs
import { readdir } from 'node:fs/promises';

const entries = await readdir('src', { withFileTypes: true });
for (const entry of entries) {
  if (entry.isDirectory()) console.log('dir: ', entry.name);
  else if (entry.isFile())  console.log('file:', entry.name);
}
```

## Walking a directory tree recursively

A frequent tooling task: process every file under a folder. Two modern approaches:

```javascript title=walk-recursive.mjs
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

// Option A: readdir with { recursive: true } (Node 20+) — simplest
const allPaths = await readdir('content', { recursive: true });
// returns paths relative to 'content', at every depth

// Option B: a hand-written recursive walk (full control, e.g. to filter)
async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));   // recurse
    else out.push(full);
  }
  return out;
}

const files = await walk('content');
const markdown = files.filter((f) => f.endsWith('.md'));
```

> [!DOGFOOD]
> The course's `build-assets.ts` (Module 7) uses `readdir('assets', { withFileTypes: true })` to list and copy assets, and the Python generator walks the `content/` tree. The generator doesn't even need to walk recursively — it reads each lesson's exact path from the manifest, which is simpler and more deterministic than scanning. *Reading from a manifest beats scanning the filesystem when you can.*

## A complete read-transform-write example

The skeleton of countless tools:

```javascript title=transform-files.mjs
#!/usr/bin/env node
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const SRC = 'content';
const OUT = 'dist';

await mkdir(OUT, { recursive: true });

for (const name of await readdir(SRC)) {
  if (!name.endsWith('.txt')) continue;           // filter inputs
  const text = await readFile(join(SRC, name), 'utf8');   // READ
  const transformed = text.trim().toUpperCase();          // TRANSFORM
  await writeFile(join(OUT, name), transformed + '\n');   // WRITE
  console.log(`processed ${name}`);
}
```

This is the same shape as the site generator, just simpler: list inputs, read each, transform, write to an output directory. Master this loop and you can build most file-based tooling.

> [!TRY]
> Write a script that reads every `.md` file in a folder and prints each filename plus its line count (`text.split('\n').length`). You'll practice `readdir`, filtering, `readFile`, and a transform — the core file-tooling skills.

> [!KEY]
> - Tooling is mostly **read → transform → write** files; `node:fs/promises` is your toolkit.
> - **Always pass `'utf8'`** to `readFile` for text, or you'll get raw bytes.
> - For JSON: `JSON.parse(await readFile(...))` and `JSON.stringify(obj, null, 2) + '\n'` (pretty + trailing newline).
> - Prefer **try-then-catch** (checking `err.code === 'ENOENT'`) over check-then-act to avoid races.
> - Make dir ops **idempotent** (`{ recursive: true }`); walk trees with `readdir({ recursive: true })` or a recursive function — but **reading a manifest beats scanning** when you can.
