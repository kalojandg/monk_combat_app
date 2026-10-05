// ===== Campaign Container =====
// Campaign NPCs и session notes са на КАМПАНИЯТА, не на героя: живеят в собствен
// localStorage ключ campaign_v1 = { npcs, sessionNotes, savedAt }, общ за всички герои.
// Реализацията зад window.Campaign (app.js ползва фасадата си само ако тази липсва).
//
// Засяване чрез КОПИРАНЕ: ако campaign_v1 липсва, се създава от campaignNpcs/sessionNotes
// на монашеския запис (monkSheet_v3). Старите полета там НЕ се трият и НЕ се празнят —
// просто спират да се ползват.
(function () {
  'use strict';

  const KEY = 'campaign_v1';
  const SEED_KEY = 'monkSheet_v3';

  let data = null;
  let lastWritten = null; // npcs+notes при последния запис — за persist() без излишни savedAt

  function contentOf(d) {
    return JSON.stringify({ npcs: d.npcs, sessionNotes: d.sessionNotes });
  }

  function normalize(obj) {
    const o = obj && typeof obj === 'object' ? obj : {};
    return {
      npcs: Array.isArray(o.npcs) ? o.npcs : [],
      sessionNotes: typeof o.sessionNotes === 'string' ? o.sessionNotes : '',
      savedAt: typeof o.savedAt === 'string' ? o.savedAt : ''
    };
  }

  function write() {
    localStorage.setItem(KEY, JSON.stringify(data));
    lastWritten = contentOf(data);
  }

  // Всеки запис обновява savedAt
  function commit() {
    data.savedAt = new Date().toISOString();
    write();
  }

  function seedFromMonk() {
    let monk = {};
    try { monk = JSON.parse(localStorage.getItem(SEED_KEY)) || {}; } catch { }
    // Дълбоко копие — монашеският запис остава непокътнат
    const npcs = Array.isArray(monk.campaignNpcs) ? JSON.parse(JSON.stringify(monk.campaignNpcs)) : [];
    const sessionNotes = typeof monk.sessionNotes === 'string' ? monk.sessionNotes : '';
    data = { npcs, sessionNotes, savedAt: '' };
    commit();
  }

  function load() {
    if (data) return data;
    const raw = localStorage.getItem(KEY);
    if (raw !== null) {
      try {
        data = normalize(JSON.parse(raw));
        lastWritten = contentOf(data);
        return data;
      } catch { }
    }
    seedFromMonk();
    return data;
  }

  window.Campaign = {
    getNpcs() { return load().npcs; },
    setNpcs(arr) { load().npcs = Array.isArray(arr) ? arr : []; commit(); },
    getNotes() { return load().sessionNotes; },
    setNotes(str) { load().sessionNotes = str == null ? '' : String(str); commit(); },
    getSavedAt() { return load().savedAt; },
    setSavedAt(iso) { load().savedAt = iso; write(); },
    // Консуматорите менят масива на място (push/splice) и викат save() → тук записваме,
    // само ако съдържанието наистина се е променило.
    persist() {
      if (contentOf(load()) !== lastWritten) commit();
    }
  };

  load();
})();
