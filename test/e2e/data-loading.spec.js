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
  // One-Liners are now served from the consolidated Flavor tab, but the data
  // still comes from one-liners.json — these checks verify it loads through Flavor.
  const output = (page) => page.locator('#flavorOutput');
  const flavorBtn = (page, id) => page.locator(`#tab-flavor [data-flavor="${id}"]`);

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });

    // Open Flavor tab (hosts the former One-Liners generators)
    await page.locator('button[data-tab="flavor"]').click();
    await page.waitForTimeout(300);
  });

  test('one-liners.json loads - Critical Miss', async ({ page }) => {
    await flavorBtn(page, 'crit-miss').click();
    await page.waitForTimeout(500);

    const result = await output(page).inputValue();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain('undefined');
  });

  test('one-liners.json loads - Miss Attack', async ({ page }) => {
    await flavorBtn(page, 'miss-attack').click();
    await page.waitForTimeout(500);

    const result = await output(page).inputValue();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  test('one-liners.json loads - Critical Attack', async ({ page }) => {
    await flavorBtn(page, 'crit-attack').click();
    await page.waitForTimeout(500);

    const result = await output(page).inputValue();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  test('one-liners.json loads - Suffer Critical', async ({ page }) => {
    await flavorBtn(page, 'suffer-crit').click();
    await page.waitForTimeout(500);

    const result = await output(page).inputValue();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  test('one-liners.json loads - Combat Tease', async ({ page }) => {
    await flavorBtn(page, 'combat-tease').click();
    await page.waitForTimeout(500);

    const result = await output(page).inputValue();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  test('one-liners.json loads - Magic', async ({ page }) => {
    await flavorBtn(page, 'magic').click();
    await page.waitForTimeout(500);

    const result = await output(page).inputValue();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  test('one-liners.json loads - Q&A', async ({ page }) => {
    await flavorBtn(page, 'qa').click();
    await page.waitForTimeout(500);

    const result = await output(page).inputValue();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  test('one-liners.json loads - Social', async ({ page }) => {
    await flavorBtn(page, 'social').click();
    await page.waitForTimeout(500);

    const result = await output(page).inputValue();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  test('one-liners.json loads - Coctail Magic', async ({ page }) => {
    await flavorBtn(page, 'magic-cocktails').click();
    await page.waitForTimeout(500);

    const result = await output(page).inputValue();
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
    // Set XP to 6500 (enough for level 5) - open Stats tab and Basic Info sub-tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await page.evaluate(xp => { window.st.xp = xp; window.save(); }, 6500);
    await page.waitForTimeout(200);
    await page.waitForTimeout(300);
    
    // Level should still be 1 (level up happens on Long Rest)
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('1');
    
    // Long rest to trigger level up (multiclass modal: pick Monk for each of the
    // 4 gained levels so monkLevel reaches 5 and the Monk L5 "Extra Attack" appears)
    await page.locator('#btnLongRest').click();
    for (let i = 0; i < 4; i++) {
      await page.waitForSelector('#levelUpModal:not(.hidden)', { timeout: 4000 });
      await page.locator('#cardMonk').click();
      await page.waitForTimeout(200);
    }

    // Verify level is now 5
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('5');
    
    // Open Skills tab
    await page.locator('button[data-tab="skills"]').click();
    
    // Wait for features to render
    await page.waitForTimeout(500);
    
    // Should display features for Level 5 (scope to the accordion — the hidden
    // level-up modal also contains the "Extra Attack" feature label)
    await expect(
      page.locator('#featuresAccordion details.feat summary', { hasText: 'Extra Attack' })
    ).toBeVisible();
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
    // One-Liners now generate from the Flavor tab.
    await page.locator('button[data-tab="flavor"]').click();
    await page.waitForTimeout(300);

    const results = new Set();

    // Generate Critical Miss several times
    for (let i = 0; i < 6; i++) {
      await page.locator('#tab-flavor [data-flavor="crit-miss"]').click();
      await page.waitForTimeout(100);
      const text = await page.locator('#flavorOutput').inputValue();
      results.add(text);
    }

    // Should have some variety
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
    
    // Can still navigate tabs - open Stats tab and Basic Info sub-tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #xpDisplay')).toBeVisible();
  });

});
