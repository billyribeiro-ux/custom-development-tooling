# What Containers Solve

Containers (Docker being the famous example) are one of the most impactful tooling technologies of the last decade. But they're often taught as a pile of commands without the *why*. This lesson explains the actual problem containers solve — it's the ultimate answer to "works on my machine" — so the next lessons' `Dockerfile` syntax makes sense.

## The problem: "works on my machine"

You've seen this theme throughout the course (Module 1.3 reproducibility). Your app runs fine on your laptop. You deploy it to a server and it breaks: a different OS, a different Node version, a missing system library, a different locale, an environment variable that was set on your machine but not the server. The code is identical; the *environment* differs.

```text title=the-drift
Your laptop:          Server:
  macOS                 Ubuntu Linux
  Node 22.14            Node 18.2
  libssl 3.0            libssl 1.1
  TZ=America/New_York   TZ=UTC
  ...your dotfiles...   ...nothing...
→ app works          → app crashes
```

Lockfiles (Module 8.4) pin your *dependencies*, and version managers pin your *language*. But the *whole environment* — the OS, system libraries, tools, config — is still different. That's the gap containers close.

## The solution: package the whole environment

A **container** packages your app *together with its entire environment* — the OS libraries, the language runtime, the dependencies, the config — into one self-contained, portable unit (an **image**). That image runs *identically* anywhere a container runtime exists: your laptop, a teammate's, CI, staging, production.

> The pitch: "if it runs in the container on my machine, it runs in the *same* container everywhere." Reproducibility (Module 1.3) taken to its logical conclusion — you reproduce not just the dependencies but the entire operating environment.

## Containers vs virtual machines

People often confuse containers with virtual machines (VMs). The difference is what makes containers practical:

```text title=containers-vs-vms
VIRTUAL MACHINE                    CONTAINER
+-------------------+              +-------------------+
| App               |              | App               |
| Libraries         |              | Libraries         |
| GUEST OS (full!)  |              | (shares host OS   |
| (gigabytes, slow) |              |  kernel — light)  |
+-------------------+              +-------------------+
  Hypervisor                         Container runtime
  Host OS                            Host OS
```

- A **VM** virtualizes *hardware* and runs a *full guest operating system* — heavy (gigabytes), slow to start (minutes).
- A **container** shares the host's OS *kernel* and isolates just the app and its libraries — light (megabytes), fast to start (seconds).

Containers give you most of a VM's isolation at a tiny fraction of the cost. That efficiency is why they took over: you can run dozens of containers on one machine, start them instantly, and ship them easily.

## The key vocabulary

Three terms you must keep straight:

- **Image** — a *blueprint*: a packaged, immutable snapshot of an app + its environment. Built from a `Dockerfile` (Module 14.2). Like a *class* in programming.
- **Container** — a *running instance* of an image. Like an *object* (instance of a class). You can run many containers from one image.
- **Registry** — a *store* of images (Docker Hub, GitHub Container Registry). You `push` images to it and `pull` them down — like npm for containers.

```text title=the-lifecycle
Dockerfile  --(docker build)-->  Image  --(docker run)-->  Container
                                   │
                                   └--(docker push)-->  Registry  --(docker pull)-->  (another machine)
```

## The core commands

```bash title=docker-basics.sh
docker build -t myapp .          # build an IMAGE from the Dockerfile in this dir, tag it "myapp"
docker run myapp                 # run a CONTAINER from the image
docker run -p 8080:8080 myapp    # run, mapping host port 8080 -> container port 8080
docker ps                        # list running containers
docker push myapp                # push the image to a registry
docker pull myapp                # pull it down elsewhere
```

These mirror the lifecycle above: build an image, run it as a container, push/pull via a registry. We'll meet `docker compose` (orchestrating *multiple* containers) in Module 14.4.

## Why containers matter for tooling

Containers are themselves a *tooling* technology, and they appear throughout a project's tooling:

1. **Reproducible builds** — build your app *inside* a container so the build environment is identical everywhere (CI uses this constantly).
2. **Consistent dev environments** — a teammate runs `docker compose up` (Module 14.4) and gets the exact app + database, no manual setup.
3. **Deployment** — the same image you tested is what runs in production (no "works on my machine").
4. **Isolated services** — spin up a real Postgres, Redis, etc. for local development without installing them on your machine.

> [!NOTE]
> Containers are the natural endpoint of this course's recurring theme. Lockfiles reproduce dependencies (Module 8.4); version pinning reproduces tools; `.env` separates config (Module 9); containers reproduce the *entire environment*. Each layer eliminates more "works on my machine" surface area. Containers close the last big gap — the OS and system libraries.

> [!TIP]
> You don't always need containers. For a pure static site or a simple script, they can be overkill (Module 6.5's "match the tool to the task"). They shine when your app has *system-level* dependencies (specific libraries, a database, multiple services) or when "identical everywhere" really matters (production deployment). Reach for them when the environment itself is hard to reproduce — not for every project.

> [!DOGFOOD]
> This course ships an `examples/docker/Dockerfile` (Module 14.2) that builds and serves the site, and an `examples/docker/docker-compose.yml` (Module 14.4) that runs the site *plus* a Postgres database for the migration lessons. So you can experience the whole flow: build an image of this course, run it as a container, and spin up a real database alongside — all reproducibly.

> [!TRY]
> If you have Docker installed, run `docker --version` to confirm it, then `docker run hello-world` — it pulls a tiny image from a registry and runs it as a container, printing a success message. You've just done the build-isn't-needed-here, pull→run→container lifecycle. (No Docker? You can still read Modules 14.2-14.5 to understand the files.)

> [!KEY]
> - Containers solve **"works on my machine"** by packaging an app *with its entire environment* (OS libs, runtime, deps, config) into a portable **image** that runs identically everywhere.
> - Unlike **VMs** (full guest OS, heavy, slow), containers **share the host kernel** — light (MBs) and fast (seconds).
> - Vocabulary: **image** (blueprint/class) → **container** (running instance/object); **registries** store and share images (push/pull).
> - Core flow: **`docker build` → image → `docker run` → container**, with `push`/`pull` via a registry.
> - Containers are the endpoint of the course's **reproducibility** theme — but **match the tool to the task**; use them when the environment is hard to reproduce.
