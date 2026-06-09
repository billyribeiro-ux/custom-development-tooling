# The node: Built-in Modules Tour

Node ships with a rich standard library — enough to build most tooling with *zero* npm packages. Knowing what's already in the box keeps your scripts dependency-free and reliable (Module 1's reproducibility, again). Here's a guided tour of the built-ins you'll actually use for tooling.

## Why built-ins matter for tooling

Every `import` from npm is a dependency to install, version, audit, and trust. Every `import` from `node:` is *already there* — it ships with Node, can't go out of sync, and has no supply-chain risk. For tooling, prefer built-ins; reach for npm only when the built-ins genuinely fall short.

## The essential modules

### node:fs — the filesystem

Reading and writing files and directories. Always prefer the **promises** version (`node:fs/promises`) for clean `async/await`:

```javascript title=fs-tour.mjs
import { readFile, writeFile, readdir, mkdir, rm, cp, stat } from 'node:fs/promises';

const text = await readFile('input.txt', 'utf8');   // read a file as text
await writeFile('out.txt', 'hello');                 // write a file
const entries = await readdir('src');                // list a directory
await mkdir('dist', { recursive: true });            // make dirs (like mkdir -p)
await rm('dist', { recursive: true, force: true });  // delete (like rm -rf)
await cp('assets', 'dist/assets', { recursive: true }); // copy a tree
```

> [!TIP]
> Note `{ recursive: true }` on `mkdir` (won't error if it exists) and `{ recursive: true, force: true }` on `rm` (won't error if absent). These make your file operations **idempotent** (Module 1.4) — safe to run repeatedly. You'll recognize these as the JS versions of `mkdir -p` and `rm -rf`.

### node:path — manipulating paths

Never build paths by string concatenation (`dir + '/' + file`) — `path` handles separators, `..`, and edge cases correctly and cross-platform:

```javascript title=path-tour.mjs
import { join, dirname, basename, extname, resolve } from 'node:path';

join('src', 'lib', 'x.js');   // 'src/lib/x.js'  (correct separator per OS)
dirname('/a/b/c.txt');        // '/a/b'
basename('/a/b/c.txt');       // 'c.txt'
basename('/a/b/c.txt', '.txt'); // 'c'
extname('c.txt');             // '.txt'
resolve('src', 'x.js');       // absolute path from the current working dir
```

> [!WARNING]
> On Windows the path separator is `\`, not `/`. Hard-coding `'/'` breaks cross-platform tooling. `path.join` uses the right separator automatically — always use it. (Cross-platform pitfalls get a full lesson in Module 17.)

### node:url — URLs and the __dirname fix

```javascript title=url-tour.mjs
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// THE essential ESM idiom (Module 5.1): reconstruct __dirname
const __dirname = dirname(fileURLToPath(import.meta.url));
```

### node:process — the running process

```javascript title=process-tour.mjs
process.argv;        // command-line arguments (raw; use parseArgs to parse)
process.env.HOME;    // environment variables (Module 2.3)
process.cwd();       // current working directory
process.exit(1);     // exit with a code (Module 2.5)
process.platform;    // 'darwin' | 'linux' | 'win32' — for cross-platform branches
```

### node:util — utilities incl. parseArgs

```javascript title=util-tour.mjs
import { parseArgs, styleText, inspect } from 'node:util';
// parseArgs: argument parsing (Module 4.3)
// styleText: colorize terminal output (e.g. styleText('green', 'ok'))
// inspect: pretty-print objects for debugging
```

### node:child_process — run other programs

Covered fully two lessons from now — this is how scripts call `git`, `npm`, etc.

```javascript title=child-tour.mjs
import { execFile } from 'node:child_process';   // run a program, capture output
```

### node:crypto — hashing and randomness

```javascript title=crypto-tour.mjs
import { createHash, randomUUID } from 'node:crypto';

const hash = createHash('sha256').update(content).digest('hex');  // content hashing
const id = randomUUID();                                           // a random UUID
```

> [!DOGFOOD]
> This course's `build-assets.ts` (Module 7) uses `createHash('sha256')` for cache-busting filenames, and the generator uses `node:fs/promises`, `node:path`, `node:url`, and `node:util` — *all built-ins, no npm needed for the core file work*. The only npm dependency in the whole build is `marked` for Markdown parsing.

## Newer built-ins worth knowing (2026)

Node keeps absorbing things that used to need libraries:

| Module / feature | Replaces | Notes |
| --- | --- | --- |
| `node:sqlite` | `better-sqlite3` | a real SQL database, built in (Module 13) |
| `node:test` | Jest/Mocha (for simple cases) | a built-in test runner |
| `--env-file` | `dotenv` | load `.env` files (Module 9) |
| native TS running | `ts-node` | run `.ts` directly (Module 7) |
| `fetch` (global) | `node-fetch`/`axios` | HTTP requests, no import needed |
| `styleText` | `chalk` | terminal colors |

The trend is clear: each Node release makes more tooling possible with *no dependencies*. Staying current means writing leaner, more reliable scripts.

> [!NOTE]
> Some newer built-ins (like `node:sqlite`) graduated gradually: on Node 22.5–22.12 it sat behind a `--experimental-sqlite` flag; since 22.13 no flag is needed, though Node 22.x still prints an `ExperimentalWarning`; on Node 24 it's simply there. "Experimental" means the API could still change, not that it's broken — it's fine for your own tooling. If you see old tutorials passing the flag, that's why.

## How to explore the standard library

You don't memorize all this — you learn to *find* it. The official Node API docs (nodejs.org/api) are excellent and version-specific. When you need to do something, first ask "is there a `node:` built-in for this?" before reaching for npm. Usually there is.

> [!TRY]
> Write a one-liner that lists the current directory using only built-ins: `node --input-type=module -e "import('node:fs/promises').then(fs => fs.readdir('.')).then(console.log)"`. You just used the filesystem module with zero dependencies.

> [!KEY]
> - Node's **built-in standard library** covers most tooling needs with **zero npm dependencies** — prefer it.
> - Core modules: **`fs`/`fs.promises`** (files), **`path`** (paths — never concatenate), **`url`** (`__dirname` fix), **`process`**, **`util`** (`parseArgs`), **`child_process`**, **`crypto`**.
> - Use `{ recursive: true }` options to make file operations **idempotent** and cross-platform.
> - 2026 Node absorbs more every release: `node:sqlite`, `--env-file`, native TS, global `fetch`, `styleText`.
> - Don't memorize — learn to **ask "is there a built-in?"** and check the official docs.
