import { test, expect } from '@playwright/test';

/**
 * REST MECHANICS TESTS
 * 
 * Тестват Long Rest и level progression за всички 20 нива.
 */

// XP thresholds за всяко ниво (от app.js)
const XP_FOR_LEVEL = {
  1: 0,
  2: 300,
  3: 900,
  4: 2700,
  5: 6500,
  6: 14000,
  7: 23000,
  8: 34000,
  9: 48000,
  10: 64000,
  11: 85000,
  12: 100000,
  13: 120000,
  14: 140000,
  15: 165000,
  16: 195000,
  17: 225000,
  18: 265000,
  19: 305000,
  20: 355000
};

// Expected derived values per level
const EXPECTED_VALUES = {
  1: { prof: '+2', ki: '1', ma: 'd4', um: '0', hd: '1' },
  2: { prof: '+2', ki: '2', ma: 'd4', um: '10', hd: '2' },
  3: { prof: '+2', ki: '3', ma: 'd4', um: '10', hd: '3' },
  4: { prof: '+2', ki: '4', ma: 'd4', um: '10', hd: '4' },
  5: { prof: '+3', ki: '5', ma: 'd6', um: '10', hd: '5' },
  6: { prof: '+3', ki: '6', ma: 'd6', um: '15', hd: '6' },
  7: { prof: '+3', ki: '7', ma: 'd6', um: '15', hd: '7' },
  8: { prof: '+3', ki: '8', ma: 'd6', um: '15', hd: '8' },
  9: { prof: '+4', ki: '9', ma: 'd6', um: '15', hd: '9' },
  10: { prof: '+4', ki: '10', ma: 'd6', um: '20', hd: '10' },
  11: { prof: '+4', ki: '11', ma: 'd8', um: '20', hd: '11' },
  12: { prof: '+4', ki: '12', ma: 'd8', um: '20', hd: '12' },
  13: { prof: '+5', ki: '13', ma: 'd8', um: '20', hd: '13' },
  14: { prof: '+5', ki: '14', ma: 'd8', um: '25', hd: '14' },
  15: { prof: '+5', ki: '15', ma: 'd8', um: '25', hd: '15' },
  16: { prof: '+5', ki: '16', ma: 'd8', um: '25', hd: '16' },
  17: { prof: '+6', ki: '17', ma: 'd10', um: '25', hd: '17' },
  18: { prof: '+6', ki: '18', ma: 'd10', um: '30', hd: '18' },
  19: { prof: '+6', ki: '19', ma: 'd10', um: '30', hd: '19' },
  20: { prof: '+6', ki: '20', ma: 'd10', um: '30', hd: '20' }
};

test.describe('Rest Mechanics - Long Rest Basic', () => {
  
  test('Long Rest fully restores HP', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Wait for tabs to load
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await expect(page.locator('#hpDelta')).toBeVisible({ timeout: 5000 });
    
    // Take damage
    await page.locator('#hpDelta').fill('5');
    await page.locator('#btnDamage').click();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('3');
    
    // Long rest
    await page.locator('#btnLongRest').click();
    
    // HP restored
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8');
  });

});

test.describe('Rest Mechanics - Level Progression (1-20)', () => {
  
  for (let level = 1; level <= 20; level++) {
    test(`Level ${level}: Long Rest updates all derived values correctly`, async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
      await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
      await expect(page.locator('#hpDelta')).toBeVisible({ timeout: 5000 });
      
      // Set XP for this level
      const xp = XP_FOR_LEVEL[level];
      await page.locator('button[data-tab="stats"]').click();
      await page.locator('#xpInput').fill(xp.toString());
      await page.locator('#xpInput').blur();
      
      // Wait for input to process
      await page.waitForTimeout(300);
      
      // Level should still be 1 (level up happens on Long Rest, not on XP change)
      await expect(page.locator('#levelSpan')).toHaveText('1');
      
      // Take damage (so long rest has something to restore)
      // HP контролите са винаги видими - няма Combat таб
      await page.locator('#hpDelta').fill('1');
      await page.locator('#btnDamage').click();
      
      // Long rest - this is when level up happens
      await page.locator('#btnLongRest').click();
      
      // Verify level increased after long rest
      await page.locator('button[data-tab="stats"]').click();
      await expect(page.locator('#levelSpan')).toHaveText(level.toString());
      
      // Verify all derived values after long rest
      
      const expected = EXPECTED_VALUES[level];
      
      // Proficiency Bonus
      await expect(page.locator('#profSpan2')).toHaveText(expected.prof);
      
      // Ki (current = max after long rest)
      await expect(page.locator('#kiMaxSpan')).toHaveText(expected.ki);
      await expect(page.locator('#kiCurrentSpan')).toHaveText(expected.ki);
      
      // Martial Arts Die
      await expect(page.locator('#maDieSpan')).toHaveText(expected.ma);
      
      // Unarmored Movement
      await expect(page.locator('#umBonusSpan')).toHaveText(expected.um);
      
      // Hit Dice Max
      await expect(page.locator('#hdMaxSpan')).toHaveText(expected.hd);
    });
  }

});

