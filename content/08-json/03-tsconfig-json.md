# tsconfig.json Deep Dive

`tsconfig.json` configures the TypeScript compiler — which files to check, how strictly, and how to resolve modules. We touched it in Module 7.3; here we go deeper into the options that actually matter, so you can configure TypeScript confidently instead of copy-pasting a config you don't understand.

## What tsconfig.json controls

When you run `tsc`, it looks for `tsconfig.json` to decide:

1. **Which files** to include (`include`/`exclude`/`files`).
2. **How strictly** to check (`strict` and friends).
3. **How to resolve and emit** modules (`module`/`moduleResolution`/`target`).
4. **Whether to emit** `.js` files at all (`noEmit`).

It's JSONC (Module 8.1) — TypeScript's own parser allows comments, which is why you'll see well-annotated configs.

## A complete, explained config

Here's the repo's actual `tsconfig.json`, the meaning of each line:

```jsonc title=tsconfig.json
{
  "compilerOptions": {
    // --- Output target & module system ---
    "target": "ES2023",            // which JS version features to assume/keep
    "module": "NodeNext",          // emit modules the way Node expects (ESM/CJS per file)
    "moduleResolution": "NodeNext",// resolve imports EXACTLY like Node does at runtime
    "lib": ["ES2023"],             // which built-in APIs are available
    "types": ["node"],             // include @types/node so node: APIs are typed

    // --- Strictness (the whole point) ---
    "strict": true,                // turn on ALL strict checks
    "noUncheckedIndexedAccess": true,  // arr[i] is T | undefined — handle out-of-bounds
    "noImplicitOverride": true,    // require 'override' keyword when overriding methods
    "exactOptionalPropertyTypes": true, // distinguish "missing" from "undefined"

    // --- We run .ts directly, so only CHECK, don't emit ---
    "noEmit": true,                // produce no .js — tsc is a pure type-checker here
    "erasableSyntaxOnly": true,    // forbid TS syntax that emits runtime code (Module 7.2)
    "verbatimModuleSyntax": true,  // keep import/export exactly as written (no surprises)
    "isolatedModules": true,       // each file must be compilable alone (req. for stripping)
    "skipLibCheck": true,          // don't deep-check dependency .d.ts files (faster)
    "esModuleInterop": true,       // smoother interop between ESM and CJS imports
    "forceConsistentCasingInFileNames": true  // catch Linux/macOS case mismatches
  },
  "include": ["examples/**/*.ts", "tests/**/*.ts"]
}
```

## The options that matter most

### strict — always on

```jsonc title=strict.jsonc
"strict": true
```

This single flag enables a *bundle* of checks: `strictNullChecks` (the big one — `null`/`undefined` must be handled explicitly), `noImplicitAny` (no silently-untyped values), and several more. **Without `strict`, TypeScript barely checks anything** and you get a false sense of safety (Module 7.3). Treat `"strict": true` as mandatory.

### target and lib

```jsonc title=target.jsonc
"target": "ES2023",
"lib": ["ES2023"]
```

`target` is the JavaScript version your code will run on — set it to match your runtime (Node 22 supports ES2023 comfortably). `lib` declares which built-in APIs exist (so `Array.prototype.findLast`, etc., are known). For Node tooling, matching both to a recent ES version is right. (For browser code you'd add `"DOM"` to `lib`.)

### module and moduleResolution

```jsonc title=module.jsonc
"module": "NodeNext",
"moduleResolution": "NodeNext"
```

`NodeNext` tells TypeScript to handle modules *exactly* the way Node does — respecting `.mjs`/`.cjs` and `package.json` `"type"` (Module 5.1). This matters enormously: it means **what type-checks is what actually runs.** Mismatched module settings are a top cause of "it compiled but crashes at runtime" — `NodeNext` keeps them aligned for Node projects.

### noEmit — the tooling choice

```jsonc title=noemit.jsonc
"noEmit": true
```

Because we *run* `.ts` directly (Module 7.2/7.5), we don't want `tsc` to produce `.js` files — only to check types. `noEmit` makes `tsc` a pure linter. If you were *shipping* compiled output (Module 7.5), you'd remove this and set `outDir` instead.

## include, exclude, files

```jsonc title=include.jsonc
{
  "include": ["examples/**/*.ts", "tests/**/*.ts"],  // glob patterns of files to check
  "exclude": ["node_modules", "dist"]                 // what to skip (node_modules is default-excluded)
}
```

- **`include`** — glob patterns (Module 2.6) of files to type-check.
- **`exclude`** — what to skip; `node_modules` is excluded by default.
- **`files`** — an explicit list (instead of globs), for small projects.

> [!GOTCHA]
> If `tsc` reports "No inputs were found," your `include` globs don't match any files (wrong path or extension). And remember `exclude` only filters the `include` set — it doesn't pull in extra files. Getting `include` right is the most common tsconfig stumbling block.

## Extending configs

Real projects often share a base config. `extends` lets one tsconfig inherit another:

```jsonc title=extends.jsonc
{
  "extends": "@tsconfig/node22/tsconfig.json",   // a community base config for Node 22
  "compilerOptions": {
    "noEmit": true                                 // override/add on top of the base
  }
}
```

> [!TIP]
> The community maintains *base* configs (the `@tsconfig/*` packages, e.g. `@tsconfig/node22`) with sensible defaults for a given runtime. Extending one and overriding a couple of options is cleaner than hand-writing every setting — and keeps you current with recommended settings. Same single-source-of-truth spirit as the rest of the course.

## The mental model

`tsconfig.json` answers: *what do I check, how strictly, for which runtime, and do I emit?* For tooling, the answers are: check your `.ts` files, **strictly** (`strict: true`), targeting your **Node version** with **NodeNext** resolution, and **don't emit** (run directly, check only). Get those four right and the rest is detail.

> [!TRY]
> In the repo, open `tsconfig.json` and temporarily change `"strict": true` to `false`. Run `npx tsc --noEmit` — notice fewer (or no) errors flagged, because the safety checks are off. Restore it to `true`. You've seen why strict mode is the heart of the config.

> [!KEY]
> - `tsconfig.json` (JSONC) controls **which files** TypeScript checks, **how strictly**, **module/target resolution**, and **whether it emits**.
> - **`"strict": true`** is mandatory — it enables the bundle of real checks (esp. null/undefined safety). Without it, TS barely checks.
> - **`"module"/"moduleResolution": "NodeNext"`** keeps what type-checks aligned with what runs in Node.
> - For tooling, set **`"noEmit": true`** (run `.ts` directly, use `tsc` only to check); for shipping, set `outDir` instead.
> - Get **`include`** globs right (top stumbling block); consider **`extends`** a community base config (`@tsconfig/node22`).
