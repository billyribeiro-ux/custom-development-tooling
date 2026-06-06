# Flakiness, Fixtures, and Test Hygiene

We end the testing module with the topic that determines whether an E2E suite is an asset or a liability: **flakiness**. A flaky test — one that passes sometimes and fails sometimes, with no code change — is worse than no test, because it destroys trust in the whole suite. This lesson is about keeping tests reliable, isolated, and maintainable.

## Why flakiness is so corrosive

Recall Module 1.2: a feedback signal you *can't trust* is worthless. A flaky test is exactly that. When a test fails randomly:

1. People start *ignoring* failures ("oh, that test is just flaky, re-run it").
2. Once failures are ignored, a *real* bug that breaks that test goes unnoticed.
3. Trust in the *entire* suite erodes — if one test lies, why believe the others?

> A flaky test is worse than no test: it costs time *and* gives false signals, training the team to ignore the very failures that matter.

So reliability isn't a nice-to-have for E2E tests — it's *the* thing. A small, reliable suite beats a large, flaky one every time.

## The #1 cause: timing (and the cure)

The overwhelming source of flakiness is **timing** — acting before the page is ready (Module 16.2). The cure is Playwright's auto-waiting, used correctly:

```typescript title=flaky-vs-stable.ts
// FLAKY: a fixed wait — sometimes too short (fails), always wasteful
await page.waitForTimeout(2000);
await page.locator('.result').click();

// STABLE: wait for the actual CONDITION — exactly as long as needed
await expect(page.locator('.result')).toBeVisible();
await page.locator('.result').click();
```

> [!WARNING]
> **`waitForTimeout` (fixed sleeps) is the #1 cause of flaky tests.** A 2-second wait passes on your fast laptop and fails on a loaded CI runner where the page took 2.1 seconds — *random* failures with no code change. Replace *every* fixed sleep with a *condition wait* (`expect(...).toBeVisible()`, `waitForURL`, `waitForLoadState`). Auto-waiting (Module 16.2) exists precisely to eliminate this. If you ever type `waitForTimeout`, stop and ask "what am I actually waiting *for*?" — then wait for *that*.

## Cause 2: test interdependence

Tests must be **independent** — each should pass on its own, in any order, regardless of the others. Flakiness erupts when one test depends on another's leftover state:

```typescript title=interdependence.ts
// BAD: test B assumes test A ran first and created a user
test('A: create user', async ({ page }) => { /* creates "ada" */ });
test('B: edit user', async ({ page }) => { /* assumes "ada" exists — FAILS if A didn't run */ });
```

