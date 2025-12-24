import { test, expect } from '@playwright/test';

/**
 * DERIVED VALUES TESTS
 * 
 * Тестват ключови derived values и тяхната взаимовръзка.
 */

// Helper: автоматично отваря правилния подтаб според елемента
async function ensureSubTab(page, elementId) {
  const basicInfoElements = ['xpInput', 'charName', 'notes', 'levelSpan', 'profSpan2', 'maDieSpan', 'maxHpSpan', 'homebrewHp', 'hdMaxSpan', 'hdAvailSpan', 'kiMaxSpan', 'acSpan2', 'acMagicInput', 'meleeMagicInput', 'rangedMagicInput', 'umBonusSpan', 'passPercSpan', 'passInvSpan', 'passInsSpan'];
  const statsElements = ['strInput', 'dexInput', 'conInput', 'intInput', 'wisInput', 'chaInput', 'saveAllBonusInput', 'saveStrProf', 'saveDexProf', 'saveConProf', 'saveIntProf', 'saveWisProf', 'saveChaProf', 'toughChk', 'strModSpan', 'dexModSpan', 'conModSpan', 'intModSpan', 'wisModSpan', 'chaModSpan', 'saveStrTotalSpan', 'saveDexTotalSpan', 'saveConTotalSpan', 'saveIntTotalSpan', 'saveWisTotalSpan', 'saveChaTotalSpan'];
  
  const id = elementId.replace('#', '');
  if (basicInfoElements.includes(id)) {
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
  } else if (statsElements.includes(id)) {
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
  }
}

test.describe('Derived Values - Interconnected Changes', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    
    // Open Stats tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
  });

  test('CON change updates maxHP AND saves', async ({ page }) => {
    // Open Basic Info sub-tab for maxHpSpan
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    // Initial maxHP = 8 (CON 10, Level 1)
    await expect(page.locator('#subtab-basicinfo #maxHpSpan')).toHaveText('8');
    
    // Open Stats sub-tab for CON input
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    // Change CON to 16 (mod +3)
    await page.locator('#subtab-stats #conInput').fill('16');
    await page.locator('#subtab-stats #conInput').blur();
    
    // maxHP should update to 8 + 3 = 11? (depends on formula)
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    const newMaxHP = await page.locator('#subtab-basicinfo #maxHpSpan').textContent();
    expect(parseInt(newMaxHP)).toBeGreaterThan(8);
    
    // Verify save modifier display
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-stats #conModSpan')).toHaveText('+3');
  });

  test('Level up changes: Prof, Ki, HD, MA die', async ({ page }) => {
    // Level 1 baseline - open Basic Info sub-tab
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #profSpan2')).toHaveText('+2');
    await expect(page.locator('#subtab-basicinfo #maDieSpan')).toHaveText('d4');
    await expect(page.locator('#subtab-basicinfo #kiMaxSpan')).toHaveText('1');
    
    // Set XP to 6500 (enough for level 5)
    await page.locator('#subtab-basicinfo #xpInput').fill('6500');
    await page.locator('#subtab-basicinfo #xpInput').blur();
    await page.waitForTimeout(300);
    
    // Level should still be 1 (level up happens on Long Rest)
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('1');
    
    // Long rest to trigger level up
    await page.locator('#btnLongRest').click();
    
    // All should update after long rest
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('5');
    await expect(page.locator('#subtab-basicinfo #profSpan2')).toHaveText('+3');
    await expect(page.locator('#subtab-basicinfo #maDieSpan')).toHaveText('d6');
    await expect(page.locator('#subtab-basicinfo #kiMaxSpan')).toHaveText('5');
    await expect(page.locator('#subtab-basicinfo #hdMaxSpan')).toHaveText('5');
  });

  test('DEX+WIS change updates AC', async ({ page }) => {
    // Initial AC = 10 + 0 + 0 = 10 - open Basic Info sub-tab
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #acSpan2')).toHaveText('10');
    
    // Change DEX to 16 (mod +3) - open Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #dexInput').fill('16');
    await page.locator('#subtab-stats #dexInput').blur();
    // Check AC in Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #acSpan2')).toHaveText('13'); // 10 + 3
    
    // Change WIS to 14 (mod +2) - back to Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #wisInput').fill('14');
    await page.locator('#subtab-stats #wisInput').blur();
    // Check AC in Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #acSpan2')).toHaveText('15'); // 10 + 3 + 2
  });

  test('Tough feat adds +2 HP per level', async ({ page }) => {
    // Open Basic Info sub-tab for maxHpSpan
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    const baseHP = await page.locator('#subtab-basicinfo #maxHpSpan').textContent();
    
    // Enable Tough - open Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #toughChk').check();
    
    // Check HP in Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    const toughHP = await page.locator('#subtab-basicinfo #maxHpSpan').textContent();
    // Level 1: +2 HP
    expect(parseInt(toughHP)).toBe(parseInt(baseHP) + 2);
  });

  test('Homebrew HP adjustment', async ({ page }) => {
    // Open Basic Info sub-tab
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    const baseHP = await page.locator('#subtab-basicinfo #maxHpSpan').textContent();
    
    // Add +5 homebrew HP
    await page.locator('#subtab-basicinfo #homebrewHp').fill('5');
    await page.locator('#subtab-basicinfo #homebrewHp').blur();
    
    const modifiedHP = await page.locator('#subtab-basicinfo #maxHpSpan').textContent();
    expect(parseInt(modifiedHP)).toBe(parseInt(baseHP) + 5);
  });

});

