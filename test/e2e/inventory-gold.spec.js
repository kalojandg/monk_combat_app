import { test, expect } from '@playwright/test';

/**
 * INVENTORY GOLD TESTS
 * 
 * Тестват функционалността за управление на валута (platinum, gold, silver, copper)
 * в Inventory таба - gain/spend бутони, спанове, инпути.
 */

test.describe('Inventory - Gold Management', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    
    // Open Inventory tab
    await page.locator('button[data-tab="inventory"]').click();
    await page.waitForTimeout(300);
  });

  test('Gold display elements are visible', async ({ page }) => {
    // Check that all gold spans are visible
    await expect(page.locator('#goldPlatinumSpan')).toBeVisible();
    await expect(page.locator('#goldGoldSpan')).toBeVisible();
    await expect(page.locator('#goldSilverSpan')).toBeVisible();
    await expect(page.locator('#goldCopperSpan')).toBeVisible();
    
    // Check that all input fields are visible
    await expect(page.locator('#goldPlatinumInput')).toBeVisible();
    await expect(page.locator('#goldGoldInput')).toBeVisible();
    await expect(page.locator('#goldSilverInput')).toBeVisible();
    await expect(page.locator('#goldCopperInput')).toBeVisible();
    
    // Check that buttons are visible
    await expect(page.locator('#goldGainBtn')).toBeVisible();
    await expect(page.locator('#goldSpendBtn')).toBeVisible();
  });

  test('Default gold values are zero', async ({ page }) => {
    await expect(page.locator('#goldPlatinumSpan')).toHaveText('0');
    await expect(page.locator('#goldGoldSpan')).toHaveText('0');
    await expect(page.locator('#goldSilverSpan')).toHaveText('0');
    await expect(page.locator('#goldCopperSpan')).toHaveText('0');
  });

  test('Gain gold - single currency', async ({ page }) => {
    // Gain 10 gold
    await page.locator('#goldGoldInput').fill('10');
    await page.locator('#goldGainBtn').click();
    
    await expect(page.locator('#goldGoldSpan')).toHaveText('10');
    await expect(page.locator('#goldPlatinumSpan')).toHaveText('0');
    await expect(page.locator('#goldSilverSpan')).toHaveText('0');
    await expect(page.locator('#goldCopperSpan')).toHaveText('0');
    
    // Input should be cleared after gain
    await expect(page.locator('#goldGoldInput')).toHaveValue('');
  });

  test('Gain gold - multiple currencies at once', async ({ page }) => {
    // Gain 23 gold, 131 silver, 30 copper
    await page.locator('#goldGoldInput').fill('23');
    await page.locator('#goldSilverInput').fill('131');
    await page.locator('#goldCopperInput').fill('30');
    await page.locator('#goldGainBtn').click();
    
    await expect(page.locator('#goldGoldSpan')).toHaveText('23');
    await expect(page.locator('#goldSilverSpan')).toHaveText('131');
    await expect(page.locator('#goldCopperSpan')).toHaveText('30');
    await expect(page.locator('#goldPlatinumSpan')).toHaveText('0');
    
    // All inputs should be cleared
    await expect(page.locator('#goldGoldInput')).toHaveValue('');
    await expect(page.locator('#goldSilverInput')).toHaveValue('');
    await expect(page.locator('#goldCopperInput')).toHaveValue('');
  });

  test('Gain gold - all currencies', async ({ page }) => {
    await page.locator('#goldPlatinumInput').fill('5');
    await page.locator('#goldGoldInput').fill('100');
    await page.locator('#goldSilverInput').fill('50');
    await page.locator('#goldCopperInput').fill('25');
    await page.locator('#goldGainBtn').click();
    
    await expect(page.locator('#goldPlatinumSpan')).toHaveText('5');
    await expect(page.locator('#goldGoldSpan')).toHaveText('100');
    await expect(page.locator('#goldSilverSpan')).toHaveText('50');
    await expect(page.locator('#goldCopperSpan')).toHaveText('25');
  });

  test('Gain gold - accumulates values', async ({ page }) => {
    // First gain
    await page.locator('#goldGoldInput').fill('10');
    await page.locator('#goldGainBtn').click();
    await expect(page.locator('#goldGoldSpan')).toHaveText('10');
    
    // Second gain
    await page.locator('#goldGoldInput').fill('5');
    await page.locator('#goldGainBtn').click();
    await expect(page.locator('#goldGoldSpan')).toHaveText('15');
    
    // Third gain with silver
    await page.locator('#goldSilverInput').fill('20');
    await page.locator('#goldGainBtn').click();
    await expect(page.locator('#goldSilverSpan')).toHaveText('20');
    await expect(page.locator('#goldGoldSpan')).toHaveText('15'); // Unchanged
  });

  test('Spend gold - single currency', async ({ page }) => {
    // First gain some gold
    await page.locator('#goldGoldInput').fill('50');
    await page.locator('#goldGainBtn').click();
    await expect(page.locator('#goldGoldSpan')).toHaveText('50');
    
    // Spend 20 gold
    await page.locator('#goldGoldInput').fill('20');
    await page.locator('#goldSpendBtn').click();
    await expect(page.locator('#goldGoldSpan')).toHaveText('30');
    
    // Input should be cleared
    await expect(page.locator('#goldGoldInput')).toHaveValue('');
  });

  test('Spend gold - multiple currencies at once', async ({ page }) => {
    // Gain some gold first
    await page.locator('#goldGoldInput').fill('100');
    await page.locator('#goldSilverInput').fill('200');
    await page.locator('#goldCopperInput').fill('150');
    await page.locator('#goldGainBtn').click();
    
    await expect(page.locator('#goldGoldSpan')).toHaveText('100');
    await expect(page.locator('#goldSilverSpan')).toHaveText('200');
    await expect(page.locator('#goldCopperSpan')).toHaveText('150');
    
    // Spend some
    await page.locator('#goldGoldInput').fill('30');
    await page.locator('#goldSilverInput').fill('50');
    await page.locator('#goldCopperInput').fill('25');
    await page.locator('#goldSpendBtn').click();
    
    await expect(page.locator('#goldGoldSpan')).toHaveText('70');
    await expect(page.locator('#goldSilverSpan')).toHaveText('150');
    await expect(page.locator('#goldCopperSpan')).toHaveText('125');
  });

  test('Spend gold - cannot go below zero', async ({ page }) => {
    // Gain 10 gold
    await page.locator('#goldGoldInput').fill('10');
    await page.locator('#goldGainBtn').click();
    await expect(page.locator('#goldGoldSpan')).toHaveText('10');
    
    // Try to spend 15 (more than available)
    await page.locator('#goldGoldInput').fill('15');
    await page.locator('#goldSpendBtn').click();
    
    // Should stay at 0, not go negative
    await expect(page.locator('#goldGoldSpan')).toHaveText('0');
  });

  test('Gain gold - handles negative input as zero', async ({ page }) => {
    await page.locator('#goldGoldInput').fill('-5');
    await page.locator('#goldGainBtn').click();
    
    // Should not change (or treat as 0)
    await expect(page.locator('#goldGoldSpan')).toHaveText('0');
  });

  test('Gain gold - handles empty input as zero', async ({ page }) => {
    // Leave inputs empty
    await page.locator('#goldGainBtn').click();
    
    // Should remain at 0
    await expect(page.locator('#goldPlatinumSpan')).toHaveText('0');
    await expect(page.locator('#goldGoldSpan')).toHaveText('0');
    await expect(page.locator('#goldSilverSpan')).toHaveText('0');
    await expect(page.locator('#goldCopperSpan')).toHaveText('0');
  });

  test('Gold values persist across page reload', async ({ page }) => {
    // Gain some gold
    await page.locator('#goldPlatinumInput').fill('2');
    await page.locator('#goldGoldInput').fill('50');
    await page.locator('#goldSilverInput').fill('100');
    await page.locator('#goldCopperInput').fill('25');
    await page.locator('#goldGainBtn').click();
    
    // Verify
    await expect(page.locator('#goldPlatinumSpan')).toHaveText('2');
    await expect(page.locator('#goldGoldSpan')).toHaveText('50');
    await expect(page.locator('#goldSilverSpan')).toHaveText('100');
    await expect(page.locator('#goldCopperSpan')).toHaveText('25');
    
    // Reload page
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="inventory"]').click();
    await page.waitForTimeout(300);
    
    // Values should persist
    await expect(page.locator('#goldPlatinumSpan')).toHaveText('2');
    await expect(page.locator('#goldGoldSpan')).toHaveText('50');
    await expect(page.locator('#goldSilverSpan')).toHaveText('100');
    await expect(page.locator('#goldCopperSpan')).toHaveText('25');
  });

  test('Gold values are included in export/import', async ({ page }) => {
    // Gain some gold
    await page.locator('#goldGoldInput').fill('100');
    await page.locator('#goldSilverInput').fill('50');
    await page.locator('#goldGainBtn').click();
    await page.waitForTimeout(200); // Wait for save to complete
    
    // Get bundle directly (without file download)
    const bundle = await page.evaluate(() => {
      if (typeof window.buildBundle === 'function') {
        return window.buildBundle();
      }
      return null;
    });
    
    // Verify gold fields are in bundle
    expect(bundle).toBeTruthy();
    expect(bundle.state).toBeTruthy();
    expect(bundle.state.goldGold).toBe(100);
    expect(bundle.state.goldSilver).toBe(50);
    expect(bundle.state.goldPlatinum).toBe(0);
    expect(bundle.state.goldCopper).toBe(0);
    
    // Clear and import bundle
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    
    // Import bundle
    await page.evaluate(b => {
      if (typeof window.applyBundle === 'function') {
        window.applyBundle(b);
      }
    }, bundle);
    await page.waitForTimeout(500);
    
    // Open inventory and verify
    await page.locator('button[data-tab="inventory"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#goldGoldSpan')).toHaveText('100');
    await expect(page.locator('#goldSilverSpan')).toHaveText('50');
  });

});
