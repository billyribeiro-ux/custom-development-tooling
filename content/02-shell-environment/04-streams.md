# stdin, stdout, stderr, and Pipes

This lesson explains the plumbing that connects programs together — the single most powerful idea in the Unix toolset. Once you "see" the three streams, pipes and redirection stop being incantations and become obvious.

## Every program has three streams

When any program runs, the operating system hands it three default channels:

```text title=the-three-streams
            +-------------------+
  stdin  -> |                   | -> stdout   (normal output)
  (input)   |     program       |
            |                   | -> stderr   (errors / diagnostics)
            +-------------------+
```

- **stdin** (standard input, "file descriptor 0") — where input comes *in*. By default, your keyboard.
- **stdout** (standard output, "fd 1") — where normal results go *out*. By default, your screen.
- **stderr** (standard error, "fd 2") — where errors and diagnostics go. *Also* your screen by default, but a **separate** channel.

## Why two output streams?

This is the part people miss, and it's genius. Normal output and error output are *separate channels* so you can route them independently.

Imagine a program that converts a file and prints the result, but also prints progress messages. If progress went to stdout mixed with the result, you couldn't cleanly capture the result. By sending the *result* to stdout and *progress/errors* to stderr, you can save the result to a file while still seeing errors on screen:

```bash title=separate-channels.sh
# stdout goes into result.txt; stderr still appears on your screen
convert input.dat > result.txt
```

> [!GOTCHA]
> A frequent confusion: "I redirected the output to a file but errors still show on screen!" That's *correct* — `>` redirects only stdout. Errors are on stderr, a different channel. To capture errors too, you redirect stderr separately (below). This is a feature, not a bug.

## Redirection: pointing streams at files

The shell lets you redirect any stream:

```bash title=redirection.sh
command > out.txt        # stdout -> out.txt (overwrite)
command >> out.txt       # stdout -> out.txt (append)
command 2> err.txt       # stderr -> err.txt   (the "2" is stderr's fd)
command > out.txt 2>&1    # stdout -> file, AND stderr -> "same place as stdout"
command < input.txt      # feed input.txt into stdin
command 2>/dev/null      # discard stderr (/dev/null = the void)
```

Read `2>&1` as "send fd 2 (stderr) to wherever fd 1 (stdout) currently points." Order matters: `> out.txt 2>&1` works; `2>&1 > out.txt` does not redirect stderr to the file (a classic gotcha).

> [!TIP]
> In your scripts, **send your own diagnostics to stderr** so they don't contaminate the data on stdout: `echo "warning: retrying..." >&2`. This lets callers pipe your script's real output cleanly. You saw this in Module 1's `backup.sh`.

## Pipes: connecting programs together

A **pipe** (`|`) connects one program's stdout directly to the next program's stdin, with no temporary file. This is the heart of the Unix philosophy — small programs that each do one thing, composed into pipelines:

```bash title=pipes.sh
# "list files, find the .js ones, count them"
ls | grep '\.js$' | wc -l

# stdout of ls  -> stdin of grep
#                  stdout of grep -> stdin of wc
```

Each program is simple. The *composition* is powerful. This is why Unix tools are designed to read stdin and write stdout: so they can be piped.

```text title=visualizing-a-pipe
ls --[stdout]--> | --[stdin]--> grep --[stdout]--> | --[stdin]--> wc
```

> [!NOTE]
> Notice that **stderr is not piped** — only stdout flows through `|`. So errors from `ls` still appear on your screen even inside a pipeline. Again: two channels, routed independently.

## A real tooling example

Pipes show up constantly in tooling. Here's the self-documenting Makefile trick you'll build in Module 11, which pipes three programs together:

```bash title=make-help-pipeline.sh
# Read this Makefile, find lines with "## ", format them into a help menu
grep -E '^[a-zA-Z_-]+:.*?## .*$' Makefile | sort | awk '{ print }'
```

`grep` filters, `sort` orders, `awk` formats — each does one job, composed with pipes.

## Exit codes flow alongside

One more thing: separate from the data streams, every program returns an **exit code** when it finishes — a number signaling success or failure. That's so important it gets its own lesson, next.

> [!TRY]
> Run `ls /nonexistent > out.txt`. The error still prints to your screen (it's on stderr), and `out.txt` is empty (nothing went to stdout). Now run `ls /nonexistent > out.txt 2>&1` and check `out.txt` — the error is captured. You've just controlled both streams.

> [!KEY]
> - Every program gets three streams: **stdin** (in), **stdout** (normal out), **stderr** (errors out).
> - stdout and stderr are **separate channels** so you can route them independently.
> - Redirect with `>`, `>>`, `2>`, `2>&1`, `<`, and `2>/dev/null`.
> - A **pipe `|`** connects one program's stdout to the next's stdin — the basis of composable Unix tooling.
> - **Only stdout is piped**; send your script's diagnostics to **stderr** (`>&2`) so they don't pollute the data.
