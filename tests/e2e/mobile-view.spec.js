/**
 * Zolto e2e — tests/e2e/mobile-view.spec.js
 * Mobile breakpoint — Edit/Preview tab switching
 * Phase 4: Run with Playwright once the full editor UI is built.
 *
 * npx playwright test tests/e2e/mobile-view.spec.js
 */
// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Mobile breakpoint — Edit/Preview tab switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test.todo('Phase 4: write Playwright tests when UI is fully built');
});
