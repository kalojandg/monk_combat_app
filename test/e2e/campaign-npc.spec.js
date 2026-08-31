import { test, expect } from '@playwright/test';

/**
 * CAMPAIGN NPCs TESTS
 *
 * Дневник на срещнатите NPC-та: име + фракция, add/edit/delete, персистенция.
 * Еталон: crud-inventory.spec.js (същият CRUD патърн).
 */

async function openCampaignNpcTab(page) {
  await page.locator('button[data-tab="campaignNpc"]').click();
  await page.waitForTimeout(300); // tab HTML + attach listeners (showTab setTimeout 100)
}

async function bootClean(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
  await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
}

async function addNpc(page, { name, faction, description, location }) {
  await page.locator('#btnNpcAdd').click();
  await page.waitForTimeout(100);
  if (name !== undefined) await page.locator('#npcName').fill(name);
  if (faction !== undefined) await page.locator('#npcFaction').fill(faction);
  if (description !== undefined) await page.locator('#npcDescription').fill(description);
  if (location !== undefined) await page.locator('#npcLocation').fill(location);
  await page.locator('#npcSave').click();
  await page.waitForTimeout(200);
}

test.describe('Campaign NPCs - Tab and empty state', () => {

  test.beforeEach(async ({ page }) => {
    await bootClean(page);
  });

  test('Tab opens and shows the empty state', async ({ page }) => {
    await openCampaignNpcTab(page);

    await expect(page.locator('#tab-campaignNpc')).toBeVisible();
    await expect(page.locator('#btnNpcAdd')).toBeVisible();
    await expect(page.locator('#npcSearch')).toBeVisible();
    await expect(page.locator('#npcTableRoot')).toContainText('Няма записани NPC-та още.');
  });

});

test.describe('Campaign NPCs - Add', () => {

  test.beforeEach(async ({ page }) => {
    await bootClean(page);
    await openCampaignNpcTab(page);
  });

  test('Can add an NPC with all four fields', async ({ page }) => {
    await addNpc(page, {
      name: 'Кулсталтин',
      faction: 'кралицата на Кислев',
      description: 'Стар магьосник с лоши маниери.',
      location: 'Кръчмата на пристанището'
    });

    const root = page.locator('#npcTableRoot');
    await expect(root).toContainText('Кулсталтин');
    await expect(root).toContainText('кралицата на Кислев');

    const stored = await page.evaluate(() => window.st.campaignNpcs);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toEqual({
      name: 'Кулсталтин',
      faction: 'кралицата на Кислев',
      description: 'Стар магьосник с лоши маниери.',
      location: 'Кръчмата на пристанището'
    });
  });

  test('Empty name shows an alert and saves nothing', async ({ page }) => {
    const messages = [];
    page.on('dialog', async dialog => {
      messages.push(dialog.message());
      await dialog.accept();
    });

    await page.locator('#btnNpcAdd').click();
    await page.waitForTimeout(100);
    await page.locator('#npcFaction').fill('Без име');
    await page.locator('#npcSave').click();
    await page.waitForTimeout(200);

    expect(messages.join(' ')).toContain('Името е задължително.');
    const stored = await page.evaluate(() => window.st.campaignNpcs);
    expect(stored).toHaveLength(0);
  });

});

test.describe('Campaign NPCs - Edit', () => {

  test.beforeEach(async ({ page }) => {
    await bootClean(page);
    await openCampaignNpcTab(page);
    await addNpc(page, {
      name: 'Распутин',
      faction: 'руснаците',
      description: 'Не умира лесно.',
      location: 'Зимният дворец'
    });
  });

  test('Edit modal pre-fills all four fields', async ({ page }) => {
    await page.locator('button[data-npc-edit="0"]').click();
    await page.waitForTimeout(100);

    await expect(page.locator('#npcModal')).toBeVisible();
    await expect(page.locator('#npcName')).toHaveValue('Распутин');
    await expect(page.locator('#npcFaction')).toHaveValue('руснаците');
    await expect(page.locator('#npcDescription')).toHaveValue('Не умира лесно.');
    await expect(page.locator('#npcLocation')).toHaveValue('Зимният дворец');
  });

  test('Editing the faction updates the row without adding a record', async ({ page }) => {
    await page.locator('button[data-npc-edit="0"]').click();
    await page.waitForTimeout(100);
    await page.locator('#npcFaction').fill('болшевиките');
    await page.locator('#npcSave').click();
    await page.waitForTimeout(200);

    const root = page.locator('#npcTableRoot');
    await expect(root).toContainText('болшевиките');
    await expect(root).not.toContainText('руснаците');

    const stored = await page.evaluate(() => window.st.campaignNpcs);
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('Распутин');
    expect(stored[0].faction).toBe('болшевиките');
  });

});

