# Anatomy of playwright.config.ts

Playwright is configured with a `playwright.config.ts` file — a config-as-code file (Module 12) using the `defineConfig` pattern (Module 12.3). It controls which browsers to test, how to start your app, and how tests behave in CI vs locally. Reading the course's real config line by line ties Module 12's config concepts to a tool you'll actually use.

> [!DOGFOOD]
> This is the course's real `tests/e2e/playwright.config.ts`. Open it alongside this lesson. Notice it's a `.ts` config — config-as-code (Module 12.1) with full type-checking.

## The defineConfig wrapper

```typescript title=playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // ...config...
});
```

This is exactly the config-as-code pattern from Module 12: import **`defineConfig`** *from Playwright* (its own typed version, Module 12.3) and `export default` the config wrapped in it. Because it's typed, your editor autocompletes every option and flags typos (Module 12.3's whole point). `devices` provides preset browser configurations (below).

## testDir and parallelism

```typescript title=playwright.config.ts
  testDir: '.',
  fullyParallel: true,
```

- **`testDir: '.'`** — where the spec files live (here, the same folder as the config, `tests/e2e/`).
- **`fullyParallel: true`** — run independent test files *at the same time* (Module 16.2's parallelism). Because each test is isolated (gets its own `page`, Module 16.2), they can run concurrently for speed.

## CI-aware settings

```typescript title=playwright.config.ts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
```

These read the `CI` environment variable (Module 2.3, 9 — CI systems set `CI=true`) to behave differently in CI vs locally — the config-as-code superpower (Module 12.1):

- **`forbidOnly: !!process.env.CI`** — `test.only` (a way to run just one test during local debugging) would accidentally skip all other tests if committed. In CI, `forbidOnly` makes a stray `.only` *fail the build* — catching the mistake before it hides real test failures. Clever safety.
- **`retries: process.env.CI ? 2 : 0`** — retry failed tests twice *in CI* (to absorb occasional flakiness, Module 16.7), but *never locally* (where you want to see failures immediately). A pragmatic balance.

## use: defaults for every test

```typescript title=playwright.config.ts
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
  },
```

The `use` block sets defaults shared by all tests:

- **`baseURL: 'http://localhost:8080'`** — lets tests use *relative* URLs: `page.goto('/lessons/001-welcome.html')` resolves against this base. Change the base in one place and every test follows (single source of truth, Module 0.4).
- **`trace: 'on-first-retry'`** — record a **trace** (a full, replayable recording of the test) the first time a test retries. Traces are Playwright's best debugging feature (Module 16.6) — and recording only on retry keeps successful runs fast while capturing the data you need when something fails.

## webServer: start the app automatically

This is one of Playwright's most useful features for E2E testing:

```typescript title=playwright.config.ts
  webServer: {
    command: 'npm run serve',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
```

Playwright will **start your app before testing and stop it after** — no manual "start the server, then run tests" dance:

- **`command: 'npm run serve'`** — the command to launch the app. (The course's `serve` script *builds then serves*, Module 11.5 — so the tests always run against a fresh build.)
- **`url`** — Playwright *waits* until this URL responds before starting tests (so tests never run against a not-yet-ready server — the same readiness concern as Docker health checks, Module 14.4).
- **`reuseExistingServer: !process.env.CI`** — locally, reuse an already-running dev server (fast iteration); in CI, always start fresh (clean state, Module 1.3).
- **`timeout: 60_000`** — give the server up to 60 seconds to start.

> [!TIP]
> `webServer` makes E2E tests *self-contained*: `npx playwright test` (or `make test`) builds the site, starts the server, runs the tests against it, and tears it down — one command, no setup. This is what lets CI (Module 15.5) just run `npx playwright test` with nothing else. Self-contained tests are reproducible tests (Module 1.3).

## projects: which browsers

```typescript title=playwright.config.ts
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
```

**`projects`** defines the browser configurations to test against. Each `project` runs the whole suite in that configuration. Here we test one — Chromium — using the `Desktop Chrome` device preset (a realistic viewport and user agent). To test more browsers (Module 16.2's cross-browser advantage), you'd add entries:

```typescript title=more-browsers.ts
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },   // tests Safari's engine!
    { name: 'mobile',   use: { ...devices['iPhone 14'] } },         // mobile viewport
  ],
```

> [!NOTE]
> The course tests only Chromium for speed and simplicity (it's a static site; rendering is consistent). A real cross-browser app would add Firefox and WebKit to catch browser-specific bugs — this is the matrix idea (Module 15.4) but for browsers, configured right here. Adding a browser is one line; the trade-off is test time. Match the breadth to the project's needs (Module 6.5).

> [!TRY]
> Open the course's `tests/e2e/playwright.config.ts` and find: `defineConfig`, `baseURL`, the `webServer.command`, and the `chromium` project. Then trace what `npx playwright test` does: start `npm run serve` → wait for `localhost:8080` → run the specs in Chromium → shut down. That self-contained flow is the config's whole job.

> [!KEY]
> - `playwright.config.ts` is **config-as-code** (Module 12) using **`defineConfig`** (Module 12.3) — typed, autocompleted.
> - It reads **`process.env.CI`** to behave differently in CI (`forbidOnly`, `retries: 2`) vs locally — the config-as-code superpower (Module 12.1).
> - **`use.baseURL`** enables relative URLs in tests; **`trace: 'on-first-retry'`** records replayable debugging data only when needed (Module 16.6).
> - **`webServer`** auto-starts your app (and waits for it to be ready) before tests and stops it after — making `npx playwright test` self-contained (one command builds, serves, tests, tears down).
> - **`projects`** picks the browsers/devices; add Firefox/WebKit/mobile to broaden coverage (a browser matrix, Module 15.4).
