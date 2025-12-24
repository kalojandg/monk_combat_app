import { test, expect } from '@playwright/test';

/**
 * ATTACK BONUSES TESTS
 * 
 * Melee Attack = DEX mod + Proficiency + Melee Magic Item Bonus
 * Ranged Attack = DEX mod + Proficiency + Ranged Magic Item Bonus
 */

test.describe('Attack Bonuses - Calculations', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Wait for tabs to load
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  test('Melee Attack = DEX mod + Prof + Magic bonus', async ({ page }) => {
    // Default: DEX 10 (mod +0), Prof +2, Magic +0 → Total +2
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+2');
    
    // Open Stats tab and Stats sub-tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    
    // Increase DEX to 14 (mod +2)
    await page.locator('#subtab-stats #dexInput').fill('14');
    await page.locator('#subtab-stats #dexInput').blur();
    await page.waitForTimeout(200);
    
    // Melee Atk should be +4 (DEX +2, Prof +2, Magic +0)
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+4');
  });

  test('Ranged Attack = DEX mod + Prof + Magic bonus', async ({ page }) => {
    // Default: DEX 10 (mod +0), Prof +2, Magic +0 → Total +2
    await expect(page.locator('#rangedAtkSpan')).toHaveText('+2');
    
    // Open Stats tab and Stats sub-tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    
    // Increase DEX to 16 (mod +3)
    await page.locator('#subtab-stats #dexInput').fill('16');
    await page.locator('#subtab-stats #dexInput').blur();
    await page.waitForTimeout(200);
    
    // Ranged Atk should be +5 (DEX +3, Prof +2, Magic +0)
    await expect(page.locator('#rangedAtkSpan')).toHaveText('+5');
  });

  test('Magic item bonus increases Melee Attack', async ({ page }) => {
    // Open Stats tab and Basic Info sub-tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    
    // Add +2 magic item bonus to melee
    await page.locator('#subtab-basicinfo #meleeMagicInput').fill('2');
    await page.locator('#subtab-basicinfo #meleeMagicInput').blur();
    await page.waitForTimeout(200);
    
    // Melee Atk should be +4 (DEX +0, Prof +2, Magic +2)
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+4');
    
    // Ranged should remain +2
    await expect(page.locator('#rangedAtkSpan')).toHaveText('+2');
  });

  test('Magic item bonus increases Ranged Attack', async ({ page }) => {
    // Open Stats tab and Basic Info sub-tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    
    // Add +1 magic item bonus to ranged
    await page.locator('#subtab-basicinfo #rangedMagicInput').fill('1');
    await page.locator('#subtab-basicinfo #rangedMagicInput').blur();
    await page.waitForTimeout(200);
    
    // Ranged Atk should be +3 (DEX +0, Prof +2, Magic +1)
    await expect(page.locator('#rangedAtkSpan')).toHaveText('+3');
    
    // Melee should remain +2
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+2');
  });

  test('Attack bonuses update on level up (proficiency increase)', async ({ page }) => {
    // Level 1: Prof +2 → Melee/Ranged +2
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+2');
    await expect(page.locator('#rangedAtkSpan')).toHaveText('+2');
    
    // Open Stats tab and Basic Info sub-tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    
    // Set XP to 6500 (enough for level 5)
    await page.locator('#subtab-basicinfo #xpInput').fill('6500');
    await page.locator('#subtab-basicinfo #xpInput').blur();
    await page.waitForTimeout(300);
    
    // Level should still be 1 (level up happens on Long Rest)
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('1');
    
    // Long rest to trigger level up
    await page.locator('#btnLongRest').click();
    
    // Verify level and prof after long rest
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('5');
    await expect(page.locator('#subtab-basicinfo #profSpan2')).toHaveText('+3');
    
    // Attack bonuses should increase
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+3');
    await expect(page.locator('#rangedAtkSpan')).toHaveText('+3');
  });

  test('CASCADE: DEX change updates both attack bonuses', async ({ page }) => {
    // Open Stats tab and Stats sub-tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    
    // Set DEX to 18 (mod +4)
    await page.locator('#subtab-stats #dexInput').fill('18');
    await page.locator('#subtab-stats #dexInput').blur();
    await page.waitForTimeout(200);
    
    // Both attacks should update (DEX +4, Prof +2)
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+6');
    await expect(page.locator('#rangedAtkSpan')).toHaveText('+6');
  });

  test('Negative magic bonus decreases attack', async ({ page }) => {
    // Open Stats tab and Basic Info sub-tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    
    // Add cursed item (-2 to melee)
    await page.locator('#subtab-basicinfo #meleeMagicInput').fill('-2');
    await page.locator('#subtab-basicinfo #meleeMagicInput').blur();
    await page.waitForTimeout(200);
    
    // Melee Atk should be +0 (DEX +0, Prof +2, Magic -2)
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+0');
  });

  test('Attack bonuses persist after reload', async ({ page }) => {
    // Open Stats tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    
    // Open Stats sub-tab for DEX
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    // Set DEX 14
    await page.locator('#subtab-stats #dexInput').fill('14');
    await page.locator('#subtab-stats #dexInput').blur();
    
    // Open Basic Info sub-tab for Magic
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-basicinfo #meleeMagicInput').fill('1');
    await page.locator('#subtab-basicinfo #meleeMagicInput').blur();
    await page.waitForTimeout(200);
    
    // Melee should be +5 (DEX +2, Prof +2, Magic +1)
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+5');
    
    // Reload
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    
    // Attack bonus persists
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+5');
  });

});
