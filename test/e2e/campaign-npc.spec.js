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
