import { test, expect } from '@playwright/test';

// Headless Chromium има window.speechSynthesis, но без инсталирани гласове —
// затова тестваме контракта на MonkSpeech и UI състоянията, не самия звук.

const speakBtn = (page) => page.locator('#btnSpeakFlavor');
const output = (page) => page.locator('#flavorOutput');

test.describe('Flavor - Speak button', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await page.locator('button[data-tab="flavor"]').click();
    await page.waitForTimeout(300);
  });

  test('Speak button is visible and not counted as a flavor type button', async ({ page }) => {
    await expect(speakBtn(page)).toBeVisible();
    await expect(speakBtn(page)).toHaveText(/Произнеси/);
    // Registry-то си остава 17 бутона — speak-ът не е .flavor-btn.
    await expect(page.locator('#tab-flavor .flavor-btn')).toHaveCount(17);
  });

  test('MonkSpeech API is exposed with the expected surface', async ({ page }) => {
    const api = await page.evaluate(() => {
      const S = window.MonkSpeech;
      if (!S) return null;
      return ['isSupported', 'isSpeaking', 'speak', 'stop', 'detectLang', 'hasVoiceFor', 'getVoices']
        .filter(k => typeof S[k] !== 'function');
    });
    expect(api).not.toBeNull();
    expect(api).toEqual([]);
  });

  test('Language detection: Cyrillic -> bg-BG, Latin -> en-US', async ({ page }) => {
    const langs = await page.evaluate(() => ({
      bg: window.MonkSpeech.detectLang('Аз не пропускам! Аз просто давам шанс!'),
      en: window.MonkSpeech.detectLang("What's brown and sticky? A stick!"),
    }));
    expect(langs.bg).toBe('bg-BG');
    expect(langs.en).toBe('en-US');
  });

  test('Clicking speak with an empty output is a no-op', async ({ page }) => {
    expect(await output(page).inputValue()).toBe('');
    await speakBtn(page).click();
    await page.waitForTimeout(200);
    await expect(speakBtn(page)).toHaveText(/Произнеси/);
    await expect(speakBtn(page)).not.toHaveClass(/\bspeaking\b/);
  });

  test('speak() is called with the current line and the detected language', async ({ page }) => {
    // Прихващаме на ниво speechSynthesis, за да видим какво реално се подава.
    await page.evaluate(() => {
      window.__spoken = [];
      window.speechSynthesis.speak = (u) => {
        window.__spoken.push({ text: u.text, lang: u.lang, pitch: u.pitch, rate: u.rate });
        if (u.onend) setTimeout(() => u.onend(), 10);
      };
    });

    await page.locator('#tab-flavor [data-flavor="insult"]').click();
    await page.waitForTimeout(300);
    const line = await output(page).inputValue();
    expect(line.length).toBeGreaterThan(0);

    await speakBtn(page).click();
    await page.waitForTimeout(200);

    const spoken = await page.evaluate(() => window.__spoken);
    expect(spoken).toHaveLength(1);
    expect(spoken[0].text).toBe(line);
    expect(spoken[0].lang).toBe('bg-BG');
    expect(spoken[0].pitch).toBeCloseTo(0.7, 2);
    expect(spoken[0].rate).toBeCloseTo(0.85, 2);

    // След onend бутонът се връща в покой.
    await expect(speakBtn(page)).toHaveText(/Произнеси/);
  });

  test('Picking a new line stops any speech and resets the button', async ({ page }) => {
    await page.evaluate(() => {
      window.__cancels = 0;
      const realCancel = window.speechSynthesis.cancel.bind(window.speechSynthesis);
      window.speechSynthesis.cancel = () => { window.__cancels++; realCancel(); };
    });

    await page.locator('#tab-flavor [data-flavor="tasha"]').click();
    await page.waitForTimeout(300);
    await page.locator('#tab-flavor [data-flavor="insult"]').click();
    await page.waitForTimeout(300);

    expect(await page.evaluate(() => window.__cancels)).toBeGreaterThan(0);
    await expect(speakBtn(page)).toHaveText(/Произнеси/);
    await expect(speakBtn(page)).not.toHaveClass(/\bspeaking\b/);
  });
});