If tests run in parallel (Module 16.3's `fullyParallel`) or in a different order, B fails because A's state isn't there. The fix: **each test sets up its own state** and cleans up after itself. Playwright gives each test a fresh `page` (Module 16.2), but *shared backend state* (a database, files) is your responsibility to isolate.

> [!TIP]
> Make every test **self-contained**: it creates what it needs at the start and doesn't rely on other tests or on a particular run order. Then `fullyParallel` is safe and your suite is robust to reordering. The mental test: "would this pass if it were the *only* test that ran?" If not, it has a hidden dependency. (This is the same isolation idea as subshells in Module 2.7 and clean CI runners in Module 15.3 — isolation prevents spooky action at a distance.)

## Fixtures: reusable, isolated setup

A **fixture** is Playwright's mechanism for shared *setup* that stays *isolated* per test. Instead of copy-pasting login steps into every test, you define a fixture that provides a ready-to-use, per-test resource:

```typescript title=fixtures.ts
import { test as base, expect } from '@playwright/test';

// Define a fixture that provides a logged-in page to any test that asks for it
const test = base.extend<{ loggedInPage: Page }>({
  loggedInPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('ada@example.com');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Welcome')).toBeVisible();   // setup done
    await use(page);                                          // hand it to the test
    // ...any teardown after 'use' returns...
  },
});

// Tests just request the fixture — setup runs automatically, fresh, per test
test('dashboard shows stats', async ({ loggedInPage }) => {
  await expect(loggedInPage.getByText('Your stats')).toBeVisible();
});
```

Fixtures give you DRY setup *without* the interdependence trap: each test that requests `loggedInPage` gets its *own* freshly-logged-in page. Setup is shared (written once); state is isolated (per test). It's the clean way to handle "lots of tests need a logged-in user."

> [!NOTE]
> Built-in fixtures are what `{ page }` *is* — Playwright provides a fresh `page` fixture to every test automatically. Custom fixtures (like `loggedInPage`) extend that idea to *your* app's common setups. Playwright also has `beforeEach`/`afterEach` hooks for simpler cases, but fixtures compose better and make dependencies explicit (a test *declares* what it needs by naming the fixture).

## Other hygiene practices

A few more habits that keep a suite healthy:

- **Stable locators** — prefer semantic `getByRole`/`getByText` (Module 16.4) over brittle CSS that breaks on refactors. A locator that matches "the Submit button" survives a redesign; `.btn-x7f` doesn't.
- **Test behavior, not implementation** — assert *what the user sees* ("the success message appears"), not internal details. Implementation-coupled tests break on harmless refactors (false failures, which breed flakiness-fatigue).
- **One concern per test** — a focused test that checks one thing fails *clearly*; a test that checks ten things fails *vaguely* and is hard to debug.
- **Keep the suite fast** — slow suites get run less, so bugs slip in. Parallelism (Module 16.3) and pushing tests down the pyramid (Module 16.1) keep it quick.
- **Quarantine, don't ignore** — if a test is flaky and you can't fix it now, *mark* it (e.g. `test.fixme`) so it's visibly tracked, rather than letting it randomly fail and train people to ignore red.

## When retries are appropriate (and when they hide bugs)

The config retries failed tests in CI (Module 16.3, `retries: 2`). This is pragmatic — it absorbs *rare, truly-random* infrastructure blips. But:

> [!WARNING]
> **Retries treat the symptom, not the disease.** A test that only passes *on retry* is still flaky — retries just hide it. Use retries as a safety net for genuinely rare blips, *not* as a substitute for fixing flaky tests. If a test frequently needs its retries, that's a signal to *fix* it (usually a timing or isolation issue above), not to bump the retry count. Watch which tests retry; a consistently-retrying test is a bug report.

> [!DOGFOOD]
> The course's navigation tests (Module 16.5) are reliable by construction: they use auto-retrying assertions (no `waitForTimeout`), each test is independent (every test does its own `page.goto`, relying on no other test's state), and they use stable locators (`.progress-text`, semantic `getByRole`). The config's `retries: 2` in CI (Module 16.3) is there for rare runner blips, not to paper over flakiness — the tests pass on the first try.

> [!TRY]
> Audit the course's `nav.spec.ts` against this lesson: does any test use `waitForTimeout`? (No.) Does any test depend on another running first? (No — each starts with its own `goto`.) Are the locators stable? (Yes.) That checklist — no fixed sleeps, full independence, stable locators — is how you keep *any* suite reliable.

> [!KEY]
> - A **flaky test** (passes/fails randomly) is **worse than no test** — it erodes trust and trains people to ignore real failures (Module 1.2).
> - The **#1 cause is timing** — replace every fixed **`waitForTimeout`** with a **condition wait** (auto-waiting, Module 16.2).
> - Make tests **independent and self-contained** (would it pass as the *only* test?); use **fixtures** for DRY-but-isolated setup (a fresh resource per test).
> - Practice hygiene: **stable semantic locators**, **test behavior not implementation**, **one concern per test**, keep the suite **fast**, and **quarantine** flaky tests visibly.
> - **Retries** absorb rare blips but **hide flakiness** — fix consistently-retrying tests rather than masking them.
