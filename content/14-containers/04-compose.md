# docker-compose.yml: Orchestrating Dev Services

One container is useful; real apps need *several* working together — your app *plus* a database, maybe a cache, a queue. Starting and wiring each by hand is tedious and error-prone. **Docker Compose** lets you declare your whole local stack in one YAML file and start it all with one command. It's the task runner of the container world for local development.

## The problem: many containers, much typing

To run your app with a Postgres database by hand, you'd type something like:

```bash title=the-tedious-way.sh
docker network create appnet
docker run -d --name db --network appnet -e POSTGRES_PASSWORD=dev postgres:16-alpine
docker run -d --name app --network appnet -p 8080:8080 --env DATABASE_URL=... myapp
# ...and remember all these flags, in order, every time...
```

Nobody wants to memorize that. And a teammate certainly can't reproduce it. This is exactly the "pile of commands" problem a task runner solves (Module 11.1) — but for containers.

## The solution: declare it in docker-compose.yml

Compose lets you *declare* the stack as data, then start it with `docker compose up`:

```yaml title=docker-compose.yml
services:
  app:
    build: .                      # build from the Dockerfile here
    ports:
      - "8080:8080"               # host:container port mapping (Module 14.1)
    environment:
      DATABASE_URL: postgres://dev:dev@db:5432/app_dev
    depends_on:
      - db

  db:
    image: postgres:16-alpine     # use a prebuilt image (Module 14.1)
    environment:
      POSTGRES_PASSWORD: dev
```

```bash title=compose-commands.sh
docker compose up              # start everything (foreground)
docker compose up -d           # start in the background (detached)
docker compose down            # stop and remove everything
docker compose logs -f app     # follow one service's logs
docker compose ps              # list running services
```

One file, one command. A newcomer clones the repo and runs `docker compose up` — and gets the *entire* working environment: app + database, wired together, no manual steps. This is the container version of `make bootstrap` (Module 11.1).

## The YAML structure

A Compose file is a `services` map, each service a container definition:

- **`build:` or `image:`** — each service either *builds* from a Dockerfile (`build: .`) or *uses* a prebuilt image (`image: postgres:16-alpine`). Your app builds; off-the-shelf services (databases) use images.
- **`ports:`** — `"host:container"` maps a port out to your machine (Module 14.1), so `localhost:8080` reaches the app.
- **`environment:`** — sets env vars in the container (Module 2.3), like the database connection string.
- **`depends_on:`** — declares startup order (start `db` before `app`).
- **`volumes:`** — persist data or mount code (below).

(YAML's syntax — indentation, `-` for lists — gets a full treatment in Module 15; for now, mind the indentation: it's significant.)

## Networking: services find each other by name

A subtle but powerful feature: Compose puts all services on a shared network, and **each service is reachable by its name**. Notice the connection string above: `postgres://dev:dev@db:5432/...` — the host is `db`, the *name* of the database service. Compose provides DNS so `app` can reach `db` at the hostname `db`.

> [!TIP]
> This name-based networking is why you connect to `db`, not `localhost`, *from inside* the app container. A common beginner error: using `localhost` in the connection string — but inside the app container, `localhost` means *that container*, not the database container. Use the *service name* as the hostname. (From *your* machine, outside the containers, you'd use `localhost:5432` thanks to the port mapping — two different perspectives.)

## depends_on and health checks

`depends_on` controls *start order*, but here's the catch:

> [!GOTCHA]
> `depends_on` waits for the database container to *start*, not for the database to be *ready to accept connections*. A database container "starts" in a second but may take several more to actually boot. So your app can start, try to connect, and fail — because the DB process is up but not listening yet. The fix is a **health check** plus `depends_on: condition: service_healthy`:
> ```yaml title=healthcheck.yml
> db:
>   image: postgres:16-alpine
>   healthcheck:
>     test: ["CMD-SHELL", "pg_isready -U dev -d app_dev"]
>     interval: 5s
>     timeout: 3s
>     retries: 10
> app:
>   depends_on:
>     db:
>       condition: service_healthy    # wait until the DB is actually READY
> ```
> The health check runs `pg_isready` repeatedly until Postgres truly accepts connections, and only then does `app` start. This eliminates flaky "connection refused on startup" races.

## Volumes: persisting data and mounting code

By default, a container's filesystem is ephemeral — `docker compose down` and the database's data is *gone*. **Volumes** persist data across restarts:

```yaml title=volumes.yml
services:
  db:
    image: postgres:16-alpine
    volumes:
      - db-data:/var/lib/postgresql/data    # named volume: persists the DB data

volumes:
  db-data:                                    # declare the named volume
```

A *named volume* (`db-data`) survives `down`/`up`, so you don't lose your database between sessions. You can also *bind-mount* your source code into a container for live-reload during development (`- ./src:/app/src`).

## Compose is for development, not production

A key boundary, like `.env` (Module 9.1):

> [!WARNING]
> Docker Compose is designed for **local development** orchestration (and simple single-host setups). For *production* multi-host orchestration — scaling, rolling updates, self-healing, load balancing across machines — the standard tool is **Kubernetes** (or a managed platform). Don't try to run a serious production system on `docker compose` across many servers. Compose's sweet spot: "give me my whole dev stack with one command." Match the tool to the task (Module 6.5).

> [!DOGFOOD]
> The course's `examples/docker/docker-compose.yml` defines two services: `site` (built from the course Dockerfile, Module 14.2/14.3, on port 8080) and `db` (Postgres 16-alpine for the migration lessons). It uses `depends_on: condition: service_healthy` with a `pg_isready` health check (the gotcha above), a named volume `db-data` to persist the database, and environment variables for local-only credentials. Run `docker compose -f examples/docker/docker-compose.yml up` to bring up the whole stack. Open the file and find each feature.

> [!TRY]
> Read the course's `examples/docker/docker-compose.yml` and identify: the two services, which one `build`s vs uses an `image`, the port mapping, the `depends_on` with `condition: service_healthy`, the health check command, and the named volume. Then trace how the `site` service would reach the database (by the service name `db`, not `localhost`).

> [!KEY]
> - **Docker Compose** declares a multi-container stack (app + database + ...) in one `docker-compose.yml`, started with **`docker compose up`** — the container-world task runner for local dev.
> - Each **service** uses `build:` (your app) or `image:` (off-the-shelf), with `ports:`, `environment:`, `depends_on:`, and `volumes:`.
> - Services reach each other by **service name** (use `db`, not `localhost`, *inside* containers) via Compose's built-in DNS.
> - `depends_on` only waits for *start*, not *readiness* — add a **health check** + `condition: service_healthy` to avoid connection races.
> - **Volumes** persist data across restarts. Compose is for **local development**, not production multi-host orchestration (that's Kubernetes).
