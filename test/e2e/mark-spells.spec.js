import { test, expect } from '@playwright/test';

/**
 * MARK OF SHADOW - SPELL SYSTEM TESTS (TDD)
 *
 * Тестват динамичното управление на Mark of Shadow магии в resurrection таба.
 * Магиите са фиксирани (от марката), слотовете идват от Cleric ниво чрез D&D 5e API.
 */

// Spell slot mock data per cleric level
function mockClericLevel(clericLevel) {
  const slots = {};
  if (clericLevel >= 1) slots.spell_slots_level_1 = clericLevel <= 1 ? 2 : clericLevel <= 2 ? 3 : 4;
  if (clericLevel >= 3) slots.spell_slots_level_2 = clericLevel <= 3 ? 2 : 3;
  if (clericLevel >= 5) slots.spell_slots_level_3 = clericLevel <= 5 ? 2 : 3;
  if (clericLevel >= 7) slots.spell_slots_level_4 = clericLevel <= 7 ? 1 : 2;
  if (clericLevel >= 9) slots.spell_slots_level_5 = 1;
  return { prof_bonus: 2, spellcasting: slots };
}

const SPELL_DETAILS = {
  'disguise-self': {
    index: 'disguise-self', name: 'Disguise Self', level: 1,
    school: { name: 'Illusion' }, casting_time: '1 action', range: 'Self',
    duration: '1 hour', components: ['V', 'S'],
    desc: ['You make yourself look different until the spell ends or until you use your action to dismiss it.']
  },
  'silent-image': {
    index: 'silent-image', name: 'Silent Image', level: 1,
    school: { name: 'Illusion' }, casting_time: '1 action', range: '60 feet',
    duration: 'Concentration, up to 10 minutes', components: ['V', 'S', 'M'],
    concentration: true,
    desc: ['You create the image of an object, a creature, or some other visible phenomenon.']
  },
  'darkness': {
    index: 'darkness', name: 'Darkness', level: 2,
    school: { name: 'Evocation' }, casting_time: '1 action', range: '60 feet',
    duration: 'Concentration, up to 10 minutes', components: ['V', 'M'],
    concentration: true,
    desc: ['Magical darkness spreads from a point you choose within range.']
  },
  'pass-without-trace': {
    index: 'pass-without-trace', name: 'Pass without Trace', level: 2,
    school: { name: 'Abjuration' }, casting_time: '1 action', range: 'Self',
    duration: 'Concentration, up to 1 hour', components: ['V', 'S', 'M'],
    concentration: true,
    desc: ['A veil of shadows and silence radiates from you, masking you and your companions.']
  },
  'mislead': {
    index: 'mislead', name: 'Mislead', level: 5,
    school: { name: 'Illusion' }, casting_time: '1 action', range: 'Self',
    duration: 'Concentration, up to 1 hour', components: ['S'],
    concentration: true,
    desc: ['You become invisible at the same time that an illusory double of you appears.']
  }
};

async function setupApiMocks(page) {
  await page.route('**/api/classes/cleric/levels/*', async (route) => {
    const url = route.request().url();
    const m = url.match(/\/levels\/(\d+)$/);
    const lvl = m ? parseInt(m[1]) : 1;
    await route.fulfill({ json: mockClericLevel(lvl) });
  });

  await page.route('**/api/spells/*', async (route) => {
    const url = route.request().url().split('?')[0];
    const idx = url.split('/').pop();
    const data = SPELL_DETAILS[idx] || SPELL_DETAILS['disguise-self'];
    await route.fulfill({ json: data });
  });
}

async function gotoResurrection(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
  await page.locator('button.tab-btn', { hasText: 'Resurrection' }).click();
  await page.waitForTimeout(400);
}

// ───────────────────────────────────────────────
test.describe('Mark Spells - Structure', () => {

  test('Spells of the Mark appears as section label, not accordion entry', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);

    // Трябва да е section-title, не details.feat summary
    await expect(page.locator('#tab-resurrection .section-title', { hasText: 'Spells of the Mark' })).toBeVisible();
    const inAccordion = await page.locator('#tab-resurrection details.feat summary', { hasText: 'Spells of the Mark' }).count();
    expect(inAccordion).toBe(0);
  });

  test('Spell slots section exists in resurrection tab', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    await expect(page.locator('#mark-slots-root')).toBeAttached();
  });

  test('Spells root section exists in resurrection tab', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    await expect(page.locator('#mark-spells-root')).toBeAttached();
  });
});

// ───────────────────────────────────────────────
test.describe('Mark Spells - No Cleric Level', () => {

  test('clericLevel=0 shows no spells message', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    await page.evaluate(() => { window.st.clericLevel = 0; window.save(); });
    await page.waitForTimeout(300);

    const text = await page.locator('#mark-spells-root').textContent();
    expect(text.trim().length).toBeGreaterThan(0); // shows some message
  });
});

// ───────────────────────────────────────────────
test.describe('Mark Spells - Cleric Level 1', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    await page.evaluate(() => {
      window.st.clericLevel = 1;
      window.st.monkLevel = 3;
      window.st.level = 4;
      window.save();
    });
    await page.waitForTimeout(600);
    await page.evaluate(() => window.initMarkSpells());
    await page.waitForTimeout(600);
  });

  test('Shows L1 spell slot row', async ({ page }) => {
    const text = await page.locator('#mark-slots-root').textContent();
    expect(text).toContain('1');
  });

  test('Shows Disguise Self in L1 spells', async ({ page }) => {
    const text = await page.locator('#mark-spells-root').textContent();
    expect(text.toLowerCase()).toContain('disguise');
  });

  test('Shows Silent Image in L1 spells', async ({ page }) => {
    const text = await page.locator('#mark-spells-root').textContent();
    expect(text.toLowerCase()).toContain('silent image');
  });

  test('Does NOT show L2 spells (Darkness) when clericLevel=1', async ({ page }) => {
    const text = await page.locator('#mark-spells-root').textContent();
    expect(text.toLowerCase()).not.toContain('darkness');
  });
});

