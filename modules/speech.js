// ===== Speech Module (Web Speech API / speechSynthesis) =====
// Локален TTS през вградения гласов двигател на устройството — без мрежа, без ключове.
// Целеви устройства: Android (Samsung / OxygenOS) + десктоп браузър.
//
// Гласът е ФИКСИРАН — това е Пийс: мъж, монк, юан-ти. Без настройки, без избор.
// Браузърите не поддържат SSML (<prosody>, <break> се четат като текст), затова
// подигравката се прави с тайминг: репликата се реже по пунктуацията и се говори
// на парчета с паузи + питч контур. Паузите правят подигравката, не питчът.
(function () {
  'use strict';

  const synth = window.speechSynthesis;
  const supported = !!synth && typeof window.SpeechSynthesisUtterance === 'function';
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');

  // --- Профилът на Пийс ---
  const PITCH = 0.62;   // дълбоко
  const RATE  = 0.82;   // бавно и провлачено
  const GAP   = 320;    // мълчание между парчетата (ms) — драматичната пауза
  // Множители за първото и последното парче: отваря нагоре и живо, затваря надолу
  // и провлачено — това е интонацията на „дааа, браавооо".
  const HEAD_PITCH = 1.12, HEAD_RATE = 1.08;
  const TAIL_PITCH = 0.84, TAIL_RATE = 0.80;

  // API-то не излага пол на гласа — познаваме по име. Това са реалните имена на
  // bg/en гласовете по платформи (Windows bg: Ivan ♂ / Kalina ♀), плюс общите
  // маркери, които Android/Chrome ползват.
  // Женското се проверява първо — "female" съдържа "male".
  const FEMALE_RE = /(^|[^a-z])(female|woman)([^a-z]|$)|#female|\b(kalina|maria|ivana|elena|nadia|zara|samantha|victoria|karen|moira|tessa|fiona|serena|allison|ava|susan|zoe|joanna|salli|kendra|kimberly|amy|emma|hazel|heera|sonia|catherine|linda|michelle|jenny|aria|nicole|natasha|ana|sofia)\b/i;
  const MALE_RE = /(^|[^a-z])(male|man)([^a-z]|$)|#male|\b(ivan|borislav|georgi|dimitar|nikolay|todor|stefan|daniel|david|george|mark|alex|fred|guy|ryan|thomas|james|arthur|oliver|liam|eric|brian|rishi|aaron|nathan|gordon|reed|roger|steffan|tom|matthew|justin|joey|russell|christopher)\b/i;

  // Google TTS на Android има само един български глас и той е женски. Няма как
  // да го сменим — сваляме питча още, за да излезе мъжки регистър.
  const NO_MALE_PITCH_DROP = 0.22;

  let voices = [];
  let current = null;    // държим реф. — иначе Chrome GC-ва utterance-а насред репликата
  let keepAlive = null;  // десктоп Chrome реже речта на ~15s без pause/resume пинг
  let gapTimer = null;
  let gen = 0;           // всяко speak()/stop() вдига поколението → старите onend стават no-op
  let busy = false;      // true и по време на паузите между парчетата

  function loadVoices() {
    try { voices = synth.getVoices() || []; } catch (e) { voices = []; }
  }

  if (supported) {
    loadVoices();
    // Android/Chrome пълни списъка асинхронно — първият getVoices() често връща [].
    if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', loadVoices);
    else synth.onvoiceschanged = loadVoices;
  }

  const normLang = v => String((v && v.lang) || '').replace('_', '-').toLowerCase();

  // Кирилица → bg-BG, иначе en-US (tasha-jokes.json е на английски).
  function detectLang(text) {
    return /[Ѐ-ӿ]/.test(String(text || '')) ? 'bg-BG' : 'en-US';
  }

  function isMale(v) {
    const n = (v && (v.name + ' ' + v.voiceURI)) || '';
    return !FEMALE_RE.test(n) && MALE_RE.test(n);
  }

  function voicesFor(lang) {
    const base = String(lang).slice(0, 2).toLowerCase();
    const want = String(lang).replace('_', '-').toLowerCase();
    return voices
      .filter(v => normLang(v).slice(0, 2) === base)
      // локалните са офлайн и без лаг; точният локал преди generic-а
      .sort((a, b) => (b.localService - a.localService) || ((normLang(b) === want) - (normLang(a) === want)));
  }

  function pickVoice(lang) {
    const list = voicesFor(lang);
    if (!list.length) return null;
    return list.find(isMale) || list[0];
  }

  function hasVoiceFor(lang) {
    // Празен списък = движката още не е отговорила; не твърдим, че глас липсва.
    return !voices.length || !!pickVoice(lang);
  }

  // ---------- chunking ----------
  const STRONG = '.!?…';
  const SOFT = ',;:—–';

  // Реже по пунктуация. Силната пунктуация реже почти винаги, меката — само ако
  // парчето вече е достатъчно дълго, за да не станат накъсани сричкови откъслеци.
  function chunkText(text) {
    const chars = String(text).trim().split('');
    const parts = [];
    let buf = '';

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      buf += ch;
      const strong = STRONG.indexOf(ch) !== -1;
      if (!strong && SOFT.indexOf(ch) === -1) continue;

      // изяждаме поредица от пунктуация наведнъж ("!!!", "...", "?!")
      while (i + 1 < chars.length && (STRONG + SOFT).indexOf(chars[i + 1]) !== -1) buf += chars[++i];

      const next = chars[i + 1];
      if (next && next !== ' ' && next !== '\n' && next !== '\t') continue; // "3.5" не е край на изречение

      const len = buf.trim().length;
      if (strong ? len >= 6 : len >= 18) { parts.push(buf.trim()); buf = ''; }
    }

    const tail = buf.trim();
    if (tail) {
      if (parts.length && tail.length < 6) parts[parts.length - 1] += ' ' + tail;
      else parts.push(tail);
    }
    return parts.length ? parts : [String(text).trim()];
  }

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  function prosodyFor(i, n, basePitch) {
    let p = basePitch, r = RATE;
    if (n > 1) {
      if (i === 0) { p *= HEAD_PITCH; r *= HEAD_RATE; }
      else if (i === n - 1) { p *= TAIL_PITCH; r *= TAIL_RATE; }
    }
    return { pitch: clamp(p, 0, 2), rate: clamp(r, 0.1, 10) };
  }

  // ---------- playback ----------
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
    gen++;
    busy = false;
    clearKeepAlive();
    if (gapTimer) { clearTimeout(gapTimer); gapTimer = null; }
    current = null;
    try { synth.cancel(); } catch (e) { /* no-op */ }
  }

  function isSpeaking() {
    return supported && (busy || synth.speaking || synth.pending);
  }

  // speak(text, { onstart, onend })
  // onend се вика и при грешка/прекъсване — UI-ът винаги се връща в покой.
  function speak(text, opts) {
    opts = opts || {};
    const str = String(text == null ? '' : text).trim();
    if (!supported || !str) return false;

    const wasSpeaking = isSpeaking();
    stop();

    const myGen = ++gen;
    const lang = detectLang(str);
    const voice = pickVoice(lang);
    // Няма мъжки глас за езика ⇒ сваляме питча, за да влезе в мъжки регистър.
    const basePitch = clamp(PITCH - (voice && isMale(voice) ? 0 : NO_MALE_PITCH_DROP), 0, 2);
    const parts = chunkText(str);
    let started = false;

    function finish(err) {
      if (myGen !== gen) return;
      busy = false;
      clearKeepAlive();
      current = null;
      if (opts.onend) opts.onend(err || null);
    }

    function sayPart(i) {
      if (myGen !== gen) return;

      const u = new SpeechSynthesisUtterance(parts[i]);
      u.lang = lang;
      if (voice) u.voice = voice;              // без voice движката ползва системния default
      const pr = prosodyFor(i, parts.length, basePitch);
      u.pitch = pr.pitch;
      u.rate = pr.rate;
      u.volume = 1;

      u.onstart = function () {
        if (myGen !== gen) return;
        startKeepAlive();
        if (!started) { started = true; if (opts.onstart) opts.onstart(); }
      };
      u.onend = function () {
        if (myGen !== gen) return;
        clearKeepAlive();
        if (i + 1 >= parts.length) { finish(null); return; }
        gapTimer = setTimeout(function () { gapTimer = null; sayPart(i + 1); }, GAP);
      };
      u.onerror = function (e) {
        if (myGen !== gen) return;
        const err = (e && e.error) || 'unknown';
        if (err !== 'interrupted' && err !== 'canceled') console.warn('[speech]', err);
        finish(err);
      };

      current = u;
      try {
        synth.speak(u);
      } catch (e) {
        console.warn('[speech]', e);
        finish('exception');
      }
    }

    busy = true;
    // cancel() + моментален speak() понякога изяжда репликата на Android —
    // даваме на движката един tick, но само ако наистина е говорила.
    if (wasSpeaking) gapTimer = setTimeout(function () { gapTimer = null; sayPart(0); }, 120);
    else sayPart(0);
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
    // за тестове
    __chunk: chunkText,
    __pickVoice: pickVoice
  };
})();
