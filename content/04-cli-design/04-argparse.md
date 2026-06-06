# Parsing Args in Python with argparse

Python's standard library includes `argparse`, one of the most capable built-in argument parsers in any language. Unlike Bash's `getopts` or Node's `parseArgs`, `argparse` generates help text, validates types, and handles subcommands — all for free, no dependencies. If your tooling is in Python, this is your default.

## The basics

```python title=argparse_basic.py
#!/usr/bin/env python3
import argparse

parser = argparse.ArgumentParser(description="Generate the static site.")
parser.add_argument("source", help="the source directory")            # positional
parser.add_argument("-o", "--output", default="site", help="output dir")  # option with default
parser.add_argument("-v", "--verbose", action="store_true", help="chatty output")  # boolean flag

args = parser.parse_args()
print(args.source, args.output, args.verbose)
```

Run it:

```bash title=run-argparse.sh
python3 tool.py content --output dist --verbose
# content dist True

python3 tool.py content -o dist -v      # short forms
# content dist True
```

Three lines of declaration give you positionals, options with defaults, and boolean flags — and as you'll see, a polished `--help` for free.

## Free help text — the killer feature

You write *no* help-printing code. `argparse` builds it from your declarations:

```bash title=auto-help.sh
python3 tool.py --help
```
```text title=generated-help
usage: tool.py [-h] [-o OUTPUT] [-v] source

Generate the static site.

positional arguments:
  source                the source directory

options:
  -h, --help            show this help message and exit
  -o OUTPUT, --output OUTPUT
                        output dir
  -v, --verbose         chatty output
```

It even adds `-h/--help` automatically. And on bad input, it prints usage and exits with code 2 — the conventional argument-error code — without you writing any error handling:

```bash title=auto-errors.sh
python3 tool.py            # missing required 'source'
# usage: tool.py [-h] [-o OUTPUT] [-v] source
# tool.py: error: the following arguments are required: source
# (exits with code 2)
```

> [!TIP]
> This automatic, always-correct help and error handling is why `argparse` is so loved. The help can never drift from the actual flags, because it's *generated from* them — the same "single source of truth" principle behind this course's manifest (Module 0.4).

## Types and choices: validation built in

`argparse` can convert and validate values for you:

```python title=argparse_types.py
parser.add_argument("--port", type=int, default=8080)          # converts to int, errors if not numeric
parser.add_argument("--retries", type=int, default=3)
parser.add_argument(
    "--env",
    choices=["dev", "staging", "prod"],                         # only these values allowed
    default="dev",
)
parser.add_argument("--tag", action="append", default=[])      # repeatable: --tag a --tag b -> ['a','b']
```

```bash title=type-validation.sh
python3 tool.py content --port abc
# tool.py: error: argument --port: invalid int value: 'abc'   (exit 2)

python3 tool.py content --env production
# tool.py: error: argument --env: invalid choice: 'production' (choose from 'dev', 'staging', 'prod')
```

Compare this to Bash and Node, where you'd validate types and allowed values by hand. `argparse` does it declaratively — a real productivity win for Python tooling.

## Subcommands

For tools with multiple verbs (`git`-style), `argparse` supports subparsers:

```python title=argparse_subcommands.py
#!/usr/bin/env python3
import argparse

parser = argparse.ArgumentParser(prog="site")
sub = parser.add_subparsers(dest="command", required=True)

build = sub.add_parser("build", help="build the site")
build.add_argument("--out", default="site")

serve = sub.add_parser("serve", help="serve the site")
serve.add_argument("--port", type=int, default=8080)

args = parser.parse_args()
if args.command == "build":
    print(f"building into {args.out}")
elif args.command == "serve":
    print(f"serving on port {args.port}")
```

```bash title=subcommand-usage.sh
python3 site.py build --out dist
python3 site.py serve --port 3000
python3 site.py --help            # lists the subcommands
python3 site.py build --help      # help for JUST the build subcommand
```

Each subcommand gets its own flags and its own `--help` — exactly the design from Module 4.1, with almost no boilerplate.

## A clean main()

Wrap it in the `__main__` idiom (Module 6 covers this fully):

```python title=tool_main.py
#!/usr/bin/env python3
import argparse

def main() -> int:
    parser = argparse.ArgumentParser(description="...")
    parser.add_argument("source")
    parser.add_argument("-o", "--output", default="site")
    args = parser.parse_args()      # exits with code 2 on bad input, automatically
    print(f"building {args.source} -> {args.output}")
    return 0                          # explicit success exit code

if __name__ == "__main__":
    raise SystemExit(main())          # main()'s return value becomes the exit code
```

> [!DOGFOOD]
> The course's `tools/generate-pages.py` uses `argparse` with a single `--out` option and a description. Run `python3 tools/generate-pages.py --help` to see the auto-generated help. Compare it to the Node generator's hand-written help (Module 4.3) — same interface, but Python generated the help for free.

## Three languages, one design

You've now seen the same CLI design in Bash (`getopts`), Node (`parseArgs`), and Python (`argparse`). Notice the trend in *power*:

| Language | Parser | Long flags | Auto help | Type validation | Subcommands |
| --- | --- | --- | --- | --- | --- |
| Bash | `getopts` | no | no | no | no |
| Node | `util.parseArgs` | yes | no | no | no |
| Python | `argparse` | yes | **yes** | **yes** | **yes** |

This often informs language choice: a complex CLI is markedly easier in Python. The *design principles* (Module 4.1) are identical everywhere — only the batteries differ.

> [!TRY]
> Save the subcommands example as `site.py`. Run `python3 site.py --help`, then `python3 site.py build --help`, then `python3 site.py build --out dist`. Notice you wrote zero help text and zero error handling, yet both work perfectly.

> [!KEY]
> - Python's built-in **`argparse`** is the most capable of the three: long flags, **auto-generated help**, type/`choices` validation, and subcommands — no dependencies.
> - Help and usage errors are **generated from your declarations**, so they can never drift (single source of truth).
> - `type=int`/`choices=[...]`/`action="append"` give declarative validation for free; bad input exits with code 2 automatically.
> - **Subparsers** implement `git`-style subcommands, each with its own flags and help.
> - Same design across Bash/Node/Python; Python simply includes the most "batteries" — often a reason to pick it for complex CLIs.
