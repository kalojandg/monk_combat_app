import { test, expect } from '@playwright/test';

/**
 * CLERIC CLASS PROFILE (Grave Cleric, без мултиклас)
 *
 * Чисто формулен спек: вика window.CLASS_PROFILES.cleric.derive(st, base) директно,
 * БЕЗ да сменя активния герой. `base` се взема от window.derived() (неутралната част
 * идва наготово от app.js), а st е изолиран обект — живият монк не се пипа.
 */

test.describe('Cleric class profile', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  // Помощник в браузъра: base с дадени модове/prof + derive на клерика
  const runDerive = (page, stPatch, basePatch = {}) => page.evaluate(({ stPatch, basePatch }) => {
    const mods = { str: 0, dex: 0, con: 0, int_: 0, wis: 0, cha: 0, ...(basePatch.mods || {}) };
    const base = { ...window.derived(), ...basePatch, mods };
    const st = { baseSpeed: 30, acMagic: 0, unarmedMagic: 0, armorAc: 0, armorMaxDex: null, ...stPatch };
    return window.CLASS_PROFILES.cleric.derive(st, base);
  }, { stPatch, basePatch });

  test('(a) CLASS_PROFILES.cleric exposes the full contract', async ({ page }) => {
    const p = await page.evaluate(() => {
      const c = window.CLASS_PROFILES && window.CLASS_PROFILES.cleric;
      if (!c) return null;
      return {
        id: c.id, label: c.label, storageKey: c.storageKey,
        defaults: c.defaults, deriveType: typeof c.derive,
        hiddenFieldIds: c.hiddenFieldIds,
        hasClassBadges: c.hasClassBadges, hasLevelUpModal: c.hasLevelUpModal, restoresKi: c.restoresKi
      };
    });
    expect(p).toEqual({
      id: 'cleric', label: 'Cleric', storageKey: 'cleric_v1',
      defaults: { armorAc: 0, armorMaxDex: null }, deriveType: 'function',
      hiddenFieldIds: ['monkLevelSpan', 'maDieSpan', 'kiMaxSpan', 'kiSaveDcSpan2', 'kiSaveDcMagicInput', 'umBonusSpan'],
      hasClassBadges: false, hasLevelUpModal: false, restoresKi: false
    });
  });

  test('(b) no armor: AC = 10 + DEX + acMagic', async ({ page }) => {
    const r = await runDerive(page, { armorAc: 0, acMagic: 1 }, { mods: { dex: 3 } });
    expect(r.ac).toBe(14);
    const empty = await runDerive(page, { armorAc: '', acMagic: 0 }, { mods: { dex: 2 } });
    expect(empty.ac).toBe(12);
  });

  test('(c) half plate (15, max dex 2) caps DEX', async ({ page }) => {
    const hi = await runDerive(page, { armorAc: 15, armorMaxDex: 2 }, { mods: { dex: 4 } });
    expect(hi.ac).toBe(17);
    const lo = await runDerive(page, { armorAc: 15, armorMaxDex: 2 }, { mods: { dex: 1 } });
    expect(lo.ac).toBe(16);
  });

  test('(d) armorMaxDex null/empty means no cap', async ({ page }) => {
    const n = await runDerive(page, { armorAc: 11, armorMaxDex: null, acMagic: 1 }, { mods: { dex: 4 } });
    expect(n.ac).toBe(16);
    const e = await runDerive(page, { armorAc: 11, armorMaxDex: '' }, { mods: { dex: 4 } });
    expect(e.ac).toBe(15);
  });

  test('(e) no monk-only or CHA fields in the result', async ({ page }) => {
    const r = await runDerive(page, {}, { mods: { dex: 2, wis: 3, cha: 1 } });
    for (const k of ['ma', 'kiMax', 'kiSaveDC', 'um', 'spellSaveDC_CHA', 'spellAtk_CHA']) {
      expect(r).not.toHaveProperty(k);
    }
  });

  test('(f) totalSpeed === st.baseSpeed regardless of level', async ({ page }) => {
    for (const level of [1, 6, 10, 18, 20]) {
      const r = await runDerive(page, { baseSpeed: 25, level, clericLevel: level }, { level });
      expect(r.totalSpeed).toBe(25);
    }
  });

  test('(g) meleeAtk = 1 + STR mod + unarmedMagic', async ({ page }) => {
    const r = await runDerive(page, { unarmedMagic: 2 }, { mods: { str: 3, dex: 4 }, prof: 3 });
    expect(r.meleeAtk).toBe(6);
    const plain = await runDerive(page, {}, { mods: { str: -1 }, prof: 2 });
    expect(plain.meleeAtk).toBe(0);
  });

  test('(h) spellSaveDC_WIS = 8 + prof + WIS mod', async ({ page }) => {
    const r = await runDerive(page, {}, { mods: { wis: 4 }, prof: 3 });
    expect(r.spellSaveDC_WIS).toBe(15);
    expect(r.spellAtk_WIS).toBe(7);
  });
});
