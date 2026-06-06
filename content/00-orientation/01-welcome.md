# Welcome & How to Use This Course

Welcome. By the end of this course you will be able to look at any project — yours or someone else's — and **understand, write, and improve the scripts and config files that run it**. Not by memorizing snippets, but by understanding *why* each tool exists and *how* to build your own.

This is the skill that quietly separates someone who can write a function from someone who can run a whole project: the **tooling** layer. The `.sh`, `.mjs`, `.py`, `.ts`, `.sql`, `.json`, `.env`, `.yml`, `.toml` files, the `Makefile`, the `Dockerfile`, the CI pipeline, the end-to-end tests. The unglamorous machinery that turns "code on my laptop" into "software the whole team can build, test, and ship with one command."

## Who this is for

You should be comfortable editing a text file and running a command in a terminal. That's it. Everything else — what a shell is, what an exit code means, why migrations exist — we build up from first principles.

But we don't stop at the basics. Every topic is taught the way a **distinguished, principal-level engineer** would explain it to a colleague: the simple version first, then the trade-offs, the failure modes, and the production-grade version. You'll get both "here's how" and "here's why, and here's when *not* to."

## How each lesson is structured

Every lesson follows the same rhythm, so you always know where you are:

1. **Plain-English explanation** — the idea, with no jargon, before any code.
2. **Narrated examples** — real, runnable code where *every line is explained*.
3. **The principal-engineer layer** — trade-offs, gotchas, and production patterns.
4. **"Build your own" recap** — the transferable pattern, so you can apply it to *your* projects.

You'll also meet these recurring boxes:

> [!NOTE]
> A useful aside or piece of context.

> [!TIP]
> A shortcut or better way to do something.

> [!WARNING]
> Something that will bite you if you ignore it.

> [!GOTCHA]
> A specific, non-obvious trap — the kind that costs people an afternoon.

> [!DOGFOOD]
> A pointer to how *this very website* uses the technique you're learning. This course is built by its own tooling, so it's a live example throughout.

## The code blocks are real editors

Every code block on this site is a full **Monaco editor** — the same engine that powers VS Code.

- Click **Copy** to copy the snippet.
- Click **Edit** to make the block editable and experiment right here in the page.
- Syntax highlighting, selection, and keyboard shortcuts all work like your real editor.

> [!TIP]
> You can turn pages with the **← and → arrow keys**, or the **Previous / Next** buttons at the bottom of every lesson.

## How to actually learn this (not just read it)

Reading about tooling builds zero muscle memory. The single highest-leverage thing you can do is **run the examples yourself**. Every worked example in this course is a real file in the course repository under `examples/`. Open your terminal, run them, break them, fix them.

> [!TRY]
> Open a terminal and run `node --version`. If you see `v22` or higher, you're ready. If not, the next lessons will get you set up. Don't worry about understanding the command yet — just confirm something happens.

## A note on dates and versions

This is the **2026 edition**. Tooling moves fast, so we deliberately teach modern idioms current as of **June 2026** — things like Node's native `--env-file`, running TypeScript directly without a build step, the built-in `node:sqlite` module, and `pyproject.toml` as the Python standard. Where an older approach is still common, we mention it so you can read existing projects, then show you the current way.

> [!KEY]
> - This course teaches the **tooling layer**: the scripts and config that run a project.
> - The goal is *transferable skill* — learning to build your own tools, not copy snippets.
> - Every lesson: plain English → narrated examples → trade-offs → build-your-own recap.
> - Code blocks are real Monaco editors: **Copy** and **Edit** both work.
> - The biggest win comes from **running the examples yourself**.