test.describe('Level Up Bug Fix - TDD Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  test('XP change should NOT increase level immediately', async ({ page }) => {
    // Start at level 1
    await page.locator('button[data-tab="stats"]').click();
    await expect(page.locator('#levelSpan')).toHaveText('1');
    
    // Set XP to 300 (enough for level 2)
    await page.locator('#xpInput').fill('300');
    await page.locator('#xpInput').blur();
    await page.waitForTimeout(300);
    
    // Level should still be 1 (not 2)
    await expect(page.locator('#levelSpan')).toHaveText('1');
    
    // Derived values should still be for level 1
    await expect(page.locator('#profSpan2')).toHaveText('+2');
    await expect(page.locator('#kiMaxSpan')).toHaveText('1');
    await expect(page.locator('#maDieSpan')).toHaveText('d4');
  });

  test('Long Rest should increase level when XP threshold is reached', async ({ page }) => {
    // Start at level 1
    await page.locator('button[data-tab="stats"]').click();
    await expect(page.locator('#levelSpan')).toHaveText('1');
    
    // Set XP to 300 (enough for level 2)
    await page.locator('#xpInput').fill('300');
    await page.locator('#xpInput').blur();
    await page.waitForTimeout(300);
    
    // Level should still be 1
    await expect(page.locator('#levelSpan')).toHaveText('1');
    
    // Long rest
    await page.locator('#btnLongRest').click();
    
    // Level should now be 2
    await page.locator('button[data-tab="stats"]').click();
    await expect(page.locator('#levelSpan')).toHaveText('2');
    
    // Verify derived values updated for level 2
    await expect(page.locator('#profSpan2')).toHaveText('+2');
    await expect(page.locator('#kiMaxSpan')).toHaveText('2');
    await expect(page.locator('#kiCurrentSpan')).toHaveText('2');
    await expect(page.locator('#maDieSpan')).toHaveText('d4');
    await expect(page.locator('#umBonusSpan')).toHaveText('10');
    await expect(page.locator('#hdMaxSpan')).toHaveText('2');
  });

  test('Long Rest should handle multiple level ups correctly', async ({ page }) => {
    // Start at level 1
    await page.locator('button[data-tab="stats"]').click();
    await expect(page.locator('#levelSpan')).toHaveText('1');
    
    // Set XP to 6500 (enough for level 5)
    await page.locator('#xpInput').fill('6500');
    await page.locator('#xpInput').blur();
    await page.waitForTimeout(300);
    
    // Level should still be 1
    await expect(page.locator('#levelSpan')).toHaveText('1');
    
    // Long rest
    await page.locator('#btnLongRest').click();
    
    // Level should now be 5
    await page.locator('button[data-tab="stats"]').click();
    await expect(page.locator('#levelSpan')).toHaveText('5');
    
    // Verify derived values for level 5
    await expect(page.locator('#profSpan2')).toHaveText('+3');
    await expect(page.locator('#kiMaxSpan')).toHaveText('5');
    await expect(page.locator('#kiCurrentSpan')).toHaveText('5');
    await expect(page.locator('#maDieSpan')).toHaveText('d6');
    await expect(page.locator('#umBonusSpan')).toHaveText('10');
    await expect(page.locator('#hdMaxSpan')).toHaveText('5');
  });

});
