// =============================================================================
// features.spec.ts — end-to-end tests for the course PLATFORM features:
// sidebar navigation, search, theme toggle, progress tracking, the on-this-page
// outline, and the 404 page. (Module 16.) Each test is independent and gets a
// fresh browser context, so localStorage starts empty.
// =============================================================================
import { test, expect } from '@playwright/test';

test('the sidebar lists every module and highlights the current lesson', async ({ page }) => {
  await page.goto('/lessons/001-welcome.html');
  // 20 modules (Module 0 through Module 19) — built from the inlined nav data.
  await expect(page.locator('#sidebar-nav .nav-module')).toHaveCount(20);
  // The current lesson is highlighted.
  const current = page.locator('#sidebar-nav .nav-link.is-current');
  await expect(current).toHaveCount(1);
  await expect(current).toContainText('Welcome');
});

test('search filters lessons and navigates on click', async ({ page }) => {
  await page.goto('/lessons/001-welcome.html');
  await page.locator('#search').fill('playwright');
  const results = page.locator('#search-results a');
  await expect(results.first()).toBeVisible();
  // At least one result mentions Playwright.
  await expect(page.locator('#search-results')).toContainText(/Playwright/i);
  await results.first().click();
  await expect(page).toHaveURL(/lessons\/.+\.html/);
});

test('the theme toggle switches to light and persists across reloads', async ({ page }) => {
  await page.goto('/lessons/001-welcome.html');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'light');
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  // The early inline script applies the saved theme before paint.
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('reading a lesson marks it done and surfaces on the home page', async ({ page }) => {
  await page.goto('/lessons/001-welcome.html');
  // Scrolling the pager into view marks the lesson done.
  await page.locator('.pager').scrollIntoViewIfNeeded();
  await expect(page.locator('#sidebar-nav .nav-link.is-done')).toHaveCount(1, { timeout: 5000 });
  await expect(page.locator('#course-progress')).toContainText(/1 of 114/);

  // The home page reflects the progress and offers a Resume link.
  await page.goto('/');
  await expect(page.locator('#hero-progress')).toContainText(/1 of 114/);
  await expect(page.locator('#resume-btn')).toBeVisible();
  await expect(page.locator('.toc-lessons a.is-done')).toHaveCount(1);
});

test('the on-this-page outline lists the lesson section headings', async ({ page }) => {
  await page.goto('/lessons/005-what-is-tooling.html');
  // This lesson has several h2 sections, so the outline should populate.
  await expect(page.locator('#on-this-page a').first()).toBeVisible();
  expect(await page.locator('#on-this-page a').count()).toBeGreaterThan(1);
});

test('the generated 404 page renders for unknown URLs', async ({ page }) => {
  const res = await page.goto('/lessons/does-not-exist.html');
  expect(res?.status()).toBe(404);
  await expect(page.locator('h1')).toContainText('404');
});

test('the build emits a sitemap and robots.txt', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).toContain('<urlset');
  expect(xml).toContain('lessons/001-welcome.html');

  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain('Sitemap:');
});
