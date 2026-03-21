import { test, expect } from '@playwright/test';

/**
 * XP Add UI Tests
 * XP field is read-only. XP is added via a number input + "Add" button.
 */

test.describe('XP - Add UI', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });

    // Open Stats tab → Basic Info sub-tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
  });

  test('XP display is read-only (no editable input)', async ({ page }) => {
    await expect(page.locator('#subtab-basicinfo #xpDisplay')).toBeVisible();
    // The old editable input must not exist
    await expect(page.locator('#subtab-basicinfo #xpInput')).toHaveCount(0);
  });

  test('XP display shows current XP (default 0)', async ({ page }) => {
    await expect(page.locator('#subtab-basicinfo #xpDisplay')).toHaveText('0');
  });

  test('Add XP input and button are visible', async ({ page }) => {
    await expect(page.locator('#subtab-basicinfo #xpAddInput')).toBeVisible();
    await expect(page.locator('#subtab-basicinfo #btnAddXp')).toBeVisible();
  });

  test('Add XP button adds to current XP and clears input', async ({ page }) => {
    await page.locator('#subtab-basicinfo #xpAddInput').fill('300');
    await page.locator('#subtab-basicinfo #btnAddXp').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#subtab-basicinfo #xpDisplay')).toHaveText('300');
    // Input clears after add
    await expect(page.locator('#subtab-basicinfo #xpAddInput')).toHaveValue('');
  });

  test('Adding XP twice accumulates correctly', async ({ page }) => {
    await page.locator('#subtab-basicinfo #xpAddInput').fill('300');
    await page.locator('#subtab-basicinfo #btnAddXp').click();
    await page.waitForTimeout(200);

    await page.locator('#subtab-basicinfo #xpAddInput').fill('600');
    await page.locator('#subtab-basicinfo #btnAddXp').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#subtab-basicinfo #xpDisplay')).toHaveText('900');
  });

  test('Added XP persists after tab switch', async ({ page }) => {
    await page.locator('#subtab-basicinfo #xpAddInput').fill('6500');
    await page.locator('#subtab-basicinfo #btnAddXp').click();
    await page.waitForTimeout(200);

    // Switch away and back
    await page.locator('button[data-tab="inventory"]').click();
    await page.waitForTimeout(200);
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#subtab-basicinfo #xpDisplay')).toHaveText('6500');
  });

  test('Added XP persists after page reload', async ({ page }) => {
    await page.locator('#subtab-basicinfo #xpAddInput').fill('6500');
    await page.locator('#subtab-basicinfo #btnAddXp').click();
    await page.waitForTimeout(200);

    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#subtab-basicinfo #xpDisplay')).toHaveText('6500');
  });

  test('XP is saved to st.xp (export compatibility)', async ({ page }) => {
    await page.locator('#subtab-basicinfo #xpAddInput').fill('2700');
    await page.locator('#subtab-basicinfo #btnAddXp').click();
    await page.waitForTimeout(200);

    const xp = await page.evaluate(() => window.st.xp);
    expect(xp).toBe(2700);
  });

  test('Adding empty or zero XP does nothing', async ({ page }) => {
    await page.locator('#subtab-basicinfo #xpAddInput').fill('0');
    await page.locator('#subtab-basicinfo #btnAddXp').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#subtab-basicinfo #xpDisplay')).toHaveText('0');
  });

  test('Adding XP with existing XP from state', async ({ page }) => {
    // Set initial XP via state
    await page.evaluate(() => { window.st.xp = 1000; window.save(); });
    await page.waitForTimeout(200);

    await expect(page.locator('#subtab-basicinfo #xpDisplay')).toHaveText('1000');

    await page.locator('#subtab-basicinfo #xpAddInput').fill('500');
    await page.locator('#subtab-basicinfo #btnAddXp').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#subtab-basicinfo #xpDisplay')).toHaveText('1500');
  });

});
