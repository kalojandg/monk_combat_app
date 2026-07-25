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
    speakingRate: 0.85,
    breakMs: 350
  };

  const ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';
  const PLACEHOLDER_KEYS = ['', 'YOUR_API_KEY', 'API_KEY'];

  let currentAudio = null;
  let currentUrl = null;
  let speaking = false;

  function isPlaceholderKey() {
    return !TTS_CONFIG.apiKey || PLACEHOLDER_KEYS.indexOf(TTS_CONFIG.apiKey) !== -1;
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

  // Режем по силна пунктуация (.!?…) винаги; по слаба (,;:) само ако парчето е
  // достатъчно дълго. Между парчетата и след силна пунктуация — драматична пауза.
  function buildSsml(text) {
    const breakTag = '<break time="' + TTS_CONFIG.breakMs + 'ms"/>';
    const raw = String(text).trim();
    const pieces = [];
    let buf = '';
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      buf += ch;
      const strong = '.!?…'.indexOf(ch) !== -1;
      const weak = ',;:'.indexOf(ch) !== -1;
      if (strong || (weak && buf.trim().length >= 18)) {
        pieces.push({ text: buf.trim(), pause: strong });
        buf = '';
      }
    }
    if (buf.trim()) pieces.push({ text: buf.trim(), pause: false });
    if (!pieces.length) pieces.push({ text: raw, pause: false });

    const last = pieces.length - 1;
    let out = '';
    pieces.forEach(function (p, i) {
      let seg = escapeXml(p.text);
      // Провлачен, снизходителен финал — БЕЗ pitch (гласът не го поддържа).
      if (i === last) seg = '<prosody rate="80%">' + seg + '</prosody>';
      out += seg;
      if (p.pause || i < last) out += breakTag;
    });
    return '<speak>' + out + '</speak>';
  }

  async function synthesize(text) {
    const lang = detectLang(text);
    const body = {
      input: { ssml: buildSsml(text) },
      voice: { languageCode: lang, name: TTS_CONFIG.voices[lang], ssmlGender: 'MALE' },
      audioConfig: { audioEncoding: 'MP3', speakingRate: TTS_CONFIG.speakingRate }
    };
    const res = await fetch(ENDPOINT + '?key=' + encodeURIComponent(TTS_CONFIG.apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('TTS HTTP ' + res.status);
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
    if (!clean) { if (opts.onend) opts.onend(); return; }

    stop();
    speaking = true;
    if (opts.onstart) opts.onstart();

    let ended = false;
    const finish = function () {
      if (ended) return;
      ended = true;
      speaking = false;
      releaseUrl();
      currentAudio = null;
      if (opts.onend) opts.onend();
    };

    if (isPlaceholderKey()) {
      fallbackSpeak(clean, finish);
      return;
    }

    try {
      const blob = await synthesize(clean);
      const url = URL.createObjectURL(blob);
      currentUrl = url;
      const audio = new Audio(url);
      currentAudio = audio;
      audio.addEventListener('ended', finish);
      audio.addEventListener('error', finish);
      const p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(function () { finish(); });
    } catch (e) {
      fallbackSpeak(clean, finish);
    }
  }

  function stop() {
    if (currentAudio) {
      try { currentAudio.pause(); } catch (e) { /* noop */ }
    }
    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (e) { /* noop */ }
    }
    releaseUrl();
    currentAudio = null;
    speaking = false;
  }

  function isSpeaking() { return speaking; }

  function isSupported() {
    return typeof window.fetch === 'function' || !!window.speechSynthesis;
  }

  window.MonkTTS = { speak: speak, stop: stop, isSpeaking: isSpeaking, isSupported: isSupported };
})();
