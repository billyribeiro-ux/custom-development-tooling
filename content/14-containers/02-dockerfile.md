# Dockerfile Instructions Line by Line

A `Dockerfile` is a recipe for building an image (Module 14.1) — a sequence of instructions that, run top to bottom, produce a packaged app+environment. It's tooling-as-code: a reproducible, version-controlled definition of your runtime. Let's learn every instruction you'll commonly use, building toward reading the course's real Dockerfile (Module 14.5 in the compose lesson references it; we narrate it here).

## The shape of a Dockerfile

```dockerfile title=Dockerfile
FROM node:22-slim          # start from a base image
WORKDIR /app               # set the working directory inside the image
COPY package*.json ./      # copy files from your machine into the image
RUN npm ci                 # run a command during the BUILD
COPY . .                   # copy the rest of your source
EXPOSE 8080                # document the port the app uses
CMD ["node", "server.mjs"] # the command to run when a CONTAINER starts
```

Each line is an **instruction** (uppercase by convention) followed by arguments. Docker runs them in order to build the image. Let's go through the ones that matter.

## FROM: the base image

```dockerfile title=from.dockerfile
FROM node:22-slim
```

Every image starts `FROM` another image — your foundation. `node:22-slim` means "the official Node 22 image, slim variant (a minimal Debian base)." You're not building an OS from scratch; you build *on top of* a maintained base that already has Node installed.

