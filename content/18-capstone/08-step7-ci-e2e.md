# Step 7 — GitHub Actions CI + Playwright E2E

The final layer: automation. We add **E2E tests** (Module 16) that verify Linkboard works in a real browser, and a **CI pipeline** (Module 15) that runs all the checks on every push and deploys passing code. This is where Linkboard becomes a project the *machine* keeps healthy — the culmination of everything.

## The E2E tests

Linkboard's critical user journey (Module 16.1) is simple: *the page loads and shows the saved links.* That's exactly what E2E should verify (it needs a real browser rendering real HTML). Following Module 16.3-16.5:

```typescript title=tests/e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  forbidOnly: !!process.env.CI,                     // catch stray .only in CI (Module 16.3)
  retries: process.env.CI ? 2 : 0,                  // absorb rare flakes in CI (Module 16.3)
  use: { baseURL: 'http://localhost:8080', trace: 'on-first-retry' },  // (Module 16.3)
  webServer: {
    command: 'make dev',                            // build + serve (Module 16.3)
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

```typescript title=tests/e2e/linkboard.spec.ts
import { test, expect } from '@playwright/test';

test('home page shows the seeded links', async ({ page }) => {
  await page.goto('/');                                          // baseURL (Module 16.3)
  await expect(page.locator('h1')).toContainText('Linkboard');   // auto-retrying assert (Module 16.4)
  // The seed (Step 4) loads Node.js and Playwright links:
  await expect(page.getByRole('link', { name: 'Node.js' })).toBeVisible();   // semantic locator (Module 16.4)
  await expect(page.getByRole('link', { name: 'Playwright' })).toBeVisible();
});

test('every link points somewhere', async ({ page }) => {
  await page.goto('/');
  const links = page.locator('ul li a');
  await expect(links.first()).toHaveAttribute('href', /^https?:\/\//);  // each is a real URL
});
```

These follow every testing principle: the `webServer` config runs `make dev` (so tests run against a fresh build — Module 16.3), the config is CI-aware (`forbidOnly`, `retries` — Module 16.3), tests use semantic locators and auto-retrying assertions (Module 16.4), each test is independent (its own `goto` — Module 16.7), and there are no fixed sleeps (Module 16.7). They verify the *whole stack* — database → generator → HTML → browser — works together (Module 16.1).

## The CI pipeline

Now the workflow that runs everything automatically (Module 15.5), calling the same `make` targets you run locally (the golden rule, Module 17.1):

```yaml title=.github/workflows/ci.yml
name: CI
on:
  push:
    branches: ["main"]
  pull_request:                                       # gate every PR (Module 15.2)

permissions:
  contents: read                                      # least privilege (Module 15.4)
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true                            # cancel superseded runs (Module 15.4)

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4                     # get the code (Module 15.3)
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm                                  # cache deps (Module 15.4)
      - run: npm ci                                   # reproducible install (Module 8.4)

      - name: Lint
        run: |
          sudo apt-get update && sudo apt-get install -y shellcheck
          make lint                                   # SAME target as local (Module 17.1)
      - name: Build
        run: make build                               # SAME target as local
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium   # (Module 16.6)
      - name: Test
        run: make test                                # SAME target as local
```

Reading it through Modules 15-17:

- **Triggers** (Module 15.2): runs on push to `main` and *every PR* — gating PRs, the killer feature (Module 15.2).
- **Least-privilege `permissions`** and **`concurrency`** cancellation (Module 15.4) — production hygiene.
- **Setup** (Module 15.3): `checkout`, `setup-node` with npm caching (Module 15.4), `npm ci` (Module 8.4).
- **The gates call `make`** (Module 17.1's golden rule): `make lint`, `make build`, `make test` — the *exact same commands* you run locally (Step 6). So "passes in CI" ≡ "passes locally," and any CI failure is reproducible on your machine.
- **Each gate fails via its exit code** (Module 2.5, 15.2): a lint error, build failure, or test failure fails the job, which blocks the PR.

This is a complete CI pipeline where every gate is a tool you built — and it's *thin*, because the Makefile already defines the work (Module 17.1).

## Adding deploy (optional)

If Linkboard's static output should ship to GitHub Pages, add the deploy job from Module 15.6:

```yaml title=ci.yml (deploy job)
  deploy:
    needs: ci                                         # only after checks pass (Module 15.6)
    if: github.ref == 'refs/heads/main'               # only on main (Module 15.6)
    runs-on: ubuntu-latest
    permissions: { pages: write, id-token: write }    # narrow widen (Module 15.4)
    steps:
      - uses: actions/checkout@v4
      - run: make build
      - uses: actions/upload-pages-artifact@v3
        with: { path: site }
      - uses: actions/deploy-pages@v4
```

`needs: ci` + `if: main` (Module 15.6) means Linkboard deploys *only* after passing every check, *only* from main — gating PRs, shipping main (Module 15.2). Code reaches production solely by passing the gates and landing on main.

> [!TIP]
> Notice how *thin* the CI file is — it mostly calls `make` targets (Module 17.1). That's the golden rule paying off: the *real* logic lives in the Makefile and scripts (Steps 1-6), and CI just decides *when* (on push/PR) and *where* (clean runners) to run it. If you find yourself writing complex logic *in* the YAML, move it into a script or Make target instead — keep CI a thin orchestrator. Thin CI is maintainable CI.

> [!DOGFOOD]
> Linkboard's `ci.yml` mirrors the course's `.github/workflows/ci.yml` (Module 15.5): same triggers, least-privilege permissions, concurrency, cached setup, gates-call-make, and conditional deploy. Its `playwright.config.ts` and spec follow the course's `tests/e2e/` (Module 16.3/16.5). Open those as your templates — adapt the specifics, keep the structure.

> [!TRY]
> Write Linkboard's `playwright.config.ts`, `linkboard.spec.ts`, and `ci.yml`. Run `make test` locally to confirm the E2E tests pass against the built site. Then push to a GitHub repo and watch the Actions tab run the same `make lint`/`make build`/`make test` on a clean runner. Seeing CI run your tools automatically is the moment it all comes together.

> [!KEY]
> - **E2E tests** (Module 16) verify Linkboard's critical journey — the page loads and shows the links — in a real browser, testing the whole stack (database → generator → HTML).
> - The Playwright config is **CI-aware** (`forbidOnly`, `retries`, `webServer: make dev`); specs use **semantic locators**, **auto-retrying assertions**, and are **independent** with **no sleeps** (Modules 16.3-16.7).
> - **CI runs on push + every PR** (Module 15.2), with least-privilege permissions and concurrency (Module 15.4), and its gates **call the same `make` targets you run locally** (Module 17.1's golden rule).
> - Optional **deploy** uses `needs: ci` + `if: main` (Module 15.6) — ship only what passed, only from main.
> - **Keep CI thin** — it orchestrates `make`; the real logic lives in the Makefile and scripts (Steps 1-6).
