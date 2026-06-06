# Loading env in Node 22 (--env-file) and Python

A `.env` file just sits there until *something reads it* (Module 9.1). For years that "something" was a library — `dotenv` in Node, `python-dotenv` in Python. In 2026, Node has it built in. Let's cover the modern, dependency-free ways to load `.env`, plus the still-common library approach you'll see in existing code.

## Node 22: the built-in --env-file

Modern Node loads a `.env` file with a single flag — no `npm install`, no `import`, no code:

```bash title=node-env-file.sh
node --env-file=.env app.mjs
```

```javascript title=app.mjs
// No dotenv import needed — the variables are already in process.env:
console.log(process.env.DATABASE_URL);
console.log(process.env.PORT ?? '3000');   // still supply a default (Module 2.3)
```

That's the whole thing. `--env-file=.env` reads the file and populates `process.env` *before* your code runs, so `process.env.DATABASE_URL` just works. This is the dependency-free 2026 default (the same "built-in beats a library" theme as `parseArgs` in Module 4.3 and `node:sqlite` in Module 5).

```bash title=multiple-env-files.sh
# Load several, later files override earlier ones (precedence! Module 9.4):
node --env-file=.env --env-file=.env.local app.mjs

# Tolerate a missing file (don't error if it's not there):
node --env-file-if-exists=.env app.mjs
```

> [!TIP]
> Put `--env-file` in your `package.json` scripts so it's automatic: `"dev": "node --env-file=.env server.mjs"`. Then `npm run dev` loads the environment every time, and nobody has to remember the flag. Bake the convenience into the tooling.

## The library way (dotenv) — still everywhere

Lots of existing projects (and some setups that need more features) use the `dotenv` library. You'll see this constantly, so recognize it:

```javascript title=dotenv-lib.mjs
import 'dotenv/config';     // side-effect import: loads .env into process.env immediately
// or, explicitly:
import dotenv from 'dotenv';
dotenv.config();            // same effect, with options available

console.log(process.env.DATABASE_URL);
```

> [!GOTCHA]
> With the library, **load `.env` before any code that reads those variables.** A common bug: a module at the top of your file reads `process.env.X` *during import*, but `dotenv.config()` runs *after* that import — so `X` is undefined. That's why you see `import 'dotenv/config'` as the *very first* line. The built-in `--env-file` avoids this entirely, since it loads before *any* of your code runs. One more reason to prefer it.

## Python: python-dotenv

Python's standard library does *not* read `.env` files, so Python projects use the `python-dotenv` package:

```python title=python_dotenv.py
from dotenv import load_dotenv   # pip install python-dotenv
import os

load_dotenv()                     # reads .env into os.environ (Module 6.2)

database_url = os.environ.get("DATABASE_URL")
port = os.environ.get("PORT", "3000")   # default for missing (Module 2.3)
```

`load_dotenv()` finds and reads `.env`, populating `os.environ`. Like the Node library, call it *early*, before code that reads those variables.

```python title=load-dotenv-options.py
from dotenv import load_dotenv
load_dotenv(".env.local", override=True)   # specific file; override existing env vars
```

> [!NOTE]
> By default, both `dotenv` and `--env-file` **do not override** variables already set in the real environment — the actual environment wins over the file. That's intentional and important: in production, the platform sets real env vars, and you don't want a stray `.env` file to override them. The file fills in what's *missing*; the real environment takes precedence. (This is precedence, the topic of Module 9.4.)

## A subtle but vital point: the file is for development

In *production*, you usually **don't** ship a `.env` file at all. The hosting platform (or container orchestrator, or CI secret store) injects environment variables directly into the process. Your code reads them identically (`process.env.X` / `os.environ`), but the *source* differs:

```text title=where-values-come-from
Development:  .env file  --(--env-file / dotenv)-->  process.env
Production:   platform secret store  --(injected)-->  process.env
                                                          ↑
                                  your code reads the same way either way
```

This is why "separate config from code" (Module 9.1) is so powerful: the code never changes, only where the values come from. `.env` is the dev-time convenience; production uses something more secure.

## Don't forget the default

Whichever loader you use, the variable might still be missing (the file might not have it, production might not set it). Always supply a default or validate (Module 2.3, and Module 9.5):

```javascript title=always-default.mjs
const port = Number(process.env.PORT ?? 3000);    // default + convert to number
const level = process.env.LOG_LEVEL ?? 'info';
```

> [!DOGFOOD]
> This course's `.env.example` documents variables like `SITE_OUTPUT_DIR`, `LOG_LEVEL`, and `DATABASE_URL`. A script could load them with `node --env-file=.env` and read `process.env.SITE_OUTPUT_DIR ?? 'site'` — built-in loading, with a default for safety. No `dotenv` dependency required.

> [!TRY]
> Create a `.env` with `GREETING=hello`. Run `node --env-file=.env -e "console.log(process.env.GREETING)"` — it prints `hello`, no library needed. Then run the same `node -e` *without* the flag — it prints `undefined`. You've seen built-in loading work and seen why the loader matters.

> [!KEY]
> - A `.env` file does nothing until a loader reads it into the environment.
> - **Node 22's built-in `--env-file=.env`** loads it with zero dependencies, *before* your code runs (use `--env-file-if-exists` for optional files; multiple files for precedence).
> - The **`dotenv`** (Node) and **`python-dotenv`** (Python) libraries are the older, still-common way — call them **early**, before code reads the variables.
> - Loaders **don't override** already-set real env vars by default — the real environment wins, so production secrets aren't clobbered by a file.
> - In **production**, values come from a platform/secret store, not a `.env` file — same code, different source. Always supply a **default** for missing variables.
