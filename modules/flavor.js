// ===== Flavor Module =====
// Консолидиран таб: всички 17 флейвър типа през един registry и една изходна зона.
// Старите табове (One-Liners / Excuses / Insults) остават непокътнати — този таб ги дублира.
(function () {
  'use strict';

  // Registry: един запис на тип. key === null → JSON-ът е плосък масив.
  const FLAVOR_TYPES = [
    // --- One-Liners (one-liners.json) ---
    { id: 'crit-miss',       label: 'Critical Miss',    group: 'One-Liners',      url: 'one-liners.json', key: 'crit_miss' },
    { id: 'miss-attack',     label: 'Miss Attack',      group: 'One-Liners',      url: 'one-liners.json', key: 'miss_attack' },
    { id: 'crit-attack',     label: 'Critical Attack',  group: 'One-Liners',      url: 'one-liners.json', key: 'crit_attack' },
    { id: 'suffer-crit',     label: 'Suffer Critical',  group: 'One-Liners',      url: 'one-liners.json', key: 'suffer_crit' },
    { id: 'combat-tease',    label: 'Combat Tease',     group: 'One-Liners',      url: 'one-liners.json', key: 'combat_tease' },
    { id: 'magic',           label: 'Magic',            group: 'One-Liners',      url: 'one-liners.json', key: 'magic' },
    { id: 'qa',              label: 'Q&A',              group: 'One-Liners',      url: 'one-liners.json', key: 'Q&A' },
    { id: 'social',          label: 'Social',           group: 'One-Liners',      url: 'one-liners.json', key: 'social' },
    { id: 'magic-cocktails', label: 'Cocktail Magic',   group: 'One-Liners',      url: 'one-liners.json', key: 'magic_cocktails' },
    // --- Excuses (excuses.json) ---
    { id: 'life-wisdom',     label: 'Life Wisdom',      group: 'Excuses',         url: 'excuses.json',    key: 'life_wisdom' },
    { id: 'game-cheating',   label: 'Game Cheating',    group: 'Excuses',         url: 'excuses.json',    key: 'game_cheating' },
    { id: 'excuses',         label: 'Excuses',          group: 'Excuses',         url: 'excuses.json',    key: 'excuses' },
    { id: 'storytime',       label: 'Storytime',        group: 'Excuses',         url: 'excuses.json',    key: 'storytime' },
    { id: 'slipaway',        label: 'Slip Away',        group: 'Excuses',         url: 'excuses.json',    key: 'slipaway' },
    // --- Insults & Jokes (плоски масиви) ---
    { id: 'insult',          label: 'Insult',           group: 'Insults & Jokes', url: 'insults.json',     key: null },
    { id: 'dark-joke',       label: 'Dark Joke',        group: 'Insults & Jokes', url: 'dark-jokes.json',  key: null },
    { id: 'tasha',           label: "Tasha's Joke",     group: 'Insults & Jokes', url: 'tasha-jokes.json', key: null },
    // --- Портиерът на смъртта (doorman.json) — Death Cleric на вратата ---
    { id: 'spare-dying',     label: 'Spare the Dying',  group: 'Портиерът на смъртта', url: 'doorman.json', key: 'spare_the_dying' },
    { id: 'heal-zero',       label: 'Heal from 0',      group: 'Портиерът на смъртта', url: 'doorman.json', key: 'heal_from_zero' }
  ];

  // Lazy cache per URL — трите one-liner/excuses типа си делят по един fetch.
  const __cache = new Map();

  async function loadData(url) {
    if (__cache.has(url)) return __cache.get(url);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Cannot load ' + url);
    const data = await res.json();
    __cache.set(url, data);
    return data;
  }

  function pickRandom(arr) {
    return arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : '';
  }

  function setOutput(text) {
    const out = document.getElementById('flavorOutput');
    if (out) out.value = text;
  }

  function setActive(btn) {
    document.querySelectorAll('#tab-flavor .flavor-btn.active')
      .forEach(el => el.classList.remove('active'));
    if (btn) btn.classList.add('active');
  }

  const SPEAK_IDLE = '🔊 Произнеси';
  const SPEAK_STOP = '⏹ Спри';
  const NOTE_NO_KEY = 'Липсва API ключ — чете вграденият глас.';
  const NOTE_NETWORK = 'Няма връзка с TTS — чете вграденият глас.';
  // 403: ключът е наред, но адресът не е в разрешените referrer-и. Показваме кой
  // е адресът — иначе човек тръгва да търси мрежов проблем, какъвто няма.
  function noteForbidden() {
    const origin = (window.location && window.location.origin) || 'този адрес';
    return 'Адресът ' + origin + ' не е разрешен за API ключа — чете вграденият глас.';
  }

  function noteEl() {
    return document.getElementById('flavorTtsNote');
  }

  function hideNote() {
    const n = noteEl();
    if (!n) return;
    n.textContent = '';
    n.classList.add('hidden');
  }

  function showNote(reason) {
    const n = noteEl();
    if (!n) return;
    n.textContent = reason === 'no-key' ? NOTE_NO_KEY
      : reason === 'forbidden' ? noteForbidden()
      : NOTE_NETWORK;
    n.classList.remove('hidden');
  }

  function resetSpeakBtn() {
    const btn = document.getElementById('btnSpeakFlavor');
    if (!btn) return;
    btn.textContent = SPEAK_IDLE;
    btn.classList.remove('speaking');
  }

  // Извиква се при край на речта: показва бележка само ако сме паднали към
  // вградения глас (no-key/network), иначе я скрива.
  function onSpeakEnd(reason) {
    resetSpeakBtn();
    if (reason === 'no-key' || reason === 'network' || reason === 'forbidden') showNote(reason);
    else hideNote();
  }

  function stopSpeaking() {
    if (window.MonkTTS && typeof window.MonkTTS.stop === 'function') {
      window.MonkTTS.stop();
    }
    resetSpeakBtn();
    hideNote();
  }

  function attachSpeak() {
    const btn = document.getElementById('btnSpeakFlavor');
    if (!btn) return;
    const supported = window.MonkTTS &&
      (typeof window.MonkTTS.isSupported !== 'function' || window.MonkTTS.isSupported());
    if (!supported) {
      btn.disabled = true;
      btn.title = 'Гласът не е наличен в този браузър.';
      return;
    }
    btn.addEventListener('click', () => {
      if (window.MonkTTS.isSpeaking()) { stopSpeaking(); return; }
      const out = document.getElementById('flavorOutput');
      const text = out ? out.value.trim() : '';
      if (!text) return;
      hideNote();
      btn.textContent = SPEAK_STOP;
      btn.classList.add('speaking');
      window.MonkTTS.speak(text, { onend: onSpeakEnd });
    });
  }

  async function showLine(type, btn) {
    stopSpeaking();
    setOutput('');
    setActive(btn);
    try {
      const data = await loadData(type.url);
      const list = type.key === null
        ? (Array.isArray(data) ? data : [])
        : (Array.isArray(data[type.key]) ? data[type.key] : []);
      setOutput((pickRandom(list) || '(empty)').trim());
    } catch (e) {
      console.error(e);
      setOutput('(failed to load ' + type.url + ')');
    }
  }

  window.attachFlavor = function () {
    FLAVOR_TYPES.forEach(type => {
      const btn = document.querySelector('#tab-flavor [data-flavor="' + type.id + '"]');
      if (!btn) return; // табът може да липсва в някои билдове
      btn.addEventListener('click', () => showLine(type, btn));
    });
    attachSpeak();
  };

  window.renderFlavorUI = function () {};

  // за тестове / бъдещи табове
  window.__FLAVOR_TYPES = FLAVOR_TYPES;
})();
