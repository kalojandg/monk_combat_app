import { test, expect } from '@playwright/test';

/**
 * SPELL LIBRARY (Spellcasting таб на клерика)
 *
 * Цялата библиотека (API 2014 + local-spells.json, без Arcane Eye) с търсене и филтър
 * по ниво; приготвяне с едно цъкане върху st.preparedClericSpells; лимит
 * clericLevel + WIS mod; domain заклинанията са винаги подготвени и не се броят;
 * детайлите на приготвените се кешират локално и работят без мрежа.
 */

const CLASS_LIST = {
  count: 7,
  results: [
    { index: 'sacred-flame',     name: 'Sacred Flame',     level: 0, url: '/api/2014/spells/sacred-flame' },
    { index: 'bless',            name: 'Bless',            level: 1, url: '/api/2014/spells/bless' },
    { index: 'cure-wounds',      name: 'Cure Wounds',      level: 1, url: '/api/2014/spells/cure-wounds' },
    { index: 'guiding-bolt',     name: 'Guiding Bolt',     level: 1, url: '/api/2014/spells/guiding-bolt' },
    { index: 'bane',             name: 'Bane',             level: 1, url: '/api/2014/spells/bane' },
    { index: 'spiritual-weapon', name: 'Spiritual Weapon', level: 2, url: '/api/2014/spells/spiritual-weapon' },
    { index: 'arcane-eye',       name: 'Arcane Eye',       level: 4, url: '/api/2014/spells/arcane-eye' },
  ],
};

function details(index) {
  const sp = CLASS_LIST.results.find(s => s.index === index) || { index, name: index, level: 1 };
  return {
    index, name: sp.name, level: sp.level,
    casting_time: '1 action', range: '30 feet', duration: 'Instantaneous', components: ['V', 'S'],
    desc: [`${sp.name} mocked description.`],
  };
}

async function mockApi(page) {
  await page.route('**/api/2014/classes/cleric/spells', route => route.fulfill({ json: CLASS_LIST }));
  await page.route('**/api/spells/*', route => {
    const idx = route.request().url().split('?')[0].split('/').pop();
    return route.fulfill({ json: details(idx) });
  });
}

// Мрежата към API-то я няма: всяка заявка към dnd5eapi пада
async function cutApi(page) {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await page.route(/dnd5eapi\.co/, route => route.abort('internetdisconnected'));
}

async function seedCleric(page, { level = 3, wis = 16, prepared = [] } = {}) {
  await page.goto('/');
  await page.evaluate(({ level, wis, prepared }) => {
    localStorage.clear();
    localStorage.setItem('activeCharacter', 'cleric');
    localStorage.setItem('cleric_v1', JSON.stringify({
      name: 'Clery', class: 'cleric', level, clericLevel: level, monkLevel: 0, wis, preparedClericSpells: prepared,
    }));
  }, { level, wis, prepared });
  await page.reload();
  await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
}

async function openSpellcasting(page) {
  await page.locator('.tab-btn[data-tab="spellcasting"]').click();
  await expect(page.locator('#tab-spellcasting')).toBeVisible();
}

const lib = page => page.locator('#spellLibraryRoot');
const libItem = (page, index) => page.locator(`#spellLibraryRoot .spell-lib-item[data-index="${index}"]`);
const prepBtn = (page, index) => libItem(page, index).locator('.btn-spell-prep');
const counter = page => page.locator('#spellPreparedRoot .spell-prep-counter');

