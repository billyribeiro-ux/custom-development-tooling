# ESM vs CommonJS: .mjs, .cjs, and type:module

Node.js has *two* module systems, and the confusion between them causes a huge amount of beginner pain — mysterious `require is not defined` and `Cannot use import statement outside a module` errors. This lesson clears it up permanently so you can write `.mjs` tooling with confidence.

## Two module systems, one runtime

A "module system" is how files share code — how one file *exports* things and another *imports* them. Node supports two:

- **CommonJS (CJS)** — the original Node system. Uses `require()` and `module.exports`.
- **ES Modules (ESM)** — the modern, standardized JavaScript system (the same one browsers use). Uses `import` and `export`.

```javascript title=commonjs.cjs
// CommonJS — the OLD way
const fs = require('node:fs');
module.exports = { greet };
```

```javascript title=esm.mjs
// ES Modules — the MODERN way (what we use)
import fs from 'node:fs';
export { greet };
```

ESM is the standard going forward and what you should write for new tooling. CJS is still everywhere in existing code, so you need to *recognize* it.

## How Node decides which system a file uses

This is the crux. Node picks the module system per file based on **three signals**, in order:

1. **The file extension:**
   - `.mjs` → always **ESM**
   - `.cjs` → always **CommonJS**
   - `.js` → *depends on the nearest `package.json`* (next signal)
2. **The nearest `package.json`'s `"type"` field:**
   - `"type": "module"` → `.js` files are **ESM**
   - `"type": "commonjs"` or absent → `.js` files are **CommonJS** (the legacy default)

```json title=package.json
{
  "type": "module"
}
```

> [!TIP]
> The simplest rule for tooling: **name your scripts `.mjs`** and you never have to think about it — `.mjs` is *always* ESM regardless of any `package.json`. That's exactly why this course's tooling files are `.mjs`. The extension is unambiguous and self-documenting.

> [!DOGFOOD]
> This repo's `package.json` has `"type": "module"`, *and* the generator is named `generate-pages.mjs`. Belt and suspenders: the `.mjs` extension guarantees ESM, and `"type": "module"` makes plain `.js` files ESM too. Open `package.json` to see it.

## The key differences

```javascript title=esm-features.mjs
// 1. import/export instead of require/module.exports
import { readFile } from 'node:fs/promises';
export function build() {}

// 2. Built-in modules use the "node:" prefix (explicit and unambiguous)
import path from 'node:path';

// 3. __dirname and __filename DON'T EXIST in ESM — reconstruct them:
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));

// 4. Top-level await works! No need to wrap everything in an async function:
const data = await readFile('config.json', 'utf8');
```

> [!GOTCHA]
> The two that bite everyone moving to ESM:
> 1. **`__dirname` and `__filename` are gone.** In CJS they were magic globals; in ESM you reconstruct them from `import.meta.url` (line 3 above). Memorize that snippet — you'll use it in nearly every script.
> 2. **`require()` doesn't exist in ESM.** Use `import`. If you must load CJS-only code, use a dynamic `import()` or `module.createRequire`.

## The "node:" prefix

Modern Node code prefixes built-in modules with `node:` — `import fs from 'node:fs'` instead of `'fs'`. This makes it unmistakable that you mean Node's built-in, not some npm package named `fs`. It's a small clarity-and-security win (it can't be shadowed by a malicious package). Use it everywhere.

## Top-level await: a tooling superpower

In CJS, you couldn't `await` at the top level of a file — you had to wrap async code in an `async function` and call it. ESM allows **top-level await**, which makes scripts read top-to-bottom like a recipe:

```javascript title=top-level-await.mjs
import { readFile, writeFile } from 'node:fs/promises';

const config = JSON.parse(await readFile('config.json', 'utf8'));   // just await, right here
const result = await processData(config);
await writeFile('output.json', JSON.stringify(result));
console.log('done');
```

This is wonderful for tooling, where scripts are mostly "do this async thing, then that one." No boilerplate wrapper function.

## Recognizing which you're looking at

When you open an unfamiliar Node file, identify the module system instantly:

- See `require(` / `module.exports`? → **CommonJS**.
- See `import` / `export`? → **ESM**.
- `.mjs` extension? → ESM. `.cjs`? → CJS. `.js`? → check `package.json` `"type"`.

This lets you read any Node tooling in the wild without confusion.

> [!TRY]
> Create `test.mjs` containing just `console.log(import.meta.url)` and run `node test.mjs`. It prints a `file://` URL — proof you're in ESM (CJS has no `import.meta`). Then try the `__dirname` reconstruction snippet and `console.log(__dirname)`.

> [!KEY]
> - Node has **two module systems**: legacy **CommonJS** (`require`/`module.exports`) and modern **ESM** (`import`/`export`).
> - Module system is decided by **extension** (`.mjs`=ESM, `.cjs`=CJS) then **`package.json` `"type"`** for `.js`.
> - **Name tooling scripts `.mjs`** to guarantee ESM with zero ambiguity.
> - In ESM: use the **`node:` prefix**, reconstruct **`__dirname`** from `import.meta.url`, and enjoy **top-level await**.
> - Recognize the system at a glance to read any Node code in the wild.
