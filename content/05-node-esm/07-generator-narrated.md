# Dissecting This Site's generate-pages.mjs

This is the lesson the whole course has been building toward: a complete, line-by-line reading of `tools/generate-pages.mjs` — **the script that built the very page you're reading.** Everything you've learned converges here. This is dogfooding at its purest: the tool, teaching itself.

> [!DOGFOOD]
> Open `tools/generate-pages.mjs` from the repo and read along. When you finish this lesson, you'll understand the entire build system of this course — and you'll have a template for building any static-site generator you want.

## The job, restated

Turn a manifest (`course.json`) plus a folder of Markdown into linked HTML pages, with correct Previous/Next navigation and progress on every page. It's the "read, transform, write" pattern (Module 0.4) at a real scale: 107 pages in under 100 ms.

## Imports: built-ins plus one dependency

```javascript title=generate-pages.mjs
import { parseArgs } from 'node:util';
import { readFile, writeFile, mkdir, rm, cp, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
```

Notice: almost everything is a `node:` built-in (Module 5.2) — `util`, `fs/promises`, `path`, `url`. The *only* npm dependency is `marked`, the Markdown parser. One dependency for the whole build (Module 1: minimize dependencies for reliability).

```javascript title=generate-pages.mjs
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
```

The ESM `__dirname` reconstruction (Module 5.1) — memorized by now. `ROOT` is the repo root, one level up from `tools/`. Computing paths relative to the *script's* location (not the current working directory) means the build works no matter where you run it from.

## Argument parsing

```javascript title=generate-pages.mjs
const { values: flags } = parseArgs({
  options: {
    out: { type: 'string', default: 'site' },
    base: { type: 'string', default: '/' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (flags.help) { console.log(`...usage...`); process.exit(0); }
```

`parseArgs` (Module 4.3) with sensible defaults, and a `--help` that exits 0. The interface from Module 4.1, implemented.

## Two small, sharp helpers

```javascript title=generate-pages.mjs
function escapeHtml(text) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
```

`escapeHtml` turns characters that have meaning in HTML into safe entities. This matters wherever we put raw text into HTML (titles, code in `<textarea>`) — without it, a `<` in a lesson title would break the page. (Security note: escaping output is the web equivalent of the injection-avoidance from Modules 5.4 and 5.6 — never let untrusted text be interpreted as code.)

```javascript title=generate-pages.mjs
function fill(template, map) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) =>
    key in map ? String(map[key]) : '');
}
```

`fill` is the template engine — all of it. It replaces `{{placeholder}}` tokens with values from a map. Crucially it uses a *replacer function*, not a string, so `$` characters in the content are treated literally (a real gotcha: `String.replace` gives `$` special meaning in replacement *strings*). This is a deliberate, principal-level detail called out in the code's comments.

```javascript title=generate-pages.mjs
async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}
```

The existence check from Module 5.3, exactly.

## The custom Markdown renderer

```javascript title=generate-pages.mjs
const renderer = {
  code(code, infostring = '') {
    // parse the language and optional "title=..." from the fence info string
    // emit a <figure class="monaco-block"> with the code in a hidden <textarea>
  },
  blockquote(quoteHtml) {
    // if it starts with [!NOTE]/[!TIP]/etc., turn it into a styled callout <aside>
  },
  heading(text, level) {
    // add an id slug so sections are deep-linkable
  },
};
marked.use({ gfm: true, breaks: false, renderer });
```

This is where the course's special syntax comes from. We override three of `marked`'s renderers:

