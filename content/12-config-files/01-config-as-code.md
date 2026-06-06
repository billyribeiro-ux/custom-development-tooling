# Why Config-as-Code Beats Static Config

You've met static config formats — JSON (Module 8), TOML (Module 10), and you'll meet YAML (Module 15). But many modern tools use a *different* approach: configuration written as **executable code** in a `*.config.js` or `*.config.mjs` file. This lesson explains why that shift happened and when code-as-config is the right call.

## Static config: data only

A static config file is pure *data* — JSON, TOML, YAML. It can describe values but cannot *compute* anything:

```json title=static.config.json
{
  "outDir": "dist",
  "minify": true,
  "port": 8080
}
```

This is perfect when config is genuinely just data. It's declarative, easy to validate, and tools can read it without executing anything (safer). For simple settings, static config is the right choice — don't reach for code when data suffices.

## The limits of static config

But real config often *wants* logic, and data formats can't express it:

```text title=things-static-config-cant-do
- "use port from the environment, or 8080 if unset"
- "minify only in production"
- "import this shared base config and extend it"
- "compute this list of paths from a glob"
- comments explaining WHY a setting exists (JSON can't even do this)
```

With static config, you're stuck: you either hard-code values (so the same file can't adapt to dev vs prod), or you bolt on a separate templating/preprocessing step. Both are awkward.

## Config-as-code: a file that exports config

The alternative: write the config as a *code module* that **exports** a config object. Because it's code, it can use variables, conditionals, imports, the environment, and comments:

```javascript title=app.config.mjs
const isProd = process.env.NODE_ENV === 'production';

export default {
  outDir: 'dist',
  minify: isProd,                              // logic! minify only in prod
  port: Number(process.env.PORT ?? 8080),      // read the environment with a default
  plugins: [
    'core',
    isProd && 'analytics',                     // conditionally include a plugin
  ].filter(Boolean),
};
```

The tool *imports* this file and uses the exported object. Now the *same* config file behaves differently across environments, reads the environment, and documents itself with comments — none of which static JSON can do.

## Why modern tools adopted it

Look at the configuration files of popular 2026 tools: `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts` (Module 16), `eslint.config.js` (flat config), `astro.config.mjs`, `tailwind.config.js`. They're *all* config-as-code. The ecosystem converged on it because:

1. **Logic.** Branch on environment, compute values, build lists programmatically.
2. **Reuse.** `import` a shared base config and extend it (DRY across projects/packages).
3. **Types.** A `.ts` config gets type-checking and autocomplete (Module 7.1) — the tool ships types for its config shape, so your editor guides you and catches typos *as you type*.
4. **Comments and expressiveness.** It's code, so you can explain, refactor, and structure it freely.

> [!NOTE]
> This connects directly to Module 4.3's "config over code" and the `defineConfig` pattern (Module 12.3): tools accept a *declarative description* of what you want, but let you *compute* that description with code. You get the clarity of declarative config plus the power of a real language. It's the best of both worlds — which is exactly why it won.

## The trade-offs (be honest)

Config-as-code isn't free:

- **It executes.** A static JSON file just sits there; a config *module* runs code when loaded. That's more power but also more that can go wrong (and a minor security consideration — you're running a file).
- **It's harder for *other tools* to read.** A CI dashboard or another program can parse JSON trivially; parsing a JS config means *executing* it. Static config is more *interoperable*.
- **It can hide complexity.** A config file with heavy logic can become a mini-program that's hard to follow. Keep config code *simple* — mostly data, with light logic.

> [!WARNING]
> Don't turn config-as-code into a tangled program. The goal is config that's *mostly declarative* with a *little* logic (an environment check, a default). If your config file has loops, complex functions, and hundreds of lines, you've gone too far — extract that logic into a proper module and keep the config file readable. Config should still *read like config*.

## How to choose

| Use static config (JSON/TOML/YAML) when... | Use config-as-code (.config.mjs) when... |
| --- | --- |
| It's purely data | You need logic (env branches, computed values) |
| Other tools must read it | You want to import/extend a base config |
| You want maximum safety/interop | You want types + autocomplete on the config |
| Simple, stable settings | Config varies by environment |

The decision mirrors every "match the tool to the task" call in this course (Module 6.5, 11.6). Most projects use *both*: static config where data suffices (`package.json`, `tsconfig.json`), config-as-code where logic helps (`playwright.config.ts`, `vite.config.ts`).

> [!DOGFOOD]
> This course includes `examples/config/site.config.mjs` (narrated in Module 12.4) — a config-as-code file that reads `process.env.NODE_ENV` to choose a base URL and toggle minification, something a static JSON file couldn't do. Meanwhile the course uses *static* config (`course.json`, `tsconfig.json`, `pyproject.toml`) where the content is just data. Both approaches, each where it fits.

> [!TRY]
> Take a static JSON config you have and identify one value that *should* differ between dev and prod (a URL, a flag, a port). Notice you can't express that in JSON without duplication. That limitation — and how a `.config.mjs` with `process.env.NODE_ENV` solves it — is the whole motivation for config-as-code.

> [!KEY]
> - **Static config** (JSON/TOML/YAML) is pure data — great when config *is* just data, and maximally interoperable/safe.
> - **Config-as-code** (`*.config.mjs`) is a module that **exports** config, so it can use logic, the environment, imports, comments, and types.
> - Modern tools (Vite, Vitest, Playwright, ESLint flat config) adopted it for **logic, reuse, type-safety, and expressiveness**.
> - Trade-offs: it **executes** (more power, less interop, a security consideration) — keep config code **mostly declarative with light logic**.
> - Use static for pure data and interop; use config-as-code when config needs **logic or varies by environment**. Most projects use both.
