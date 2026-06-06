// =============================================================================
// playwright.config.ts — Playwright configuration, narrated in Module 16.
// It tells Playwright how to build + serve the site before testing, which
// browser(s) to use, and how to behave in CI vs locally.
//
// It lives at the repo ROOT (Playwright auto-discovers it here), and points
// testDir at tests/e2e/ where the spec files live. The webServer command and
// `npm run serve` therefore run from the repo root, as intended.
// =============================================================================
import { defineConfig, devices } from '@playwright/test';

// `defineConfig` (the pattern from Module 12) gives us autocomplete + type-checks.
export default defineConfig({
  testDir: './tests/e2e', // where the *.spec.ts files live
  fullyParallel: true, // run independent test files at the same time

  // In CI, fail the build if someone left a `test.only` in the code, and retry
  // flaky tests a couple of times to reduce false failures.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  // Collect a trace (a full recording you can replay) on the first retry — the
  // single best Playwright debugging feature. See Module 16.
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
  },

  // Playwright starts this command and waits for the URL before running tests,
  // then shuts it down afterwards. Our `serve` script builds, then serves.
  webServer: {
    command: 'npm run serve',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
