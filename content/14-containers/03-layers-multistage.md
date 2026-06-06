# Layer Caching, Multi-Stage Builds, and Small Images

A working Dockerfile (Module 14.2) is step one. Making it *fast to build* and *small to ship* is what separates beginner images from production ones. Two techniques do most of the work: **layer caching** (build fast) and **multi-stage builds** (ship small). Understanding both will make your images dramatically better.

## Images are built in layers

Each instruction in a Dockerfile creates a **layer** — a saved snapshot of the filesystem changes that instruction made. An image is a *stack* of these layers:

```text title=layers
CMD ["node", "serve.mjs"]   <- layer 5
RUN node generate.mjs        <- layer 4
COPY . .                     <- layer 3
RUN npm ci                   <- layer 2 (the expensive one!)
COPY package*.json ./        <- layer 1
FROM node:22-slim            <- base layers
```

The key fact: **Docker caches each layer**, and on a rebuild it *reuses* a cached layer if that instruction and its inputs haven't changed. It only re-runs an instruction if it (or a layer *before* it) changed. This caching is what makes rebuilds fast — when it's used well.

## The caching rule that changes everything

Because a changed layer invalidates *all layers after it*, the order of instructions hugely affects rebuild speed. The golden rule:

> **Put what changes *least* first, what changes *most* last.**

Your dependencies change rarely; your source code changes constantly. So copy and install dependencies *before* copying your source:

```dockerfile title=cache-friendly.dockerfile
COPY package.json package-lock.json ./    # changes rarely
RUN npm ci                                 # EXPENSIVE — but cached unless manifests change
COPY . .                                   # changes constantly (every edit)
RUN node tools/generate-pages.mjs          # cheap rebuild
```

```dockerfile title=cache-hostile.dockerfile
COPY . .                                   # ANY source edit invalidates this...
RUN npm ci                                 # ...so npm ci re-runs EVERY build (slow!)
```

In the cache-friendly version, editing your source code only invalidates the `COPY . .` layer onward — `npm ci` stays cached, saving minutes per build. In the cache-hostile version, *every* edit re-runs the expensive `npm ci`, because the `COPY . .` before it changed. Same instructions, wildly different rebuild times, purely from order.

> [!TIP]
> This "manifests first, source later" pattern (Module 14.2's Dockerfile) is the single most impactful Dockerfile optimization. It's the same insight as feedback-loop speed (Module 1.2) and incremental builds (make, Module 11.2): *don't redo expensive work when its inputs haven't changed.* Copy `package.json`/lockfile, install, *then* copy the rest.

## The size problem

A naive image includes *everything* used to build it: the full source, dev dependencies, build tools, compilers. But to *run* the app, you often need only the built output and the runtime. Shipping all the build machinery makes images huge — slow to push, pull, and deploy, with a bigger attack surface.

```text title=the-bloat
Single-stage image:  source + dev deps + build tools + output  =  large
What you actually run:                                  output  =  small
```

## Multi-stage builds: build big, ship small

A **multi-stage build** uses *multiple* `FROM` statements. Early stages do the heavy building; the final stage starts fresh and *copies only the finished artifacts* from the build stage. The build tools never make it into the final image.

```dockerfile title=multi-stage.dockerfile
# ---- Stage 1: builder (has all the build tools) ----
FROM node:22-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci                                 # installs ALL deps, including dev
COPY . .
RUN node tools/generate-pages.mjs          # build the site

# ---- Stage 2: runtime (clean, tiny) ----
FROM node:22-slim AS runtime
WORKDIR /app
USER node
# Copy ONLY the built output + the server from the builder stage:
COPY --from=builder --chown=node:node /app/site ./site
COPY --from=builder --chown=node:node /app/tools/serve.mjs ./tools/serve.mjs
EXPOSE 8080
CMD ["node", "tools/serve.mjs"]
```

The magic is `COPY --from=builder`: the final `runtime` stage starts from a clean base and pulls in *only* `/app/site` and the server script from the `builder` stage. Everything else from the build — the source, `node_modules` with dev dependencies, the generator — is left behind in the discarded builder stage. The shipped image contains only what's needed to *run*.

> [!NOTE]
> Multi-stage builds give you the best of both worlds: the build stage can have every tool it needs (compilers, dev deps, the full source), while the final image stays minimal. This is especially dramatic for compiled languages (a Go binary in a `scratch` image is a few MB) and front-end builds (ship the static output, not the whole toolchain). It's "build big, ship small," and it's standard practice for production images.

## Other size wins

```dockerfile title=size-tips.dockerfile
# Combine RUN commands so cleanup happens in the SAME layer (or the cleanup
# doesn't actually shrink the image — deleted files in a later layer still
# take space in the earlier one):
RUN apt-get update && apt-get install -y curl \
    && rm -rf /var/lib/apt/lists/*        # clean up in the same RUN

# Use --omit=dev (or a production install) when you don't need dev deps:
RUN npm ci --omit=dev
```

> [!GOTCHA]
> A subtle layer trap: deleting files in a *later* layer doesn't shrink the image, because the files still exist in the *earlier* layer where they were created (layers are additive — a later layer can hide but not erase earlier bytes). So `RUN install-big-thing` then `RUN rm big-thing` keeps the big thing in the image. You must do the install *and* cleanup in the *same* `RUN` (joined with `&&`) so the net result is one slim layer. This catches many people.

## Why this matters

Small, cache-friendly images aren't vanity — they're real tooling value (Module 1.2):

- **Faster CI** — cached layers mean rebuilds take seconds, not minutes.
- **Faster deploys** — a 50MB image pushes/pulls far faster than a 1.5GB one.
- **Lower cost** — less storage, less bandwidth, faster autoscaling.
- **More secure** — fewer installed packages = smaller attack surface.

> [!DOGFOOD]
> The course's `examples/docker/Dockerfile` is a **multi-stage build**: a `builder` stage runs `npm ci` and `node tools/generate-pages.mjs`, then a clean `runtime` stage `COPY --from=builder`s only the generated `site/` and `serve.mjs`, runs as `USER node`, and serves. The build tools and dev dependencies never reach the final image — exactly the "build big, ship small" pattern. It also copies manifests before source for cache-friendliness. Open it and trace the two stages.

> [!TRY]
> Look at the course's `examples/docker/Dockerfile` and identify: the two `FROM ... AS` stages, where `npm ci` runs (builder), and the `COPY --from=builder` lines (what gets pulled into runtime). Notice what's *absent* from the runtime stage — that absence is the whole point. Then find where manifests are copied before source (the caching optimization).

> [!KEY]
> - Images are stacks of cached **layers**, one per instruction; Docker **reuses** a layer unless it (or a prior layer) changed.
> - **Order matters**: put least-changing instructions first. **Manifests + install before source** so editing code doesn't re-run `npm ci` (the top optimization).
> - **Multi-stage builds** (`FROM ... AS builder`, then `COPY --from=builder`) **build big, ship small** — the final image gets only the artifacts, not the build tools/dev deps.
> - Deleting files in a *later* layer doesn't shrink the image — **clean up in the same `RUN`** (additive layers).
> - Small, cache-friendly images mean faster CI/deploys, lower cost, and a smaller attack surface.