test.describe('Derived Values - Ability Modifiers', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    // Open Stats sub-tab by default (for ability inputs)
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
  });

  test('All 6 ability modifiers calculate correctly', async ({ page }) => {
    const testCases = [
      { input: '#subtab-stats #strInput', mod: '#subtab-stats #strModSpan', score: 16, expected: '+3' },
      { input: '#subtab-stats #dexInput', mod: '#subtab-stats #dexModSpan', score: 18, expected: '+4' },
      { input: '#subtab-stats #conInput', mod: '#subtab-stats #conModSpan', score: 14, expected: '+2' },
      { input: '#subtab-stats #intInput', mod: '#subtab-stats #intModSpan', score: 12, expected: '+1' },
      { input: '#subtab-stats #wisInput', mod: '#subtab-stats #wisModSpan', score: 8, expected: '-1' },
      { input: '#subtab-stats #chaInput', mod: '#subtab-stats #chaModSpan', score: 20, expected: '+5' }
    ];
    
    for (const { input, mod, score, expected } of testCases) {
      await page.locator(input).fill(score.toString());
      await page.locator(input).blur();
      await expect(page.locator(mod)).toHaveText(expected);
    }
  });

  test('Negative ability scores work', async ({ page }) => {
    // STR 6 → mod -2
    await page.locator('#subtab-stats #strInput').fill('6');
    await page.locator('#subtab-stats #strInput').blur();
    await expect(page.locator('#subtab-stats #strModSpan')).toHaveText('-2');
    
    // DEX 1 → mod -5
    await page.locator('#subtab-stats #dexInput').fill('1');
    await page.locator('#subtab-stats #dexInput').blur();
    await expect(page.locator('#subtab-stats #dexModSpan')).toHaveText('-5');
  });

  test('All negative modifiers: -1 to -5', async ({ page }) => {
    const negativeTests = [
      { score: 9, expected: '-1' },   // 9 → -1
      { score: 8, expected: '-1' },   // 8 → -1
      { score: 7, expected: '-2' },   // 7 → -2
      { score: 6, expected: '-2' },   // 6 → -2
      { score: 5, expected: '-3' },   // 5 → -3
      { score: 4, expected: '-3' },   // 4 → -3
      { score: 3, expected: '-4' },   // 3 → -4
      { score: 2, expected: '-4' },   // 2 → -4
      { score: 1, expected: '-5' },   // 1 → -5
    ];
    
    for (const { score, expected } of negativeTests) {
      await page.locator('#subtab-stats #strInput').fill(score.toString());
      await page.locator('#subtab-stats #strInput').blur();
      await page.waitForTimeout(100);
      await expect(page.locator('#subtab-stats #strModSpan')).toHaveText(expected);
    }
  });

  test('CASCADE: Negative modifier updates save in real-time', async ({ page }) => {
    // Start with STR 10 (mod +0)
    await page.locator('#subtab-stats #strInput').fill('10');
    await page.locator('#subtab-stats #strInput').blur();
    await page.waitForTimeout(100);
    await expect(page.locator('#subtab-stats #strModSpan')).toHaveText('+0');
    await expect(page.locator('#subtab-stats #saveStrTotalSpan')).toHaveText('+0');
    
    // Change to 8 (mod -1) - should update immediately
    await page.locator('#subtab-stats #strInput').fill('8');
    await page.locator('#subtab-stats #strInput').blur();
    await page.waitForTimeout(100);
    await expect(page.locator('#subtab-stats #strModSpan')).toHaveText('-1');
    await expect(page.locator('#subtab-stats #saveStrTotalSpan')).toHaveText('-1');
    
    // Change to 6 (mod -2)
    await page.locator('#subtab-stats #strInput').fill('6');
    await page.locator('#subtab-stats #strInput').blur();
    await page.waitForTimeout(100);
    await expect(page.locator('#subtab-stats #strModSpan')).toHaveText('-2');
    await expect(page.locator('#subtab-stats #saveStrTotalSpan')).toHaveText('-2');
    
    // Change to 3 (mod -4)
    await page.locator('#subtab-stats #strInput').fill('3');
    await page.locator('#subtab-stats #strInput').blur();
    await page.waitForTimeout(100);
    await expect(page.locator('#subtab-stats #strModSpan')).toHaveText('-4');
    await expect(page.locator('#subtab-stats #saveStrTotalSpan')).toHaveText('-4');
  });

  test('CASCADE: Negative modifier with proficiency', async ({ page }) => {
    // STR 8 (mod -1), enable proficiency
    await page.locator('#subtab-stats #strInput').fill('8');
    await page.locator('#subtab-stats #strInput').blur();
    await page.waitForTimeout(100);
    await expect(page.locator('#subtab-stats #strModSpan')).toHaveText('-1');
    await expect(page.locator('#subtab-stats #saveStrTotalSpan')).toHaveText('-1');
    
    // Enable proficiency: -1 + 2 = +1
    await page.locator('#subtab-stats #saveStrProf').check();
    await page.waitForTimeout(100);
    await expect(page.locator('#subtab-stats #saveStrTotalSpan')).toHaveText('+1');
    
    // Change to 6 (mod -2): -2 + 2 = +0
    await page.locator('#subtab-stats #strInput').fill('6');
    await page.locator('#subtab-stats #strInput').blur();
    await page.waitForTimeout(100);
    await expect(page.locator('#subtab-stats #strModSpan')).toHaveText('-2');
    await expect(page.locator('#subtab-stats #saveStrTotalSpan')).toHaveText('+0');
  });

  test('Odd vs Even ability scores', async ({ page }) => {
    // 10 and 11 both give +0
    await page.locator('#subtab-stats #strInput').fill('10');
    await page.locator('#subtab-stats #strInput').blur();
    await expect(page.locator('#subtab-stats #strModSpan')).toHaveText('+0');
    
    await page.locator('#subtab-stats #strInput').fill('11');
    await page.locator('#subtab-stats #strInput').blur();
    await expect(page.locator('#subtab-stats #strModSpan')).toHaveText('+0');
    
    // 12 gives +1
    await page.locator('#subtab-stats #strInput').fill('12');
    await page.locator('#subtab-stats #strInput').blur();
    await expect(page.locator('#subtab-stats #strModSpan')).toHaveText('+1');
  });

});

