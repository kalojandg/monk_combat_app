// ===== Name Gen Module =====
// Консолидиран таб: Alias / Familiar / NPC генератори през един registry и една
// изходна зона. Save-ът РУТИРА към СЪЩИТЕ хранилища като старите табове:
//   alias    → st.aliases        (+ window.save)   rec: { name, to, ts }
//   familiar → localStorage[FAM_LS_KEY]            rec: { name, cat, note, ts }
//   npc      → st.npcNames        (+ window.save)   rec: { name, note, ts }
// Никаква промяна на схемите — записаните данни на живия персонаж се виждат 1:1.
(function () {
  'use strict';

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
    ));
  }
  function pickRandom(arr) {
    return arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : '';
  }

  // ---------- lazy JSON caches (копия от старите модули) ----------
  let __sh = null, __fam = null, __npc = null;

  async function loadShenanigans() {
    if (__sh) return __sh;
    try {
      const res = await fetch('shenanigans.json', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) __sh = data;
      else if (Array.isArray(data.names)) __sh = data.names;
      else if (Array.isArray(data.fakeNames)) __sh = data.fakeNames;
      else __sh = [];
    } catch { __sh = []; }
    return __sh;
  }
  async function loadFamiliars() {
    if (__fam) return __fam;
    const res = await fetch('familiars.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Cannot load familiars.json');
    __fam = await res.json(); // { feline:[], canine:[], ... }
    return __fam;
  }
  async function loadNpc() {
    if (__npc) return __npc;
    try {
      const res = await fetch('npc-names.json', { cache: 'no-store' });
      __npc = await res.json();
    } catch { __npc = []; }
    return __npc;
  }

  // Familiar records живеят в localStorage под СЪЩИЯ ключ като modules/familiars.js
  const FAM_LS_KEY = 'familiars_v1';

  // ---------- store адаптери (КЪМ СЪЩИТЕ хранилища) ----------
  const stores = {
    alias: {
      load() {
        if (typeof window.st === 'undefined') return [];
        if (!Array.isArray(window.st.aliases)) window.st.aliases = [];
        return window.st.aliases;
      },
      save(arr) {
        if (typeof window.st === 'undefined' || typeof window.save === 'undefined') return;
        window.st.aliases = Array.isArray(arr) ? arr : [];
        window.save();
      }
    },
    familiar: {
      load() {
        try { return JSON.parse(localStorage.getItem(FAM_LS_KEY)) || []; }
        catch { return []; }
      },
      save(arr) {
        try { localStorage.setItem(FAM_LS_KEY, JSON.stringify(arr)); } catch { }
      }
    },
    npc: {
      load() {
        if (typeof window.st === 'undefined') return [];
        if (!Array.isArray(window.st.npcNames)) window.st.npcNames = [];
        return window.st.npcNames;
      },
      save(arr) {
        if (typeof window.st === 'undefined' || typeof window.save === 'undefined') return;
        window.st.npcNames = Array.isArray(arr) ? arr : [];
        window.save();
      }
    }
  };

  // ---------- per-type registry ----------
  // makeRec: (name, note) → record обект (същите полета като старите модули)
  // rows:    (list) → HTML на редовете (същите колони и .gen-del бутон за триене)
  const registry = {
    alias: {
      modal: 'genAliasModal',
      noteInput: 'genAliasToInput',
      cancel: 'genAliasCancel',
      confirm: 'genAliasConfirm',
      empty: 'Няма запазени представяния още.',
      head: '<tr><th>#</th><th>Име</th><th>На кого</th><th>Кога</th><th></th></tr>',
      makeRec: (name, note) => ({ name, to: note, ts: Date.now() }),
      rows: (list) => list.map((rec, i) => {
        const when = new Date(rec.ts || Date.now()).toLocaleString();
        return `<tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(rec.name || '')}</td>
          <td>${escapeHtml(rec.to || '')}</td>
          <td style="white-space:nowrap">${when}</td>
          <td style="text-align:center"><button class="gen-del" data-idx="${i}">🗑️</button></td>
        </tr>`;
      }).join('')
    },
    familiar: {
      modal: 'genFamModal',
      noteInput: 'genFamNoteInput',
      cancel: 'genFamCancel',
      confirm: 'genFamConfirm',
      empty: 'Няма записани имена още.',
      head: '<tr><th>Име</th><th>Тип</th><th>Бележка</th><th>Кога</th><th></th></tr>',
      makeRec: (name, note) => ({ name, cat: _lastFamCat, note, ts: Date.now() }),
      rows: (list) => list.map((rec, i) => {
        const when = new Date(rec.ts || Date.now()).toLocaleString();
        return `<tr>
          <td>${escapeHtml(rec.name || '')}</td>
          <td>${escapeHtml(rec.cat || '')}</td>
          <td>${escapeHtml(rec.note || '')}</td>
          <td style="white-space:nowrap">${when}</td>
          <td style="text-align:center"><button class="gen-del" data-idx="${i}">🗑️</button></td>
        </tr>`;
      }).join('')
    },
    npc: {
      modal: 'genNpcModal',
      noteInput: 'genNpcNoteInput',
      cancel: 'genNpcCancel',
      confirm: 'genNpcConfirm',
      empty: 'No saved NPC names yet.',
      head: '<tr><th>Name</th><th>Note</th><th></th></tr>',
      makeRec: (name, note) => ({ name, note, ts: Date.now() }),
      rows: (list) => list.map((rec, i) => `
        <tr>
          <td>${escapeHtml(rec.name || '')}</td>
          <td>${escapeHtml(rec.note || '')}</td>
          <td style="text-align:center;white-space:nowrap"><button class="gen-del" data-idx="${i}">🗑️</button></td>
        </tr>`).join('')
    }
  };

  // ---------- текущо състояние ----------
  let _type = 'alias';     // активен тип
  let _lastName = null;    // генерираното (за Save)
  let _lastFamCat = null;  // категорията за familiar записа

  // ---------- helpers ----------
  function setOutput(text) {
    const out = document.getElementById('genOutput');
    if (out) out.value = text || '';
  }
  function setSaveEnabled(on) {
    const b = document.getElementById('genSave');
    if (b) b.disabled = !on;
  }
  function show(id, on) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !on);
  }

  // ---------- таблица-лог (за активния тип) ----------
  function renderLog() {
    const root = document.getElementById('genLog');
    if (!root) return;
    const cfg = registry[_type];
    const list = stores[_type].load();
    if (!list.length) {
      root.innerHTML = `<small>${cfg.empty}</small>`;
      return;
    }
    root.innerHTML = `<table class="alias-table">
      <thead>${cfg.head}</thead>
      <tbody>${cfg.rows(list)}</tbody>
    </table>`;

    root.querySelectorAll('.gen-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx, 10);
        const arr = stores[_type].load();
        arr.splice(idx, 1);
        stores[_type].save(arr);
        renderLog();
      });
    });
  }

  // ---------- generate логика (копия от старите модули) ----------
  async function generateAlias() {
    const list = await loadShenanigans();
    const name = (pickRandom(list) || '').trim();
    setOutput(name || '(no names found)');
    _lastName = name || null;
    setSaveEnabled(!!_lastName);
  }

  async function generateFamiliar(cat) {
    try {
      const data = await loadFamiliars();
      const list = Array.isArray(data[cat]) ? data[cat] : [];
      const name = (pickRandom(list) || '').trim();
      setOutput(name || '(no names found)');
      _lastName = name || null;
      _lastFamCat = cat || null;
      setSaveEnabled(!!_lastName);
    } catch (e) { console.error(e); }
  }

  function getSelectedRace() {
    const el = document.querySelector('input[name="genNpcRace"]:checked');
    return el ? el.value : 'human';
  }
  function getSelectedGender() {
    const el = document.querySelector('input[name="genNpcGender"]:checked');
    return el ? el.value : 'male';
  }
  function updateGenderVisibility() {
    const race = getSelectedRace();
    show('genNpcGenderGroup', race !== 'toblin');
  }
  async function generateNpc() {
    const data = await loadNpc();
    const raceKey = getSelectedRace();
    const genderKey = raceKey === 'toblin' ? 'any' : getSelectedGender();
    const raceObj = data.find(r => r.key === raceKey);
    if (!raceObj) return;
    const genderObj = raceObj.genders.find(g => g.key === genderKey);
    if (!genderObj) return;
    const name = pickRandom(genderObj.names);
    setOutput(name);
    _lastName = name || null;
    setSaveEnabled(!!_lastName);
  }

  // ---------- Generate бутон рутиране ----------
  function doGenerate() {
    if (_type === 'alias') return generateAlias();
    if (_type === 'npc') return generateNpc();
    // familiar се генерира от груповите бутони, не от Generate
  }

  // ---------- модал flow за Save ----------
  function openModal() {
    const cfg = registry[_type];
    const m = document.getElementById(cfg.modal);
    const t = document.getElementById(cfg.noteInput);
    if (!m) return;
    if (t) t.value = '';
    m.classList.remove('hidden');
    if (t) setTimeout(() => t.focus(), 0);
  }
  function closeModal(type) {
    const m = document.getElementById(registry[type].modal);
    if (m) m.classList.add('hidden');
  }
  function confirmSave() {
    if (!_lastName) return;
    const cfg = registry[_type];
    const noteEl = document.getElementById(cfg.noteInput);
    const note = (noteEl && noteEl.value || '').trim();
    const arr = stores[_type].load();
    arr.unshift(cfg.makeRec(_lastName, note)); // новите най-отгоре
    stores[_type].save(arr);
    renderLog();
    setSaveEnabled(false);
    _lastName = null;
    closeModal(_type);
  }

  // ---------- смяна на тип ----------
  function setType(type) {
    if (!registry[type]) return;
    _type = type;
    _lastName = null;
    _lastFamCat = null;
    setOutput('');
    setSaveEnabled(false);

    // активен type бутон
    document.querySelectorAll('#genTypeButtons [data-gentype]').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-gentype') === type);
    });

    // под-UI: NPC радиота, Familiar групи, Generate бутон
    show('genNpcOptions', type === 'npc');
    show('genFamGroups', type === 'familiar');
    show('genGenerate', type !== 'familiar'); // familiar генерира от групите
    if (type === 'npc') updateGenderVisibility();

    renderLog();
  }

  // ---------- attach ----------
  window.attachNamegen = function () {
    const wrap = document.getElementById('genTypeButtons');
    if (!wrap) return;

    // type бутони
    wrap.querySelectorAll('[data-gentype]').forEach(btn => {
      btn.addEventListener('click', () => setType(btn.getAttribute('data-gentype')));
    });

    // Generate
    const gen = document.getElementById('genGenerate');
    gen && gen.addEventListener('click', doGenerate);

    // Familiar групи
    document.querySelectorAll('#genFamGroups .fam-btn').forEach(btn => {
      btn.addEventListener('click', () => generateFamiliar(btn.getAttribute('data-famcat')));
    });

    // NPC радиота → gender visibility
    document.querySelectorAll('input[name="genNpcRace"]').forEach(r => {
      r.addEventListener('change', updateGenderVisibility);
    });

    // Save
    const save = document.getElementById('genSave');
    save && save.addEventListener('click', () => { if (_lastName) openModal(); });

    // модали (cancel/confirm/click-outside за трите типа)
    Object.keys(registry).forEach(type => {
      const cfg = registry[type];
      const cancel = document.getElementById(cfg.cancel);
      const confirm = document.getElementById(cfg.confirm);
      cancel && cancel.addEventListener('click', () => closeModal(type));
      confirm && confirm.addEventListener('click', confirmSave);
      document.getElementById(cfg.modal)?.addEventListener('click', (e) => {
        if (e.target.id === cfg.modal) closeModal(type);
      });
    });

    // init: alias по подразбиране
    setType('alias');
  };

  // рендър при save() отвън (лога зависи от живите st данни)
  window.renderNamegenUI = function () { renderLog(); };
})();
