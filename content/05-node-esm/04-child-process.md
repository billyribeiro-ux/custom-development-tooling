# Running Other Processes with child_process

A huge part of tooling is *gluing other programs together* — calling `git`, `npm`, `docker`, `tsc`, or your own scripts from within a Node script. The `node:child_process` module is how. It's powerful and has some sharp edges (notably around security), so let's learn the safe patterns.

## The core idea

Your Node script is a process. It can *spawn* child processes — other programs — wait for them, capture their output, and check their exit codes (everything from Module 2 applies: streams, exit codes, environment inheritance).

There are several functions. The two you'll use for tooling:

- **`execFile`** — run a program with an array of arguments; buffer its output. Best default.
- **`spawn`** — run a program and *stream* its output live. Best for long-running or chatty processes.

## execFile: run and capture output

```javascript title=execfile.mjs
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);   // turn the callback API into a promise

// Run "git rev-parse HEAD" and capture its output
const { stdout } = await run('git', ['rev-parse', 'HEAD']);
const commit = stdout.trim();
console.log(`current commit: ${commit}`);
```

Note the shape: the program (`'git'`) and its arguments (`['rev-parse', 'HEAD']`) are **separate** — the program name, then an *array* of arguments. This separation is not just tidy; it's a critical security feature (next section).

## The security rule: avoid the shell

There's an older function, `exec`, that takes a single command *string* and runs it **through a shell**. This is convenient but dangerous:

```javascript title=DANGER-exec.mjs
import { exec } from 'node:child_process';

const userInput = req.body.filename;       // attacker controls this!
exec(`cat ${userInput}`);                  // SHELL INJECTION VULNERABILITY
// if userInput is "x.txt; rm -rf ~", the shell runs BOTH commands!
```

Because `exec` hands your string to a shell, any shell metacharacters (`;`, `|`, `$()`, backticks) in the input get *interpreted*. An attacker who controls part of the string can run arbitrary commands. This is one of the most common and severe security bugs.

```javascript title=SAFE-execfile.mjs
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);

const userInput = req.body.filename;
await run('cat', [userInput]);    // SAFE: userInput is ONE argument, never parsed by a shell
// even "x.txt; rm -rf ~" is treated as a single (weird) filename, harmless
```

> [!WARNING]
> **Prefer `execFile`/`spawn` (program + args array) over `exec` (command string).** The array form does *not* invoke a shell, so input can't inject commands. Only use `exec`/`shell: true` when you genuinely need shell features (pipes, globs) *and* you fully control the input. This single rule prevents a whole class of critical vulnerabilities.

## spawn: streaming output for long tasks

When a process runs for a while or produces lots of output, you want to *see it live* rather than wait for it all to buffer. `spawn` streams:

```javascript title=spawn.mjs
import { spawn } from 'node:child_process';

// Run "npm test" and forward its output to our own stdout/stderr in real time
const child = spawn('npm', ['test'], { stdio: 'inherit' });

// Wait for it to finish and check the exit code
const code = await new Promise((resolve) => child.on('close', resolve));
if (code !== 0) {
  console.error(`npm test failed with code ${code}`);
  process.exit(code);              // propagate the failure (Module 2.5)
}
```

`stdio: 'inherit'` is the key option: it connects the child's stdin/stdout/stderr directly to *yours*, so the child's output appears in your terminal live (with colors intact). This is exactly what you want when wrapping `npm`, `tsc`, `playwright`, etc.

## Checking exit codes and handling failure

Remember: a child's exit code tells you success/failure (Module 2.5). With `execFile`/`run`, a non-zero exit **throws** (the promise rejects), so you handle it with try/catch:

```javascript title=handle-failure.mjs
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);

try {
  await run('tsc', ['--noEmit']);
  console.log('type-check passed');
} catch (err) {
  // err.code is the exit code; err.stdout / err.stderr hold the captured output
  console.error('type-check failed:\n' + err.stdout);
  process.exit(1);
}
```

## Passing environment and working directory

Children inherit your environment (Module 2.3), but you can customize it:

```javascript title=env-cwd.mjs
import { spawn } from 'node:child_process';

spawn('node', ['build.mjs'], {
  cwd: 'packages/web',                          // run in this directory
  env: { ...process.env, NODE_ENV: 'production' }, // inherit + add/override vars
  stdio: 'inherit',
});
```

> [!TIP]
> Always spread `...process.env` when setting `env`, or the child loses *everything* including `PATH` — and then `node`/`git` become "command not found" inside the child (Module 2.2). You almost always want "the existing environment, plus my additions," not "only my additions."

## When to shell out vs use a library

A judgment call worth making consciously:

- **Shell out** (`execFile`) when the other program is the natural tool and has no good library: `git`, `docker`, `ffmpeg`, `playwright`.
- **Use a library** when one exists and you need structured results: e.g. a git *library* gives you objects, not text you must parse. But for tooling, calling the CLI is often simpler and more transparent.

> [!DOGFOOD]
> The course's `migrate.mjs` doesn't shell out — it uses the built-in `node:sqlite` directly (Module 13), which is cleaner than calling a `sqlite3` CLI and parsing text. That's the "use the library when there's a good one" call. But a deploy script that runs `docker build` and `git push` is a perfect case for `spawn` with `stdio: 'inherit'`.

> [!TRY]
> Write a script that runs `git log --oneline -5` via `execFile` and prints the captured stdout. Then write one that runs `node --version` via `spawn` with `stdio: 'inherit'` and reports its exit code. You've covered both the capture and the streaming patterns.

> [!KEY]
> - `node:child_process` runs other programs — the glue of tooling (calling `git`, `npm`, `docker`...).
> - **`execFile`** runs program + args array and buffers output; **`spawn`** streams it live (use `stdio: 'inherit'`).
> - **Security rule: prefer the args-array form over `exec` (a shell string)** to avoid command injection.
> - Non-zero child exit **throws** with `execFile` (catch it); with `spawn`, check the `close` code and **propagate failures**.
> - When customizing `env`, **spread `...process.env`** or the child loses `PATH`. Shell out for CLI-only tools; use a library when there's a good one.