test.describe('Derived Values - Save Throws', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    // Open Stats sub-tab by default
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
  });

  test('Save = Modifier without proficiency', async ({ page }) => {
    // STR 16 (mod +3), no prof → save +3
    await page.locator('#subtab-stats #strInput').fill('16');
    await page.locator('#subtab-stats #strInput').blur();
    await expect(page.locator('#subtab-stats #saveStrTotalSpan')).toHaveText('+3');
  });

  test('Save = Modifier + Prof with proficiency', async ({ page }) => {
    // DEX 18 (mod +4), has prof (+2 at level 1) → save +6
    await page.locator('#subtab-stats #dexInput').fill('18');
    await page.locator('#subtab-stats #dexInput').blur();
    await expect(page.locator('#subtab-stats #saveDexTotalSpan')).toHaveText('+6');
    
    // WIS 14 (mod +2), has prof (+2) → save +4
    await page.locator('#subtab-stats #wisInput').fill('14');
    await page.locator('#subtab-stats #wisInput').blur();
    await expect(page.locator('#subtab-stats #saveWisTotalSpan')).toHaveText('+4');
  });

  test('Toggle proficiency adds/removes bonus', async ({ page }) => {
    // INT 16 (mod +3), no prof initially
    await page.locator('#subtab-stats #intInput').fill('16');
    await page.locator('#subtab-stats #intInput').blur();
    await expect(page.locator('#subtab-stats #saveIntTotalSpan')).toHaveText('+3');
    
    // Add proficiency
    await page.locator('#subtab-stats #saveIntProf').check();
    await expect(page.locator('#subtab-stats #saveIntTotalSpan')).toHaveText('+5'); // +3 mod +2 prof
    
    // Remove proficiency
    await page.locator('#subtab-stats #saveIntProf').uncheck();
    await expect(page.locator('#subtab-stats #saveIntTotalSpan')).toHaveText('+3');
  });

  test('Save scales with level (proficiency increase)', async ({ page }) => {
    // DEX 16 (mod +3), has prof
    await page.locator('#subtab-stats #dexInput').fill('16');
    await page.locator('#subtab-stats #dexInput').blur();
    
    // Level 1: Prof +2 → save +5
    await expect(page.locator('#subtab-stats #saveDexTotalSpan')).toHaveText('+5');
    
    // Set XP to 6500 (enough for level 5) - open Basic Info sub-tab
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-basicinfo #xpInput').fill('6500');
    await page.locator('#subtab-basicinfo #xpInput').blur();
    await page.waitForTimeout(300);
    
    // Level should still be 1 (level up happens on Long Rest)
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('1');
    
    // Long rest to trigger level up
    await page.locator('#btnLongRest').click();
    
    // Level 5: Prof +3 → save +6
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('5');
    // Check save in Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-stats #saveDexTotalSpan')).toHaveText('+6');
  });

});

