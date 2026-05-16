import { test, expect } from '@playwright/test';

/**
 * MULTICLASS TESTS - Monk/Cleric
 *
 * TDD: тестовете са написани преди имплементацията.
 * Тестват multiclass state, level-up dialog, и per-class feature filtering.
 */

test.describe('Multiclass State - Default Values', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  test('Default state has monkLevel=1 and clericLevel=0', async ({ page }) => {
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#subtab-basicinfo #monkLevelSpan')).toHaveText('1');
    await expect(page.locator('#subtab-basicinfo #clericLevelSpan')).toHaveText('0');
  });

  test('Character Level field shows total character level', async ({ page }) => {
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('1');
  });

  test('Character Level equals monkLevel + clericLevel', async ({ page }) => {
    const charLevel = await page.evaluate(() => window.st.level);
    const monkLevel = await page.evaluate(() => window.st.monkLevel);
    const clericLevel = await page.evaluate(() => window.st.clericLevel);

    expect(charLevel).toBe(monkLevel + clericLevel);
  });
});

test.describe('Multiclass - Level Up Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  test('Long Rest shows level-up modal when XP qualifies', async ({ page }) => {
    await page.evaluate(() => { window.st.xp = 300; window.save(); });
    await page.waitForTimeout(200);

    await page.locator('#btnLongRest').click();
    await expect(page.locator('#levelUpModal')).toBeVisible({ timeout: 4000 });

    // Clean up
    await page.locator('#cardMonk').click();
    await page.waitForTimeout(200);
  });

  test('Long Rest does NOT show modal when no level-up pending', async ({ page }) => {
    await page.locator('#btnLongRest').click();
    await page.waitForTimeout(600);

    const visible = await page.locator('#levelUpModal').isVisible();
    expect(visible).toBe(false);
  });

  test('Clicking Monk card increases monkLevel', async ({ page }) => {
    await page.evaluate(() => { window.st.xp = 300; window.save(); });
    await page.waitForTimeout(200);

    await page.locator('#btnLongRest').click();
    await page.waitForSelector('#levelUpModal:not(.hidden)', { timeout: 4000 });
    await page.locator('#cardMonk').click();
    await page.waitForTimeout(400);

    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('2');
    await expect(page.locator('#subtab-basicinfo #monkLevelSpan')).toHaveText('2');
    await expect(page.locator('#subtab-basicinfo #clericLevelSpan')).toHaveText('0');
  });

  test('Clicking Cleric card increases clericLevel', async ({ page }) => {
    await page.evaluate(() => { window.st.xp = 300; window.save(); });
    await page.waitForTimeout(200);

    await page.locator('#btnLongRest').click();
    await page.waitForSelector('#levelUpModal:not(.hidden)', { timeout: 4000 });
    await page.locator('#cardCleric').click();
    await page.waitForTimeout(400);

    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('2');
    await expect(page.locator('#subtab-basicinfo #monkLevelSpan')).toHaveText('1');
    await expect(page.locator('#subtab-basicinfo #clericLevelSpan')).toHaveText('1');
  });

  test('Multiple level-up: character level = monkLevel + clericLevel always', async ({ page }) => {
    // XP=900 → Level 3 (2 level-ups), alternate Monk/Cleric
    await page.evaluate(() => { window.st.xp = 900; window.save(); });
    await page.waitForTimeout(200);

    await page.locator('#btnLongRest').click();

    // First modal → Monk
    await page.waitForSelector('#levelUpModal:not(.hidden)', { timeout: 4000 });
    await page.locator('#cardMonk').click();
    await page.waitForTimeout(200);

    // Second modal → Cleric
    await page.waitForSelector('#levelUpModal:not(.hidden)', { timeout: 4000 });
    await page.locator('#cardCleric').click();
    await page.waitForTimeout(400);

    const charLevel = await page.evaluate(() => window.st.level);
    const monkLevel = await page.evaluate(() => window.st.monkLevel);
    const clericLevel = await page.evaluate(() => window.st.clericLevel);

    expect(charLevel).toBe(monkLevel + clericLevel);
    expect(charLevel).toBe(3);
    expect(monkLevel).toBe(2);
    expect(clericLevel).toBe(1);
  });
});

