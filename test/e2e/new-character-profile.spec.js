import { test, expect } from '@playwright/test';

/**
 * NEW CHARACTER × CLASS PROFILE
 *
 * „Нов герой" прави герой от АКТИВНИЯ профил в НЕГОВИЯ ключ. Преди контейнера за
 * герои модулът беше изцяло монашески: хардкоднат `monkSheet_v3`, state без маркера
 * `class` (→ app.js пада към монк: баджове, ки, монашески формули) и пулове (HP/HD),
 * смятани по СТАРИЯ герой, защото `derived()` чете app.js `st`, а не `window.st`.
 */

async function ready(page) {
  await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
}

async function freshPage(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await ready(page);
  await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 8000 });
}

async function switchTo(page, id) {
  await page.locator(`#charSwitcher [data-char="${id}"]`).click();
  await expect(page.locator(`#charSwitcher [data-char="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
}

// Отваря модала, приемайки предупреждението, ако изобщо се появи
async function openModal(page) {
  page.on('dialog', d => d.accept());
  await page.locator('#btnNewChar').click();
  await expect(page.locator('#newCharModal')).not.toHaveClass(/hidden/);
}

async function createNow(page) {
  await openModal(page);
  await page.locator('#newCharConfirm').click();
  await expect(page.locator('#newCharModal')).toHaveClass(/hidden/);
}

test.describe('New Character follows the active profile', () => {

  test.beforeEach(async ({ page }) => { await freshPage(page); });

  test('(a) new hero on the cleric stays a cleric — marker, badges, profile', async ({ page }) => {
    await switchTo(page, 'cleric');
    await createNow(page);

    expect(await page.evaluate(() => window.st.class)).toBe('cleric');
    expect(await page.evaluate(() => window.activeProfile().id)).toBe('cleric');
    // Баджовете [Monk]/[Cleric] са само на монка (линейна прогресия при клерика)
    await expect(page.locator('#class-badges')).toBeHidden();
    await expect(page.locator(`#charSwitcher [data-char="cleric"]`)).toHaveAttribute('aria-pressed', 'true');
  });

  test('(b) the new hero is written to his own key; the other hero is untouched', async ({ page }) => {
    await page.evaluate(() => { window.st.name = 'Старият монк'; window.save(); });
    await switchTo(page, 'cleric');
    await page.evaluate(() => { window.st.name = 'Старият клерик'; window.save(); });

    await createNow(page);

    const keys = await page.evaluate(() => ({
      monk: JSON.parse(localStorage.getItem('monkSheet_v3') || '{}').name,
      cleric: JSON.parse(localStorage.getItem('cleric_v1') || '{}').name,
      clericClass: JSON.parse(localStorage.getItem('cleric_v1') || '{}').class,
    }));
    expect(keys.monk).toBe('Старият монк');
    expect(keys.cleric).toBe('Пийс Ошит');
    expect(keys.clericClass).toBe('cleric');
  });

  test('(c) profile defaults are applied to the new hero', async ({ page }) => {
    await switchTo(page, 'cleric');
    await createNow(page);
    const r = await page.evaluate(() => ({ ac: window.st.armorAc, maxDex: window.st.armorMaxDex }));
    expect(r.ac).toBe(0);
    expect(r.maxDex).toBe(null);   // null = без таван, не undefined
  });

  test('(d) the warning looks at the ACTIVE hero\'s key, not the monk\'s', async ({ page }) => {
    await switchTo(page, 'cleric');
    // Клерикът има запис, монкът — не: пак трябва да предупреди, иначе трие мълчаливо
    await page.evaluate(() => localStorage.removeItem('monkSheet_v3'));
    let msg = '';
    page.on('dialog', async d => { msg = d.message(); await d.dismiss(); });
    await page.locator('#btnNewChar').click();
    await page.waitForTimeout(200);
    expect(msg.toLowerCase()).toMatch(/експорт|export/);
    await expect(page.locator('#newCharModal')).toHaveClass(/hidden/);
  });

  test('(e) no warning when the ACTIVE hero has no save yet', async ({ page }) => {
    await page.evaluate(() => { window.st.name = 'Монк'; window.save(); });
    await switchTo(page, 'cleric');
    await page.evaluate(() => localStorage.removeItem('cleric_v1'));
    let prompted = false;
    page.on('dialog', async d => { prompted = true; await d.accept(); });
    await page.locator('#btnNewChar').click();
    await page.waitForTimeout(200);
    expect(prompted).toBe(false);
    await expect(page.locator('#newCharModal')).not.toHaveClass(/hidden/);
  });

  test('(f) the modal names the active hero', async ({ page }) => {
    await openModal(page);
    await expect(page.locator('#newCharText')).toContainText('Monk');
    await page.locator('#newCharCancel').click();

    await switchTo(page, 'cleric');
    await page.locator('#btnNewChar').click();
    await expect(page.locator('#newCharText')).toContainText('Cleric');
    await expect(page.locator('#newCharText')).not.toContainText('Monk');
  });

  test('(g) HP and hit dice come from the NEW hero, not the old one', async ({ page }) => {
    await page.evaluate(() => {
      window.st.level = 5; window.st.monkLevel = 5; window.st.con = 18; window.st.xp = 7000;
      window.save();
    });
    await expect(page.locator('#hpMaxSpan')).not.toHaveText('8');

    await createNow(page);

    const r = await page.evaluate(() => ({ hp: window.st.hpCurrent, hd: window.st.hdAvail, lvl: window.st.level }));
    expect(r.lvl).toBe(1);
    expect(r.hp).toBe(8);   // 1-во ниво, CON 10
    expect(r.hd).toBe(1);
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8');
  });

  test('(h) a cleric created this way survives a reload as a cleric', async ({ page }) => {
    await switchTo(page, 'cleric');
    await createNow(page);
    await page.reload();
    await ready(page);
    expect(await page.evaluate(() => window.activeProfile().id)).toBe('cleric');
    expect(await page.evaluate(() => window.st.class)).toBe('cleric');
    await expect(page.locator('.tab-btn[data-tab="spellcasting"]')).toBeVisible();
    await expect(page.locator('#class-badges')).toBeHidden();
  });
});