test.describe('Derived Values - Attack Bonuses', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    // Open Stats sub-tab by default
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
  });

  test('Melee Attack = DEX + Prof', async ({ page }) => {
    // Default: DEX 10 (mod +0), Prof +2 → +2
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+2');
    
    // DEX 16 (mod +3) → +5
    await page.locator('#subtab-stats #dexInput').fill('16');
    await page.locator('#subtab-stats #dexInput').blur();
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+5');
  });

  test('Ranged Attack = DEX + Prof', async ({ page }) => {
    // DEX 18 (mod +4), Prof +2 → +6
    await page.locator('#subtab-stats #dexInput').fill('18');
    await page.locator('#subtab-stats #dexInput').blur();
    await expect(page.locator('#rangedAtkSpan')).toHaveText('+6');
  });

  test('Magic bonus adds to attack', async ({ page }) => {
    // DEX 14 (mod +2), Prof +2 = +4 base
    await page.locator('#subtab-stats #dexInput').fill('14');
    await page.locator('#subtab-stats #dexInput').blur();
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+4');
    
    // Add +2 magic bonus → +6 - open Basic Info sub-tab
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-basicinfo #meleeMagicInput').fill('2');
    await page.locator('#subtab-basicinfo #meleeMagicInput').blur();
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+6');
  });

  test('Melee and Ranged magic bonuses are independent', async ({ page }) => {
    await page.locator('#subtab-stats #dexInput').fill('16');
    await page.locator('#subtab-stats #dexInput').blur();
    
    // Base: +5
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+5');
    await expect(page.locator('#rangedAtkSpan')).toHaveText('+5');
    
    // +1 melee, +2 ranged - open Basic Info sub-tab
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-basicinfo #meleeMagicInput').fill('1');
    await page.locator('#subtab-basicinfo #meleeMagicInput').blur();
    await page.locator('#subtab-basicinfo #rangedMagicInput').fill('2');
    await page.locator('#subtab-basicinfo #rangedMagicInput').blur();
    
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+6');
    await expect(page.locator('#rangedAtkSpan')).toHaveText('+7');
  });

});

test.describe('Derived Values - AC & Speed', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
  });

  test('AC = 10 + DEX + WIS', async ({ page }) => {
    // Base: 10 + 0 + 0 = 10 - open Basic Info sub-tab
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #acSpan2')).toHaveText('10');
    
    // DEX 16 → +3 - open Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #dexInput').fill('16');
    await page.locator('#subtab-stats #dexInput').blur();
    // Check AC in Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #acSpan2')).toHaveText('13');
    
    // WIS 18 → +4, total 10 + 3 + 4 = 17 - back to Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #wisInput').fill('18');
    await page.locator('#subtab-stats #wisInput').blur();
    // Check AC in Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #acSpan2')).toHaveText('17');
  });

  test('AC magic bonus', async ({ page }) => {
    // Base AC = 10 - open Basic Info sub-tab
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #acSpan2')).toHaveText('10');
    
    // Add +2 AC magic
    await page.locator('#subtab-basicinfo #acMagicInput').fill('2');
    await page.locator('#subtab-basicinfo #acMagicInput').blur();
    await expect(page.locator('#subtab-basicinfo #acSpan2')).toHaveText('12');
  });

  test('Unarmored Movement increases with level', async ({ page }) => {
    // Level 1: UM = 0 - open Basic Info sub-tab
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #umBonusSpan')).toHaveText('0');
    
    // Set XP to 300 (enough for level 2)
    await page.locator('#subtab-basicinfo #xpInput').fill('300');
    await page.locator('#subtab-basicinfo #xpInput').blur();
    await page.waitForTimeout(300);
    
    // Level should still be 1 (level up happens on Long Rest)
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('1');
    
    // Long rest to trigger level up to 2
    await page.locator('#btnLongRest').click();
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('2');
    await expect(page.locator('#subtab-basicinfo #umBonusSpan')).toHaveText('10');
    
    // Set XP to 14000 (enough for level 6)
    await page.locator('#subtab-basicinfo #xpInput').fill('14000');
    await page.locator('#subtab-basicinfo #xpInput').blur();
    await page.waitForTimeout(300);
    
    // Level should still be 2
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('2');
    
    // Long rest to trigger level up to 6
    await page.locator('#btnLongRest').click();
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('6');
    await expect(page.locator('#subtab-basicinfo #umBonusSpan')).toHaveText('15');
  });

});

