// ===== Excuses Module =====
// Изолиран модул за функционалността на Excuses
(function() {
  'use strict';

  // --- Excuses (lazy load JSON) ---
  let __exc_cache = null;
  const EXC_URL = 'excuses.json';

  async function loadExcuses() {
    if (__exc_cache) return __exc_cache;
    const res = await fetch(EXC_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('Cannot load excuses.json');
    __exc_cache = await res.json();
    return __exc_cache;
  }

  function attachExcuses() {
    const wiring = [
      { btn: 'btnExLifeWisdom', out: 'exLifeWisdom', key: 'life_wisdom' },
      { btn: 'btnExGameCheating', out: 'exGameCheating', key: 'game_cheating' },
      { btn: 'btnExExcuses', out: 'exExcuses', key: 'excuses' },
      { btn: 'btnExStorytime', out: 'exStorytime', key: 'storytime' },
      { btn: 'btnExSlipaway', out: 'exSlipaway', key: 'slipaway' }
    ];

    wiring.forEach(({ btn, out, key }) => {
      const b = document.getElementById(btn);
      if (!b) return; // табът може да липсва
      b.addEventListener('click', async () => {
        try {
          const data = await loadExcuses();
          const list = Array.isArray(data[key]) ? data[key] : [];
          const line = list.length ? list[Math.floor(Math.random() * list.length)] : '(empty)';
          const outEl = document.getElementById(out);
          if (outEl) outEl.value = (line || '').trim();
        } catch (e) {
          console.error(e);
          const outEl = document.getElementById(out);
          if (outEl) outEl.value = '(failed to load excuses.json)';
        }
      });
    });
  }

  // Export functions to global scope
  window.attachExcuses = attachExcuses;
})();
