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
    // Wait for tabs to load
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  test('Can click Stats tab', async ({ page }) => {
    // Click Stats tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    
    // Verify Stats tab loaded (Basic Info sub-tab by default)
    await expect(page.locator('#subtab-basicinfo #xpInput')).toBeVisible();
  });

  test('Can click PC Characteristics tab', async ({ page }) => {
    // Click PC Char tab
    await page.locator('button[data-tab="pcchar"]').click();
    
    // Verify PC Char content is visible (has languages, personality, etc)
    const tabContent = page.locator('#tab-pcchar');
    await expect(tabContent).toBeVisible();
    await expect(page.locator('#btnLangAdd')).toBeVisible();
    await expect(page.locator('#btnToolAdd')).toBeVisible();
    await expect(page.locator('#pcPersonality')).toBeVisible();
    await expect(page.locator('#pcBond')).toBeVisible();
    await expect(page.locator('#pcFlaw')).toBeVisible();
  });

  test('Can click Inventory tab', async ({ page }) => {
    // Click Inventory tab
    await page.locator('button[data-tab="inventory"]').click();
    
    // Verify Inventory content is visible
    const tabContent = page.locator('#tab-inventory');
    await expect(tabContent).toBeVisible();
    await expect(page.locator('#btnInvAdd')).toBeVisible();
    await expect(page.locator('#invModal')).toBeVisible({ visible: false });
  });

  test('Can switch between tabs', async ({ page }) => {
    // Start at Stats
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#subtab-basicinfo #xpInput')).toBeVisible();
    
    // Switch to Inventory
    await page.locator('button[data-tab="inventory"]').click();
    await expect(page.locator('#tab-inventory')).toBeVisible();
    
    // Switch back to Stats
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#subtab-basicinfo #xpInput')).toBeVisible();
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
      'skills',
      'sessionNotes'
    ];
    
    for (const tabName of tabs) {
      await page.locator(`button[data-tab="${tabName}"]`).click();
      // Just verify no crash, no need to check content
      await page.waitForTimeout(100);
    }
  });

});

test.describe('Tabs - Content Smoke Check', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Wait for tabs to load
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  test('Shenanigans tab shows alias generator controls', async ({ page }) => {
    await page.locator('button[data-tab="shenanigans"]').click();
    await expect(page.locator('#tab-shenanigans')).toBeVisible();
    await expect(page.locator('#fakeNameOutput')).toBeVisible();
    await expect(page.locator('#btnGetName')).toBeVisible();
    await expect(page.locator('#btnSaveAlias')).toBeVisible();
    await expect(page.locator('#aliasLog')).toBeVisible();
  });

  test('One-Liners tab shows all one-liner categories', async ({ page }) => {
    await page.locator('button[data-tab="liners"]').click();
    await expect(page.locator('#tab-liners')).toBeVisible();
    await expect(page.locator('#olCritMiss')).toBeVisible();
    await expect(page.locator('#olMissAttack')).toBeVisible();
    await expect(page.locator('#olCritAttack')).toBeVisible();
    await expect(page.locator('#olSufferCrit')).toBeVisible();
    await expect(page.locator('#olTease')).toBeVisible();
    await expect(page.locator('#olMagic')).toBeVisible();
    await expect(page.locator('#olQA')).toBeVisible();
    await expect(page.locator('#olSocial')).toBeVisible();
    await expect(page.locator('#olCoctailMagic')).toBeVisible();
  });

  test('Excuses tab shows all excuses categories', async ({ page }) => {
    await page.locator('button[data-tab="excuses"]').click();
    await expect(page.locator('#tab-excuses')).toBeVisible();
    await expect(page.locator('#exLifeWisdom')).toBeVisible();
    await expect(page.locator('#exGameCheating')).toBeVisible();
    await expect(page.locator('#exExcuses')).toBeVisible();
    await expect(page.locator('#exStorytime')).toBeVisible();
    await expect(page.locator('#exSlipaway')).toBeVisible();
  });

  test('Familiars tab shows fam groups and log', async ({ page }) => {
    await page.locator('button[data-tab="familiars"]').click();
    await expect(page.locator('#tab-familiars')).toBeVisible();
    await expect(page.locator('#famNameOutput')).toBeVisible();
    await expect(page.locator('#btnFamSave')).toBeVisible();
    await expect(page.locator('.fam-groups')).toBeVisible();
    await expect(page.locator('.fam-btn').first()).toBeVisible();
    await expect(page.locator('#famLog')).toBeVisible();
  });

  // Stats tab now hosts second-level navigation; see dedicated describe below.

  test('Session Notes tab shows linking controls and textareas', async ({ page }) => {
    await page.locator('button[data-tab="sessionNotes"]').click();
    await expect(page.locator('#tab-sessionNotes')).toBeVisible();
    // Only notesInput is currently visible (other elements are commented out)
    await expect(page.locator('#notesInput')).toBeVisible();
  });

});