- **`code`** turns every fenced code block into the `<figure class="monaco-block">` that `app.js` later upgrades into a Monaco editor (the copy/edit boxes you've been using). It parses the `title=filename` from the fence info string.
- **`blockquote`** detects the `[!NOTE]`/`[!DOGFOOD]`/etc. markers and renders styled callout boxes — like the very box you're reading.
- **`heading`** adds an `id` slug for deep links.

This is the "config over code" idea (Module 4.3): `marked` does the heavy lifting of parsing Markdown; we just *configure* how a few token types render. We didn't write a Markdown parser — we extended one.

## Building the lesson graph (the heart of navigation)

```javascript title=generate-pages.mjs
function buildLessonGraph(course) {
  const flat = [];
  course.modules.forEach((mod, mi) => {
    mod.lessons.forEach((lesson, li) => {
      const globalIndex = flat.length + 1;
      flat.push({ ...lesson, module: mod, moduleNum: mi, lessonNum: li + 1,
        globalIndex, contentPath: /* derived */, outName: /* derived */ });
    });
  });
  flat.forEach((l, i) => {
    l.prev = i > 0 ? flat[i - 1] : null;
    l.next = i < flat.length - 1 ? flat[i + 1] : null;
  });
  return flat;
}
```

This is *why the navigation can never drift* (Module 0.4). We flatten all modules into one ordered list, assign each lesson a `globalIndex`, derive its content path and output filename, then wire each lesson's `prev`/`next` to its neighbors in the list. Reorder lessons in `course.json`, rebuild, and every Prev/Next link and progress number updates automatically. **The manifest is the single source of truth; the script computes everything else.**

## Rendering one lesson

```javascript title=generate-pages.mjs
async function renderLesson(lesson, total, pageTemplate) {
  let markdownSource;
  if (await exists(lesson.contentPath)) {
    markdownSource = await readFile(lesson.contentPath, 'utf8');
  } else {
    markdownSource = `# ${lesson.title}\n\n> [!NOTE]\n> This lesson is coming soon.`;
    console.warn(`  (!) missing content: ${lesson.contentPath}`);
  }
  const body = marked.parse(markdownSource);
  const progressPercent = Math.round((lesson.globalIndex / total) * 100);
  // ...compute breadcrumb, prev/next attrs...
  const html = fill(pageTemplate, { title, body, progressText, prevAttrs, nextAttrs, /* ... */ });
  await writeFile(join(OUT_DIR, 'lessons', lesson.outName), html, 'utf8');
}
```

For each lesson: read its Markdown (or a graceful "coming soon" placeholder if missing — so the build *never* breaks just because one lesson isn't written yet, which is how this very course was built incrementally), render it, compute the progress percentage and the Prev/Next link attributes, fill the template, and write the HTML. Read → transform → write, one lesson at a time.

## Main: orchestrating it all

```javascript title=generate-pages.mjs
async function main() {
  const course = JSON.parse(await readFile(join(ROOT, 'course.json'), 'utf8'));
  const flat = buildLessonGraph(course);
  const pageTemplate = await readFile(join(ROOT, 'templates', 'page.html'), 'utf8');

  await rm(OUT_DIR, { recursive: true, force: true });   // clean output (idempotent)
  await mkdir(join(OUT_DIR, 'lessons'), { recursive: true });
  await cp(join(ROOT, 'assets'), join(OUT_DIR, 'assets'), { recursive: true });

  for (const lesson of flat) await renderLesson(lesson, flat.length, pageTemplate);
  await renderIndex(course, flat, flat.length, indexTemplate);
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
```

`main` reads the manifest and template, **cleans the output directory** (so every build starts fresh — deterministic, no stale files; Module 1.4), copies the static assets, then renders every lesson and the index. The file ends with the `main().catch()` pattern from Module 5.5: any failure prints an error and exits non-zero, so CI refuses to deploy a broken build.

Note the lesson loop is *sequential* (`for...of` with `await`). It could be parallelized with `Promise.all` (Module 5.5), but at under 100 ms for 107 pages, the simplicity wins — a deliberate "don't optimize what's already fast enough" call.

## The complete picture

Step back and see how everything fits:

```text title=the-whole-system
course.json ─┐
content/*.md ─┼─> buildLessonGraph ─> renderLesson (marked + fill) ─> site/*.html
templates/   ─┘                          │
assets/ ────────────── cp ──────────────┘──────────────────────────> site/assets/
```

That's a complete static-site generator in ~250 well-commented lines, built from Node built-ins plus one dependency. You now understand every part — and you have a blueprint for building your own generator for *anything*: docs, a blog, a report dashboard. Change the manifest shape, change the template, change the renderer; the architecture stays the same.

> [!TRY]
> In the repo, open `course.json` and swap the order of two lessons within a module. Run `node tools/generate-pages.mjs`, then open the affected pages and check the Previous/Next links and the "Lesson N of 107" — they updated automatically, with you touching only the manifest. That's the payoff of a single source of truth.

> [!KEY]
> - The generator is "**read, transform, write**" at scale: manifest + Markdown + template → linked HTML, in ~250 lines.
> - It uses **only `node:` built-ins plus `marked`** — minimal dependencies for reliability.
> - **`buildLessonGraph`** flattens the manifest and wires prev/next, so **navigation can never drift** — the manifest is the single source of truth.
> - A **custom `marked` renderer** produces the Monaco code blocks and callouts — *extending* a parser, not writing one ("config over code").
> - `main().catch(... exit(1))`, a clean output dir each build, and graceful placeholders for missing content make it robust and incrementally buildable. **You can now build your own generator for anything.**
