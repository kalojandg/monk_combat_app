import { test, expect } from '@playwright/test';

/**
 * DERIVED VALUES TESTS
 * 
 * Тестват ключови derived values и тяхната взаимовръзка.
 */

test.describe('Derived Values - Interconnected Changes', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    
    // Open Stats tab
    await page.locator('button[data-tab="stats"]').click();
  });

  test('CON change updates maxHP AND saves', async ({ page }) => {
    // Initial maxHP = 8 (CON 10, Level 1)
    await expect(page.locator('#maxHpSpan')).toHaveText('8');
    
    // Change CON to 16 (mod +3)
    await page.locator('#conInput').fill('16');
    await page.locator('#conInput').blur();
    
    // maxHP should update to 8 + 3 = 11? (depends on formula)
    const newMaxHP = await page.locator('#maxHpSpan').textContent();
    expect(parseInt(newMaxHP)).toBeGreaterThan(8);
    
    // Verify save modifier display
    await expect(page.locator('#conModSpan')).toHaveText('+3');
  });

  test('Level up changes: Prof, Ki, HD, MA die', async ({ page }) => {
    // Level 1 baseline
    await expect(page.locator('#profSpan2')).toHaveText('+2');
    await expect(page.locator('#maDieSpan')).toHaveText('d4');
    await expect(page.locator('#kiMaxSpan')).toHaveText('1');
    
    // Level to 5 (XP 6500)
    await page.locator('#xpInput').fill('6500');
    await page.locator('#xpInput').blur();
    
    // All should update
    await expect(page.locator('#levelSpan')).toHaveText('5');
    await expect(page.locator('#profSpan2')).toHaveText('+3');
    await expect(page.locator('#maDieSpan')).toHaveText('d6');
    await expect(page.locator('#kiMaxSpan')).toHaveText('5');
    await expect(page.locator('#hdMaxSpan')).toHaveText('5');
  });

  test('DEX+WIS change updates AC', async ({ page }) => {
    // Initial AC = 10 + 0 + 0 = 10
    await expect(page.locator('#acSpan2')).toHaveText('10');
    
    // Change DEX to 16 (mod +3)
    await page.locator('#dexInput').fill('16');
    await page.locator('#dexInput').blur();
    await expect(page.locator('#acSpan2')).toHaveText('13'); // 10 + 3
    
    // Change WIS to 14 (mod +2)
    await page.locator('#wisInput').fill('14');
    await page.locator('#wisInput').blur();
    await expect(page.locator('#acSpan2')).toHaveText('15'); // 10 + 3 + 2
  });

  test('Tough feat adds +2 HP per level', async ({ page }) => {
    const baseHP = await page.locator('#maxHpSpan').textContent();
    
    // Enable Tough
    await page.locator('#toughChk').check();
    
    const toughHP = await page.locator('#maxHpSpan').textContent();
    // Level 1: +2 HP
    expect(parseInt(toughHP)).toBe(parseInt(baseHP) + 2);
  });

  test('Homebrew HP adjustment', async ({ page }) => {
    const baseHP = await page.locator('#maxHpSpan').textContent();
    
    // Add +5 homebrew HP
    await page.locator('#homebrewHp').fill('5');
    await page.locator('#homebrewHp').blur();
    
    const modifiedHP = await page.locator('#maxHpSpan').textContent();
    expect(parseInt(modifiedHP)).toBe(parseInt(baseHP) + 5);
  });

});