test.describe('Multiclass - Monk Stats Use Monk Level', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  test('Ki Max uses Monk Level, not Character Level', async ({ page }) => {
    // Char L2 via Cleric level up → monkLevel=1, clericLevel=1
    await page.evaluate(() => { window.st.xp = 300; window.save(); });

    await page.locator('#btnLongRest').click();
    await page.waitForSelector('#levelUpModal:not(.hidden)', { timeout: 4000 });
    await page.locator('#cardCleric').click(); // choose Cleric
    await page.waitForTimeout(400);

    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('2');
    await expect(page.locator('#subtab-basicinfo #monkLevelSpan')).toHaveText('1');
    // Ki max = monkLevel = 1, NOT character level 2
    await expect(page.locator('#subtab-basicinfo #kiMaxSpan')).toHaveText('1');
    await expect(page.locator('#kiCurrentSpan')).toHaveText('1');
  });

  test('Martial Arts Die uses Monk Level - monkL5 = d6', async ({ page }) => {
    await page.evaluate(() => {
      window.st.monkLevel = 5;
      window.st.clericLevel = 0;
      window.st.level = 5;
      window.save();
    });
    await page.waitForTimeout(300);

    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#subtab-basicinfo #maDieSpan')).toHaveText('d6');
  });

  test('Martial Arts Die uses Monk Level - monkL3 = d4 even at char L5', async ({ page }) => {
    // Char L5 but Monk L3 (Cleric L2) → MA die still d4
    await page.evaluate(() => {
      window.st.monkLevel = 3;
      window.st.clericLevel = 2;
      window.st.level = 5;
      window.save();
    });
    await page.waitForTimeout(300);

    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#subtab-basicinfo #maDieSpan')).toHaveText('d4');
  });

  test('Unarmored Movement uses Monk Level', async ({ page }) => {
    // monkLevel=6 → +15ft, even if charLevel=8
    await page.evaluate(() => {
      window.st.monkLevel = 6;
      window.st.clericLevel = 2;
      window.st.level = 8;
      window.save();
    });
    await page.waitForTimeout(300);

    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#subtab-basicinfo #umBonusSpan')).toHaveText('15');
  });

  test('Proficiency Bonus uses Character Level', async ({ page }) => {
    // Char L5 (monk3+cleric2) → prof +3 (based on char level 5)
    await page.evaluate(() => {
      window.st.monkLevel = 3;
      window.st.clericLevel = 2;
      window.st.level = 5;
      window.save();
    });
    await page.waitForTimeout(300);

    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#subtab-basicinfo #profSpan2')).toHaveText('+3');
  });
});

