# Lockfiles: What They Are and Why You Commit Them

The lockfile is one of the most important — and most misunderstood — files in modern development. It's the *one* generated file you deliberately commit (Module 1.3's famous exception). Understanding it is the difference between reproducible builds and the dreaded "but it worked yesterday."

## The problem lockfiles solve

Recall version ranges (Module 8.2): `"marked": "^18.0.0"` means "18.0.0 or any compatible newer version." That flexibility is convenient — you get bug fixes automatically — but it creates a reproducibility problem (Module 1.3):

```text title=the-drift
You install on Monday    -> npm picks marked 18.0.5 (newest compatible then)
Teammate installs Friday -> npm picks marked 18.0.7 (a newer one was released)
CI installs next week    -> npm picks marked 18.1.0
```

Now three people have *three different versions* of the same dependency, from the same `package.json`. If 18.1.0 has a subtle bug, it works for you and breaks for them — the textbook "works on my machine." Version *ranges* alone can't give reproducible installs.

## The solution: a lockfile

A **lockfile** records the *exact* version of *every* installed package — including dependencies-of-dependencies (transitive deps) — that were actually resolved. For npm it's `package-lock.json`:

```json title=package-lock.json (excerpt)
{
  "name": "custom-development-tooling",
  "lockfileVersion": 3,
  "packages": {
    "node_modules/marked": {
      "version": "18.0.5",
      "resolved": "https://registry.npmjs.org/marked/-/marked-18.0.5.tgz",
      "integrity": "sha512-..."
    }
  }
}
```

Each entry pins the **exact version**, the **URL** it came from, and an **integrity hash** (a checksum that verifies the downloaded bytes weren't tampered with — a supply-chain security safeguard). With a lockfile present, everyone installs *identical* dependency trees.

## package.json vs lockfile: two different jobs

This is the key mental model:

| File | Records | Edited by |
| --- | --- | --- |
| `package.json` | what you *want* (ranges: `^18.0.0`) | **humans** |
| `package-lock.json` | what you *got* (exact: `18.0.5`) | **the tool** (npm) |

`package.json` expresses *intent* ("I want an 18.x of marked"). The lockfile records the *resolution* ("we're all using exactly 18.0.5"). You edit `package.json`; npm regenerates the lockfile to match. Never hand-edit a lockfile.

## Why you commit it (the exception to the rule)

In Module 1.3 we said: don't commit generated artifacts. The lockfile *is* generated, yet we commit it. Why? Because its **entire purpose is reproducibility** — it only helps if everyone shares the *same* one. An uncommitted lockfile is useless; a committed lockfile guarantees identical installs across your laptop, your teammates', and CI.

> [!NOTE]
> The sharper version of the rule (Module 1.3): *commit what you can't regenerate, plus what guarantees everyone regenerates identically.* The lockfile is the latter. That's why it's the deliberate exception — committing it is exactly *because* it pins reproducibility.

## install vs ci

There are two ways to install, and the difference matters enormously:

```bash title=install-vs-ci.sh
npm install     # may UPDATE the lockfile (resolves ranges, adds new deps)
npm ci          # installs EXACTLY what the lockfile says — never changes it
```

- **`npm install`** reconciles `package.json` and the lockfile, potentially updating the lock (e.g. when you add a dependency). Use it during *development*.
- **`npm ci`** ("clean install") installs *strictly* from the lockfile, errors if the lockfile and `package.json` disagree, and deletes `node_modules` first for a pristine install. Use it in *CI and production* for guaranteed reproducibility and speed.

> [!TIP]
> **Always use `npm ci` in CI and Docker builds**, not `npm install`. It's faster (no resolution work), and it *guarantees* the exact locked versions — so CI tests what will actually ship. This course's CI workflow (Module 15) and Dockerfile (Module 14) both use `npm ci` for precisely this reason.

> [!DOGFOOD]
> This repo commits `package-lock.json`, and both the Dockerfile (`RUN npm ci`) and CI (`run: npm ci`) install from it. So the marked, Playwright, and TypeScript versions are *identical* in your local build, in CI, and in the container. That's reproducibility (Module 1.3) you can rely on — built on this one committed file.

## Every ecosystem has one

Lockfiles aren't a Node-only idea — they're a universal answer to the same problem:

| Ecosystem | Manifest (intent) | Lockfile (resolution) |
| --- | --- | --- |
| npm | `package.json` | `package-lock.json` |
| pnpm / yarn | `package.json` | `pnpm-lock.yaml` / `yarn.lock` |
| Python (uv/poetry) | `pyproject.toml` | `uv.lock` / `poetry.lock` |
| Rust | `Cargo.toml` | `Cargo.lock` |
| Go | `go.mod` | `go.sum` |

Same pattern everywhere: a human-edited manifest of *what you want*, and a tool-generated lockfile of *what you got* — committed, for reproducibility. Recognize this and you understand dependency management in any language.

> [!WARNING]
> A lockfile *merge conflict* (when two branches both changed dependencies) is common and shouldn't be resolved by hand-editing the lockfile JSON. Instead, resolve the `package.json` conflict, then regenerate: `npm install` rebuilds a correct lockfile. Hand-editing a lockfile almost always produces a broken, inconsistent tree.

> [!TRY]
> In the repo, open `package-lock.json` and find the `marked` entry — note its exact `version` and `integrity` hash. Compare to `package.json`, which has a range or exact value. You're seeing "what we got" vs "what we want." Then note that both the Dockerfile and `ci.yml` run `npm ci`, not `npm install`.

> [!KEY]
> - Version *ranges* (`^18.0.0`) cause drift: different installs get different versions → "works on my machine."
> - A **lockfile** pins the **exact** version, source, and **integrity hash** of every (transitive) dependency, so installs are identical everywhere.
> - **`package.json` = what you want** (human-edited ranges); **lockfile = what you got** (tool-generated exact versions). Never hand-edit the lockfile.
> - **Commit the lockfile** — it's the deliberate exception to "don't commit artifacts," because its job *is* reproducibility.
> - Use **`npm ci`** (not `npm install`) in CI/Docker for exact, fast, reproducible installs. Every ecosystem has the same manifest+lockfile pattern.
