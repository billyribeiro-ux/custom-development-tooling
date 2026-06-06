# package.json Deep Dive

`package.json` is the control center of every Node/JavaScript project. It declares what the project is, what it depends on, and — most relevant to tooling — defines the *commands* you run. If you understand this one file deeply, you understand how JS projects are wired together.

## What package.json is

It's a strict-JSON file (Module 8.1 — no comments, no trailing commas) at the root of a project. Tools read it: `npm` for dependencies and scripts, Node for module resolution, registries for publishing. Here's an annotated tour of the fields that matter.

## Identity fields

```json title=package.json
{
  "name": "custom-development-tooling",
  "version": "1.0.0",
  "description": "A self-hosted course on custom tooling.",
  "private": true,
  "license": "MIT",
  "type": "module"
}
```

- **`name`** + **`version`** identify the package. `version` follows *semver* (Module 17.4): `MAJOR.MINOR.PATCH`.
- **`private": true`** prevents accidental publishing to the npm registry — set it on anything that isn't a public package (apps, course repos, internal tools).
- **`type": "module"`** makes `.js` files ESM (Module 5.1). The single most important field for modern projects.

## scripts: the project's verbs

This is the tooling heart of `package.json`. The `scripts` object defines named commands you run with `npm run <name>`:

```json title=package.json
{
  "scripts": {
    "build": "node tools/generate-pages.mjs",
    "build:py": "python3 tools/generate-pages.py",
    "serve": "node tools/serve.mjs",
    "test:e2e": "playwright test",
    "clean": "node --eval \"import('node:fs').then(fs => fs.rmSync('site', {recursive:true, force:true}))\""
  }
}
```

```bash title=run-scripts.sh
npm run build       # runs: node tools/generate-pages.mjs
npm run serve       # runs: node tools/serve.mjs
npm test            # "test" and "start" can drop the "run": npm test
```

Scripts are the *named entry points* to your tooling (the same idea a `Makefile` generalizes across languages — Module 11). They give a project a consistent vocabulary: `build`, `test`, `lint`, `serve`. A newcomer reads `scripts` and instantly knows how to operate the project.

> [!TIP]
> Inside a script, npm puts `node_modules/.bin` on the `PATH` (Module 2.2) automatically. So `"test:e2e": "playwright test"` works even though `playwright` isn't globally installed — npm finds the locally-installed binary. This is why you can call `eslint`, `tsc`, `playwright` directly in scripts without `npx`. A small, lovely convenience built on the PATH mechanics you already understand.

> [!DOGFOOD]
> Open this repo's `package.json` and look at `scripts`. `npm run build` builds the site; `npm run build:py` runs the Python generator; `npm run test:e2e` runs Playwright. These are the same commands the `Makefile` (Module 11) and CI (Module 15) call — one definition, many callers.

## dependencies vs devDependencies

```json title=package.json
{
  "dependencies": {
    "marked": "12.0.2"
  },
  "devDependencies": {
    "@playwright/test": "1.60.0",
    "typescript": "5.7.3",
    "@types/node": "22.10.5"
  }
}
```

- **`dependencies`** — packages needed *to run* the project in production.
- **`devDependencies`** — packages needed only *to develop/build/test* (test runners, type-checkers, build tools).

The distinction matters for what ships: `npm install --omit=dev` (or `npm ci` in a production Docker stage) skips devDependencies, producing a smaller, leaner production install. Put test/build tools in `devDependencies`; only true runtime needs go in `dependencies`.

> [!GOTCHA]
> Misclassifying dependencies is common and causes two failure modes: a build tool in `dependencies` bloats production with code it never runs, while a runtime package accidentally in `devDependencies` makes production crash with "Cannot find module" (because prod installs skipped it). Ask: "does the *running app* need this, or only the *build/test*?" That answer picks the field.

## Version ranges and the caret

Dependency versions usually have a prefix that controls *how much* they may update:

```json title=version-ranges.json
{
  "dependencies": {
    "exact": "1.2.3",
    "caret": "^1.2.3",
    "tilde": "~1.2.3"
  }
}
```

- **`1.2.3`** — exactly this version.
- **`^1.2.3`** (caret) — this *or* any newer *compatible* version (`>=1.2.3 <2.0.0`). Allows minor and patch updates. The npm default.
- **`~1.2.3`** (tilde) — patch updates only (`>=1.2.3 <1.3.0`).

> [!NOTE]
> Caret ranges let you get bug fixes without manual updates, but mean two `npm install`s at different times could fetch different versions — which is exactly why the **lockfile** exists (Module 8.4): it pins the *actual* resolved versions for reproducibility (Module 1.3). The range says "what's acceptable"; the lockfile records "what we actually got."

## Other useful fields

```json title=more-fields.json
{
  "engines": { "node": ">=22" },
  "bin": { "mytool": "./cli.mjs" },
  "exports": { ".": "./index.mjs" },
  "main": "./index.mjs",
  "files": ["dist", "README.md"]
}
```

- **`engines`** — declares required runtime versions; tools warn (or refuse) if the environment doesn't match. Great for "this needs Node 22+."
- **`bin`** — maps a command name to a script, so installing the package adds a CLI to the user's `PATH`. This is how `npm`-installed tools become commands.
- **`exports`/`main`** — the entry points when someone imports your package.
- **`files`** — what gets included when publishing (an allowlist).

## The mental model

`package.json` answers four questions about a project: *what is it* (name/version/type), *what does it need* (dependencies/devDependencies/engines), *how do I operate it* (scripts), and *how is it published* (bin/exports/files). When you open an unfamiliar JS project, read `package.json` first — especially `scripts` — and you'll know how to build, test, and run it in 30 seconds.

> [!TRY]
> In any Node project, run `npm run` with no script name — npm lists all available scripts. Then read the `scripts` object directly. You've just learned the project's entire command vocabulary without reading a README.

> [!KEY]
> - `package.json` is strict JSON at a project's root; it declares identity, dependencies, **scripts**, and publishing config.
> - **`scripts`** define the project's named commands (`npm run build`) — its verbs; npm puts `node_modules/.bin` on PATH so local tools "just work."
> - **`dependencies`** = needed at runtime; **`devDependencies`** = needed only to build/test. Misclassifying bloats prod or crashes it.
> - Version ranges (`^`, `~`, exact) say what's *acceptable*; the **lockfile** records what's *actually installed* (Module 8.4).
> - `type: "module"`, `engines`, and `bin` are key fields; reading `package.json` (especially `scripts`) is the fastest way to understand a JS project.
