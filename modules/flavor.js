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
    { id: 'tasha',           label: "Tasha's Joke",     group: 'Insults & Jokes', url: 'tasha-jokes.json', key: null }
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

  async function showLine(type, btn) {
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
  };

  window.renderFlavorUI = function () {};

  // за тестове / бъдещи табове
  window.__FLAVOR_TYPES = FLAVOR_TYPES;
})();