test.describe('Derived Values - Complex HP Interactions', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="stats"]').click();
  });

  test('HP = Base + CON + Tough + Homebrew (all stacked)', async ({ page }) => {
    // Set XP to 6500 (enough for level 5) - open Basic Info sub-tab
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-basicinfo #xpInput').fill('6500');
    await page.locator('#subtab-basicinfo #xpInput').blur();
    await page.waitForTimeout(300);
    
    // Level should still be 1 (level up happens on Long Rest)
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('1');
    
    // Long rest to trigger level up to 5
    await page.locator('#btnLongRest').click();
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('5');
    
    // CON 10 → Base HP (formula: 8 + 0 + 4*5 = 28)
    await expect(page.locator('#subtab-basicinfo #maxHpSpan')).toHaveText('28');
    
    // CON 16 (mod +3) → HP increases - open Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #conInput').fill('16');
    await page.locator('#subtab-stats #conInput').blur();
    // Check HP in Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    const hpWithCon = parseInt(await page.locator('#subtab-basicinfo #maxHpSpan').textContent());
    expect(hpWithCon).toBeGreaterThan(28);
    
    // Add Tough (+10 at level 5) - back to Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #toughChk').check();
    // Check HP in Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    const hpWithTough = parseInt(await page.locator('#subtab-basicinfo #maxHpSpan').textContent());
    expect(hpWithTough).toBe(hpWithCon + 10);
    
    // Add Homebrew +5
    await page.locator('#subtab-basicinfo #homebrewHp').fill('5');
    await page.locator('#subtab-basicinfo #homebrewHp').blur();
    const finalHP = parseInt(await page.locator('#subtab-basicinfo #maxHpSpan').textContent());
    expect(finalHP).toBe(hpWithTough + 5);
  });

  test('CON change retroactively affects all levels', async ({ page }) => {
    // Set XP to 6500 (enough for level 5)
    // Open Basic Info sub-tab
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-basicinfo #xpInput').fill('6500');
    await page.locator('#subtab-basicinfo #xpInput').blur();
    await page.waitForTimeout(300);
    
    // Level should still be 1 (level up happens on Long Rest)
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('1');
    
    // Long rest to trigger level up to 5
    await page.locator('#btnLongRest').click();
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('5');
    
    // Level 5, CON 10
    const baseHP = parseInt(await page.locator('#subtab-basicinfo #maxHpSpan').textContent());
    
    // Change CON to 18 (mod +4) - open Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    // Should affect: 1st level (+4) + 4 more levels (+4 each) = +20 total
    await page.locator('#subtab-stats #conInput').fill('18');
    await page.locator('#subtab-stats #conInput').blur();
    // Check HP in Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    const newHP = parseInt(await page.locator('#subtab-basicinfo #maxHpSpan').textContent());
    expect(newHP).toBeGreaterThanOrEqual(baseHP + 20);
  });

  test('Negative homebrew HP can reduce to minimum 1', async ({ page }) => {
    // Open Basic Info sub-tab
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    // Subtract massive homebrew HP
    await page.locator('#subtab-basicinfo #homebrewHp').fill('-100');
    await page.locator('#subtab-basicinfo #homebrewHp').blur();
    
    // Should clamp to 1 (minimum HP)
    await expect(page.locator('#subtab-basicinfo #maxHpSpan')).toHaveText('1');
  });

});

test.describe('Derived Values - Passive Scores', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
  });

  test('Passive Perception = 10 + WIS mod', async ({ page }) => {
    // Base: 10 + 0 = 10 - open Basic Info sub-tab
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #passPercSpan')).toHaveText('10');
    
    // WIS 16 (mod +3) → 13 - open Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #wisInput').fill('16');
    await page.locator('#subtab-stats #wisInput').blur();
    // Check passive in Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #passPercSpan')).toHaveText('13');
  });

  test('Passive Investigation = 10 + INT mod', async ({ page }) => {
    // Base: 10 + 0 = 10 - open Basic Info sub-tab
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #passInvSpan')).toHaveText('10');
    
    // INT 14 (mod +2) → 12 - open Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #intInput').fill('14');
    await page.locator('#subtab-stats #intInput').blur();
    // Check passive in Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #passInvSpan')).toHaveText('12');
  });

  test('Passive Insight = 10 + WIS mod', async ({ page }) => {
    // WIS 18 (mod +4) → 14 - open Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #wisInput').fill('18');
    await page.locator('#subtab-stats #wisInput').blur();
    // Check passive in Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #passInsSpan')).toHaveText('14');
  });

});

