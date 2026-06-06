# What a Shell Is (bash vs zsh vs sh vs PowerShell)

You've been typing into a terminal. But what is actually *reading* what you type and making things happen? That's the **shell**, and understanding it demystifies a huge amount of tooling.

## Terminal vs shell — they're different

People use these interchangeably, but they're distinct:

- The **terminal** (or *terminal emulator*) is the *window*. It draws text and captures your keystrokes. Examples: the macOS Terminal app, iTerm2, Windows Terminal, the VS Code integrated terminal.
- The **shell** is the *program running inside* that window. It reads your commands, interprets them, runs programs, and shows you the results. Examples: `bash`, `zsh`, `fish`, `sh`, PowerShell.

```text title=the-relationship
+-----------------------------------+
|  Terminal (the window)            |
|  +-----------------------------+  |
|  |  Shell (bash/zsh/...)       |  |   <- reads commands, runs programs
|  |  $ node build.mjs           |  |
|  +-----------------------------+  |
+-----------------------------------+
```

So when you "use the terminal," you're really talking to a shell. The shell is itself just a program — one whose job is to launch *other* programs.

## What a shell actually does

When you type `node build.mjs` and press Enter, the shell:

1. **Parses** the line into words: `node` and `build.mjs`.
2. **Expands** anything special (variables like `$HOME`, wildcards like `*.js`).
3. **Finds** the `node` program by searching your `PATH` (next lesson).
4. **Launches** it as a new process, handing it the argument `build.mjs`.
5. **Waits** for it to finish, then collects its **exit code**.
6. **Shows you** the prompt again, ready for the next command.

Every one of those steps is a lesson in this module. Once you understand them, the shell stops being magic.

## The major shells

| Shell | Where you'll meet it | Notes |
| --- | --- | --- |
| **bash** | Linux servers, CI, most scripts | The de-facto standard for scripts. What we teach. |
| **zsh** | Default on macOS since 2019 | Mostly bash-compatible interactively; nicer features. |
| **sh** | The POSIX baseline | The lowest common denominator; very portable, very minimal. |
| **fish** | Some developers' interactive choice | Friendly, but *not* bash-compatible — don't script in it. |
| **PowerShell** | Windows | A completely different model (objects, not text). |

## Why we write scripts in bash (mostly)

For *interactive* use, pick whatever shell you enjoy — zsh, fish, anything. But for *scripts*, we target **bash** (or plain POSIX `sh` for maximum portability), because:

- It's installed essentially everywhere Unix-like (Linux servers, macOS, CI runners, Docker images).
- It's what the rest of the world writes, so you can read other people's scripts.
- A bash script behaves the same regardless of which shell *you* happen to use interactively.

> [!GOTCHA]
> The shell you use interactively and the shell that runs your *script* can be different! A script's first line — the **shebang**, like `#!/usr/bin/env bash` (Module 3) — decides which interpreter runs it, regardless of your personal shell. So even a die-hard fish user runs bash scripts as bash.

> [!WARNING]
> macOS ships an ancient bash (version 3.2 from 2007) for licensing reasons; its default interactive shell is zsh. Modern bash features may be missing. For portable scripts, either stick to widely-supported syntax or target POSIX `sh`. We'll flag bash-specific features as we go.

## How a script picks its shell

A script declares its interpreter on its very first line:

```bash title=hello.sh
#!/usr/bin/env bash
echo "Hello from bash"
```

That `#!...` line is the shebang. When you run `./hello.sh`, the operating system reads it and runs the script *with bash*, no matter what shell you're sitting in. We cover this fully next module — for now, just know that scripts are explicit about which shell they need.

> [!TRY]
> Find out which shell you're using right now: run `echo $0` or `echo $SHELL`. You'll likely see `bash`, `zsh`, or a path like `/bin/zsh`. Then run `bash --version` to see your bash version (macOS users: notice how old it is).

> [!KEY]
> - The **terminal** is the window; the **shell** is the program inside it that runs your commands.
> - A shell **parses → expands → finds → launches → waits → reports** for every command — each is a lesson in this module.
> - **bash** is the standard for *scripts* (portable, ubiquitous); use any shell you like *interactively*.
> - A script's **shebang** decides its interpreter, independent of your personal shell.
> - macOS bash is ancient — write portable syntax or target POSIX `sh`.