test.describe('Spell library', () => {

  test('(a) library lists both API and local-spells.json spells', async ({ page }) => {
    await mockApi(page);
    await seedCleric(page);
    await openSpellcasting(page);
    await expect(libItem(page, 'bless')).toBeVisible();
    await expect(libItem(page, 'spiritual-weapon')).toBeVisible();
    // local-spells.json: Ceremony (1), Spirit Shroud (3) — извън API-то
    await expect(libItem(page, 'ceremony')).toBeVisible();
    await expect(libItem(page, 'spirit-shroud')).toBeVisible();
    await expect(lib(page)).toContainText('Ceremony');
  });

  test('(b) Arcane Eye is filtered out of the cleric list', async ({ page }) => {
    await mockApi(page);
    await seedCleric(page);
    await openSpellcasting(page);
    await expect(libItem(page, 'bless')).toBeVisible();
    await expect(libItem(page, 'arcane-eye')).toHaveCount(0);
    await expect(lib(page)).not.toContainText('Arcane Eye');
  });

  test('(c) search filters by name — case-insensitive, diacritics ignored', async ({ page }) => {
    await mockApi(page);
    await seedCleric(page);
    await openSpellcasting(page);
    await expect(libItem(page, 'bless')).toBeVisible();

    await page.locator('#spellLibSearch').fill('GUIDING');
    await expect(libItem(page, 'guiding-bolt')).toBeVisible();
    await expect(libItem(page, 'bless')).toHaveCount(0);
    await expect(libItem(page, 'ceremony')).toHaveCount(0);

    await page.locator('#spellLibSearch').fill('cérémony');
    await expect(libItem(page, 'ceremony')).toBeVisible();
    await expect(libItem(page, 'guiding-bolt')).toHaveCount(0);

    await page.locator('#spellLibSearch').fill('');
    await expect(libItem(page, 'bless')).toBeVisible();
  });

  test('level filter narrows the library to one spell level', async ({ page }) => {
    await mockApi(page);
    await seedCleric(page);
    await openSpellcasting(page);
    await expect(libItem(page, 'bless')).toBeVisible();
    await page.locator('#spellLibLevel').selectOption('2');
    await expect(libItem(page, 'spiritual-weapon')).toBeVisible();
    await expect(libItem(page, 'bless')).toHaveCount(0);
  });

  test('(d) preparing is one click and raises the counter', async ({ page }) => {
    await mockApi(page);
    await seedCleric(page, { level: 3, wis: 16 });   // max = 3 + 3 = 6
    await openSpellcasting(page);
    await expect(counter(page)).toContainText('0/6');

    await prepBtn(page, 'bless').click();
    await expect(counter(page)).toContainText('1/6');
    await expect(page.locator('#spellPreparedRoot [data-prepared="bless"]')).toBeVisible();
    expect(await page.evaluate(() => window.st.preparedClericSpells)).toEqual(['bless']);

    // второ цъкане = отприготвяне
    await prepBtn(page, 'bless').click();
    await expect(counter(page)).toContainText('0/6');
    expect(await page.evaluate(() => window.st.preparedClericSpells)).toEqual([]);
  });

  test('(e) the limit stops preparing above clericLevel + WIS mod', async ({ page }) => {
    await mockApi(page);
    await seedCleric(page, { level: 1, wis: 12 });   // max = 1 + 1 = 2
    await openSpellcasting(page);
    await expect(counter(page)).toContainText('0/2');

    await prepBtn(page, 'bless').click();
    await prepBtn(page, 'cure-wounds').click();
    await expect(counter(page)).toContainText('2/2');
    await expect(prepBtn(page, 'guiding-bolt')).toBeDisabled();
    await prepBtn(page, 'guiding-bolt').click({ force: true });
    await expect(counter(page)).toContainText('2/2');
    expect(await page.evaluate(() => window.st.preparedClericSpells)).toEqual(['bless', 'cure-wounds']);
  });

  test('(f) domain spells are always prepared and do not count', async ({ page }) => {
    await mockApi(page);
    await seedCleric(page, { level: 3, wis: 16 });
    await openSpellcasting(page);
    // Grave Domain: Bane + False Life (1), Gentle Repose + Ray of Enfeeblement (3)
    const prepared = page.locator('#spellPreparedRoot');
    await expect(prepared.locator('[data-prepared="bane"][data-domain="1"]')).toBeVisible();
    await expect(prepared.locator('[data-prepared="gentle-repose"][data-domain="1"]')).toBeVisible();
    await expect(counter(page)).toContainText('0/6');
    // в библиотеката domain заклинанието е отбелязано, без бутон за приготвяне
    await expect(libItem(page, 'bane')).toContainText('Domain');
    await expect(prepBtn(page, 'bane')).toHaveCount(0);
  });

  test('prepared spells are grouped by spell level', async ({ page }) => {
    await mockApi(page);
    await seedCleric(page, { level: 3, wis: 16 });
    await openSpellcasting(page);
    await prepBtn(page, 'bless').click();
    await prepBtn(page, 'spiritual-weapon').click();
    await expect(page.locator('#spellPreparedRoot [data-prep-level="1"] [data-prepared="bless"]')).toBeVisible();
    await expect(page.locator('#spellPreparedRoot [data-prep-level="2"] [data-prepared="spiritual-weapon"]')).toBeVisible();
  });

  test('spell slots render in #spellSlotsRoot', async ({ page }) => {
    await mockApi(page);
    await seedCleric(page, { level: 3, wis: 16 });
    await openSpellcasting(page);
    const slots = page.locator('#spellSlotsRoot .slot-row');
    await expect(slots).toHaveCount(2);   // Cleric 3: L1 ×4, L2 ×2
    await slots.first().locator('.btn-slot-use').click();
    await expect(page.locator('#spellSlotsRoot .slot-row[data-level="1"] .slot-remaining')).toHaveText('3');
  });

  test('spending a slot in #spellSlotsRoot updates the counter and st.markSlots', async ({ page }) => {
    await mockApi(page);
    await seedCleric(page, { level: 3, wis: 16 });
    await openSpellcasting(page);
    const l2 = page.locator('#spellSlotsRoot .slot-row[data-level="2"]');
    await l2.locator('.btn-slot-use').click();
    await expect(l2.locator('.slot-remaining')).toHaveText('1');
    await page.locator('#spellSlotsRoot .slot-row[data-level="2"] .btn-slot-use').click();
    await expect(page.locator('#spellSlotsRoot .slot-row[data-level="2"] .slot-remaining')).toHaveText('0');
    await expect(page.locator('#spellSlotsRoot .slot-row[data-level="2"] .btn-slot-use')).toBeDisabled();
    expect(await page.evaluate(() => window.st.markSlots[2])).toEqual({ max: 2, used: 2 });
  });

  test('Long Rest restores spent slots in #spellSlotsRoot', async ({ page }) => {
    await mockApi(page);
    await seedCleric(page, { level: 3, wis: 16 });
    await openSpellcasting(page);
    await page.locator('#spellSlotsRoot .slot-row[data-level="1"] .btn-slot-use').click();
    await expect(page.locator('#spellSlotsRoot .slot-row[data-level="1"] .slot-remaining')).toHaveText('3');

    await page.locator('#btnLongRest').click();
    await expect(page.locator('#spellSlotsRoot .slot-row[data-level="1"] .slot-remaining')).toHaveText('4');
    expect(await page.evaluate(() => window.st.markSlots[1].used)).toBe(0);
  });

  test('(g) offline: prepared spells show cached details, library shows a message', async ({ page }) => {
    await mockApi(page);
    await seedCleric(page, { level: 3, wis: 16 });
    await openSpellcasting(page);
    await prepBtn(page, 'bless').click();
    await expect(counter(page)).toContainText('1/6');
    // кешът на детайлите се пълни при приготвяне
    await expect.poll(() => page.evaluate(() => {
      const raw = localStorage.getItem('spellDetailsCache_v1');
      return raw ? Object.keys(JSON.parse(raw)) : [];
    })).toContain('bless');

    await cutApi(page);
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await openSpellcasting(page);

    const item = page.locator('#spellPreparedRoot [data-prepared="bless"]');
    await expect(item).toBeVisible();
    await item.locator('.spell-prep-name').click();
    await expect(item).toContainText('Bless mocked description.');
    await expect(page.locator('#spellLibraryRoot .spell-lib-error')).toBeVisible();
    await expect(page.locator('#spellLibraryRoot .spell-lib-error')).toContainText(/offline|connection/i);
  });

  test('cached spell details with HTML in desc/level render as text, not markup', async ({ page }) => {
    await seedCleric(page, { level: 3, wis: 16, prepared: ['bless'] });
    await page.evaluate(() => {
      localStorage.setItem('spellDetailsCache_v1', JSON.stringify({
        bless: {
          index: 'bless', name: 'Bless', level: '1"><img src=x onerror="window.__xss=1">',
          casting_time: '1 action', range: '30 feet', duration: '1 minute', components: ['V'],
          desc: ['<img src=x onerror="window.__xss=1">literal'],
        },
      }));
    });
    await cutApi(page);
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await openSpellcasting(page);

    const item = page.locator('#spellPreparedRoot [data-prepared="bless"]');
    await expect(item).toBeVisible();
    await item.locator('.spell-prep-name').click();
    await expect(item).toContainText('<img src=x onerror="window.__xss=1">literal');
    await expect(page.locator('#spellPreparedRoot img')).toHaveCount(0);
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  });
});
