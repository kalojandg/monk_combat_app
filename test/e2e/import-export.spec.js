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
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  test('buildBundle() съдържа текущото UI състояние', async ({ page }) => {
    // 1) Настройваме няколко полета през UI (разпръснати по табове)

    // Име + XP + DEX на Stats таб
    await page.locator('button[data-tab="stats"]').click();
    await page.locator('#charName').fill('Тестов Монах');
    await page.locator('#xpInput').fill('6500'); // ниво 5
    await page.locator('#xpInput').blur();
    await page.locator('#dexInput').fill('16');
    await page.locator('#dexInput').blur();

    // PC Characteristics таб
    await page.locator('button[data-tab="pcchar"]').click();
    await page.locator('#pcPersonality').fill('Спокоен, обмислен, любител на чай.');
    await page.locator('#pcBond').fill('Заклел се е да пази манастира.');
    await page.locator('#pcFlaw').fill('Натрапчиво пресмята всичко в бой.');

    // Notes (глобално поле)
    await page.locator('button[data-tab="stats"]').click();
    await page.locator('#notes').fill('Бележка за теста на import/export.');

    // Inventory – добавяме един прост запис през вече тестваните бутони
    await page.locator('button[data-tab="inventory"]').click();
    await page.locator('#btnInvAdd').click();
    await page.locator('#invName').fill('Тестов кинжал');
    await page.locator('#invQty').fill('2');
    await page.locator('#invNote').fill('От тестовия bundle.');
    await page.locator('#invSave').click();

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
    await page.locator('#charName').fill('Roundtrip Монах');
    await page.locator('#xpInput').fill('9000'); // ниво 6
    await page.locator('#xpInput').blur();
    await page.locator('#wisInput').fill('18');
    await page.locator('#wisInput').blur();

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

    // 3) "Забравяме" текущото състояние – чист localStorage и reload
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });

    // Уверяваме се, че името е в default стойността от defaultState
    await page.locator('button[data-tab="stats"]').click();
    await expect(page.locator('#charName')).toHaveValue('Пийс Ошит');

    // 4) Импортираме bundle чрез applyBundle(bundle)
    await page.evaluate(b => {
      // applyBundle е глобална функция от app.js
      // @ts-ignore
      window.applyBundle(b);
    }, bundle);

    // Изчакваме renderAll да мине
    await page.waitForTimeout(300);

    // 5) Проверяваме, че UI е възстановен от bundle-а

    // Stats
    await page.locator('button[data-tab="stats"]').click();
    await expect(page.locator('#charName')).toHaveValue('Roundtrip Монах');
    await expect(page.locator('#xpInput')).toHaveValue('9000');
    await expect(page.locator('#wisInput')).toHaveValue('18');

    // Ниво и Ki/HD трябва да съответстват на XP от bundle-а (вече се тестват подробно
    // в rest-mechanics.spec.js), тук само проверяваме, че не са default.
    await expect(page.locator('#levelSpan')).not.toHaveText('1');

    // PC Characteristics
    await page.locator('button[data-tab="pcchar"]').click();
    await expect(page.locator('#pcPersonality')).toHaveValue('Спокоен пазител на портите.');
  });

  test('FULL STATE ROUND-TRIP: UI → bundle → applyBundle() пази всички полета', async ({ page }) => {
    // 1) Попълваме ВЪЗМОЖНО НАЙ-МНОГО полета през UI, за да не остават default стойности
    // Stats
    await page.locator('button[data-tab="stats"]').click();
    await page.locator('#charName').fill('Full Roundtrip Монах');
    await page.locator('#notes').fill('Големият тест за import/export.');
    await page.locator('#xpInput').fill('48000'); // ниво 9
    await page.locator('#xpInput').blur();

    // Ability scores
    await page.locator('#strInput').fill('15');
    await page.locator('#strInput').blur();
    await page.locator('#dexInput').fill('17');
    await page.locator('#dexInput').blur();
    await page.locator('#conInput').fill('14');
    await page.locator('#conInput').blur();
    await page.locator('#intInput').fill('12');
    await page.locator('#intInput').blur();
    await page.locator('#wisInput').fill('16');
    await page.locator('#wisInput').blur();
    await page.locator('#chaInput').fill('11');
    await page.locator('#chaInput').blur();

    // Combat-related numeric fields
    await page.locator('#meleeMagicInput').fill('1');
    await page.locator('#rangedMagicInput').fill('2');
    await page.locator('#homebrewHp').fill('5');
    await page.locator('#acMagicInput').fill('1');
    await page.locator('#saveAllBonusInput').fill('1');

    // Tough feat
    await page.locator('#toughChk').check();

    // Saving throw proficiencies – включваме всички, за да запълним st.save* флаговете
    await page.locator('#saveStrProf').check();
    await page.locator('#saveDexProf').check();
    await page.locator('#saveConProf').check();
    await page.locator('#saveIntProf').check();
    await page.locator('#saveWisProf').check();
    await page.locator('#saveChaProf').check();

    // Ki / HP / HD – малко действие, за да са различни от default
    await page.locator('#hpDelta').fill('3');
    await page.locator('#btnDamage').click();          // HP 8 → 5
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
    await page.locator('#btnInvAdd').click();
    await page.locator('#invName').fill('Rope');
    await page.locator('#invQty').fill('1');
    await page.locator('#invNote').fill('50-ft hempen rope.');
    await page.locator('#invSave').click();

    await page.locator('#btnInvAdd').click();
    await page.locator('#invName').fill('Healing Potion');
    await page.locator('#invQty').fill('3');
    await page.locator('#invNote').fill('Закупени от местния алхимик.');
    await page.locator('#invSave').click();

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
  });

});

