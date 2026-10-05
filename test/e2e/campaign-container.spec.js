import { test, expect } from '@playwright/test';

/**
 * CAMPAIGN CONTAINER (campaign_v1)
 *
 * Campaign NPCs и session notes са на КАМПАНИЯТА, не на героя: живеят в собствен
 * localStorage ключ `campaign_v1` = { npcs, sessionNotes, savedAt }, общ за всички герои.
 * При липсващ campaign_v1 той се ЗАСЯВА чрез КОПИРАНЕ от монашеския запис (monkSheet_v3);
 * старите полета там остават непокътнати.
 * Вторият герой е тестов профил ('testhero') — по модела на character-switch.spec.js.
 */

const SECOND = 'testhero';
const SECOND_KEY = 'testHeroSheet_v1';

const MONK_NPCS = [
  { name: 'Кулсталтин', faction: 'кралицата на Кислев', description: 'Стар магьосник.', location: 'Пристанището' },
  { name: 'Гримгор', faction: 'орките', description: '', location: '' }
];
const MONK_NOTES = 'Сесия 1: биехме гоблини.';

async function registerSecondProfile(page) {
  await page.addInitScript(([id, key]) => {
    window.CLASS_PROFILES = window.CLASS_PROFILES || {};
    window.CLASS_PROFILES[id] = {
      id, label: 'Test Hero', storageKey: key,
      defaults: { name: 'Second' },
      derive: (s, b) => window.CLASS_PROFILES.monk.derive(s, b),
      hiddenFieldIds: [], hasClassBadges: true, hasLevelUpModal: true, restoresKi: true
    };
  }, [SECOND, SECOND_KEY]);
}

async function ready(page) {
  await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
}

// Монашески запис със старите кампанийни полета, без campaign_v1.
async function bootWithMonkCampaignData(page) {
  await page.goto('/');
  await page.evaluate(([npcs, notes]) => {
    localStorage.clear();
    localStorage.setItem('monkSheet_v3', JSON.stringify({
      name: 'Monky', hpCurrent: 5, campaignNpcs: npcs, sessionNotes: notes
    }));
  }, [MONK_NPCS, MONK_NOTES]);
  await page.reload();
  await ready(page);
  await expect(page.locator('#hpCurrentSpan')).toHaveText('5', { timeout: 10000 });
}

function readKey(page, key) {
  return page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
}

async function openCampaignNpcTab(page) {
  await page.locator('button[data-tab="campaignNpc"]').click();
  await page.waitForTimeout(300);
}

async function addNpc(page, { name, faction }) {
  await page.locator('#btnNpcAdd').click();
  await page.waitForTimeout(100);
  await page.locator('#npcName').fill(name);
  if (faction !== undefined) await page.locator('#npcFaction').fill(faction);
  await page.locator('#npcSave').click();
  await page.waitForTimeout(200);
}

async function switchTo(page, id) {
  await page.locator(`#charSwitcher [data-char="${id}"]`).click();
  await page.waitForTimeout(300);
}