> [!TIP]
> **Pin and slim your base image.** `node:22-slim` (pinned major version, minimal base) beats `node:latest` (unpredictable — "latest" changes over time, breaking reproducibility, Module 1.3) and beats the full `node:22` (hundreds of MB of stuff you don't need). Smaller images build faster, ship faster, and have a smaller attack surface (less installed = less to exploit). Even smaller: `alpine`-based images, though Alpine's different libc occasionally causes compatibility surprises.

## WORKDIR: where commands run

```dockerfile title=workdir.dockerfile
WORKDIR /app
```

Sets the current directory inside the image for the instructions that follow (and for the running container). Subsequent `COPY`, `RUN`, and `CMD` operate relative to `/app`. Use it instead of `RUN cd /app` (which wouldn't persist anyway — like Module 11.2's make `cd` gotcha).

## COPY: bringing files in

```dockerfile title=copy.dockerfile
COPY package.json package-lock.json ./    # copy specific files
COPY . .                                   # copy everything (respecting .dockerignore)
```

`COPY <from-your-machine> <into-the-image>` puts files from your build context (your project) into the image. The *order* of `COPY` instructions matters enormously for caching (Module 14.3) — which is why you'll often see manifests copied separately before the rest of the source.

> [!TIP]
> Use a **`.dockerignore`** file (like `.gitignore`, Module 1.3) to exclude things from `COPY . .` — `node_modules`, `.git`, `.env` (never copy secrets into an image!), build output. This keeps images smaller and builds faster, and prevents accidentally baking secrets or huge folders into the image. Without it, `COPY . .` drags your entire `node_modules` and git history into the image.

## RUN: executing commands at build time

```dockerfile title=run.dockerfile
RUN npm ci
RUN apt-get update && apt-get install -y some-package
```

`RUN` executes a command *while building the image* — installing dependencies, compiling, etc. The result is baked into the image. Note `npm ci` (not `npm install`) for reproducible installs from the lockfile (Module 8.4).

> [!GOTCHA]
> Distinguish **`RUN`** (runs at *build* time, result saved in the image) from **`CMD`** (runs at *container start* time). `RUN npm ci` installs dependencies *into the image once, during build*. `CMD ["node", "server.mjs"]` is what executes *every time you start a container*. Confusing them — e.g. putting your server start in `RUN` — is a classic beginner error (the build would hang trying to "finish" a server that never exits).

## EXPOSE: documenting ports

```dockerfile title=expose.dockerfile
EXPOSE 8080
```

`EXPOSE` *documents* that the app listens on port 8080. Note: it doesn't actually *publish* the port — you do that at run time with `docker run -p 8080:8080` (Module 14.1). `EXPOSE` is informational, a hint to humans and tools about which port matters.

## CMD vs ENTRYPOINT: what runs on start

```dockerfile title=cmd.dockerfile
CMD ["node", "server.mjs"]
```

`CMD` defines the default command when a container starts. Use the **array form** (`["node", "server.mjs"]`) — called *exec form* — not a string. The exec form runs the program directly; the string form wraps it in a shell, which can cause signal-handling problems (your app may not receive shutdown signals, so it won't stop cleanly).

> [!NOTE]
> There's also `ENTRYPOINT`, which is similar but harder to override at run time. The common pattern: `ENTRYPOINT` for the *fixed* executable, `CMD` for the *default arguments* you might override. For most apps, a single `CMD` in exec form is all you need. Don't over-think it early on.

## ENV and ARG

```dockerfile title=env-arg.dockerfile
ENV NODE_ENV=production         # an environment variable, available at run time
ARG VERSION=1.0.0              # a build-time variable (NOT in the final image's env)
```

- **`ENV`** sets environment variables (Module 2.3) that exist in the running container — e.g. `NODE_ENV=production`.
- **`ARG`** sets a *build-time* variable, usable during `docker build` but not present when the container runs.

> [!WARNING]
> **Never put secrets in `ENV` or `ARG` in a Dockerfile**, and never `COPY` a `.env` file into an image (Module 9.3). The Dockerfile is committed to git, and the values get baked into the image's layers — anyone with the image can extract them (`docker history` reveals build args). Secrets belong in the *runtime* environment (passed via `docker run -e` or an orchestrator's secret store, Module 9.3), not in the image. This is a common, serious leak.

## USER: don't run as root

```dockerfile title=user.dockerfile
USER node
```

By default, containers run as `root` — which means a container escape hands an attacker root. Switching to a non-privileged user (`USER node`, which the official Node image provides) is a key security practice. Run as the least-privileged user that works.

## Putting it together

A complete, well-formed Dockerfile uses these instructions in an order optimized for caching (Module 14.3) and security:

```dockerfile title=Dockerfile
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./    # manifests first (cache, Module 14.3)
RUN npm ci                                 # install deps (cached unless manifests change)
COPY . .                                   # then the rest of the source
RUN node tools/generate-pages.mjs          # build the site at image-build time
USER node                                  # drop privileges
EXPOSE 8080
CMD ["node", "tools/serve.mjs"]            # run on container start (exec form)
```

This is essentially the course's Dockerfile (it adds multi-stage builds, Module 14.3, for an even smaller result). Every line is now meaningful to you.

> [!DOGFOOD]
> The course's `examples/docker/Dockerfile` uses all of these — `FROM node:22-slim`, `WORKDIR /app`, manifests-first `COPY` + `RUN npm ci` (caching), `RUN node tools/generate-pages.mjs` (build), `USER node` (security), `EXPOSE 8080`, and `CMD ["node", "tools/serve.mjs"]` (exec form). It also uses *multi-stage builds*, which we explain next lesson. Open it to read along.

> [!TRY]
> Write a minimal Dockerfile: `FROM node:22-slim`, `WORKDIR /app`, `COPY . .`, `CMD ["node", "--version"]`. If you have Docker, run `docker build -t test . && docker run test` — it prints the Node version *from inside the container*. You've built and run your first image.

> [!KEY]
> - A `Dockerfile` is an ordered recipe of **instructions** that build an image (Module 14.1) — reproducible, version-controlled environment-as-code.
> - **`FROM`** picks a base (pin + slim it: `node:22-slim`, not `latest`); **`WORKDIR`** sets the directory; **`COPY`** brings files in (use `.dockerignore`).
> - **`RUN`** executes at *build* time (baked into the image); **`CMD`** (exec-form array) runs at *container start* — don't confuse them.
> - **`EXPOSE`** documents a port (publishing happens at run with `-p`); **`USER node`** drops root for security.
> - **Never bake secrets** into `ENV`/`ARG` or `COPY` a `.env` into an image — they're extractable; secrets belong in the runtime environment (Module 9.3).
