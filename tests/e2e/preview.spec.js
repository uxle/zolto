/**
 * Zolto e2e — tests/e2e/preview.spec.js
 * Live preview — renders correctly for all block types
 * Phase 4: Run with Playwright once the full editor UI is built.
 *
 * npx playwright test tests/e2e/preview.spec.js
 */
// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Live preview — renders correctly for all block types', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test.todo('Phase 4: write Playwright tests when UI is fully built');
});
