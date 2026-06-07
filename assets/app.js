// =============================================================================
// app.js — client behavior for the course site.
//   1. Lazy-mount a Monaco editor into each code block (copy + edit).
//   2. Theme toggle (dark/light), persisted in localStorage.
//   3. Sidebar navigation built from inlined nav data (works offline).
//   4. Search (titles always; full-text when search-index.json is reachable).
//   5. Progress tracking (visited/done) in localStorage, with checkmarks.
//   6. "On this page" outline with scrollspy, and heading anchor links.
//   7. Keyboard: ← / → turn pages, / focuses search, t toggles theme.
// =============================================================================

const LS = {
  theme: 'cdt-theme',
  done: 'cdt-done',
  last: 'cdt-last',
};

// ---------------------------------------------------------------------------
// Small storage helpers (fail-safe: a disabled localStorage must not break the page).
// ---------------------------------------------------------------------------
function readSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set(); }
}
function writeSet(key, set) {
  try { localStorage.setItem(key, JSON.stringify([...set])); } catch { /* ignore */ }
}
function readStr(key) { try { return localStorage.getItem(key); } catch { return null; } }
function writeStr(key, val) { try { localStorage.setItem(key, val); } catch { /* ignore */ } }

// ===========================================================================
// Monaco editor
// ===========================================================================
const MONACO_VERSION = '0.52.2';
const MONACO_BASE = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min/`;

self.MonacoEnvironment = {
  getWorkerUrl() {
    return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
      self.MonacoEnvironment = { baseUrl: '${MONACO_BASE}' };
      importScripts('${MONACO_BASE}vs/base/worker/workerMain.js');
    `)}`;
  },
};

let monacoReady = null;
function loadMonaco() {
  if (monacoReady) return monacoReady;
  if (typeof require === 'undefined') return Promise.reject(new Error('no loader'));
  monacoReady = new Promise((resolve, reject) => {
    require.config({ paths: { vs: `${MONACO_BASE}vs` } });
    require(['vs/editor/editor.main'], () => resolve(window.monaco), reject);
  });
  return monacoReady;
}

function monacoTheme() {
  return document.documentElement.dataset.theme === 'light' ? 'vs' : 'vs-dark';
}

const mountedEditors = [];
async function mountBlock(figure) {
  if (figure.dataset.mounted) return;
  figure.dataset.mounted = '1';
  let monaco;
  try { monaco = await loadMonaco(); } catch { return; }

  const host = figure.querySelector('.monaco-host');
  const source = figure.querySelector('.code-source');
  const fallback = figure.querySelector('.code-fallback');
  const code = source.value;
  const lineHeight = 19;
  host.style.height = `${Math.min(code.split('\n').length * lineHeight + 16, 520)}px`;

  const editor = monaco.editor.create(host, {
    value: code,
    language: figure.dataset.lang || 'plaintext',
    theme: monacoTheme(),
    readOnly: true,
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 13.5,
    fontFamily: 'ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace',
    lineNumbersMinChars: 3,
    padding: { top: 8, bottom: 8 },
    scrollbar: { alwaysConsumeMouseWheel: false },
  });
  if (fallback) fallback.hidden = true;
  figure._editor = editor;
  mountedEditors.push(editor);
}

function wireCodeButtons(figure) {
  const source = figure.querySelector('.code-source');
  const copyBtn = figure.querySelector('.btn-copy');
  const editBtn = figure.querySelector('.btn-edit');

  copyBtn?.addEventListener('click', async () => {
    const text = figure._editor ? figure._editor.getValue() : source.value;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      source.hidden = false; source.select(); document.execCommand('copy'); source.hidden = true;
    }
    copyBtn.textContent = 'Copied!';
    copyBtn.classList.add('copied');
    setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 1400);
  });

  editBtn?.addEventListener('click', async () => {
    await mountBlock(figure);
    if (!figure._editor) return;
    const wasReadOnly = figure._editor.getOption(window.monaco.editor.EditorOption.readOnly);
    figure._editor.updateOptions({ readOnly: !wasReadOnly });
    editBtn.setAttribute('aria-pressed', String(wasReadOnly));
    editBtn.textContent = wasReadOnly ? 'Editing' : 'Edit';
  });
}

function initCodeBlocks() {
  const blocks = Array.from(document.querySelectorAll('.monaco-block'));
  blocks.forEach(wireCodeButtons);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, obs) => {
      for (const e of entries) if (e.isIntersecting) { mountBlock(e.target); obs.unobserve(e.target); }
    }, { rootMargin: '300px' });
    blocks.forEach((b) => io.observe(b));
  } else {
    blocks.forEach(mountBlock);
  }
}

// ===========================================================================
// Theme
// ===========================================================================
function initTheme() {
  const btn = document.getElementById('theme-toggle');
  const apply = (theme) => {
    document.documentElement.dataset.theme = theme;
    if (btn) btn.textContent = theme === 'light' ? '☀️' : '🌙';
    mountedEditors.forEach((ed) => ed.updateOptions({ theme: monacoTheme() }));
  };
  apply(readStr(LS.theme) || 'dark');
  const toggle = () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    writeStr(LS.theme, next); apply(next);
  };
  btn?.addEventListener('click', toggle);
  return toggle;
}

// ===========================================================================
// Navigation data (inlined into every page as a data attribute — works offline)
// ===========================================================================
function getNav() {
  try { return JSON.parse(document.body.dataset.nav || '{}'); } catch { return {}; }
}

// ===========================================================================
// Progress tracking
// ===========================================================================
function markCurrentDone() {
  const out = document.body.dataset.out;
  if (!out) return;
  const done = readSet(LS.done);
  if (!done.has(out)) { done.add(out); writeSet(LS.done, done); refreshProgressUI(); }
}

function refreshProgressUI() {
  const done = readSet(LS.done);
  const total = Number(document.body.dataset.total) || 0;
  // Sidebar checkmarks + current highlight
  document.querySelectorAll('.nav-link').forEach((a) => {
    a.classList.toggle('is-done', done.has(a.dataset.out));
  });
  // Sidebar progress text
  const cp = document.getElementById('course-progress');
  if (cp && total) {
    const pct = Math.round((done.size / total) * 100);
    cp.textContent = `${done.size} of ${total} lessons done (${pct}%)`;
  }
  // Index TOC checkmarks + hero
  document.querySelectorAll('.toc-lessons a').forEach((a) => {
    a.classList.toggle('is-done', done.has(a.dataset.out));
  });
  const hero = document.getElementById('hero-progress');
  if (hero && total) {
    const pct = Math.round((done.size / total) * 100);
    hero.textContent = done.size ? `You've completed ${done.size} of ${total} lessons (${pct}%).` : '';
  }
}

