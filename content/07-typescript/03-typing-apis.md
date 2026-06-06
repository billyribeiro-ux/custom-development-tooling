# Typing File/Process APIs and tsconfig.json for Scripts

Now the practical middle ground: how to actually *write* typed tooling. You don't need to master advanced TypeScript — a handful of features covers almost all tooling code. We'll also set up `tsconfig.json` properly, since a good config is what makes the type-checker genuinely helpful.

## The types you'll actually use

Tooling rarely needs exotic types. These cover the vast majority:

```typescript title=everyday-types.ts
// Primitives
let name: string;
let count: number;
let done: boolean;

// Arrays
let paths: string[];
let counts: number[];

// Objects via interface (the shape of config, manifests, etc.)
interface Lesson {
  slug: string;
  title: string;
  example?: string;     // the ? makes it OPTIONAL — may be undefined
}

// Unions (one of several values) — great for modes/states
type Environment = "dev" | "staging" | "prod";

// Function types
function build(opts: Lesson): Promise<void> { /* ... */ return Promise.resolve(); }

// Records (a dictionary/map of key -> value)
type Manifest = Record<string, Lesson>;   // string keys, Lesson values
```

That's enough for most scripts: primitives, arrays, `interface` for object shapes, `type` unions for enumerated choices, and function signatures. The `?` for optional fields and `Record<K, V>` for dictionaries come up constantly in config-handling code.

## Let inference do the work

A common beginner mistake is annotating *everything*. TypeScript **infers** most types — only annotate where it adds value (function parameters, and shapes that cross boundaries):

```typescript title=inference.ts
const count = 5;                    // inferred as number — no annotation needed
const names = ["a", "b"];           // inferred as string[]
const opts = { src: "x", out: "y" }; // inferred as { src: string; out: string }

// DO annotate function parameters (TS can't infer what callers pass)
// and return types of exported functions (documents the contract):
function load(path: string): Lesson { /* ... */ }
```

> [!TIP]
> The sweet spot: **annotate the boundaries** (function inputs/outputs, config shapes, data you read from disk or the network) and let inference handle the internals. This gives you the safety where it matters with minimal typing. Over-annotating internals is noise; under-annotating boundaries loses the guardrails.

## Typing Node's built-in APIs

To type-check code that uses `node:fs`, `node:path`, etc., TypeScript needs to know their shapes. Those come from a package called **`@types/node`**:

```bash title=types-node.sh
npm install --save-dev @types/node typescript
```

With `@types/node` installed and configured, the Node built-ins are fully typed — `readFile` knows its arguments, `parseArgs` knows its options shape, and you get autocomplete for all of them.

```typescript title=typed-node.ts
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

const text: string = await readFile('x.txt', 'utf8');   // typed!
const { values } = parseArgs({ options: { out: { type: 'string' } } });
//      ^ values is typed based on your options
```

## tsconfig.json: the type-checker's settings

`tsconfig.json` configures how `tsc` checks your code (we cover the file format deeply in Module 8.3; here's the tooling-relevant shape). A solid config for scripts:

```json title=tsconfig.json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "types": ["node"],

    "strict": true,
    "noUncheckedIndexedAccess": true,

    "noEmit": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true
  },
  "include": ["examples/**/*.ts", "tests/**/*.ts"]
}
```

The settings that matter most for tooling:

- **`"strict": true`** — turns on all the strict checks. This is the whole point of using TS; *always* enable it. It catches `null`/`undefined` bugs, implicit `any`, and more.
- **`"noUncheckedIndexedAccess": true`** — makes `arr[i]` typed as possibly-`undefined`, forcing you to handle out-of-bounds access. Catches a real class of bugs.
- **`"noEmit": true`** — "don't produce `.js` files, just check." Since we *run* `.ts` directly (Module 7.2), `tsc`'s only job is type-checking. This makes `tsc` a pure linter.
- **`"module"/"moduleResolution": "NodeNext"`** — resolve imports exactly the way Node does, so what type-checks is what runs.
- **`"skipLibCheck": true`** — don't deep-check dependency type files (faster, fewer irrelevant errors).

> [!GOTCHA]
> If you forget `"strict": true`, TypeScript runs in a permissive mode where `null`/`undefined` aren't checked and untyped values become `any` (which disables checking). You'll *think* you have type safety but you mostly don't. **Strict mode is non-negotiable** — without it, TS gives a false sense of security.

## Type-checking as a separate step

Remember the division of labor (Module 7.2): you *run* `.ts` with Node, and *check* it with `tsc`:

```bash title=typecheck.sh
npx tsc --noEmit          # check all .ts files; prints errors, exits non-zero if any
```

Because `tsc --noEmit` exits non-zero on type errors (Module 2.5), it slots straight into your `Makefile` and CI as a gate:

```makefile title=Makefile (excerpt)
typecheck:
	npx tsc --noEmit
```

> [!DOGFOOD]
> The repo's `tsconfig.json` is essentially the config above (open it to compare). CI runs `npx tsc --noEmit` on every push (`.github/workflows/ci.yml`, Module 15), so a type error in `build-assets.ts` or the Playwright tests fails the build before merge. The config has `"strict": true` and `"noUncheckedIndexedAccess": true` — the guardrails turned all the way up.

> [!TRY]
> In the repo, open `examples/typescript/build-assets.ts`, introduce a type error (e.g. pass a number where a string is expected), and run `npx tsc --noEmit`. Watch it report the exact file, line, and reason — then exit non-zero (`echo $?`). Fix it and the check passes silently. That loop *is* type-driven tooling.

> [!KEY]
> - Most tooling needs only a few type features: primitives, arrays, **`interface`** (object shapes), **`type` unions**, function signatures, `?` (optional), `Record<K,V>`.
> - **Let inference work** — annotate the **boundaries** (function inputs/outputs, data shapes), not every internal variable.
> - Install **`@types/node`** so Node built-ins are typed.
> - In `tsconfig.json`: **`"strict": true`** is non-negotiable; add `noUncheckedIndexedAccess`, set **`"noEmit": true`** (run `.ts` directly, use `tsc` only to check), and `"NodeNext"` resolution.
> - Run **`tsc --noEmit`** as a CI/Makefile gate — it exits non-zero on type errors.
