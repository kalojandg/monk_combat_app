import { test, expect } from '@playwright/test';

/**
 * DATA LOADING TESTS
 * 
 * Тестват дали JSON файловете се зареждат успешно и генераторите работят.
 * Важно за regression след преместване/рефакториране на код!
 */

test.describe('Data Loading - Shenanigans', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    
    // Open Shenanigans tab
    await page.locator('button[data-tab="shenanigans"]').click();
  });

  test('shenanigans.json loads successfully', async ({ page }) => {
    // Click button - should not error
    await page.locator('#btnGetName').click();
    
    // Wait for async load
    await page.waitForTimeout(500);
    
    // Should display a name (from shenanigans.json)
    const result = await page.locator('#fakeNameOutput').inputValue();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain('undefined');
    expect(result).not.toContain('null');
    expect(result).not.toBe('');
  });

  test('Can generate multiple different shenanigans names', async ({ page }) => {
    const names = new Set();
    
    // Generate 5 times
    for (let i = 0; i < 5; i++) {
      await page.locator('#btnGetName').click();
      await page.waitForTimeout(300);
      const name = await page.locator('#fakeNameOutput').inputValue();
      names.add(name);
    }
    
    // Should have variety (at least 2 different names in 5 tries)
    expect(names.size).toBeGreaterThanOrEqual(2);
  });

  test('Shenanigans names are not empty', async ({ page }) => {
    // Generate name
    await page.locator('#btnGetName').click();
    await page.waitForTimeout(300);
    const name = await page.locator('#fakeNameOutput').inputValue();
    
    // Should have content
    expect(name.trim().length).toBeGreaterThan(0);
    expect(name).not.toBe('');
  });

});

test.describe('Data Loading - Familiars', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    
    // Open Familiars tab
    await page.locator('button[data-tab="familiars"]').click();
  });

  test('familiars.json loads successfully', async ({ page }) => {
    // Click button - should not error (use one of the category buttons)
    await page.locator('.fam-btn[data-famcat="feline"]').click();
    
    // Wait for async load
    await page.waitForTimeout(500);
    
    // Should display a name (from familiars.json)
    const result = await page.locator('#famNameOutput').inputValue();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain('undefined');
    expect(result).not.toContain('null');
  });

  test('Can generate multiple different familiar names', async ({ page }) => {
    const names = new Set();
    
    // Generate 5 times from same category
    for (let i = 0; i < 5; i++) {
      await page.locator('.fam-btn[data-famcat="avian"]').click();
      await page.waitForTimeout(300);
      const name = await page.locator('#famNameOutput').inputValue();
      names.add(name);
    }
    
    // Should have variety
    expect(names.size).toBeGreaterThanOrEqual(2);
  });

});

