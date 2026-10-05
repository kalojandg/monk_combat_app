import { test, expect } from '@playwright/test';

/**
 * ARMOR AC / MAX DEX INPUTS (Basic Info, cleric only)
 *
 * Двата входа живеят в tabs/stats-basicinfo.html, закачат се от modules/classes/cleric.js
 * и се виждат само при активен клерик. Монкът вижда Basic Info непроменен.
 */

test.describe('Armor AC inputs', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true);
    await page.click('[data-subtab="basicinfo"]');
    await expect(page.locator('#acMagicInput')).toBeVisible();
  });

  const makeCleric = page => page.evaluate(() => {
    localStorage.setItem('activeCharacter', 'cleric');
    window.st.class = 'cleric';
    window.save();
  });

  test('(a) monk: both inputs are hidden, neighbours stay visible', async ({ page }) => {
    await expect(page.locator('#armorAcInput')).toBeHidden();
    await expect(page.locator('#armorMaxDexInput')).toBeHidden();
    await expect(page.locator('#acSpan2')).toBeVisible();
    await expect(page.locator('#acMagicInput')).toBeVisible();
  });

  test('(b) cleric: values persist to st.armorAc / st.armorMaxDex and survive reload', async ({ page }) => {
    await makeCleric(page);
    await expect(page.locator('#armorAcInput')).toBeVisible();
    await expect(page.locator('#armorMaxDexInput')).toBeVisible();
    await page.fill('#armorAcInput', '15');
    await page.fill('#armorMaxDexInput', '2');
    await page.waitForTimeout(200);
    const s = await page.evaluate(() => ({ a: window.st.armorAc, m: window.st.armorMaxDex }));
    expect(s).toEqual({ a: 15, m: 2 });

    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true);
    await page.click('[data-subtab="basicinfo"]');
    await expect(page.locator('#armorAcInput')).toHaveValue('15');
    await expect(page.locator('#armorMaxDexInput')).toHaveValue('2');
  });

  test('(c) empty max dex stores null, not 0', async ({ page }) => {
    await makeCleric(page);
    await page.fill('#armorMaxDexInput', '2');
    await page.waitForTimeout(200);
    await page.fill('#armorMaxDexInput', '');
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.st.armorMaxDex)).toBeNull();
  });

  test('(d) armor 15, max dex 2, DEX +4 gives AC 17', async ({ page }) => {
    await makeCleric(page);
    await page.evaluate(() => { window.st.dex = 18; window.save(); });
    await page.fill('#armorAcInput', '15');
    await page.fill('#armorMaxDexInput', '2');
    await page.waitForTimeout(200);
    await expect(page.locator('#acSpan2')).toHaveText('17');
  });
});
