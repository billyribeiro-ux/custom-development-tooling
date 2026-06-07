// =============================================================================
// generator.test.mjs — UNIT tests for the generator's pure helpers (Module 16.1).
//
// These use Node's BUILT-IN test runner (node:test) — no dependency. They import
// the pure functions from tools/lib.mjs and check them in isolation: fast,
// precise, and they never touch the filesystem or run a build.
//
//   Run:  node --test tests/unit/*.test.mjs   (or: make test-unit)
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeHtml,
  fill,
  slugify,
  stripToText,
  readingTime,
  summarize,
  flatten,
  navData,
} from '../../tools/lib.mjs';

test('escapeHtml escapes the dangerous characters', () => {
  assert.equal(escapeHtml('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  assert.equal(escapeHtml('plain'), 'plain');
});

test('fill replaces {{placeholders}} and treats $ literally', () => {
  assert.equal(fill('Hi {{name}}!', { name: 'Ada' }), 'Hi Ada!');
  // A "$" in the value must NOT be interpreted as a replacement pattern.
  assert.equal(fill('{{v}}', { v: '$1 & $&' }), '$1 & $&');
  // Unknown placeholders become empty.
  assert.equal(fill('a{{missing}}b', {}), 'ab');
});

test('slugify produces URL-safe ids', () => {
  assert.equal(slugify('Hello, World!'), 'hello-world');
  assert.equal(slugify('set -euo pipefail'), 'set-euo-pipefail');
  assert.equal(slugify('  --Trim--  '), 'trim');
});

test('stripToText removes markdown and code', () => {
  const md = '# Title\n\nSome **bold** and `code` and a [link](http://x).\n\n```js\nconst x=1;\n```\n\n> [!NOTE]\n> hi';
  const text = stripToText(md);
  assert.ok(!text.includes('#'), 'no heading marks');
  assert.ok(!text.includes('**'), 'no emphasis marks');
  assert.ok(!text.includes('const x=1'), 'code blocks removed');
  assert.ok(!text.includes('[!NOTE]'), 'callout marker removed');
  assert.ok(text.includes('link'), 'link text kept');
  assert.ok(text.includes('bold'), 'bold text kept');
});

test('readingTime is at least 1 and scales with words', () => {
  assert.equal(readingTime(''), 1);
  assert.equal(readingTime('one two three'), 1);
  assert.equal(readingTime(Array(400).fill('word').join(' ')), 2); // ~400 words ≈ 2 min
});

test('summarize cuts at a word boundary with an ellipsis', () => {
  assert.equal(summarize('short text', 50), 'short text');
  const s = summarize('the quick brown fox jumps over the lazy dog', 15);
  assert.ok(s.endsWith('…'));
  assert.ok(s.length <= 16);
  assert.ok(!s.includes('  '));
});

// --- flatten: the navigation backbone (prev/next must never drift) ---------
const fakeCourse = {
  modules: [
    { id: '00-intro', title: 'Intro', lessons: [{ slug: 'a', title: 'A' }, { slug: 'b', title: 'B' }] },
    { id: '01-next', title: 'Next', lessons: [{ slug: 'c', title: 'C' }] },
  ],
};

test('flatten computes global order, paths, and output names', () => {
  const flat = flatten(fakeCourse);
  assert.equal(flat.length, 3);
  assert.deepEqual(flat.map((l) => l.globalIndex), [1, 2, 3]);
  assert.equal(flat[0].outName, '001-a.html');
  assert.equal(flat[2].outName, '003-c.html');
  assert.equal(flat[0].contentRelPath, 'content/00-intro/01-a.md');
  assert.equal(flat[1].contentRelPath, 'content/00-intro/02-b.md');
  assert.equal(flat[2].contentRelPath, 'content/01-next/01-c.md');
  assert.equal(flat[1].moduleTitle, 'Intro');
  assert.equal(flat[2].moduleNum, 1);
});

test('flatten wires prev/next correctly, including the boundaries', () => {
  const flat = flatten(fakeCourse);
  assert.equal(flat[0].prev, null, 'first lesson has no prev');
  assert.equal(flat[0].next.outName, '002-b.html');
  assert.equal(flat[1].prev.outName, '001-a.html');
  assert.equal(flat[1].next.outName, '003-c.html');
  assert.equal(flat[2].next, null, 'last lesson has no next');
});

test('navData produces the lightweight inlined structure', () => {
  const flat = flatten(fakeCourse);
  const nav = navData(fakeCourse, flat);
  assert.deepEqual(nav.modules, [{ n: 0, t: 'Intro' }, { n: 1, t: 'Next' }]);
  assert.equal(nav.lessons.length, 3);
  assert.deepEqual(nav.lessons[0], { i: 1, o: '001-a.html', t: 'A', m: 0 });
});