// ───────────────────────────────────────────────
test.describe('Mark Spells - Cleric Level 3', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    await page.evaluate(() => {
      window.st.clericLevel = 3;
      window.st.monkLevel = 1;
      window.st.level = 4;
      window.save();
    });
    await page.waitForTimeout(600);
    await page.evaluate(() => window.initMarkSpells());
    await page.waitForTimeout(400);
  });

  test('Shows L1 spells at clericLevel=3', async ({ page }) => {
    const text = await page.locator('#mark-spells-root').textContent();
    expect(text.toLowerCase()).toContain('disguise');
  });

  test('Shows L2 spells (Darkness) at clericLevel=3', async ({ page }) => {
    const text = await page.locator('#mark-spells-root').textContent();
    expect(text.toLowerCase()).toContain('darkness');
  });

  test('Does NOT show L3 spells (Clairvoyance) at clericLevel=3', async ({ page }) => {
    const text = await page.locator('#mark-spells-root').textContent();
    expect(text.toLowerCase()).not.toContain('clairvoyance');
  });
});

// ───────────────────────────────────────────────
test.describe('Mark Spells - Spell Details from API', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    await page.evaluate(() => {
      window.st.clericLevel = 1;
      window.st.monkLevel = 3;
      window.st.level = 4;
      window.save();
    });
    await page.waitForTimeout(600);
    await page.evaluate(() => window.initMarkSpells());
    await page.waitForTimeout(400);
  });

  test('Clicking a spell name expands to show details', async ({ page }) => {
    const spell = page.locator('#mark-spells-root').locator('.mark-spell-item', { hasText: /disguise/i }).first();
    await spell.click();
    await page.waitForTimeout(500);

    const details = spell.locator('.mark-spell-details');
    await expect(details).toBeVisible();
  });

  test('Spell details show casting time', async ({ page }) => {
    const spell = page.locator('#mark-spells-root').locator('.mark-spell-item', { hasText: /disguise/i }).first();
    await spell.click();
    await page.waitForTimeout(500);

    const text = await spell.locator('.mark-spell-details').textContent();
    expect(text.toLowerCase()).toContain('action');
  });

  test('Spell details show description text', async ({ page }) => {
    const spell = page.locator('#mark-spells-root').locator('.mark-spell-item', { hasText: /disguise/i }).first();
    await spell.click();
    await page.waitForTimeout(500);

    const text = await spell.locator('.mark-spell-details').textContent();
    expect(text.length).toBeGreaterThan(30);
  });

  test('Clicking same spell again collapses details', async ({ page }) => {
    const spell = page.locator('#mark-spells-root').locator('.mark-spell-item', { hasText: /disguise/i }).first();
    await spell.click();
    await page.waitForTimeout(400);
    await spell.click();
    await page.waitForTimeout(300);

    const details = spell.locator('.mark-spell-details');
    const visible = await details.isVisible();
    expect(visible).toBe(false);
  });
});

// ───────────────────────────────────────────────
test.describe('Mark Spells - Slot Management', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    await page.evaluate(() => {
      window.st.clericLevel = 1;
      window.st.monkLevel = 3;
      window.st.level = 4;
      window.save();
    });
    await page.waitForTimeout(600);
    await page.evaluate(() => window.initMarkSpells());
    await page.waitForTimeout(400);
  });

  test('Slot row shows remaining/max format', async ({ page }) => {
    const text = await page.locator('#mark-slots-root').textContent();
    expect(text).toMatch(/\d+\s*\/\s*\d+/);
  });

  test('Using a slot decrements remaining count', async ({ page }) => {
    const slotBtn = page.locator('#mark-slots-root .btn-slot-use').first();
    const before = await page.locator('#mark-slots-root .slot-remaining').first().textContent();
    await slotBtn.click();
    await page.waitForTimeout(200);
    const after = await page.locator('#mark-slots-root .slot-remaining').first().textContent();
    expect(Number(after)).toBe(Number(before) - 1);
  });

  test('Slot state is persisted (survives save/reload)', async ({ page }) => {
    await page.locator('#mark-slots-root .btn-slot-use').first().click();
    await page.waitForTimeout(200);
    const after = await page.locator('#mark-slots-root .slot-remaining').first().textContent();

    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await page.locator('button.tab-btn', { hasText: 'Resurrection' }).click();
    await page.waitForTimeout(600);

    const afterReload = await page.locator('#mark-slots-root .slot-remaining').first().textContent();
    expect(afterReload).toBe(after);
  });

  test('Long Rest restores all mark spell slots', async ({ page }) => {
    await page.locator('#mark-slots-root .btn-slot-use').first().click();
    await page.waitForTimeout(200);

    await page.locator('#btnLongRest').click();
    await page.waitForTimeout(500);

    await page.locator('button.tab-btn', { hasText: 'Resurrection' }).click();
    await page.waitForTimeout(600);

    const remaining = await page.locator('#mark-slots-root .slot-remaining').first().textContent();
    const max = await page.locator('#mark-slots-root .slot-max').first().textContent();
    expect(remaining).toBe(max);
  });
});