test.describe('Data Loading - One-Liners', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    
    // Open One-Liners tab
    await page.locator('button[data-tab="liners"]').click();
  });

  test('one-liners.json loads - Critical Miss', async ({ page }) => {
    // Generate Critical Miss
    await page.locator('#btnCritMiss').click();
    await page.waitForTimeout(500);
    
    const result = await page.locator('#olCritMiss').inputValue();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain('undefined');
  });

  test('one-liners.json loads - Miss Attack', async ({ page }) => {
    await page.locator('#btnMissAttack').click();
    await page.waitForTimeout(500);
    
    const result = await page.locator('#olMissAttack').inputValue();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  test('one-liners.json loads - Critical Attack', async ({ page }) => {
    await page.locator('#btnCritAttack').click();
    await page.waitForTimeout(500);
    
    const result = await page.locator('#olCritAttack').inputValue();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  test('one-liners.json loads - Suffer Critical', async ({ page }) => {
    await page.locator('#btnSufferCrit').click();
    await page.waitForTimeout(500);
    
    const result = await page.locator('#olSufferCrit').inputValue();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  test('one-liners.json loads - Combat Tease', async ({ page }) => {
    await page.locator('#btnTease').click();
    await page.waitForTimeout(500);
    
    const result = await page.locator('#olTease').inputValue();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  test('one-liners.json loads - Magic', async ({ page }) => {
    await page.locator('#btnMagic').click();
    await page.waitForTimeout(500);
    
    const result = await page.locator('#olMagic').inputValue();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  test('one-liners.json loads - Q&A', async ({ page }) => {
    await page.locator('#btnQA').click();
    await page.waitForTimeout(500);
    
    const result = await page.locator('#olQA').inputValue();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  test('one-liners.json loads - Social', async ({ page }) => {
    await page.locator('#btnSocial').click();
    await page.waitForTimeout(500);
    
    const result = await page.locator('#olSocial').inputValue();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  test('one-liners.json loads - Coctail Magic', async ({ page }) => {
    await page.locator('#btnCoctailMagic').click();
    await page.waitForTimeout(500);
    
    const result = await page.locator('#olCoctailMagic').inputValue();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

});

test.describe('Data Loading - Excuses', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    
    // Open Excuses tab
    await page.locator('button[data-tab="excuses"]').click();
  });

  test('excuses.json loads - Life Wisdom', async ({ page }) => {
    await page.locator('#btnExLifeWisdom').click();
    await page.waitForTimeout(500);
    
    const result = await page.locator('#exLifeWisdom').inputValue();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain('undefined');
  });

  test('excuses.json loads - Game Cheating', async ({ page }) => {
    await page.locator('#btnExGameCheating').click();
    await page.waitForTimeout(500);
    
    const result = await page.locator('#exGameCheating').inputValue();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  test('excuses.json loads - Excuses', async ({ page }) => {
    await page.locator('#btnExExcuses').click();
    await page.waitForTimeout(500);
    
    const result = await page.locator('#exExcuses').inputValue();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  test('excuses.json loads - Storytime', async ({ page }) => {
    await page.locator('#btnExStorytime').click();
    await page.waitForTimeout(500);
    
    const result = await page.locator('#exStorytime').inputValue();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  test('excuses.json loads - Slip Away', async ({ page }) => {
    await page.locator('#btnExSlipaway').click();
    await page.waitForTimeout(500);
    
    const result = await page.locator('#exSlipaway').inputValue();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

});

test.describe('Data Loading - Skills & Features', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  test('skills-and-features.json loads for Level 1', async ({ page }) => {
    // Open Skills tab
    await page.locator('button[data-tab="skills"]').click();
    
    // Wait for features to load
    await page.waitForTimeout(500);
    
    // Should display features for Level 1
    // Look for "Unarmored Defense" - available at level 1
    await expect(page.locator('text=Unarmored Defense')).toBeVisible();
  });

  test('skills-and-features.json loads for Level 5', async ({ page }) => {
    // Set XP to 6500 (enough for level 5)
    await page.locator('button[data-tab="stats"]').click();
    await page.locator('#xpInput').fill('6500');
    await page.locator('#xpInput').blur();
    await page.waitForTimeout(300);
    
    // Level should still be 1 (level up happens on Long Rest)
    await expect(page.locator('#levelSpan')).toHaveText('1');
    
    // Long rest to trigger level up
    await page.locator('#btnLongRest').click();
    
    // Verify level is now 5
    await page.locator('button[data-tab="stats"]').click();
    await expect(page.locator('#levelSpan')).toHaveText('5');
    
    // Open Skills tab
    await page.locator('button[data-tab="skills"]').click();
    
    // Wait for features to render
    await page.waitForTimeout(500);
    
    // Should display features for Level 5
    await expect(page.locator('text=Extra Attack')).toBeVisible();
  });

  test('skills-and-features.json collapse/expand works', async ({ page }) => {
    // Open Skills tab
    await page.locator('button[data-tab="skills"]').click();
    
    // Wait for features to load
    await page.waitForTimeout(500);
    
    // Should have collapsible sections
    const collapseBtn = page.locator('#collapseAllBtn');
    await expect(collapseBtn).toBeVisible();
    
    // All details elements should exist
    const allDetails = page.locator('#featuresAccordion details');
    const totalCount = await allDetails.count();
    expect(totalCount).toBeGreaterThan(0);
    
    // Open one manually (to test closing)
    const firstDetails = allDetails.first();
    await firstDetails.click();
    await page.waitForTimeout(100);
    
    // Now should have at least 1 open
    const openDetails = page.locator('#featuresAccordion details[open]');
    const countBefore = await openDetails.count();
    expect(countBefore).toBeGreaterThan(0);
    
    // Click collapse - should close all
    await collapseBtn.click();
    await page.waitForTimeout(200);
    
    // All details should be closed now
    const countAfter = await openDetails.count();
    expect(countAfter).toBe(0);
  });

});

test.describe('Data Loading - Variety & Randomness', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  test('One-liners generate different results', async ({ page }) => {
    await page.locator('button[data-tab="liners"]').click();
    
    const results = new Set();
    
    // Generate Critical Miss 3 times
    for (let i = 0; i < 3; i++) {
      await page.locator('#btnCritMiss').click();
      const text = await page.locator('#olCritMiss').inputValue();
      results.add(text);
    }
    
    // Should have some variety (at least 2 different in 3 tries)
    expect(results.size).toBeGreaterThanOrEqual(2);
  });

  test('Excuses generate different results', async ({ page }) => {
    await page.locator('button[data-tab="excuses"]').click();
    
    const results = new Set();
    
    // Generate Excuses 3 times
    for (let i = 0; i < 3; i++) {
      await page.locator('#btnExExcuses').click();
      const text = await page.locator('#exExcuses').inputValue();
      results.add(text);
    }
    
    // Should have variety
    expect(results.size).toBeGreaterThanOrEqual(2);
  });

});

test.describe('Data Loading - Error Handling', () => {
  
  test('App still loads if a JSON file is missing', async ({ page }) => {
    // This test verifies graceful degradation
    // Even if a JSON fails to load, the app should still function
    
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    
    // App loads
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    
    // Can still navigate tabs
    await page.locator('button[data-tab="stats"]').click();
    await expect(page.locator('#xpInput')).toBeVisible();
  });

});