test.describe('Campaign NPCs - Delete', () => {

  test.beforeEach(async ({ page }) => {
    await bootClean(page);
    await openCampaignNpcTab(page);
    await addNpc(page, { name: 'NPC A', faction: 'Фракция A' });
    await addNpc(page, { name: 'NPC B', faction: 'Фракция B' });
  });

  test('Can delete an NPC after confirming', async ({ page }) => {
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Изтриване');
      await dialog.accept();
    });

    await page.locator('button[data-npc-del="0"]').click();
    await page.waitForTimeout(300);

    const root = page.locator('#npcTableRoot');
    await expect(root).not.toContainText('NPC A');
    await expect(root).toContainText('NPC B');

    const stored = await page.evaluate(() => window.st.campaignNpcs);
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('NPC B');
  });

});

test.describe('Campaign NPCs - Persistence', () => {

  test.beforeEach(async ({ page }) => {
    await bootClean(page);
    await openCampaignNpcTab(page);
  });

  test('NPC survives a page reload', async ({ page }) => {
    await addNpc(page, {
      name: 'Баба Яга',
      faction: 'горските духове',
      description: 'Къща на кокоши крака.',
      location: 'Дълбоката гора'
    });

    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await openCampaignNpcTab(page);

    const root = page.locator('#npcTableRoot');
    await expect(root).toContainText('Баба Яга');
    await expect(root).toContainText('горските духове');

    const stored = await page.evaluate(() => window.st.campaignNpcs);
    expect(stored).toHaveLength(1);
    expect(stored[0].location).toBe('Дълбоката гора');
  });

});

/* =========================================================================
 * Таск 820 — търсене (slash-aware) + детайлен ред
 * ========================================================================= */

// Реални примери от кампанията: и името, и фракцията могат да носят няколко
// стойности, разделени с / или \.
const NPC_SEED = [
  { name: 'Гримгор', faction: 'орките', description: '', location: '' },
  {
    name: 'Катарин',
    faction: 'кралицата на Кислев/руснаците',
    description: 'Ледената кралица.',
    location: 'Ледения дворец'
  },
  {
    name: 'Кулсталтин/Распутин',
    faction: 'окултен лидер',
    description: 'Кръстен от партито.',
    location: ''
  }
];

async function seedNpcs(page, list = NPC_SEED) {
  await page.evaluate(l => {
    window.st.campaignNpcs = JSON.parse(JSON.stringify(l));
    window.save();
  }, list);
  await page.waitForTimeout(200);
}

test.describe('Campaign NPCs - npcMatches (чиста функция)', () => {

  test.beforeEach(async ({ page }) => {
    await bootClean(page);
    await openCampaignNpcTab(page);
  });

  test('npcMatches is exposed on window', async ({ page }) => {
    const type = await page.evaluate(() => typeof window.npcMatches);
    expect(type).toBe('function');
  });

  test('Slash in the faction matches the trailing part', async ({ page }) => {
    const katarin = NPC_SEED[1];
    const hit = await page.evaluate(n => window.npcMatches(n, 'руснаци'), katarin);
    expect(hit).toBe(true);
  });

  test('Matching is case-insensitive', async ({ page }) => {
    const katarin = NPC_SEED[1];
    const hit = await page.evaluate(n => window.npcMatches(n, 'РУСНАЦИ'), katarin);
    expect(hit).toBe(true);
  });

  test('Slash in the NAME matches the trailing part', async ({ page }) => {
    const kulstaltin = NPC_SEED[2];
    const hit = await page.evaluate(n => window.npcMatches(n, 'распутин'), kulstaltin);
    expect(hit).toBe(true);
  });

  test('The query is trimmed before matching', async ({ page }) => {
    const katarin = NPC_SEED[1];
    const hit = await page.evaluate(n => window.npcMatches(n, ' кислев '), katarin);
    expect(hit).toBe(true);
  });

  test('A substring inside a part matches', async ({ page }) => {
    const katarin = NPC_SEED[1];
    const hit = await page.evaluate(n => window.npcMatches(n, 'наци'), katarin);
    expect(hit).toBe(true);
  });

  test('A query that is nowhere does not match', async ({ page }) => {
    const katarin = NPC_SEED[1];
    const hit = await page.evaluate(n => window.npcMatches(n, 'елф'), katarin);
    expect(hit).toBe(false);
  });

  test('An empty query matches everything', async ({ page }) => {
    const results = await page.evaluate(seed => seed.map(n => window.npcMatches(n, '')), NPC_SEED);
    expect(results).toEqual([true, true, true]);
  });

});