test.describe('Derived Values - CASCADE: One Ability Change', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    // Open Stats sub-tab by default
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
  });

  test('STR change cascades: mod + save', async ({ page }) => {
    // STR 18 (mod +4)
    await page.locator('#subtab-stats #strInput').fill('18');
    await page.locator('#subtab-stats #strInput').blur();
    
    // Mod updates
    await expect(page.locator('#subtab-stats #strModSpan')).toHaveText('+4');
    
    // Save updates (no prof: +4)
    await expect(page.locator('#subtab-stats #saveStrTotalSpan')).toHaveText('+4');
  });

  test('DEX change cascades: mod + save + AC + melee + ranged', async ({ page }) => {
    // DEX 16 (mod +3)
    await page.locator('#subtab-stats #dexInput').fill('16');
    await page.locator('#subtab-stats #dexInput').blur();
    
    // Mod
    await expect(page.locator('#subtab-stats #dexModSpan')).toHaveText('+3');
    
    // Save (has prof: +3 mod +2 prof = +5)
    await expect(page.locator('#subtab-stats #saveDexTotalSpan')).toHaveText('+5');
    
    // AC (10 + 3 = 13) - check in Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #acSpan2')).toHaveText('13');
    
    // Attacks (+3 mod +2 prof = +5)
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+5');
    await expect(page.locator('#rangedAtkSpan')).toHaveText('+5');
  });

  test('CON change cascades: mod + save + HP', async ({ page }) => {
    // CON 16 (mod +3)
    await page.locator('#subtab-stats #conInput').fill('16');
    await page.locator('#subtab-stats #conInput').blur();
    
    // Mod
    await expect(page.locator('#subtab-stats #conModSpan')).toHaveText('+3');
    
    // Save (no prof: +3)
    await expect(page.locator('#subtab-stats #saveConTotalSpan')).toHaveText('+3');
    
    // HP (8 base + 3 = 11) - check in Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #maxHpSpan')).toHaveText('11');
  });

  test('WIS change cascades: mod + save + AC + 3 passives', async ({ page }) => {
    // WIS 16 (mod +3)
    await page.locator('#subtab-stats #wisInput').fill('16');
    await page.locator('#subtab-stats #wisInput').blur();
    
    // Mod
    await expect(page.locator('#subtab-stats #wisModSpan')).toHaveText('+3');
    
    // Save (has prof: +3 mod +2 prof = +5)
    await expect(page.locator('#subtab-stats #saveWisTotalSpan')).toHaveText('+5');
    
    // AC (10 + 0 dex + 3 wis = 13) - check in Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #acSpan2')).toHaveText('13');
    
    // Passives
    await expect(page.locator('#subtab-basicinfo #passPercSpan')).toHaveText('13');
    await expect(page.locator('#subtab-basicinfo #passInsSpan')).toHaveText('13');
  });

  test('INT change cascades: mod + save + passive inv', async ({ page }) => {
    // INT 14 (mod +2)
    await page.locator('#subtab-stats #intInput').fill('14');
    await page.locator('#subtab-stats #intInput').blur();
    
    // Mod
    await expect(page.locator('#subtab-stats #intModSpan')).toHaveText('+2');
    
    // Save (no prof: +2)
    await expect(page.locator('#subtab-stats #saveIntTotalSpan')).toHaveText('+2');
    
    // Passive Investigation - check in Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #passInvSpan')).toHaveText('12');
  });

  test('CHA change cascades: mod + save', async ({ page }) => {
    // CHA 20 (mod +5)
    await page.locator('#subtab-stats #chaInput').fill('20');
    await page.locator('#subtab-stats #chaInput').blur();
    
    // Mod
    await expect(page.locator('#subtab-stats #chaModSpan')).toHaveText('+5');
    
    // Save (no prof: +5)
    await expect(page.locator('#subtab-stats #saveChaTotalSpan')).toHaveText('+5');
  });

});

test.describe('Derived Values - CASCADE: Level Up', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
  });

  test('Level 1→2: Prof stays +2, Ki=2, HD=2, UM=+10', async ({ page }) => {
    // Set XP to 300 (enough for level 2) - open Basic Info sub-tab
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-basicinfo #xpInput').fill('300');
    await page.locator('#subtab-basicinfo #xpInput').blur();
    await page.waitForTimeout(300);
    
    // Level should still be 1 (level up happens on Long Rest)
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('1');
    
    // Long rest to trigger level up to 2
    await page.locator('#btnLongRest').click();
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('2');
    await expect(page.locator('#subtab-basicinfo #profSpan2')).toHaveText('+2');
    await expect(page.locator('#subtab-basicinfo #kiMaxSpan')).toHaveText('2');
    await expect(page.locator('#subtab-basicinfo #hdMaxSpan')).toHaveText('2');
    await expect(page.locator('#subtab-basicinfo #umBonusSpan')).toHaveText('10');
  });

  test('Level 1→5: Prof→+3, Ki=5, HD=5, MA=d6, UM=+10', async ({ page }) => {
    // Set XP to 6500 (enough for level 5) - open Basic Info sub-tab
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-basicinfo #xpInput').fill('6500');
    await page.locator('#subtab-basicinfo #xpInput').blur();
    await page.waitForTimeout(300);
    
    // Level should still be 1 (level up happens on Long Rest)
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('1');
    
    // Long rest to trigger level up to 5
    await page.locator('#btnLongRest').click();
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('5');
    await expect(page.locator('#subtab-basicinfo #profSpan2')).toHaveText('+3');
    await expect(page.locator('#subtab-basicinfo #kiMaxSpan')).toHaveText('5');
    await expect(page.locator('#subtab-basicinfo #hdMaxSpan')).toHaveText('5');
    await expect(page.locator('#subtab-basicinfo #maDieSpan')).toHaveText('d6');
    await expect(page.locator('#subtab-basicinfo #umBonusSpan')).toHaveText('10');
  });

  test('Level 5→11: Prof→+4, Ki=11, HD=11, MA=d8, UM=+20', async ({ page }) => {
    // First, get to level 5 - open Basic Info sub-tab
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-basicinfo #xpInput').fill('6500');
    await page.locator('#subtab-basicinfo #xpInput').blur();
    await page.waitForTimeout(300);
    await page.locator('#btnLongRest').click();
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('5');
    
    // Set XP to 85000 (enough for level 11)
    await page.locator('#subtab-basicinfo #xpInput').fill('85000');
    await page.locator('#subtab-basicinfo #xpInput').blur();
    await page.waitForTimeout(300);
    
    // Level should still be 5 (level up happens on Long Rest)
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('5');
    
    // Long rest to trigger level up to 11
    await page.locator('#btnLongRest').click();
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('11');
    await expect(page.locator('#subtab-basicinfo #profSpan2')).toHaveText('+4');
    await expect(page.locator('#subtab-basicinfo #kiMaxSpan')).toHaveText('11');
    await expect(page.locator('#subtab-basicinfo #hdMaxSpan')).toHaveText('11');
    await expect(page.locator('#subtab-basicinfo #maDieSpan')).toHaveText('d8');
    await expect(page.locator('#subtab-basicinfo #umBonusSpan')).toHaveText('20');
  });

  test('Prof increase cascades to saves and attacks', async ({ page }) => {
    // Set DEX 16 (mod +3) for clear testing - open Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #dexInput').fill('16');
    await page.locator('#subtab-stats #dexInput').blur();
    
    // Level 1: Prof +2
    // DEX save: +3 mod +2 prof = +5
    await expect(page.locator('#subtab-stats #saveDexTotalSpan')).toHaveText('+5');
    // Melee: +3 mod +2 prof = +5
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+5');
    
    // Set XP to 6500 (enough for level 5) - open Basic Info sub-tab
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-basicinfo #xpInput').fill('6500');
    await page.locator('#subtab-basicinfo #xpInput').blur();
    await page.waitForTimeout(300);
    
    // Level should still be 1 (level up happens on Long Rest)
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('1');
    
    // Long rest to trigger level up to 5
    await page.locator('#btnLongRest').click();
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('5');
    
    // Level 5: Prof +3
    // DEX save: +3 mod +3 prof = +6 - check in Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-stats #saveDexTotalSpan')).toHaveText('+6');
    // Melee: +3 mod +3 prof = +6
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+6');
  });

});

