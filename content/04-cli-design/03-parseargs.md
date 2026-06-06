# Parsing Args in Node 22 with util.parseArgs

For years, parsing arguments in Node meant reaching for a library (`yargs`, `commander`, `minimist`). As of recent Node versions, there's a **built-in** parser — `util.parseArgs` — that handles the common cases with zero dependencies. For tooling, where you want scripts that "just run," built-in is a big deal.

## Why built-in matters for tooling

Recall Module 1's reproducibility principle: every dependency is something that can break, need updating, or disappear. A tooling script with *zero* dependencies always runs — no `npm install` step, no version conflicts. `util.parseArgs` lets you build a proper CLI with nothing but Node itself.

> [!DOGFOOD]
> This course's `generate-pages.mjs` uses `util.parseArgs` and the `marked` library — that's *one* dependency for the whole build. The argument parsing adds zero. That's deliberate: fewer dependencies, more reliability.

## The basics

```javascript title=parseargs-basic.mjs
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  options: {
    verbose: { type: 'boolean', short: 'v' },
    output: { type: 'string', short: 'o', default: 'out.txt' },
    help: { type: 'boolean', short: 'h' },
  },
  allowPositionals: true,    // permit non-flag arguments
});

console.log(values);        // { output: 'out.txt', ... }  parsed flags
console.log(positionals);   // [ 'input1', 'input2' ]      everything else
```

Run it:

```bash title=run-parseargs.sh
node tool.mjs --verbose --output result.txt input1 input2
node tool.mjs -v -o result.txt input1 input2     # short forms work too
# values = { verbose: true, output: 'result.txt', help: undefined }
# positionals = [ 'input1', 'input2' ]
```

The shape is clean: you *declare* your options as data, and `parseArgs` returns `values` (the flags) and `positionals` (the rest). No manual looping.

## The options object, field by field

```javascript title=options-explained.mjs
options: {
  output: {
    type: 'string',      // 'string' (takes a value) or 'boolean' (flag)
    short: 'o',          // optional single-char alias: -o
    default: 'out.txt',  // value when the flag is absent
    multiple: false,     // true -> collect repeated flags into an array
  },
}
```

- **`type`** is required: `'boolean'` for on/off flags, `'string'` for options that take a value.
- **`short`** maps a single-letter alias, so `-o` works like `--output`.
- **`default`** supplies a value when the flag isn't passed (cleaner than `??` everywhere).
- **`multiple: true`** lets a flag repeat: `--tag a --tag b` becomes `['a', 'b']`.

## A complete, real CLI

Here's a production-shaped script with help text and validation:

```javascript title=build.mjs
#!/usr/bin/env node
import { parseArgs } from 'node:util';

function main() {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        out: { type: 'string', default: 'site' },
        base: { type: 'string', default: '/' },
        watch: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: true,
    });
  } catch (err) {
    // parseArgs THROWS on unknown flags or missing values — catch for a clean message
    console.error(`error: ${err.message}`);
    process.exit(64);                 // EX_USAGE
  }

  const { values, positionals } = parsed;

  if (values.help) {
    console.log(`build — generate the site

Usage: build [--out <dir>] [--base <path>] [--watch]

Options:
  --out <dir>    output directory (default: site)
  --base <path>  base URL path (default: /)
  --watch        rebuild on changes
  -h, --help     show this help`);
    process.exit(0);
  }

  console.log(`building into ${values.out} (base ${values.base})`);
  if (values.watch) console.log('watching for changes...');
}

main();
```

> [!TIP]
> `parseArgs` **throws** on invalid input (unknown option, a string option missing its value). Wrap it in `try/catch` to turn that into a friendly one-line error and an `exit(64)`, rather than dumping a stack trace at the user. Good tools fail with a message, not a traceback (Module 2.5).

## What parseArgs does and doesn't do

`parseArgs` deliberately stays small. It does **not** generate help text for you, validate that required options are present, or handle subcommands. You write those yourself (as above) — which is easy, and keeps the API tiny.

> [!NOTE]
> If you genuinely need rich features — auto-generated help, nested subcommands, typed coercion, shell completion — a library like `commander` or `yargs` is worth the dependency. The decision mirrors Module 4.2: match the tool to the complexity. For *most* tooling scripts, built-in `parseArgs` is the sweet spot: real flags, no dependencies.

## The mental model

Compare to bash: where `getopts` made you *loop and switch*, `parseArgs` makes you *declare and receive*. You describe your CLI as a data structure, and Node hands back parsed results. This "configuration over code" shape is everywhere in modern tooling — you'll see it again in Python's `argparse`, in config files (Module 12), and in Playwright's config (Module 16).

> [!TRY]
> Save `build.mjs` and run it three ways: `node build.mjs --help`, `node build.mjs --out dist --watch`, and `node build.mjs --bogus`. Watch the help print, the values parse, and the unknown flag produce your clean error with exit code 64 (check `echo $?`).

> [!KEY]
> - Node's built-in **`util.parseArgs`** parses CLIs with **zero dependencies** — ideal for reliable tooling.
> - You **declare** options (`type`, `short`, `default`, `multiple`) and receive `{ values, positionals }`.
> - It **throws** on bad input — catch it for a friendly message and `exit(64)`.
> - It's intentionally minimal: write your own `--help` and validation (easy); reach for `commander`/`yargs` only for complex CLIs.
> - The shape is **declare-and-receive** ("config over code") — a pattern you'll see throughout modern tooling.
