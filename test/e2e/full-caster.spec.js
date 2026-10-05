import { test, expect } from '@playwright/test';

/**
 * FULL CASTER — cleric slots up to level 20 + per-domain spell data
 *
 * Клерикът е пълен кастър: слотове от 1-во до 9-то ниво по RAW таблицата (PHB p.57),
 * без отрязване на ниво 10. Domain заклинанията живеят в domain-spells.json по домейн:
 * монкът (multiclass Death Domain) ползва 'death', клерикът (Grave Domain) — 'grave'.
 */

// RAW Cleric spell slots (PHB) — ниво на клерика → { ниво на слота: брой }
const RAW_SLOTS = {
  11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
};

// Death Domain списъкът ДОСЛОВНО отпреди изнасянето в JSON (бившият DOMAIN_SPELL_ROWS)
const PREVIOUS_DEATH_ROWS = [
  { minLevel: 1, spells: [
    { index: 'false-life', name: 'False Life' },
    { index: 'ray-of-sickness', name: 'Ray of Sickness' },
  ]},
  { minLevel: 3, spells: [
    { index: 'blindness-deafness', name: 'Blindness/Deafness' },
    { index: 'ray-of-enfeeblement', name: 'Ray of Enfeeblement' },
  ]},
  { minLevel: 5, spells: [
    { index: 'animate-dead', name: 'Animate Dead' },
    { index: 'vampiric-touch', name: 'Vampiric Touch' },
  ]},
  { minLevel: 7, spells: [
    { index: 'blight', name: 'Blight' },
    { index: 'death-ward', name: 'Death Ward' },
  ]},
  { minLevel: 9, spells: [
    { index: 'antilife-shell', name: 'Antilife Shell' },
    { index: 'cloudkill', name: 'Cloudkill' },
  ]},
];

async function ready(page) {
  await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
}

// Клерик (собствен запис cleric_v1, линейно ниво) на дадено ниво
async function seedCleric(page, level) {
  await page.goto('/');
  await page.evaluate((lvl) => {
    localStorage.clear();
    localStorage.setItem('activeCharacter', 'cleric');
    localStorage.setItem('cleric_v1', JSON.stringify({
      class: 'cleric', name: 'Grave', level: lvl, monkLevel: 0, clericLevel: lvl, wis: 16
    }));
  }, level);
  await page.reload();
  await ready(page);
  await page.evaluate(() => window.initMarkSpells());
}

// Монк (monkSheet_v3) с multiclass клерик нива — Resurrection табът е негов
async function seedMonk(page, monkLevel, clericLevel) {
  await page.goto('/');
  await page.evaluate(({ ml, cl }) => {
    localStorage.clear();
    localStorage.setItem('monkSheet_v3', JSON.stringify({
      name: 'Monky', level: ml + cl, monkLevel: ml, clericLevel: cl, wis: 14
    }));
  }, { ml: monkLevel, cl: clericLevel });
  await page.reload();
  await ready(page);
}

function slotMaxes(markSlots) {
  const out = {};
  for (const [lvl, s] of Object.entries(markSlots || {})) out[lvl] = s.max;
  return out;
}

test.describe('Full caster — cleric spell slots to level 20', () => {

  test('(a) cleric level 20 has slots 1st..9th with RAW counts', async ({ page }) => {
    await seedCleric(page, 20);
    const slots = await page.evaluate(() => window.st.markSlots);
    expect(Object.keys(slots).map(Number).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(slotMaxes(slots)).toEqual(Object.fromEntries(
      Object.entries(RAW_SLOTS[20]).map(([k, v]) => [String(k), v])
    ));
  });

  test('(b) cleric level 11 gains a 6th-level slot', async ({ page }) => {
    await seedCleric(page, 11);
    const slots = await page.evaluate(() => window.st.markSlots);
    expect(slots[6]).toEqual({ max: 1, used: 0 });
    expect(slotMaxes(slots)).toEqual(Object.fromEntries(
      Object.entries(RAW_SLOTS[11]).map(([k, v]) => [String(k), v])
    ));
  });

  test('(c) preparation accordion shows as many levels as there are slots', async ({ page }) => {
    await seedMonk(page, 1, 11);
    await page.locator('button.tab-btn', { hasText: 'Resurrection' }).click();
    await page.evaluate(() => { window.initMarkSpells(); window.renderClericPrepSpells(); });

    const levels = await page.locator('#cleric-prep-root details.prep-level-acc')
      .evaluateAll(els => els.map(e => Number(e.dataset.slotlvl)));
    expect(levels).toEqual([1, 2, 3, 4, 5, 6]);
    await expect(page.locator('#cleric-prep-root .prep-level-summary').last()).toHaveText('Level 6 Spells');
  });
});

test.describe('Full caster — domain spells as per-domain data', () => {

  test('(d) domain-spells.json is valid and has both death and grave', async ({ request }) => {
    const res = await request.get('/domain-spells.json');
    expect(res.ok()).toBe(true);
    const data = await res.json();
    for (const domain of ['death', 'grave']) {
      expect(Array.isArray(data[domain])).toBe(true);
      expect(data[domain].length).toBeGreaterThan(0);
      for (const row of data[domain]) {
        expect(typeof row.minLevel).toBe('number');
        expect(Array.isArray(row.spells)).toBe(true);
        for (const sp of row.spells) {
          expect(typeof sp.index).toBe('string');
          expect(typeof sp.name).toBe('string');
        }
      }
    }
    // Death е пренесен дословно
    expect(data.death).toEqual(PREVIOUS_DEATH_ROWS);
  });

  test('(e) monk uses the death list, identical to the previous one', async ({ page }) => {
    await seedMonk(page, 0, 9);
    await page.locator('button.tab-btn', { hasText: 'Resurrection' }).click();
    await page.evaluate(() => window.loadDomainSpells());

    expect(await page.evaluate(() => window.activeDomain())).toBe('death');
    expect(await page.evaluate(() => window.getDomainSpellRows())).toEqual(PREVIOUS_DEATH_ROWS);

    const expectedNames = PREVIOUS_DEATH_ROWS.flatMap(r => r.spells.map(s => s.name));
    await expect(page.locator('#domain-spells-root .mark-spell-name')).toHaveText(expectedNames);
    expect(await page.evaluate(() => window.getClericSpellsGained(1))).toContain('Ray of Sickness');
  });

  test('(f) cleric uses the grave list (Bane at 1st, Vampiric Touch at 5th)', async ({ page }) => {
    await seedCleric(page, 9);
    await page.evaluate(() => window.loadDomainSpells());

    expect(await page.evaluate(() => window.activeDomain())).toBe('grave');
    const rows = await page.evaluate(() => window.getDomainSpellRows());
    const byLevel = Object.fromEntries(rows.map(r => [r.minLevel, r.spells.map(s => s.index)]));
    expect(byLevel[1]).toEqual(['bane', 'false-life']);
    expect(byLevel[3]).toEqual(['gentle-repose', 'ray-of-enfeeblement']);
    expect(byLevel[5]).toEqual(['revivify', 'vampiric-touch']);
    expect(byLevel[7]).toEqual(['blight', 'death-ward']);
    expect(byLevel[9]).toEqual(['antilife-shell', 'raise-dead']);

    const gainedL1 = await page.evaluate(() => window.getClericSpellsGained(1));
    expect(gainedL1).toContain('Bane');
    expect(gainedL1).not.toContain('Ray of Sickness');
    expect(await page.evaluate(() => window.getClericSpellsGained(5))).toContain('Vampiric Touch');
  });
});