// ===========================================================================
// Sidebar navigation (lesson pages only)
// ===========================================================================
function buildSidebar() {
  const navEl = document.getElementById('sidebar-nav');
  if (!navEl) return;
  const nav = getNav();
  if (!nav.lessons) return;
  const current = document.body.dataset.out;

  const byModule = new Map();
  for (const l of nav.lessons) {
    if (!byModule.has(l.m)) byModule.set(l.m, []);
    byModule.get(l.m).push(l);
  }

  let html = '';
  for (const mod of nav.modules) {
    const lessons = byModule.get(mod.n) || [];
    const hasCurrent = lessons.some((l) => l.o === current);
    const items = lessons.map((l) => {
      const cur = l.o === current ? ' is-current' : '';
      return `<li><a class="nav-link${cur}" href="${l.o}" data-out="${l.o}">` +
        `<span class="nav-num">${l.i}</span>` +
        `<span class="nav-text">${escapeText(l.t)}</span>` +
        `<span class="nav-check" aria-hidden="true">✓</span></a></li>`;
    }).join('');
    html += `<details class="nav-module"${hasCurrent ? ' open' : ''}>` +
      `<summary>Module ${mod.n} · ${escapeText(mod.t)}</summary>` +
      `<ol>${items}</ol></details>`;
  }
  navEl.innerHTML = html;

  // Scroll the current lesson into view within the sidebar.
  const cur = navEl.querySelector('.is-current');
  if (cur) cur.scrollIntoView({ block: 'center' });
}

