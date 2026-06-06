# Top-Level await, async Patterns, and Error Handling

Node tooling is asynchronous — reading files, running processes, hitting networks all happen "later." Getting async right (and handling errors properly) is what separates a script that reliably reports failures from one that silently swallows them. Let's build the patterns.

## Why async, briefly

When you `await readFile(...)`, Node doesn't *block* — it hands the work to the OS and continues, resuming when the data is ready. For tooling this mostly means: prefix I/O calls with `await`, and the code reads top-to-bottom like synchronous code while staying efficient.

## Top-level await: the clean script shape

In ESM (Module 5.1) you can `await` at the top level — no wrapper function needed. Scripts read like a recipe:

```javascript title=top-level.mjs
import { readFile, writeFile } from 'node:fs/promises';

const config = JSON.parse(await readFile('config.json', 'utf8'));
const result = await process(config);
await writeFile('out.json', JSON.stringify(result, null, 2));
console.log('done');
```

That's the whole script. No `async function main()` ceremony required — though, as we'll see, wrapping in `main()` has one real benefit for error handling.

## Sequential vs parallel: a real performance lever

By default, `await`ing one thing at a time runs them *sequentially*. When operations are **independent**, run them in *parallel* with `Promise.all` — often a big speedup:

```javascript title=sequential-vs-parallel.mjs
// SEQUENTIAL: waits for each in turn (slow if independent)
const a = await readFile('a.txt', 'utf8');
const b = await readFile('b.txt', 'utf8');   // doesn't start until 'a' finishes

// PARALLEL: start both, then wait for both (fast)
const [a2, b2] = await Promise.all([
  readFile('a.txt', 'utf8'),
  readFile('b.txt', 'utf8'),
]);
```

```javascript title=parallel-many.mjs
// Process many files at once
const names = await readdir('content');
const contents = await Promise.all(
  names.map((name) => readFile(join('content', name), 'utf8')),
);
```

> [!GOTCHA]
> A subtle trap: a `for...of` loop with `await` inside runs **sequentially** (each iteration waits for the previous). That's sometimes *intentional* (e.g. database migrations must run in order!). But for independent work it's needlessly slow — use `Promise.all(items.map(...))` instead. Know which you want: order-dependent → loop; independent → `Promise.all`.

> [!WARNING]
> `Promise.all` **rejects as soon as any one** promise rejects — but the others keep running in the background. If you need *every* result regardless of individual failures, use `Promise.allSettled`, which waits for all and reports each as fulfilled or rejected. Choose based on whether one failure should abort the batch.

## Error handling: the whole point

Here's where tooling earns trust. If a script *fails silently*, every tool built on it believes it succeeded (Module 2.5). Async errors are easy to swallow accidentally, so be deliberate.

### Rule 1: an unhandled rejection should crash the script (non-zero exit)

By default, an uncaught error in Node exits the process with a non-zero code — which is *exactly what you want* for tooling (CI sees the failure). Don't suppress this. The danger is *accidentally* catching and ignoring:

```javascript title=BAD-swallow.mjs
try {
  await doImportantWork();
} catch (err) {
  // silently ignored! the script "succeeds" (exit 0) even though work failed. NEVER do this.
}
```

```javascript title=GOOD-handle.mjs
try {
  await doImportantWork();
} catch (err) {
  console.error(`failed to do important work: ${err.message}`);
  process.exit(1);                 // visible failure: message + non-zero exit
}
```

### Rule 2: wrap your script in main().catch() for a clean exit

The idiom that gives the best of both worlds — top-level logic plus guaranteed non-zero exit on error, *without* dumping a raw stack trace:

```javascript title=main-pattern.mjs
async function main() {
  const config = JSON.parse(await readFile('config.json', 'utf8'));
  await build(config);
  console.log('done');
}

main().catch((err) => {
  console.error('build failed:', err);   // or err.message for a terser line
  process.exit(1);                         // CI fails loudly
});
```

> [!DOGFOOD]
> This is *exactly* how `tools/generate-pages.mjs` ends:
> ```javascript title=generate-pages.mjs (tail)
> main().catch((err) => {
>   console.error('Build failed:', err);
>   process.exit(1);
> });
> ```
> If anything in the build throws — a missing template, malformed manifest — the script exits non-zero and CI refuses to deploy a broken site. We dissect the whole file next lesson.

### Rule 3: let unexpected errors propagate; handle expected ones specifically

Don't wrap everything in try/catch "just in case." Catch errors you can *meaningfully handle* (a missing optional file → use a default; a known recoverable condition → retry). Let *unexpected* errors bubble up to your `main().catch()` and crash — that's the correct behavior for a bug. Over-catching hides bugs; under-catching crashes on recoverable conditions. Aim for the middle.

```javascript title=specific-catch.mjs
try {
  config = JSON.parse(await readFile('config.json', 'utf8'));
} catch (err) {
  if (err.code === 'ENOENT') config = {};   // expected: optional file -> default
  else throw err;                            // unexpected (e.g. bad JSON): let it crash
}
```

## A note on errors carrying context

Good error messages save hours. When you re-throw or report, include *what* you were doing:

```javascript title=context.mjs
try {
  await build(lesson);
} catch (err) {
  throw new Error(`failed building lesson "${lesson.slug}": ${err.message}`, { cause: err });
}
```

The `{ cause: err }` option preserves the original error while adding your context — modern, and far better than a bare "undefined is not a function" with no clue where. We expand on good error messages in Module 17.

> [!TRY]
> Write a script with a `main()` that throws (`throw new Error('boom')`), ended with `main().catch(e => { console.error(e.message); process.exit(1); })`. Run it, then `echo $?` — you'll see `1`. Remove the `process.exit(1)` and notice the exit code is *still* non-zero (Node does it for unhandled rejections) but you get an uglier stack trace. The pattern gives you a clean message *and* the right exit code.

> [!KEY]
> - **Top-level await** lets ESM scripts read top-to-bottom; `await` your I/O.
> - Run independent work in **parallel with `Promise.all`**; a `for...of` with `await` is **sequential** (good for ordered work like migrations, slow for independent work).
> - **Never silently swallow errors** — that makes failures invisible to automation.
> - Wrap scripts in **`main().catch(err => { ...; process.exit(1) })`** for a clean message + guaranteed non-zero exit.
> - Catch **expected** errors specifically (e.g. `ENOENT` → default); let **unexpected** ones crash. Add **context** (`{ cause }`) to errors.
