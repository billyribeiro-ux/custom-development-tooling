# The Config-File Pattern: Export an Object or Function

Config-as-code files follow a small set of conventions. Once you know them, you can read and write config for *any* tool that uses this pattern — Vite, Vitest, Playwright, ESLint, and the rest. This lesson covers the two core shapes: exporting an **object** and exporting a **function**.

## Shape 1: export a config object

The simplest config-as-code file exports a default object. The tool imports it and reads the fields:

```javascript title=tool.config.mjs
export default {
  outDir: 'dist',
  minify: true,
  plugins: ['core', 'analytics'],
};
```

The tool does roughly this internally:

```javascript title=how-the-tool-reads-it.mjs
// (inside the tool)
const config = (await import('./tool.config.mjs')).default;   // import the default export
console.log(config.outDir);   // 'dist'
```

That's the whole contract: **your file `export default`s an object; the tool imports and uses it.** Because it's a module (Module 5.1), you can compute the values:

```javascript title=computed-object.mjs
const isProd = process.env.NODE_ENV === 'production';

export default {
  outDir: 'dist',
  minify: isProd,                          // computed (Module 12.1)
  sourcemaps: !isProd,
};
```

## Shape 2: export a function

Sometimes the config needs to *depend on information the tool provides* — like "which command am I running?" or "is this a dev or production build?" For that, you export a *function* that the tool *calls*, passing context, and which *returns* the config:

```javascript title=function-config.mjs
// The tool calls this function, passing an object describing the current run
export default ({ mode, command }) => {
  const isProd = mode === 'production';
  return {
    outDir: command === 'build' ? 'dist' : '.tmp',
    minify: isProd,
  };
};
```

The tool does:

```javascript title=how-the-tool-calls-it.mjs
// (inside the tool)
const factory = (await import('./tool.config.mjs')).default;
const config = typeof factory === 'function'
  ? factory({ mode: 'production', command: 'build' })   // call it with context
  : factory;                                             // or use the object directly
```

This is more flexible than a static object: the tool hands you *runtime context* (mode, command, environment), and you return config tailored to it. Vite, for instance, lets you export either an object *or* a function exactly this way.

> [!NOTE]
> Both shapes are common, and many tools accept *either* — they check `typeof export === 'function'` and call it if so, else use it directly (as shown above). When you write a tool that loads config (Module 12.4), supporting both is a small, friendly touch. When you *use* a tool, check its docs for which shape (and what context the function receives).

## Async config

Because it's code, config can even be *asynchronous* — useful if computing it requires reading a file or hitting an API:

```javascript title=async-config.mjs
import { readFile } from 'node:fs/promises';

export default async () => {
  const secrets = JSON.parse(await readFile('secrets.json', 'utf8'));  // await!
  return {
    apiKey: secrets.key,
    outDir: 'dist',
  };
};
```

The tool `await`s the function's result. Most config doesn't need this, but it's there when you need it — a power static config simply can't offer.

## Named exports for multiple configs

Some tools read *named* exports for related settings:

```javascript title=named-exports.mjs
export const server = { port: 8080 };
export const build = { outDir: 'dist' };
export default { name: 'my-app' };
```

The tool imports specific names (`import { server } from './config'`). This is less common than the default-export shape but you'll occasionally see it.

## File naming and discovery

Tools find their config by *convention* — a filename they look for automatically:

```text title=conventional-names
vite.config.ts        <- Vite looks for this
vitest.config.ts      <- Vitest
playwright.config.ts  <- Playwright (Module 16)
eslint.config.js      <- ESLint (flat config)
tailwind.config.js    <- Tailwind
<toolname>.config.{js,mjs,ts}   <- the general pattern
```

The convention is almost always `<toolname>.config.<ext>`. The tool searches the project root for this file; if present, it loads it. This *convention over configuration* (you don't *tell* the tool where its config is — it *knows*) is itself a tooling principle: sensible defaults reduce setup.

> [!TIP]
> The extension matters for *how* the config runs. A `.mjs` config is always ESM (Module 5.1). A `.ts` config gives you types and autocomplete (Module 7.1) but the tool must be able to *run* TypeScript (most modern tools handle this via native stripping or `tsx`, Module 7.2). When in doubt, `.mjs` is the most universally-loadable choice; `.ts` is nicest when the tool supports it (and most do in 2026).

## Reading config files in the wild

When you open a project and see `playwright.config.ts` or `vite.config.mjs`, you now know exactly what it is: a code module exporting (an object or function returning) that tool's configuration. You can read it like any other code, follow its logic, and understand how the tool is set up — far more transparent than a mystery JSON blob. That transferable recognition applies to every tool using this pattern.

> [!DOGFOOD]
> This course's `examples/config/site.config.mjs` (Module 12.4) uses the **object** shape with a `defineConfig` wrapper (Module 12.3) and computed values from `process.env.NODE_ENV`. The Playwright config (`playwright.config.ts`, Module 16) uses `defineConfig` too. Both are this exact pattern — and you'll dissect them.

> [!TRY]
> Write a `my.config.mjs` that `export default`s an object with a `mode` field set to `process.env.NODE_ENV ?? 'development'`. Then load it from another file: `const cfg = (await import('./my.config.mjs')).default; console.log(cfg.mode)`. Run it with and without `NODE_ENV=production` set. You've implemented and consumed the config-file pattern.

> [!KEY]
> - Config-as-code files **`export default`** either an **object** (the tool reads its fields) or a **function** (the tool calls it with runtime context and uses the returned object).
> - The function shape lets config depend on **runtime context** (mode, command); many tools accept either shape (and even **async** functions).
> - Tools **discover** config by convention: **`<toolname>.config.{js,mjs,ts}`** in the project root (convention over configuration).
> - **`.mjs`** is the most universally-loadable; **`.ts`** adds types/autocomplete when the tool can run TypeScript (most do in 2026).
> - Recognizing this pattern lets you **read and write config for any tool that uses it** (Vite, Vitest, Playwright, ESLint).
