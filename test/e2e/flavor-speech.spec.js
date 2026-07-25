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
      return ['isSupported', 'isSpeaking', 'speak', 'stop', 'detectLang', 'hasVoiceFor']
        .filter(k => typeof S[k] !== 'function');
    });
    expect(api).not.toBeNull();
    expect(api).toEqual([]);
  });

  test('No voice/tone pickers — the delivery is fixed', async ({ page }) => {
    await expect(page.locator('#flavorTone')).toHaveCount(0);
    await expect(page.locator('#flavorVoice')).toHaveCount(0);
    await expect(page.locator('#tab-flavor select')).toHaveCount(0);
  });

  test('Chunking splits on punctuation and keeps the text intact', async ({ page }) => {
    const res = await page.evaluate(() => {
      const c = window.MonkSpeech.__chunk;
      return {
        multi: c('Не мърдай, че да те уцеля! Сигурен съм, че беше точно тук.'),
        single: c('Не мърдай'),
        decimal: c('Нанасям 3.5 точки щета в лицето ти, приятелю.'),
      };
    });
    expect(res.multi.length).toBeGreaterThan(1);
    expect(res.multi.join(' ')).toBe('Не мърдай, че да те уцеля! Сигурен съм, че беше точно тук.');
    expect(res.single).toEqual(['Не мърдай']);
    // "3.5" не е край на изречение
    expect(res.decimal.some(p => p.includes('3.5'))).toBe(true);
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

  // Прихващаме на ниво speechSynthesis, за да видим какво реално се подава на движката.
  const stubSynth = (page) => page.evaluate(() => {
    window.__spoken = [];
    window.speechSynthesis.speak = (u) => {
      window.__spoken.push({ text: u.text, lang: u.lang, pitch: u.pitch, rate: u.rate });
      if (u.onend) setTimeout(() => u.onend(), 10);
    };
  });

  test('Speaks the current line in a deep, chunked, mocking delivery', async ({ page }) => {
    await stubSynth(page);

    // Дълга реплика с пунктуация ⇒ гарантирано повече от едно парче.
    await page.evaluate(() => {
      document.getElementById('flavorOutput').value =
        'Не мърдай, че да те уцеля! Аз не пропускам. Аз просто давам шанс.';
    });
    await speakBtn(page).click();
    // Бутонът се връща на „Произнеси" чак когато цялата опашка свърши.
    await expect(speakBtn(page)).toHaveText(/Произнеси/, { timeout: 10000 });

    const spoken = await page.evaluate(() => window.__spoken);
    expect(spoken.length).toBeGreaterThan(1);                    // накъсано на парчета
    expect(spoken.map(s => s.text).join(' '))
      .toBe('Не мърдай, че да те уцеля! Аз не пропускам. Аз просто давам шанс.');
    expect(spoken.every(s => s.lang === 'bg-BG')).toBe(true);
    expect(spoken.every(s => s.pitch < 1)).toBe(true);           // мъжки регистър
    expect(spoken.every(s => s.rate < 1)).toBe(true);            // провлачено
    // Подигравателната дъга: отваря по-високо, затваря по-ниско и по-бавно.
    expect(spoken[0].pitch).toBeGreaterThan(spoken[spoken.length - 1].pitch);
    expect(spoken[0].rate).toBeGreaterThan(spoken[spoken.length - 1].rate);
  });

  test('English lines are spoken as en-US', async ({ page }) => {
    await stubSynth(page);
    await page.locator('#tab-flavor [data-flavor="tasha"]').click();
    await page.waitForTimeout(300);
    const line = await output(page).inputValue();
    expect(line.length).toBeGreaterThan(0);

    await speakBtn(page).click();
    await expect(speakBtn(page)).toHaveText(/Произнеси/, { timeout: 10000 });

    const spoken = await page.evaluate(() => window.__spoken);
    expect(spoken.length).toBeGreaterThan(0);
    expect(spoken.every(s => s.lang === 'en-US')).toBe(true);
    expect(spoken.map(s => s.text).join(' ')).toBe(line);
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
