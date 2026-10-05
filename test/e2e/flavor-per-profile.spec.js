import { test, expect } from '@playwright/test';

/**
 * FLAVOR PER PROFILE
 *
 * activeProfile().flavorTypes (масив от id-та или null = всички) филтрира бутоните и
 * секциите в Flavor таба; activeProfile().ttsVoice (име или null) прегазва гласа по
 * подразбиране в заявката към TTS. Монкът има flavorTypes:null → таб без промяна.
 */

const CLERIC_IDS = ['insult', 'spare-dying', 'heal-zero'];

async function ready(page) {
  await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
}

async function switchTo(page, id) {
  await page.locator(`#charSwitcher [data-char="${id}"]`).click();
  await expect(page.locator(`#charSwitcher [data-char="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
}

async function openFlavor(page) {
  await page.locator('.tab-btn[data-tab="flavor"]').click();
  await expect(page.locator('#tab-flavor')).toBeVisible();
}

const visibleIds = (page) => page.evaluate(() =>
  Array.from(document.querySelectorAll('#tab-flavor [data-flavor]'))
    .filter(b => b.offsetParent !== null)
    .map(b => b.dataset.flavor));

const visibleTitles = (page) => page.evaluate(() =>
  Array.from(document.querySelectorAll('#tab-flavor .flavor-section-title'))
    .filter(t => t.offsetParent !== null)
    .map(t => t.textContent.trim()));

async function installTtsStubs(page) {
  await page.addInitScript(() => {
    window.__ttsFetchCalls = [];
    const realFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (url.indexOf('texttospeech.googleapis.com') !== -1) {
        let body = null;
        try { body = JSON.parse(init && init.body); } catch (e) { body = null; }
        window.__ttsFetchCalls.push({ url, body });
        return Promise.resolve(new Response(
          JSON.stringify({ audioContent: 'AAAAAAAAAAAAAAAAAAAAAA==' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        ));
      }
      return realFetch(input, init);
    };
    window.Audio = function () {
      return { play: () => Promise.resolve(), pause() {}, addEventListener() {}, removeEventListener() {} };
    };
  });
}

test.describe('Flavor per profile', () => {
  test.beforeEach(async ({ page }) => {
    await installTtsStubs(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await ready(page);
  });

  test('(a) monk (flavorTypes: null) sees every button and section', async ({ page }) => {
    await openFlavor(page);
    const all = await page.evaluate(() => window.__FLAVOR_TYPES.map(t => t.id));
    expect(all).toHaveLength(19);
    expect((await visibleIds(page)).sort()).toEqual(all.slice().sort());
    expect(await visibleTitles(page)).toHaveLength(4);
  });

  test('(b) cleric sees exactly insult / spare-dying / heal-zero, no empty headings', async ({ page }) => {
    await switchTo(page, 'cleric');
    await openFlavor(page);
    expect((await visibleIds(page)).sort()).toEqual(CLERIC_IDS.slice().sort());
    expect(await visibleTitles(page)).toEqual(['Insults & Jokes', 'Портиерът на смъртта']);
  });

  test('(c) monk -> cleric -> monk restores the right set', async ({ page }) => {
    const all = await page.evaluate(() => window.__FLAVOR_TYPES.length);
    await switchTo(page, 'cleric');
    await openFlavor(page);
    expect(await visibleIds(page)).toHaveLength(3);
    await switchTo(page, 'monk');
    expect(await visibleIds(page)).toHaveLength(all);
    expect(await visibleTitles(page)).toHaveLength(4);
  });

  test('(d) clicking a visible button as cleric fills the output', async ({ page }) => {
    await switchTo(page, 'cleric');
    await openFlavor(page);
    await page.locator('#tab-flavor [data-flavor="insult"]').click();
    await expect(page.locator('#flavorOutput')).not.toHaveValue('', { timeout: 5000 });
  });

  test('(e) ttsVoice overrides the default voice; null keeps it', async ({ page }) => {
    await openFlavor(page);
    await page.locator('#tab-flavor [data-flavor="insult"]').click();
    await expect(page.locator('#flavorOutput')).not.toHaveValue('');
    await page.evaluate(() => { window.__ttsApiKeyOverride = 'TEST_KEY'; });
    await page.locator('#btnSpeakFlavor').click();
    await page.waitForFunction(() => window.__ttsFetchCalls.length >= 1);
    const defaultVoice = await page.evaluate(() => window.__ttsFetchCalls[0].body.voice);
    expect(defaultVoice.name).toMatch(/Chirp3-HD-Sadaltager$/);

    await page.evaluate(() => {
      window.__ttsFetchCalls.length = 0;
      window.CLASS_PROFILES.monk.ttsVoice = 'en-US-Chirp3-HD-Charon';
    });
    await page.locator('#btnSpeakFlavor').click(); // stops previous speech if any
    await page.waitForTimeout(200);
    if (await page.evaluate(() => window.__ttsFetchCalls.length === 0)) {
      await page.locator('#btnSpeakFlavor').click();
    }
    await page.waitForFunction(() => window.__ttsFetchCalls.length >= 1);
    const overridden = await page.evaluate(() => window.__ttsFetchCalls[0].body.voice);
    expect(overridden.name).toBe('en-US-Chirp3-HD-Charon');
    expect(overridden.languageCode).toBeTruthy();
  });
});
