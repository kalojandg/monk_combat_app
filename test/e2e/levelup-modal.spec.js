import { test, expect } from '@playwright/test';

/**
 * LEVEL-UP MODAL TESTS (TDD)
 *
 * Тестват графичния диалог за избор Monk/Cleric при level-up.
 * Без browser confirm() - само DOM modal с 2 кликабъл карти.
 */

async function setupForLevelUp(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
  await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
}

test.describe('Level-Up Modal - Appearance', () => {

  test('Modal appears when Long Rest triggers level-up', async ({ page }) => {
    await setupForLevelUp(page);
    await page.evaluate(() => { window.st.xp = 300; window.save(); });
    await page.waitForTimeout(200);

    await page.locator('#btnLongRest').click();
    await expect(page.locator('#levelUpModal')).toBeVisible({ timeout: 4000 });
  });

  test('No browser confirm/dialog appears (replaced by DOM modal)', async ({ page }) => {
    await setupForLevelUp(page);

    let dialogAppeared = false;
    page.on('dialog', () => { dialogAppeared = true; });

    await page.evaluate(() => { window.st.xp = 300; window.save(); });
    await page.waitForTimeout(200);
    await page.locator('#btnLongRest').click();
    await page.waitForTimeout(600);

    expect(dialogAppeared).toBe(false);

    // Clean up: close modal
    await page.locator('#cardMonk').click();
    await page.waitForTimeout(200);
  });

  test('Modal has Monk card with SVG icon', async ({ page }) => {
    await setupForLevelUp(page);
    await page.evaluate(() => { window.st.xp = 300; window.save(); });
    await page.locator('#btnLongRest').click();
    await page.waitForSelector('#levelUpModal:not(.hidden)', { timeout: 4000 });

    await expect(page.locator('#cardMonk')).toBeVisible();
    await expect(page.locator('#cardMonk svg')).toBeVisible();
    await expect(page.locator('#cardMonk .levelup-card-class')).toHaveText('Monk');
  });

  test('Modal has Cleric card with SVG icon', async ({ page }) => {
    await setupForLevelUp(page);
    await page.evaluate(() => { window.st.xp = 300; window.save(); });
    await page.locator('#btnLongRest').click();
    await page.waitForSelector('#levelUpModal:not(.hidden)', { timeout: 4000 });

    await expect(page.locator('#cardCleric')).toBeVisible();
    await expect(page.locator('#cardCleric svg')).toBeVisible();
    await expect(page.locator('#cardCleric .levelup-card-class')).toHaveText('Cleric');
  });

  test('Modal shows current → next monk level', async ({ page }) => {
    await setupForLevelUp(page);
    await page.evaluate(() => { window.st.xp = 300; window.save(); });
    await page.locator('#btnLongRest').click();
    await page.waitForSelector('#levelUpModal:not(.hidden)', { timeout: 4000 });

    const text = await page.locator('#monkLevelLabel').textContent();
    expect(text).toContain('1');
    expect(text).toContain('2');
  });

  test('Modal shows current → next cleric level', async ({ page }) => {
    await setupForLevelUp(page);
    await page.evaluate(() => { window.st.xp = 300; window.save(); });
    await page.locator('#btnLongRest').click();
    await page.waitForSelector('#levelUpModal:not(.hidden)', { timeout: 4000 });

    const text = await page.locator('#clericLevelLabel').textContent();
    expect(text).toContain('0');
    expect(text).toContain('1');
  });

  test('Modal shows feature gained at next monk level', async ({ page }) => {
    await setupForLevelUp(page);
    await page.evaluate(() => { window.st.xp = 300; window.save(); });
    await page.locator('#btnLongRest').click();
    await page.waitForSelector('#levelUpModal:not(.hidden)', { timeout: 4000 });

    // Monk Lv 2 gains Ki
    const text = await page.locator('#monkFeatureLabel').textContent();
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain('Ki');
  });

  test('Modal shows feature gained at next cleric level', async ({ page }) => {
    await setupForLevelUp(page);
    await page.evaluate(() => { window.st.xp = 300; window.save(); });
    await page.locator('#btnLongRest').click();
    await page.waitForSelector('#levelUpModal:not(.hidden)', { timeout: 4000 });

    // Cleric Lv 1 gains Spellcasting
    const text = await page.locator('#clericFeatureLabel').textContent();
    expect(text).toContain('Spellcasting');
  });

  test('Modal does NOT appear when no level-up pending', async ({ page }) => {
    await setupForLevelUp(page);
    // XP stays at 0, no level-up

    await page.locator('#btnLongRest').click();
    await page.waitForTimeout(600);

    const visible = await page.locator('#levelUpModal').isVisible();
    expect(visible).toBe(false);
  });
});