test.describe('Campaign NPCs - Live search', () => {

  test.beforeEach(async ({ page }) => {
    await bootClean(page);
    await openCampaignNpcTab(page);
    await seedNpcs(page);
  });

  test('Typing filters the table down to the matching rows', async ({ page }) => {
    await page.locator('#npcSearch').fill('руснаци');
    await page.waitForTimeout(200);

    const rows = page.locator('#npcTableRoot tr[data-npc-idx]');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Катарин');

    const root = page.locator('#npcTableRoot');
    await expect(root).not.toContainText('Гримгор');
    await expect(root).not.toContainText('Кулсталтин');
  });

  test('Clearing the search brings every row back', async ({ page }) => {
    await page.locator('#npcSearch').fill('руснаци');
    await page.waitForTimeout(200);
    await page.locator('#npcSearch').fill('');
    await page.waitForTimeout(200);

    await expect(page.locator('#npcTableRoot tr[data-npc-idx]')).toHaveCount(3);
  });

  test('A query with no hits shows the no-matches message', async ({ page }) => {
    await page.locator('#npcSearch').fill('елфи');
    await page.waitForTimeout(200);

    await expect(page.locator('#npcTableRoot')).toContainText('Няма съвпадения.');
    await expect(page.locator('#npcTableRoot tr[data-npc-idx]')).toHaveCount(0);
  });

  test('Editing a visible row while filtering hits the right record', async ({ page }) => {
    await page.locator('#npcSearch').fill('руснаци');
    await page.waitForTimeout(200);

    const row = page.locator('#npcTableRoot tr[data-npc-idx]').first();
    await row.locator('button[title="Edit"]').click();
    await page.waitForTimeout(150);

    await expect(page.locator('#npcName')).toHaveValue('Катарин');
    await page.locator('#npcFaction').fill('болшевиките');
    await page.locator('#npcSave').click();
    await page.waitForTimeout(250);

    const stored = await page.evaluate(() => window.st.campaignNpcs);
    expect(stored).toHaveLength(3);
    expect(stored[0].name).toBe('Гримгор');
    expect(stored[1].name).toBe('Катарин');
    expect(stored[1].faction).toBe('болшевиките');
    expect(stored[2].name).toBe('Кулсталтин/Распутин');
  });

});

test.describe('Campaign NPCs - Details row', () => {

  test.beforeEach(async ({ page }) => {
    await bootClean(page);
    await openCampaignNpcTab(page);
    await seedNpcs(page);
  });

  test('The details button shows description and where-to-find', async ({ page }) => {
    await page.locator('button[data-npc-details="1"]').click();
    await page.waitForTimeout(200);

    const details = page.locator('#npcTableRoot tr.npc-details-row');
    await expect(details).toHaveCount(1);
    await expect(details).toContainText('Description');
    await expect(details).toContainText('Ледената кралица.');
    await expect(details).toContainText('Where to find');
    await expect(details).toContainText('Ледения дворец');
  });

  test('Only one row is expanded at a time', async ({ page }) => {
    await page.locator('button[data-npc-details="1"]').click();
    await page.waitForTimeout(200);
    await page.locator('button[data-npc-details="2"]').click();
    await page.waitForTimeout(200);

    const details = page.locator('#npcTableRoot tr.npc-details-row');
    await expect(details).toHaveCount(1);
    await expect(details).toContainText('Кръстен от партито.');
    await expect(details).not.toContainText('Ледената кралица.');
  });

  test('Clicking the same details button again collapses the row', async ({ page }) => {
    await page.locator('button[data-npc-details="1"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#npcTableRoot tr.npc-details-row')).toHaveCount(1);

    await page.locator('button[data-npc-details="1"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#npcTableRoot tr.npc-details-row')).toHaveCount(0);
  });

  test('An NPC without details says so', async ({ page }) => {
    await page.locator('button[data-npc-details="0"]').click();
    await page.waitForTimeout(200);

    const details = page.locator('#npcTableRoot tr.npc-details-row');
    await expect(details).toHaveCount(1);
    await expect(details).toContainText('Няма детайли.');
    await expect(details).not.toContainText('Description');
  });

  test('An empty field block is skipped', async ({ page }) => {
    // Кулсталтин има описание, но няма „Where to find".
    await page.locator('button[data-npc-details="2"]').click();
    await page.waitForTimeout(200);

    const details = page.locator('#npcTableRoot tr.npc-details-row');
    await expect(details).toContainText('Description');
    await expect(details).not.toContainText('Where to find');
  });

  test('The expanded row survives a re-render while it stays visible', async ({ page }) => {
    await page.locator('button[data-npc-details="1"]').click();
    await page.waitForTimeout(200);

    await page.locator('#npcSearch').fill('кислев');
    await page.waitForTimeout(200);

    const details = page.locator('#npcTableRoot tr.npc-details-row');
    await expect(details).toHaveCount(1);
    await expect(details).toContainText('Ледената кралица.');
  });

});

