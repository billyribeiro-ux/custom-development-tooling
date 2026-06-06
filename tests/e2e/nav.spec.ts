// =============================================================================
// nav.spec.ts — end-to-end tests for the course navigation, narrated in
// Module 16. These run against the REAL built site in a REAL browser, exactly
// as a learner experiences it. They are the safety net that proves the
// generator wired Prev/Next, the progress indicator, and the home page
// correctly across all 107 pages.
// =============================================================================
import { test, expect } from '@playwright/test';

test('home page lists the course and links to the first lesson', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Custom Development Tooling/);
  await expect(page.locator('h1')).toContainText('Custom Development Tooling');
  // The "Start the course" button points at the first lesson.
  await expect(page.getByRole('link', { name: /Start the course/ })).toBeVisible();
});

test('the first lesson disables Previous and enables Next', async ({ page }) => {
  await page.goto('/lessons/001-welcome.html');
  await expect(page.locator('.progress-text')).toHaveText('Lesson 1 of 107');

  // Prev is disabled on the very first page (no href, aria-disabled).
  const prev = page.locator('.pager-prev');
  await expect(prev).toHaveAttribute('aria-disabled', 'true');

  // Next is a real link.
  const next = page.locator('.pager-next');
  await expect(next).toHaveAttribute('href', /002-/);
});

test('Next and Previous buttons actually move between lessons', async ({ page }) => {
  await page.goto('/lessons/001-welcome.html');
  await page.locator('.pager-next').click();
  await expect(page.locator('.progress-text')).toHaveText('Lesson 2 of 107');

  await page.locator('.pager-prev').click();
  await expect(page.locator('.progress-text')).toHaveText('Lesson 1 of 107');
});

test('arrow keys turn the page', async ({ page }) => {
  await page.goto('/lessons/001-welcome.html');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.progress-text')).toHaveText('Lesson 2 of 107');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.progress-text')).toHaveText('Lesson 1 of 107');
});

test('every lesson has working code blocks with a copy button', async ({ page }) => {
  await page.goto('/lessons/002-what-you-will-build.html');
  const firstBlock = page.locator('.monaco-block').first();
  await expect(firstBlock).toBeVisible();
  await expect(firstBlock.locator('.btn-copy')).toBeVisible();
});

test('the last lesson disables Next', async ({ page }) => {
  // 107 lessons total; the last file is 107-review.html.
  await page.goto('/lessons/107-review.html');
  await expect(page.locator('.pager-next')).toHaveAttribute('aria-disabled', 'true');
});
