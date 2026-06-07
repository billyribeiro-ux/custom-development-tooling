#!/usr/bin/env node
// =============================================================================
// generate-pages.mjs — the static-site generator that builds THIS course.
//
// It is also a worked example: Module 5 narrates this file. If you are reading
// the lesson "Dissecting this site's generate-pages.mjs", this is the very
// script that produced the page in front of you. (Dogfooding!)
//
// What it does, end to end:
//   1. Read course.json (the single source of truth for module/lesson order).
//   2. For each lesson, read its Markdown from content/<module>/<NN>-<slug>.md
//   3. Render that Markdown to HTML, turning code fences into Monaco editors and
//      "> [!NOTE]"-style blockquotes into styled callout boxes.
//   4. Inject the HTML into templates/page.html, wiring up the breadcrumb,
//      progress indicator, Prev/Next, reading time, and inlined nav data.
//   5. Write one .html per lesson into site/lessons/, plus index.html, a 404
//      page, and a search-index.json — and copy the static assets/ folder.
//
// Pure, side-effect-free helpers live in lib.mjs so they can be unit-tested
// (Module 16.1) without running the build. This file does the I/O.
// =============================================================================

import { parseArgs } from 'node:util';
import { readFile, writeFile, mkdir, rm, cp, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import {
  escapeHtml,
  fill,
  slugify,
  stripToText,
  readingTime,
  summarize,
  flatten,
  navData,
} from './lib.mjs';

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
// 2. Configure the Markdown renderer (code fences -> Monaco; callouts; ids).
// ---------------------------------------------------------------------------
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

  blockquote(quoteHtml) {
    const marker = quoteHtml.match(/^\s*<p>\[!(\w+)\]\s*\n?/);
    if (marker) {
      const type = marker[1].toUpperCase();
      const meta = CALLOUTS[type];
      if (meta) {
        const inner = quoteHtml.replace(/^\s*<p>\[!\w+\]\s*\n?/, '<p>');
        return `<aside class="callout callout-${meta.cls}">
  <p class="callout-title">${meta.label}</p>
  <div class="callout-body">${inner}</div>
</aside>\n`;
      }
    }
    return `<blockquote>${quoteHtml}</blockquote>\n`;
  },

  heading(text, level) {
    const id = slugify(text);
    return `<h${level} id="${id}">${text}</h${level}>\n`;
  },
};

marked.use({ gfm: true, breaks: false, renderer });

