# Alternatives: npm scripts, just, task

`make` is the ubiquitous classic, but its C-compilation heritage brings real baggage — tabs, file-vs-task confusion, awkward shell semantics (Module 11.2/11.3). Several modern task runners exist to shed that baggage. This lesson surveys the main options so you can choose deliberately for your projects.

## npm scripts: free if you're already in Node

If your project has a `package.json` (Module 8.2), you *already have* a task runner: the `scripts` field.

```json title=package.json
{
  "scripts": {
    "build": "node tools/generate-pages.mjs",
    "test": "playwright test",
    "lint": "eslint . && tsc --noEmit",
    "dev": "node --env-file=.env --watch server.mjs"
  }
}
```

```bash title=npm-scripts.sh
npm run build
npm test          # 'test' and 'start' don't need 'run'
```

**Pros:** Zero extra tools (every Node project has it); `node_modules/.bin` on PATH so local tools just work (Module 8.2); universally understood by JS developers. **Cons:** Node-only (no good story for a Python or polyglot project); composition is clumsy (`"build": "npm run clean && npm run compile"` — verbose, and cross-platform `&&` has issues); no descriptions/help built in; everything is a one-liner string (multi-step logic gets ugly).

> [!TIP]
> For a *pure Node/JS project*, npm scripts are often the right choice — they're already there and everyone knows them. Reach for a dedicated runner (make/just/task) when the project is **polyglot** (Python + Node + shell, like this course) or when npm scripts get unwieldy. Don't add a tool you don't need.

## just: a command runner without make's baggage

**`just`** is a modern task runner explicitly designed as "make, but only for running commands" — it drops the file-building machinery and fixes the quirks. Its file is a `justfile`:

```makefile title=justfile
# A justfile looks like a Makefile but is friendlier
build:
    node tools/generate-pages.mjs        # INDENTATION CAN BE SPACES — no tab gotcha!

test: build
    playwright test

# Recipes can take parameters — make can't do this cleanly:
deploy env="staging":
    echo "deploying to {{env}}"
```

```bash title=just.sh
just build
just deploy prod        # pass an argument — just deploy to prod
just --list             # built-in help listing all recipes (no grep|awk trick needed!)
```

**Pros over make:** No tab gotcha (spaces are fine); no `.PHONY` needed (everything is a task — *no file-vs-task confusion at all*); built-in `--list` (no self-documenting hack); real parameters; each recipe runs in one shell by default (no `cd` surprise from Module 11.2); clearer error messages. **Cons:** Not pre-installed — contributors must install `just` first (whereas make is everywhere).

> [!NOTE]
> `just` is essentially "make's task-runner mode, redesigned without the C-era baggage." If you're starting fresh and don't mind a one-time install, it's a genuinely nicer experience — it removes *every* gotcha from Modules 11.2-11.3. Its popularity has grown a lot; in 2026 it's a mainstream choice.

## task (Taskfile): YAML-based, cross-platform

**`task`** (a.k.a. go-task) uses a YAML file (`Taskfile.yml`) and emphasizes cross-platform support:

```yaml title=Taskfile.yml
version: '3'
tasks:
  build:
    desc: Build the site
    cmds:
      - node tools/generate-pages.mjs
  test:
    desc: Run tests
    deps: [build]            # dependencies, like make prerequisites
    cmds:
      - playwright test
```

```bash title=task.sh
task build
task --list                 # shows tasks with their 'desc' descriptions
```

**Pros:** YAML is familiar (Module 15); built-in descriptions and `--list`; good cross-platform behavior; nice features (file-change detection, variables). **Cons:** Another install; YAML's own pitfalls (Module 15 — whitespace, type coercion); more verbose than `just` for simple tasks.

## The comparison

| | make | npm scripts | just | task |
| --- | --- | --- | --- | --- |
| Pre-installed | ✅ (everywhere) | ✅ (with Node) | ❌ | ❌ |
| Polyglot-friendly | ✅ | ❌ (Node) | ✅ | ✅ |
| Tab gotcha | ❌ (has it) | n/a | ✅ (none) | ✅ (none) |
| File-vs-task confusion | ❌ (needs .PHONY) | n/a | ✅ (none) | ✅ (none) |
| Built-in help/list | ❌ (DIY) | ❌ | ✅ | ✅ |
| Parameters | clumsy | ❌ | ✅ | ✅ |
| Incremental file builds | ✅ (its origin) | ❌ | partial | ✅ |

## How to choose

The decision, principal-engineer style:

- **Pure Node/JS project?** Use **npm scripts** — already there, everyone knows them.
- **Polyglot project, want zero install for contributors?** Use **make** — it's everywhere, and its quirks are manageable once you know them (Modules 11.2-11.5).
- **Polyglot, willing to install a tool, want the nicest experience?** Use **just** — make's good parts without the gotchas.
- **Need real incremental builds** (rebuild only changed files)? **make** or **task** shine; this is make's original strength (Module 11.2).
- **Team already standardized on one?** Use that — consistency across the team and across projects (Module 11.1) beats marginal feature differences.

> [!WARNING]
> Don't over-engineer the choice. The *value* is having **one entry point with named tasks** (Module 11.1) — *which* runner delivers it matters far less. A team fluent in `make` should not switch to `just` for a 5% nicer syntax; the switching cost and inconsistency outweigh it. Pick one, standardize, move on. The interface (`<runner> build`) is what matters, not the runner.

> [!DOGFOOD]
> This course uses **make** — deliberately. It's a polyglot project (bash, Node, Python, Playwright), and make's ubiquity means anyone who clones the repo can run `make build` with *zero* extra installs. The quirks (tabs, `.PHONY`) are handled once in the Makefile (Module 11.5) and never bother users. For *this* project's goals, make is the right trade-off — but `just` or a Taskfile would work equally well.

> [!TRY]
> Take this course's `Makefile` and mentally translate its `build`, `test: build`, and `clean` targets into a `justfile` (spaces, no `.PHONY`) and a `Taskfile.yml` (YAML, `deps: [build]`). Notice what gets simpler in each. That exercise clarifies what make's baggage actually costs and what the alternatives buy.

> [!KEY]
> - `make`'s C-era baggage (tabs, `.PHONY`, shell quirks) motivates modern alternatives.
> - **npm scripts**: free in any Node project, universally known — best for **pure JS** projects; weak for polyglot/composition.
> - **just**: "make's task mode, redesigned" — no tab gotcha, no file-vs-task confusion, built-in `--list`, real parameters; needs install.
> - **task**: YAML-based, cross-platform, built-in descriptions; needs install, inherits YAML's pitfalls.
> - **Choose by**: language mix, willingness to install, team convention. The value is **one named-task entry point** — don't over-optimize *which* runner; standardize and move on.
