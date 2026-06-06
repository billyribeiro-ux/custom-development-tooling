# PATH: How the OS Finds Your Commands

When you type `node`, how does the computer know *where* the `node` program lives among the hundreds of thousands of files on your disk? The answer is one environment variable: **`PATH`**. Understanding it fixes the single most common "command not found" confusion.

## The problem PATH solves

A program like `node` is a file somewhere, maybe `/usr/local/bin/node`. You don't want to type the full path every time:

```bash title=the-tedious-way
/usr/local/bin/node build.mjs   # who wants to type this?
```

You want to just type `node`. So the shell needs a list of folders to *look in* for commands. That list is `PATH`.

## What PATH looks like

`PATH` is a single string of directories separated by colons (`:`) on macOS/Linux:

```bash title=look-at-path.sh
echo "$PATH"
# /opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
```

When you type `node`, the shell walks this list **left to right** and runs the *first* `node` it finds:

```text title=the-search
type: node
  look in /opt/homebrew/bin/node  -> not here
  look in /usr/local/bin/node     -> FOUND! run this one. stop searching.
```

> [!TIP]
> Want to know *which* one will run? Use `which node` (shows the path) or, even better, `type node` (also tells you if it's a shell builtin, alias, or function). `command -v node` is the portable, script-safe version.

## Why "left to right" matters

Because the search stops at the *first* match, **order is precedence.** If you have two versions of a tool installed, the one in an earlier `PATH` directory wins. This is exactly how version managers like `fnm` and `nvm` work: they put their chosen version's directory at the *front* of `PATH`, so it shadows the system one.

```bash title=precedence.sh
which -a python3   # -a shows ALL matches, in PATH order
# /Users/you/.pyenv/shims/python3   <- this one wins (it's first)
# /usr/bin/python3
```

> [!GOTCHA]
> "But I installed the new version!" — and yet the old one runs. Almost always a `PATH` ordering problem: the old version's directory comes first. Fix the order, or remove the old entry. This is the #1 cause of "wrong version" confusion.

## Where PATH gets set

`PATH` is assembled when your shell starts, from config files like `~/.bashrc`, `~/.bash_profile`, `~/.zshrc`, or `~/.profile`. Installers often append a line like:

```bash title=~/.zshrc (excerpt)
# Prepend a directory to PATH (note: $PATH at the END keeps existing entries)
export PATH="/opt/homebrew/bin:$PATH"
```

Reading this right-to-left: take the existing `$PATH`, and stick `/opt/homebrew/bin` in front. Putting `$PATH` *last* means your new entry has higher precedence; putting it *first* (`"$PATH:/new/dir"`) means lower precedence.

> [!WARNING]
> A classic disaster: `export PATH="/some/dir"` *without* including `$PATH`. This **replaces** your entire PATH, so suddenly `ls`, `git`, and everything else are "not found" because their directories vanished. Always include `$PATH` when extending it.

## "command not found" — the diagnosis

When you see `command not found`, it means exactly one thing: **the shell searched every directory in `PATH` and found no such program.** The causes:

1. It's not installed. (Install it.)
2. It's installed, but its directory isn't in `PATH`. (Add the directory.)
3. `PATH` ordering points at a different/broken copy. (Fix the order.)
4. You opened a new terminal but edited a config file the shell didn't reload. (Open a fresh terminal, or `source ~/.zshrc`.)

## Why this matters for tooling

Your scripts and CI rely on `PATH`. When CI says "node: command not found," it's the same problem: the runner's `PATH` doesn't include Node. The fix (e.g. `actions/setup-node`) works by *adding Node to `PATH`*. Once you understand `PATH`, these errors go from mysterious to mechanical.

> [!DOGFOOD]
> In this course's `Makefile`, commands like `node` and `npx` just work because the build environment has them on `PATH`. The CI workflow (Module 15) uses `actions/setup-node`, whose entire job is putting the right Node on the runner's `PATH` before our build runs.

> [!TRY]
> Run `echo "$PATH"` and count the directories. Then run `which -a node` (or `which -a python3`). If there's more than one, you now know precisely which would run and why.

> [!KEY]
> - `PATH` is a colon-separated list of directories the shell searches to find commands.
> - It searches **left to right** and runs the **first match** — so order is precedence.
> - **Version managers** work by putting their version's directory at the front of `PATH`.
> - Always include `$PATH` when extending it, or you'll wipe out every other command.
> - `command not found` always means: not installed, not on `PATH`, wrong order, or config not reloaded.
