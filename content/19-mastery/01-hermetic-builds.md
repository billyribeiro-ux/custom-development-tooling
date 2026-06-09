# Hermetic & Reproducible Builds: Correctness Over Convenience

Welcome to the mastery track. You've built the capstone; now we go deeper — into the ideas that distinguished engineers reach for when "it works" isn't enough and *correctness at scale* is the bar. We start with the deepest one: making a build a **pure function** of its inputs.

## The thesis: a build is a function

A senior engineer thinks of a build as "the command that produces the artifact." A principal engineer thinks of it as a **mathematical function**: `artifact = build(sources, toolchain, environment)`. And like any function you want to trust, it should be:

- **Deterministic** — same inputs → byte-identical output (Module 1.4).
- **Hermetic** — it depends on *nothing* outside its declared inputs.
- **Reproducible** — anyone, anywhere, anytime gets the same result.

Most builds violate all three without anyone noticing, until the day they cause a security incident or a heisenbug that only reproduces in production. Let's see why — and how the best build systems enforce purity.

## Why Make is "incorrect" (and that's a famous result)

Module 11 taught Make's timestamp model: rebuild a target if it's *older* than its prerequisites. This is convenient and it's also **provably incorrect** as a model of correctness. The classic critique is Peter Miller's *"Recursive Make Considered Harmful"* and the broader observation that **mtimes are a lie**:

```text title=why-mtimes-lie
- git checkout changes file CONTENTS but timestamps jump around → stale or needless rebuilds
- two files with identical content but different mtimes → Make thinks work is needed
- a clock skew across a network mount → builds that never rebuild, or always do
- editing then reverting a file → new mtime, same content → Make rebuilds for nothing
```

The root error: **Make keys on *when* a file changed, not on *what it contains*.** Correctness requires keying on content.

## Content-addressing: the correct model

The fix is **content-addressed builds**: identify every input by a cryptographic hash of its bytes (you met this in `build-assets.ts`, Module 7.4). The build cache key becomes a hash of *(hashes of all inputs + the command + the toolchain version)*. This is exactly how the serious build systems work:

```text title=correct-build-systems
Bazel / Buck2   — hermetic, content-addressed action graph; remote caching by hash
Nix             — every package is a function of its inputs; the store path IS the hash
Turborepo / Nx  — content-hash task caching for JS monorepos
```

Under this model, "do I need to rebuild?" becomes "have I *ever* seen this exact input hash before?" If yes, fetch the cached output — possibly built by a *colleague* or *CI*, on another machine, last week. That's **remote caching**, and it's why a 30-minute build at a big company can finish in 30 seconds: someone already built that exact input.

> [!NOTE]
> This is the same idea as Docker layer caching (Module 14.3) and lockfile integrity hashes (Module 8.4), generalized into a whole build graph. Once you see "the cache key is a hash of all inputs," you see it *everywhere* — HTTP ETags, Git itself (every object is content-addressed by SHA), CDN cache busting (Module 7.4). Content-addressing is one of computing's great unifying ideas.

## Hermeticity: declare every input, hide everything else

A build is **hermetic** if it can *only* see its declared inputs — not your `$HOME`, not whatever version of `python3` happens to be on `PATH` (Module 2.2), not the network, not the system clock. Non-hermetic builds are the deep cause of "works on my machine" (Module 1.3) and of irreproducible CI.

```text title=leaks-that-break-hermeticity
- reading an unpinned tool from PATH        → pin the toolchain (Module 8.4, version managers)
- network access during build               → vendor deps; build offline; pin by digest
- absolute paths embedded in output         → use relative paths / path remapping
- the current time baked into artifacts     → SOURCE_DATE_EPOCH (see below)
- locale / timezone / $LANG                 → set them explicitly
- non-deterministic ordering (Module 1.4)   → sort everything
```

The discipline: **make inputs explicit and the environment irrelevant.** Containers (Module 14) approximate hermeticity by controlling the OS; Nix and Bazel enforce it by *sandboxing* the build so it physically cannot read undeclared inputs.

## The timestamp trap: SOURCE_DATE_EPOCH

A subtle reproducibility killer: tools that embed `new Date()` into their output (Module 1.4) — a build timestamp in a header, a copyright year, a zip file's mtime. Two builds of identical source now differ, breaking content-addressing.

The cross-ecosystem fix is a convention: the **`SOURCE_DATE_EPOCH`** environment variable. Build tools that respect it use *that* fixed timestamp instead of "now":

```bash title=reproducible-timestamp.sh
# Use the last commit's time as the canonical build time — deterministic per commit:
export SOURCE_DATE_EPOCH="$(git log -1 --pretty=%ct)"
make build      # any tool honoring SOURCE_DATE_EPOCH now embeds THIS time, not now()
```

The Reproducible Builds project (reproducible-builds.org) exists to make this the norm — because **bit-for-bit reproducibility is a security property**, not just tidiness: it lets *anyone* independently rebuild a binary and verify it matches what was shipped, proving the build server wasn't compromised. That verification is impossible if the build isn't deterministic.

## The trade-off: correctness vs. convenience

Here's the principal-level judgment. Full hermeticity (Bazel, Nix) is *correct* but has real costs: a steep learning curve, everything must be modeled in the build graph, and friction with ecosystems that assume network access. Make/npm-scripts are *convenient* but unsound.

> [!WARNING]
> Don't cargo-cult Bazel onto a five-person project — the correctness it buys may not be worth the complexity it costs (Module 6.5: match the tool to the task). The right move is to understand *where on the spectrum you need to be*: a static site (like this course) is fine with Make + a deterministic generator; a thousand-engineer monorepo with 40-minute builds genuinely needs content-addressed remote caching. Knowing *which* problem you have — and not over- or under-engineering it — is the skill.

> [!DOGFOOD]
> This course's generator is deliberately built toward the *correct* end within a simple tool: it sorts inputs (Module 1.4), reads from a manifest rather than scanning the filesystem (so order is deterministic, Module 5.3), cleans its output directory each run (no stale artifacts, Module 5.7), and embeds no timestamps in pages — so two builds of the same source produce byte-identical HTML. It's not Bazel, but it honors the *principles* Bazel enforces. That's the point: you can apply the deep ideas at any scale.

> [!TRY]
> Build this course twice into two directories and diff them: `node tools/generate-pages.mjs --out a && node tools/generate-pages.mjs --out b && diff -r a b`. They should be *identical* — the build is deterministic. Now imagine a generator that wrote `Built at ${new Date()}` into the footer; the diff would be non-empty every run. That difference is the line between reproducible and not.

> [!KEY]
> - Think of a build as a **pure function** `artifact = build(sources, toolchain, env)` — it should be **deterministic, hermetic, and reproducible**.
> - **Make's mtime model is provably incorrect** (timestamps lie); the correct model is **content-addressing** — cache keyed on a hash of all inputs (Bazel/Nix/Turborepo), enabling **remote caching** across machines.
> - **Hermeticity** = the build sees *only* its declared inputs (no stray `PATH` tools, network, clock, or locale) — the deep cure for "works on my machine."
> - Kill embedded timestamps with **`SOURCE_DATE_EPOCH`**; bit-for-bit reproducibility is a **security property** (independently verifiable builds).
> - **Match the rigor to the problem** — apply the *principles* (sort, pin, no hidden inputs, no `now()`) at any scale; reserve heavyweight hermetic systems for when correctness-at-scale truly demands them.
