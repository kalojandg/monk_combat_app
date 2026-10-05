// ===== Spell Library (Spellcasting таб на клерика) =====
// Рендерира в трите контейнера на tabs/spellcasting.html:
//   #spellSlotsRoot    — слотовете (рендерът на spells-mark.js, не копие)
//   #spellPreparedRoot — приготвените за деня, по ниво, брояч подготвени/макс
//   #spellLibraryRoot  — целият клерик списък (API 2014 + local-spells.json) с търсене
// Приготвените живеят в st.preparedClericSpells (същият списък като в Resurrection таба);
// лимитът е clericLevel + WIS mod (минимум 1), domain заклинанията са винаги подготвени
// и не се броят — правилата на renderClericPrepSpells.
// Ползва глобалните функции на spells-mark.js (класически скрипт, зареден преди този).
(function () {
  'use strict';

  // ⚠ Версионираният път: /api/classes/... връща 301 и работи само заради redirect-а
  const LIBRARY_URL = 'https://www.dnd5eapi.co/api/2014/classes/cleric/spells';
  // Arcane Eye идва в клерик списъка на API-то (SRD грешка) — чужда магия
  const EXCLUDED = new Set(['arcane-eye']);

  // Офлайн кеш на детайлите на приготвените: собствен localStorage ключ, НЕ в st.
  // Това е производни SRD данни, не състояние на героя — в st би надуло всеки save,
  // export bundle и cloud sync с текст, който пак може да се изтегли. Общ е за героите
  // (едно и също заклинание има едни и същи детайли), затова не се чисти при отприготвяне.
  const CACHE_KEY = 'spellDetailsCache_v1';

  let _library = null;          // [{ index, name, level }] — само в паметта: първо зареждане иска мрежа
  let _libraryPromise = null;
  let _libraryError = false;
  let _query = '';
  let _level = '';              // '' = всички нива
  let _expandedPrepared = null;

  const $ = id => document.getElementById(id);

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // По име, без диакритика, case-insensitive
  function normalize(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  function spellMatches(spell, query) {
    const q = normalize(query);
    return !q || normalize(spell.name).includes(q);
  }

  // ── Правилата за подготовка ──

  function clericLevel() {
    return window.st.clericLevel || 0;
  }

  function wisMod() {
    return Math.floor(((window.st.wis || 10) - 10) / 2);
  }

  function maxPrepared() {
    return Math.max(1, clericLevel() + wisMod());
  }

  function maxSlotLevel() {
    const table = (typeof CLERIC_SPELL_SLOTS !== 'undefined' && CLERIC_SPELL_SLOTS[clericLevel()]) || {};
    return Math.max(0, ...Object.keys(table).map(Number));
  }

  // Domain заклинанията на активния домейн, достъпни на текущото ниво.
  // Нивото на заклинанието следва реда: клерик 1/3/5/7/9 → заклинание 1/2/3/4/5.
  function domainSpells() {
    const rows = typeof window.getDomainSpellRows === 'function' ? window.getDomainSpellRows() : [];
    return rows.filter(r => r.minLevel <= clericLevel())
      .flatMap(r => r.spells.map(sp => ({ index: sp.index, name: sp.name, level: Math.ceil(r.minLevel / 2) })));
  }

  function preparedList() {
    if (!Array.isArray(window.st.preparedClericSpells)) window.st.preparedClericSpells = [];
    return window.st.preparedClericSpells;
  }

  // Броят се само обикновените — domain не тежат на лимита
  function preparedCount(domainSet) {
    return preparedList().filter(i => !domainSet.has(i)).length;
  }

  function librarySpell(index) {
    return _library ? _library.find(sp => sp.index === index) : null;
  }

  // ── Офлайн кеш на детайлите ──

  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch { return {}; }
  }

  function cacheDetails(index) {
    if (readCache()[index]) return Promise.resolve(true);
    return _fetchSpellDetails(index)
      .then(d => {
        const cache = readCache();
        cache[index] = d;
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { }
        return true;
      })
      .catch(() => false);
  }

  // Допълва кеша за приготвените + domain (напр. приготвени отпреди кеша); без мрежа — тихо
  function ensureCached() {
    const cache = readCache();
    const missing = [...domainSpells().map(d => d.index), ...preparedList()].filter(i => !cache[i]);
    if (!missing.length) return;
    Promise.all(missing.map(cacheDetails)).then(results => {
      if (results.some(Boolean)) renderPrepared();
    });
  }

  // ── Библиотеката: API 2014 + local-spells.json ──

  function loadLibrary() {
    if (_library || _libraryPromise) return;
    _libraryPromise = Promise.all([
      fetch(LIBRARY_URL).then(r => {
        if (!r.ok) throw new Error(`API ${r.status}`);
        return r.json();
      }),
      _loadLocalSpells(),
      window.loadDomainSpells ? window.loadDomainSpells() : null,
    ])
      .then(([api, local]) => {
        const byIndex = new Map();
        (api.results || []).forEach(s => {
          if (!EXCLUDED.has(s.index)) byIndex.set(s.index, { index: s.index, name: s.name, level: s.level });
        });
        // Локалното има приоритет пред API-то (както в _fetchSpellDetails)
        Object.entries(local || {}).forEach(([index, d]) => {
          byIndex.set(index, { index, name: d.name, level: d.level });
        });
        _library = Array.from(byIndex.values())
          .sort((a, b) => (a.level - b.level) || a.name.localeCompare(b.name));
        _libraryError = false;
      })
      .catch(() => { _libraryError = true; })
      .finally(() => {
        _libraryPromise = null;
        renderSpellcasting();
      });
  }

  // ── Скелет: възлите се създават динамично в съществуващите контейнери ──

  function section(root, title, bodyClass) {
    let body = root.querySelector(`.${bodyClass}`);
    if (body) return body;
    root.insertAdjacentHTML('beforeend', `<div class="section-title mt-14">${title}</div>`);
    body = document.createElement('div');
    body.className = bodyClass;
    root.appendChild(body);
    return body;
  }

  function libraryBody(root) {
    let body = root.querySelector('.spell-lib-body');
    if (body) return body;
    root.insertAdjacentHTML('beforeend', `
      <div class="section-title mt-14">Spell Library</div>
      <p class="small muted" style="margin: 4px 0 10px">The full Cleric list. One click prepares or un-prepares a spell for the day.</p>
      <div class="spell-lib-controls row" style="gap: 8px; margin-bottom: 10px">
        <input id="spellLibSearch" type="search" placeholder="Search spells..." autocomplete="off">
        <select id="spellLibLevel">
          <option value="">All levels</option>
          <option value="0">Cantrips</option>
          ${Array.from({ length: 9 }, (_, i) => `<option value="${i + 1}">Level ${i + 1}</option>`).join('')}
        </select>
      </div>`);
    body = document.createElement('div');
    body.className = 'spell-lib-body';
    root.appendChild(body);

    $('spellLibSearch').addEventListener('input', e => { _query = e.target.value; renderLibrary(); });
    $('spellLibLevel').addEventListener('change', e => { _level = e.target.value; renderLibrary(); });
    body.addEventListener('click', e => {
      const btn = e.target.closest('.btn-spell-prep');
      if (btn && !btn.disabled) togglePrepared(btn.dataset.prep);
    });
    return body;
  }

  // ── Слотове ──

  function renderSlots() {
    const root = $('spellSlotsRoot');
    if (!root || typeof _renderMarkSlots !== 'function') return;
    const host = section(root, 'Spell Slots', 'spell-lib-slots');
    // _renderMarkSlots пише в #mark-slots-root, а този id го държи (скритият) Resurrection
    // партиал — даваме id-то временно на нашия възел, за да ползваме същия рендер.
    const resurrection = $('mark-slots-root');
    if (resurrection) resurrection.removeAttribute('id');
    host.id = 'mark-slots-root';
    try {
      _renderMarkSlots();
    } finally {
      host.removeAttribute('id');
      if (resurrection) resurrection.id = 'mark-slots-root';
    }
  }

  // ── Приготвени ──

  function renderPrepared() {
    const root = $('spellPreparedRoot');
    if (!root) return;
    const body = section(root, 'Prepared Today', 'spell-prep-body');
    if (!body.__wired) {
      body.__wired = true;
      body.addEventListener('click', e => {
        const item = e.target.closest('.spell-prep-item');
        if (!item) return;
        const index = item.dataset.prepared;
        _expandedPrepared = _expandedPrepared === index ? null : index;
        renderPrepared();
        if (_expandedPrepared === index && !readCache()[index]) {
          cacheDetails(index).then(ok => { if (ok) renderPrepared(); });
        }
      });
    }

    const lvl = clericLevel();
    if (lvl < 1) {
      body.innerHTML = '<div class="small muted">No Cleric levels.</div>';
      return;
    }

    const cache = readCache();
    const domain = domainSpells();
    const domainSet = new Set(domain.map(d => d.index));
    const entries = [
      ...domain.map(d => ({ ...d, level: cache[d.index]?.level ?? d.level, domain: true })),
      ...preparedList().filter(i => !domainSet.has(i)).map(index => {
        const known = cache[index] || librarySpell(index) || {};
        return { index, name: known.name || index, level: known.level ?? null, domain: false };
      }),
    ];

    const groups = {};
    entries.forEach(sp => { (groups[sp.level ?? '?'] = groups[sp.level ?? '?'] || []).push(sp); });
    const levels = Object.keys(groups).sort((a, b) => (a === '?') - (b === '?') || Number(a) - Number(b));
    const wis = wisMod();

    body.innerHTML = `
      <div class="spell-prep-counter">Prepared: <strong>${preparedCount(domainSet)}/${maxPrepared()}</strong>
        <span class="small muted">(Cleric ${lvl} + WIS ${wis >= 0 ? '+' : ''}${wis}; domain spells don't count)</span></div>
      ${levels.map(l => `
        <div class="spell-prep-group" data-prep-level="${l}">
          <div class="small muted" style="margin: 8px 0 4px">${l === '?' ? 'Unknown level' : l === '0' ? 'Cantrips' : `Level ${l}`}</div>
          ${groups[l].sort((a, b) => a.name.localeCompare(b.name)).map(sp => {
            const expanded = _expandedPrepared === sp.index;
            const d = cache[sp.index];
            return `
              <div class="mark-spell-item spell-prep-item${expanded ? ' expanded' : ''}" data-prepared="${esc(sp.index)}"${sp.domain ? ' data-domain="1"' : ''}>
                <div class="mark-spell-header">
                  <span class="mark-spell-name spell-prep-name">${esc(sp.name)}</span>
                  ${sp.domain ? '<span class="mark-spell-note">Domain · always prepared</span>' : ''}
                </div>
                ${expanded ? `<div class="mark-spell-details">${d ? _renderSpellDetail(d) : '<div class="small muted">Details not cached yet — they load once you are online.</div>'}</div>` : ''}
              </div>`;
          }).join('')}
        </div>`).join('')}`;
  }

  function togglePrepared(index) {
    const preps = preparedList();
    const pos = preps.indexOf(index);
    if (pos >= 0) {
      preps.splice(pos, 1);
    } else {
      const domainSet = new Set(domainSpells().map(d => d.index));
      const sp = librarySpell(index);
      if (domainSet.has(index) || preparedCount(domainSet) >= maxPrepared()) return;
      if (!sp || sp.level < 1 || sp.level > maxSlotLevel()) return;
      preps.push(index);
      cacheDetails(index).then(ok => { if (ok) renderPrepared(); });
    }
    window.save();   // → renderAll → renderSpellcasting
  }

  // ── Библиотека ──

  function renderLibrary() {
    const root = $('spellLibraryRoot');
    if (!root) return;
    const body = libraryBody(root);

    if (!_library) {
      if (_libraryError) {
        body.innerHTML = '<div class="small muted spell-lib-error">Spell library unavailable — you seem to be offline (no connection to the spell API). Prepared spells still work from the local cache; reopen this tab once you are back online.</div>';
      } else {
        body.innerHTML = '<div class="small muted">Loading spell library...</div>';
        loadLibrary();
      }
      return;
    }

    const domainSet = new Set(domainSpells().map(d => d.index));
    const prepared = preparedList();
    const atMax = preparedCount(domainSet) >= maxPrepared();
    const slotCap = maxSlotLevel();
    const shown = _library.filter(sp => (_level === '' || sp.level === Number(_level)) && spellMatches(sp, _query));

    if (!shown.length) {
      body.innerHTML = '<div class="small muted">No spells match.</div>';
      return;
    }

    body.innerHTML = shown.map(sp => {
      const isPrepared = prepared.includes(sp.index);
      let action;
      if (domainSet.has(sp.index)) {
        action = '<span class="mark-spell-note">Domain · always prepared</span>';
      } else if (sp.level === 0) {
        action = '<span class="mark-spell-note">Cantrip</span>';
      } else {
        const tooHigh = sp.level > slotCap;
        const disabled = !isPrepared && (atMax || tooHigh);
        const title = isPrepared ? 'Un-prepare' : tooHigh ? 'No spell slots of this level yet' : atMax ? 'Preparation limit reached' : 'Prepare';
        action = `<button class="btn-mark-prep btn-spell-prep${isPrepared ? ' active' : ''}" data-prep="${esc(sp.index)}"${disabled ? ' disabled' : ''} title="${title}">${isPrepared ? 'Prepared' : 'Prepare'}</button>`;
      }
      return `
        <div class="mark-spell-item spell-lib-item${isPrepared ? ' mark-prepared' : ''}" data-index="${esc(sp.index)}">
          <div class="mark-spell-header">
            <span class="mark-spell-name">${esc(sp.name)}</span>
            <span class="mark-spell-level-badge">${sp.level === 0 ? 'C' : `L${sp.level}`}</span>
            ${action}
          </div>
        </div>`;
    }).join('');
  }

  // ── Оркестрация ──

  function tabVisible() {
    const tab = $('tab-spellcasting');
    return !!tab && !tab.classList.contains('hidden');
  }

  function renderSpellcasting() {
    if (!window.st || !tabVisible()) return;
    renderSlots();
    renderPrepared();
    renderLibrary();
  }

  // Показване на таба (клик или програмно showTab): слотовете се пресмятат от
  // initMarkSpells (той вика save → renderAll → renderSpellcasting), библиотеката
  // опитва мрежата наново след офлайн провал, а кешът се допълва.
  function onTabShown() {
    _libraryError = false;
    if (typeof window.initMarkSpells === 'function') window.initMarkSpells();
    renderSpellcasting();
    ensureCached();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const tab = $('tab-spellcasting');
    if (tab) {
      let wasVisible = tabVisible();
      new MutationObserver(() => {
        const visible = tabVisible();
        if (visible && !wasVisible) setTimeout(onTabShown, 0);
        wasVisible = visible;
      }).observe(tab, { attributes: true, attributeFilter: ['class'] });
      if (wasVisible) setTimeout(onTabShown, 0);
    }
    // Всеки save() минава през renderAll — оттам и брояч/бутони/слотове остават в синхрон
    if (typeof window.renderAll === 'function') {
      const origRenderAll = window.renderAll;
      window.renderAll = function () {
        const r = origRenderAll.apply(this, arguments);
        renderSpellcasting();
        return r;
      };
    }
  });

  window.spellMatches = spellMatches;
  window.renderSpellLibraryUI = renderSpellcasting;
})();
