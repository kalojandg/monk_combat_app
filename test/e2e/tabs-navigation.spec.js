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

  test('Skills tab shows features accordion root', async ({ page }) => {
    await page.locator('button[data-tab="skills"]').click();
    await expect(page.locator('#tab-skills')).toBeVisible();
    await expect(page.locator('#featuresAccordion')).toBeVisible();
  });

  test('Session Notes tab shows linking controls and textareas', async ({ page }) => {
    await page.locator('button[data-tab="sessionNotes"]').click();
    await expect(page.locator('#tab-sessionNotes')).toBeVisible();
    await expect(page.locator('#btnNotesLink')).toBeVisible();
    await expect(page.locator('#notesStatus')).toBeVisible();
    await expect(page.locator('#notesInput')).toBeVisible();
    await expect(page.locator('#importNotesFile')).toBeVisible();
    await expect(page.locator('#notesPreview')).toBeVisible();
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