test.describe('Tabs - Content Persistence', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Wait for tabs to load
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  test('Changes in Stats tab persist when switching away and back', async ({ page }) => {
    // Open Stats and change XP - open Basic Info sub-tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-basicinfo #xpInput').fill('900');
    await page.locator('#subtab-basicinfo #xpInput').blur();
    await page.waitForTimeout(300);
    
    // Level should still be 1 (level up happens on Long Rest)
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('1');
    
    // Long rest to trigger level up to 3
    await page.locator('#btnLongRest').click();
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('3');
    
    // Switch to another tab
    await page.locator('button[data-tab="inventory"]').click();
    
    // Switch back to Stats
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    
    // Verify XP still there and level persisted
    const xpValue = await page.locator('#subtab-basicinfo #xpInput').inputValue();
    expect(xpValue).toBe('900');
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('3');
  });

});

test.describe('Stats Tab - Second Level Navigation', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Wait for tabs to load
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    // Open Stats tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
  });

  test('Stats tab shows three sub-tabs: basic info, stats, passive skills', async ({ page }) => {
    await expect(page.locator('button[data-subtab="basicinfo"]')).toBeVisible();
    await expect(page.locator('button[data-subtab="stats"]')).toBeVisible();
    await expect(page.locator('button[data-subtab="passiveskills"]')).toBeVisible();
  });

  test('Can click basic info sub-tab and see basic statistics', async ({ page }) => {
    await page.locator('button[data-subtab="basicinfo"]').click();
    await expect(page.locator('#subtab-basicinfo #xpInput')).toBeVisible();
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toBeVisible();
    await expect(page.locator('#subtab-basicinfo #profSpan2')).toBeVisible();
    await expect(page.locator('#subtab-basicinfo #maDieSpan')).toBeVisible();
    await expect(page.locator('#subtab-basicinfo #maxHpSpan')).toBeVisible();
  });

  test('Can click stats sub-tab and see ability scores, saves, proficiency toggles', async ({ page }) => {
    await page.locator('button[data-subtab="stats"]').click();
    await expect(page.locator('#subtab-stats #strInput')).toBeVisible();
    await expect(page.locator('#subtab-stats #dexInput')).toBeVisible();
    await expect(page.locator('#subtab-stats #conInput')).toBeVisible();
    await expect(page.locator('#subtab-stats #saveStrProf')).toBeVisible();
    await expect(page.locator('#subtab-stats #toughChk')).toBeVisible();
    await expect(page.locator('#subtab-stats #saveAllBonusInput')).toBeVisible();
  });

  test('Can click passive skills sub-tab and see skills table', async ({ page }) => {
    await page.locator('button[data-subtab="passiveskills"]').click();
    await expect(page.locator('#subtab-passiveskills #skillsBody')).toBeVisible();
    // Skills table should have rows
    const skillsRows = page.locator('#subtab-passiveskills #skillsBody tr');
    await expect(skillsRows.first()).toBeVisible();
  });

  test('Can switch between sub-tabs', async ({ page }) => {
    // Start at basic info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await expect(page.locator('#subtab-basicinfo #xpInput')).toBeVisible();
    
    // Switch to stats
    await page.locator('button[data-subtab="stats"]').click();
    await expect(page.locator('#subtab-stats #strInput')).toBeVisible();
    
    // Switch to passive skills
    await page.locator('button[data-subtab="passiveskills"]').click();
    await expect(page.locator('#subtab-passiveskills #skillsBody')).toBeVisible();
    
    // Switch back to basic info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await expect(page.locator('#subtab-basicinfo #xpInput')).toBeVisible();
  });

  test('Clicking first-level tab closes Stats tab and sub-tabs', async ({ page }) => {
    // Open Stats tab and a sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await expect(page.locator('#subtab-stats #strInput')).toBeVisible();
    
    // Click another first-level tab
    await page.locator('button[data-tab="inventory"]').click();
    
    // Stats tab and sub-tabs should be hidden
    await expect(page.locator('#tab-stats')).not.toBeVisible();
    await expect(page.locator('button[data-subtab="stats"]')).not.toBeVisible();
    
    // Inventory should be visible
    await expect(page.locator('#tab-inventory')).toBeVisible();
  });

});
