/**
 * Zolto e2e — tests/e2e/editor.spec.js
 * Editor surface — typing, toolbar buttons, keyboard shortcuts
 * Phase 4: Run with Playwright once the full editor UI is built.
 *
 * npx playwright test tests/e2e/editor.spec.js
 */
// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Editor surface — typing, toolbar buttons, keyboard shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test.todo('Phase 4: write Playwright tests when UI is fully built');
});
