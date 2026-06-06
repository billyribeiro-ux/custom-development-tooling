# Capstone Brief: The Project You'll Automate

You've learned every piece of custom development tooling. Now you'll *assemble* them into one complete, automated project — the capstone. This isn't new material; it's the synthesis of everything, showing how the pieces fit into a coherent whole you could build for any real project.

## The project: "Linkboard"

You'll build the tooling for a small but realistic app — **Linkboard**, a personal link-saving site (think a tiny bookmarks app). It's deliberately simple as an *application* so we can focus entirely on the *tooling* — which is the point of the course.

Linkboard has just enough to exercise every tool:

- A **database** of saved links (so we need migrations and seeds — Module 13).
- A **build step** that turns saved links into static HTML pages (so we need a generator — Modules 5/6).
- **Static assets** (CSS/JS) that need bundling (so we need a build script — Module 7).
- It runs as a **container** with its database (Module 14).
- It's all tied together with a **Makefile** (Module 11) and shipped via **CI** (Module 15) with **E2E tests** (Module 16).

> [!NOTE]
> Notice Linkboard is almost the same shape as *this course site*: content + a database + a generator + static output + tests + CI. That's intentional. The course is itself a worked capstone (dogfooding, Module 0.4) — so as you build Linkboard, you're rebuilding, with full understanding, the kind of system that produced the pages you're reading. Every example file in this repo is a reference for your capstone.

## What you'll build, file by file

By the end, Linkboard's repository will contain every file type from the course title, each doing a real job:

```text title=linkboard/
linkboard/
├── package.json              # Node project + scripts (Module 8.2)
├── pyproject.toml            # Python tooling config (Module 10.2)
├── tsconfig.json             # TypeScript settings (Module 8.3)
├── .env.example              # documented env template (Module 9.3)
├── .gitignore                # ignore artifacts + secrets (Module 1.3, 9.3)
├── .gitattributes            # normalize line endings (Module 17.3)
├── Makefile                  # the front door (Module 11.5)
├── Dockerfile                # multi-stage container (Module 14.3)
├── docker-compose.yml        # app + database (Module 14.4)
├── playwright.config.ts      # E2E config, at the root (Module 16.3)
├── scripts/
│   ├── bootstrap.sh          # one-time setup, idempotent (Module 3)
│   ├── migrate.mjs           # apply SQL migrations (Module 13.5)
│   ├── seed.mjs              # load known data (Module 13.6)
│   └── build-assets.ts       # hash static assets (Module 7.4)
├── tools/
│   └── generate-pages.py     # build HTML from links (Module 6)
├── migrations/
│   └── 0001_init.sql         # schema (Module 13.4)
├── tests/e2e/
│   └── linkboard.spec.ts     # E2E tests (Module 16.5)
└── .github/workflows/
    └── ci.yml                # lint, test, build, deploy (Module 15.5)
```

Every file maps to a module you've completed. The capstone is *connecting* them.

## The end goal: two commands

Recall the promise from Module 0.2. When Linkboard is done, a newcomer can be productive in two commands:

```bash title=the-goal.sh
git clone <linkboard> && cd linkboard
make bootstrap        # installs deps, sets up the database, seeds it, builds
make dev              # runs everything: database + app, ready to use
```

No 20-step README. No "works on my machine." Two commands, because the tooling does the rest. That's the deliverable — and the proof that you've mastered custom development tooling.

## How to follow the capstone

The next eight lessons each build one layer, in dependency order:

1. **Scaffolding** — `package.json`, `pyproject.toml`, configs (this is the foundation).
2. **Bootstrap + env** — the `.sh` setup script and `.env` validation.
3. **Build scripts** — the `.mjs`/`.ts`/`.py` generators.
4. **Migrations** — the `.sql` schema and runner.
5. **Containers** — `Dockerfile` + compose.
6. **Makefile** — wiring it all behind named tasks.
7. **CI + E2E** — automation and tests.
8. **Review** — the checklist and where to go next.

Each step references the module that taught it and the matching example file in *this* repo. You won't write new *concepts* — you'll *compose* known ones (Module 17.1). That composition, the act of making the pieces work together as a system, is the real skill the capstone builds.

> [!TIP]
> Build it for *real* as you read. Create a `linkboard/` folder and add each file as its lesson covers it, adapting the course's example files (in `examples/` and `tools/`) to Linkboard. By the end you'll have a working, automated project of your own — which is worth ten times more than reading about one. The course's files are your reference implementation.

> [!TRY]
> Before starting, sketch Linkboard's data: what's a "link"? (Probably an `id`, a `url`, a `title`, a `created_at`.) Write that as a `CREATE TABLE` (Module 13.2). You've just designed migration `0001` — the foundation everything else builds on. Keep it handy for Step 4.

> [!KEY]
> - The capstone synthesizes the whole course by building **Linkboard**, a small link-saving app whose *tooling* exercises every file type and module.
> - Linkboard mirrors this course's own shape (content + database + generator + static output + tests + CI) — the course is itself a worked capstone you can reference.
> - You'll build every file type from the title, each doing a real job, mapped to the module that taught it.
> - The goal is the **two-command** experience: `make bootstrap` then `make dev` — no long README, no "works on my machine."
> - The capstone introduces **no new concepts** — it's about **composing** known pieces into a coherent system (Module 17.1). Build it for real as you go.
