// ===== One-Liners Module =====
// Изолиран модул за функционалността на One-Liners
(function() {
  'use strict';

  // --- One-Liners (lazy load JSON) ---
  let __ol_cache = null;
  const OL_URL = 'one-liners.json';

  async function loadOneLiners() {
    if (__ol_cache) return __ol_cache;
    const res = await fetch(OL_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('Cannot load one-liners.json');
    __ol_cache = await res.json();
    return __ol_cache;
  }

  function pickRandom(arr) {
    return arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : '';
  }

  function attachOneLiners() {
    // мап: бутон → { секция от JSON, изходно поле }
    const wiring = [
      { btn: 'btnCritMiss', out: 'olCritMiss', key: 'crit_miss' },
      { btn: 'btnMissAttack', out: 'olMissAttack', key: 'miss_attack' },
      { btn: 'btnCritAttack', out: 'olCritAttack', key: 'crit_attack' },
      { btn: 'btnSufferCrit', out: 'olSufferCrit', key: 'suffer_crit' },
      { btn: 'btnTease', out: 'olTease', key: 'combat_tease' },
      { btn: 'btnMagic', out: 'olMagic', key: 'magic' },
      { btn: 'btnQA', out: 'olQA', key: 'Q&A' },
      { btn: 'btnSocial', out: 'olSocial', key: 'social' },
      { btn: 'btnCoctailMagic', out: 'olCoctailMagic', key: 'magic_cocktails' }
    ];

    wiring.forEach(({ btn, out, key }) => {
      const b = document.getElementById(btn);
      if (!b) return; // табът може да липсва в някои билдове
      b.addEventListener('click', async () => {
        try {
          const data = await loadOneLiners();
          const list = Array.isArray(data[key]) ? data[key] : [];
          const line = (pickRandom(list) || '(empty)').trim();
          const outEl = document.getElementById(out);
          if (outEl) outEl.value = line;
        } catch (e) {
          console.error(e);
          const outEl = document.getElementById(out);
          if (outEl) outEl.value = '(failed to load one-liners.json)';
        }
      });
    });
  }

  // Export functions to global scope
  window.attachOneLiners = attachOneLiners;
})();
