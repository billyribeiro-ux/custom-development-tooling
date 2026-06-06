// =============================================================================
// app.js — client behavior for every lesson page.
//   1. Lazy-mount a Monaco editor into each code block when it scrolls into view
//      (Monaco is heavy; mounting all blocks at once would be slow).
//   2. Copy-to-clipboard button (with a file:// fallback).
//   3. "Edit" toggle so learners can experiment in-place.
//   4. Arrow-key page turning (← / →) — but only when not typing in an editor.
// =============================================================================

const MONACO_VERSION = '0.52.2';
const MONACO_BASE = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min/`;

// ---------------------------------------------------------------------------
// Configure Monaco's web workers to load from the same CDN. Workers must be
// same-origin, so we hand Monaco a tiny data: URL that re-imports the real
// worker from the CDN. This is the standard CDN-hosting pattern.
// ---------------------------------------------------------------------------
self.MonacoEnvironment = {
  getWorkerUrl() {
    return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
      self.MonacoEnvironment = { baseUrl: '${MONACO_BASE}' };
      importScripts('${MONACO_BASE}vs/base/worker/workerMain.js');
    `)}`;
  },
};

// `require` is the AMD loader injected by loader.js (loaded in <head>).
// If it is missing (e.g. offline with no CDN), we leave the <pre> fallbacks in
// place — every snippet is still fully readable and copyable. Graceful failure.
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

// ---------------------------------------------------------------------------
// Mount one code block as a Monaco editor.
// ---------------------------------------------------------------------------
async function mountBlock(figure) {
  if (figure.dataset.mounted) return;
  figure.dataset.mounted = '1';

  let monaco;
  try {
    monaco = await loadMonaco();
  } catch {
    return; // keep the <pre> fallback; nothing else to do
  }

  const host = figure.querySelector('.monaco-host');
  const source = figure.querySelector('.code-source');
  const fallback = figure.querySelector('.code-fallback');
  const code = source.value;

  // Size the editor to its content (with a sane cap, then it scrolls).
  const lineHeight = 19;
  const lines = code.split('\n').length;
  host.style.height = `${Math.min(lines * lineHeight + 16, 520)}px`;

  const editor = monaco.editor.create(host, {
    value: code,
    language: figure.dataset.lang || 'plaintext',
    theme: 'vs-dark',
    readOnly: true,
    automaticLayout: true, // re-layout on container resize
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 13.5,
    fontFamily: 'ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace',
    lineNumbersMinChars: 3,
    padding: { top: 8, bottom: 8 },
    scrollbar: { alwaysConsumeMouseWheel: false }, // let the page scroll past it
  });

  if (fallback) fallback.hidden = true; // Monaco is showing the code now
  figure._editor = editor;
}

// ---------------------------------------------------------------------------
// Wire up the Copy and Edit buttons for a block.
// ---------------------------------------------------------------------------
function wireButtons(figure) {
  const source = figure.querySelector('.code-source');
  const copyBtn = figure.querySelector('.btn-copy');
  const editBtn = figure.querySelector('.btn-edit');

  copyBtn?.addEventListener('click', async () => {
    const text = figure._editor ? figure._editor.getValue() : source.value;
    try {
      await navigator.clipboard.writeText(text); // modern, secure contexts
    } catch {
      // Fallback for file:// or insecure contexts: select a temp textarea.
      source.hidden = false;
      source.select();
      document.execCommand('copy');
      source.hidden = true;
    }
    copyBtn.textContent = 'Copied!';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.textContent = 'Copy';
      copyBtn.classList.remove('copied');
    }, 1400);
  });

  editBtn?.addEventListener('click', async () => {
    await mountBlock(figure); // ensure the editor exists
    if (!figure._editor) return;
    const nowEditable = figure._editor.getOption(monaco.editor.EditorOption.readOnly);
    figure._editor.updateOptions({ readOnly: !nowEditable });
    editBtn.setAttribute('aria-pressed', String(nowEditable));
    editBtn.textContent = nowEditable ? 'Editing' : 'Edit';
  });
}

// ---------------------------------------------------------------------------
// Boot.
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const blocks = Array.from(document.querySelectorAll('.monaco-block'));
  blocks.forEach(wireButtons);

  // Lazy-mount: only build a Monaco editor once its block nears the viewport.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            mountBlock(entry.target);
            obs.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '300px' },
    );
    blocks.forEach((b) => io.observe(b));
  } else {
    blocks.forEach(mountBlock); // very old browser: just mount everything
  }

  // Arrow-key page turning. Ignore when the user is typing in an editor/field.
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const el = document.activeElement;
    const typing =
      el && (el.closest('.monaco-block') || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
    if (typing) return;
    if (e.key === 'ArrowRight') {
      document.querySelector('.pager-next[href]')?.click();
    } else if (e.key === 'ArrowLeft') {
      document.querySelector('.pager-prev[href]')?.click();
    }
  });
});
