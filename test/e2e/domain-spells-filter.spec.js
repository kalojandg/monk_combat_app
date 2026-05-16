import { test, expect } from '@playwright/test';

/**
 * DOMAIN SPELLS FILTER & LEVEL-UP MODAL SPELLS (TDD)
 *
 * Domain spells accordion shows only spells unlocked at current clericLevel.
 * Level-up modal shows domain/mark spells gained at next cleric level.
 */

async function setupApiMocks(page) {
  await page.route('**/api/classes/cleric/levels/*', async (route) => {
    const m = route.request().url().match(/\/levels\/(\d+)$/);
    const lvl = m ? parseInt(m[1]) : 1;
    const s = {};
    if (lvl >= 1) s.spell_slots_level_1 = lvl <= 2 ? (lvl === 1 ? 2 : 3) : 4;
    if (lvl >= 3) s.spell_slots_level_2 = lvl <= 3 ? 2 : 3;
    if (lvl >= 5) s.spell_slots_level_3 = 2;
    if (lvl >= 7) s.spell_slots_level_4 = 1;
    if (lvl >= 9) s.spell_slots_level_5 = 1;
    await route.fulfill({ json: { prof_bonus: 2, spellcasting: s } });
  });
  await page.route('**/api/spells/*', async (route) => {
    await route.fulfill({ json: { index: 'test', name: 'Test Spell', level: 1, school: { name: 'Illusion' }, casting_time: '1 action', range: 'Self', duration: '1 min', components: ['V'], desc: ['Test.'] } });
  });
}

async function setup(page, clericLevel, monkLevel) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
  await page.evaluate(({ cl, ml }) => {
    window.st.clericLevel = cl;
    window.st.monkLevel = ml;
    window.st.level = cl + ml;
    window.save();
  }, { cl: clericLevel, ml: monkLevel });
  await page.waitForTimeout(200);
}

async function gotoResurrection(page) {
  await page.locator('button.tab-btn', { hasText: 'Resurrection' }).click();
  await page.waitForTimeout(500);
}

// ─────────────────────────────────────────────────────────
test.describe('Domain Spells Accordion - Filtered by clericLevel', () => {

  test('clericLevel=1: 2 items shown (False Life + Ray of Sickness)', async ({ page }) => {
    await setupApiMocks(page);
    await setup(page, 1, 3);
    await gotoResurrection(page);

    const items = await page.locator('#domain-spells-root .mark-spell-item').count();
    expect(items).toBe(2);
    expect((await page.locator('#domain-spells-root').textContent()).toLowerCase()).toContain('false life');
    expect((await page.locator('#domain-spells-root').textContent()).toLowerCase()).not.toContain('blindness');
  });

  test('clericLevel=2: still 2 items (L3 unlocks at clericLevel=3)', async ({ page }) => {
    await setupApiMocks(page);
    await setup(page, 2, 2);
    await gotoResurrection(page);

    const items = await page.locator('#domain-spells-root .mark-spell-item').count();
    expect(items).toBe(2);
  });

  test('clericLevel=3: 4 items shown (L1 + L3 groups)', async ({ page }) => {
    await setupApiMocks(page);
    await setup(page, 3, 1);
    await gotoResurrection(page);

    const items = await page.locator('#domain-spells-root .mark-spell-item').count();
    expect(items).toBe(4);
    expect((await page.locator('#domain-spells-root').textContent()).toLowerCase()).toContain('blindness');
  });

  test('clericLevel=5: 6 items shown (up to L5 group)', async ({ page }) => {
    await setupApiMocks(page);
    await setup(page, 5, 0);
    await gotoResurrection(page);

    const items = await page.locator('#domain-spells-root .mark-spell-item').count();
    expect(items).toBe(6);
    expect((await page.locator('#domain-spells-root').textContent()).toLowerCase()).toContain('animate dead');
  });

  test('clericLevel=9: 10 items shown (all groups)', async ({ page }) => {
    await setupApiMocks(page);
    await setup(page, 9, 0);
    await gotoResurrection(page);

    const items = await page.locator('#domain-spells-root .mark-spell-item').count();
    expect(items).toBe(10);
    expect((await page.locator('#domain-spells-root').textContent()).toLowerCase()).toContain('cloudkill');
  });

  test('clericLevel=0: shows empty message, no spell items', async ({ page }) => {
    await setupApiMocks(page);
    await setup(page, 0, 4);
    await gotoResurrection(page);

    const items = await page.locator('#domain-spells-root .mark-spell-item').count();
    expect(items).toBe(0);
  });

  test('domain spell items show level badge', async ({ page }) => {
    await setupApiMocks(page);
    await setup(page, 3, 1);
    await gotoResurrection(page);

    const badges = await page.locator('#domain-spells-root .mark-spell-level-badge').allTextContents();
    expect(badges).toContain('L1');
    expect(badges).toContain('L3');
  });
});

// ─────────────────────────────────────────────────────────
test.describe('Level-Up Modal Cleric Card - Shows Spells Gained', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  test('Cleric card at clericLevel 0→1 shows domain spells gained (False Life)', async ({ page }) => {
    await page.evaluate(() => { window.st.xp = 300; window.save(); });
    await page.waitForTimeout(200);

    await page.locator('#btnLongRest').click();
    await page.waitForSelector('#levelUpModal:not(.hidden)', { timeout: 4000 });

    const text = await page.locator('#cardCleric').textContent();
    expect(text.toLowerCase()).toMatch(/false life|domain spells|ray of sickness/i);
  });

  test('Cleric card at clericLevel 0→1 shows mark spells gained (Disguise Self)', async ({ page }) => {
    await page.evaluate(() => { window.st.xp = 300; window.save(); });
    await page.waitForTimeout(200);

    await page.locator('#btnLongRest').click();
    await page.waitForSelector('#levelUpModal:not(.hidden)', { timeout: 4000 });

    const text = await page.locator('#cardCleric').textContent();
    expect(text.toLowerCase()).toMatch(/disguise self|silent image|mark spells/i);

    await page.locator('#cardMonk').click();
    await page.waitForTimeout(200);
  });

  test('Cleric card at clericLevel 2→3 shows L2 domain spells (Blindness)', async ({ page }) => {
    await page.evaluate(() => {
      window.st.clericLevel = 2;
      window.st.monkLevel = 1;
      window.st.level = 3;
      window.st.xp = 2700; // level 4
      window.save();
    });
    await page.waitForTimeout(200);

    await page.locator('#btnLongRest').click();
    await page.waitForSelector('#levelUpModal:not(.hidden)', { timeout: 4000 });

    const text = await page.locator('#cardCleric').textContent();
    expect(text.toLowerCase()).toMatch(/blindness|ray of enfeeblement|domain/i);

    await page.locator('#cardMonk').click();
    await page.waitForTimeout(200);
  });
});
