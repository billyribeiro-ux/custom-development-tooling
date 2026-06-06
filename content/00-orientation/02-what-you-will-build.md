# What You'll Build (Capstone Preview)

Let's start at the end. Knowing the destination makes every step along the way make sense.

By the final module, you will have built a **complete, automated tooling suite** for a small but realistic project: a blog with a database, a static site, and a full build-and-ship pipeline. Every piece is something you'll understand line by line, because you'll have built each piece in its own module first.

## The shape of the finished project

Here is the directory layout you'll end up with. Don't worry about the details yet — just notice that *every file type from the course title is here*, each doing a real job:

```text title=project/
project/
├── package.json            # Node project + script shortcuts
├── pyproject.toml          # Python project + tool config
├── tsconfig.json           # TypeScript settings
├── .env.example            # documented environment variables (committed)
├── .env                    # real secrets (never committed)
├── Makefile                # one front door for every command
├── Dockerfile              # how to build a container image
├── docker-compose.yml      # local services (app + database)
├── scripts/
│   ├── bootstrap.sh        # one-time setup, idempotent
│   ├── seed-database.mjs    # fill the DB with known data
│   ├── migrate.mjs          # apply SQL migrations in order
│   ├── build-assets.ts      # hash + bundle static assets
│   └── generate-pages.py    # generate HTML from content
├── migrations/
│   └── 0001_init.sql        # versioned schema changes
├── tests/
│   └── e2e/                 # Playwright end-to-end tests
└── .github/workflows/
    └── ci.yml               # lint, test, build, deploy on every push
```

## The one command that ties it together

The whole point of tooling is that a newcomer can clone the repo and get productive in seconds. By the end, your project will support exactly that:

```bash title=getting-started.sh
# Clone and enter the project
git clone https://github.com/you/project && cd project

# One command installs everything and sets up the database
make bootstrap

# One command builds the site, runs the database, and serves it
make dev
```

No 20-step README. No "it works on my machine." One word: `make`.

## Why build it piece by piece

We could hand you the finished project. You'd learn almost nothing. Instead, each module builds **one piece in isolation** so you understand it completely, then the capstone assembles them. By the time you write the capstone's `Makefile`, you'll have already written every script it calls.

> [!DOGFOOD]
> This pattern — "the whole thing is built from small, understandable pieces driven by one command" — is exactly how *this course site* works. It's a pile of Markdown files turned into HTML by a single script, run with `make build`. You'll dissect that script in Module 5.

## What "done" feels like

Done means: you push a commit, and without touching anything else, your CI pipeline lints your code, runs migrations against a fresh database, builds the site, runs end-to-end tests in a real browser, and deploys. If anything is broken, you find out in minutes, automatically, before a user ever sees it.

That feeling — *confidence that the machine has your back* — is what good tooling buys you. This course teaches you to build it.

> [!TRY]
> Look at the directory tree above and find one file type you've never used. Maybe it's `.toml`, maybe `docker-compose.yml`. Make a mental note. By the time you reach that module, it'll feel obvious.

> [!KEY]
> - The capstone is a real project using **every** file type in the course title.
> - The goal is a project a newcomer can run with **one command** (`make bootstrap` / `make dev`).
> - You build each piece in isolation first, then assemble them — so nothing is magic.
> - Good tooling buys you **confidence**: the machine checks your work automatically.
