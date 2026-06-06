# Running .ts Directly in 2026 (Native Stripping, tsx)

For most of TypeScript's history, running a `.ts` file meant *compiling* it to `.js` first, then running the `.js`. That extra step was friction for tooling. In 2026, you can run TypeScript files **directly** — and this changes how pleasant TS tooling is to write. Let's see the modern options.

## The old way (still common in apps)

```bash title=old-way.sh
# Compile .ts -> .js, then run the .js
tsc build.ts          # produces build.js
node build.js          # run the output
```

This works but has a build step and leaves `.js` artifacts lying around. Fine for shipping an app; clunky for a quick tooling script. (We compare compile-vs-run trade-offs fully in Module 7.5.)

## The 2026 way: Node runs TypeScript directly

Modern Node can run `.ts` files **natively** by *stripping the types* — it removes the type annotations (which are erasable, Module 7.1) and runs the resulting JavaScript, with no separate compile step and no output files:

```bash title=native-ts.sh
node build.ts          # just works — Node strips types and runs it
```

```typescript title=build.ts
// This runs directly with `node build.ts` in modern Node — no compile step:
const greeting: string = "Hello";
const count: number = 5;
console.log(`${greeting} x${count}`);
```

This is a big deal for tooling: a `.ts` script is now as easy to run as a `.mjs` script, while giving you types. It's the same "zero-friction" goal as Module 5's built-in `parseArgs` — fewer steps, fewer dependencies.

> [!NOTE]
> Native type-stripping **erases** types but does not *check* them — Node runs the code regardless of type errors. That's by design: running and checking are separate jobs (Module 7.5). You still run `tsc --noEmit` (separately, and in CI) to actually *verify* the types. Think: Node *runs* your TS; `tsc` *checks* it.

## The "erasable types only" constraint

Native stripping has one rule: it only handles TypeScript features that are **purely type-level** (erasable). A few older TS features generate *runtime* code and aren't allowed:

```typescript title=erasable-vs-not.ts
// ✅ ERASABLE — fine with native stripping:
interface User { name: string; }      // interfaces vanish entirely
type Id = string | number;            // type aliases vanish
function greet(u: User): string { ... } // annotations vanish
const x = value as string;            // 'as' casts vanish

// ❌ NOT erasable — these emit runtime code, avoid them in directly-run scripts:
enum Color { Red, Green }             // enums generate an object at runtime
namespace Foo { ... }                 // namespaces generate code
class C { constructor(private x: number) {} }  // 'private' param properties emit code
```

> [!GOTCHA]
> If you hit "TypeScript ... is not supported" or similar when running `.ts` directly, you've likely used a non-erasable feature (usually an `enum` or a parameter property). The fix is easy and idiomatic: replace `enum` with a `const` object or a union type, and write constructor assignments explicitly. Modern TS style avoids these features anyway, so this rarely comes up in new code. The `tsconfig.json` option `"erasableSyntaxOnly": true` makes `tsc` flag them for you.

## tsx: the popular alternative

Before native stripping was stable, the community standard was **`tsx`** — a small tool that runs `.ts` files (and handles more TS features, plus on-the-fly transforms):

```bash title=tsx.sh
npx tsx build.ts          # run a .ts file via tsx
npx tsx watch build.ts    # re-run on changes
```

`tsx` is still excellent and widely used. It's a dependency (unlike native stripping), but it's mature, fast, supports watch mode, and handles edge cases. Many projects use it in their `package.json` scripts.

## Which should you use?

| Option | Dependency? | Checks types? | Handles all TS? | Best for |
| --- | --- | --- | --- | --- |
| Native `node x.ts` | none (built-in) | no | erasable only | simple scripts, zero deps |
| `tsx` | yes (`npm i -D tsx`) | no | yes (+ more) | richer needs, watch mode |
| `tsc` then `node` | yes (`typescript`) | **yes** | yes | shipping compiled output |

The 2026 default for *tooling scripts*: **native `node x.ts`** if your code is modern (erasable) TS, falling back to **`tsx`** if you need watch mode or hit an edge case. Use `tsc` separately to type-check (next section), not to run.

> [!TIP]
> A clean setup: write `.ts` tooling, run it with `node script.ts` (or `tsx`), and add a `typecheck` task that runs `tsc --noEmit` — wired into your `Makefile` (Module 11) and CI (Module 15). You get fast iteration (run directly) *and* real safety (checked in CI). Best of both.

> [!DOGFOOD]
> The course's `build-assets.ts` runs with plain `node examples/typescript/build-assets.ts` — no compile step, no `tsx`, because it's written in erasable TypeScript. Try it: `node examples/typescript/build-assets.ts --src assets --out /tmp/dist`. Meanwhile, `npx tsc --noEmit` (and CI) checks the types. Run + check, separated.

## Why this matters

The friction of "compile then run" was a real reason people avoided TS for small tools. Removing that friction means you can now get type safety (Module 7.1) for *even small* tooling scripts at almost no cost. It nudges the "is TS worth it here?" calculation toward "yes" more often.

> [!TRY]
> Create `hello.ts` with `const n: number = 42; console.log(n * 2);` and run `node hello.ts`. It just works. Now add an `enum Color { Red }` and run again — you'll likely see an error about non-erasable syntax. Replace the enum with `const Color = { Red: 0 } as const;` and watch it run. You've met the erasable-only constraint firsthand.

> [!KEY]
> - In 2026, run TypeScript **directly**: `node script.ts` strips types and runs — no compile step, no `.js` artifacts.
> - Native stripping **erases but does not check** types; run **`tsc --noEmit`** separately (and in CI) to actually verify them. *Node runs; tsc checks.*
> - Stripping requires **erasable-only** TS — avoid `enum`, `namespace`, and parameter properties (use `const` objects, unions, explicit assignments).
> - **`tsx`** is the mature alternative (a dependency) with watch mode and full feature support.
> - Default: run with native `node x.ts` (or `tsx`), **type-check with `tsc`** — fast iteration plus real safety.
