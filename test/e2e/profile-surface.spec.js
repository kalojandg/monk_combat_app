import { test, expect } from '@playwright/test';

/**
 * PROFILE SURFACE
 *
 * Всеки class profile декларира какво вижда героят: `tabs` (ключовете на табовете
 * в реда на показване), `featureFiles` (JSON-ите на Skills → Personal), `flavorTypes`
 * и `ttsVoice`. Монкът е непроменен (днешните 9 таба, вкл. Resurrection, без
 * Spellcasting; акордеон с [Monk] + [Cleric]); клерикът сменя Resurrection със
 * Spellcasting и чете Grave Domain уменията.
 */

const MONK_TABS = [
  'stats', 'pcchar', 'resurrection', 'inventory', 'flavor',
  'skills', 'sessionNotes', 'namegen', 'campaignNpc'
];
const CLERIC_TABS = [
  'stats', 'pcchar', 'spellcasting', 'inventory', 'flavor',
  'skills', 'sessionNotes', 'namegen', 'campaignNpc'
];

async function ready(page) {
  await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
}

async function switchTo(page, id) {
  await page.locator(`#charSwitcher [data-char="${id}"]`).click();
  await expect(page.locator(`#charSwitcher [data-char="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
}

// Видимите бутони на главния tab-nav, в реда, в който се показват
function visibleTabs(page) {
  return page.evaluate(() => {
    const nav = document.querySelector('#app > .tab-nav');
    return Array.from(nav.querySelectorAll('.tab-btn[data-tab]'))
      .filter(b => b.offsetParent !== null)
      .map(b => b.dataset.tab);
  });
}

async function openPersonalSkills(page) {
  await page.locator('.tab-btn[data-tab="skills"]').click();
  await page.waitForSelector('#featuresAccordion details.feat', { timeout: 5000 });
}

function featureSummaries(page) {
  return page.locator('#featuresAccordion details.feat summary').allTextContents();
}

test.describe('Profile surface: tabs and feature files', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await ready(page);
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  test('both profiles declare tabs, featureFiles, flavorTypes and ttsVoice', async ({ page }) => {
    const r = await page.evaluate(() => {
      const pick = p => ({ tabs: p.tabs, featureFiles: p.featureFiles, flavorTypes: p.flavorTypes, ttsVoice: p.ttsVoice });
      return { monk: pick(window.CLASS_PROFILES.monk), cleric: pick(window.CLASS_PROFILES.cleric) };
    });
    expect(r.monk).toEqual({
      tabs: MONK_TABS,
      featureFiles: ['skills-and-features.json', 'cleric-features.json'],
      flavorTypes: null,
      ttsVoice: null
    });
    expect(r.cleric).toEqual({
      tabs: CLERIC_TABS,
      featureFiles: ['grave-features.json'],
      flavorTypes: ['insult', 'spare-dying', 'heal-zero'],
      ttsVoice: null
    });
  });

  test('(a) monk sees exactly today\'s tabs, including Resurrection, and no Spellcasting', async ({ page }) => {
    expect(await visibleTabs(page)).toEqual(MONK_TABS);
    await expect(page.locator('.tab-btn[data-tab="resurrection"]')).toBeVisible();
    await expect(page.locator('.tab-btn[data-tab="spellcasting"]')).toBeHidden();
  });

  test('(b) cleric has Spellcasting instead of Resurrection', async ({ page }) => {
    await switchTo(page, 'cleric');
    expect(await visibleTabs(page)).toEqual(CLERIC_TABS);
    await expect(page.locator('.tab-btn[data-tab="resurrection"]')).toBeHidden();
    await expect(page.locator('.tab-btn[data-tab="spellcasting"]')).toBeVisible();

    await page.locator('.tab-btn[data-tab="spellcasting"]').click();
    await expect(page.locator('#tab-spellcasting')).toBeVisible();
    await expect(page.locator('#tab-spellcasting > .section-title')).toHaveText('Spellcasting');
    await expect(page.locator('#tab-spellcasting #spellSlotsRoot')).toHaveCount(1);
    await expect(page.locator('#tab-spellcasting #spellPreparedRoot')).toHaveCount(1);
    await expect(page.locator('#tab-spellcasting #spellLibraryRoot')).toHaveCount(1);
  });

  test('(c) monk → cleric → monk restores the right tab set each time', async ({ page }) => {
    await switchTo(page, 'cleric');
    expect(await visibleTabs(page)).toEqual(CLERIC_TABS);
    await switchTo(page, 'monk');
    expect(await visibleTabs(page)).toEqual(MONK_TABS);
    await switchTo(page, 'cleric');
    expect(await visibleTabs(page)).toEqual(CLERIC_TABS);
  });

  test('(d) a tab missing on the new hero falls back to that hero\'s first tab', async ({ page }) => {
    await page.locator('.tab-btn[data-tab="resurrection"]').click();
    await expect(page.locator('#tab-resurrection')).toBeVisible();

    await switchTo(page, 'cleric');
    await expect(page.locator('#tab-resurrection')).toBeHidden();
    await expect(page.locator('.tab-btn.active[data-tab]')).toHaveAttribute('data-tab', CLERIC_TABS[0]);
    await expect(page.locator(`#tab-${CLERIC_TABS[0]}`)).toBeVisible();

    // След reload клерикът пак не отваря запомнения чужд таб
    await page.evaluate(() => localStorage.setItem('activeTab', 'resurrection'));
    await page.reload();
    await ready(page);
    await expect(page.locator('#tab-resurrection')).toBeHidden();
    await expect(page.locator(`#tab-${CLERIC_TABS[0]}`)).toBeVisible();
  });

  test('(e) cleric Skills → Personal shows Grave features and no monk features', async ({ page }) => {
    await switchTo(page, 'cleric');
    await openPersonalSkills(page);
    const summaries = await featureSummaries(page);
    expect(summaries.some(s => s.includes('Circle of Mortality'))).toBe(true);
    expect(summaries.some(s => s.includes('Martial Arts'))).toBe(false);
    expect(summaries.every(s => s.includes('[Cleric]'))).toBe(true);
  });

  test('(f) monk accordion is unchanged: [Monk] and [Cleric] entries, interleaved by level', async ({ page }) => {
    await page.evaluate(() => {
      window.st.level = 3;
      window.st.monkLevel = 2;
      window.st.clericLevel = 1;
      window.save();
    });
    await openPersonalSkills(page);
    const summaries = (await featureSummaries(page)).map(s => s.trim());
    expect(summaries.some(s => s.startsWith('[Monk]'))).toBe(true);
    expect(summaries.some(s => s.startsWith('[Cleric]'))).toBe(true);
    expect(summaries.some(s => s.includes('Martial Arts'))).toBe(true);
    // Death Domain (cleric-features.json), не Grave
    expect(summaries.some(s => s.includes('Reaper'))).toBe(true);
    expect(summaries.some(s => s.includes('Circle of Mortality'))).toBe(false);
    // Lv 1: всички [Monk] преди [Cleric]
    const lv1 = summaries.filter(s => s.includes('Lv 1 '));
    const firstCleric = lv1.findIndex(s => s.startsWith('[Cleric]'));
    expect(lv1.slice(firstCleric).every(s => s.startsWith('[Cleric]'))).toBe(true);
  });
});
