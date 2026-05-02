import { test, expect } from '@playwright/test';

/**
 * Knowledge from a Past Life — tracker тестове
 *
 * Проверява:
 * - checkbox-ите се рендерират в брой = proficiency bonus
 * - чекване на checkbox ги прави disabled и пази kfplUsed в state
 * - long rest нулира всички uses
 * - kfplUsed се включва в export/import
 */

test.describe('Knowledge from a Past Life tracker', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });

    await page.locator('button[data-tab="pcchar"]').click();
    await expect(page.locator('#kfplTracker')).toBeVisible();
  });

  test('renders 2 boxes at level 1 (prof = 2)', async ({ page }) => {
    const boxes = page.locator('#kfplTracker .kfpl-box');
    await expect(boxes).toHaveCount(2);
  });

  test('renders 3 boxes at level 5 (prof = 3)', async ({ page }) => {
    await page.evaluate(() => { window.st.level = 5; window.save(); });
    await page.locator('button[data-tab="stats"]').click();
    await page.locator('button[data-tab="pcchar"]').click();
    const boxes = page.locator('#kfplTracker .kfpl-box');
    await expect(boxes).toHaveCount(3);
  });

  test('renders 4 boxes at level 9 (prof = 4)', async ({ page }) => {
    await page.evaluate(() => { window.st.level = 9; window.save(); });
    await page.locator('button[data-tab="stats"]').click();
    await page.locator('button[data-tab="pcchar"]').click();
    const boxes = page.locator('#kfplTracker .kfpl-box');
    await expect(boxes).toHaveCount(4);
  });

  test('checking a box saves kfplUsed and disables it', async ({ page }) => {
    const firstBox = page.locator('#kfplTracker .kfpl-box').first();
    await expect(firstBox).not.toBeDisabled();

    await firstBox.check();

    const kfplUsed = await page.evaluate(() => window.st.kfplUsed);
    expect(kfplUsed).toBe(1);

    await expect(firstBox).toBeDisabled();
  });

  test('checking two boxes disables both and sets kfplUsed = 2', async ({ page }) => {
    const boxes = page.locator('#kfplTracker .kfpl-box');

    await boxes.nth(0).check();
    await boxes.nth(1).check();

    const kfplUsed = await page.evaluate(() => window.st.kfplUsed);
    expect(kfplUsed).toBe(2);

    await expect(boxes.nth(0)).toBeDisabled();
    await expect(boxes.nth(1)).toBeDisabled();
  });

  test('kfplUsed persists after tab switch and reload', async ({ page }) => {
    await page.locator('#kfplTracker .kfpl-box').first().check();

    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await page.locator('button[data-tab="pcchar"]').click();

    const kfplUsed = await page.evaluate(() => window.st.kfplUsed);
    expect(kfplUsed).toBe(1);
    await expect(page.locator('#kfplTracker .kfpl-box').first()).toBeDisabled();
  });

  test('long rest resets all boxes', async ({ page }) => {
    // Use both boxes at level 1
    await page.locator('#kfplTracker .kfpl-box').nth(0).check();
    await page.locator('#kfplTracker .kfpl-box').nth(1).check();

    let kfplUsed = await page.evaluate(() => window.st.kfplUsed);
    expect(kfplUsed).toBe(2);

    // Long rest
    await page.locator('#btnLongRest').click();
    await page.locator('button[data-tab="pcchar"]').click();

    kfplUsed = await page.evaluate(() => window.st.kfplUsed);
    expect(kfplUsed).toBe(0);

    // All boxes should be enabled again
    const boxes = page.locator('#kfplTracker .kfpl-box');
    await expect(boxes.nth(0)).not.toBeDisabled();
    await expect(boxes.nth(1)).not.toBeDisabled();
  });

  test('kfplUsed is included in export bundle', async ({ page }) => {
    await page.locator('#kfplTracker .kfpl-box').first().check();

    const bundle = await page.evaluate(() => window.buildBundle());
    expect(bundle.state.kfplUsed).toBe(1);
  });

  test('kfplUsed survives import round-trip', async ({ page }) => {
    await page.locator('#kfplTracker .kfpl-box').first().check();

    const bundle = await page.evaluate(() => window.buildBundle());
    expect(bundle.state.kfplUsed).toBe(1);

    await page.evaluate(() => localStorage.clear());
    await page.evaluate(b => window.applyBundle(b), bundle);
    await page.waitForTimeout(300);

    const kfplUsed = await page.evaluate(() => window.st.kfplUsed);
    expect(kfplUsed).toBe(1);
  });

});
