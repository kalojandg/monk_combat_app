import { test, expect } from '@playwright/test';

// Стъбваме fetch (за да не пипаме живото Google Cloud TTS) и play (за да не
// зависим от истинско аудио в headless). play() резолвва, но НЕ гърми 'ended',
// така че състоянието "говори" се задържа за проверка.
async function installStubs(page) {
  await page.addInitScript(() => {
    const TINY_MP3 = 'AAAAAAAAAAAAAAAAAAAAAA==';
    window.__ttsFetchCalls = [];
    window.__ttsMock = { status: 200, audioContent: TINY_MP3 };

    const realFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (url.indexOf('texttospeech.googleapis.com') !== -1) {
        let body = null;
        try { body = JSON.parse(init && init.body); } catch (e) { body = null; }
        window.__ttsFetchCalls.push({ url: url, method: (init && init.method) || 'GET', body: body });
        const m = window.__ttsMock;
        if (m.status < 200 || m.status >= 300) {
          return Promise.resolve(new Response('{}', { status: m.status }));
        }
        return Promise.resolve(new Response(
          JSON.stringify({ audioContent: m.audioContent }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        ));
      }
      return realFetch(input, init);
    };

    // Инертен Audio: не декодира фалшивия blob (иначе 'error' събитието
    // би извикало onend и махнало .speaking преди да го проверим).
    window.Audio = function () {
      return {
        play: function () { return Promise.resolve(); },
        pause: function () {},
        addEventListener: function () {},
        removeEventListener: function () {}
      };
    };

    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speak: function (u) { if (u && typeof u.onend === 'function') setTimeout(function () { u.onend(); }, 0); },
        cancel: function () {},
        getVoices: function () { return []; }
      }
    });
    window.SpeechSynthesisUtterance = function (text) {
      this.text = text; this.lang = ''; this.onend = null; this.onerror = null;
    };
  });
}

const output = (page) => page.locator('#flavorOutput');
const speakBtn = (page) => page.locator('#btnSpeakFlavor');

test.describe('Flavor - Speak button (MonkTTS)', () => {

  test.beforeEach(async ({ page }) => {
    await installStubs(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await page.locator('button[data-tab="flavor"]').click();
    await page.waitForTimeout(300);
  });

  test('(а) бутонът съществува, видим е и НЕ е .flavor-btn', async ({ page }) => {
    await expect(speakBtn(page)).toBeVisible();
    await expect(speakBtn(page)).not.toHaveClass(/\bflavor-btn\b/);
  });

  test('(б) все още точно 17 .flavor-btn', async ({ page }) => {
    await expect(page.locator('#tab-flavor .flavor-btn')).toHaveCount(17);
  });

  test('(в) празен output -> клик не прави TTS заявка', async ({ page }) => {
    expect(await output(page).inputValue()).toBe('');
    await speakBtn(page).click();
    await page.waitForTimeout(500);
    const n = await page.evaluate(() => window.__ttsFetchCalls.length);
    expect(n).toBe(0);
  });

  test('(г) клик на флейвър + Произнеси -> точно една заявка с escape-нат текст', async ({ page }) => {
    await page.locator('#tab-flavor [data-flavor="insult"]').click();
    await expect(output(page)).not.toHaveValue('');
    // заковаваме известен текст с апостроф за детерминизъм
    await page.evaluate(() => { document.getElementById('flavorOutput').value = "Tasha's joke"; });

    await speakBtn(page).click();
    await page.waitForFunction(() => window.__ttsFetchCalls.length > 0, { timeout: 5000 });

    const calls = await page.evaluate(() => window.__ttsFetchCalls);
    expect(calls.length).toBe(1);
    expect(calls[0].body.input.ssml).toContain('Tasha&apos;s joke');
  });

  test('(д) по време на говорене бутонът е "Спри" + .speaking', async ({ page }) => {
    await page.evaluate(() => { document.getElementById('flavorOutput').value = 'Не мърдай'; });
    await speakBtn(page).click();
    await page.waitForFunction(() => window.__ttsFetchCalls.length > 0, { timeout: 5000 });

    await expect(speakBtn(page)).toHaveClass(/\bspeaking\b/);
    await expect(speakBtn(page)).toContainText('Спри');
  });

  test('(е) клик на друг флейвър бутон връща бутона в покой', async ({ page }) => {
    await page.evaluate(() => { document.getElementById('flavorOutput').value = 'Не мърдай'; });
    await speakBtn(page).click();
    await page.waitForFunction(() => window.__ttsFetchCalls.length > 0, { timeout: 5000 });
    await expect(speakBtn(page)).toHaveClass(/\bspeaking\b/);

    await page.locator('#tab-flavor [data-flavor="insult"]').click();
    await page.waitForTimeout(300);

    await expect(speakBtn(page)).not.toHaveClass(/\bspeaking\b/);
    await expect(speakBtn(page)).toContainText('Произнеси');
  });
});
