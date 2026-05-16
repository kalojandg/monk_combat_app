import { test, expect } from '@playwright/test';

/**
 * CLERIC CANTRIPS & DEATH DOMAIN SPELLS TESTS (TDD)
 */

const CANTRIP_DETAILS = {
  'sacred-flame':    { index: 'sacred-flame',    name: 'Sacred Flame',    level: 0, school: { name: 'Evocation' },     casting_time: '1 action', range: '60 feet',   duration: 'Instantaneous',              components: ['V', 'S'], desc: ['Flame-like radiance descends on a creature.'] },
  'thaumaturgy':     { index: 'thaumaturgy',     name: 'Thaumaturgy',     level: 0, school: { name: 'Transmutation' }, casting_time: '1 action', range: '30 feet',   duration: 'Up to 1 minute',             components: ['V'],      desc: ['You manifest a minor wonder.'] },
  'word-of-radiance':{ index: 'word-of-radiance',name: 'Word of Radiance',level: 0, school: { name: 'Evocation' },     casting_time: '1 action', range: '5 feet',    duration: 'Instantaneous',              components: ['V', 'M'], desc: ['Burning radiance erupts from you.'] },
  'chill-touch':     { index: 'chill-touch',     name: 'Chill Touch',     level: 0, school: { name: 'Necromancy' },    casting_time: '1 action', range: '120 feet',  duration: '1 round',                    components: ['V', 'S'], desc: ['You create a ghostly skeletal hand.'] },
  'minor-illusion':  { index: 'minor-illusion',  name: 'Minor Illusion',  level: 0, school: { name: 'Illusion' },      casting_time: '1 action', range: '30 feet',   duration: '1 minute',                   components: ['S', 'M'], desc: ['You create a sound or image.'] },
  'invisibility':    { index: 'invisibility',     name: 'Invisibility',    level: 2, school: { name: 'Illusion' },      casting_time: '1 action', range: 'Touch',     duration: 'Concentration, up to 1 hour', components: ['V', 'S', 'M'], concentration: true, desc: ['A creature you touch becomes invisible.'] },
};

async function setupApiMocks(page) {
  await page.route('**/api/spells/*', async (route) => {
    const idx = route.request().url().split('?')[0].split('/').pop();
    await route.fulfill({ json: CANTRIP_DETAILS[idx] || CANTRIP_DETAILS['sacred-flame'] });
  });
  await page.route('**/api/classes/cleric/levels/*', async (route) => {
    await route.fulfill({ json: { prof_bonus: 2, spellcasting: { spell_slots_level_1: 2 } } });
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

// ─────────────────────────────────────────────────────────
test.describe('WIS Cantrips Section', () => {

  test('WIS cantrips section exists', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    await expect(page.locator('#wis-cantrips-root')).toBeAttached();
  });

  test('Holy Word in WIS section', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    expect((await page.locator('#wis-cantrips-root').textContent()).toLowerCase()).toContain('holy word');
  });

  test('Thaumaturgy in WIS section', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    expect((await page.locator('#wis-cantrips-root').textContent()).toLowerCase()).toContain('thaumaturgy');
  });

  test('Word of Radiance in WIS section', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    expect((await page.locator('#wis-cantrips-root').textContent()).toLowerCase()).toContain('word of radiance');
  });

  test('Chill Touch in WIS section', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    expect((await page.locator('#wis-cantrips-root').textContent()).toLowerCase()).toContain('chill touch');
  });

  test('Exactly 4 items in WIS section', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    expect(await page.locator('#wis-cantrips-root .mark-spell-item').count()).toBe(4);
  });

  test('WIS items show source', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    const text = await page.locator('#wis-cantrips-root').textContent();
    expect(text).toContain('Cleric');
    expect(text).toMatch(/Death Domain|Reaper/);
  });

  test('WIS items show WIS badge', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    const badges = await page.locator('#wis-cantrips-root .spell-ability-badge').allTextContents();
    expect(badges.every(b => b === 'WIS')).toBe(true);
  });

  test('Minor Illusion NOT in WIS section', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    expect((await page.locator('#wis-cantrips-root').textContent()).toLowerCase()).not.toContain('minor illusion');
  });
});

// ─────────────────────────────────────────────────────────
test.describe('CHA Cantrips Section', () => {

  test('CHA cantrips section exists', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    await expect(page.locator('#cha-cantrips-root')).toBeAttached();
  });

  test('Minor Illusion in CHA section', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    expect((await page.locator('#cha-cantrips-root').textContent()).toLowerCase()).toContain('minor illusion');
  });

  test('Minor Illusion shows Mark of Shadow source', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    expect(await page.locator('#cha-cantrips-root').textContent()).toContain('Mark of Shadow');
  });

  test('CHA cantrip shows CHA badge', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    const badge = await page.locator('#cha-cantrips-root .spell-ability-badge').first().textContent();
    expect(badge).toBe('CHA');
  });

  test('Holy Word NOT in CHA section', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    expect((await page.locator('#cha-cantrips-root').textContent()).toLowerCase()).not.toContain('holy word');
  });
});

