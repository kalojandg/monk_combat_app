import { test, expect } from '@playwright/test';

/**
 * PROFICIENCY TOGGLES TESTS
 * 
 * Saving Throws: save = ability_mod + (proficiency ? prof_bonus : 0) + saveAllBonus
 * Skills: skill = ability_mod + (proficiency ? prof_bonus : 0)
 */

test.describe('Saving Throws - Proficiency Toggles', () => {
  
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
    // Wait for Stats sub-tab content to be visible
    await expect(page.locator('#subtab-stats #strInput')).toBeVisible({ timeout: 5000 });
  });

  test('STR Save: Toggle proficiency adds/removes prof bonus', async ({ page }) => {
    // Default: STR 10 (mod +0), no prof → Save +0
    await expect(page.locator('#subtab-stats #saveStrTotalSpan')).toHaveText('+0');
    
    // Enable proficiency
    await page.locator('#subtab-stats #saveStrProf').check();
    await page.waitForTimeout(200);
    
    // Should be +2 (mod +0, prof +2)
    await expect(page.locator('#subtab-stats #saveStrTotalSpan')).toHaveText('+2');
    
    // Disable proficiency
    await page.locator('#subtab-stats #saveStrProf').uncheck();
    await page.waitForTimeout(200);
    
    // Back to +0
    await expect(page.locator('#subtab-stats #saveStrTotalSpan')).toHaveText('+0');
  });

  test('DEX Save: Toggle proficiency with high ability score', async ({ page }) => {
    // DEX has default proficiency, so uncheck first
    await page.locator('#subtab-stats #saveDexProf').uncheck();
    await page.waitForTimeout(200);
    
    // Set DEX to 16 (mod +3)
    await page.locator('#subtab-stats #dexInput').fill('16');
    await page.locator('#subtab-stats #dexInput').blur();
    await page.waitForTimeout(200);
    
    // Without prof: +3
    await expect(page.locator('#subtab-stats #saveDexTotalSpan')).toHaveText('+3');
    
    // With prof: +3 +2 = +5
    await page.locator('#subtab-stats #saveDexProf').check();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-stats #saveDexTotalSpan')).toHaveText('+5');
  });

  test('All 6 Saving Throws: Toggle proficiency works', async ({ page }) => {
    // First, uncheck all proficiencies (DEX and WIS have default prof)
    await page.locator('#subtab-stats #saveDexProf').uncheck();
    await page.locator('#subtab-stats #saveWisProf').uncheck();
    await page.waitForTimeout(200);
    
    const saves = ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha'];
    
    for (const save of saves) {
      const checkboxId = `#subtab-stats #save${save}Prof`;
      const spanId = `#subtab-stats #save${save}TotalSpan`;
      
      // Check initial value (should be +0 for all with default stats)
      await expect(page.locator(spanId)).toHaveText('+0');
      
      // Enable proficiency
      await page.locator(checkboxId).check();
      await page.waitForTimeout(100);
      
      // Should be +2
      await expect(page.locator(spanId)).toHaveText('+2');
      
      // Disable proficiency
      await page.locator(checkboxId).uncheck();
      await page.waitForTimeout(100);
      
      // Back to +0
      await expect(page.locator(spanId)).toHaveText('+0');
    }
  });

  test('CASCADE: Ability score change updates save when proficiency enabled', async ({ page }) => {
    // Enable WIS proficiency
    await page.locator('#subtab-stats #saveWisProf').check();
    await page.waitForTimeout(100);
    
    // WIS 10 (mod +0) + prof +2 = +2
    await expect(page.locator('#subtab-stats #saveWisTotalSpan')).toHaveText('+2');
    
    // Increase WIS to 14 (mod +2)
    await page.locator('#subtab-stats #wisInput').fill('14');
    await page.locator('#subtab-stats #wisInput').blur();
    await page.waitForTimeout(200);
    
    // Should be +4 (mod +2, prof +2)
    await expect(page.locator('#subtab-stats #saveWisTotalSpan')).toHaveText('+4');
  });

  test('Saving Throws persist after reload', async ({ page }) => {
    // Enable DEX and WIS proficiency
    await page.locator('#subtab-stats #saveDexProf').check();
    await page.locator('#subtab-stats #saveWisProf').check();
    await page.waitForTimeout(200);
    
    // Reload
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    
    // Checkboxes should still be checked
    await expect(page.locator('#subtab-stats #saveDexProf')).toBeChecked();
    await expect(page.locator('#subtab-stats #saveWisProf')).toBeChecked();
    
    // Values should still be +2
    await expect(page.locator('#subtab-stats #saveDexTotalSpan')).toHaveText('+2');
    await expect(page.locator('#subtab-stats #saveWisTotalSpan')).toHaveText('+2');
  });

});

