# Virtual Environments and Why They Matter

Python has one foundational concept that, if you skip it, leads to endless "it works on my machine" pain: the **virtual environment**. Understanding it is non-negotiable for reliable Python tooling. It's Python's answer to reproducibility (Module 1.3).

## The problem: one shared Python is a trap

By default, when you `pip install` a package, it goes into your *system-wide* (or user-wide) Python. Now imagine:

- Project A needs `requests` version 2.20.
- Project B needs `requests` version 2.31.

With one shared Python, you can't have both — installing one *breaks* the other. Worse, your global Python becomes a junk drawer of packages from every project you've ever touched, and you can never reproduce a clean environment. This is the exact reproducibility failure from Module 1.3.

## The solution: an isolated environment per project

A **virtual environment** ("venv") is a self-contained directory holding its own Python and its own packages, isolated from the system and from other projects. Each project gets its own. Project A's `requests 2.20` and Project B's `requests 2.31` live in separate venvs and never conflict.

```text title=isolation
system python  (leave it clean!)
project-a/.venv/   -> requests 2.20, plus only what A needs
project-b/.venv/   -> requests 2.31, plus only what B needs
```

## Creating and using a venv

Python ships with `venv` built in:

```bash title=venv-basics.sh
# Create a virtual environment in a folder called .venv
python3 -m venv .venv

# Activate it (this puts the venv's python/pip first on your PATH — Module 2.2!)
source .venv/bin/activate        # macOS/Linux
# .venv\Scripts\activate          # Windows

# Now python and pip refer to the venv's copies:
which python                      # .../project/.venv/bin/python
pip install requests              # installs INTO the venv, not the system

# When done:
deactivate                        # return to the system python
```

> [!NOTE]
> "Activating" a venv is pure `PATH` manipulation (Module 2.2): it prepends `.venv/bin` to your `PATH`, so `python` and `pip` resolve to the venv's copies instead of the system ones. There's no magic — it's the precedence rule you already know. That's also why `source` is required (Module 3.1): it must modify *your current shell's* `PATH`, not a child's.

> [!TIP]
> Name the folder `.venv` (with the dot) and add it to `.gitignore`. It's a generated artifact (Module 1.3) — full of installed packages derived from your requirements — so you never commit it. You recreate it from your dependency list instead.

## Recording dependencies

A venv is disposable; what you *commit* is the *list* of dependencies, so anyone can recreate the environment. Two common approaches:

```bash title=requirements.sh
# The classic way: a requirements.txt file
pip install requests
pip freeze > requirements.txt     # record EXACT installed versions

# Someone else (or CI) recreates the environment:
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

The modern way records dependencies in **`pyproject.toml`** (Module 10) instead of a loose `requirements.txt` — a single, standardized home for project metadata *and* dependencies. We cover that file in detail in Module 10.

> [!WARNING]
> `pip freeze` pins *exact* versions (`requests==2.31.0`) — great for reproducibility, like a lockfile (Module 1.3, Module 8). But `requirements.txt` mixes "what I directly need" with "what those packages need" (transitive deps). Modern tools (below) separate these cleanly. For simple tooling, pinned `requirements.txt` is perfectly fine.

## Modern tooling: uv (2026)

The Python packaging world has consolidated around faster, friendlier tools. The standout in 2026 is **`uv`** — an extremely fast, all-in-one replacement for `pip`, `venv`, and more, written in Rust:

```bash title=uv.sh
uv venv                       # create a venv (instantly)
uv pip install requests       # install (much faster than pip)
uv run script.py              # run a script in the project's environment automatically
uv sync                       # install exactly what pyproject.toml/lockfile specifies
```

`uv` manages the venv *for* you and uses a lockfile (`uv.lock`) for exact reproducibility — bringing Python's dependency story up to par with Node's `package-lock.json`. If you're starting fresh in 2026, learning `uv` is a good investment. (The underlying *concept* — isolated environment + committed dependency list — is unchanged; `uv` just makes it fast and ergonomic.)

> [!DOGFOOD]
> This course's Python generator (`tools/generate-pages.py`) deliberately uses **zero third-party packages** — only the standard library — so it needs no venv at all to run. That's a real tooling choice: when a script can be dependency-free, it always runs, anywhere, with no setup (Module 1, Module 5.2). The `pyproject.toml` still declares a `dev` group with `ruff` for linting, which *would* go in a venv.

## The mental model

Whenever you work on Python:

1. Create a venv for the project (`python3 -m venv .venv` or `uv venv`).
2. Activate it (or let `uv run` handle it).
3. Install dependencies into it.
4. Commit the *dependency list* (`pyproject.toml`/`requirements.txt`), not the venv.

Do this and you'll never fight version conflicts or pollute your system Python again. It's the same "isolate the environment, record what's needed" principle that containers (Module 14) take even further.

> [!TRY]
> In an empty folder: `python3 -m venv .venv`, then `source .venv/bin/activate`, then `which python` (note it points inside `.venv`). Install something with `pip install requests`, run `pip list` to see it's isolated, then `deactivate` and `pip list` again to see the system Python is untouched.

> [!KEY]
> - A **virtual environment** isolates each project's Python and packages, preventing version conflicts and a polluted system Python.
> - Create with `python3 -m venv .venv`, **activate** (which just prepends `.venv/bin` to `PATH` — Module 2.2), install into it, `deactivate` when done.
> - The venv is a **generated artifact** — gitignore it; **commit the dependency list** (`pyproject.toml`/`requirements.txt`) instead.
> - `pip freeze` pins exact versions for reproducibility (a lockfile-like role).
> - **`uv`** (2026) is the fast, modern all-in-one tool with a real lockfile. A dependency-free script needs no venv at all.
