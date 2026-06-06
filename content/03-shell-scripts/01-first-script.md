# Your First .sh: Shebangs and the Executable Bit

Time to write actual scripts. A shell script is just a text file full of commands you could have typed by hand — saved so you can run them all with one command, forever. Let's build one and understand every part.

## The simplest possible script

Create a file called `hello.sh`:

```bash title=hello.sh
#!/usr/bin/env bash
echo "Hello, tooling!"
```

Two lines. The second is obvious — it prints text. The first, `#!/usr/bin/env bash`, is the important one. Let's dissect it.

## The shebang line

That first line is called the **shebang** (from "hash-bang": `#` is "hash," `!` is "bang"). It tells the operating system *which interpreter* should run this file.

```bash title=anatomy
#!/usr/bin/env bash
│ │         │   │
│ │         │   └── the interpreter to use: bash
│ │         └────── env: "find bash on the PATH for me"
│ └──────────────── the path to env
└────────────────── #! the shebang marker (must be the very first 2 bytes)
```

When you run `./hello.sh`, the kernel reads the first line, sees `#!`, and runs the file *through* the named interpreter — here, bash. Without a shebang, the system doesn't know if your file is bash, Python, or something else.

## Why `/usr/bin/env bash` instead of `/bin/bash`?

You'll see both. The difference matters:

- `#!/bin/bash` — run *exactly* the bash at `/bin/bash`. Breaks if bash lives elsewhere (it's at `/usr/local/bin/bash` or `/opt/homebrew/bin/bash` on many systems).
- `#!/usr/bin/env bash` — ask `env` to find `bash` on the `PATH`. Portable: it uses whichever bash is active, including a newer one from your version manager.

> [!TIP]
> Prefer `#!/usr/bin/env bash`. It's the portable choice and respects the user's `PATH` (remember Module 2 — `PATH` ordering decides which bash wins). The same pattern works for any interpreter: `#!/usr/bin/env python3`, `#!/usr/bin/env node`.

## The executable bit

Here's the part that trips up beginners. Creating the file isn't enough — you have to mark it as *executable*. Files have permission bits, and one of them says "this file may be run as a program."

```bash title=make-executable.sh
./hello.sh
# bash: ./hello.sh: Permission denied      <- not executable yet

chmod +x hello.sh    # chmod = change mode; +x = add the eXecute permission
./hello.sh
# Hello, tooling!                          <- now it runs
```

`chmod +x` flips the execute bit. You only do this once per file; the bit is saved with the file (and tracked by Git, so teammates get it too).

> [!GOTCHA]
> "Permission denied" when running a script almost always means you forgot `chmod +x`. It does *not* mean your code is wrong. (A different cause: the file is on a drive mounted "noexec," but that's rare.)

## Three ways to run a script

```bash title=ways-to-run.sh
./hello.sh        # 1. execute directly — needs the shebang AND chmod +x
bash hello.sh     # 2. tell bash to run it — no chmod needed, shebang ignored
source hello.sh   # 3. run it in your CURRENT shell (see warning below)
```

Method 1 is how you ship a real tool — it looks like any other command. Method 2 is handy for quick testing (it bypasses the executable bit). Method 3 is special:

> [!WARNING]
> `source script.sh` (or `. script.sh`) runs the script in your *current* shell instead of a child process. That means its variables, `cd`s, and `export`s affect *your* shell — useful for scripts meant to modify your environment (like activating a virtualenv), but surprising otherwise. For normal tools, use `./script.sh`, which runs in an isolated child process.

## Why `./` and not just `hello.sh`?

Because of `PATH` (Module 2!). The shell searches `PATH` for commands, and the current directory `.` is *not* on `PATH` by default (a deliberate security choice — you don't want to accidentally run a malicious `ls` someone dropped in a folder). So you must spell out the location: `./hello.sh` means "the `hello.sh` right here in this directory."

## Comments and structure

Everything after `#` (except the shebang) is a comment, ignored by bash:

```bash title=commented.sh
#!/usr/bin/env bash
# greet.sh — prints a friendly greeting
# Usage: ./greet.sh

echo "Hello, tooling!"   # this trailing part is a comment too
```

Good scripts start with a comment block saying what the script does and how to use it. Future-you will be grateful.

> [!TRY]
> Create `hello.sh` with the two-line content above. Run `./hello.sh` and observe "Permission denied." Run `chmod +x hello.sh`, then `./hello.sh` again. You've just created, permissioned, and run your first script.

> [!KEY]
> - A shell script is a text file of commands; the **shebang** (`#!/usr/bin/env bash`) declares its interpreter.
> - Prefer `#!/usr/bin/env bash` over `/bin/bash` for **portability** (it respects `PATH`).
> - Mark scripts executable once with **`chmod +x`** — "Permission denied" usually means you forgot.
> - Run with `./script.sh` (needs shebang + execute bit), `bash script.sh` (quick test), or `source` (affects your current shell — careful).
> - You need `./` because the current directory isn't on `PATH` (a security default).