/* =========================================================================
 * Drag reorder — state-level покритие. Реален mouse drag е flaky
 * (Playwright + SortableJS timing, урокът от quest drag теста), затова
 * симулираме каквото Sortable прави: местим <tr> в DOM-а и викаме onEnd
 * през инстанцията (Sortable.get, наличен от SortableJS 1.11+).
 * ========================================================================= */

// Мести първия видим ред в края на tbody и пуска onEnd — както след реален drag.
async function simulateDragFirstRowToEnd(page) {
  await page.evaluate(() => {
    const tbody = document.getElementById('npcTableBody');
    const inst = Sortable.get(tbody);
    const rows = tbody.querySelectorAll('tr[data-npc-idx]');
    tbody.appendChild(rows[0]);
    inst.options.onEnd();
  });
  await page.waitForTimeout(200);
}

test.describe('Campaign NPCs - Drag reorder (state-level)', () => {

  test.beforeEach(async ({ page }) => {
    await bootClean(page);
    await openCampaignNpcTab(page);
    await seedNpcs(page);
  });

  test('Sortable instance is attached to the unfiltered table', async ({ page }) => {
    const attached = await page.evaluate(() => {
      const tbody = document.getElementById('npcTableBody');
      return !!(tbody && Sortable.get(tbody));
    });
    expect(attached).toBe(true);
  });

  test('Simulated drag reorders st.campaignNpcs and persists', async ({ page }) => {
    await simulateDragFirstRowToEnd(page);

    const stored = await page.evaluate(() => window.st.campaignNpcs.map(n => n.name));
    expect(stored).toEqual(['Катарин', 'Кулсталтин/Распутин', 'Гримгор']);

    const persisted = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('monkSheet_v3')).campaignNpcs.map(n => n.name));
    expect(persisted).toEqual(['Катарин', 'Кулсталтин/Распутин', 'Гримгор']);

    // Re-render-ът показва новия ред.
    const rows = page.locator('#npcTableRoot tr[data-npc-idx]');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText('Катарин');
    await expect(rows.nth(2)).toContainText('Гримгор');
  });

  test('Reorder with an expanded details row keeps the order honest and collapses it', async ({ page }) => {
    await page.locator('button[data-npc-details="1"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#npcTableRoot tr.npc-details-row')).toHaveCount(1);

    await simulateDragFirstRowToEnd(page);

    // Детайлният ред (без data-npc-idx) не се брои при четенето на новия ред.
    const stored = await page.evaluate(() => window.st.campaignNpcs.map(n => n.name));
    expect(stored).toEqual(['Катарин', 'Кулсталтин/Распутин', 'Гримгор']);
    await expect(page.locator('#npcTableRoot tr.npc-details-row')).toHaveCount(0);
  });

  test('Sortable is NOT created while a filter is active', async ({ page }) => {
    await page.locator('#npcSearch').fill('руснаци');
    await page.waitForTimeout(200);

    const filtered = await page.evaluate(() => {
      const tbody = document.getElementById('npcTableBody');
      return {
        rows: tbody ? tbody.querySelectorAll('tr[data-npc-idx]').length : 0,
        sortable: !!(tbody && Sortable.get(tbody))
      };
    });
    expect(filtered.rows).toBe(1);
    expect(filtered.sortable).toBe(false);

    // Изчистването на филтъра връща drag-а.
    await page.locator('#npcSearch').fill('');
    await page.waitForTimeout(200);
    const unfiltered = await page.evaluate(() =>
      !!Sortable.get(document.getElementById('npcTableBody')));
    expect(unfiltered).toBe(true);
  });

});
