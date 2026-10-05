import { test, expect } from '@playwright/test';

/**
 * LOCAL SPELLS (local-spells.json)
 *
 * Заклинания, които ги НЯМА в dnd5eapi — кампанийни и публикувани извън SRD.
 * Данните живеят във файл, не в кода, защото списъкът расте: потребителят
 * добавя заклинания, без да се пипа spells-mark.js.
 *
 * Ключовете са собствени: Holy Word стоеше под чуждия ключ 'sacred-flame',
 * което щеше да се сблъска със Sacred Flame, щом тя влезе от API-то.
 */

const SCHOOLS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'];

async function loadLocal(page) {
  await page.goto('/');
  return page.evaluate(() => fetch('local-spells.json').then(r => r.json()));
}

test.describe('local-spells.json — данните', () => {

  test('файлът е валиден и съдържа всички заклинания', async ({ page }) => {
    const data = await loadLocal(page);
    expect(typeof data).toBe('object');
    expect(Object.keys(data).length).toBe(32);
  });

  test('Holy Word е под СВОЙ ключ, а sacred-flame е свободен за API-то', async ({ page }) => {
    const data = await loadLocal(page);
    expect(data['holy-word']).toBeDefined();
    expect(data['holy-word'].name).toBe('Holy Word');
    expect(data['holy-word'].level).toBe(0);
    expect(data['holy-word'].desc.join(' ')).toContain('celestial power is not for the tainted');
    // ключът на Sacred Flame НЕ е зает — тя идва от API-то
    expect(data['sacred-flame']).toBeUndefined();
  });

  test('заварените заклинания не са изгубени', async ({ page }) => {
    const data = await loadLocal(page);
    expect(data['ray-of-sickness']).toBeDefined();
    expect(data['ray-of-sickness'].desc.join(' ')).toContain('sickening greenish energy');
  });

  test('всеки запис е пълен и годен за рендериране', async ({ page }) => {
    const data = await loadLocal(page);
    for (const [key, s] of Object.entries(data)) {
      expect(key, 'ключът е slug').toMatch(/^[a-z0-9-]+$/);
      expect(s.name, key + ': име').toBeTruthy();
      expect(typeof s.level, key + ': ниво').toBe('number');
      expect(s.level, key + ': ниво 0-9').toBeGreaterThanOrEqual(0);
      expect(s.level, key + ': ниво 0-9').toBeLessThanOrEqual(9);
      expect(SCHOOLS, key + ': школа').toContain(s.school.name);
      expect(Array.isArray(s.components) && s.components.length, key + ': компоненти').toBeTruthy();
      expect(Array.isArray(s.desc) && s.desc.length, key + ': описание').toBeTruthy();
      expect(s.range, key + ': обхват').toBeTruthy();
      expect(s.duration, key + ': времетраене').toBeTruthy();
      for (const c of s.components) expect(['V', 'S', 'M'], key + ': валиден компонент').toContain(c);
      if (s.components.includes('M') && s.material) expect(typeof s.material).toBe('string');
    }
  });

  test('няма дублирани имена', async ({ page }) => {
    const data = await loadLocal(page);
    const names = Object.values(data).map(s => s.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

test.describe('local-spells.json — в приложението', () => {

  test('Holy Word се рендерира от файла, БЕЗ заявка към API-то', async ({ page }) => {
    let apiHits = 0;
    await page.route('**/api/spells/*', async (route) => {
      apiHits++;
      await route.fulfill({ json: { index: 'x', name: 'ОТ API', level: 0, desc: ['чужд текст'] } });
    });
    await page.route('**/api/classes/cleric/levels/*', async (route) => {
      await route.fulfill({ json: { prof_bonus: 2, spellcasting: { spell_slots_level_1: 2 } } });
    });

    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await page.locator('button.tab-btn', { hasText: 'Resurrection' }).click();
    await page.waitForTimeout(400);

    // Ключът трябва да е СОБСТВЕН: иначе Sacred Flame няма къде да влезе от API-то
    await expect(page.locator('#wis-cantrips-root .mark-spell-item[data-index="holy-word"]')).toHaveCount(1);
    await expect(page.locator('#wis-cantrips-root .mark-spell-item[data-index="sacred-flame"]')).toHaveCount(0);

    const item = page.locator('#wis-cantrips-root .mark-spell-item', { hasText: 'Holy Word' }).first();
    await expect(item).toBeVisible();
    const before = apiHits;
    await item.click();
    await page.waitForTimeout(300);

    await expect(item).toContainText('celestial power is not for the tainted');
    await expect(item).not.toContainText('чужд текст');
    expect(apiHits, 'Holy Word не минава през API-то').toBe(before);
  });
});
