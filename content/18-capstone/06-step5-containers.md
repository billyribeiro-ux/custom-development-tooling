# Step 5 — Dockerfile + docker-compose.yml

To make Linkboard run identically anywhere — and to spin up its database without installing Postgres on your machine — we containerize it (Module 14). A multi-stage `Dockerfile` builds a lean image; a `docker-compose.yml` orchestrates the app alongside a database. This is the course's container setup (Module 14.5) adapted to Linkboard.

## The Dockerfile: multi-stage build

We build with full tooling, then ship only the result (Module 14.3 — "build big, ship small"):

```dockerfile title=Dockerfile
# ---- Stage 1: builder (has all the build tools) ----
FROM node:22-slim AS builder                       # pinned, slim base (Module 14.2)
WORKDIR /app
COPY package.json package-lock.json ./             # manifests first (caching — Module 14.3)
RUN npm ci                                          # reproducible install (Module 8.4)
COPY . .                                            # then the source
RUN node scripts/migrate.mjs \
 && node scripts/seed.mjs \
 && node scripts/build-assets.ts \
 && python3 tools/generate-pages.py                 # build the site (Steps 3-4)

# ---- Stage 2: runtime (clean and tiny) ----
FROM node:22-slim AS runtime
WORKDIR /app
USER node                                           # drop root (security — Module 14.2)
COPY --from=builder --chown=node:node /app/site ./site         # only the output (Module 14.3)
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/scripts/serve.mjs ./scripts/serve.mjs
EXPOSE 8080
CMD ["node", "scripts/serve.mjs"]                   # exec form (Module 14.2)
```

The structure (Module 14.3):

- **Builder stage** — `node:22-slim` (pinned/slim, Module 14.2), manifests-before-source for caching (Module 14.3), `npm ci` (Module 8.4), then runs the whole build (migrate, seed, assets, pages — Steps 3-4) to produce `site/` and `dist/`.
- **Runtime stage** — a *clean* base, `USER node` for security (Module 14.2), and `COPY --from=builder` of *only* the built output and the server. The build tools, dev dependencies, and source never reach the final image (Module 14.3).

Because Linkboard's output is static (like the course, Module 14.5), the runtime needs almost nothing — just the files and a tiny server. Small, fast, secure (Module 14.3).

> [!GOTCHA]
> Don't `COPY` your `.env` into the image, and don't bake `DATABASE_PATH` or any secret as an `ENV`/`ARG` in the Dockerfile (Module 14.2/9.3) — they'd be extractable from the image. Add a **`.dockerignore`** (Module 14.2) excluding `.env`, `node_modules`, `.git`, and the local `*.db` so `COPY . .` doesn't drag them in. Secrets come from the *runtime* environment (compose `environment:` or `docker run -e`), never the image.

```text title=.dockerignore
node_modules
.git
.env
*.db
dist
site
test-results
```

## The compose file: app + database

For local development with a real database (Module 14.4):

```yaml title=docker-compose.yml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"                                # host:container (Module 14.1)
    environment:
      NODE_ENV: development
      DATABASE_URL: postgres://dev:dev@db:5432/linkboard   # host is the SERVICE NAME (Module 14.4)
    depends_on:
      db:
        condition: service_healthy                 # wait for READY, not just started (Module 14.4)

  db:
    image: postgres:17-alpine                       # prebuilt image (Module 14.1)
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev                        # local-only creds (Module 9.3)
      POSTGRES_DB: linkboard
    volumes:
      - db-data:/var/lib/postgresql/data            # persist data (Module 14.4)
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev -d linkboard"]   # readiness (Module 14.4)
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  db-data:
```

Everything from Module 14.4:

- **`app`** service builds from the Dockerfile, maps port 8080, and waits for the database via `depends_on: condition: service_healthy`.
- **`db`** uses the prebuilt `postgres:17-alpine` image (Module 14.1), with local-only credentials (Module 9.3).
- The app connects to the database by its **service name** `db` (not `localhost`, Module 14.4's gotcha).
- A **health check** (`pg_isready`) ensures the app starts only when the DB is *ready* (Module 14.4), not merely started.
- A **named volume** persists the database across restarts (Module 14.4).

```bash title=run-stack.sh
docker compose up           # build the app image, start Postgres, wait, serve
docker compose down         # stop everything (data persists in the volume)
```

One command brings up the whole stack (Module 14.4) — the container version of `make bootstrap` (Module 14.1).

> [!NOTE]
> Linkboard's scripts default to SQLite locally (`DATABASE_PATH`, Step 4) but the compose stack provides Postgres. This mirrors real projects: a lightweight local default, with compose offering a production-like database when you want to test against the real thing. Your code reads a connection setting from the environment (Module 9) either way — the *source* of the database changes, the code doesn't (Module 9.1's "separate config from code"). That flexibility is exactly what env-based config buys you.

> [!DOGFOOD]
> Linkboard's `Dockerfile` and `docker-compose.yml` are direct adaptations of the course's `examples/docker/Dockerfile` and `examples/docker/docker-compose.yml` (Module 14.5) — same multi-stage structure, same `USER node`, same health-check-and-volume compose setup. Open those as your templates; you're changing names and build commands, not the architecture.

> [!TRY]
> If you have Docker, adapt the course's container files for Linkboard and run `docker compose up`. Watch it build the multi-stage image, start Postgres, *wait for the health check*, and serve. Run `docker compose down` then `up` again — the named volume means your data survives. You've containerized a real app with its database.

> [!KEY]
> - A **multi-stage Dockerfile** (Module 14.3) builds Linkboard with full tooling, then ships only the static output + server in a clean `USER node` runtime — small, fast, secure.
> - Use **manifests-before-source** caching (Module 14.3), `npm ci` (Module 8.4), and a **`.dockerignore`** to exclude `.env`/`node_modules`/`*.db` — **never bake secrets** into the image (Module 9.3/14.2).
> - **`docker-compose.yml`** orchestrates the **app + Postgres** (Module 14.4): service-name networking (`db`, not `localhost`), a **health check** so the app waits for a ready DB, and a **named volume** to persist data.
> - **`docker compose up`** brings up the whole stack — the container version of `make bootstrap`.
> - Code reads the database setting from the **environment** (Module 9.1), so SQLite-local vs Postgres-in-compose needs no code change. Adapt the course's container files as templates.
