# Your First Spec: Selectors, Assertions, Auto-Waiting

Now we write actual tests. A Playwright test file is called a **spec**. This lesson covers the three things every spec is made of: finding elements (**selectors/locators**), checking them (**assertions**), and the **auto-waiting** that makes it all reliable. Get these and you can test any web UI.

## The shape of a spec

```typescript title=example.spec.ts
import { test, expect } from '@playwright/test';

test('descriptive name of what this verifies', async ({ page }) => {
  await page.goto('/');                                   // 1. navigate
  await page.getByRole('button', { name: 'Start' }).click();  // 2. act
  await expect(page.locator('h1')).toContainText('Welcome');   // 3. assert
});
```

Every test follows this rhythm: **navigate → act → assert.** Note the `async`/`await` (Module 5.5) — browser actions are asynchronous, so you `await` each. The `{ page }` is the fresh browser tab Playwright provides (Module 16.2).

## Finding elements: locators

To act on or check an element, you first *locate* it. Playwright's **locators** describe elements, and the recommended ones mirror *how a user perceives the page* — which makes tests robust and meaningful:

```typescript title=locators.ts
// PREFERRED: user-facing, semantic locators (robust + accessible)
page.getByRole('button', { name: 'Submit' });   // by ARIA role + accessible name
page.getByText('Welcome back');                   // by visible text
page.getByLabel('Email');                         // a form field by its label
page.getByPlaceholder('Search...');               // by placeholder
page.getByTestId('user-menu');                    // by an explicit data-testid attribute

// CSS/structure-based (use when semantic locators don't fit)
page.locator('.progress-text');                   // by CSS class
page.locator('#main');                            // by id
page.locator('nav.pager a').first();              // CSS + position
```

> [!TIP]
> **Prefer `getByRole` and `getByText` over CSS selectors** when you can. They test the app *the way a user (and a screen reader) experiences it* — "the button labeled Submit," not "the element with class `.btn-x7f`." They're also more robust: a CSS class might change during a refactor (breaking the test for no real reason), but the button's *role and label* rarely do. As a bonus, `getByRole` nudges you toward accessible markup. Reach for `.locator('.css')` only when there's no good semantic option.

> [!GOTCHA]
> A locator is **lazy** — `page.getByRole(...)` doesn't find the element *immediately*; it's a *description* that Playwright resolves (and re-resolves) when you act on it (Module 16.2). This is why locators are robust to timing: each action re-finds the element. So define locators freely; they don't "go stale." (This differs from older tools where you'd grab an element reference that could become invalid.)

## Acting on elements

```typescript title=actions.ts
await page.getByRole('button', { name: 'Submit' }).click();   // click
await page.getByLabel('Email').fill('ada@example.com');        // type into a field
await page.getByLabel('Email').clear();                         // clear a field
await page.getByRole('checkbox').check();                       // check a checkbox
await page.keyboard.press('ArrowRight');                        // press a key
await page.goto('/lessons/001-welcome.html');                  // navigate
```

Each action is `await`ed and *auto-waits* (next section). `fill` is preferred over simulating individual keystrokes — it's faster and more reliable for entering text.

## Assertions: checking the result

Assertions use `expect` and describe what *should* be true. Playwright's web assertions **auto-retry** (below), so you assert the expected state and Playwright waits for it:

```typescript title=assertions.ts
await expect(page.locator('h1')).toContainText('Welcome');     // text contains
await expect(page.locator('.status')).toHaveText('Done');       // exact text
await expect(page.getByRole('button')).toBeVisible();           // is visible
await expect(page.getByRole('button')).toBeEnabled();           // is clickable
await expect(page.locator('.item')).toHaveCount(3);            // exactly 3 match
await expect(page).toHaveTitle(/Dashboard/);                    // page title matches
await expect(page.locator('a')).toHaveAttribute('href', /next/); // attribute matches
```

> [!GOTCHA]
> **`await` your assertions!** `await expect(locator).toBeVisible()` is the auto-retrying web assertion — it waits up to the timeout for the condition. Forgetting the `await` means the assertion runs but the test doesn't *wait* for it, so failures slip through (the test passes when it shouldn't) and you get "floating promise" warnings. Every `expect(locator)...` on a page element needs `await`. (Plain value assertions like `expect(2+2).toBe(4)` don't, but you rarely use those in E2E.)

## Auto-waiting: why you don't write sleeps

Here's the magic from Module 16.2, in practice. When you write:

```typescript title=auto-wait.ts
await page.getByRole('button', { name: 'Submit' }).click();
await expect(page.locator('.success')).toBeVisible();
```

Playwright automatically:

1. For the **click**: waits until the button *exists, is visible, is enabled, and is stable* (not animating), then clicks. If it's not ready within the timeout, the test fails with a clear message.
2. For the **assertion**: waits until `.success` *becomes visible* — re-checking repeatedly until it appears or the timeout hits.

So you *never* write `sleep(2000)`. You declare *what you expect*, and Playwright waits *exactly* as long as needed — no more, no less. This is what makes Playwright tests both fast and reliable (Module 16.7).

> [!WARNING]
> Resist the urge to add `await page.waitForTimeout(2000)` ("just wait 2 seconds"). It's the anti-pattern auto-waiting exists to replace: it's *slow* (always waits the full time) and *flaky* (2s might not be enough on a slow CI run). If you think you need a fixed wait, you almost certainly want to *wait for a condition* instead — `await expect(something).toBeVisible()`. Fixed sleeps are the #1 cause of slow, flaky suites (Module 16.7).

## A complete first spec

Putting it together — a real test of a simple flow:

```typescript title=home.spec.ts
import { test, expect } from '@playwright/test';

test('the home page links to the first lesson', async ({ page }) => {
  await page.goto('/');                                            // navigate (uses baseURL)
  await expect(page).toHaveTitle(/Custom Development Tooling/);     // assert the title
  await page.getByRole('link', { name: /Start the course/ }).click();  // act: click the link
  await expect(page.locator('.progress-text')).toHaveText('Lesson 1 of 114');  // assert we arrived
});
```

Read it as navigate → assert → act → assert. Every line `await`ed, semantic locators, auto-retrying assertions, no sleeps. That's idiomatic Playwright.

> [!DOGFOOD]
> This is essentially one of the tests in the course's `tests/e2e/nav.spec.ts` (Module 16.5). It uses `getByRole('link', { name: /Start the course/ })` (a semantic locator), `toHaveTitle` and `toHaveText` (auto-retrying assertions), and the `baseURL` from the config (Module 16.3) so `goto('/')` resolves to the served site. Open the spec to see more like it.

> [!TRY]
> Write a spec that goes to `/lessons/001-welcome.html`, asserts `.progress-text` has text `Lesson 1 of 114`, clicks the Next link (`getByRole('link', { name: /Next/ })`), and asserts the text changed to `Lesson 2 of 114`. Run it with `npx playwright test`. You'll have written a real E2E test using locators, actions, and auto-waiting assertions.

> [!KEY]
> - A **spec** follows **navigate → act → assert**; every browser action is `async`/`await`ed (Module 5.5).
> - **Prefer semantic locators** (`getByRole`, `getByText`, `getByLabel`) over CSS — they test as a user perceives the page, are robust to refactors, and encourage accessibility.
> - Locators are **lazy and auto-retrying** (a description, re-resolved on each use) — they don't go stale.
> - **`await` your assertions** (`await expect(locator).toBeVisible()`) — they **auto-retry** until the condition holds or times out.
> - **Never write fixed `sleep`/`waitForTimeout`** — auto-waiting makes tests fast *and* reliable; wait for *conditions*, not time (Module 16.7).
