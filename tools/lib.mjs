// =============================================================================
// lib.mjs — the pure, side-effect-free helpers used by generate-pages.mjs.
//
// Why a separate file? These functions take input and return output with NO
// file I/O or global state (Module 1.5: separate pure logic from effects). That
// makes them trivial to UNIT TEST (Module 16.1) — see tests/unit/generator.test.mjs,
// which imports straight from here without triggering a build.
// =============================================================================

/** HTML-escape text so it is safe inside attributes, <pre>, and <textarea>. */
export function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Fill a template's {{placeholders}} from a map. Uses a replacer FUNCTION (not a
 * string) so "$" characters in values are treated literally — String.replace
 * gives "$" special meaning in string replacements, a classic, subtle bug.
 */
export function fill(template, map) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) =>
    key in map ? String(map[key]) : '',
  );
}

/** Turn a heading/title into a URL-safe slug: "Hello, World!" -> "hello-world". */
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Strip Markdown down to plain prose (for search summaries + reading time). */
export function stripToText(md) {
  return String(md)
    .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
    .replace(/`[^`]*`/g, ' ') // inline code
    .replace(/^>\s*\[![^\]]+\]\s*/gm, ' ') // callout markers ([!NOTE] etc.)
    .replace(/^[>#]+\s*/gm, ' ') // blockquote / heading markers
    .replace(/^\s*[-*]\s+/gm, ' ') // list bullets
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links -> their text
    .replace(/[*_~]+/g, '') // emphasis markers
    .replace(/\|/g, ' ') // table pipes
    .replace(/<[^>]+>/g, ' ') // any inline HTML
    .replace(/&[a-z]+;/g, ' ') // HTML entities
    .replace(/\s+/g, ' ')
    .trim();
}

/** Estimate reading time in minutes (~200 words/min), at least 1. */
export function readingTime(text) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / 200));
}

/** A short summary/description, cut at a word boundary with an ellipsis. */
export function summarize(text, n = 155) {
  const t = text.trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim() + '…';
}

/**
 * Flatten the manifest's modules into one ordered lesson list, computing every
 * derived value (index, output filename, content path, prev/next) ONCE so
 * navigation can never drift. Pure: it touches no filesystem, only data — which
 * is exactly why it's easy to unit-test.
 */
export function flatten(course) {
  const flat = [];
  course.modules.forEach((mod, mi) => {
    mod.lessons.forEach((lesson, li) => {
      const lessonNum = li + 1;
      const globalIndex = flat.length + 1;
      const nn = String(lessonNum).padStart(2, '0');
      flat.push({
        ...lesson,
        moduleId: mod.id,
        moduleTitle: mod.title,
        moduleNum: mi,
        lessonNum,
        globalIndex,
        contentRelPath: `content/${mod.id}/${nn}-${lesson.slug}.md`,
        outName: `${String(globalIndex).padStart(3, '0')}-${lesson.slug}.html`,
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

/** Build the lightweight navigation data inlined into every page (works offline). */
export function navData(course, flat) {
  return {
    modules: course.modules.map((m, i) => ({ n: i, t: m.title })),
    lessons: flat.map((l) => ({ i: l.globalIndex, o: l.outName, t: l.title, m: l.moduleNum })),
  };
}
