import { test, expect } from '@playwright/test';

test.describe('Session Notes - CRUD', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await page.locator('button[data-tab="sessionNotes"]').click();
    await page.waitForTimeout(300);
  });

  test('Notes textarea is visible and empty by default', async ({ page }) => {
    const notes = page.locator('#notesInput');
    await expect(notes).toBeVisible();
    const val = await notes.inputValue();
    expect(val).toBe('');
  });

  test('Can enter text into notes', async ({ page }) => {
    await page.locator('#notesInput').fill('Session 1: We fought goblins.');
    const val = await page.locator('#notesInput').inputValue();
    expect(val).toBe('Session 1: We fought goblins.');
  });

  test('Notes persist after tab switch', async ({ page }) => {
    await page.locator('#notesInput').fill('Important note about the quest.');
    // trigger save
    await page.locator('#notesInput').dispatchEvent('input');
    await page.waitForTimeout(200);

    // Switch away and back
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('button[data-tab="sessionNotes"]').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#notesInput')).toHaveValue('Important note about the quest.');
  });

  test('Notes persist after page reload', async ({ page }) => {
    await page.locator('#notesInput').fill('Survived the dragon encounter!');
    await page.locator('#notesInput').dispatchEvent('input');
    await page.waitForTimeout(200);

    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await page.locator('button[data-tab="sessionNotes"]').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#notesInput')).toHaveValue('Survived the dragon encounter!');
  });

  test('Notes support multiline text', async ({ page }) => {
    const multiline = 'Line 1: Fought goblins\nLine 2: Found treasure\nLine 3: Rest at inn';
    await page.locator('#notesInput').fill(multiline);
    await page.locator('#notesInput').dispatchEvent('input');
    await page.waitForTimeout(200);

    const val = await page.locator('#notesInput').inputValue();
    expect(val).toContain('Line 1');
    expect(val).toContain('Line 2');
    expect(val).toContain('Line 3');
  });

  test('Notes support special characters', async ({ page }) => {
    const text = 'Пийс каза: "Ще ви <бия> с \'дартове\' & юмруци!"';
    await page.locator('#notesInput').fill(text);
    await page.locator('#notesInput').dispatchEvent('input');
    await page.waitForTimeout(200);

    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await page.locator('button[data-tab="sessionNotes"]').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#notesInput')).toHaveValue(text);
  });

  test('Notes included in export bundle', async ({ page }) => {
    await page.locator('#notesInput').fill('Export test notes');
    await page.locator('#notesInput').dispatchEvent('input');
    await page.waitForTimeout(200);

    const bundle = await page.evaluate(() => window.buildBundle());
    expect(bundle.sessionNotes).toBe('Export test notes');
  });

  test('Notes restored from import', async ({ page }) => {
    const bundle = await page.evaluate(() => {
      const b = window.buildBundle();
      b.sessionNotes = 'Imported session notes';
      b.state.sessionNotes = 'Imported session notes';
      return b;
    });

    await page.evaluate((b) => window.applyBundle(b), bundle);
    await page.waitForTimeout(200);

    // reload to re-render all tabs from persisted state
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await page.locator('button[data-tab="sessionNotes"]').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#notesInput')).toHaveValue('Imported session notes');
  });
});