test.describe('Skills - Proficiency Toggles', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    // Open Stats tab and Passive Skills sub-tab (where skillsBody is located)
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="passiveskills"]').click();
    await page.waitForTimeout(200);
    // Wait for skills table to be visible
    await expect(page.locator('#subtab-passiveskills #skillsBody')).toBeVisible({ timeout: 5000 });
  });

  test('Acrobatics (DEX): Toggle proficiency adds/removes prof bonus', async ({ page }) => {
    // Wait for skills table to render and be visible
    await page.waitForFunction(() => {
      const body = document.querySelector('#subtab-passiveskills #skillsBody');
      const rows = body ? body.querySelectorAll('tr') : [];
      return body && rows.length > 0;
    }, { timeout: 5000 });
    
    // Find Acrobatics row
    const acrobaticsRow = page.locator('#subtab-passiveskills #skillsBody tr').filter({ hasText: 'Acrobatics' });
    const checkbox = acrobaticsRow.locator('input[type="checkbox"]');
    const bonusCell = acrobaticsRow.locator('td.right');
    
    // Default: DEX 10 (mod +0), no prof → +0
    await expect(bonusCell).toHaveText('+0');
    
    // Enable proficiency via JavaScript (checkbox might be in hidden tab)
    await page.evaluate(() => {
      const checkbox = document.querySelector('input[data-skill="Acrobatics"]');
      if (checkbox) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(200);
    
    // Should be +2 (mod +0, prof +2)
    await expect(bonusCell).toHaveText('+2');
    
    // Disable proficiency
    await page.evaluate(() => {
      const checkbox = document.querySelector('input[data-skill="Acrobatics"]');
      if (checkbox) {
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(200);
    
    // Back to +0
    await expect(bonusCell).toHaveText('+0');
  });

  test('Athletics (STR): Toggle proficiency with high ability score', async ({ page }) => {
    // Set STR to 16 (mod +3) - open Stats tab and Stats sub-tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #strInput').fill('16');
    await page.locator('#subtab-stats #strInput').blur();
    await page.waitForTimeout(200);
    
    // Go back to Stats tab and Passive Skills sub-tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="passiveskills"]').click();
    await page.waitForTimeout(200);
    await page.waitForFunction(() => {
      const body = document.querySelector('#subtab-passiveskills #skillsBody');
      const rows = body ? body.querySelectorAll('tr') : [];
      return body && rows.length > 0;
    }, { timeout: 5000 });
    
    // Find Athletics row
    const athleticsRow = page.locator('#subtab-passiveskills #skillsBody tr').filter({ hasText: 'Athletics' });
    const checkbox = athleticsRow.locator('input[type="checkbox"]');
    const bonusCell = athleticsRow.locator('td.right');
    
    // Without prof: +3
    await expect(bonusCell).toHaveText('+3');
    
    // With prof: +3 +2 = +5
    await page.evaluate(() => {
      const checkbox = document.querySelector('input[data-skill="Athletics"]');
      if (checkbox) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(200);
    await expect(bonusCell).toHaveText('+5');
  });

  test('Perception (WIS): Toggle proficiency updates passive Perception', async ({ page }) => {
    await page.waitForFunction(() => {
      const body = document.querySelector('#subtab-passiveskills #skillsBody');
      const rows = body ? body.querySelectorAll('tr') : [];
      return body && rows.length > 0;
    }, { timeout: 5000 });
    
    // Find Perception row
    const perceptionRow = page.locator('#subtab-passiveskills #skillsBody tr').filter({ hasText: 'Perception' });
    const checkbox = perceptionRow.locator('input[type="checkbox"]');
    const bonusCell = perceptionRow.locator('td.right');
    
    // Default: WIS 10 (mod +0), no prof → +0, Passive = 10 - check in Basic Info sub-tab
    await expect(bonusCell).toHaveText('+0');
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #passPercSpan')).toHaveText('10');
    
    // Enable proficiency - back to Stats tab and Passive Skills sub-tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="passiveskills"]').click();
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const checkbox = document.querySelector('input[data-skill="Perception"]');
      if (checkbox) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(200);
    
    // Skill should be +2
    await expect(bonusCell).toHaveText('+2');
    
    // Passive Perception should be 12 (10 + 2) - check in Basic Info sub-tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #passPercSpan')).toHaveText('12');
  });

  test('Multiple Skills: Toggle proficiency independently', async ({ page }) => {
    await page.waitForFunction(() => {
      const body = document.querySelector('#subtab-passiveskills #skillsBody');
      const rows = body ? body.querySelectorAll('tr') : [];
      return body && rows.length > 0;
    }, { timeout: 5000 });
    
    // Enable Acrobatics and Stealth (both DEX)
    const acrobaticsRow = page.locator('#subtab-passiveskills #skillsBody tr').filter({ hasText: 'Acrobatics' });
    const stealthRow = page.locator('#subtab-passiveskills #skillsBody tr').filter({ hasText: 'Stealth' });
    
    await page.evaluate(() => {
      const acro = document.querySelector('input[data-skill="Acrobatics"]');
      const stealth = document.querySelector('input[data-skill="Stealth"]');
      if (acro) { acro.checked = true; acro.dispatchEvent(new Event('change', { bubbles: true })); }
      if (stealth) { stealth.checked = true; stealth.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    await page.waitForTimeout(200);
    
    // Both should be +2
    await expect(acrobaticsRow.locator('td.right')).toHaveText('+2');
    await expect(stealthRow.locator('td.right')).toHaveText('+2');
    
    // Disable only Acrobatics
    await page.evaluate(() => {
      const acro = document.querySelector('input[data-skill="Acrobatics"]');
      if (acro) { acro.checked = false; acro.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    await page.waitForTimeout(200);
    
    // Acrobatics back to +0, Stealth still +2
    await expect(acrobaticsRow.locator('td.right')).toHaveText('+0');
    await expect(stealthRow.locator('td.right')).toHaveText('+2');
  });

  test('CASCADE: Ability score change updates skill when proficiency enabled', async ({ page }) => {
    await page.waitForFunction(() => {
      const body = document.querySelector('#subtab-passiveskills #skillsBody');
      const rows = body ? body.querySelectorAll('tr') : [];
      return body && rows.length > 0;
    }, { timeout: 5000 });
    
    // Enable Insight (WIS)
    const insightRow = page.locator('#subtab-passiveskills #skillsBody tr').filter({ hasText: 'Insight' });
    await page.evaluate(() => {
      const checkbox = document.querySelector('input[data-skill="Insight"]');
      if (checkbox) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(100);
    
    // WIS 10 (mod +0) + prof +2 = +2
    await expect(insightRow.locator('td.right')).toHaveText('+2');
    
    // Increase WIS to 14 (mod +2) - open Stats tab and Stats sub-tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #wisInput').fill('14');
    await page.locator('#subtab-stats #wisInput').blur();
    await page.waitForTimeout(200);
    
    // Go back to Stats tab and Passive Skills sub-tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="passiveskills"]').click();
    await page.waitForTimeout(200);
    await page.waitForFunction(() => {
      const body = document.querySelector('#subtab-passiveskills #skillsBody');
      const rows = body ? body.querySelectorAll('tr') : [];
      return body && rows.length > 0;
    }, { timeout: 5000 });
    
    // Should be +4 (mod +2, prof +2)
    const insightRowAfter = page.locator('#subtab-passiveskills #skillsBody tr').filter({ hasText: 'Insight' });
    await expect(insightRowAfter.locator('td.right')).toHaveText('+4');
  });

  test('Skills persist after reload', async ({ page }) => {
    await page.waitForFunction(() => {
      const body = document.querySelector('#subtab-passiveskills #skillsBody');
      const rows = body ? body.querySelectorAll('tr') : [];
      return body && rows.length > 0;
    }, { timeout: 5000 });
    
    // Enable Acrobatics and Investigation
    const acrobaticsRow = page.locator('#subtab-passiveskills #skillsBody tr').filter({ hasText: 'Acrobatics' });
    const investigationRow = page.locator('#subtab-passiveskills #skillsBody tr').filter({ hasText: 'Investigation' });
    
    await page.evaluate(() => {
      const acro = document.querySelector('input[data-skill="Acrobatics"]');
      const inv = document.querySelector('input[data-skill="Investigation"]');
      if (acro) { acro.checked = true; acro.dispatchEvent(new Event('change', { bubbles: true })); }
      if (inv) { inv.checked = true; inv.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    await page.waitForTimeout(200);
    
    // Reload
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="passiveskills"]').click();
    await page.waitForTimeout(200);
    await page.waitForFunction(() => {
      const body = document.querySelector('#subtab-passiveskills #skillsBody');
      const rows = body ? body.querySelectorAll('tr') : [];
      return body && rows.length > 0;
    }, { timeout: 5000 });
    
    // Checkboxes should still be checked
    const acrobaticsRowAfter = page.locator('#subtab-passiveskills #skillsBody tr').filter({ hasText: 'Acrobatics' });
    const investigationRowAfter = page.locator('#subtab-passiveskills #skillsBody tr').filter({ hasText: 'Investigation' });
    await expect(acrobaticsRowAfter.locator('input[type="checkbox"]')).toBeChecked();
    await expect(investigationRowAfter.locator('input[type="checkbox"]')).toBeChecked();
    
    // Values should still be +2
    await expect(acrobaticsRowAfter.locator('td.right')).toHaveText('+2');
    await expect(investigationRowAfter.locator('td.right')).toHaveText('+2');
  });

  test('All Skills: Verify ability mappings', async ({ page }) => {
    // Test a few key skills to verify ability mappings
    const skillTests = [
      { name: 'Acrobatics', ability: 'dex', abilityId: '#dexInput' },
      { name: 'Athletics', ability: 'str', abilityId: '#strInput' },
      { name: 'Perception', ability: 'wis', abilityId: '#wisInput' },
      { name: 'Investigation', ability: 'int_', abilityId: '#intInput' },
      { name: 'Persuasion', ability: 'cha', abilityId: '#chaInput' },
    ];
    
    for (const { name, abilityId } of skillTests) {
      // Set ability to 16 (mod +3) - open Stats tab and Stats sub-tab
      await page.locator('button[data-tab="stats"]').click();
      await page.waitForTimeout(300);
      await page.locator('button[data-subtab="stats"]').click();
      await page.waitForTimeout(200);
      // Update abilityId to include sub-tab context
      const abilityIdWithContext = abilityId.replace('#', '#subtab-stats #');
      await page.locator(abilityIdWithContext).fill('16');
      await page.locator(abilityIdWithContext).blur();
      await page.waitForTimeout(200);
      
      // Go to Stats tab and Passive Skills sub-tab
      await page.locator('button[data-tab="stats"]').click();
      await page.waitForTimeout(300);
      await page.locator('button[data-subtab="passiveskills"]').click();
      await page.waitForTimeout(200);
      await page.waitForFunction(() => {
        const body = document.querySelector('#subtab-passiveskills #skillsBody');
        const rows = body ? body.querySelectorAll('tr') : [];
        return body && rows.length > 0;
      }, { timeout: 5000 });
      
      // Find skill row
      const skillRow = page.locator('#subtab-passiveskills #skillsBody tr').filter({ hasText: name });
      const bonusCell = skillRow.locator('td.right');
      
      // Without prof: +3
      await expect(bonusCell).toHaveText('+3');
      
      // With prof: +5
      await page.evaluate((skillName) => {
        const checkbox = document.querySelector(`input[data-skill="${skillName}"]`);
        if (checkbox) {
          checkbox.checked = true;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, name);
      await page.waitForTimeout(200);
      await expect(bonusCell).toHaveText('+5');
      
      // Reset ability - back to Stats tab and Stats sub-tab
      await page.locator('button[data-tab="stats"]').click();
      await page.waitForTimeout(300);
      await page.locator('button[data-subtab="stats"]').click();
      await page.waitForTimeout(200);
      await page.locator(abilityIdWithContext).fill('10');
      await page.locator(abilityIdWithContext).blur();
      await page.waitForTimeout(200);
    }
  });

});

test.describe('Proficiency scaling with level', () => {
  /**
   * Проверяваме, че:
   * - при вдигане на ниво се променя proficiency bonus
   * - тази промяна се отразява в:
   *    - сейвовете (пример: STR save)
   *    - скиловете (пример: Acrobatics)
   *
   * Използваме нива, при които се сменя prof: 1, 5, 9, 13, 17.
   */
  const LEVEL_CASES = [
    { level: 1, xp: 0, expectedProf: '+2' },
    { level: 5, xp: 6500, expectedProf: '+3' },
    { level: 9, xp: 48000, expectedProf: '+4' },
    { level: 13, xp: 120000, expectedProf: '+5' },
    { level: 17, xp: 225000, expectedProf: '+6' },
  ];

  for (const { level, xp, expectedProf } of LEVEL_CASES) {
    test(`Level ${level}: proficiency bonus cascades to saves and skills`, async ({ page }) => {
      // Чисто начало
      await page.goto('/');
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
      await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
      await expect(page.locator('#hpDelta')).toBeVisible({ timeout: 5000 });

      // Статове 10, за да е mod = +0 и да виждаме чисто prof - open Stats tab and Stats sub-tab
      await page.locator('button[data-tab="stats"]').click();
      await page.waitForTimeout(300);
      await page.locator('button[data-subtab="stats"]').click();
      await page.waitForTimeout(200);
      await page.locator('#subtab-stats #strInput').fill('10');
      await page.locator('#subtab-stats #strInput').blur();
      await page.locator('#subtab-stats #dexInput').fill('10');
      await page.locator('#subtab-stats #dexInput').blur();
      await page.locator('#subtab-stats #wisInput').fill('10');
      await page.locator('#subtab-stats #wisInput').blur();

      // Задаваме XP за това ниво - open Basic Info sub-tab
      await page.locator('button[data-subtab="basicinfo"]').click();
      await page.waitForTimeout(200);
      await page.locator('#subtab-basicinfo #xpInput').fill(xp.toString());
      await page.locator('#subtab-basicinfo #xpInput').blur();
      await page.waitForTimeout(300);

      // Long Rest за да се изпълни пълната логика и renderAll()
      await page.locator('#btnLongRest').click();

      // Връщаме се в Stats и проверяваме level + proficiency бонуса - open Basic Info sub-tab
      await page.locator('button[data-tab="stats"]').click();
      await page.waitForTimeout(300);
      await page.locator('button[data-subtab="basicinfo"]').click();
      await page.waitForTimeout(200);
      await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText(level.toString());
      await expect(page.locator('#subtab-basicinfo #profSpan2')).toHaveText(expectedProf);

      // Включваме STR save proficiency (за да е мод = prof) - open Stats sub-tab
      await page.locator('button[data-subtab="stats"]').click();
      await page.waitForTimeout(200);
      await page.locator('#subtab-stats #saveStrProf').check();
      await page.waitForTimeout(100);

      // STR мод = +0, значи total трябва да е равен на prof
      await expect(page.locator('#subtab-stats #saveStrTotalSpan')).toHaveText(expectedProf);

      // Отиваме на Stats tab и Passive Skills sub-tab и включваме Acrobatics proficiency
      await page.locator('button[data-tab="stats"]').click();
      await page.waitForTimeout(300);
      await page.locator('button[data-subtab="passiveskills"]').click();
      await page.waitForTimeout(200);
      await page.waitForFunction(() => {
        const body = document.querySelector('#subtab-passiveskills #skillsBody');
        const rows = body ? body.querySelectorAll('tr') : [];
        return body && rows.length > 0;
      }, { timeout: 5000 });

      // Активираме proficiency за Acrobatics през JS (както в останалите тестове)
      await page.evaluate(() => {
        const checkbox = document.querySelector('input[data-skill="Acrobatics"]');
        if (checkbox) {
          checkbox.checked = true;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      await page.waitForTimeout(200);

      // Намираме реда за Acrobatics и очакваме бонусът да е равен на prof
      const acrobaticsRow = page.locator('#subtab-passiveskills #skillsBody tr').filter({ hasText: 'Acrobatics' });
      const acrobaticsBonus = acrobaticsRow.locator('td.right');
      await expect(acrobaticsBonus).toHaveText(expectedProf);
    });
  }
});
