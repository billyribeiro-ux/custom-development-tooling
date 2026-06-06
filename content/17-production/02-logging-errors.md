# Logging, Observability, and Good Error Messages in Tooling

The difference between tooling that's a joy to use and tooling that's a nightmare often comes down to one thing: *what it tells you*. Good output and great error messages turn a frustrating debugging session into a five-second fix. This lesson is about communicating well from your tools — a skill that compounds over a career.

## Tools talk to humans; communicate clearly

A tool that does the right thing but communicates poorly is half-broken. When your script runs, the user (often future-you) needs to know: *Is it working? What's it doing? Did it succeed? If not, why, and how do I fix it?* Every script is a conversation; make it a good one.

## Logging: say what you're doing

Recall the streams (Module 2.4): **progress and diagnostics go to stderr; results/data go to stdout.** This lets users capture a tool's *output* while still *seeing* its progress:

```javascript title=logging-streams.mjs
console.log(JSON.stringify(result));          // RESULT -> stdout (capturable, pipeable)
console.error('processing 42 files...');       // PROGRESS -> stderr (visible, not in the data)
```

Good progress logging tells the user the tool is alive and what stage it's at — especially important for slow operations (Module 1.2 — silence makes a user wonder if it hung):

```javascript title=progress.mjs
console.error(`Building ${total} pages...`);
for (const [i, page] of pages.entries()) {
  if (i % 10 === 0) console.error(`  ...${i}/${total}`);   // periodic progress
}
console.error(`Done: ${total} pages in ${ms}ms`);          // summary (closes the loop)
```

> [!DOGFOOD]
> The course's generator (Module 5.7) does exactly this: `Building course into site/...`, a warning per missing lesson, and `Done: 107 lessons + index in 91 ms`. You always know it started, what it skipped, and that it finished — with timing. That closing summary (Module 1.2) confirms success at a glance.

## Log levels: control the verbosity

Different situations need different detail. **Log levels** let users dial verbosity up (debugging) or down (normal use):

```javascript title=log-levels.mjs
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const threshold = LEVELS[process.env.LOG_LEVEL ?? 'info'];   // env-configurable (Module 9)

const log = {
  error: (m) => console.error(`ERROR: ${m}`),
  warn:  (m) => threshold >= 1 && console.error(`WARN: ${m}`),
  info:  (m) => threshold >= 2 && console.error(m),
  debug: (m) => threshold >= 3 && console.error(`DEBUG: ${m}`),  // only when LOG_LEVEL=debug
};
```

Now `LOG_LEVEL=debug` (Module 9.4) reveals detailed diagnostics, while normal runs stay quiet. The convention (Module 4.5): **quiet on success by default, verbose on request.** A tool that spams output on every successful run trains users to ignore it — so the *real* messages get missed.

> [!TIP]
> Be *quiet when things go well, loud when they don't.* A successful build should print a short summary, not a wall of text. Reserve detail for `--verbose`/`LOG_LEVEL=debug`. This respects the user's attention and makes the *important* messages (warnings, errors) stand out instead of drowning in noise. (And never log secrets, Module 9.3 — even at debug level.)

## Good error messages: the highest-leverage writing you'll do

When something fails, the error message is *the* thing that determines whether the fix takes 5 seconds or 50 minutes. A great error message has three parts:

```text title=anatomy-of-a-great-error
1. WHAT failed:     "Cannot read config file 'app.config.json'"
2. WHY:             "the file does not exist"
3. HOW to fix:      "create it from the template: cp app.config.example.json app.config.json"
```

Compare:

```javascript title=error-messages.mjs
// USELESS — what file? why? what do I do?
throw new Error('ENOENT');

// BAD — names the file but no guidance
throw new Error('app.config.json not found');

// GREAT — what, why, and how to fix (Module 9.5's fail-fast philosophy)
throw new Error(
  `Cannot find app.config.json. ` +
  `Create it from the template: cp app.config.example.json app.config.json`
);
```

> [!WARNING]
> The worst error message is a raw stack trace dumped at a user for an *expected* failure (a missing file, bad input). Stack traces are for *unexpected bugs* (where you want the detail, Module 5.5); for *expected* errors, catch them and print a clear, actionable message instead (Module 9.5). "Cannot read property 'x' of undefined" tells the user *nothing* about what *they* should do. Always answer: what, why, how to fix.

## Add context as errors propagate

When an error bubbles up through layers, add context at each level so the final message pinpoints the failure (Module 5.5's `{ cause }`):

```javascript title=error-context.mjs
try {
  await renderLesson(lesson);
} catch (err) {
  // Add WHICH lesson failed, preserving the original error
  throw new Error(`failed rendering lesson "${lesson.slug}": ${err.message}`, { cause: err });
}
```

Now instead of a generic "undefined is not a function" with no clue *where*, you get "failed rendering lesson 'welcome': ...". Context turns a needle-in-a-haystack into a signpost.

## Observability: knowing what happened after the fact

For tools that run *unattended* (in CI, on a schedule), you can't watch them — so they must leave a trail you can read later. This is **observability**:

- **Timestamps** on log lines, so you know *when* each step ran (and how long it took).
- **Structured logs** (JSON) for tools whose output is consumed by other tools — machine-parseable.
- **Exit codes** (Module 2.5) so automation knows success/failure without parsing text.
- **Artifacts** (Module 15.4, 16.6) — traces, logs, reports uploaded for post-mortem inspection.

```javascript title=structured-log.mjs
// Structured (JSON) log line — easy for log aggregators to parse and query:
console.error(JSON.stringify({ level: 'info', ts: new Date().toISOString(), msg: 'build complete', pages: 107 }));
```

> [!NOTE]
> The scale of observability matches the stakes. A local script needs only clear human-readable progress and good errors. A *production service* needs structured logs, metrics, distributed tracing, and alerting — a whole discipline. But the *principle* is the same at every scale: **make it possible to understand what happened and why**, especially when no human was watching. Start with clear logs and great error messages; that covers most tooling.

> [!TRY]
> Find a tool whose error message once frustrated you (a cryptic one). Rewrite it in your head with the three parts: *what* failed, *why*, *how to fix*. Then audit one of your own scripts: do its errors guide the user to a fix, or just dump a trace? Improving even one error message is high-leverage — it'll save someone (probably you) real time.

> [!KEY]
> - Tools **communicate**: send **progress/diagnostics to stderr, results to stdout** (Module 2.4); print a **summary** so users know it finished (Module 1.2).
> - Use **log levels** (env-configurable, Module 9) — **quiet on success, verbose on request**; never spam, never log secrets.
> - **Great error messages have three parts: what failed, why, and how to fix** — don't dump raw stack traces for *expected* failures.
> - **Add context as errors propagate** (`{ cause }`, Module 5.5) so the final message pinpoints the failure.
> - **Observability** (timestamps, structured logs, exit codes, artifacts) lets you understand unattended runs after the fact — same principle at every scale.
