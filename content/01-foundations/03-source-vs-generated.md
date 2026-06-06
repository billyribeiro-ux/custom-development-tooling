# Source vs Generated Artifacts

This is one of those distinctions that, once it clicks, you'll see everywhere — and getting it wrong is the cause of a surprising number of bugs and messy repositories.

## Two categories of files

- **Source** is the input a human writes and edits. It's the *truth*.
- **An artifact** (or *generated file*, or *build output*) is something a tool *derives* from source. It's a *consequence*.

```text title=source-vs-artifact
SOURCE (you write & edit)        ARTIFACT (tools generate)
-------------------------        --------------------------
src/styles.scss            ->    dist/styles.css
content/lesson.md          ->    site/lesson.html
src/app.ts                 ->    dist/app.js
package.json + lockfile     ->    node_modules/
migrations/*.sql            ->    the actual database schema
```

The arrow always points the same way: **source → tool → artifact.** You never edit the artifact directly, because the next build will overwrite it and your change will vanish.

## The golden rule

> **Edit the source, never the artifact. Commit the source, (usually) not the artifact.**

When you find a bug in `dist/app.js`, you do *not* fix it in `dist/app.js`. You find the source that produced it (`src/app.ts`), fix *that*, and rebuild. Fixing the artifact is like editing a photo of a document instead of the document.

> [!GOTCHA]
> The most common beginner mistake in any build-based project: editing a generated file, seeing your change work, then losing it on the next build and being baffled. If editing a file "doesn't stick," ask: *is this file generated?* Look for a build step that produces it.

## Why you usually don't commit artifacts

If artifacts are derived from source, committing them is redundant — and worse, harmful:

1. **They drift.** If the committed artifact gets out of sync with the source (someone forgets to rebuild), now your repo lies about itself.
2. **They create noise.** A one-line source change can produce a 5,000-line artifact diff, drowning the meaningful change in a code review.
3. **They cause conflicts.** Generated files conflict constantly in version control because everyone's build produces slightly different output.

So we put artifacts in `.gitignore` and rebuild them when needed — locally, and in CI before deploying.

```bash title=.gitignore
# Generated — derived from source, so we don't commit it
/dist/
/site/
node_modules/
*.pyc
```

> [!DOGFOOD]
> Look at this repository's `.gitignore`: `site/` is ignored. The website you're reading is an artifact. We commit the Markdown source and the generator; the HTML is rebuilt on demand. If we committed `site/`, every typo fix would create a huge, confusing diff.

## The important exception: lockfiles

There's one famous case where you commit a *generated* file: the **lockfile** (`package-lock.json`, `poetry.lock`, etc.). Why the exception?

Because the lockfile's entire job is **reproducibility** — it records the exact dependency versions everyone should use. If it weren't committed, two people running `npm install` could get different versions, and "works on my machine" returns. So we commit it precisely *because* it's the artifact that guarantees everyone's build matches. We dig into lockfiles in Module 8.

> [!NOTE]
> The rule "commit source, not artifacts" has a sharper version: *commit what you can't regenerate, plus the things that guarantee everyone regenerates the same way.* Source you can't regenerate. The lockfile guarantees identical regeneration. Both get committed.

## How to tell source from artifact

When you meet an unfamiliar file, ask:

1. Did a human type this, or did a tool produce it?
2. Is there a build command that would overwrite it?
3. Is it in `.gitignore`?

If it's tool-produced, overwrite-able, or ignored — it's an artifact. Treat it as disposable.

> [!TRY]
> In a project you have, run a build (`npm run build`, or this course's `node tools/generate-pages.mjs`). Watch which files appear or change. Those are your artifacts. Confirm they're in `.gitignore`.

> [!KEY]
> - **Source** is human-written truth; an **artifact** is tool-derived output. The arrow is always source → tool → artifact.
> - **Edit source, never artifacts** — artifacts get overwritten on the next build.
> - Don't commit artifacts: they **drift**, create **noise**, and cause **conflicts**. Gitignore them.
> - The exception is the **lockfile**, committed precisely to guarantee reproducible builds.
> - Unsure if a file is an artifact? Ask: tool-produced? overwrite-able? gitignored?
