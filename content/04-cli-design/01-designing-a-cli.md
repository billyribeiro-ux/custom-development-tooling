# Designing a CLI: Flags, Positionals, Subcommands, --help

Before learning the parsing *mechanics* in any language, you need to know what makes a command-line interface *good*. A well-designed CLI is a joy to use and easy to automate; a badly-designed one is a daily friction. The good news: there are strong, universal conventions, and following them makes your tool instantly familiar.

## The anatomy of a command line

Every CLI invocation is built from a few standard pieces:

```text title=anatomy
git commit --message "fix bug" -a
│   │      │                   │
│   │      │                   └── short flag (-a)
│   │      └── long flag with value (--message "fix bug")
│   └── subcommand (commit)
└── program (git)
```

The vocabulary, which you'll use constantly:

- **Positional arguments** — meaning comes from *position*: `cp SOURCE DEST`. Order matters.
- **Flags / options** — named, order-independent: `--verbose`, `--output file.txt`. Long form `--name`, short form `-n`.
- **Boolean flags** — present or absent, no value: `--force`, `--dry-run`.
- **Subcommands** — verbs that select a mode: `git commit`, `git push`, `docker build`.

## The universal conventions

Decades of Unix tools converged on conventions your users already expect. Follow them and your tool needs no explanation:

| Convention | Example | Why |
| --- | --- | --- |
| Long flags use `--word` | `--verbose` | readable, self-documenting |
| Short flags use `-x` | `-v` | fast to type |
| Short flags combine | `-rf` = `-r -f` | convenience |
| `--help` and `-h` print help | `tool --help` | discoverability |
| `--version` prints the version | `tool --version` | scripting/debugging |
| `--` ends flag parsing | `rm -- -weird-file` | handle filenames starting with `-` |
| `-` often means stdin/stdout | `cat -` | composability |

> [!TIP]
> The single most important convention is `--help`. A tool whose `--help` clearly lists every flag with a one-line description is *self-documenting* — users never need to read source code or hunt for docs. Treat a great `--help` as a feature, not an afterthought.

## Flags vs positionals: which to use?

A senior-engineer judgment call:

- Use **positionals** for the small number of *required, obvious* inputs where order is natural: `cp <from> <to>`, `mv <src> <dest>`.
- Use **flags** for *options*, *modifiers*, and anything optional: `--output`, `--format json`, `--verbose`.

> [!WARNING]
> Don't overload positionals. `tool input.txt output.txt en-US true 3` is unreadable — what's `true`? what's `3`? Flags make intent explicit: `tool input.txt --output output.txt --lang en-US --overwrite --retries 3`. When in doubt, prefer a named flag over a mystery positional. Readability at the call site beats brevity.

## Subcommands: when one tool does many things

When a tool has several distinct modes, group them as subcommands rather than a pile of flags:

```bash title=subcommands.sh
# Good: clear verbs
mytool build --watch
mytool test --coverage
mytool deploy --env prod

# Bad: one command, mode controlled by flags
mytool --build --watch
mytool --test --coverage
```

Subcommands scale (think `git`, `docker`, `kubectl`, `npm`). Each subcommand gets its *own* flags and its *own* `--help`. Reach for them once your tool has more than 2-3 fundamentally different jobs.

## Designing the interface first

Before writing any parsing code, *write out the calls you want to support*, including the `--help` text. Design the interface from the user's side:

```text title=design-first.txt
mytool — generate a static site

USAGE:
  mytool build [--out <dir>] [--base <path>] [--watch]
  mytool serve [--port <n>]
  mytool --help
  mytool --version

OPTIONS:
  --out <dir>    output directory (default: site)
  --base <path>  base URL path (default: /)
  --watch        rebuild on file changes
```

Writing this *first* clarifies your design before you're committed to code, and it doubles as your `--help` output and your documentation. This is the same "design the interface before the implementation" discipline good engineers apply everywhere.

> [!DOGFOOD]
> This course's `generate-pages.mjs` supports `--out <dir>`, `--base <path>`, and `-h/--help`. Run `node tools/generate-pages.mjs --help` to see its self-documenting help text. The next three lessons show how to build exactly this kind of parsing in Bash, Node, and Python.

## What's next

The conventions above are language-independent. The next three lessons show the *mechanics* of implementing them:

- **Bash** with `getopts`
- **Node** with the built-in `util.parseArgs`
- **Python** with `argparse`

Same design principles, three syntaxes. Once you see all three, you'll recognize the shared shape and be able to build a clean CLI in whatever language a task calls for.

> [!TRY]
> Pick a script you've written that takes a positional argument. Redesign its interface on paper: what would its `--help` look like? Would any positionals be clearer as named flags? Just designing it sharpens the instinct.

> [!KEY]
> - CLIs are built from **positionals** (order matters), **flags/options** (named), **boolean flags**, and **subcommands** (verbs).
> - Follow universal conventions: `--long`/`-short`, `--help`/`-h`, `--version`, `--` to end flags.
> - Use positionals for required/obvious inputs; **prefer named flags** for options and anything non-obvious.
> - Use **subcommands** when a tool has several distinct jobs; each gets its own flags and help.
> - **Design the interface (and `--help`) first** — it clarifies the design and becomes your documentation.
