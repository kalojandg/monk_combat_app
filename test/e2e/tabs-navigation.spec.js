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
    await expect(page.locator('#subtab-basicinfo #xpDisplay')).toBeVisible();
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

  test('Can click Flavor tab', async ({ page }) => {
    // Click Flavor tab
    await page.locator('button[data-tab="flavor"]').click();

    // Verify Flavor content is visible (consolidated One-Liners / Excuses / Insults)
    const tabContent = page.locator('#tab-flavor');
    await expect(tabContent).toBeVisible();
    await expect(page.locator('#flavorOutput')).toBeVisible();
    await expect(page.locator('#tab-flavor .flavor-btn').first()).toBeVisible();
  });

  test('Can switch between tabs', async ({ page }) => {
    // Start at Stats
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#subtab-basicinfo #xpDisplay')).toBeVisible();
    
    // Switch to Inventory
    await page.locator('button[data-tab="inventory"]').click();
    await expect(page.locator('#tab-inventory')).toBeVisible();
    
    // Switch back to Stats
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#subtab-basicinfo #xpDisplay')).toBeVisible();
  });

  test('All tabs are clickable', async ({ page }) => {
    // 1:1 with the real tab-nav in index.html (Quests is commented out).
    const tabs = [
      'stats',
      'pcchar',
      'resurrection',
      'inventory',
      'flavor',
      'namegen',
      'familiars',
      'skills',
      'sessionNotes',
      'npc-names'
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

  test('Flavor tab shows all one-liner categories', async ({ page }) => {
    // One-Liners live in the consolidated Flavor tab now.
    await page.locator('button[data-tab="flavor"]').click();
    await expect(page.locator('#tab-flavor')).toBeVisible();
    await expect(page.locator('#flavorOutput')).toBeVisible();
    const oneLinerIds = [
      'crit-miss',
      'miss-attack',
      'crit-attack',
      'suffer-crit',
      'combat-tease',
      'magic',
      'qa',
      'social',
      'magic-cocktails'
    ];
    for (const id of oneLinerIds) {
      await expect(page.locator(`#tab-flavor [data-flavor="${id}"]`)).toBeVisible();
    }
  });

  test('Flavor tab shows all excuses categories', async ({ page }) => {
    // Excuses live in the consolidated Flavor tab now.
    await page.locator('button[data-tab="flavor"]').click();
    await expect(page.locator('#tab-flavor')).toBeVisible();
    await expect(page.locator('#flavorOutput')).toBeVisible();
    const excusesIds = [
      'life-wisdom',
      'game-cheating',
      'excuses',
      'storytime',
      'slipaway'
    ];
    for (const id of excusesIds) {
      await expect(page.locator(`#tab-flavor [data-flavor="${id}"]`)).toBeVisible();
    }
  });

  test('Familiars tab shows fam groups and log', async ({ page }) => {
    await page.locator('button[data-tab="familiars"]').click();
    await expect(page.locator('#tab-familiars')).toBeVisible();
    await expect(page.locator('#famNameOutput')).toBeVisible();
    await expect(page.locator('#btnFamSave')).toBeVisible();
    // Scope to the familiars tab: the Name Gen tab reuses .fam-groups/.fam-btn.
    await expect(page.locator('#tab-familiars .fam-groups')).toBeVisible();
    await expect(page.locator('#tab-familiars .fam-btn').first()).toBeVisible();
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
    await page.evaluate(xp => { window.st.xp = xp; window.save(); }, 900);
    await page.waitForTimeout(200);
    await page.waitForTimeout(300);
    
    // Level should still be 1 (level up happens on Long Rest)
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('1');
    
    // Long rest to trigger level up to 3 (multiclass modal: pick a class per gained level)
    await page.locator('#btnLongRest').click();
    for (let i = 0; i < 2; i++) {
      await page.waitForSelector('#levelUpModal:not(.hidden)', { timeout: 4000 });
      await page.locator('#cardMonk').click();
      await page.waitForTimeout(200);
    }
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
    await expect(page.locator('#subtab-basicinfo #xpDisplay')).toHaveText('900');
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
    await expect(page.locator('#subtab-basicinfo #xpDisplay')).toBeVisible();
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
    await expect(page.locator('#subtab-basicinfo #xpDisplay')).toBeVisible();
    
    // Switch to stats
    await page.locator('button[data-subtab="stats"]').click();
    await expect(page.locator('#subtab-stats #strInput')).toBeVisible();
    
    // Switch to passive skills
    await page.locator('button[data-subtab="passiveskills"]').click();
    await expect(page.locator('#subtab-passiveskills #skillsBody')).toBeVisible();
    
    // Switch back to basic info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await expect(page.locator('#subtab-basicinfo #xpDisplay')).toBeVisible();
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
