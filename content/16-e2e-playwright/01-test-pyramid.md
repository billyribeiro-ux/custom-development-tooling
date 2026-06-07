# Unit vs Integration vs E2E: Where Each Fits

Tests are tooling too — automated checks that catch bugs before users do (Module 1.2's trustworthy feedback loop). But not all tests are the same. Understanding the *kinds* of tests, and when to use each, is what lets you build a test suite that's both *thorough* and *fast* — before we dive into Playwright specifically.

## Three levels of tests

Tests are usually grouped by *how much* of the system they exercise:

- **Unit tests** — test one small piece (a function, a class) *in isolation*. Fast, focused, numerous.
- **Integration tests** — test several pieces working *together* (e.g. your code + a real database). Slower, fewer.
- **End-to-end (E2E) tests** — test the *whole system* the way a user experiences it (click a button in a real browser, see the result). Slowest, fewest, most realistic.

```text title=what-each-tests
UNIT          slugify("Hello World") === "hello-world"     (one function)
INTEGRATION   saveUser() then loadUser() against a real DB  (code + database)
E2E           open the site, click Next, verify the page changed  (the whole app, in a browser)
```

## The testing pyramid

The classic guidance for *how many* of each to write is the **testing pyramid**:

```text title=the-pyramid
        /\
       /E2E\        few   — slow, realistic, brittle (test critical user flows)
      /------\
     / integr.\     some  — medium speed (test pieces working together)
    /----------\
   /   unit     \   many  — fast, focused, cheap (test logic exhaustively)
  /--------------\
```

The shape says: **many unit tests** (they're fast and cheap, so test logic exhaustively), **some integration tests**, and **few E2E tests** (they're slow and more brittle, so reserve them for critical user journeys). This balance gives you broad, fast coverage with a few realistic checks on top.

## The trade-offs that drive the shape

Why not just write all E2E tests (they're the most realistic)? Because realism trades off against speed and stability:

| | Unit | Integration | E2E |
| --- | --- | --- | --- |
| Speed | milliseconds | ~seconds | seconds to minutes |
| Realism | low (isolated) | medium | **high** (real user path) |
| Stability | very stable | medium | more brittle (timing, UI) |
| What it catches | logic bugs | wiring bugs | "the whole thing is broken" |
| Pinpoints the bug | precisely | roughly | vaguely ("something failed") |

- **Unit tests** are fast and pinpoint exactly what broke, but can't catch "the pieces don't fit together."
- **E2E tests** catch real, user-facing breakage that nothing else would (the login button literally doesn't work), but are slow, and when they fail they tell you *something* is wrong without saying precisely what.

The pyramid balances these: lots of fast, precise unit tests for confidence in the details; a few slow, realistic E2E tests for confidence the whole thing works.

> [!NOTE]
> There's an opposing shape people warn against — the "ice cream cone" (many E2E, few unit): a slow, flaky suite that takes forever and fails mysteriously. It happens when teams skip unit tests and try to cover everything end-to-end. Resist it. E2E tests are *valuable but expensive* — use them deliberately for critical flows, not as your primary coverage. (Flakiness gets its own lesson, Module 16.7.)

## When to use each

A practical guide:

- **Unit test** pure logic and edge cases: a `slugify` function (Module 5.6), a config merge (Module 8.5), a date formatter. Anything with clear inputs/outputs and branching logic. Write many.
- **Integration test** where pieces connect: code that talks to a database (does the migration + seed + query actually work together, Module 13?), an API client against a real or fake server. Write some.
- **E2E test** the critical *user journeys*: can a user sign up, log in, check out? Does the navigation work? Reserve these for the flows that *must not break*. Write few.

> [!TIP]
> A useful heuristic: **push tests as low as they'll go.** If a bug can be caught by a fast unit test, write that instead of a slow E2E test. Only escalate to E2E for things that *genuinely* require the whole system in a browser — like "does clicking this button navigate correctly?" The lower the test, the faster and more precise. Don't use an E2E test to check logic a unit test could verify in a millisecond.

## Where this course focuses

This course has **both** layers — a small, real testing pyramid:

- **Unit tests** (`tests/unit/generator.test.mjs`, run with the built-in `node:test`) cover the generator's *pure logic*: `slugify`, `fill`, `stripToText`, reading-time, and especially `flatten`'s prev/next wiring (Module 5.7). Fast, precise, no filesystem.
- **E2E tests with Playwright** (Modules 16.2-16.7) cover the *user journeys* that need a real browser: navigation, search, the theme toggle, progress tracking. You can't unit-test "clicking Next changes the page" — that's the E2E sweet spot (Module 16.5).

This split is the pyramid in miniature (Module 16.1): push logic checks *down* to fast unit tests, reserve the slow browser tests for what genuinely needs the whole system.

> [!DOGFOOD]
> The course's `tests/unit/generator.test.mjs` unit-tests the generator's pure helpers (it imports them from `tools/lib.mjs` — which is *why* those functions were extracted there, Module 5.7), while `tests/e2e/nav.spec.ts` and `tests/e2e/features.spec.ts` (Module 16.5) drive a real browser to verify navigation, search, theme, and progress. `make test` runs both layers; CI runs both on every push. That's a proper pyramid — fast unit tests for logic, a few E2E tests for the critical flows.

> [!TRY]
> For an app you know, classify three things to test by level: a utility function (unit), saving-and-loading data (integration), and a key user flow like login (E2E). Notice how the unit one is fast and precise, the E2E one is slow but proves the real thing works. That classification skill *is* the pyramid.

> [!KEY]
> - Tests come in levels: **unit** (one piece, isolated, fast, precise), **integration** (pieces together), **E2E** (whole system, in a browser, realistic but slow/brittle).
> - The **testing pyramid**: many unit, some integration, few E2E — balancing speed/precision against realism.
> - Realism trades off against **speed and stability**; avoid the "ice cream cone" (too many E2E) — it's slow and flaky.
> - **Push tests as low as they'll go** — only escalate to E2E for flows that genuinely need the whole system (like navigation working in a browser).
> - This course uses **E2E (Playwright)** because verifying real browser navigation is inherently end-to-end — the E2E sweet spot.
