import { test, expect } from '@playwright/test';

/**
 * NPC NAMES TAB TESTS
 *
 * Тестват: навигация, генериране на имена по раса/пол,
 * запазване с бележка, таблица, изтриване, persistence, export/import.
 */

test.describe('NPC Names - Tab Navigation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  test('NPC Names tab button exists and is clickable', async ({ page }) => {
    const btn = page.locator('button[data-tab="npc-names"]');
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(page.locator('#tab-npc-names')).not.toHaveClass(/hidden/);
  });

  test('Tab shows race radio buttons for all 7 races', async ({ page }) => {
    await page.locator('button[data-tab="npc-names"]').click();
    await page.waitForTimeout(300);

    const races = ['human', 'elf', 'dwarf', 'halfling', 'tiefling', 'orc', 'toblin'];
    for (const race of races) {
      await expect(page.locator(`input[name="npcRace"][value="${race}"]`)).toBeVisible();
    }
  });

  test('Tab shows gender radio buttons (male/female)', async ({ page }) => {
    await page.locator('button[data-tab="npc-names"]').click();
    await page.waitForTimeout(300);

    await expect(page.locator('input[name="npcGender"][value="male"]')).toBeVisible();
    await expect(page.locator('input[name="npcGender"][value="female"]')).toBeVisible();
  });

  test('Tab shows Generate button and disabled Save button', async ({ page }) => {
    await page.locator('button[data-tab="npc-names"]').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#btnGenerateName')).toBeVisible();
    await expect(page.locator('#btnSaveName')).toBeDisabled();
  });

});

test.describe('NPC Names - Race/Gender Selection', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="npc-names"]').click();
    await page.waitForTimeout(300);
  });

  test('Gender group is hidden when Toblin is selected', async ({ page }) => {
    await page.locator('input[name="npcRace"][value="toblin"]').check();
    await expect(page.locator('#npcGenderGroup')).toBeHidden();
  });

  test('Gender group is visible for non-Toblin races', async ({ page }) => {
    await page.locator('input[name="npcRace"][value="human"]').check();
    await expect(page.locator('#npcGenderGroup')).toBeVisible();

    await page.locator('input[name="npcRace"][value="elf"]').check();
    await expect(page.locator('#npcGenderGroup')).toBeVisible();
  });

  test('Default race is human', async ({ page }) => {
    const checked = await page.locator('input[name="npcRace"]:checked').getAttribute('value');
    expect(checked).toBe('human');
  });

  test('Default gender is male', async ({ page }) => {
    const checked = await page.locator('input[name="npcGender"]:checked').getAttribute('value');
    expect(checked).toBe('male');
  });

});

test.describe('NPC Names - Generate', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="npc-names"]').click();
    await page.waitForTimeout(300);
  });

  test('Generate produces a non-empty name', async ({ page }) => {
    await page.locator('#btnGenerateName').click();
    await page.waitForTimeout(500);
    const name = await page.locator('#npcNameOutput').inputValue();
    expect(name.trim().length).toBeGreaterThan(0);
  });

  test('Generate enables Save button', async ({ page }) => {
    await expect(page.locator('#btnSaveName')).toBeDisabled();
    await page.locator('#btnGenerateName').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#btnSaveName')).toBeEnabled();
  });

  test('Generates human male names', async ({ page }) => {
    await page.locator('input[name="npcRace"][value="human"]').check();
    await page.locator('input[name="npcGender"][value="male"]').check();

    const humanMaleNames = [
      'Артурий Фалкрест', 'Барандис Лофтхар', 'Даремир Стоунбридж',
      'Еледор Уайтхейл', 'Галмир Блекстоун', 'Келвин Рейвмор',
      'Маркориан Тандерлейн', 'Орикс Силвършард', 'Таргом Драгонфорд', 'Ферикс Дускбрингър'
    ];

    // Generate several times and verify each result is from the correct pool
    const seen = new Set();
    for (let i = 0; i < 5; i++) {
      await page.locator('#btnGenerateName').click();
      await page.waitForTimeout(200);
      const name = await page.locator('#npcNameOutput').inputValue();
      expect(humanMaleNames).toContain(name);
      seen.add(name);
    }
  });

  test('Generates toblin names (no gender needed)', async ({ page }) => {
    await page.locator('input[name="npcRace"][value="toblin"]').check();

    const toblinNames = ['Нак','Ворк','Зип','Клуг','Ригг','Тазз','Мук','Скрик','Круг','Виск','Джап','Хрог','Зуб','Крогг','Ворн','Трок'];

    await page.locator('#btnGenerateName').click();
    await page.waitForTimeout(200);
    const name = await page.locator('#npcNameOutput').inputValue();
    expect(toblinNames).toContain(name);
  });

  test('Generates different names across races', async ({ page }) => {
    await page.locator('input[name="npcRace"][value="dwarf"]').check();
    await page.locator('input[name="npcGender"][value="female"]').check();
    await page.locator('#btnGenerateName').click();
    await page.waitForTimeout(300);
    const name = await page.locator('#npcNameOutput').inputValue();

    const dwarfFemaleNames = [
      'Брагарда Сторммаул', 'Дурила Айръншайн', 'Гарелда Силвъртъмбл',
      'Каргрина Рокбрингър', 'Марбелла Голдмайн', 'Нордрина Файрблейз',
      'Тормина Дългорун', 'Улдера Дийпфордж', 'Виргора Глоумхелм', 'Зормила Хамърспир'
    ];
    expect(dwarfFemaleNames).toContain(name);
  });

});

