import { test, expect } from '@playwright/test';

/**
 * TABS NAVIGATION TESTS
 * 
 * Проверяват дали табовете работят.
 * КЛЮЧОВО: Ако тези тестове не минават, по-сложните тестове няма как да работят!
 */

test.describe('Tabs - Basic Navigation', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  test('Can click Stats tab', async ({ page }) => {
    // Click Stats tab
    await page.locator('button[data-tab="stats"]').click();
    
    // Verify Stats content is visible
    await expect(page.locator('#xpInput')).toBeVisible();
    await expect(page.locator('#strInput')).toBeVisible();
  });

  test('Can click PC Characteristics tab', async ({ page }) => {
    // Click PC Char tab
    await page.locator('button[data-tab="pcchar"]').click();
    
    // Verify PC Char content is visible (has languages, personality, etc)
    const tabContent = page.locator('#tab-pcchar');
    await expect(tabContent).toBeVisible();
  });

  test('Can click Inventory tab', async ({ page }) => {
    // Click Inventory tab
    await page.locator('button[data-tab="inventory"]').click();
    
    // Verify Inventory content is visible
    const tabContent = page.locator('#tab-inventory');
    await expect(tabContent).toBeVisible();
  });

  test('Can switch between tabs', async ({ page }) => {
    // Start at Stats
    await page.locator('button[data-tab="stats"]').click();
    await expect(page.locator('#xpInput')).toBeVisible();
    
    // Switch to Inventory
    await page.locator('button[data-tab="inventory"]').click();
    await expect(page.locator('#tab-inventory')).toBeVisible();
    
    // Switch back to Stats
    await page.locator('button[data-tab="stats"]').click();
    await expect(page.locator('#xpInput')).toBeVisible();
  });

  test('All tabs are clickable', async ({ page }) => {
    const tabs = [
      'stats',
      'pcchar',
      'inventory',
      'shenanigans',
      'liners',
      'excuses',
      'familiars',
      'skills'
    ];
    
    for (const tabName of tabs) {
      await page.locator(`button[data-tab="${tabName}"]`).click();
      // Just verify no crash, no need to check content
      await page.waitForTimeout(100);
    }
  });

});

test.describe('Tabs - Content Persistence', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  test('Changes in Stats tab persist when switching away and back', async ({ page }) => {
    // Open Stats and change XP
    await page.locator('button[data-tab="stats"]').click();
    await page.locator('#xpInput').fill('900');
    await page.locator('#xpInput').blur();
    
    // Verify level changed
    await expect(page.locator('#levelSpan')).toHaveText('3');
    
    // Switch to another tab
    await page.locator('button[data-tab="inventory"]').click();
    
    // Switch back to Stats
    await page.locator('button[data-tab="stats"]').click();
    
    // Verify XP still there
    const xpValue = await page.locator('#xpInput').inputValue();
    expect(xpValue).toBe('900');
    await expect(page.locator('#levelSpan')).toHaveText('3');
  });

});