test.describe('Level-Up Modal - Interaction', () => {

  test('Clicking Monk card closes modal', async ({ page }) => {
    await setupForLevelUp(page);
    await page.evaluate(() => { window.st.xp = 300; window.save(); });
    await page.locator('#btnLongRest').click();
    await page.waitForSelector('#levelUpModal:not(.hidden)', { timeout: 4000 });

    await page.locator('#cardMonk').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#levelUpModal')).not.toBeVisible();
  });

  test('Clicking Monk card increases monkLevel', async ({ page }) => {
    await setupForLevelUp(page);
    await page.evaluate(() => { window.st.xp = 300; window.save(); });
    await page.locator('#btnLongRest').click();
    await page.waitForSelector('#levelUpModal:not(.hidden)', { timeout: 4000 });

    await page.locator('#cardMonk').click();
    await page.waitForTimeout(400);

    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#subtab-basicinfo #monkLevelSpan')).toHaveText('2');
    await expect(page.locator('#subtab-basicinfo #clericLevelSpan')).toHaveText('0');
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('2');
  });

  test('Clicking Cleric card closes modal', async ({ page }) => {
    await setupForLevelUp(page);
    await page.evaluate(() => { window.st.xp = 300; window.save(); });
    await page.locator('#btnLongRest').click();
    await page.waitForSelector('#levelUpModal:not(.hidden)', { timeout: 4000 });

    await page.locator('#cardCleric').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#levelUpModal')).not.toBeVisible();
  });

  test('Clicking Cleric card increases clericLevel', async ({ page }) => {
    await setupForLevelUp(page);
    await page.evaluate(() => { window.st.xp = 300; window.save(); });
    await page.locator('#btnLongRest').click();
    await page.waitForSelector('#levelUpModal:not(.hidden)', { timeout: 4000 });

    await page.locator('#cardCleric').click();
    await page.waitForTimeout(400);

    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#subtab-basicinfo #monkLevelSpan')).toHaveText('1');
    await expect(page.locator('#subtab-basicinfo #clericLevelSpan')).toHaveText('1');
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('2');
  });

  test('Multiple level-ups show modal multiple times', async ({ page }) => {
    await setupForLevelUp(page);
    // XP=900 → L3, so 2 modals
    await page.evaluate(() => { window.st.xp = 900; window.save(); });
    await page.waitForTimeout(200);

    await page.locator('#btnLongRest').click();

    // First modal
    await page.waitForSelector('#levelUpModal:not(.hidden)', { timeout: 4000 });
    await page.locator('#cardMonk').click();
    await page.waitForTimeout(200);

    // Second modal
    await page.waitForSelector('#levelUpModal:not(.hidden)', { timeout: 4000 });
    await page.locator('#cardCleric').click();
    await page.waitForTimeout(400);

    const charLevel = await page.evaluate(() => window.st.level);
    const monkLevel = await page.evaluate(() => window.st.monkLevel);
    const clericLevel = await page.evaluate(() => window.st.clericLevel);

    expect(charLevel).toBe(3);
    expect(monkLevel).toBe(2);
    expect(clericLevel).toBe(1);
  });
});