// ---------------------------------------------------------------------------
// 3. Render a single lesson page. Returns its search-index entry.
// ---------------------------------------------------------------------------
async function renderLesson(lesson, total, pageTemplate, repoUrl, navJson) {
  let markdownSource;
  if (await exists(join(ROOT, lesson.contentRelPath))) {
    markdownSource = await readFile(join(ROOT, lesson.contentRelPath), 'utf8');
  } else {
    markdownSource = `# ${lesson.title}\n\n> [!NOTE]\n> This lesson is coming soon.`;
    console.warn(`  (!) missing content: ${lesson.contentRelPath}`);
  }

  const body = marked.parse(markdownSource);
  const plain = stripToText(markdownSource);
  const minutes = readingTime(plain);
  const description = summarize(plain, 155);
  const progressPercent = Math.round((lesson.globalIndex / total) * 100);

  const breadcrumb =
    `<a href="../index.html">Home</a> ` +
    `<span class="sep">/</span> ${escapeHtml(lesson.moduleTitle)} ` +
    `<span class="sep">/</span> <span aria-current="page">${escapeHtml(lesson.title)}</span>`;

  const prevAttrs = lesson.prev ? `href="${lesson.prev.outName}"` : `aria-disabled="true" tabindex="-1"`;
  const nextAttrs = lesson.next ? `href="${lesson.next.outName}"` : `aria-disabled="true" tabindex="-1"`;

  const exampleFooter = lesson.example
    ? `<a class="footer-link" href="${repoUrl}/blob/main/${lesson.example}">View the example file: <code>${escapeHtml(
        lesson.example,
      )}</code></a>`
    : '';

  const html = fill(pageTemplate, {
    title: `Lesson ${lesson.globalIndex} — ${lesson.title}`,
    description: escapeHtml(description),
    courseTitle: 'Custom Development Tooling',
    lessonTitle: escapeHtml(lesson.title),
    moduleTitle: escapeHtml(lesson.moduleTitle),
    breadcrumb,
    progressText: `Lesson ${lesson.globalIndex} of ${total}`,
    progressPercent,
    readingTime: minutes,
    outName: lesson.outName,
    globalIndex: lesson.globalIndex,
    total,
    navData: navJson,
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

  // The search-index entry (consumed by assets/app.js for full-text search).
  return {
    i: lesson.globalIndex,
    o: lesson.outName,
    t: lesson.title,
    m: lesson.moduleTitle,
    mn: lesson.moduleNum,
    s: summarize(plain, 600),
  };
}

// ---------------------------------------------------------------------------
// 4. Render the index.html table of contents.
// ---------------------------------------------------------------------------
async function renderIndex(course, flat, total, indexTemplate, navJson) {
  let toc = '';
  course.modules.forEach((mod, mi) => {
    const lessons = flat.filter((l) => l.moduleId === mod.id);
    const items = lessons
      .map(
        (l) =>
          `      <li><a href="lessons/${l.outName}" data-out="${l.outName}"><span class="toc-num">${l.globalIndex}</span> ${escapeHtml(
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
    description: escapeHtml(course.subtitle || course.title),
    courseTitle: escapeHtml(course.title),
    subtitle: escapeHtml(course.subtitle || ''),
    edition: escapeHtml(course.edition || ''),
    total,
    toc,
    navData: navJson,
    assets: 'assets',
    firstHref: flat.length ? `lessons/${flat[0].outName}` : '#',
  });

  await writeFile(join(OUT_DIR, 'index.html'), html, 'utf8');
}

// ---------------------------------------------------------------------------
// 5. Main: orchestrate the whole build.
// ---------------------------------------------------------------------------
async function main() {
  const t0 = performance.now();
  console.log(`Building course into ${flags.out}/ ...`);

  const course = JSON.parse(await readFile(join(ROOT, 'course.json'), 'utf8'));
  const flat = flatten(course);
  const total = flat.length;
  const repoUrl = course.repoUrl ?? '';
  const navJson = escapeHtml(JSON.stringify(navData(course, flat)));

  const pageTemplate = await readFile(join(ROOT, 'templates', 'page.html'), 'utf8');
  const indexTemplate = await readFile(join(ROOT, 'templates', 'index.html'), 'utf8');

  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(join(OUT_DIR, 'lessons'), { recursive: true });
  await cp(join(ROOT, 'assets'), join(OUT_DIR, 'assets'), { recursive: true });

  const searchEntries = [];
  for (const lesson of flat) {
    searchEntries.push(await renderLesson(lesson, total, pageTemplate, repoUrl, navJson));
  }
  await renderIndex(course, flat, total, indexTemplate, navJson);

  // Search index (full-text search, progressively enhanced over http).
  await writeFile(
    join(OUT_DIR, 'search-index.json'),
    JSON.stringify({ title: course.title, total, lessons: searchEntries }),
    'utf8',
  );

  // A friendly 404 page.
  const notFound = fill(pageTemplate, {
    title: 'Page not found',
    description: 'Page not found',
    courseTitle: 'Custom Development Tooling',
    lessonTitle: '404',
    moduleTitle: '',
    breadcrumb: `<a href="./index.html">Home</a>`,
    progressText: '',
    progressPercent: 0,
    readingTime: 0,
    outName: '',
    globalIndex: 0,
    total,
    navData: navJson,
    body: `<h1>404 — Page not found</h1><p>That lesson doesn't exist. <a href="./index.html">Go to the course home</a>.</p>`,
    prevAttrs: `aria-disabled="true" tabindex="-1"`,
    prevLabel: '',
    nextAttrs: `href="./index.html"`,
    nextLabel: 'Course home',
    exampleFooter: '',
    assets: 'assets',
    home: 'index.html',
  });
  await writeFile(join(OUT_DIR, '404.html'), notFound, 'utf8');

  const ms = Math.round(performance.now() - t0);
  console.log(`Done: ${total} lessons + index + search + 404 in ${ms} ms -> ${flags.out}/index.html`);
}

// Run only when executed directly (the ESM equivalent of Python's __main__,
// Module 6.1) — so importing this file (e.g. from tests) does NOT trigger a build.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Build failed:', err);
    process.exit(1);
  });
}

export { main };
