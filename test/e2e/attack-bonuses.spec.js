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
    
    // Open Stats tab
    await page.locator('button[data-tab="stats"]').click();
    
    // Increase DEX to 14 (mod +2)
    await page.locator('#dexInput').fill('14');
    await page.locator('#dexInput').blur();
    await page.waitForTimeout(200);
    
    // Melee Atk should be +4 (DEX +2, Prof +2, Magic +0)
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+4');
  });

  test('Ranged Attack = DEX mod + Prof + Magic bonus', async ({ page }) => {
    // Default: DEX 10 (mod +0), Prof +2, Magic +0 → Total +2
    await expect(page.locator('#rangedAtkSpan')).toHaveText('+2');
    
    // Open Stats tab
    await page.locator('button[data-tab="stats"]').click();
    
    // Increase DEX to 16 (mod +3)
    await page.locator('#dexInput').fill('16');
    await page.locator('#dexInput').blur();
    await page.waitForTimeout(200);
    
    // Ranged Atk should be +5 (DEX +3, Prof +2, Magic +0)
    await expect(page.locator('#rangedAtkSpan')).toHaveText('+5');
  });

  test('Magic item bonus increases Melee Attack', async ({ page }) => {
    // Open Stats tab
    await page.locator('button[data-tab="stats"]').click();
    
    // Add +2 magic item bonus to melee
    await page.locator('#meleeMagicInput').fill('2');
    await page.locator('#meleeMagicInput').blur();
    await page.waitForTimeout(200);
    
    // Melee Atk should be +4 (DEX +0, Prof +2, Magic +2)
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+4');
    
    // Ranged should remain +2
    await expect(page.locator('#rangedAtkSpan')).toHaveText('+2');
  });

  test('Magic item bonus increases Ranged Attack', async ({ page }) => {
    // Open Stats tab
    await page.locator('button[data-tab="stats"]').click();
    
    // Add +1 magic item bonus to ranged
    await page.locator('#rangedMagicInput').fill('1');
    await page.locator('#rangedMagicInput').blur();
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
    
    // Open Stats tab
    await page.locator('button[data-tab="stats"]').click();
    
    // Level up to 5 (Prof +3)
    await page.locator('#xpInput').fill('6500');
    await page.locator('#xpInput').blur();
    await page.waitForTimeout(300);
    
    // Verify level and prof
    await expect(page.locator('#levelSpan')).toHaveText('5');
    await expect(page.locator('#profSpan2')).toHaveText('+3');
    
    // Attack bonuses should increase
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+3');
    await expect(page.locator('#rangedAtkSpan')).toHaveText('+3');
  });

  test('CASCADE: DEX change updates both attack bonuses', async ({ page }) => {
    // Open Stats tab
    await page.locator('button[data-tab="stats"]').click();
    
    // Set DEX to 18 (mod +4)
    await page.locator('#dexInput').fill('18');
    await page.locator('#dexInput').blur();
    await page.waitForTimeout(200);
    
    // Both attacks should update (DEX +4, Prof +2)
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+6');
    await expect(page.locator('#rangedAtkSpan')).toHaveText('+6');
  });

  test('Negative magic bonus decreases attack', async ({ page }) => {
    // Open Stats tab
    await page.locator('button[data-tab="stats"]').click();
    
    // Add cursed item (-2 to melee)
    await page.locator('#meleeMagicInput').fill('-2');
    await page.locator('#meleeMagicInput').blur();
    await page.waitForTimeout(200);
    
    // Melee Atk should be +0 (DEX +0, Prof +2, Magic -2)
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+0');
  });

  test('Attack bonuses persist after reload', async ({ page }) => {
    // Open Stats tab
    await page.locator('button[data-tab="stats"]').click();
    
    // Set DEX 14, Magic +1
    await page.locator('#dexInput').fill('14');
    await page.locator('#dexInput').blur();
    await page.locator('#meleeMagicInput').fill('1');
    await page.locator('#meleeMagicInput').blur();
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
