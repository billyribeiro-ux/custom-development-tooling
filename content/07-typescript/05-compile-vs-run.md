# Compiling vs Running On the Fly: Trade-offs

You've seen two ways to execute TypeScript: *compile it to JavaScript first* (`tsc` then `node`), or *run it on the fly* (`node x.ts` / `tsx`). This lesson untangles when to use which — a decision that confuses many developers because the "right" answer depends on whether you're building *tooling* or shipping an *application*.

## Three distinct jobs (don't conflate them)

The confusion comes from bundling three separate concerns under "TypeScript." Keep them apart:

1. **Type-checking** — verifying your types are correct. Job of `tsc --noEmit`. Catches bugs.
2. **Running** — executing the code. Job of `node` (native stripping) or `tsx`. Produces behavior.
3. **Compiling/emitting** — producing `.js` files to distribute. Job of `tsc` (with emit) or a bundler.

Once you see these as three jobs, the trade-offs clarify: you *always* want #1, you need #2 to run anything, and you only need #3 when you're *shipping* compiled artifacts.

## Running on the fly: best for tooling

For tooling scripts, run TypeScript directly (Module 7.2):

```bash title=on-the-fly.sh
node build.ts          # native stripping — no artifacts
npx tsx build.ts       # tsx — no artifacts, watch mode available
```

**Pros:**
- No build step — edit and run, tightest feedback loop (Module 1.2).
- No `.js` artifacts cluttering your repo (and nothing to gitignore or accidentally commit, Module 1.3).
- Simpler mental model: the `.ts` file *is* the program.

**Cons:**
- Slight per-run startup cost to strip/transform (negligible for scripts).
- Doesn't type-check (you run `tsc --noEmit` separately).
- Native stripping needs erasable-only TS (Module 7.2).

This is the right default for *tooling*, where you run scripts during development and in CI but never "ship" them as compiled files.

## Compiling ahead of time: best for shipping

When you're *distributing* code — publishing an npm package, deploying a production server — you compile to `.js` ahead of time:

```bash title=compile.sh
tsc                    # emit .js files to the output dir (per tsconfig)
node dist/server.js    # run the compiled output
```

**Pros:**
- The runtime needs no TypeScript at all — just plain JS. Faster startup, fewer dependencies in production.
- One canonical, type-checked output. Compile once, run many times.
- Required for publishing libraries (consumers get `.js` + `.d.ts` type definitions).

**Cons:**
- A build step to manage and an output directory to handle.
- `.js` artifacts to generate (and *not* commit — they're derived, Module 1.3).

This is the right default for *applications and libraries* you deploy or publish.

## The decision, summarized

| You are... | Do this | Why |
| --- | --- | --- |
| Writing a build/tooling script | run on the fly (`node x.ts`/`tsx`) + `tsc --noEmit` to check | no artifacts, fast iteration |
| Deploying a production server | compile (`tsc`) and run the `.js` | no TS in production, fast startup |
| Publishing an npm library | compile (`tsc`, emit `.js` + `.d.ts`) | consumers need plain JS + types |
| Running tests | run on the fly (test runners handle TS) | speed, no artifacts |

> [!TIP]
> Notice that in *every* row, you still type-check with `tsc --noEmit` (in CI). Checking is universal; only the *running/shipping* strategy changes. Separating "check" from "run/emit" is the key insight — don't let `tsc` do triple duty in your head.

## Why this matters for tooling specifically

This whole course is about tooling, so the takeaway is: **for your tooling, run TypeScript on the fly and check it separately.** Don't set up a compile step for build scripts — it's friction with no benefit, since you never distribute the scripts. Reserve compilation for the app/library you're actually shipping.

> [!GOTCHA]
> A common mis-step: people set up a heavy `tsc` build for their *tooling* scripts, generating `.js` files they then run, complicating the repo for no reason. Tooling isn't shipped — it runs in place. Use native stripping or `tsx`. Conversely, don't try to run a *production server* via `tsx` in production "to skip the build" — there, a compiled artifact is faster and more robust. Match the strategy to whether you're shipping.

## Bundlers: the third option (briefly)

For *applications*, you'll often meet **bundlers** (Vite, esbuild, Rollup, webpack) rather than raw `tsc`. A bundler compiles *and* combines many files into optimized output for the browser, often handling TS along the way. That's an app-build concern beyond tooling scripts — just know that "compile" in the app world usually means "bundle," and bundlers typically *don't* type-check either (so, again, you run `tsc --noEmit` separately). The pattern is remarkably consistent.

> [!DOGFOOD]
> This course never compiles its TypeScript. `build-assets.ts` and the Playwright tests *run on the fly* (Node strips types; Playwright runs `.ts` natively), and CI runs `tsc --noEmit` to check them (Module 15). There's no `dist/` of compiled tooling — because tooling isn't shipped. That's this lesson, applied.

> [!TRY]
> In the repo, run `node examples/typescript/build-assets.ts` (runs on the fly, no artifacts) and confirm no `.js` file was created next to it. Then run `npx tsc --noEmit` (checks, emits nothing). You've used the two jobs — run and check — without ever compiling. That's the tooling workflow.

> [!KEY]
> - Separate **three jobs**: **type-checking** (`tsc --noEmit`), **running** (`node`/`tsx`), and **compiling/emitting** (`tsc` with output).
> - For **tooling**: run on the fly (no artifacts, fast iteration) and type-check separately — don't set up a compile step.
> - For **shipping** (servers, libraries): compile ahead of time so production needs no TypeScript.
> - **Type-checking with `tsc --noEmit` is universal** (always in CI); only the run/ship strategy varies.
> - Bundlers (Vite/esbuild) are the app-world "compile" and also don't type-check — same pattern: check separately.
