# Custom Development Tooling — a self-hosted course

A complete, beginner-friendly-but-principal-engineer-deep course on **custom development tooling**:
the scripts and config files that build, test, run, and ship real software — and, crucially, how to
build your own.

It's delivered as static HTML pages (one per lesson) with **Monaco editors** (VS Code's engine) for
every code block, so you can read, edit, and copy every snippet. **2026 edition.**

It's a real course platform, not just a page sequence:

- **Sidebar navigation** of all 20 modules / 114 lessons, with the current lesson highlighted
- **Client-side search** (titles offline; full-text when served over http)
- **Progress tracking** in `localStorage` — completion checkmarks, a "% complete" readout, and a Resume button
- **On-this-page** outline with scrollspy, plus heading anchor links
- **Light / dark theme toggle** (persisted), **Next / Previous** + arrow-key navigation, reading-time, SEO meta + canonical/OG tags, a generated sitemap.xml, and a self-contained 404 page
- Works offline from `file://`; search is progressively enhanced when served

> **Dogfooding:** this site is built by the very kind of tooling it teaches. The generator
> (`tools/generate-pages.mjs`) turns Markdown + a manifest into the linked HTML you read — and it's
> narrated, line by line, in Module 5.

## Quick start

```bash
npm install                      # install dependencies
make build                       # build the site into site/  (or: npm run build)
make serve                       # build + serve at http://localhost:8080
```

Or open `site/index.html` directly in a browser after building. Run `make help` to see every task.

## What it covers

114 lessons across 20 modules, covering every file type that controls a real project:

`.sh` · `.mjs` · `.py` · `.ts` · `.sql` · `.json` · `.env` · `.toml` · `.yml` · `Makefile` ·
`Dockerfile` · `docker-compose.yml` · `*.config.mjs` — plus **end-to-end testing with Playwright**
and an 18-step **capstone** where you build a complete tooling suite from scratch.

Each lesson teaches plain-English first, then fully narrated examples, then the trade-offs and
production gotchas, then a "build your own" recap so the skills transfer to whatever you want to build.

## How it's built (the tooling that teaches tooling)

| Piece | What it is |
| --- | --- |
| `course.json` | The manifest — the single source of truth for module/lesson order |
| `content/**/*.md` | The source — one Markdown file per lesson |
| `templates/` | The HTML page shell with `{{placeholders}}` |
| `tools/generate-pages.mjs` | The **primary generator** (Node, ESM) — narrated in Module 5 |
| `tools/generate-pages.py` | A **parallel Python generator** (study artifact) — narrated in Module 6 |
| `assets/` | Dark-theme CSS + the JS that lazy-mounts Monaco editors, copy buttons, keyboard nav |
| `examples/` | Real, runnable scripts the lessons dissect (`clean-cache.sh`, `seed-database.mjs`, `migrate.sql`, `build-assets.ts`, `Dockerfile`, …) |
| `tests/e2e/` + `playwright.config.ts` | Playwright tests verifying the navigation works in a real browser |
| `.github/workflows/ci.yml` | CI: lint, type-check, build, test, deploy to GitHub Pages |
| `Makefile` | The single front door for every task |

## Common tasks

```bash
make build       # build the site with the Node generator (primary)
make build-py    # build with the Python generator (proves the dogfood comparison)
make serve       # build, then serve at http://localhost:8080
make test-unit   # run the generator unit tests (node:test, no deps)
make test        # build, run unit tests, then the Playwright end-to-end tests
make lint        # lint shell (ShellCheck), Python (ruff), TypeScript (tsc)
make clean       # remove the generated site/
make help        # list every task
```

## Requirements

- **Node.js 22.13+** (uses the built-in `node:sqlite`, `--env-file`, and native TypeScript type-stripping; Node 24 LTS recommended)
- **Python 3.11+** (for the parallel generator; uses only the standard library)
- Optional: **Docker** (for the container lessons), **ShellCheck** / **ruff** (for linting)

## Running the example scripts

The worked examples are real and runnable:

```bash
node examples/node/migrate.mjs       # apply the SQL migration
node examples/node/seed-database.mjs  # seed known data (idempotent)
node examples/typescript/build-assets.ts --src assets --out /tmp/dist   # content-hash assets
bash examples/shell/clean-cache.sh                          # dry-run cache cleaner
```

## License

MIT