function escapeText(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ===========================================================================
// Search (titles from nav data; full text from search-index.json when reachable)
// ===========================================================================
function initSearch() {
  const input = document.getElementById('search');
  const results = document.getElementById('search-results');
  const sidebarNav = document.getElementById('sidebar-nav');
  if (!input || !results) return;

  const nav = getNav();
  let index = (nav.lessons || []).map((l) => ({ i: l.i, o: l.o, t: l.t, m: '', s: '' }));

  // Progressive enhancement: richer full-text search if the JSON is reachable.
  fetch('../search-index.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => { if (data && data.lessons) index = data.lessons; })
    .catch(() => { /* offline / file:// — keep title-only search */ });

  let selected = -1;
  function render(query) {
    const q = query.trim().toLowerCase();
    if (!q) { results.hidden = true; results.innerHTML = ''; if (sidebarNav) sidebarNav.style.display = ''; return; }
    if (sidebarNav) sidebarNav.style.display = 'none';
    const matches = index
      .map((l) => {
        const inTitle = l.t.toLowerCase().includes(q);
        const inBody = (l.s || '').toLowerCase().includes(q);
        return inTitle || inBody ? { l, score: inTitle ? 0 : 1 } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score || a.l.i - b.l.i)
      .slice(0, 25);

    if (!matches.length) {
      results.innerHTML = '<p class="sr-empty">No lessons match.</p>';
    } else {
      results.innerHTML = matches.map(({ l }, idx) =>
        `<a href="${l.o}" data-idx="${idx}" class="${idx === selected ? 'active' : ''}">` +
        (l.m ? `<span class="sr-module">${escapeText(l.m)}</span>` : '') +
        `${highlight(l.t, q)}</a>`,
      ).join('');
    }
    results.hidden = false;
  }

  function highlight(text, q) {
    const i = text.toLowerCase().indexOf(q);
    if (i < 0) return escapeText(text);
    return escapeText(text.slice(0, i)) + '<mark>' + escapeText(text.slice(i, i + q.length)) + '</mark>' + escapeText(text.slice(i + q.length));
  }

  input.addEventListener('input', () => { selected = -1; render(input.value); });
  input.addEventListener('keydown', (e) => {
    const links = Array.from(results.querySelectorAll('a'));
    if (e.key === 'ArrowDown') { e.preventDefault(); selected = Math.min(selected + 1, links.length - 1); render(input.value); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selected = Math.max(selected - 1, 0); render(input.value); }
    else if (e.key === 'Enter') { const target = links[selected] || links[0]; if (target) location.href = target.getAttribute('href'); }
    else if (e.key === 'Escape') { input.value = ''; render(''); input.blur(); }
  });
  document.addEventListener('click', (e) => {
    if (!results.contains(e.target) && e.target !== input) { results.hidden = true; if (sidebarNav) sidebarNav.style.display = ''; }
  });
}

// ===========================================================================
// On-this-page outline + scrollspy + heading anchors
// ===========================================================================
function initOnThisPage() {
  const otp = document.getElementById('on-this-page');
  const article = document.querySelector('.lesson-body');
  if (!otp || !article) return;
  const headings = Array.from(article.querySelectorAll('h2[id], h3[id]'));
  if (headings.length < 2) return;

  otp.innerHTML = '<p class="otp-title">On this page</p>' + headings.map((h) =>
    `<a href="#${h.id}" class="lvl-${h.tagName === 'H3' ? 3 : 2}" data-id="${h.id}">${escapeText(h.textContent)}</a>`,
  ).join('');

  // Heading anchor links (appear on hover).
  for (const h of headings) {
    const a = document.createElement('a');
    a.href = `#${h.id}`; a.className = 'heading-anchor'; a.textContent = '#'; a.setAttribute('aria-label', 'Link to this section');
    h.appendChild(a);
  }

  // Scrollspy: highlight the heading nearest the top.
  if ('IntersectionObserver' in window) {
    const links = new Map(Array.from(otp.querySelectorAll('a')).map((a) => [a.dataset.id, a]));
    const visible = new Set();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) { if (e.isIntersecting) visible.add(e.target.id); else visible.delete(e.target.id); }
      let activeId = null;
      for (const h of headings) if (visible.has(h.id)) { activeId = h.id; break; }
      links.forEach((a, id) => a.classList.toggle('active', id === activeId));
    }, { rootMargin: '-80px 0px -70% 0px' });
    headings.forEach((h) => io.observe(h));
  }
}

// ===========================================================================
// Index page: resume button
// ===========================================================================
function initResume() {
  const btn = document.getElementById('resume-btn');
  if (!btn) return;
  const last = readStr(LS.last);
  const done = readSet(LS.done);
  const nav = getNav();
  // Resume = last visited, else first not-done lesson.
  let target = last;
  if (!target && nav.lessons) {
    const next = nav.lessons.find((l) => !done.has(l.o));
    target = next ? next.o : null;
  }
  if (target) { btn.href = `lessons/${target}`; btn.hidden = false; }
}

// ===========================================================================
// Global keyboard shortcuts
// ===========================================================================
function initKeyboard(toggleTheme) {
  document.addEventListener('keydown', (e) => {
    const el = document.activeElement;
    const typing = el && (el.closest('.monaco-block') || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
    if (e.key === '/' && !typing) {
      const search = document.getElementById('search');
      if (search) { e.preventDefault(); search.focus(); }
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowRight') document.querySelector('.pager-next[href]')?.click();
    else if (e.key === 'ArrowLeft') document.querySelector('.pager-prev[href]')?.click();
    else if (e.key === 't') toggleTheme();
  });
}

// ===========================================================================
// Mobile drawer
// ===========================================================================
function initDrawer() {
  const toggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!toggle || !sidebar) return;
  const open = () => { sidebar.classList.add('open'); if (overlay) overlay.hidden = false; toggle.setAttribute('aria-expanded', 'true'); };
  const close = () => { sidebar.classList.remove('open'); if (overlay) overlay.hidden = true; toggle.setAttribute('aria-expanded', 'false'); };
  toggle.addEventListener('click', () => (sidebar.classList.contains('open') ? close() : open()));
  overlay?.addEventListener('click', close);
  sidebar.addEventListener('click', (e) => { if (e.target.closest('.nav-link')) close(); });
}

// ===========================================================================
// Boot
// ===========================================================================
document.addEventListener('DOMContentLoaded', () => {
  const toggleTheme = initTheme();
  initCodeBlocks();
  buildSidebar();
  initSearch();
  initOnThisPage();
  initResume();
  initDrawer();
  initKeyboard(toggleTheme);

  // Record progress: mark this lesson visited now, and "done" once you reach the end.
  if (document.body.dataset.out) {
    writeStr(LS.last, document.body.dataset.out);
    const pager = document.querySelector('.pager');
    if (pager && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { markCurrentDone(); io.disconnect(); }
      });
      io.observe(pager);
    } else {
      markCurrentDone();
    }
  }
  refreshProgressUI();
});
