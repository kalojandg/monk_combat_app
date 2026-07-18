import { test, expect } from '@playwright/test';

// Консолидиран Name Gen таб: Alias / Familiar / NPC през един registry.
// Save-ът РУТИРА към СЪЩИТЕ хранилища като старите табове:
//   alias → st.aliases · familiar → st.familiars · npc → st.npcNames
// (familiar записите вече живеят в st.familiars, за да round-trip-ват през bundle-а;
//  старият localStorage['familiars_v1'] се мигрира еднократно при attach.)

const FAM_LS_KEY = 'familiars_v1';

test.describe('Name Gen - consolidated UI', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await page.locator('button[data-tab="namegen"]').click();
    await page.waitForTimeout(300);
  });

  // (а)
  test('opens with 3 type buttons, empty output, Save disabled', async ({ page }) => {
    await expect(page.locator('#genTypeButtons [data-gentype="alias"]')).toBeVisible();
    await expect(page.locator('#genTypeButtons [data-gentype="familiar"]')).toBeVisible();
    await expect(page.locator('#genTypeButtons [data-gentype="npc"]')).toBeVisible();

    expect(await page.locator('#genOutput').inputValue()).toBe('');
    expect(await page.locator('#genOutput').getAttribute('readonly')).not.toBeNull();
    await expect(page.locator('#genSave')).toBeDisabled();
  });

  // (б) alias
  test('alias: Generate fills output, Save routes to st.aliases and log', async ({ page }) => {
    await page.locator('#genGenerate').click();
    await page.waitForTimeout(200);
    const name = await page.locator('#genOutput').inputValue();
    expect(name.length).toBeGreaterThan(0);
    await expect(page.locator('#genSave')).toBeEnabled();

    await page.locator('#genSave').click();
    await page.waitForTimeout(100);
    await expect(page.locator('#genAliasModal')).not.toHaveClass(/hidden/);
    await page.locator('#genAliasToInput').fill('The innkeeper');
    await page.locator('#genAliasConfirm').click();
    await page.waitForTimeout(200);

    // ред в лога
    await expect(page.locator('#genLog')).toContainText(name);
    await expect(page.locator('#genLog')).toContainText('The innkeeper');

    // записът е в st.aliases с непроменена схема { name, to, ts }
    const aliases = await page.evaluate(() => window.st.aliases);
    expect(aliases.length).toBe(1);
    expect(aliases[0].name).toBe(name);
    expect(aliases[0].to).toBe('The innkeeper');
    expect(typeof aliases[0].ts).toBe('number');

    // Save се disable-ва след запис
    await expect(page.locator('#genSave')).toBeDisabled();
  });

  // (в) familiar
  test('familiar: group click fills output, Save routes to st.familiars and log', async ({ page }) => {
    await page.locator('#genTypeButtons [data-gentype="familiar"]').click();
    await page.waitForTimeout(200);

    // групите се показват, Generate се скрива
    await expect(page.locator('#genFamGroups')).toBeVisible();
    await expect(page.locator('#genGenerate')).toBeHidden();

    await page.locator('#genFamGroups [data-famcat="feline"]').click();
    await page.waitForTimeout(200);
    const name = await page.locator('#genOutput').inputValue();
    expect(name.length).toBeGreaterThan(0);
    await expect(page.locator('#genSave')).toBeEnabled();

    await page.locator('#genSave').click();
    await page.waitForTimeout(100);
    await expect(page.locator('#genFamModal')).not.toHaveClass(/hidden/);
    await page.locator('#genFamNoteInput').fill('Друидският вълк');
    await page.locator('#genFamConfirm').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#genLog')).toContainText(name);
    await expect(page.locator('#genLog')).toContainText('Друидският вълк');

    // записът е в st.familiars, непроменена схема { name, cat, note, ts }
    const recs = await page.evaluate(() => window.st.familiars);
    expect(recs.length).toBe(1);
    expect(recs[0].name).toBe(name);
    expect(recs[0].cat).toBe('feline');
    expect(recs[0].note).toBe('Друидският вълк');
    expect(typeof recs[0].ts).toBe('number');
  });

  // (б-миграция) стар familiars_v1 ключ се мигрира в st.familiars при attach
  test('familiar: legacy familiars_v1 records migrate into st.familiars on load', async ({ page }) => {
    // seed-ни стар запис ПРЕДИ да отворим таба (симулира жив персонаж)
    await page.evaluate((key) => {
      localStorage.setItem(key, JSON.stringify([
        { name: 'Legacy Cat', cat: 'feline', note: 'от стария ключ', ts: 1710000000000 }
      ]));
    }, FAM_LS_KEY);
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await page.locator('button[data-tab="namegen"]').click();
    await page.waitForTimeout(300);

    // превключи към familiar → редът се вижда в таблицата
    await page.locator('#genTypeButtons [data-gentype="familiar"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#genLog')).toContainText('Legacy Cat');
    await expect(page.locator('#genLog')).toContainText('от стария ключ');

    // записът е в st.familiars, а старият ключ е изтрит
    const recs = await page.evaluate(() => window.st.familiars);
    expect(recs.length).toBe(1);
    expect(recs[0].name).toBe('Legacy Cat');
    expect(recs[0].cat).toBe('feline');
    const oldKey = await page.evaluate((key) => localStorage.getItem(key), FAM_LS_KEY);
    expect(oldKey).toBeNull();
  });

  // (г) npc
  test('npc: radios visible, Generate by race, Save routes to st.npcNames', async ({ page }) => {
    await page.locator('#genTypeButtons [data-gentype="npc"]').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#genNpcOptions')).toBeVisible();
    await expect(page.locator('input[name="genNpcRace"][value="human"]')).toBeVisible();
    await expect(page.locator('input[name="genNpcGender"][value="male"]')).toBeVisible();

    await page.locator('#genGenerate').click();
    await page.waitForTimeout(200);
    const name = await page.locator('#genOutput').inputValue();
    expect(name.length).toBeGreaterThan(0);

    await page.locator('#genSave').click();
    await page.waitForTimeout(100);
    await expect(page.locator('#genNpcModal')).not.toHaveClass(/hidden/);
    await page.locator('#genNpcNoteInput').fill('Town guard');
    await page.locator('#genNpcConfirm').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#genLog')).toContainText(name);
    await expect(page.locator('#genLog')).toContainText('Town guard');

    const npcs = await page.evaluate(() => window.st.npcNames);
    expect(npcs.length).toBe(1);
    expect(npcs[0].name).toBe(name);
    expect(npcs[0].note).toBe('Town guard');
  });

  // toblin скрива gender
  test('npc: selecting toblin hides gender group', async ({ page }) => {
    await page.locator('#genTypeButtons [data-gentype="npc"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#genNpcGenderGroup')).toBeVisible();
    await page.locator('input[name="genNpcRace"][value="toblin"]').check();
    await page.waitForTimeout(100);
    await expect(page.locator('#genNpcGenderGroup')).toBeHidden();
  });

  // (д) смяна на тип чисти зоната, disable-ва Save, сменя таблицата
  test('switching type clears output, disables Save, swaps the log table', async ({ page }) => {
    // запази един alias
    await page.locator('#genGenerate').click();
    await page.waitForTimeout(200);
    const aliasName = await page.locator('#genOutput').inputValue();
    await page.locator('#genSave').click();
    await page.waitForTimeout(100);
    await page.locator('#genAliasToInput').fill('Someone');
    await page.locator('#genAliasConfirm').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#genLog')).toContainText(aliasName);

    // смени към familiar → зоната празна, Save disabled, таблицата смени
    await page.locator('#genTypeButtons [data-gentype="familiar"]').click();
    await page.waitForTimeout(200);
    expect(await page.locator('#genOutput').inputValue()).toBe('');
    await expect(page.locator('#genSave')).toBeDisabled();
    await expect(page.locator('#genLog')).not.toContainText(aliasName);
    await expect(page.locator('#genTypeButtons [data-gentype="familiar"]')).toHaveClass(/\bactive\b/);
  });

  // (е) изтриване на ред работи (alias)
  test('delete removes a row from the active log', async ({ page }) => {
    await page.locator('#genGenerate').click();
    await page.waitForTimeout(200);
    await page.locator('#genSave').click();
    await page.waitForTimeout(100);
    await page.locator('#genAliasToInput').fill('To delete');
    await page.locator('#genAliasConfirm').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#genLog')).toContainText('To delete');

    await page.locator('#genLog .gen-del').first().click();
    await page.waitForTimeout(200);
    await expect(page.locator('#genLog')).not.toContainText('To delete');
    const aliases = await page.evaluate(() => window.st.aliases);
    expect(aliases.length).toBe(0);
  });
});
