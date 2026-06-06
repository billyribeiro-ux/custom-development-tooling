# What Playwright Is and Why It's the Modern Default

For end-to-end testing (Module 16.1) — driving a real browser to verify your app works as a user experiences it — **Playwright** has become the modern standard. This lesson explains what it is, why it won out over older tools, and the key ideas that make it pleasant to use, before we write actual tests.

## What Playwright is

Playwright is a tool (from Microsoft) that **automates real browsers** for testing. Your test code says things like "go to this page," "click that button," "expect this text to appear" — and Playwright drives an actual browser (Chromium, Firefox, or WebKit/Safari) to do it, exactly as a user would.

```typescript title=playwright-flavor.ts
import { test, expect } from '@playwright/test';

test('the home page works', async ({ page }) => {
  await page.goto('/');                              // navigate
  await expect(page.locator('h1')).toContainText('Welcome');  // assert
});
```

That's the whole idea: scripted user actions plus assertions, run in a real browser. If the test passes, a real user doing the same thing would succeed too.

## Why E2E browser testing is hard (and why tools matter)

Browser automation has historically been *painful*, for one core reason: **timing**. Modern web pages load asynchronously — content appears after network requests, animations, and JavaScript runs. A naive test that clicks a button "immediately" often fails because the button isn't there *yet*. Old tools made you litter tests with `sleep(2000)` waits — slow and flaky (sometimes 2 seconds isn't enough; sometimes it's wasteful).

Playwright's headline feature solves exactly this:

## Auto-waiting: the killer feature

Playwright **automatically waits** for elements to be ready before acting on them. When you write `await page.click('button')`, Playwright waits until that button *exists, is visible, and is clickable* — then clicks. No manual `sleep`s, no guessing.

```typescript title=auto-waiting.ts
// You write this — clean and intent-focused:
await page.getByRole('button', { name: 'Submit' }).click();

// Playwright automatically: waits for the button to exist, be visible,
// be enabled, and be stable (not animating) — THEN clicks. No sleep needed.
```

This single feature eliminates the #1 cause of flaky E2E tests (Module 16.7). Tests become both *faster* (it waits exactly as long as needed, no more) and *more reliable* (it never acts too early). It's why Playwright tests are far less flaky than the previous generation's.

## Why Playwright over the alternatives

The E2E landscape evolved through several tools; here's why Playwright is the 2026 default:

| Tool | Status | Notes |
| --- | --- | --- |
| **Selenium** | the old standard | powerful but verbose; manual waits → flaky |
| **Cypress** | popular | nice DX, but limited cross-browser, runs in-browser (architectural limits) |
| **Playwright** | **the modern default** | auto-waiting, all browsers, fast, great tooling |

Playwright's advantages:

1. **Auto-waiting** (above) — dramatically less flakiness.
2. **All real browsers** — Chromium, Firefox, *and* WebKit (the Safari engine), so you test what users actually use.
3. **Fast and parallel** — runs tests in parallel across browser contexts (Module 16.6).
4. **Excellent debugging** — traces, screenshots, video, and a UI mode (Module 16.6) that make failures easy to diagnose.
5. **Auto-generated tests** — `playwright codegen` records your clicks into test code.

## Key concepts you'll use

A few terms recur throughout the next lessons:

- **`page`** — represents a browser tab. You navigate it (`page.goto`), query it (`page.locator`), and act on it (`click`, `fill`).
- **`locator`** — a *description* of an element ("the button named Submit"). Locators are *lazy* and *auto-retrying* — they re-find the element each time, which is why they're robust to timing.
- **`expect`** — assertions, with built-in auto-waiting (`await expect(...).toBeVisible()` waits for visibility).
- **`test`** — defines a test case; tests are isolated from each other (each gets a fresh page).

```typescript title=concepts.ts
test('example', async ({ page }) => {        // 'page' = a fresh browser tab
  await page.goto('/lessons/001-welcome.html');     // navigate
  const next = page.getByRole('link', { name: /Next/ });  // a LOCATOR (description)
  await next.click();                         // act (auto-waits)
  await expect(page.locator('.progress-text')).toContainText('Lesson 2');  // assert (auto-waits)
});
```

## Headless vs headed

Playwright runs browsers **headless** (no visible window) by default — fast and ideal for CI (Module 15). For debugging, run **headed** to *watch* the browser, or use UI mode:

```bash title=run-modes.sh
npx playwright test               # headless (default; fast, for CI)
npx playwright test --headed      # watch the browser do its thing
npx playwright test --ui          # interactive UI mode — step through tests visually
```

> [!TIP]
> When a test fails mysteriously, run it `--headed` or `--ui` to *watch* what the browser actually does. Often you'll instantly see the problem ("oh, a cookie banner is covering the button"). Being able to *see* the test run is one of Playwright's best debugging features (more in Module 16.6). Headless for speed; headed for understanding.

> [!DOGFOOD]
> This course uses Playwright to test its own navigation. `tests/e2e/nav.spec.ts` (Module 16.5) opens the built site in a real Chromium browser, clicks the Previous/Next buttons, presses arrow keys, and asserts the page changed — verifying the exact feature (page navigation) that the generator (Module 5.7) produces. The config is in `playwright.config.ts` at the repo root (Module 16.3). Run `make test` or `npx playwright test` to see it.

> [!TRY]
> If you have the repo, run `npm install && npx playwright install chromium`, then `npx playwright test --headed` — watch a real browser open the course and click through it automatically. Seeing Playwright drive the actual site makes the whole concept click.

> [!KEY]
> - **Playwright** automates **real browsers** (Chromium, Firefox, WebKit) to run E2E tests — scripted user actions plus assertions.
> - Its killer feature is **auto-waiting**: it waits for elements to be ready before acting, eliminating the `sleep`-based flakiness of older tools (Module 16.7).
> - It's the **2026 default** over Selenium/Cypress for auto-waiting, true cross-browser support, speed/parallelism, and great debugging.
> - Core concepts: **`page`** (a tab), **`locator`** (a lazy, auto-retrying element description), **`expect`** (auto-waiting assertions), **`test`** (isolated cases).
> - Runs **headless** by default (fast, for CI); use **`--headed`/`--ui`** to *watch* tests and debug.
