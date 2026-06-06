# Setting Up Your Machine

You need a small, standard toolkit. This lesson gets you there and — just as importantly — teaches you how to *verify* each tool is installed, which is itself a core tooling skill.

## The toolkit

| Tool | Why you need it | Check it with |
| --- | --- | --- |
| **A terminal** | Where you run everything | it's already on your machine |
| **Git** | Version control | `git --version` |
| **Node.js 22+** | Runs `.mjs`/`.ts` tooling | `node --version` |
| **Python 3.11+** | Runs `.py` tooling | `python3 --version` |
| **Docker** (optional) | Containers (Module 14) | `docker --version` |

You don't need Docker until Module 14, and you can read those lessons without it. Everything else you'll use from the very next module.

## Verifying versions (and reading the output)

The first habit of good tooling is **check, don't assume**. Run each command and read what it says:

```bash title=check-versions.sh
git --version       # e.g. git version 2.45.0
node --version      # e.g. v22.14.0   <- must be 22 or higher
python3 --version   # e.g. Python 3.12.3
```

If a command prints a version, it's installed and on your `PATH` (we explain `PATH` in Module 2). If instead you see `command not found`, it's not installed — install it and try again.

> [!GOTCHA]
> On some systems `python` means Python 2 (ancient) or doesn't exist, while `python3` means Python 3. Throughout this course we always write `python3` to be unambiguous. Same idea for `pip3`.

## Installing Node 22

The cleanest way to install Node — and to switch between versions per project — is a version manager. On macOS/Linux, `nvm` or `fnm` are the common choices:

```bash title=install-node.sh
# Using fnm (fast, modern). Install fnm first from its website, then:
fnm install 22       # download Node 22
fnm use 22           # use it in this shell
node --version       # confirm: v22.x.x

# Or with nvm:
nvm install 22
nvm use 22
```

> [!TIP]
> A version manager beats installing Node "globally" because different projects can require different versions. A file named `.nvmrc` or `.node-version` in a repo records which version that project wants — another tiny but powerful piece of tooling.

## Installing Python 3

Most macOS and Linux systems already have Python 3. If not, use your system package manager (`brew install python` on macOS, `apt install python3` on Debian/Ubuntu) or a manager like `uv` or `pyenv`. We cover Python environments properly in Module 6.

## Getting the course examples

Every worked example is a real file you can run. Clone the course repository so you can follow along hands-on:

```bash title=clone-course.sh
git clone https://github.com/billyribeiro-ux/custom-development-tooling
cd custom-development-tooling

# Install the Node dependencies the build needs
npm install

# Build the site you're reading right now
node tools/generate-pages.mjs
```

> [!DOGFOOD]
> That last command builds *this website*. Run it, and you'll have a local copy of the entire course you can open in your browser. You're already running real tooling, and it's only Lesson 3.

## A good editor

Use whatever you like, but **VS Code** pairs especially well with this course — partly because the code blocks here *are* the VS Code editor (Monaco). Install the extensions for the languages you'll use (Python, the built-in TypeScript/JavaScript support, ShellCheck for shell scripts) and you'll get inline error-checking as you type.

> [!TRY]
> Run all three version checks (`git`, `node`, `python3`). Write down the versions. If any command fails, install that tool now — the rest of the course assumes you have them.

> [!KEY]
> - You need: a terminal, Git, Node 22+, Python 3.11+, and (later) optionally Docker.
> - The first habit of tooling: **verify** with `--version` instead of assuming.
> - Use a **version manager** (fnm/nvm) so each project can pin its Node version.
> - Clone the course repo so you can run every example yourself.
