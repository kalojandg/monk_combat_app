import { test, expect } from '@playwright/test';

/**
 * IMPORT / EXPORT (bundle v2)
 *
 * Цел:
 * - да гарантираме, че buildBundle() връща коректен JSON,
 *   който отразява текущото UI състояние
 * - и че applyBundle(bundle) може да го върне обратно в UI
 *   (round-trip: UI → bundle → UI).
 *
 * Забележка:
 * - Тук НЕ тестваме реалния file picker / download, а само
 *   логиката на bundle формата и свързването му със state/UI.
 */

test.describe('Import / Export - Bundle v2', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await expect(page.locator('#hpDelta')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#kiDelta')).toBeVisible({ timeout: 5000 });
  });

  test('buildBundle() съдържа текущото UI състояние', async ({ page }) => {
    // 1) Настройваме няколко полета през UI (разпръснати по табове)

    // Име + XP + DEX на Stats таб
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    // Open Basic Info sub-tab
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-basicinfo #charName').fill('Тестов Монах');
    await page.locator('#subtab-basicinfo #xpInput').fill('6500'); // ниво 5
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
    
    // Open Stats sub-tab for DEX
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #dexInput').fill('16');
    await page.locator('#subtab-stats #dexInput').blur();

    // PC Characteristics таб
    await page.locator('button[data-tab="pcchar"]').click();
    await page.locator('#pcPersonality').fill('Спокоен, обмислен, любител на чай.');
    await page.locator('#pcBond').fill('Заклел се е да пази манастира.');
    await page.locator('#pcFlaw').fill('Натрапчиво пресмята всичко в бой.');

    // Notes (глобално поле) - в Basic Info sub-tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-basicinfo #notes').fill('Бележка за теста на import/export.');

    // Inventory – добавяме един прост запис през вече тестваните бутони
    await page.locator('button[data-tab="inventory"]').click();
    await page.waitForTimeout(300); // Wait for tab HTML to load and event listeners to attach
    await page.locator('#btnInvAdd').click();
    await page.waitForTimeout(100); // Wait for modal to open
    await page.locator('#invName').fill('Тестов кинжал');
    await page.locator('#invQty').fill('2');
    await page.locator('#invNote').fill('От тестовия bundle.');
    await page.locator('#invSave').click();
    await page.waitForTimeout(200); // Wait for save to complete

    // Изчакваме save/render
    await page.waitForTimeout(300);

    // 2) Взимаме bundle през buildBundle() – достъпно е като global функция
    const bundle = await page.evaluate(() => {
      // buildBundle / getBundle са дефинирани глобално в app.js
      if (typeof window.buildBundle === 'function') {
        return window.buildBundle();
      }
      if (typeof window.getBundle === 'function') {
        return window.getBundle();
      }
      return null;
    });

    // 3) Проверяваме структурата на bundle v2
    expect(bundle).toBeTruthy();
    expect(bundle.version).toBe(2);
    expect(bundle.state).toBeTruthy();

    // 4) Проверяваме няколко ключови полета в state
    expect(bundle.state.name).toBe('Тестов Монах');
    expect(bundle.state.xp).toBe(6500);
    expect(bundle.state.dex).toBe(16);

    expect(bundle.state.personality).toBe('Спокоен, обмислен, любител на чай.');
    expect(bundle.state.bond).toBe('Заклел се е да пази манастира.');
    expect(bundle.state.flaw).toBe('Натрапчиво пресмята всичко в бой.');

    expect(bundle.state.notes).toBe('Бележка за теста на import/export.');

    // inventory трябва да съдържа поне един елемент с това име
    const inv = bundle.state.inventory || [];
    const foundItem = inv.find(it => it && it.name === 'Тестов кинжал');
    expect(foundItem).toBeTruthy();
    expect(foundItem.qty).toBe(2);
  });

  test('buildBundle() → applyBundle(bundle) възстановява sheet-a (round-trip)', async ({ page }) => {
    // 1) Попълваме sheet-а с известни стойности през UI

    // Stats таб
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    // Open Basic Info sub-tab
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-basicinfo #charName').fill('Roundtrip Монах');
    await page.locator('#subtab-basicinfo #xpInput').fill('14000'); // ниво 6 (9000 е за level 5)
    await page.locator('#subtab-basicinfo #xpInput').blur();
    await page.waitForTimeout(300);
    
    // Level should still be 1 (level up happens on Long Rest)
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('1');
    
    // Long rest to trigger level up to 6
    await page.locator('#btnLongRest').click();
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('6');
    
    // Open Stats sub-tab for WIS
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #wisInput').fill('18');
    await page.locator('#subtab-stats #wisInput').blur();

    // Skills таб - просто да се уверим, че features accordion ще се рендерира по-късно
    await page.locator('button[data-tab="skills"]').click();
    await page.waitForTimeout(200);

    // PC Characteristics
    await page.locator('button[data-tab="pcchar"]').click();
    await page.locator('#pcPersonality').fill('Спокоен пазител на портите.');

    // 2) Генерираме bundle и го запазваме в променлива в теста
    const bundle = await page.evaluate(() => {
      if (typeof window.buildBundle === 'function') {
        return window.buildBundle();
      }
      if (typeof window.getBundle === 'function') {
        return window.getBundle();
      }
      return null;
    });
    
    // Verify bundle contains level (should be 6 after Long Rest)
    expect(bundle).toBeTruthy();
    expect(bundle.state).toBeTruthy();
    expect(bundle.state.level).toBe(6); // Level should be preserved in bundle
    expect(bundle.state.xp).toBe(14000);

    // 3) "Забравяме" текущото състояние – чист localStorage и reload
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });

    // Уверяваме се, че името е в default стойността от defaultState
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #charName')).toHaveValue('Пийс Ошит');

    // 4) Импортираме bundle чрез applyBundle(bundle)
    await page.evaluate(b => {
      // applyBundle е глобална функция от app.js
      // @ts-ignore
      window.applyBundle(b);
    }, bundle);

    // Изчакваме renderAll да мине и tabs да се заредят
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await page.waitForTimeout(500);

    // 5) Проверяваме, че UI е възстановен от bundle-а

    // Stats
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #charName')).toHaveValue('Roundtrip Монах');
    await expect(page.locator('#subtab-basicinfo #xpInput')).toHaveValue('14000');
    
    // Open Stats sub-tab for WIS
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-stats #wisInput')).toHaveValue('18');

    // Ниво трябва да съответства на XP от bundle-а (level се пази в bundle-а след Long Rest)
    // Bundle-а е генериран след Long Rest, така че level трябва да е 6
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('6');

    // PC Characteristics
    await page.locator('button[data-tab="pcchar"]').click();
    await expect(page.locator('#pcPersonality')).toHaveValue('Спокоен пазител на портите.');
  });

  test('FULL STATE ROUND-TRIP: UI → bundle → applyBundle() пази всички полета', async ({ page }) => {
    // 1) Попълваме ВЪЗМОЖНО НАЙ-МНОГО полета през UI, за да не остават default стойности
    // Stats
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    // Open Basic Info sub-tab
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-basicinfo #charName').fill('Full Roundtrip Монах');
    await page.locator('#subtab-basicinfo #notes').fill('Големият тест за import/export.');
    await page.locator('#subtab-basicinfo #xpInput').fill('48000'); // ниво 9
    await page.locator('#subtab-basicinfo #xpInput').blur();
    await page.waitForTimeout(300);
    
    // Level should still be 1 (level up happens on Long Rest)
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('1');
    
    // Long rest to trigger level up to 9
    await page.locator('#btnLongRest').click();
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #levelSpan')).toHaveText('9');

    // Open Stats sub-tab for ability scores
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    // Ability scores
    await page.locator('#subtab-stats #strInput').fill('15');
    await page.locator('#subtab-stats #strInput').blur();
    await page.locator('#subtab-stats #dexInput').fill('17');
    await page.locator('#subtab-stats #dexInput').blur();
    await page.locator('#subtab-stats #conInput').fill('14');
    await page.locator('#subtab-stats #conInput').blur();
    await page.locator('#subtab-stats #intInput').fill('12');
    await page.locator('#subtab-stats #intInput').blur();
    await page.locator('#subtab-stats #wisInput').fill('16');
    await page.locator('#subtab-stats #wisInput').blur();
    await page.locator('#subtab-stats #chaInput').fill('11');
    await page.locator('#subtab-stats #chaInput').blur();

    // Combat-related numeric fields - back to Basic Info
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-basicinfo #unarmedMagicInput').fill('1');
    await page.locator('#subtab-basicinfo #meleeWeaponMagicInput').fill('3');
    await page.locator('#subtab-basicinfo #rangedMagicInput').fill('2');
    await page.locator('#subtab-basicinfo #homebrewHp').fill('5');
    await page.locator('#subtab-basicinfo #acMagicInput').fill('1');
    
    // Back to Stats sub-tab for saves
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #saveAllBonusInput').fill('1');

    // Tough feat
    await page.locator('#subtab-stats #toughChk').check();

    // Saving throw proficiencies – включваме всички, за да запълним st.save* флаговете
    await page.locator('#subtab-stats #saveStrProf').check();
    await page.locator('#subtab-stats #saveDexProf').check();
    await page.locator('#subtab-stats #saveConProf').check();
    await page.locator('#subtab-stats #saveIntProf').check();
    await page.locator('#subtab-stats #saveWisProf').check();
    await page.locator('#subtab-stats #saveChaProf').check();

    // Ki / HP / HD – малко действие, за да са различни от default
    await page.locator('#hpDelta').fill('3');
    await page.locator('#btnDamage').click();          // HP 66 → 63 (след tough на level 9)
    await page.locator('#kiDelta').fill('1');
    await page.locator('#btnSpendKi').click();         // kiCurrent намаля

    // Skills – просто отваряме таба, за да сме сигурни, че lazy логиката не чупи bundle.
    await page.locator('button[data-tab="skills"]').click();
    await page.waitForTimeout(300);

    // PC Characteristics
    await page.locator('button[data-tab="pcchar"]').click();
    await page.locator('#pcPersonality').fill('Спокоен, но подозрителен към демони.');
    await page.locator('#pcBond').fill('Дължи живота си на учителя от манастира.');
    await page.locator('#pcFlaw').fill('Склонен е да поема прекомерни рискове.');

    // Languages & Tools
    await page.locator('#btnLangAdd').click();
    await page.locator('#pcModalName').fill('Elvish');
    await page.locator('#pcModalSave').click();

    await page.locator('#btnToolAdd').click();
    await page.locator('#pcModalName').fill('Brewer\'s Supplies');
    await page.locator('#pcModalSave').click();

    // Inventory – 2 предмета
    await page.locator('button[data-tab="inventory"]').click();
    await page.waitForTimeout(300); // Wait for tab HTML to load and event listeners to attach
    await page.locator('#btnInvAdd').click();
    await page.waitForTimeout(100); // Wait for modal to open
    await page.locator('#invName').fill('Rope');
    await page.locator('#invQty').fill('1');
    await page.locator('#invNote').fill('50-ft hempen rope.');
    await page.locator('#invSave').click();
    await page.waitForTimeout(200); // Wait for save to complete

    await page.locator('#btnInvAdd').click();
    await page.waitForTimeout(100); // Wait for modal to open
    await page.locator('#invName').fill('Healing Potion');
    await page.locator('#invQty').fill('3');
    await page.locator('#invNote').fill('Закупени от местния алхимик.');
    await page.locator('#invSave').click();
    await page.waitForTimeout(200); // Wait for save to complete

    // Aliases – един запис
    await page.locator('button[data-tab="shenanigans"]').click();
    await page.locator('#btnGetName').click();
    await page.waitForTimeout(500);
    const aliasName = await page.locator('#fakeNameOutput').inputValue();
    await page.locator('#btnSaveAlias').click();
    await page.locator('#aliasToInput').fill('Псевдоним за тайни мисии.');
    await page.locator('#aliasConfirm').click();

    // Familiars – един запис
    await page.locator('button[data-tab="familiars"]').click();
    await page.locator('.fam-btn[data-famcat="avian"]').click();
    await page.waitForTimeout(500);
    await page.locator('#btnFamSave').click();
    await page.locator('#famNoteInput').fill('Ястреб наблюдател.');
    await page.locator('#famConfirm').click();

    // Изчакваме всичко да се запише/rendere-не
    await page.waitForTimeout(500);

    // 2) Заснемаме state „преди“ от localStorage
    const before = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('monkSheet_v3'));
    });

    // 3) Генерираме bundle
    const bundle = await page.evaluate(() => {
      if (typeof window.buildBundle === 'function') {
        return window.buildBundle();
      }
      if (typeof window.getBundle === 'function') {
        return window.getBundle();
      }
      return null;
    });
    expect(bundle).toBeTruthy();
    
    // Verify hpCurrent is in bundle
    expect(bundle.state).toBeTruthy();
    expect(bundle.state.hpCurrent).toBe(63); // Should be 63 after damage (66 - 3, where 66 = 48 + 18 from tough at level 9, and 48 is from Long Rest with CON 10)

    // 4) Забравяме state-а и прилагаме bundle през applyBundle()
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(b => {
      // applyBundle е глобална функция от app.js
      // @ts-ignore
      window.applyBundle(b);
    }, bundle);

    await page.waitForTimeout(500);

    const after = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('monkSheet_v3'));
    });

    // 5) Очакваме целият state да е идентичен (всички полета).
    // SessionNotes се пази отделно на диск и не е част от bundle v2, затова
    // го игнорираме в този round-trip тест.
    const stripSessionNotes = (s) => {
      if (!s) return s;
      const copy = JSON.parse(JSON.stringify(s));
      delete copy.sessionNotes;
      return copy;
    };
    expect(stripSessionNotes(after)).toEqual(stripSessionNotes(before));
    
    // 6) Проверяваме специфично новите полета за magic attack bonuses
    await page.reload();
    // HP трябва да е 63 (запазено в bundle-а след damage на ред 295)
    await expect(page.locator('#hpCurrentSpan')).toHaveText('63', { timeout: 10000 });
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    
    // Проверяваме стойностите на полетата
    const unarmedValue = await page.locator('#subtab-basicinfo #unarmedMagicInput').inputValue();
    const weaponValue = await page.locator('#subtab-basicinfo #meleeWeaponMagicInput').inputValue();
    const rangedValue = await page.locator('#subtab-basicinfo #rangedMagicInput').inputValue();
    
    expect(unarmedValue).toBe('1');
    expect(weaponValue).toBe('3');
    expect(rangedValue).toBe('2');
  });

});