test.describe('Campaign container (campaign_v1)', () => {

  test.beforeEach(async ({ page }) => {
    await registerSecondProfile(page);
    await bootWithMonkCampaignData(page);
  });

  test('(a) missing campaign_v1 is seeded by COPYING the monk save, which stays intact', async ({ page }) => {
    const campaign = await readKey(page, 'campaign_v1');
    expect(campaign).not.toBeNull();
    expect(campaign.npcs).toEqual(MONK_NPCS);
    expect(campaign.sessionNotes).toBe(MONK_NOTES);
    // Засятата кампания е НЕДАТИРАНА: тя идва от стар запис без своя дата, а правилото
    // „кампанията върви само напред" би блокирало всеки стар експорт, ако тук сложим днешна
    // дата. Датира се чак при истинска промяна (commit) или при v3 импорт.
    expect(campaign.savedAt).toBe('');

    // Старите полета в монашеския запис НЕ са изтрити/изпразнени
    const monk = await readKey(page, 'monkSheet_v3');
    expect(monk.campaignNpcs).toEqual(MONK_NPCS);
    expect(monk.sessionNotes).toBe(MONK_NOTES);

    // Фасадата чете от контейнера
    const facade = await page.evaluate(() => ({
      npcs: window.Campaign.getNpcs().map(n => n.name),
      notes: window.Campaign.getNotes(),
      savedAt: window.Campaign.getSavedAt()
    }));
    expect(facade).toEqual({ npcs: ['Кулсталтин', 'Гримгор'], notes: MONK_NOTES, savedAt: campaign.savedAt });
  });

  test('(a) an existing campaign_v1 is NOT re-seeded from the monk save', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('campaign_v1', JSON.stringify({
        npcs: [{ name: 'Само в кампанията', faction: '', description: '', location: '' }],
        sessionNotes: 'кампанийни записки',
        savedAt: '2026-01-01T00:00:00.000Z'
      }));
    });
    await page.reload();
    await ready(page);

    const facade = await page.evaluate(() => ({
      npcs: window.Campaign.getNpcs().map(n => n.name),
      notes: window.Campaign.getNotes(),
      savedAt: window.Campaign.getSavedAt()
    }));
    expect(facade).toEqual({
      npcs: ['Само в кампанията'], notes: 'кампанийни записки', savedAt: '2026-01-01T00:00:00.000Z'
    });
  });

  test('(b) an added NPC goes into campaign_v1, not into the hero save', async ({ page }) => {
    await openCampaignNpcTab(page);
    await addNpc(page, { name: 'Распутин', faction: 'руснаците' });

    const campaign = await readKey(page, 'campaign_v1');
    expect(campaign.npcs.map(n => n.name)).toEqual(['Кулсталтин', 'Гримгор', 'Распутин']);

    // Героят пази само старото (засято) копие — новият NPC не е там
    const monk = await readKey(page, 'monkSheet_v3');
    expect(monk.campaignNpcs).toEqual(MONK_NPCS);
    expect(JSON.stringify(monk)).not.toContain('Распутин');
  });

  test('(b) session notes go into campaign_v1, not into the hero save', async ({ page }) => {
    await page.locator('button[data-tab="sessionNotes"]').click();
    await page.waitForTimeout(300);
    await page.locator('#notesInput').fill('Нова кампанийна записка');
    await page.locator('#notesInput').dispatchEvent('input');
    await page.waitForTimeout(200);

    const campaign = await readKey(page, 'campaign_v1');
    expect(campaign.sessionNotes).toBe('Нова кампанийна записка');
    const monk = await readKey(page, 'monkSheet_v3');
    expect(monk.sessionNotes).toBe(MONK_NOTES);
  });

  test('(c) NPCs and notes are the SAME for both heroes', async ({ page }) => {
    await openCampaignNpcTab(page);
    await addNpc(page, { name: 'Баба Яга', faction: 'горските духове' });
    await page.evaluate(() => { window.Campaign.setNotes('общ журнал'); window.save(); });

    await switchTo(page, SECOND);
    expect(await page.evaluate(() => window.Characters.active())).toBe(SECOND);

    const onSecond = await page.evaluate(() => ({
      npcs: window.Campaign.getNpcs().map(n => n.name),
      notes: window.Campaign.getNotes()
    }));
    expect(onSecond).toEqual({ npcs: ['Кулсталтин', 'Гримгор', 'Баба Яга'], notes: 'общ журнал' });
    await openCampaignNpcTab(page);
    await expect(page.locator('#npcTableRoot')).toContainText('Баба Яга');

    // Вторият герой добавя → монкът го вижда (и след reload)
    await addNpc(page, { name: 'Влад', faction: 'вампири' });
    expect(JSON.stringify(await readKey(page, SECOND_KEY))).not.toContain('Влад');

    await switchTo(page, 'monk');
    await page.reload();
    await ready(page);
    const onMonk = await page.evaluate(() => ({
      active: window.Characters.active(),
      npcs: window.Campaign.getNpcs().map(n => n.name),
      notes: window.Campaign.getNotes()
    }));
    expect(onMonk).toEqual({
      active: 'monk', npcs: ['Кулсталтин', 'Гримгор', 'Баба Яга', 'Влад'], notes: 'общ журнал'
    });
  });

  test('(d) every write updates savedAt', async ({ page }) => {
    const savedAt = () => page.evaluate(() => JSON.parse(localStorage.getItem('campaign_v1')).savedAt);
    const OLD = '2000-01-01T00:00:00.000Z';
    const resetSavedAt = () => page.evaluate(old => window.Campaign.setSavedAt(old), OLD);

    await resetSavedAt();
    expect(await savedAt()).toBe(OLD);
    expect(await page.evaluate(() => window.Campaign.getSavedAt())).toBe(OLD);

    // setNotes
    await page.evaluate(() => window.Campaign.setNotes('x'));
    expect(await savedAt()).not.toBe(OLD);

    // setNpcs
    await resetSavedAt();
    await page.evaluate(() => window.Campaign.setNpcs([{ name: 'Y', faction: '', description: '', location: '' }]));
    expect(await savedAt()).not.toBe(OLD);

    // in-place промяна през UI-а (push + save())
    await resetSavedAt();
    await openCampaignNpcTab(page);
    await addNpc(page, { name: 'Z' });
    expect(await savedAt()).not.toBe(OLD);
    expect((await readKey(page, 'campaign_v1')).npcs.map(n => n.name)).toEqual(['Y', 'Z']);

    // запис на героя без кампанийна промяна НЕ мърда savedAt
    await resetSavedAt();
    await page.evaluate(() => { window.st.hpCurrent = 4; window.save(); });
    expect(await savedAt()).toBe(OLD);
  });

});