test.describe('NPC Names - Save & Table', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="npc-names"]').click();
    await page.waitForTimeout(300);
  });

  test('Save button opens modal', async ({ page }) => {
    await page.locator('#btnGenerateName').click();
    await page.waitForTimeout(300);
    await page.locator('#btnSaveName').click();
    await expect(page.locator('#npcNameModal')).toBeVisible();
  });

  test('Can save name with description and it appears in table', async ({ page }) => {
    await page.locator('#btnGenerateName').click();
    await page.waitForTimeout(300);
    const name = await page.locator('#npcNameOutput').inputValue();

    await page.locator('#btnSaveName').click();
    await page.locator('#npcNameNote').fill('Тавернджия в Ривърдейл');
    await page.locator('#npcNameConfirm').click();

    const log = page.locator('#npcNamesLog');
    await expect(log).toContainText(name);
    await expect(log).toContainText('Тавернджия в Ривърдейл');
  });

  test('Table has two visible columns - name and description', async ({ page }) => {
    await page.locator('#btnGenerateName').click();
    await page.waitForTimeout(300);
    await page.locator('#btnSaveName').click();
    await page.locator('#npcNameNote').fill('Стражът на портата');
    await page.locator('#npcNameConfirm').click();

    // Should have a table with at least 2 td cells per row
    const cells = page.locator('#npcNamesLog table td');
    await expect(cells.first()).toBeVisible();
    const count = await cells.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('Cancel does not save', async ({ page }) => {
    await page.locator('#btnGenerateName').click();
    await page.waitForTimeout(300);
    await page.locator('#btnSaveName').click();
    await page.locator('#npcNameNote').fill('Не трябва да се запише');
    await page.locator('#npcNameCancel').click();

    await expect(page.locator('#npcNameModal')).not.toBeVisible();
    await expect(page.locator('#npcNamesLog')).not.toContainText('Не трябва да се запише');
  });

  test('Can delete saved name', async ({ page }) => {
    await page.locator('#btnGenerateName').click();
    await page.waitForTimeout(300);
    const name = await page.locator('#npcNameOutput').inputValue();
    await page.locator('#btnSaveName').click();
    await page.locator('#npcNameNote').fill('За изтриване');
    await page.locator('#npcNameConfirm').click();

    await page.waitForTimeout(200);
    await page.locator('.npc-name-del').first().click();

    await expect(page.locator('#npcNamesLog')).not.toContainText('За изтриване');
  });

  test('Can save multiple names', async ({ page }) => {
    // First name
    await page.locator('#btnGenerateName').click();
    await page.waitForTimeout(300);
    const name1 = await page.locator('#npcNameOutput').inputValue();
    await page.locator('#btnSaveName').click();
    await page.locator('#npcNameNote').fill('Първи NPC');
    await page.locator('#npcNameConfirm').click();

    // Second name (different race)
    await page.locator('input[name="npcRace"][value="orc"]').check();
    await page.locator('#btnGenerateName').click();
    await page.waitForTimeout(300);
    await page.locator('#btnSaveName').click();
    await page.locator('#npcNameNote').fill('Втори NPC');
    await page.locator('#npcNameConfirm').click();

    const log = page.locator('#npcNamesLog');
    await expect(log).toContainText('Първи NPC');
    await expect(log).toContainText('Втори NPC');
  });

});

test.describe('NPC Names - Persistence', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  test('Saved NPC names persist across page reload', async ({ page }) => {
    await page.locator('button[data-tab="npc-names"]').click();
    await page.waitForTimeout(300);

    await page.locator('#btnGenerateName').click();
    await page.waitForTimeout(300);
    const name = await page.locator('#npcNameOutput').inputValue();
    await page.locator('#btnSaveName').click();
    await page.locator('#npcNameNote').fill('Persistence тест');
    await page.locator('#npcNameConfirm').click();

    // Reload
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="npc-names"]').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#npcNamesLog')).toContainText(name);
    await expect(page.locator('#npcNamesLog')).toContainText('Persistence тест');
  });

  test('NPC names are included in export bundle', async ({ page }) => {
    await page.locator('button[data-tab="npc-names"]').click();
    await page.waitForTimeout(300);

    await page.locator('#btnGenerateName').click();
    await page.waitForTimeout(300);
    const name = await page.locator('#npcNameOutput').inputValue();
    await page.locator('#btnSaveName').click();
    await page.locator('#npcNameNote').fill('Export тест');
    await page.locator('#npcNameConfirm').click();

    const bundle = await page.evaluate(() => window.buildBundle());
    expect(bundle).toBeTruthy();
    const bundleStr = JSON.stringify(bundle);
    expect(bundleStr).toContain('Export тест');
  });

  test('NPC names survive import round-trip', async ({ page }) => {
    await page.locator('button[data-tab="npc-names"]').click();
    await page.waitForTimeout(300);

    await page.locator('#btnGenerateName').click();
    await page.waitForTimeout(300);
    const name = await page.locator('#npcNameOutput').inputValue();
    await page.locator('#btnSaveName').click();
    await page.locator('#npcNameNote').fill('Round-trip тест');
    await page.locator('#npcNameConfirm').click();

    // Build bundle, clear state, apply bundle
    await page.evaluate(() => {
      const bundle = window.buildBundle();
      localStorage.clear();
      window.applyBundle(bundle);
    });
    await page.waitForTimeout(300);

    await page.locator('button[data-tab="npc-names"]').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#npcNamesLog')).toContainText(name);
    await expect(page.locator('#npcNamesLog')).toContainText('Round-trip тест');
  });

});