// ─────────────────────────────────────────────────────────
test.describe('CHA Spells - Invisibility', () => {

  test('Invisibility in CHA spells section', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    expect((await page.locator('#cha-spells-root').textContent()).toLowerCase()).toContain('invisibility');
  });

  test('Invisibility shows 1/LR note', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    expect(await page.locator('#cha-spells-root').textContent()).toMatch(/1.{0,5}Long Rest|1\/LR/i);
  });

  test('Invisibility shows Mark of Shadow source', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    expect(await page.locator('#cha-spells-root').textContent()).toContain('Mark of Shadow');
  });

  test('Invisibility shows CHA badge', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    expect(await page.locator('#cha-spells-root .spell-ability-badge').first().textContent()).toBe('CHA');
  });

  test('Clicking Invisibility expands details', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    const item = page.locator('#cha-spells-root .mark-spell-item').first();
    await item.click();
    await page.waitForTimeout(500);
    await expect(item.locator('.mark-spell-details')).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────
test.describe('Cantrip Click to Expand (WIS)', () => {

  test('Clicking a WIS cantrip shows details', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    const item = page.locator('#wis-cantrips-root .mark-spell-item').first();
    await item.click();
    await page.waitForTimeout(500);
    await expect(item.locator('.mark-spell-details')).toBeVisible();
    expect((await item.locator('.mark-spell-details').textContent()).toLowerCase()).toContain('action');
  });

  test('Clicking same cantrip again collapses it', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    const item = page.locator('#wis-cantrips-root .mark-spell-item').first();
    await item.click();
    await page.waitForTimeout(400);
    await item.click();
    await page.waitForTimeout(300);
    expect(await item.locator('.mark-spell-details').isVisible()).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────
test.describe('No Cyrillic Text', () => {

  test('Resurrection tab contains no Cyrillic characters', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    const text = await page.locator('#tab-resurrection').textContent();
    // Cyrillic Unicode range: Ѐ-ӿ
    expect(text).not.toMatch(/[Ѐ-ӿ]/);
  });
});

// ─────────────────────────────────────────────────────────
test.describe('Yuan-Ti Innate Spellcasting', () => {

  test('Poison Spray cantrip in CHA cantrips section', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    expect((await page.locator('#cha-cantrips-root').textContent()).toLowerCase()).toContain('poison spray');
  });

  test('Poison Spray shows Innate Spellcasting source', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    expect(await page.locator('#cha-cantrips-root').textContent()).toMatch(/Innate Spellcasting/i);
  });

  test('Poison Spray shows CHA badge', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    const badges = await page.locator('#cha-cantrips-root .spell-ability-badge').allTextContents();
    expect(badges).toContain('CHA');
  });

  test('Animal Friendship in CHA spells section', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    expect((await page.locator('#cha-spells-root').textContent()).toLowerCase()).toContain('animal friendship');
  });

  test('Animal Friendship shows snakes note', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    expect(await page.locator('#cha-spells-root').textContent()).toMatch(/snake/i);
  });

  test('Suggestion in CHA spells section', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    expect((await page.locator('#cha-spells-root').textContent()).toLowerCase()).toContain('suggestion');
  });

  test('Suggestion shows 1/Long Rest note', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    expect(await page.locator('#cha-spells-root').textContent()).toMatch(/1.{0,5}Long Rest|1\/LR/i);
  });

  test('Suggestion shows Innate Spellcasting source', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    const text = await page.locator('#cha-spells-root').textContent();
    expect(text).toMatch(/Innate Spellcasting/i);
  });
});

// ─────────────────────────────────────────────────────────
test.describe('Death Domain Spells Section', () => {

  async function gotoResurrectionAtClericLevel(page, clericLevel) {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    if (clericLevel > 0) {
      await page.evaluate((cl) => { window.st.clericLevel = cl; window.save(); }, clericLevel);
    }
    await page.locator('button.tab-btn', { hasText: 'Resurrection' }).click();
    await page.waitForTimeout(400);
  }

  test('Death Domain Spells section title exists', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrection(page);
    await expect(page.locator('#tab-resurrection .section-title', { hasText: /death domain spell/i })).toBeVisible();
  });

  test('False Life in domain spells at clericLevel 1', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrectionAtClericLevel(page, 1);
    expect((await page.locator('#domain-spells-root').textContent()).toLowerCase()).toContain('false life');
  });

  test('Cloudkill in domain spells at clericLevel 9', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrectionAtClericLevel(page, 9);
    expect((await page.locator('#domain-spells-root').textContent()).toLowerCase()).toContain('cloudkill');
  });

  test('Domain spells accordion shows level badges', async ({ page }) => {
    await setupApiMocks(page);
    await gotoResurrectionAtClericLevel(page, 9);
    const badges = await page.locator('#domain-spells-root .mark-spell-level-badge').allTextContents();
    expect(badges.some(b => /L[1-9]/.test(b))).toBe(true);
  });
});
