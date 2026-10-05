import { test, expect } from '@playwright/test';
import fs from 'fs';

/**
 * CHARACTER-AWARE EXPORT / IMPORT (bundle v3)
 *
 * Export button → { version: 3, character, state, campaign: { npcs, sessionNotes, savedAt } }.
 * Import:
 * - file с друг `character` → съобщение, НИЩО не се прилага; без `character` = монк;
 * - героят се зарежда винаги, кампанията — САМО ако campaign.savedAt е по-нова от текущата;
 * - v2 / legacy файлове (без campaign) зареждат героя и не пипат вече датирана кампания.
 */

const OLD = '2026-01-01T00:00:00.000Z';
const MID = '2026-06-01T00:00:00.000Z';
const NEW = '2026-09-01T00:00:00.000Z';

const CUR_NPCS = [{ name: 'Текущ NPC', faction: 'Сегашни', description: '', location: '' }];
const CUR_NOTES = 'Текущи записки';
const FILE_NPCS = [{ name: 'NPC от файла', faction: 'Архив', description: '', location: '' }];
const FILE_NOTES = 'Записки от файла';

// Сетва текуща кампания (NPC-та, записки, дата) и я persist-ва.
async function seedCampaign(page, savedAt) {
  await page.evaluate(({ npcs, notes, savedAt }) => {
    window.Campaign.setNpcs(JSON.parse(JSON.stringify(npcs)));
    window.Campaign.setNotes(notes);
    window.Campaign.setSavedAt(savedAt);
    window.save();
  }, { npcs: CUR_NPCS, notes: CUR_NOTES, savedAt });
}

// Импорт през реалния file input (същия път като бутона Import).
async function importFile(page, obj) {
  await page.locator('#importFile').setInputFiles({
    name: 'import.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(obj))
  });
}

function campaignNow(page) {
  return page.evaluate(() => ({
    npcs: window.Campaign.getNpcs().map(n => n.name),
    notes: window.Campaign.getNotes(),
    savedAt: window.Campaign.getSavedAt()
  }));
}

function v3File({ character = 'monk', name = 'Файлов Монах', savedAt = NEW } = {}) {
  const f = {
    version: 3,
    state: { name, xp: 0, level: 3, monkLevel: 3, clericLevel: 0 },
    campaign: { npcs: FILE_NPCS, sessionNotes: FILE_NOTES, savedAt }
  };
  if (character !== null) f.character = character;
  if (savedAt === null) delete f.campaign.savedAt;
  return f;
}

