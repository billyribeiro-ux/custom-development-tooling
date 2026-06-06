# Writing Tools That Read & Merge JSON Safely

A huge amount of tooling *reads configuration* — your own `course.json`, a user's settings, a `package.json`. Doing this *safely* (handling missing files, bad JSON, missing fields, and merging defaults) is a skill that separates robust tools from ones that crash on the first surprise. Let's build the patterns.

## The naive version (and why it breaks)

```javascript title=naive.mjs
import { readFile } from 'node:fs/promises';
const config = JSON.parse(await readFile('config.json', 'utf8'));
console.log(config.settings.theme);   // 💥 crashes three different ways
```

This one-liner can fail in three distinct ways, each needing different handling:

1. The file **doesn't exist** → `readFile` throws `ENOENT`.
2. The file exists but is **invalid JSON** (a trailing comma!) → `JSON.parse` throws `SyntaxError`.
3. The JSON is valid but **missing fields** → `config.settings` is `undefined`, so `.theme` throws "Cannot read properties of undefined."

Robust config loading handles all three with clear messages.

## Handling a missing or optional file

```javascript title=optional-config.mjs
import { readFile } from 'node:fs/promises';

async function loadConfig(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return {};        // missing is OK — use empty (defaults fill in)
    if (err instanceof SyntaxError) {
      throw new Error(`config at ${path} is not valid JSON: ${err.message}`);
    }
    throw err;                                     // unexpected — let it crash (Module 5.5)
  }
}
```

This distinguishes the three cases (Module 5.5's "handle expected, rethrow unexpected"): a *missing* file is fine (fall back to defaults), *invalid JSON* gets a helpful message naming the file, and anything else propagates. Compare the vague "Unexpected token" the naive version would give — this tells the user *which file* is broken.

## Merging with defaults

Configs almost always need defaults: the user specifies a few values, your tool fills in the rest. The clean way uses object spread:

```javascript title=defaults.mjs
const DEFAULTS = {
  outDir: 'site',
  basePath: '/',
  minify: false,
};

function withDefaults(userConfig) {
  return { ...DEFAULTS, ...userConfig };   // user values OVERRIDE defaults
}

withDefaults({ minify: true });
// { outDir: 'site', basePath: '/', minify: true }  — defaults + the one override
```

The order matters: `{ ...DEFAULTS, ...userConfig }` means defaults first, then user values *override* them. This is the foundation of config precedence (Module 9.4 develops the full chain: defaults → file → env → flags).

> [!GOTCHA]
> **Spread is a *shallow* merge.** For nested objects, `{ ...DEFAULTS, ...user }` *replaces* a whole nested object instead of merging it:
> ```javascript title=shallow-trap.mjs
> const DEFAULTS = { server: { port: 8080, host: 'localhost' } };
> const user = { server: { port: 3000 } };
> ({ ...DEFAULTS, ...user });   // { server: { port: 3000 } } — host is GONE!
> ```
> The user's `server` object *replaced* the default `server` entirely, losing `host`. For nested config you need a *deep* merge (merge each level), or keep your config shape flat to avoid the problem. Many real bugs hide here — be aware.

## Validating the shape

Reading the config isn't enough — you should *validate* it, so a typo'd or wrong-typed value fails *fast* with a clear message rather than causing weird behavior later (Module 5.5, and Module 9.5's "validate at startup"):

```javascript title=validate.mjs
function validateConfig(cfg) {
  if (typeof cfg.outDir !== 'string') {
    throw new Error(`config: "outDir" must be a string, got ${typeof cfg.outDir}`);
  }
  if (cfg.minify !== undefined && typeof cfg.minify !== 'boolean') {
    throw new Error(`config: "minify" must be a boolean`);
  }
  return cfg;
}
```

For simple tools, hand-written checks like this are perfectly fine and very readable. For complex config, a *schema validation library* (Zod, Ajv with JSON Schema) declares the expected shape once and validates against it — worth the dependency when config is large or user-facing.

> [!TIP]
> If your tooling is in TypeScript (Module 7), you get *some* of this for free: typing the config shape catches mistakes in *your* code. But types are erased at runtime (Module 7.1), so they **don't** validate the *actual file contents* a user provides — for that you still need runtime validation (hand-written or a schema library). Types guard your code; runtime checks guard the data.

## The complete safe loader

Putting it all together — a reusable pattern for any config-reading tool:

```javascript title=load-config.mjs
import { readFile } from 'node:fs/promises';

const DEFAULTS = { outDir: 'site', basePath: '/', minify: false };

export async function loadConfig(path = 'config.json') {
  let userConfig = {};
  try {
    userConfig = JSON.parse(await readFile(path, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') {                 // missing file -> defaults; anything else is real
      throw new Error(`failed to load ${path}: ${err.message}`, { cause: err });
    }
  }
  const config = { ...DEFAULTS, ...userConfig }; // merge (shallow — see gotcha)
  validateConfig(config);                         // fail fast on bad values
  return config;
}
```

This handles the three failure modes, merges defaults, and validates — so the *rest* of your tool can trust the config completely and never re-check it. That's the goal: push all the messiness to the boundary (Module 1.5's "validate inputs"), and let the core logic assume clean data.

> [!DOGFOOD]
> This course's generator reads `course.json` with `JSON.parse(await readFile(...))`, and the `main().catch()` wrapper (Module 5.5/5.7) turns any parse failure into a clean "Build failed" with a non-zero exit — so a malformed manifest fails CI loudly instead of producing a broken site. The manifest is also strict JSON (no comments) precisely because `JSON.parse` reads it (Module 8.1).

> [!TRY]
> Write a `loadConfig` like the one above. Test it three ways: a missing file (should return defaults), a file with a trailing comma (should throw your clear "not valid JSON" message), and a file with `{"minify": "yes"}` (your validation should reject the non-boolean). Handling all three is what "robust" means.

> [!KEY]
> - Reading config can fail three ways: **missing file** (`ENOENT`), **invalid JSON** (`SyntaxError`), and **missing/wrong fields** — handle each distinctly.
> - Treat a missing file as "use defaults"; give invalid JSON a message **naming the file**; rethrow the unexpected.
> - Merge defaults with **`{ ...DEFAULTS, ...userConfig }`** (user overrides) — but beware: spread is **shallow**, so nested objects get replaced, not merged.
> - **Validate the shape** so bad values fail fast with clear messages (hand-written for simple tools; a schema library for complex ones).
> - TypeScript types guard *your code* but not the *file's contents* — runtime validation is still needed. Push all checks to the boundary so core logic trusts the config.
