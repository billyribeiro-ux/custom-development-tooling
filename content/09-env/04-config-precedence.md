# Config Precedence: defaults → file → env → flags

Real tools accept configuration from *several* sources at once: built-in defaults, a config file, environment variables, and command-line flags. What happens when two sources disagree? You need a clear, predictable **precedence** order. Getting this right makes a tool feel intuitive; getting it wrong makes it baffling.

## The standard precedence chain

The widely-adopted order, from *lowest* priority (most easily overridden) to *highest* (wins over everything):

```text title=precedence-low-to-high
1. built-in defaults     (lowest  — the fallback when nothing else is set)
2. config file           (project-level settings, e.g. config.json)
3. environment variables (per-environment / per-machine settings, .env)
4. command-line flags    (highest — explicit, one-off overrides)
```

The principle behind the order: **the more specific and intentional a source, the higher its priority.** A default is generic; a flag you typed *right now* is maximally specific and intentional, so it wins. Each layer overrides the ones below it.

## Why this order makes sense

Walk through it from the user's perspective:

- **Defaults** ensure the tool works out of the box with zero config.
- **A config file** lets a project set its standard values (committed, shared by the team).
- **Environment variables** let each *machine or environment* differ (your laptop vs CI vs prod) without editing the committed file — and carry secrets (Module 9.1).
- **Command-line flags** let you override *anything* for a single run, without changing any file: `--port 9000` just this once.

```bash title=precedence-in-action.sh
# Default port is 3000.
myapp                          # uses 3000 (default)
# config.json sets "port": 8080
myapp                          # uses 8080 (file beats default)
# .env sets PORT=8081
myapp                          # uses 8081 (env beats file)
# explicit flag:
myapp --port 9000              # uses 9000 (flag beats everything)
```

Each more-specific source wins. This is exactly what users expect: "the thing I just typed should take effect."

## Implementing it

The implementation is a layered merge — start with defaults and let each higher layer override. Recall the shallow-merge spread from Module 8.5:

```javascript title=merge-config.mjs
import { parseArgs } from 'node:util';

const DEFAULTS = { port: 3000, logLevel: 'info', outDir: 'site' };

function loadConfig(fileConfig, flags) {
  // Pull relevant values from the environment (Module 9.2)
  const fromEnv = {};
  if (process.env.PORT) fromEnv.port = Number(process.env.PORT);
  if (process.env.LOG_LEVEL) fromEnv.logLevel = process.env.LOG_LEVEL;

  // Pull only the flags the user actually passed (undefined ones must NOT override)
  const fromFlags = {};
  if (flags.port !== undefined) fromFlags.port = Number(flags.port);
  if (flags.logLevel !== undefined) fromFlags.logLevel = flags.logLevel;

  // Merge low-to-high: each layer overrides the previous (Module 8.5)
  return { ...DEFAULTS, ...fileConfig, ...fromEnv, ...fromFlags };
}
```

The spread order *is* the precedence: `DEFAULTS` first, then file, then env, then flags last (highest priority). Read left-to-right as low-to-high.

> [!GOTCHA]
> The subtle bug: an *absent* flag must **not** override a lower layer. If `parseArgs` gives `flags.port === undefined` when `--port` wasn't passed, blindly spreading `{ port: flags.port }` would overwrite the env/file value with `undefined`, wiping it out. That's why the code above only copies flags the user *actually provided* (`if (flags.port !== undefined)`). "Not specified" must mean "don't touch," not "set to undefined." This trips up a *lot* of config code.

## Type coercion at the boundary

Environment variables and many flag values arrive as **strings** (Module 2.3). Convert them to the right type *as you read them*, at the boundary, so the rest of your code works with proper types:

```javascript title=coercion.mjs
const port = Number(process.env.PORT ?? 8080);          // string -> number
const debug = process.env.DEBUG === 'true';              // string -> boolean
const tags = (process.env.TAGS ?? '').split(',').filter(Boolean);  // string -> array
```

> [!WARNING]
> `Number(process.env.PORT)` returns `NaN` if `PORT` is set but not numeric (e.g. a typo `PORT=80a0`). `NaN` then propagates into confusing failures. Validate after coercing — `if (Number.isNaN(port)) throw ...` — which leads directly into Module 9.5's "validate at startup." Coerce, then check.

## Documenting precedence

Because precedence is invisible (you can't *see* which layer won), document it in your `--help` or README:

```text title=help-excerpt
Configuration is resolved in this order (later overrides earlier):
  defaults  <  config.json  <  environment variables  <  command-line flags
```

A user debugging "why is the port 8081?!" can then check each layer. Without documentation, surprising precedence feels like a bug.

> [!TIP]
> Add a `--print-config` or debug-log option that shows the *final, resolved* config and ideally *where each value came from*. When someone is confused about why a setting has a certain value, this turns a frustrating mystery into a one-command answer. Excellent tools make their effective configuration inspectable.

## The mental model

Picture config as **transparent sheets stacked on a lightbox**: defaults on the bottom, then the file, then env, then flags on top. Looking down, you see the topmost value for each setting; lower layers show through only where the upper ones are blank. Every config-driven tool you'll use (and build) follows some version of this stack.

> [!DOGFOOD]
> This course's generator uses a small version of this: `--out` flag defaults to `'site'`, and `.env.example` documents `SITE_OUTPUT_DIR` as an alternative source. A fuller build of it would resolve `out` as `flag ?? env.SITE_OUTPUT_DIR ?? 'site'` — flag beats env beats default, exactly this precedence.

> [!TRY]
> Implement `loadConfig` like the example. Test the chain: run with nothing (gets default), set a value in a config object (file beats default), set the env var (env beats file), pass a flag (flag beats all). Then confirm that *omitting* the flag doesn't wipe the env value — that's the gotcha you must get right.

> [!KEY]
> - Resolve config from multiple sources in a clear order: **defaults < config file < environment variables < command-line flags** (low to high).
> - The principle: **more specific/intentional sources win** — a flag you just typed beats a generic default.
> - Implement as a **layered merge** (`{ ...DEFAULTS, ...file, ...env, ...flags }`) — spread order *is* precedence.
> - **An absent flag must not override** lower layers — only apply values the user actually provided (don't spread `undefined`).
> - **Coerce string env/flag values to types at the boundary**, then validate (Module 9.5); **document precedence** and offer a `--print-config` for debugging.
