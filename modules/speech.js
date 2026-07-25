// ===== Speech Module (Web Speech API / speechSynthesis) =====
// Локален TTS през вградения гласов двигател на устройството — без мрежа, без ключове.
// Целеви устройства: Android (Samsung / OxygenOS) + десктоп браузър.
(function () {
  'use strict';

  const synth = window.speechSynthesis;
  const supported = !!synth && typeof window.SpeechSynthesisUtterance === 'function';
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');

  let voices = [];
  let current = null;   // държим реф. — иначе Chrome GC-ва utterance-а насред репликата
  let keepAlive = null; // десктоп Chrome реже речта на ~15s без pause/resume пинг

  function loadVoices() {
    try { voices = synth.getVoices() || []; } catch (e) { voices = []; }
  }

  if (supported) {
    loadVoices();
    // Android/Chrome пълни списъка асинхронно — първият getVoices() често връща [].
    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', loadVoices);
    } else {
      synth.onvoiceschanged = loadVoices;
    }
  }

  // Кирилица → bg-BG, иначе en-US (tasha-jokes.json е на английски).
  function detectLang(text) {
    return /[Ѐ-ӿ]/.test(String(text || '')) ? 'bg-BG' : 'en-US';
  }

  function pickVoice(lang) {
    if (!voices.length) return null;
    const want = String(lang).replace('_', '-').toLowerCase();
    const base = want.slice(0, 2);
    const norm = v => String(v.lang || '').replace('_', '-').toLowerCase();
    return voices.find(v => norm(v) === want)
        || voices.find(v => norm(v).slice(0, 2) === base)
        || null;
  }

  function hasVoiceFor(lang) {
    // Празен списък = движката още не е отговорила; не твърдим, че глас липсва.
    return !voices.length || !!pickVoice(lang);
  }

  function clearKeepAlive() {
    if (keepAlive) { clearInterval(keepAlive); keepAlive = null; }
  }

  function startKeepAlive() {
    clearKeepAlive();
    // На Android pause() в част от билдовете се държи като cancel() — само десктоп.
    if (isMobile) return;
    keepAlive = setInterval(function () {
      if (!synth.speaking) { clearKeepAlive(); return; }
      try { synth.pause(); synth.resume(); } catch (e) { clearKeepAlive(); }
    }, 9000);
  }

  function stop() {
    if (!supported) return;
    clearKeepAlive();
    current = null;
    try { synth.cancel(); } catch (e) { /* no-op */ }
  }

  function isSpeaking() {
    return supported && (synth.speaking || synth.pending);
  }

  // speak(text, { lang, pitch, rate, volume, onstart, onend })
  // onend се вика и при грешка/прекъсване — UI-ът винаги се връща в покой.
  function speak(text, opts) {
    opts = opts || {};
    const str = String(text == null ? '' : text).trim();
    if (!supported || !str) return false;

    const wasSpeaking = isSpeaking();
    stop();

    function go() {
      const u = new SpeechSynthesisUtterance(str);
      u.lang = opts.lang || detectLang(str);
      const v = pickVoice(u.lang);
      if (v) u.voice = v;                       // без voice движката ползва системния default
      u.pitch  = opts.pitch  != null ? opts.pitch  : 0.7;  // по-дълбок, саркастичен тон
      u.rate   = opts.rate   != null ? opts.rate   : 0.85; // по-бавно и драматично
      u.volume = opts.volume != null ? opts.volume : 1;

      u.onstart = function () {
        startKeepAlive();
        if (opts.onstart) opts.onstart();
      };
      u.onend = function () {
        clearKeepAlive();
        current = null;
        if (opts.onend) opts.onend(null);
      };
      u.onerror = function (e) {
        clearKeepAlive();
        current = null;
        const err = (e && e.error) || 'unknown';
        if (err !== 'interrupted' && err !== 'canceled') console.warn('[speech]', err);
        if (opts.onend) opts.onend(err);
      };

      current = u;
      try {
        synth.speak(u);
      } catch (e) {
        console.warn('[speech]', e);
        current = null;
        if (opts.onend) opts.onend('exception');
      }
    }

    // cancel() + моментален speak() понякога изяжда репликата на Android —
    // даваме на движката един tick, но само ако наистина е говорила.
    if (wasSpeaking) setTimeout(go, 120); else go();
    return true;
  }

  // Речта преживява навигация/reload, ако не я спрем изрично.
  if (supported) {
    window.addEventListener('pagehide', stop);
    window.addEventListener('beforeunload', stop);
  }

  window.MonkSpeech = {
    isSupported: function () { return supported; },
    isSpeaking: isSpeaking,
    speak: speak,
    stop: stop,
    detectLang: detectLang,
    hasVoiceFor: hasVoiceFor,
    getVoices: function () { return voices.slice(); }
  };
})();