test.describe('Derived Values - CASCADE: Multiple Changes', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
  });

  test('DEX+WIS together update AC correctly', async ({ page }) => {
    // Initial AC = 10 - open Basic Info sub-tab
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #acSpan2')).toHaveText('10');
    
    // DEX 18 (mod +4) - open Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #dexInput').fill('18');
    await page.locator('#subtab-stats #dexInput').blur();
    // Check AC in Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #acSpan2')).toHaveText('14'); // 10 + 4
    
    // WIS 16 (mod +3) - back to Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #wisInput').fill('16');
    await page.locator('#subtab-stats #wisInput').blur();
    // Check AC in Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #acSpan2')).toHaveText('17'); // 10 + 4 + 3
  });

  test('CON + Level + Tough all stack for HP', async ({ page }) => {
    // Base: Level 1, CON 10, no Tough → HP 8 - open Basic Info sub-tab
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #maxHpSpan')).toHaveText('8');
    
    // CON 16 (mod +3) → HP 11 - open Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #conInput').fill('16');
    await page.locator('#subtab-stats #conInput').blur();
    // Check HP in Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #maxHpSpan')).toHaveText('11');
    
    // Set XP to 6500 (enough for level 5)
    await page.locator('#subtab-basicinfo #xpInput').fill('6500');
    await page.locator('#subtab-basicinfo #xpInput').blur();
    await page.waitForTimeout(300);
    
    // Level should still be 1 (level up happens on Long Rest)
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('1');
    
    // Long rest to trigger level up to 5
    await page.locator('#btnLongRest').click();
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('5');
    
    // Level 5 → HP increases (8 base + 4*5 avg + 5*3 con = 8+20+15 = 43)
    const hpAfterLevel = parseInt(await page.locator('#subtab-basicinfo #maxHpSpan').textContent());
    expect(hpAfterLevel).toBeGreaterThan(11);
    
    // Tough → +10 (2*5 levels) - open Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #toughChk').check();
    // Check HP in Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    const hpWithTough = parseInt(await page.locator('#subtab-basicinfo #maxHpSpan').textContent());
    expect(hpWithTough).toBe(hpAfterLevel + 10);
  });

  test('DEX + Level increase attacks together', async ({ page }) => {
    // Level 1, DEX 14 (mod +2): +2 mod +2 prof = +4 - open Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #dexInput').fill('14');
    await page.locator('#subtab-stats #dexInput').blur();
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+4');
    
    // Set XP to 6500 (enough for level 5) - open Basic Info sub-tab
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-basicinfo #xpInput').fill('6500');
    await page.locator('#subtab-basicinfo #xpInput').blur();
    await page.waitForTimeout(300);
    
    // Level should still be 1 (level up happens on Long Rest)
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('1');
    
    // Long rest to trigger level up to 5
    await page.locator('#btnLongRest').click();
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('5');
    
    // Level 5: Prof +3 → +2 mod +3 prof = +5
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+5');
    
    // DEX 18 (mod +4): +4 mod +3 prof = +7 - open Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #dexInput').fill('18');
    await page.locator('#subtab-stats #dexInput').blur();
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+7');
  });

  test('Magic bonuses add on top of ability bonuses', async ({ page }) => {
    // DEX 16, AC = 10 + 3 = 13 - open Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #dexInput').fill('16');
    await page.locator('#subtab-stats #dexInput').blur();
    // Check AC in Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #acSpan2')).toHaveText('13');
    
    // AC magic +2 → 15
    await page.locator('#subtab-basicinfo #acMagicInput').fill('2');
    await page.locator('#subtab-basicinfo #acMagicInput').blur();
    await expect(page.locator('#subtab-basicinfo #acSpan2')).toHaveText('15');
    
    // WIS 14 (mod +2) → 17 (10 + 3 dex + 2 wis + 2 magic) - back to Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #wisInput').fill('14');
    await page.locator('#subtab-stats #wisInput').blur();
    // Check AC in Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #acSpan2')).toHaveText('17');
  });

  test('Negative CON reduces HP, Tough can compensate', async ({ page }) => {
    // CON 6 (mod -2) → HP = 8 - 2 = 6 - open Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #conInput').fill('6');
    await page.locator('#subtab-stats #conInput').blur();
    // Check HP in Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #maxHpSpan')).toHaveText('6');
    
    // Tough (+2) → HP = 6 + 2 = 8 - back to Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #toughChk').check();
    // Check HP in Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #maxHpSpan')).toHaveText('8');
  });

});

