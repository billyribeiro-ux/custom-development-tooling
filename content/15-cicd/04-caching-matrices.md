# Caching, Matrices, and Secrets in Actions

With the anatomy down (Module 15.3), let's add the three features that turn a basic workflow into a *production* one: **caching** (make CI fast), **matrices** (test across many versions), and **secrets** (use credentials safely). These are what separate a toy pipeline from a real one.

## Caching: don't redo expensive work

Every CI run starts on a *fresh* runner (Module 15.3) — which means, by default, every run re-downloads all your dependencies from scratch. That's slow. **Caching** saves expensive results between runs and restores them, so you only redo work when inputs change — the exact feedback-loop principle from Module 1.2 and Docker layer caching from Module 14.3.

```yaml title=caching.yaml
steps:
  - uses: actions/setup-node@v4
    with:
      node-version: 22
      cache: npm                  # the easy way: setup-node caches ~/.npm automatically
  - run: npm ci
```

The simplest caching is built into setup actions: `cache: npm` tells `setup-node` to cache the npm download cache, keyed on your `package-lock.json` (Module 8.4). When the lockfile is unchanged, `npm ci` restores from cache instead of re-downloading — often turning a 60-second install into 5 seconds.

For more control, use the general `actions/cache`:

```yaml title=manual-cache.yaml
steps:
  - uses: actions/cache@v4
    with:
      path: ~/.npm                          # what to cache
      key: npm-${{ hashFiles('package-lock.json') }}   # cache key (changes when lockfile changes)
      restore-keys: npm-                     # fallback to a partial match
```

> [!TIP]
> The **cache key** is everything. Key it on a *hash of the inputs* (`hashFiles('package-lock.json')`) so the cache is reused while the lockfile is unchanged and *automatically invalidated* when dependencies change. This is content-addressing again — the same idea as Module 7.4's content-hashed filenames and Module 1.4's determinism. A bad key (e.g. a constant) gives you a *stale* cache that serves old dependencies; a too-specific key never hits. Hash the right inputs.

## Matrices: test across many configurations

Often you need to test across *multiple* versions or platforms — Node 20 *and* 22, on Linux *and* Windows. A **matrix** runs the same job once per combination, automatically and in parallel:

```yaml title=matrix.yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
        node: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci && npm test
```

This single job definition expands into **four** parallel runs: (ubuntu, 20), (ubuntu, 22), (windows, 20), (windows, 22). Each uses its matrix values via `${{ matrix.os }}` and `${{ matrix.node }}`. You write the job once; the matrix multiplies it.

> [!NOTE]
> Matrices are how libraries verify they work across the versions they support (the reproducibility concern from Module 1.3, tested explicitly). If your `package.json` says `"engines": { "node": ">=20" }` (Module 8.2), a matrix of Node 20 and 22 *proves* both work — catching version-specific bugs before users hit them. It's also how you catch cross-platform bugs (Module 17.3) by running on Linux, macOS, and Windows.

```yaml title=matrix-options.yaml
strategy:
  fail-fast: false       # don't cancel other combos when one fails (see them all)
  matrix:
    node: [20, 22, 24]
```

`fail-fast: false` is useful: by default, one failing combination cancels the rest; setting it false lets *all* combos finish so you see *every* failure at once (the same "report all errors" courtesy as Module 9.5).

## Secrets: credentials without committing them

CI often needs credentials — to deploy, publish, or call an API. You can't put them in the workflow file (it's committed, Module 9.3!). GitHub Actions provides an encrypted **secrets** store; you reference secrets via `${{ secrets.NAME }}`:

```yaml title=secrets.yaml
steps:
  - run: ./deploy.sh
    env:
      API_TOKEN: ${{ secrets.API_TOKEN }}      # injected from the encrypted secret store
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

You add secrets in the repository settings (Settings → Secrets), and they're injected into the run as needed — never visible in the YAML, never in git. This is the production version of Module 9.3's "secrets live in a secret manager, not in code."

> [!WARNING]
> **Never `echo` a secret or print it in CI output** (Module 9.3). GitHub *masks* registered secrets in logs (replacing them with `***`), but don't rely on it — a secret transformed (base64'd, concatenated) can slip past the mask. And remember: **secrets are not available to workflows triggered by pull requests from forks** (a deliberate security measure — otherwise a malicious PR could exfiltrate your secrets by reading them in a step). Design deploy steps to run only on trusted branches (Module 15.6), not on arbitrary forked PRs.

## Permissions: least privilege

Modern Actions security practice: grant each workflow only the permissions it needs (the same least-privilege idea as `USER node` in Docker, Module 14.2):

```yaml title=permissions.yaml
permissions:
  contents: read        # default to read-only for the whole workflow

jobs:
  deploy:
    permissions:
      pages: write        # this job needs more, granted narrowly
      id-token: write
```

Defaulting to `contents: read` and widening only where needed limits the blast radius if a workflow (or a compromised action) misbehaves. We use exactly this in the course's deploy workflow (Module 15.6).

## Other production touches

```yaml title=production-touches.yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true      # cancel an old run when you push again (saves minutes)

jobs:
  build:
    timeout-minutes: 15          # kill a hung job instead of running forever
```

`concurrency` cancels a superseded run when you push again to the same branch (no point finishing a run for code you've already replaced). `timeout-minutes` prevents a stuck job from burning your CI budget. Small touches that mark a mature pipeline.

> [!DOGFOOD]
> This course's `.github/workflows/ci.yml` (Module 15.5) uses several of these: `cache: npm` on `setup-node` for fast installs, top-level `permissions: contents: read` with the deploy job widening to `pages: write` / `id-token: write`, a `concurrency` group with `cancel-in-progress: true`, and secrets referenced (not inlined) for deployment. Open it to see production-grade Actions config in a real, small file.

> [!TRY]
> Take the minimal workflow from Module 15.3 and add `cache: npm` to its `setup-node` step. Then add a `strategy.matrix` over `node: [20, 22]`. Mentally trace: it now runs twice (once per Node version), each with cached dependencies. You've made a basic pipeline both faster and more thorough.

> [!KEY]
> - **Caching** saves expensive work (dependency installs) between fresh runs — use `cache: npm` on setup actions, or `actions/cache` with a **key hashed on the lockfile** so it invalidates correctly.
> - **Matrices** (`strategy.matrix`) run a job once per combination of versions/OSes in parallel — proving cross-version/cross-platform support (Module 1.3, 17.3); `fail-fast: false` shows all failures.
> - **Secrets** (`${{ secrets.NAME }}`) inject credentials from an encrypted store — never commit them, never print them, and they're withheld from forked-PR runs.
> - Apply **least-privilege `permissions`** (default `contents: read`, widen narrowly), and add **`concurrency`** + **`timeout-minutes`** for a mature pipeline.
