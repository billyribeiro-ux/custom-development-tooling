# Running E2E in CI; Traces and Debugging

E2E tests deliver the most value when they run *automatically on every change* (Module 15) — and the most frustration when they fail and you can't tell *why*. This lesson covers running Playwright in CI and, crucially, Playwright's superb debugging tools — traces, the UI mode, and codegen — that make failures diagnosable instead of mysterious.

## Running E2E in CI

Recall the course's CI (Module 15.5) runs the tests with two steps:

```yaml title=ci-e2e.yaml
- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium
- name: Run end-to-end tests
  run: npx playwright test
```

Two things make this work in CI:

- **`npx playwright install --with-deps chromium`** — CI runners don't have browsers preinstalled. This downloads Chromium *and* its OS-level dependencies (`--with-deps` installs the system libraries the browser needs on the Linux runner). Without it, the tests fail with "browser not found."
- **`npx playwright test`** — runs the suite. Thanks to the `webServer` config (Module 16.3), this *builds the site, starts the server, runs the tests, and tears down* — all self-contained. CI needs no other setup.

Playwright runs **headless** in CI by default (Module 16.2) — no display needed — and the config's `retries: 2` (Module 16.3) absorbs the occasional flake. A failing test exits non-zero (Module 2.5), failing the CI gate (Module 15.2).

## The problem: a test failed in CI. Now what?

A test that fails *on your machine* you can debug by watching it (`--headed`, Module 16.2). But a test that fails *in CI* — on a remote runner you can't see — is the hard case. You get a terse error and no window to watch. This is where Playwright shines.

## Traces: a time-travel recording of the test

A **trace** is Playwright's killer debugging feature: a complete, replayable recording of *everything* that happened during a test — every action, every network request, the DOM at each step, and a screenshot/snapshot timeline. When a test fails in CI, you download the trace and *replay it locally*, scrubbing back and forth like a video.

The config enables traces on retry (Module 16.3):

```typescript title=trace-config.ts
use: {
  trace: 'on-first-retry',     // record a trace the first time a test retries
}
```

To capture traces in CI and inspect them, upload them as artifacts:

```yaml title=upload-traces.yaml
- name: Run end-to-end tests
  run: npx playwright test
- uses: actions/upload-artifact@v4
  if: failure()                       # only upload when tests failed
  with:
    name: playwright-traces
    path: test-results/               # where Playwright writes traces
```

Then, locally, open the downloaded trace:

```bash title=view-trace.sh
npx playwright show-trace trace.zip
```

This opens the **Trace Viewer** — a UI where you see each step, the page state at that moment, console logs, and network activity. You can literally *see* what the page looked like when the click failed ("oh, the button was covered by a modal"). It turns "the test failed in CI for some reason" into "I can see exactly what happened." This is debugging E2E failures you couldn't otherwise reproduce.

> [!TIP]
> `trace: 'on-first-retry'` is the sweet spot (Module 16.3): successful runs stay fast (no trace overhead), but any test that fails-then-retries gets fully recorded. Combined with `upload-artifact` on `if: failure()`, you get a downloadable, replayable recording of *exactly* the CI failure — without slowing down the 99% of runs that pass. It's the difference between "good luck reproducing it" and "here's a video of the bug."

## Other built-in debugging artifacts

Beyond traces, Playwright can capture:

```typescript title=debug-artifacts.ts
use: {
  screenshot: 'only-on-failure',    // a screenshot at the moment of failure
  video: 'retain-on-failure',        // a video of the whole test, kept only if it failed
}
```

A screenshot shows the final failed state; a video shows the whole run. Like traces, capturing them *only on failure* keeps passing runs fast. Upload them as artifacts (above) to inspect CI failures.

## Local debugging tools

When developing tests, Playwright's interactive tools are excellent:

```bash title=local-debug.sh
npx playwright test --ui          # UI MODE: run/watch/step through tests interactively
npx playwright test --debug       # step through a test line by line with the Inspector
npx playwright test --headed      # watch the browser (Module 16.2)
```

**UI mode** (`--ui`) is the best day-to-day tool: a panel where you pick tests, watch them run live, see each step's DOM snapshot, and re-run on file changes. It tightens the test-writing feedback loop (Module 1.2) enormously.

## Codegen: record tests by clicking

Writing locators by hand is tedious. Playwright's **codegen** *records your clicks* into test code:

```bash title=codegen.sh
npx playwright codegen http://localhost:8080
```

This opens a browser; as you click and type, Playwright writes the corresponding `getByRole(...).click()` / `fill(...)` code (using good semantic locators, Module 16.4). It's a fast way to scaffold a test — record the flow, then clean up the generated code and add assertions.

> [!NOTE]
> Codegen is a *starting point*, not a finished test. It captures the *actions* well but doesn't know your *intent* — you still add the meaningful `expect` assertions (what should be true after each step). Use it to bootstrap the navigation/typing, then make it a real test by asserting outcomes. It's a productivity tool, not an autopilot.

## The debugging workflow

Putting it together, when an E2E test fails:

1. **Locally?** Run `--ui` or `--headed` and *watch* it fail — usually the cause is obvious.
2. **In CI?** Download the **trace** artifact and `show-trace` it — replay exactly what happened on the runner.
3. **Writing a new test?** Use `codegen` to scaffold and `--ui` to iterate.

This toolkit is a big part of why Playwright displaced older E2E tools (Module 16.2): failures are *diagnosable*, not mysterious. A test suite you can debug is a test suite you'll trust and maintain (Module 16.7).

> [!DOGFOOD]
> The course's `playwright.config.ts` (Module 16.3) sets `trace: 'on-first-retry'`, so if a navigation test ever fails-and-retries in CI, a full trace is recorded. The CI workflow (Module 15.5) runs `npx playwright install --with-deps chromium` then `npx playwright test` — the exact CI pattern from this lesson. Try `npx playwright test --ui` locally to watch the navigation tests run interactively.

> [!TRY]
> In the repo, run `npx playwright test --ui` and step through the navigation tests — watch each click and assertion, and see the page snapshot at every step. Then run `npx playwright codegen http://localhost:8080` (after `npm run serve` in another terminal), click around the course, and watch Playwright generate locator code. You've used Playwright's two best developer tools.

> [!KEY]
> - In CI, install browsers with **`npx playwright install --with-deps chromium`**, then **`npx playwright test`** (self-contained via `webServer`, runs headless).
> - **Traces** are the killer debugging feature: a replayable recording of a test. Enable `trace: 'on-first-retry'` and **upload artifacts on failure** to replay CI failures locally with `show-trace`.
> - Also capture **screenshots/video on failure**; capturing only-on-failure keeps passing runs fast.
> - Locally, **`--ui`** (UI mode) is the best tool for watching/iterating; **`codegen`** records clicks into starter test code (then you add assertions).
> - Diagnosable failures are why Playwright won — a debuggable suite is a trusted, maintained suite (Module 16.7).
