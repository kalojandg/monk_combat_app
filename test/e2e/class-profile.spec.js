import { test, expect } from '@playwright/test';

/**
 * CLASS PROFILE SEAMS
 *
 * Скелетът за втори герой: класов профил (window.CLASS_PROFILES), индиректен
 * storage ключ (activeCharacter → profile.storageKey), hiddenFieldIds в renderAll
 * и window.Campaign фасадата. Монкът е профилът по подразбиране и НИЩО видимо
 * не се променя за него.
 */

test.describe('Class profiles', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  test('(a) CLASS_PROFILES.monk exposes the full contract', async ({ page }) => {
    const p = await page.evaluate(() => {
      const m = window.CLASS_PROFILES && window.CLASS_PROFILES.monk;
      if (!m) return null;
      return {
        id: m.id, label: m.label, storageKey: m.storageKey,
        defaults: m.defaults, deriveType: typeof m.derive,
        hiddenFieldIds: m.hiddenFieldIds,
        hasClassBadges: m.hasClassBadges, hasLevelUpModal: m.hasLevelUpModal, restoresKi: m.restoresKi
      };
    });
    expect(p).toEqual({
      id: 'monk', label: 'Monk', storageKey: 'monkSheet_v3',
      defaults: {}, deriveType: 'function',
      hiddenFieldIds: [],
      hasClassBadges: true, hasLevelUpModal: true, restoresKi: true
    });
  });

  test('(b) activeProfile() is monk by default and without the pointer', async ({ page }) => {
    const r = await page.evaluate(() => {
      localStorage.removeItem('activeCharacter');
      return {
        id: window.activeProfile().id,
        key: window.activeStorageKey(),
        pointer: localStorage.getItem('activeCharacter')
      };
    });
    expect(r).toEqual({ id: 'monk', key: 'monkSheet_v3', pointer: null });

    // Монкът продължава да пише точно в monkSheet_v3
    await page.evaluate(() => { window.st.name = 'Probe'; window.save(); });
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('monkSheet_v3')).name);
    expect(saved).toBe('Probe');
  });

  for (const lvl of [1, 5, 11]) {
    test(`(c) derived() matches the monk profile at level ${lvl}`, async ({ page }) => {
      const r = await page.evaluate((lvl) => {
        Object.assign(window.st, { level: lvl, monkLevel: lvl, clericLevel: 0, dex: 16, wis: 14 });
        const d = window.derived();
        const p = window.CLASS_PROFILES.monk.derive(window.st, d);
        const keys = ['kiMax', 'ma', 'ac', 'um', 'totalSpeed', 'meleeAtk', 'kiSaveDC'];
        const pick = o => Object.fromEntries(keys.map(k => [k, o[k]]));
        return { d: pick(d), p: pick(p) };
      }, lvl);
      expect(r.d).toEqual(r.p);

      const expected = {
        1: { kiMax: 1, ma: 'd4', ac: 15, um: 0, totalSpeed: 30, meleeAtk: 5, kiSaveDC: 12 },
        5: { kiMax: 5, ma: 'd6', ac: 15, um: 10, totalSpeed: 40, meleeAtk: 6, kiSaveDC: 13 },
        11: { kiMax: 11, ma: 'd8', ac: 15, um: 20, totalSpeed: 50, meleeAtk: 7, kiSaveDC: 14 }
      };
      expect(r.d).toEqual(expected[lvl]);
    });
  }

  test('(d) hiddenFieldIds hides the closest .field; empty list shows it', async ({ page }) => {
    await page.locator('button[data-tab="stats"]').click();
    await page.locator('button[data-subtab="basicinfo"]').click();
    const field = page.locator('#subtab-basicinfo .field', { has: page.locator('#maDieSpan') });
    await expect(field).toBeVisible();

    await page.evaluate(() => {
      window.CLASS_PROFILES.monk.hiddenFieldIds = ['maDieSpan'];
      window.save();
    });
    await expect(field).toBeHidden();
    // Съседът в реда остава — редът не се крие, докато има видимо поле
    await expect(page.locator('#subtab-basicinfo #profSpan2')).toBeVisible();

    await page.evaluate(() => {
      window.CLASS_PROFILES.monk.hiddenFieldIds = [];
      window.save();
    });
    await expect(field).toBeVisible();
  });

  test('(d2) a row whose fields are all hidden is hidden too', async ({ page }) => {
    await page.locator('button[data-tab="stats"]').click();
    await page.locator('button[data-subtab="basicinfo"]').click();
    const row = page.locator('#subtab-basicinfo .row-grid', { has: page.locator('#maDieSpan') });
    await expect(row).toBeVisible();

    await page.evaluate(() => {
      window.CLASS_PROFILES.monk.hiddenFieldIds = ['maDieSpan', 'profSpan2'];
      window.save();
    });
    await expect(row).toBeHidden();

    await page.evaluate(() => {
      window.CLASS_PROFILES.monk.hiddenFieldIds = [];
      window.save();
    });
    await expect(row).toBeVisible();
  });

  test('(e) Campaign facade reads/writes st.campaignNpcs and st.sessionNotes', async ({ page }) => {
    const r = await page.evaluate(() => {
      window.st.campaignNpcs = [{ name: 'Rasputin', faction: 'Kislev', description: '', location: '' }];
      const same = window.Campaign.getNpcs() === window.st.campaignNpcs;
      window.Campaign.setNpcs([{ name: 'X', faction: '', description: '', location: '' }]);
      window.Campaign.setNotes('hello');
      return {
        same,
        npcs: window.st.campaignNpcs.map(n => n.name),
        notes: window.st.sessionNotes,
        getNotes: window.Campaign.getNotes()
      };
    });
    expect(r).toEqual({ same: true, npcs: ['X'], notes: 'hello', getNotes: 'hello' });
  });
});
