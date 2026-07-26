// ===== TTS Module (Google Cloud Text-to-Speech, on-demand) =====
// Гласът на Пийс — мъж, монк, юан-ти. On-demand синтез: всеки клик = нова
// заявка, пусни, изхвърли. БЕЗ кеш, БЕЗ .mp3 в репото. Fallback към вградения
// speechSynthesis при липсващ ключ / мрежова грешка, за да не остава тишина.
(function () {
  'use strict';

  // ─── CONFIG ───────────────────────────────────────────────
  // Ключът се комитва НАРОЧНО (лично репо), ограничен по HTTP referrer и само
  // за Cloud Text-to-Speech API — рискът е приет. Виж TTS-SETUP.md.
  // ⛔ БЕЗ поле pitch — Chirp3-HD гласовете връщат HTTP 400 при pitch параметър.
  const TTS_CONFIG = {
    apiKey: 'AIzaSyDsnq5iBTVDL7eC9K9TAGSG0CEYhsOt-hY',
    voices: {
      'bg-BG': 'bg-BG-Chirp3-HD-Sadaltager',
      'en-US': 'en-US-Chirp3-HD-Sadaltager'
    },
    speakingRate: 0.78
  };

  const ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';
  const PLACEHOLDER_KEYS = ['', 'YOUR_API_KEY', 'API_KEY'];

  let primeEl = null;       // ЕДИН преизползван <audio> — priming за autoplay policy
  let currentUrl = null;
  let speaking = false;
  let controller = null;    // AbortController за заявката в полет

  // Ключът се чете тук, за да може тест да го замести с window.__ttsApiKeyOverride
  // (напр. празен → no-key пътят). В прод override няма → комитнатият ключ.
  function activeKey() {
    return (typeof window !== 'undefined' && window.__ttsApiKeyOverride != null)
      ? window.__ttsApiKeyOverride : TTS_CONFIG.apiKey;
  }

  function isPlaceholderKey() {
    const k = activeKey();
    return !k || PLACEHOLDER_KEYS.indexOf(k) !== -1;
  }

  // Един и същ <audio> се преизползва за всяка реплика — на Android/iOS новосъздаден
  // Audio() на всеки клик не наследява user-gesture отключването.
  function getAudioEl() {
    if (!primeEl) primeEl = new Audio();
    return primeEl;
  }

  function detectLang(text) {
    return /[Ѐ-ӿ]/.test(text) ? 'bg-BG' : 'en-US';
  }

  function escapeXml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // БЕЗ <break> и БЕЗ <prosody> — нарочно.
  // Сравнителен тест с реални записи показа, че всеки таг, който вмъкваме,
  // разваля изговора: разкъсването на репликата на парчета мести ударенията
  // (думата в края на парче получава фразова интонация), а <prosody rate>
  // отгоре на speakingRate забавя дотолкова, че думите излизат сгрешени.
  // <phoneme> е още по-лошо — Chirp3 не го поддържа и ИЗХВЪРЛЯ съдържанието му,
  // тоест думата просто изчезва от репликата.
  // Чистият текст звучи най-правилно. Ритъмът идва от пунктуацията в самия текст
  // и от speakingRate. Не добавяй тагове тук без запис, който доказва, че помагат.
  // Chirp3 бърка ударението на думата ПРЕДИ запетая — тя попада в края на
  // интонационна група и ударението ѝ отскача към последната сричка
  // ("злАто" се чува като "златО"). Проверено със записи: същата дума пред точка,
  // в средата на изречението или самостоятелно се произнася правилно — само
  // запетаята чупи. Тире на нейно място дава същата пауза БЕЗ дефекта.
  // Замяната е САМО за синтеза — текстът в JSON-ите и на екрана остава с запетаи.
  function commasToDashes(s) {
    const GUARD = ''; // невидим знак-пазач, не се среща в текста
    return s
      .replace(/(\d)\s*,\s*(\d)/g, '$1' + GUARD + '$2') // "3,000" пази запетаята си
      .replace(/\s*,\s*/g, ' – ')
      .replace(new RegExp(GUARD, 'g'), ',');
  }

  function buildSsml(text) {
    return '<speak>' + escapeXml(commasToDashes(String(text).trim())) + '</speak>';
  }

  async function synthesize(text, signal) {
    const lang = detectLang(text);
    const body = {
      input: { ssml: buildSsml(text) },
      voice: { languageCode: lang, name: TTS_CONFIG.voices[lang], ssmlGender: 'MALE' },
      audioConfig: { audioEncoding: 'MP3', speakingRate: TTS_CONFIG.speakingRate }
    };
    const res = await fetch(ENDPOINT + '?key=' + encodeURIComponent(activeKey()), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: signal
    });
    if (!res.ok) {
      const err = new Error('TTS HTTP ' + res.status);
      err.status = res.status;   // 403 = отказан достъп, не липса на мрежа
      throw err;
    }
    const data = await res.json();
    if (!data || !data.audioContent) throw new Error('TTS missing audioContent');
    const bytes = Uint8Array.from(atob(data.audioContent), function (c) { return c.charCodeAt(0); });
    return new Blob([bytes], { type: 'audio/mpeg' });
  }

  function releaseUrl() {
    if (currentUrl) { URL.revokeObjectURL(currentUrl); currentUrl = null; }
  }

  function fallbackSpeak(text, onDone) {
    const done = function () { onDone(); };
    try {
      const synth = window.speechSynthesis;
      if (!synth || typeof window.SpeechSynthesisUtterance !== 'function') { done(); return; }
      const u = new window.SpeechSynthesisUtterance(text);
      u.lang = detectLang(text);
      u.onend = done;
      u.onerror = done;
      synth.cancel();
      synth.speak(u);
    } catch (e) {
      done();
    }
  }

  async function speak(text, opts) {
    opts = opts || {};
    const clean = (text == null ? '' : String(text)).trim();
    if (!clean) { if (opts.onend) opts.onend(null); return; }

    stop();
    speaking = true;
    if (opts.onstart) opts.onstart();

    let ended = false;
    // reason: null (успех/тишина), 'no-key' (липсва ключ), 'network' (мрежа/HTTP)
    const finish = function (reason) {
      if (ended) return;
      ended = true;
      speaking = false;
      releaseUrl();
      if (opts.onend) opts.onend(reason || null);
    };

    // PRIMING: синхронно, още в user-gesture-а, „отключваме" преизползвания елемент,
    // за да не отхвърли play() с NotAllowedError, когато асинхронният отговор дойде.
    const audio = getAudioEl();
    try {
      const pp = audio.play();
      if (pp && typeof pp.catch === 'function') pp.catch(function () { /* noop */ });
    } catch (e) { /* noop */ }

    if (isPlaceholderKey()) {
      fallbackSpeak(clean, function () { finish('no-key'); });
      return;
    }

    const ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
    controller = ctrl;

    try {
      const blob = await synthesize(clean, ctrl ? ctrl.signal : undefined);
      // Прекъснат в полет (нова реплика / stop) → не пускаме остарялото аудио.
      if (ended || (ctrl && ctrl.signal.aborted)) return;
      if (controller === ctrl) controller = null;
      const url = URL.createObjectURL(blob);
      currentUrl = url;
      audio.addEventListener('ended', function () { finish(null); });
      audio.addEventListener('error', function () { finish(null); });
      audio.src = url;
      const p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(function () { finish(null); });
    } catch (e) {
      // Нарочно прекъсване — тихо, без лог, без fallback към speechSynthesis.
      if (e && e.name === 'AbortError') return;
      // 403 значи, че ключът работи, но текущият адрес не е в разрешените
      // HTTP referrer-и. Различава се от истинска липса на мрежа, защото
      // поправката е съвсем друга — виж TTS-SETUP.md.
      const reason = (e && e.status === 403) ? 'forbidden' : 'network';
      fallbackSpeak(clean, function () { finish(reason); });
    }
  }

  function stop() {
    if (controller) {
      try { controller.abort(); } catch (e) { /* noop */ }
      controller = null;
    }
    if (primeEl) {
      try { primeEl.pause(); } catch (e) { /* noop */ }
    }
    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (e) { /* noop */ }
    }
    releaseUrl();
    speaking = false;
  }

  function isSpeaking() { return speaking; }

  function isSupported() {
    return typeof window.fetch === 'function' || !!window.speechSynthesis;
  }

  window.MonkTTS = { speak: speak, stop: stop, isSpeaking: isSpeaking, isSupported: isSupported };
})();