test.describe('Multiclass - Features Accordion by Class Level', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
  });

  test('Monk features shown up to monkLevel', async ({ page }) => {
    await page.evaluate(() => {
      window.st.monkLevel = 2;
      window.st.clericLevel = 0;
      window.st.level = 2;
      window.save();
    });
    await page.waitForTimeout(200);

    await page.locator('button[data-tab="skills"]').click();
    await page.waitForTimeout(600);
    await page.waitForSelector('#featuresAccordion details.feat', { timeout: 5000 });

    const summaries = await page.locator('#featuresAccordion details.feat summary').allTextContents();
    // Unarmored Defense is Monk L1 - must be shown
    expect(summaries.some(s => s.includes('Unarmored Defense'))).toBe(true);
    // Ki is Monk L2 - must be shown
    expect(summaries.some(s => s.includes('Ki'))).toBe(true);
    // Deflect Missiles is Monk L3 - must NOT be shown at monkL2
    expect(summaries.some(s => s.includes('Deflect Missiles'))).toBe(false);
  });

  test('Cleric features shown up to clericLevel', async ({ page }) => {
    await page.evaluate(() => {
      window.st.monkLevel = 1;
      window.st.clericLevel = 1;
      window.st.level = 2;
      window.save();
    });
    await page.waitForTimeout(200);

    await page.locator('button[data-tab="skills"]').click();
    await page.waitForTimeout(600);
    await page.waitForSelector('#featuresAccordion details.feat', { timeout: 5000 });

    const summaries = await page.locator('#featuresAccordion details.feat summary').allTextContents();
    // Spellcasting is Cleric L1
    expect(summaries.some(s => s.includes('Spellcasting'))).toBe(true);
  });

  test('Cleric L2+ features NOT shown when clericLevel=1', async ({ page }) => {
    await page.evaluate(() => {
      window.st.monkLevel = 1;
      window.st.clericLevel = 1;
      window.st.level = 2;
      window.save();
    });
    await page.waitForTimeout(200);

    await page.locator('button[data-tab="skills"]').click();
    await page.waitForTimeout(600);
    await page.waitForSelector('#featuresAccordion details.feat', { timeout: 5000 });

    const summaries = await page.locator('#featuresAccordion details.feat summary').allTextContents();
    // Channel Divinity and Touch of Death are Cleric L2 - must NOT appear at clericL1
    expect(summaries.some(s => s.includes('Touch of Death'))).toBe(false);
    expect(summaries.some(s => s.includes('Channel Divinity'))).toBe(false);
  });

  test('No cleric features shown when clericLevel=0', async ({ page }) => {
    await page.evaluate(() => {
      window.st.monkLevel = 3;
      window.st.clericLevel = 0;
      window.st.level = 3;
      window.save();
    });
    await page.waitForTimeout(200);

    await page.locator('button[data-tab="skills"]').click();
    await page.waitForTimeout(600);
    await page.waitForSelector('#featuresAccordion details.feat', { timeout: 5000 });

    const summaries = await page.locator('#featuresAccordion details.feat summary').allTextContents();
    // No cleric features at all
    expect(summaries.some(s => s.toLowerCase().includes('[cleric]'))).toBe(false);
    expect(summaries.some(s => s.includes('Spellcasting'))).toBe(false);
  });

  test('Monk L5 feature (Stunning Strike) NOT shown at monkLevel=3', async ({ page }) => {
    await page.evaluate(() => {
      window.st.monkLevel = 3;
      window.st.clericLevel = 2;
      window.st.level = 5;
      window.save();
    });
    await page.waitForTimeout(200);

    await page.locator('button[data-tab="skills"]').click();
    await page.waitForTimeout(600);
    await page.waitForSelector('#featuresAccordion details.feat', { timeout: 5000 });

    const summaries = await page.locator('#featuresAccordion details.feat summary').allTextContents();
    expect(summaries.some(s => s.includes('Stunning Strike'))).toBe(false);
  });

  test('Features are sorted by level: Monk L1 features appear before Cleric L1 features', async ({ page }) => {
    await page.evaluate(() => {
      window.st.monkLevel = 1;
      window.st.clericLevel = 1;
      window.st.level = 2;
      window.save();
    });
    await page.waitForTimeout(200);

    await page.locator('button[data-tab="skills"]').click();
    await page.waitForTimeout(600);
    await page.waitForSelector('#featuresAccordion details.feat', { timeout: 5000 });

    const summaries = await page.locator('#featuresAccordion details.feat summary').allTextContents();
    const monkL1Index = summaries.findIndex(s => s.includes('[Monk]') && s.includes('Lv 1'));
    const clericL1Index = summaries.findIndex(s => s.includes('[Cleric]') && s.includes('Lv 1'));

    expect(monkL1Index).toBeGreaterThanOrEqual(0);
    expect(clericL1Index).toBeGreaterThan(monkL1Index);
  });

  test('Monk L5 feature shown when monkLevel=5', async ({ page }) => {
    await page.evaluate(() => {
      window.st.monkLevel = 5;
      window.st.clericLevel = 0;
      window.st.level = 5;
      window.save();
    });
    await page.waitForTimeout(200);

    await page.locator('button[data-tab="skills"]').click();
    await page.waitForTimeout(600);
    await page.waitForSelector('#featuresAccordion details.feat', { timeout: 5000 });

    const summaries = await page.locator('#featuresAccordion details.feat summary').allTextContents();
    expect(summaries.some(s => s.includes('Stunning Strike'))).toBe(true);
  });
});
