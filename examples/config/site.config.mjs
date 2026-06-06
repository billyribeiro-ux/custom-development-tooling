// =============================================================================
// site.config.mjs — an example "configuration as code" file, narrated in
// Module 12. Instead of a static JSON blob, the config is a JavaScript module
// that EXPORTS an object. Because it is code, it can use variables, comments,
// environment values, and logic — things JSON simply cannot do.
//
// Tools (Vite, Vitest, Playwright, ESLint flat config, Astro, ...) all adopted
// this pattern. The `defineConfig` helper below is exactly why: it gives you
// editor autocomplete and type-checking on a plain object.
// =============================================================================

/**
 * `defineConfig` is an identity function — it returns its argument unchanged.
 * Its only job is to attach a type so your editor autocompletes config keys
 * and flags typos. Real tools ship their own typed version of this.
 *
 * @template T
 * @param {T} config
 * @returns {T}
 */
export function defineConfig(config) {
  return config;
}

// Reading the environment here is the superpower static config lacks: the same
// config file behaves differently in dev vs production.
const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  site: {
    title: 'Custom Development Tooling',
    // Logic in config: choose the base URL based on the environment.
    baseUrl: isProd ? 'https://example.com' : 'http://localhost:8080',
  },

  build: {
    outDir: process.env.SITE_OUTPUT_DIR ?? 'site',
    minify: isProd, // only minify for production builds
    sourcemaps: !isProd,
  },

  // A list is just an array — easy to extend, unlike editing nested JSON.
  markdown: {
    calloutTypes: ['NOTE', 'TIP', 'WARNING', 'GOTCHA', 'DOGFOOD', 'TRY', 'KEY'],
  },
});
