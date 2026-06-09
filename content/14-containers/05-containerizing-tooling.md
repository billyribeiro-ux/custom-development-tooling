# Worked Example: Containerizing the Course Tooling

Let's tie the module together by walking through how *this course* is containerized — the real `examples/docker/Dockerfile` and `examples/docker/docker-compose.yml`. You'll see every concept (multi-stage builds, caching, security, compose orchestration, health checks) applied to a project you already understand: the site generator from Module 5.7.

> [!DOGFOOD]
> These are real, runnable files. With Docker installed, `docker compose -f examples/docker/docker-compose.yml up` builds and serves the course *plus* a Postgres database. Open both files alongside this lesson.

## The Dockerfile: stage 1 (builder)

```dockerfile title=Dockerfile
FROM node:22-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN node tools/generate-pages.mjs
```

The **builder** stage (Module 14.3) does the heavy work:

- **`FROM node:22-slim AS builder`** — pinned, slim base (Module 14.2), named `builder` so the next stage can copy from it.
- **`COPY package*.json ./` then `RUN npm ci`** — manifests first, install second (Module 14.3's caching rule): editing course content won't re-run `npm ci`. Uses `npm ci` for reproducible installs from the lockfile (Module 8.4).
- **`COPY . .` then `RUN node tools/generate-pages.mjs`** — copy the source, then *build the site at image-build time*. This runs the exact generator you dissected in Module 5.7, producing `site/` inside the image.

After this stage, the builder image contains the full source, all dependencies, *and* the generated `site/`. It's big — but it's about to be discarded.

## The Dockerfile: stage 2 (runtime)

```dockerfile title=Dockerfile
FROM node:22-slim AS runtime
WORKDIR /app
USER node

COPY --from=builder --chown=node:node /app/site ./site
COPY --from=builder --chown=node:node /app/tools/serve.mjs ./tools/serve.mjs

EXPOSE 8080
CMD ["node", "tools/serve.mjs"]
```

The **runtime** stage (Module 14.3) builds the lean image we actually ship:

- **`FROM node:22-slim AS runtime`** — a *fresh, clean* base. None of the builder's source or dependencies come along automatically.
- **`USER node`** — drop root for security (Module 14.2). The official Node image provides this user.
- **`COPY --from=builder ... /app/site ./site`** — pull *only* the generated `site/` from the builder stage. The Markdown source, the generator, `node_modules`, and dev dependencies are all left behind. `--chown=node:node` makes the copied files owned by the non-root user.
- **`COPY --from=builder ... serve.mjs`** — also grab the tiny static server (Module 5.2). That's all the runtime needs: the static files and something to serve them.
- **`EXPOSE 8080` + `CMD ["node", "tools/serve.mjs"]`** — document the port and run the server (exec form, Module 14.2).

The result: a small image containing just the built site and a ~60-line server — no build toolchain, no dev dependencies. "Build big, ship small" (Module 14.3), demonstrated on the course itself.

> [!NOTE]
> Notice the elegant fit: the generator (Module 5.7) runs in the *builder* stage to produce static HTML, and the *runtime* stage just serves those static files. Because the site is *static* (Module 0.4), the runtime needs almost nothing — no database, no app server, no build tools. The static-site architecture and the multi-stage build reinforce each other. This is what good design composing well looks like.

## The compose file: orchestrating site + database

```yaml title=docker-compose.yml
services:
  site:
    build:
      context: ../..
      dockerfile: examples/docker/Dockerfile
    ports:
      - "8080:8080"
    environment:
      NODE_ENV: development
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: app_dev
    ports:
      - "5432:5432"
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev -d app_dev"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  db-data:
```

Reading it through Module 14.4:

- **`site` service** — *builds* from the course Dockerfile (note `context: ../..` so the build sees the whole repo, and the explicit `dockerfile:` path). Maps port 8080. Waits for the database via `depends_on: condition: service_healthy`.
- **`db` service** — *uses* the prebuilt `postgres:17-alpine` image (Module 14.1). Sets local-only credentials via `environment` (a comment in the file warns never to do this in production, Module 9.3). Maps 5432.
- **The health check** — runs `pg_isready` until Postgres truly accepts connections (Module 14.4's gotcha), so `site` only starts once the DB is *ready*, not merely *started*.
- **The named volume** `db-data` — persists the database across `down`/`up` (Module 14.4).

One command, `docker compose up`, builds the course image, starts Postgres, waits for it to be healthy, and serves the site — the whole development stack, reproducibly (Module 14.1).

## What this demonstrates

This worked example shows containers applied end-to-end to a real project:

1. **Multi-stage build** (Module 14.3) — build the site with full tooling, ship only the static output + server.
2. **Caching** (Module 14.3) — manifests-first so content edits don't re-install.
3. **Security** (Module 14.2) — `USER node`, no secrets baked in.
4. **Orchestration** (Module 14.4) — compose runs the site alongside a real database.
5. **Reliability** (Module 14.4) — health checks prevent startup races; volumes persist data.

And it all serves the same static site you've been reading, built by the same generator you dissected. The course is containerized by the very techniques it teaches — dogfooding all the way down.

> [!TRY]
> With Docker installed, run `docker compose -f examples/docker/docker-compose.yml up` from the repo root. Watch it build the site image (multi-stage), start Postgres, *wait for the health check*, then serve the course at `http://localhost:8080`. Then `docker compose ... down`. You've orchestrated a real multi-service stack of the course itself. (No Docker? Re-read the two files — you now understand every line.)

> [!KEY]
> - The course Dockerfile is **multi-stage**: a `builder` stage runs `npm ci` + the generator; a clean `runtime` stage `COPY --from=builder`s only the **static `site/` + server**, runs as `USER node`.
> - Because the site is **static** (Module 0.4), the runtime image needs almost nothing — architecture and multi-stage build reinforce each other.
> - The compose file orchestrates **`site` (built) + `db` (Postgres image)** with a **health check** (`pg_isready`) so the site waits for a *ready* database, and a **named volume** to persist data.
> - One **`docker compose up`** brings up the entire reproducible dev stack — the container version of `make bootstrap`.
> - The course is containerized with the exact techniques (caching, multi-stage, security, orchestration) it teaches — dogfooding throughout.
