#!/usr/bin/env node
// =============================================================================
// generate-pages.mjs — the static-site generator that builds THIS course.
//
// It is also a worked example: Module 5 narrates this file line by line. If you
// are reading the lesson called "Dissecting this site's generate-pages.mjs",
// this is the very script that produced the page in front of you. (Dogfooding!)
//
// What it does, end to end:
//   1. Read course.json (the single source of truth for module/lesson order).
//   2. For each lesson, read its Markdown source from content/<module>/<NN>-<slug>.md
//   3. Render that Markdown to HTML, turning code fences into Monaco editors and
//      "> [!NOTE]"-style blockquotes into styled callout boxes.
//   4. Inject the HTML into templates/page.html, wiring up the breadcrumb,
//      progress indicator, and Prev/Next buttons computed from the manifest.
//   5. Write one .html file per lesson into site/lessons/, plus an index.html
//      table of contents, and copy the static assets/ folder across.
//
// Design rules we follow (and teach):
//   - Zero framework dependencies. Only Node built-ins + one tiny library (marked).
//   - The manifest is the source of truth, so navigation can never drift.
//   - Deterministic: same input -> same output, every time.
//   - Fails loudly with a non-zero exit code so CI catches problems.
// =============================================================================

import { parseArgs } from 'node:util';
import { readFile, writeFile, mkdir, rm, cp, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

// __dirname does not exist in ESM, so we reconstruct it from import.meta.url.
// This is the canonical Node-ESM idiom for "the folder this file lives in".
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..'); // repo root is one level up from tools/

// ---------------------------------------------------------------------------
// 1. Parse command-line arguments with the built-in parser (no dependency).
// ---------------------------------------------------------------------------
const { values: flags } = parseArgs({
  options: {
    out: { type: 'string', default: 'site' },
    base: { type: 'string', default: '/' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (flags.help) {
  console.log(`generate-pages.mjs — build the course site

Usage: node tools/generate-pages.mjs [options]

Options:
  --out <dir>    Output directory (default: site)
  --base <path>  Base path the site is served under (default: /)
  -h, --help     Show this help and exit
`);
  process.exit(0);
}

const OUT_DIR = join(ROOT, flags.out);

// ---------------------------------------------------------------------------
// 2. Small, dependency-free helpers.
// ---------------------------------------------------------------------------

/** HTML-escape text so it is safe inside attributes, <pre>, and <textarea>. */
function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Fill a template's {{placeholders}} from a map. We use a replacer FUNCTION
 * (not a string) so that "$" characters inside values are treated literally —
 * String.prototype.replace gives "$" special meaning in string replacements,
 * which is a classic, hard-to-spot bug.
 */
function fill(template, map) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) =>
    key in map ? String(map[key]) : '',
  );
}

/** Does a file exist? (access throws if not — we turn that into a boolean.) */
async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 3. Configure the Markdown renderer.
//    We override two token renderers: code fences -> Monaco blocks, and
//    blockquotes -> callout boxes when they start with a "[!TYPE]" marker.
// ---------------------------------------------------------------------------

// Map our friendly fence languages to Monaco's language identifiers.
const MONACO_LANG = {
  sh: 'shell', bash: 'shell', shell: 'shell', zsh: 'shell',
  js: 'javascript', mjs: 'javascript', cjs: 'javascript', javascript: 'javascript',
  ts: 'typescript', mts: 'typescript', typescript: 'typescript',
  py: 'python', python: 'python',
  json: 'json', jsonc: 'json',
  yml: 'yaml', yaml: 'yaml',
  toml: 'ini', ini: 'ini',
  sql: 'sql',
  dockerfile: 'dockerfile', docker: 'dockerfile',
  html: 'html', css: 'css', xml: 'xml', md: 'markdown', markdown: 'markdown',
  make: 'makefile', makefile: 'makefile', text: 'plaintext', txt: 'plaintext',
};

// Callout type -> { label shown in the box, CSS modifier class }.
const CALLOUTS = {
  NOTE: { label: 'Note', cls: 'note' },
  TIP: { label: 'Tip', cls: 'tip' },
  WARNING: { label: 'Warning', cls: 'warning' },
  GOTCHA: { label: 'Gotcha', cls: 'gotcha' },
  DOGFOOD: { label: 'Dogfooding', cls: 'dogfood' },
  TRY: { label: 'Try it yourself', cls: 'try' },
  KEY: { label: 'Key takeaways', cls: 'key' },
};

const renderer = {
  /**
   * Code fences. `infostring` is everything after the opening ``` — e.g.
   * "ts title=build-assets.ts". We split off the language and an optional
   * "title=..." filename. The raw code is stored escaped in a <textarea>
   * (the copy source + a graceful fallback); app.js mounts a Monaco editor
   * into .monaco-host on first scroll into view.
   */
  code(code, infostring = '') {
    const parts = infostring.trim().split(/\s+/);
    const langKey = (parts[0] || 'text').toLowerCase();
    const lang = MONACO_LANG[langKey] || 'plaintext';
    const titleMatch = infostring.match(/title=([^\s]+)/);
    const filename = titleMatch ? titleMatch[1] : '';
    const escaped = escapeHtml(code);
    const filePill = filename
      ? `<span class="code-file">${escapeHtml(filename)}</span>`
      : '';

    return `<figure class="monaco-block" data-lang="${lang}" data-filename="${escapeHtml(filename)}">
  <figcaption class="code-caption">
    <span class="code-lang">${escapeHtml(langKey)}</span>${filePill}
    <span class="code-actions">
      <button class="btn-edit" type="button" aria-pressed="false">Edit</button>
      <button class="btn-copy" type="button">Copy</button>
    </span>
  </figcaption>
  <div class="monaco-host"></div>
  <textarea class="code-source" hidden aria-hidden="true">${escaped}</textarea>
  <pre class="code-fallback"><code>${escaped}</code></pre>
</figure>\n`;
  },

  /**
   * Blockquotes. marked hands us the already-rendered inner HTML. If it begins
   * with "[!TYPE]" we turn the whole quote into a styled <aside> callout;
   * otherwise we emit a normal <blockquote>.
   */
  blockquote(quoteHtml) {
    const marker = quoteHtml.match(/^\s*<p>\[!(\w+)\]\s*\n?/);
    if (marker) {
      const type = marker[1].toUpperCase();
      const meta = CALLOUTS[type];
      if (meta) {
        // Strip the "[!TYPE]" token from the first paragraph.
        const inner = quoteHtml.replace(/^\s*<p>\[!\w+\]\s*\n?/, '<p>');
        return `<aside class="callout callout-${meta.cls}">
  <p class="callout-title">${meta.label}</p>
  <div class="callout-body">${inner}</div>
</aside>\n`;
      }
    }
    return `<blockquote>${quoteHtml}</blockquote>\n`;
  },

  /** Headings get slug ids so lessons can deep-link to sections. */
  heading(text, level) {
    const id = text
      .toLowerCase()
      .replace(/<[^>]+>/g, '')
      .replace(/[^\w]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `<h${level} id="${id}">${text}</h${level}>\n`;
  },
};

marked.use({ gfm: true, breaks: false, renderer });

// ---------------------------------------------------------------------------
// 4. Build the flat lesson list from the manifest, computing every value the
//    template needs (index, paths, prev/next) ONCE so nothing can drift.
// ---------------------------------------------------------------------------
function buildLessonGraph(course) {
  const flat = [];
  course.modules.forEach((mod, mi) => {
    mod.lessons.forEach((lesson, li) => {
      const lessonNum = li + 1;
      const moduleNum = mi; // 00-orientation is module 0
      const globalIndex = flat.length + 1; // 1-based for humans
      const contentPath = join(
        ROOT,
        'content',
        mod.id,
        `${String(lessonNum).padStart(2, '0')}-${lesson.slug}.md`,
      );
      const outName = `${String(globalIndex).padStart(3, '0')}-${lesson.slug}.html`;
      flat.push({
        ...lesson,
        module: mod,
        moduleNum,
        moduleTitle: mod.title,
        lessonNum,
        globalIndex,
        contentPath,
        outName,
      });
    });
  });
  // Wire prev/next now that the full ordered list exists.
  flat.forEach((l, i) => {
    l.prev = i > 0 ? flat[i - 1] : null;
    l.next = i < flat.length - 1 ? flat[i + 1] : null;
  });
  return flat;
}

// ---------------------------------------------------------------------------
// 5. Render a single lesson page.
// ---------------------------------------------------------------------------
async function renderLesson(lesson, total, pageTemplate) {
  let markdownSource;
  if (await exists(lesson.contentPath)) {
    markdownSource = await readFile(lesson.contentPath, 'utf8');
  } else {
    // The build never breaks just because a lesson isn't written yet.
    markdownSource = `# ${lesson.title}\n\n> [!NOTE]\n> This lesson is coming soon.`;
    console.warn(`  (!) missing content: ${lesson.contentPath}`);
  }

  const body = marked.parse(markdownSource);
  const progressPercent = Math.round((lesson.globalIndex / total) * 100);

  const breadcrumb =
    `<a href="../index.html">Home</a> ` +
    `<span class="sep">/</span> ${escapeHtml(lesson.moduleTitle)} ` +
    `<span class="sep">/</span> <span aria-current="page">${escapeHtml(lesson.title)}</span>`;

  // Prev/Next: link to sibling files in the same lessons/ directory.
  const prevAttrs = lesson.prev
    ? `href="${lesson.prev.outName}"`
    : `aria-disabled="true" tabindex="-1"`;
  const nextAttrs = lesson.next
    ? `href="${lesson.next.outName}"`
    : `aria-disabled="true" tabindex="-1"`;

  // Footer links: the runnable example for this lesson (if any) + the markdown
  // source on GitHub, so learners can read exactly what produced the page.
  const exampleFooter = lesson.example
    ? `<a class="footer-link" href="../../${lesson.example}">View the example file: <code>${escapeHtml(
        lesson.example,
      )}</code></a>`
    : '';

  const html = fill(pageTemplate, {
    title: `Lesson ${lesson.globalIndex} — ${lesson.title}`,
    courseTitle: 'Custom Development Tooling',
    lessonTitle: escapeHtml(lesson.title),
    moduleTitle: escapeHtml(lesson.moduleTitle),
    breadcrumb,
    progressText: `Lesson ${lesson.globalIndex} of ${total}`,
    progressPercent,
    body,
    prevAttrs,
    prevLabel: lesson.prev ? escapeHtml(lesson.prev.title) : 'Start of course',
    nextAttrs,
    nextLabel: lesson.next ? escapeHtml(lesson.next.title) : 'End of course',
    exampleFooter,
    assets: '../assets',
    home: '../index.html',
  });

  await writeFile(join(OUT_DIR, 'lessons', lesson.outName), html, 'utf8');
}

// ---------------------------------------------------------------------------
// 6. Render the index.html table of contents.
// ---------------------------------------------------------------------------
async function renderIndex(course, flat, total, indexTemplate) {
  const byModule = new Map();
  for (const l of flat) {
    if (!byModule.has(l.module.id)) byModule.set(l.module.id, []);
    byModule.get(l.module.id).push(l);
  }

  let toc = '';
  course.modules.forEach((mod, mi) => {
    const lessons = byModule.get(mod.id) || [];
    const items = lessons
      .map(
        (l) =>
          `      <li><a href="lessons/${l.outName}"><span class="toc-num">${l.globalIndex}</span> ${escapeHtml(
            l.title,
          )}</a></li>`,
      )
      .join('\n');
    toc += `  <section class="toc-module">
    <h2><span class="toc-module-num">Module ${mi}</span> ${escapeHtml(mod.title)}</h2>
    <p class="toc-blurb">${escapeHtml(mod.blurb || '')}</p>
    <ol class="toc-lessons">
${items}
    </ol>
  </section>\n`;
  });

  const html = fill(indexTemplate, {
    title: course.title,
    courseTitle: escapeHtml(course.title),
    subtitle: escapeHtml(course.subtitle || ''),
    edition: escapeHtml(course.edition || ''),
    total,
    toc,
    assets: 'assets',
    firstHref: flat.length ? `lessons/${flat[0].outName}` : '#',
  });

  await writeFile(join(OUT_DIR, 'index.html'), html, 'utf8');
}

// ---------------------------------------------------------------------------
// 7. Main: orchestrate the whole build.
// ---------------------------------------------------------------------------
async function main() {
  const t0 = performance.now();
  console.log(`Building course into ${flags.out}/ ...`);

  const course = JSON.parse(await readFile(join(ROOT, 'course.json'), 'utf8'));
  const flat = buildLessonGraph(course);
  const total = flat.length;

  const pageTemplate = await readFile(join(ROOT, 'templates', 'page.html'), 'utf8');
  const indexTemplate = await readFile(join(ROOT, 'templates', 'index.html'), 'utf8');

  // Clean output, then recreate the directory tree.
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(join(OUT_DIR, 'lessons'), { recursive: true });

  // Copy static assets verbatim (CSS, JS).
  await cp(join(ROOT, 'assets'), join(OUT_DIR, 'assets'), { recursive: true });

  // Render every lesson, then the index.
  for (const lesson of flat) {
    await renderLesson(lesson, total, pageTemplate);
  }
  await renderIndex(course, flat, total, indexTemplate);

  const ms = Math.round(performance.now() - t0);
  console.log(`Done: ${total} lessons + index in ${ms} ms -> ${flags.out}/index.html`);
}

// Top-level await would also work, but wrapping main() lets us turn any error
// into a clean, non-zero exit so CI fails loudly instead of printing a stack
// trace and pretending to succeed.
main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