test.describe('Derived Values - Edge Cases & Boundaries', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    // Open Stats sub-tab by default
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
  });

  test('Ability score 1 (lowest)', async ({ page }) => {
    // STR 1 → mod -5
    await page.locator('#subtab-stats #strInput').fill('1');
    await page.locator('#subtab-stats #strInput').blur();
    await expect(page.locator('#subtab-stats #strModSpan')).toHaveText('-5');
    await expect(page.locator('#subtab-stats #saveStrTotalSpan')).toHaveText('-5');
  });

  test('Ability score 30 (highest D&D)', async ({ page }) => {
    // DEX 30 → mod +10
    await page.locator('#subtab-stats #dexInput').fill('30');
    await page.locator('#subtab-stats #dexInput').blur();
    await expect(page.locator('#subtab-stats #dexModSpan')).toHaveText('+10');
    // Save: +10 mod +2 prof = +12
    await expect(page.locator('#subtab-stats #saveDexTotalSpan')).toHaveText('+12');
    // AC: 10 + 10 = 20 - check in Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #acSpan2')).toHaveText('20');
  });

  test('Level 20 (max)', async ({ page }) => {
    // Set XP to 355000 (enough for level 20) - open Basic Info sub-tab
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-basicinfo #xpInput').fill('355000');
    await page.locator('#subtab-basicinfo #xpInput').blur();
    await page.waitForTimeout(300);
    
    // Level should still be 1 (level up happens on Long Rest)
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('1');
    
    // Long rest to trigger level up to 20
    await page.locator('#btnLongRest').click();
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('20');
    await expect(page.locator('#subtab-basicinfo #profSpan2')).toHaveText('+6');
    await expect(page.locator('#subtab-basicinfo #kiMaxSpan')).toHaveText('20');
    await expect(page.locator('#subtab-basicinfo #hdMaxSpan')).toHaveText('20');
    await expect(page.locator('#subtab-basicinfo #maDieSpan')).toHaveText('d10');
    await expect(page.locator('#subtab-basicinfo #umBonusSpan')).toHaveText('30');
  });

  test('Very negative homebrew HP still clamps to 1', async ({ page }) => {
    // CON 6 (mod -2), Level 1 → HP = 6 - open Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #conInput').fill('6');
    await page.locator('#subtab-stats #conInput').blur();
    // Check HP in Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #maxHpSpan')).toHaveText('6');
    
    // Homebrew -100
    await page.locator('#subtab-basicinfo #homebrewHp').fill('-100');
    await page.locator('#subtab-basicinfo #homebrewHp').blur();
    
    // Clamps to 1
    await expect(page.locator('#subtab-basicinfo #maxHpSpan')).toHaveText('1');
  });

  test('All proficiency checkboxes work', async ({ page }) => {
    // Add prof to INT (no default prof) - open Stats sub-tab
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #intInput').fill('16');
    await page.locator('#subtab-stats #intInput').blur();
    
    // No prof: save = +3
    await expect(page.locator('#subtab-stats #saveIntTotalSpan')).toHaveText('+3');
    
    // Check prof
    await page.locator('#subtab-stats #saveIntProf').check();
    await expect(page.locator('#subtab-stats #saveIntTotalSpan')).toHaveText('+5'); // +3 mod +2 prof
    
    // Uncheck prof
    await page.locator('#subtab-stats #saveIntProf').uncheck();
    await expect(page.locator('#subtab-stats #saveIntTotalSpan')).toHaveText('+3');
  });

});

