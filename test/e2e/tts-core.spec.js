import { test, expect } from '@playwright/test';

// Стъбваме window.fetch (и speechSynthesis) ПРЕДИ зареждане, за да не пипаме
// живото Google Cloud TTS API. Записваме всяка TTS заявка в window.__ttsFetchCalls
// и проверяваме ФОРМАТА на заявката, не звука.
async function installStubs(page) {
  await page.addInitScript(() => {
    // малък валиден base64 (16 нулеви байта) — стига за Blob/Audio
    const TINY_MP3 = 'AAAAAAAAAAAAAAAAAAAAAA==';
    window.__ttsFetchCalls = [];
    window.__ttsSignals = []; // AbortSignal обектите (не сериализуеми — четат се in-page)
    window.__ttsMock = { status: 200, audioContent: TINY_MP3 };

    const realFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (url.indexOf('texttospeech.googleapis.com') !== -1) {
        let body = null;
        try { body = JSON.parse(init && init.body); } catch (e) { body = null; }
        window.__ttsSignals.push((init && init.signal) || null);
        window.__ttsFetchCalls.push({
          url: url,
          method: (init && init.method) || 'GET',
          body: body,
          rawBody: (init && init.body) || '',
          hasSignal: !!(init && init.signal)
        });
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

    // Детерминистичен speechSynthesis fallback за headless (нативният не гърми onend).
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

async function ready(page) {
  await page.goto('/');
  await page.waitForFunction(() => !!window.MonkTTS, { timeout: 10000 });
}

// Извиква speak и изчаква да е записана поне една TTS заявка.
async function speakAndWait(page, text) {
  await page.evaluate((t) => window.MonkTTS.speak(t), text);
  await page.waitForFunction(() => window.__ttsFetchCalls.length > 0, { timeout: 5000 });
  return await page.evaluate(() => window.__ttsFetchCalls[window.__ttsFetchCalls.length - 1]);
}

test.describe('TTS core (MonkTTS + Google Cloud TTS contract)', () => {

  test.beforeEach(async ({ page }) => {
    await installStubs(page);
    await ready(page);
  });

  test('(а) window.MonkTTS съществува с публичен API', async ({ page }) => {
    const api = await page.evaluate(() => ({
      speak: typeof window.MonkTTS.speak,
      stop: typeof window.MonkTTS.stop,
      isSpeaking: typeof window.MonkTTS.isSpeaking,
      isSupported: typeof window.MonkTTS.isSupported
    }));
    expect(api.speak).toBe('function');
    expect(api.stop).toBe('function');
    expect(api.isSpeaking).toBe('function');
    expect(api.isSupported).toBe('function');
  });

  test('(б) кирилица -> POST към synthesize, bg-BG, MALE', async ({ page }) => {
    const call = await speakAndWait(page, 'Не мърдай!');
    expect(call.url).toContain('texttospeech.googleapis.com/v1/text:synthesize');
    expect(call.method).toBe('POST');
    expect(call.body.voice.languageCode).toBe('bg-BG');
    expect(call.body.voice.ssmlGender).toBe('MALE');
  });

  test('(в) латиница -> languageCode en-US', async ({ page }) => {
    const call = await speakAndWait(page, 'Stand still, fool.');
    expect(call.body.voice.languageCode).toBe('en-US');
  });

  test('(г) ssml е чист <speak> без тагове, които развалят изговора', async ({ page }) => {
    const call = await speakAndWait(page, 'Не мърдай, че да те уцеля! Аз не пропускам.');
    const ssml = call.body.input.ssml;
    expect(ssml.startsWith('<speak>')).toBe(true);
    expect(ssml.endsWith('</speak>')).toBe(true);
    // Регресионна защита: тези тагове бяха премахнати, защото местеха ударенията,
    // а <phoneme> кара Chirp3 да ИЗХВЪРЛИ думата. Не ги връщай без запис-доказателство.
    expect(ssml).not.toContain('<break');
    expect(ssml).not.toContain('<prosody');
    expect(ssml).not.toContain('<phoneme');
  });

  test('(г2) запетаите стават тирета — думата преди запетая губеше ударението си', async ({ page }) => {
    const call = await speakAndWait(page, 'Ако мозъкът ти беше злато, пак щеше да дължиш.');
    const ssml = call.body.input.ssml;
    expect(ssml).toContain('злато – пак');
    expect(ssml).not.toContain(',');
  });

  test('(г3) запетая между цифри се пази', async ({ page }) => {
    const call = await speakAndWait(page, 'Спечелих 3,000 златни, ама ги изпих.');
    const ssml = call.body.input.ssml;
    expect(ssml).toContain('3,000');          // числото остава цяло
    expect(ssml).toContain('златни – ама');   // само словесната запетая става тире
  });

  test('(д) апостроф и амперсанд са XML-escape-нати, без сурови символи', async ({ page }) => {
    const call = await speakAndWait(page, "Tasha's & co");
    const ssml = call.body.input.ssml;
    expect(ssml).toContain('&apos;');
    expect(ssml).toContain('&amp;');
    // няма суров апостроф или суров амперсанд (амперсандът само като част от entity)
    expect(ssml).not.toContain("'");
    expect(/&(?!(amp|lt|gt|quot|apos);)/.test(ssml)).toBe(false);
  });

  test('(е) MP3, speakingRate<1, БЕЗ pitch в audioConfig', async ({ page }) => {
    const call = await speakAndWait(page, 'Не мърдай!');
    const ac = call.body.audioConfig;
    expect(ac.audioEncoding).toBe('MP3');
    expect(ac.speakingRate).toBeLessThan(1);
    expect(Object.prototype.hasOwnProperty.call(ac, 'pitch')).toBe(false);
  });

  test('(е2) voice.name закован per език и input БЕЗ prompt', async ({ page }) => {
    const bg = await speakAndWait(page, 'Не мърдай!');
    expect(bg.body.voice.name).toBe('bg-BG-Chirp3-HD-Sadaltager');
    expect(Object.prototype.hasOwnProperty.call(bg.body.input, 'prompt')).toBe(false);

    await page.evaluate(() => { window.__ttsFetchCalls = []; });
    const en = await speakAndWait(page, 'Stand still.');
    expect(en.body.voice.name).toBe('en-US-Chirp3-HD-Sadaltager');
  });

  test('(ж) 403 -> speak не хвърля и onend се вика (fallback)', async ({ page }) => {
    await page.evaluate(() => { window.__ttsMock.status = 403; });
    const result = await page.evaluate(() => new Promise((resolve) => {
      let ended = false;
      try {
        window.MonkTTS.speak('Не мърдай!', { onend: () => { ended = true; resolve({ threw: false, ended: true }); } });
      } catch (e) {
        resolve({ threw: true, ended: ended });
      }
      setTimeout(() => resolve({ threw: false, ended: ended }), 3000);
    }));
    expect(result.threw).toBe(false);
    expect(result.ended).toBe(true);
    // въпреки fallback-а, заявката е била направена (после е гръмнала)
    const n = await page.evaluate(() => window.__ttsFetchCalls.length);
    expect(n).toBe(1);
  });

  test('(з) празен текст -> никаква заявка', async ({ page }) => {
    await page.evaluate(() => new Promise((resolve) => {
      window.MonkTTS.speak('', { onend: resolve });
      setTimeout(resolve, 500);
    }));
    const n = await page.evaluate(() => window.__ttsFetchCalls.length);
    expect(n).toBe(0);
  });

  test('(и) priming: play() отхвърля с NotAllowedError -> UI се възстановява, onend', async ({ page }) => {
    const result = await page.evaluate(() => new Promise((resolve) => {
      // Симулираме заключена autoplay политика: play() винаги отхвърля.
      const err = new DOMException('blocked', 'NotAllowedError');
      window.HTMLMediaElement.prototype.play = function () { return Promise.reject(err); };
      window.MonkTTS.speak('Не мърдай!', {
        onend: function (reason) {
          resolve({ ended: true, speaking: window.MonkTTS.isSpeaking(), reason: reason });
        }
      });
      setTimeout(function () {
        resolve({ ended: false, speaking: window.MonkTTS.isSpeaking(), reason: 'timeout' });
      }, 3000);
    }));
    expect(result.ended).toBe(true);
    expect(result.speaking).toBe(false);
  });

  test('(к) priming не пуска остатъка от предишната реплика', async ({ page }) => {
    // Багът: елементът пази декодираното старо аудио (revoke на blob URL-а не
    // го изхвърля) и priming play() в новия клик го рестартираше от нулата,
    // докато тече заявката за новата реплика. Правилното: priming-ът свири
    // тишина (data: URI), никога стар blob.
    const res = await page.evaluate(() => new Promise((resolve) => {
      window.__plays = [];
      window.__el = null;
      window.HTMLMediaElement.prototype.play = function () {
        window.__plays.push(this.src || '');
        window.__el = this;
        return Promise.resolve();
      };

      window.MonkTTS.speak('Първата реплика.');
      const waitBlob = setInterval(function () {
        if (window.__el && window.__el.src.indexOf('blob:') === 0) {
          clearInterval(waitBlob);
          const before = window.__plays.length;
          window.MonkTTS.speak('Втората реплика.'); // priming-ът е синхронен
          resolve({ primingSrc: window.__plays[before] || '(няма play)' });
        }
      }, 20);
      setTimeout(function () { clearInterval(waitBlob); resolve({ primingSrc: 'timeout: първата реплика не стигна до blob' }); }, 3000);
    }));
    expect(res.primingSrc.indexOf('blob:')).not.toBe(0);
  });

  test('(л) прекъсната реплика не получава onend от края на следващата', async ({ page }) => {
    // Багът: ended/error listener-ите се трупаха върху преизползвания елемент
    // при всяка реплика. Прекъсната по средата реплика оставяше жив closure,
    // който стреляше при края на СЛЕДВАЩАТА и викаше чуждия onend.
    const res = await page.evaluate(() => new Promise((resolve) => {
      window.__el = null;
      // Валиден (безмълвен) WAV — 16-те нулеви байта на базовия мок не са валиден
      // MP3 и 'error' събитието завършва А легитимно преди да я прекъснем.
      window.__ttsMock.audioContent = 'UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      // play не пуска реално възпроизвеждане: краят се контролира с dispatchEvent
      window.HTMLMediaElement.prototype.play = function () {
        window.__el = this;
        return Promise.resolve();
      };
      let aEnd = 0, bEnd = 0;

      window.MonkTTS.speak('Първата реплика.', { onend: function () { aEnd++; } });
      const waitA = setInterval(function () {
        if (window.__el && window.__el.src.indexOf('blob:') === 0) {
          clearInterval(waitA);
          const srcA = window.__el.src;
          // Прекъсваме А по средата на "възпроизвеждането"
          window.MonkTTS.speak('Втората реплика.', { onend: function () { bEnd++; } });
          const waitB = setInterval(function () {
            if (window.__el.src.indexOf('blob:') === 0 && window.__el.src !== srcA) {
              clearInterval(waitB);
              window.__el.dispatchEvent(new Event('ended')); // Б свършва
              setTimeout(function () { resolve({ aEnd: aEnd, bEnd: bEnd }); }, 50);
            }
          }, 20);
          setTimeout(function () { clearInterval(waitB); resolve({ aEnd: aEnd, bEnd: -1 }); }, 3000);
        }
      }, 20);
      setTimeout(function () { clearInterval(waitA); resolve({ aEnd: -1, bEnd: -1 }); }, 3000);
    }));
    expect(res.bEnd).toBe(1);  // onend на Б си работи
    expect(res.aEnd).toBe(0);  // прекъснатата А не получава късен onend
  });

  test('(й) втори speak abort-ва заявката на първия в полет', async ({ page }) => {
    const res = await page.evaluate(() => new Promise((resolve) => {
      // Забавен fetch, който УВАЖАВА signal-а (базовият стъб го игнорира).
      const TINY = 'AAAAAAAAAAAAAAAAAAAAAA==';
      window.__ttsSignals = [];
      window.fetch = function (input, init) {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        if (url.indexOf('texttospeech.googleapis.com') !== -1) {
          const signal = init && init.signal;
          window.__ttsSignals.push(signal || null);
          return new Promise(function (ok, bad) {
            if (signal) signal.addEventListener('abort', function () {
              bad(new DOMException('aborted', 'AbortError'));
            });
            setTimeout(function () {
              ok(new Response(JSON.stringify({ audioContent: TINY }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }));
            }, 500);
          });
        }
        return Promise.resolve(new Response('{}', { status: 200 }));
      };

      window.MonkTTS.speak('Първо');
      setTimeout(function () {
        window.MonkTTS.speak('Второ');
        setTimeout(function () {
          const s0 = window.__ttsSignals[0];
          resolve({
            count: window.__ttsSignals.length,
            firstAborted: !!(s0 && s0.aborted)
          });
        }, 150);
      }, 100);
    }));
    expect(res.count).toBeGreaterThanOrEqual(2);
    expect(res.firstAborted).toBe(true);
  });
});
