# Environment Variables and the Process Environment

`PATH` was your first environment variable. Now let's understand the whole system — because environment variables are how configuration flows into every program you run, and they're the foundation for the `.env` files we'll meet in Module 9.

## What an environment variable is

Every running program (every *process*) has a little dictionary of key-value strings attached to it called its **environment**. The program can read these values to configure itself.

```bash title=read-and-set.sh
echo "$HOME"          # read: /Users/you
echo "$USER"          # read: you

GREETING="hello"      # set a SHELL variable (this process only)
echo "$GREETING"      # hello
```

Note: values are always **strings**. There are no numbers or booleans in the environment — `PORT=8080` is the *string* `"8080"`, which your program must parse if it wants a number.

## Shell variables vs environment variables — the crucial difference

This trips up everyone once. There are two kinds:

- A plain **shell variable** (`GREETING="hi"`) exists only in the current shell. Programs you launch *do not see it*.
- An **environment variable** (created with `export`) is *inherited by child processes* — the programs the shell launches.

```bash title=export-matters.sh
GREETING="hi"
node -e 'console.log(process.env.GREETING)'   # prints: undefined  (not exported!)

export GREETING="hi"
node -e 'console.log(process.env.GREETING)'   # prints: hi  (exported -> inherited)
```

`export` is the verb that promotes a shell variable into the environment so children inherit it. **If a program "can't see" your variable, you probably forgot to `export` it.**

## Inheritance: the family tree

When a process starts a child, the child gets a *copy* of the parent's environment. This is one-directional:

```text title=inheritance
your shell (PATH, HOME, exported vars)
   └── runs: node build.mjs
         └── node sees a COPY of the shell's environment
               └── node runs: child_process git ...
                     └── git sees a COPY of node's environment
```

Two consequences worth burning in:

1. A child **cannot** change its parent's environment. (That's why a script can't permanently change *your* shell's `PATH` — it only changes its own copy.)
2. Set a variable *before* launching a program and the program sees it; set it *after*, too late.

## Setting a variable for just one command

A beautifully concise idiom: put `KEY=value` *in front of* a command to set it for that command only, without affecting your shell:

```bash title=one-shot.sh
NODE_ENV=production node build.mjs   # NODE_ENV set only for this run
echo "${NODE_ENV:-unset}"           # back in your shell: still unset
```

This is perfect for tooling — it makes the configuration explicit and temporary, right there in the command.

> [!TIP]
> `printenv` lists all *environment* variables; `set` lists shell variables too. To check one: `printenv PATH` or `echo "$PATH"`. To remove one: `unset GREETING`.

## Reading them in your programs

Every language exposes the environment:

```javascript title=read-env.mjs
// Node
const port = process.env.PORT ?? '3000';   // ?? supplies a default if undefined
console.log(`port is ${port}`);
```

```python title=read_env.py
# Python
import os
port = os.environ.get("PORT", "3000")   # second arg is the default
print(f"port is {port}")
```

Notice both supply a **default**. Environment variables are often missing, so always plan for "what if it's not set?" — a theme we develop into a discipline in Module 9.

## Why tooling loves environment variables

Environment variables are the universal, language-agnostic configuration channel:

- They work the same in every language and on every OS.
- They keep **secrets out of code** (you set `DATABASE_URL` in the environment, not in a committed file).
- They let the *same* binary behave differently in dev, staging, and production — just change the environment.

This is literally one of the principles behind the influential "Twelve-Factor App" methodology: *store configuration in the environment.* We build the full picture — `.env` files, precedence, validation — in Module 9.

> [!WARNING]
> Because they're inherited by every child process, environment variables holding secrets can leak — into logs, into crash reports, into subprocesses you didn't expect. Treat secret env vars carefully; never `echo` them in scripts that might be logged. More on this in Module 9.

> [!TRY]
> Run `GREETING=hi node -e 'console.log(process.env.GREETING)'` and watch it print `hi`. Then run `node -e 'console.log(process.env.GREETING)'` alone and watch it print `undefined`. You've just proven inheritance with your own hands.

> [!KEY]
> - Every process has an **environment**: a dictionary of string key-values it can read.
> - **Shell variables** are local; **`export`** promotes them to environment variables that **child processes inherit**.
> - Children get a **copy** — they can't change the parent's environment (so scripts can't permanently change your shell).
> - `KEY=value command` sets a variable for just that one command.
> - Env vars are the universal config channel: language-agnostic, keep secrets out of code, enable per-environment behavior. **Always handle the "not set" case.**
