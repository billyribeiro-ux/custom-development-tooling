# Why TypeScript for Scripts: Types as Guardrails

TypeScript is JavaScript with **types** — annotations that describe the shape of your data, checked *before* the code runs. For tooling, types act as guardrails that catch a whole class of bugs at write-time instead of at 2am in production. Let's understand what they buy you and when they're worth it.

## What TypeScript actually is

TypeScript is a *superset* of JavaScript: every valid JS file is valid TS. You add type annotations, a type-checker (`tsc`) verifies them, and then the types are **erased** — the code that runs is plain JavaScript. Types exist only at development time.

```typescript title=types-basics.ts
let count: number = 5;              // count must be a number
let name: string = "Ada";          // name must be a string
function greet(person: string): string {   // takes a string, returns a string
  return `Hello, ${person}`;
}

greet(42);   // ❌ tsc ERROR before you ever run it: number is not a string
```

That error — caught by the type-checker, not at runtime — is the whole value proposition.

## Why types matter for tooling specifically

You might think "scripts are small, who needs types?" But tooling has properties that make types *especially* valuable:

1. **Tooling runs unattended.** A build script runs in CI with no human watching. A type error caught at write-time is infinitely cheaper than a crash mid-deploy.
2. **Tooling manipulates structured data.** Config objects, manifests, API responses — exactly where "oops, that field is `undefined`" bugs hide. Types describe the shape and catch typos in field names instantly.
3. **Tooling is read more than written.** Types are *documentation that can't go stale* — they tell the next reader (often future-you) exactly what a function expects and returns.

```typescript title=guardrail-example.ts
interface BuildOptions {
  src: string;
  out: string;
  minify: boolean;
}

function build(opts: BuildOptions) { /* ... */ }

build({ src: "assets", out: "dist", minfy: true });
//                                   ^^^^^ ❌ tsc: typo! 'minfy' doesn't exist on BuildOptions
//                                          and 'minify' is missing
```

In plain JavaScript, that `minfy` typo would silently do nothing (the real `minify` stays `undefined`), and you'd debug a "why isn't minification working?" mystery. TypeScript catches it the instant you type it.

## The editor experience: the underrated win

Beyond catching errors, types power your editor's **autocomplete and inline checking**. With a typed `BuildOptions`, your editor suggests `src`, `out`, `minify` as you type and flags mistakes with a red squiggle. This *tightens the feedback loop* (Module 1.2) to near-zero — you find the bug while typing, not after running.

> [!TIP]
> This is why the code blocks in this course use Monaco (the VS Code editor): you get real TypeScript-aware editing right here. Try clicking **Edit** on a `.ts` block and introducing a type error — you may see the editor flag it. Types turn the editor into a continuous, instant checker.

## The cost: be honest

Types aren't free:

- A **type-checking step** (`tsc`) to run, and a **`tsconfig.json`** to configure (Module 7.3).
- Some **annotation effort** — though modern TS *infers* most types, so you write fewer than you'd think.
- A **learning curve** for advanced types (generics, unions, narrowing).

> [!NOTE]
> For a 10-line throwaway script, plain JS (or even bash) is often the right call — types would be overhead. The judgment (Module 6.5) is the same: match the tool to the task. Types pay off as scripts grow, manipulate structured data, run in CI, or are maintained by a team. A build pipeline? Types. A one-off rename? Skip them.

## "But I already write JavaScript"

The beautiful part: **you can adopt TypeScript incrementally.** Since every JS file is valid TS, you can start by just renaming `.js` to `.ts` and adding types where they help most (function signatures, config shapes). You don't have to type everything. Even a *little* typing — annotating the inputs and outputs of your main functions — catches most real bugs.

```typescript title=incremental.ts
// Even minimal typing helps enormously:
function processFiles(paths: string[]): Promise<void> {
  // inside can stay loosely typed; the SIGNATURE documents and guards the boundary
}
```

> [!DOGFOOD]
> This course's `build-assets.ts` (narrated in Module 7.4) and the Playwright tests (`tests/e2e/*.ts`, Module 16) are TypeScript. The `tsconfig.json` at the repo root configures the checker, and CI runs `tsc --noEmit` to type-check on every push (Module 15). The types caught real mistakes while writing the course — exactly the guardrail this lesson describes.

## The mental model

Think of TypeScript as a *contract checker*. You declare contracts ("this function takes a `BuildOptions` and returns a `Promise<void>`"), and `tsc` verifies every call site honors them. Break a contract — wrong type, missing field, typo — and you're told immediately, with a precise location. For code that runs unattended and handles structured data, that safety is worth a lot.

> [!TRY]
> If you have an editor with TypeScript support, create a `.ts` file with `function add(a: number, b: number) { return a + b; }` and then call `add("1", 2)`. Watch the editor flag the error before you run anything. That instant feedback is the core benefit.

> [!KEY]
> - TypeScript is **JavaScript plus types**, checked before running, then **erased** (plain JS runs).
> - Types are **guardrails**: they catch typos, wrong shapes, and `undefined` bugs at *write-time* — especially valuable for tooling that runs **unattended** and handles **structured data**.
> - They power **autocomplete and inline checking**, tightening the feedback loop to near-zero, and serve as **documentation that can't go stale**.
> - The cost (a `tsc` step, config, some annotations) is worth it as scripts grow; skip it for tiny throwaways.
> - Adopt **incrementally** — even typing just function signatures catches most real bugs.
