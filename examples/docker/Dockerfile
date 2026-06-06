# =============================================================================
# Dockerfile — build a container image that builds and serves this course.
# Narrated in Module 14. We use a MULTI-STAGE build: a "builder" stage with all
# the build tools, and a tiny "runtime" stage that contains only what's needed
# to serve the finished site. Smaller images ship faster and have less to attack.
# =============================================================================

# ---- Stage 1: builder -------------------------------------------------------
# Pin a specific, slim base image. "node:22-slim" = Node 22 on a minimal Debian.
# Pinning the major version keeps builds reproducible; "slim" keeps them small.
FROM node:22-slim AS builder

# A conventional working directory inside the image.
WORKDIR /app

# Copy ONLY the dependency manifests first. Docker caches each layer; as long as
# these files don't change, the expensive "npm ci" layer below is reused — even
# when your source code changes. Order your Dockerfile cheapest-to-change last.
COPY package.json package-lock.json ./

# "npm ci" installs the EXACT versions from the lockfile (clean, reproducible),
# unlike "npm install" which may update it.
RUN npm ci

# Now copy the rest of the source and build the static site.
COPY . .
RUN node tools/generate-pages.mjs

# ---- Stage 2: runtime -------------------------------------------------------
# Start over from a clean, tiny base. Nothing from the builder comes along
# except what we explicitly COPY, so build tools never reach production.
FROM node:22-slim AS runtime
WORKDIR /app

# Run as a non-root user. The official node image ships a "node" user; using it
# means a container escape doesn't hand the attacker root. Security by default.
USER node

# Copy just the generated site and the tiny server from the builder stage.
COPY --from=builder --chown=node:node /app/site ./site
COPY --from=builder --chown=node:node /app/tools/serve.mjs ./tools/serve.mjs

# Document the port the server listens on (serve.mjs defaults to 8080).
EXPOSE 8080

# The command that runs when the container starts.
CMD ["node", "tools/serve.mjs"]