test.describe('Character-aware export / import (bundle v3)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  test('(a) Export produces version 3 with character, state and campaign.savedAt', async ({ page }) => {
    await seedCampaign(page, null);
    await page.evaluate(() => { window.st.name = 'Експорт Монах'; window.save(); });

    const before = Date.now();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#btnExport').click()
    ]);
    // името на файла не се променя: <име>_<stamp>_bundle.json
    expect(download.suggestedFilename()).toMatch(/^Експорт_Монах_\d{8}_\d{6}_bundle\.json$/);

    const file = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    expect(file.version).toBe(3);
    expect(file.character).toBe('monk');
    expect(file.state.name).toBe('Експорт Монах');
    expect(file.campaign.npcs.map(n => n.name)).toEqual(['Текущ NPC']);
    expect(file.campaign.sessionNotes).toBe(CUR_NOTES);
    expect(typeof file.campaign.savedAt).toBe('string');
    expect(new Date(file.campaign.savedAt).toISOString()).toBe(file.campaign.savedAt);
    expect(Date.parse(file.campaign.savedAt)).toBeGreaterThanOrEqual(before - 1000);
  });

  test('(b) v2 file (no campaign) loads the hero and leaves a dated campaign alone', async ({ page }) => {
    await seedCampaign(page, MID);

    await importFile(page, {
      version: 2,
      state: { name: 'V2 Монах', xp: 0, level: 2, campaignNpcs: FILE_NPCS, sessionNotes: FILE_NOTES },
      sessionNotes: FILE_NOTES
    });
    await expect.poll(() => page.evaluate(() => window.st.name)).toBe('V2 Монах');
    expect(await page.evaluate(() => window.st.level)).toBe(2);
    expect(await campaignNow(page)).toEqual({ npcs: ['Текущ NPC'], notes: CUR_NOTES, savedAt: MID });
  });

  test('(b2) v2 file without campaign fields does not wipe an undated campaign', async ({ page }) => {
    await seedCampaign(page, null);

    await importFile(page, { version: 2, state: { name: 'Гол V2', xp: 0, level: 1 } });
    await expect.poll(() => page.evaluate(() => window.st.name)).toBe('Гол V2');
    expect(await campaignNow(page)).toEqual({ npcs: ['Текущ NPC'], notes: CUR_NOTES, savedAt: null });
  });

  test('(c) older campaign.savedAt keeps the current NPCs and notes', async ({ page }) => {
    await seedCampaign(page, MID);

    await importFile(page, v3File({ savedAt: OLD }));
    await expect.poll(() => page.evaluate(() => window.st.name)).toBe('Файлов Монах');
    expect(await campaignNow(page)).toEqual({ npcs: ['Текущ NPC'], notes: CUR_NOTES, savedAt: MID });

    // и след reload пак е така (нищо не е изядено в localStorage)
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    expect(await campaignNow(page)).toEqual({ npcs: ['Текущ NPC'], notes: CUR_NOTES, savedAt: MID });
  });

  test('(c2) campaign without savedAt is ignored', async ({ page }) => {
    await seedCampaign(page, null);

    await importFile(page, v3File({ savedAt: null }));
    await expect.poll(() => page.evaluate(() => window.st.name)).toBe('Файлов Монах');
    expect(await campaignNow(page)).toEqual({ npcs: ['Текущ NPC'], notes: CUR_NOTES, savedAt: null });
  });

  test('(d) newer campaign.savedAt replaces NPCs and notes', async ({ page }) => {
    await seedCampaign(page, MID);

    await importFile(page, v3File({ savedAt: NEW }));
    await expect.poll(() => page.evaluate(() => window.st.name)).toBe('Файлов Монах');
    expect(await campaignNow(page)).toEqual({ npcs: ['NPC от файла'], notes: FILE_NOTES, savedAt: NEW });

    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    expect(await campaignNow(page)).toEqual({ npcs: ['NPC от файла'], notes: FILE_NOTES, savedAt: NEW });
  });

  test('(e) file of another character shows a message and changes nothing', async ({ page }) => {
    await seedCampaign(page, OLD);
    await page.evaluate(() => { window.st.name = 'Активен Монах'; window.save(); });
    const stored = await page.evaluate(() => localStorage.getItem('monkSheet_v3'));

    let message = null;
    page.on('dialog', d => { message = d.message(); d.accept(); });
    await importFile(page, v3File({ character: 'cleric', savedAt: NEW }));

    await expect.poll(() => message).not.toBeNull();
    expect(message).toMatch(/cleric/i);  // label на профила (Cleric) или id, ако профилът липсва
    expect(message).toContain('Monk');
    expect(await page.evaluate(() => window.st.name)).toBe('Активен Монах');
    expect(await campaignNow(page)).toEqual({ npcs: ['Текущ NPC'], notes: CUR_NOTES, savedAt: OLD });
    expect(await page.evaluate(() => localStorage.getItem('monkSheet_v3'))).toBe(stored);
  });

  test('(f) file without a character field is taken as monk', async ({ page }) => {
    await seedCampaign(page, MID);

    let message = null;
    page.on('dialog', d => { message = d.message(); d.accept(); });
    await importFile(page, v3File({ character: null, name: 'Безименен файл', savedAt: NEW }));

    await expect.poll(() => page.evaluate(() => window.st.name)).toBe('Безименен файл');
    expect(message).toBeNull();
    expect(await campaignNow(page)).toEqual({ npcs: ['NPC от файла'], notes: FILE_NOTES, savedAt: NEW });
  });

});
