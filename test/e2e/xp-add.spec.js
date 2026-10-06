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

  test('XP remaining to the next level is shown and updates immediately', async ({ page }) => {
    const left = page.locator('#subtab-basicinfo #xpToNextSpan');
    await expect(left).toHaveText('300');          // от 0 до 2-ро ниво

    await page.locator('#subtab-basicinfo #xpAddInput').fill('100');
    await page.locator('#subtab-basicinfo #btnAddXp').click();
    await expect(left).toHaveText('200');          // веднага, без презареждане

    // прагът се прескача → брои се към следващия (900 за 3-то ниво)
    await page.locator('#subtab-basicinfo #xpAddInput').fill('250');
    await page.locator('#subtab-basicinfo #btnAddXp').click();
    await expect(page.locator('#subtab-basicinfo #xpDisplay')).toHaveText('350');
    await expect(left).toHaveText('550');

    // над таблицата кампанията дава по ниво на всеки милион — таван няма
    await page.evaluate(() => { window.st.xp = 400000; window.save(); });   // 20-то ниво
    await expect(left).toHaveText('955000');                               // 1 355 000 − 400 000
  });

  test('levels continue past 20, one per million XP', async ({ page }) => {
    const lvl = async xp => page.evaluate(x => {
      window.st.xp = x; window.save();
      return window.levelFromXP ? window.levelFromXP(x) : null;
    }, xp);

    // прагът на 20-то е 355 000; оттам нататък по милион
    expect(await page.evaluate(() => window.levelFromXP(355000))).toBe(20);
    expect(await page.evaluate(() => window.levelFromXP(1354999))).toBe(20);
    expect(await page.evaluate(() => window.levelFromXP(1355000))).toBe(21);
    expect(await page.evaluate(() => window.levelFromXP(2355000))).toBe(22);
    expect(await page.evaluate(() => window.levelFromXP(10355000))).toBe(30);

    // и остатъкът продължава да се смята
    await lvl(1355000);
    await expect(page.locator('#subtab-basicinfo #xpToNextSpan')).toHaveText('1000000');
  });

});
