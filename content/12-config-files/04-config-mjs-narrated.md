# Worked Example: A Real *.config.mjs Narrated

Let's read a complete config-as-code file: `examples/config/site.config.mjs`. It's small, but it demonstrates *every* idea from this module — the export-an-object pattern, computed values from the environment, a `defineConfig` helper, and the judgment of "mostly declarative with a little logic." Reading it ties the whole module together.

> [!DOGFOOD]
> This is a runnable file in the repo. Open `examples/config/site.config.mjs` alongside this lesson. You can `import` it from a Node script and inspect the result.

## The header

```javascript title=site.config.mjs
// site.config.mjs — an example "configuration as code" file.
// Instead of a static JSON blob, the config is a JavaScript module that
// EXPORTS an object. Because it is code, it can use variables, comments,
// environment values, and logic — things JSON simply cannot do.
```

A comment stating the file's purpose and *why* it's code rather than JSON (Module 12.1). Notice it can *have* comments at all — already something JSON can't do (Module 8.1).

## defineConfig: the typed identity helper

```javascript title=site.config.mjs
/**
 * `defineConfig` is an identity function — it returns its argument unchanged.
 * Its only job is to attach a type so your editor autocompletes config keys
 * and flags typos. Real tools ship their own typed version of this.
 *
 * @template T
 * @param {T} config
 * @returns {T}
 */
export function defineConfig(config) {
  return config;
}
```

This is the `defineConfig` from Module 12.3, defined right in the file. The body is the identity function (`return config`) — it does nothing at runtime. The value is the **JSDoc `@template T` generic**: it tells a TypeScript-aware editor "whatever type you pass in is the type you get back," so the config written inside gets type preservation and autocomplete *even in a plain `.mjs` file* (no `.ts` needed). It's the "no-op that carries a type" pattern (Module 12.3) in action. Real tools (Vite, Playwright) ship their own typed against their full config interface; here we define a generic one to demonstrate.

## Reading the environment: the key superpower

```javascript title=site.config.mjs
// Reading the environment here is the superpower static config lacks: the same
// config file behaves differently in dev vs production.
const isProd = process.env.NODE_ENV === 'production';
```

This single line is the whole argument for config-as-code (Module 12.1). A static JSON file *cannot* check `NODE_ENV` — it's just data. This file *computes* `isProd` from the environment (Module 2.3, 9.2), and then uses it to make the config adapt. The *same file* will produce different config in development and production.

## The exported config object

```javascript title=site.config.mjs
export default defineConfig({
  site: {
    title: 'Custom Development Tooling',
    // Logic in config: choose the base URL based on the environment.
    baseUrl: isProd ? 'https://example.com' : 'http://localhost:8080',
  },

  build: {
    outDir: process.env.SITE_OUTPUT_DIR ?? 'site',
    minify: isProd,          // only minify for production builds
    sourcemaps: !isProd,
  },

  markdown: {
    calloutTypes: ['NOTE', 'TIP', 'WARNING', 'GOTCHA', 'DOGFOOD', 'TRY', 'KEY'],
  },
});
```

This is the **export-an-object** pattern (Module 12.2), wrapped in `defineConfig`. Walk through what each part demonstrates:

- **`baseUrl: isProd ? '...' : '...'`** — *conditional logic*. Production gets the real domain; development gets localhost. Impossible in static JSON without duplicating the whole file.
- **`outDir: process.env.SITE_OUTPUT_DIR ?? 'site'`** — *environment with a default* (Module 2.3, 9.4). The output directory can be overridden by an env var, falling back to `'site'`. This is config precedence (env over default) in miniature.
- **`minify: isProd` / `sourcemaps: !isProd`** — *computed booleans*. Minify in production, generate sourcemaps in development. Two settings derived from one environment check, kept in sync automatically.
- **`calloutTypes: [...]`** — *plain data*. Not everything needs logic; this is just a list. Good config is mostly data (Module 12.1's "mostly declarative with a little logic").

Notice the balance: a *little* logic (`isProd`, the `??` default) over *mostly* declarative data. It reads like config, not like a program (Module 12.1's warning against over-engineering). That restraint is the principal-level judgment.

## Using the config

A tool (or script) consumes it with a dynamic import (Module 5.1):

```javascript title=consume-config.mjs
const config = (await import('./examples/config/site.config.mjs')).default;
console.log(config.site.baseUrl);     // localhost in dev, example.com in prod
console.log(config.build.minify);     // false in dev, true in prod
```

Run it once normally and once with `NODE_ENV=production` set, and you'll get *different* values from the *same* config file — the core benefit, observable with your own eyes.

## What this teaches, distilled

This ~30-line file is config-as-code done right:

1. **Exports an object** (the standard pattern, Module 12.2).
2. **Wrapped in `defineConfig`** for editor type-safety (Module 12.3).
3. **Reads the environment** to adapt across dev/prod (Module 12.1's superpower).
4. **Uses light logic** (conditionals, defaults) over **mostly declarative data** — the right balance (Module 12.1).
5. **Has comments** explaining the *why* — impossible in JSON.

Every config-as-code file you meet — `vite.config.ts`, `playwright.config.ts` (Module 16), `eslint.config.js` — is a richer version of this same shape. Understand this one and you can read and write them all.

> [!TRY]
> In the repo, write a tiny script that imports `examples/config/site.config.mjs` and prints `config.site.baseUrl` and `config.build.minify`. Run it twice: once plainly (dev values) and once with `NODE_ENV=production node yourscript.mjs` (prod values). Watching the *same config file* yield different values is the entire point of config-as-code, made tangible.

> [!KEY]
> - `site.config.mjs` demonstrates the whole module: **export an object** (Module 12.2) **wrapped in `defineConfig`** (Module 12.3) for editor type-safety.
> - It **reads `process.env`** to compute `isProd`, then adapts `baseUrl`, `minify`, and `sourcemaps` — the superpower static config lacks (Module 12.1).
> - `outDir: process.env.SITE_OUTPUT_DIR ?? 'site'` shows **env-with-default** (config precedence in miniature, Module 9.4).
> - It balances **a little logic over mostly declarative data**, with **comments** explaining why — config that still reads like config.
> - Every real config-as-code file (`vite.config.ts`, `playwright.config.ts`) is a richer version of this same shape.
