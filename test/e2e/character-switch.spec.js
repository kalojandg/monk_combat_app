import { test, expect } from '@playwright/test';

/**
 * CHARACTER SWITCH
 *
 * Всеки герой има СОБСТВЕН st в СОБСТВЕН localStorage ключ (profile.storageKey).
 * Указателят localStorage['activeCharacter'] казва кой е активен; липсва → монк.
 * Вторият герой тук е тестов профил ('testhero'), регистриран преди app скриптовете —
 * така спекът не зависи от кой реален втори клас е мърджнат.
 */

const SECOND = 'testhero';
const SECOND_KEY = 'testHeroSheet_v1';

async function registerSecondProfile(page) {
  await page.addInitScript(([id, key]) => {
    window.CLASS_PROFILES = window.CLASS_PROFILES || {};
    window.CLASS_PROFILES[id] = {
      id, label: 'Test Hero', storageKey: key,
      defaults: { name: 'Second' },
      derive: (s, b) => window.CLASS_PROFILES.monk.derive(s, b),
      hiddenFieldIds: [], hasClassBadges: true, hasLevelUpModal: true, restoresKi: true
    };
  }, [SECOND, SECOND_KEY]);
}

async function ready(page) {
  await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
}

test.describe('Character switching', () => {

  test.beforeEach(async ({ page }) => {
    await registerSecondProfile(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    // Монкът е посят — точно както ~51 други спека правят
    await page.evaluate(() => localStorage.setItem('monkSheet_v3', JSON.stringify({ name: 'Monky', hpCurrent: 5 })));
    await page.reload();
    await ready(page);
    await expect(page.locator('#hpCurrentSpan')).toHaveText('5', { timeout: 10000 });
  });

  test('(a) default active is monk and monkSheet_v3 is read as before', async ({ page }) => {
    const r = await page.evaluate(() => ({
      active: window.Characters.active(),
      pointer: localStorage.getItem('activeCharacter'),
      name: window.st.name,
      list: window.Characters.list()
    }));
    expect(r.active).toBe('monk');
    expect(r.pointer).toBeNull();
    expect(r.name).toBe('Monky');
    const monk = r.list.find(c => c.id === 'monk');
    expect(monk).toMatchObject({ id: 'monk', storageKey: 'monkSheet_v3', hasSave: true, active: true });
    expect(r.list.find(c => c.id === SECOND)).toMatchObject({ hasSave: false, active: false });
  });

  test('(b) switching to a second hero creates a NEW key and leaves monkSheet_v3 intact', async ({ page }) => {
    const before = await page.evaluate(() => localStorage.getItem('monkSheet_v3'));
    expect(before).not.toBeNull();

    await page.evaluate((id) => window.Characters.switchTo(id), SECOND);

    const r = await page.evaluate((key) => ({
      monk: localStorage.getItem('monkSheet_v3'),
      second: localStorage.getItem(key),
      pointer: localStorage.getItem('activeCharacter'),
      name: window.st.name,
      cls: window.st.class
    }), SECOND_KEY);
    expect(r.monk).toBe(before);
    expect(r.second).not.toBeNull();
    expect(r.pointer).toBe(SECOND);
    expect(r.name).toBe('Second');          // profile.defaults
    expect(r.cls).toBe(SECOND);

    // Запис по втория герой не докосва монка
    await page.evaluate(() => { window.st.hpCurrent = 2; window.save(); });
    expect(await page.evaluate(() => localStorage.getItem('monkSheet_v3'))).toBe(before);
  });

  test('(c) changes on one hero are not visible on the other', async ({ page }) => {
    await page.evaluate((id) => window.Characters.switchTo(id), SECOND);
    await page.evaluate(() => { window.st.hpCurrent = 3; window.save(); });

    await page.evaluate(() => window.Characters.switchTo('monk'));
    expect(await page.evaluate(() => window.st.hpCurrent)).toBe(5);
    await page.evaluate(() => { window.st.hpCurrent = 4; window.save(); });

    await page.evaluate((id) => window.Characters.switchTo(id), SECOND);
    expect(await page.evaluate(() => window.st.hpCurrent)).toBe(3);
    const monkSaved = await page.evaluate(() => JSON.parse(localStorage.getItem('monkSheet_v3')).hpCurrent);
    expect(monkSaved).toBe(4);
  });

  test('(d) switching back and forth keeps both heroes\' values', async ({ page }) => {
    // Незаписана промяна по монка — switchTo трябва да я запише ПРЕДИ смяната
    await page.evaluate(() => { window.st.name = 'Monk Edited'; });
    await page.evaluate((id) => window.Characters.switchTo(id), SECOND);
    await page.evaluate(() => { window.st.name = 'Hero Edited'; });

    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.Characters.switchTo('monk'));
      expect(await page.evaluate(() => window.st.name)).toBe('Monk Edited');
      await page.evaluate((id) => window.Characters.switchTo(id), SECOND);
      expect(await page.evaluate(() => window.st.name)).toBe('Hero Edited');
    }
  });

  test('(e) switching re-renders the screen (combat pills show the new hero)', async ({ page }) => {
    await page.evaluate((id) => window.Characters.switchTo(id), SECOND);
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8'); // defaultState
    await page.evaluate(() => { window.st.hpCurrent = 6; window.save(); });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('6');

    // През UI превключвателя
    const monkBtn = page.locator('#charSwitcher [data-char="monk"]');
    await expect(monkBtn).toBeVisible();
    await monkBtn.click();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('5');
    await expect(monkBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator(`#charSwitcher [data-char="${SECOND}"]`)).toHaveAttribute('aria-pressed', 'false');

    await page.locator(`#charSwitcher [data-char="${SECOND}"]`).click();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('6');
  });

  test('(f) the active hero survives reload', async ({ page }) => {
    await page.evaluate((id) => window.Characters.switchTo(id), SECOND);
    await page.evaluate(() => { window.st.hpCurrent = 7; window.save(); });

    await page.reload();
    await ready(page);
    await expect(page.locator('#hpCurrentSpan')).toHaveText('7', { timeout: 10000 });
    const r = await page.evaluate(() => ({ active: window.Characters.active(), name: window.st.name }));
    expect(r).toEqual({ active: SECOND, name: 'Second' });
    await expect(page.locator(`#charSwitcher [data-char="${SECOND}"]`)).toHaveAttribute('aria-pressed', 'true');
  });
});
