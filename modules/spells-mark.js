// Mark of Shadow — fixed spell list, Cleric spell slots from D&D 5e API

const DOMAIN_SPELL_ROWS = [
  { minLevel: 1, spells: [
    { index: 'false-life',          name: 'False Life' },
    { index: 'ray-of-sickness',     name: 'Ray of Sickness' },
  ]},
  { minLevel: 3, spells: [
    { index: 'blindness-deafness',  name: 'Blindness/Deafness' },
    { index: 'ray-of-enfeeblement', name: 'Ray of Enfeeblement' },
  ]},
  { minLevel: 5, spells: [
    { index: 'animate-dead',        name: 'Animate Dead' },
    { index: 'vampiric-touch',      name: 'Vampiric Touch' },
  ]},
  { minLevel: 7, spells: [
    { index: 'blight',              name: 'Blight' },
    { index: 'death-ward',          name: 'Death Ward' },
  ]},
  { minLevel: 9, spells: [
    { index: 'antilife-shell',      name: 'Antilife Shell' },
    { index: 'cloudkill',           name: 'Cloudkill' },
  ]},
];

const MARK_SPELLS = {
  1: [
    { index: 'disguise-self',      name: 'Disguise Self' },
    { index: 'silent-image',       name: 'Silent Image' },
  ],
  2: [
    { index: 'darkness',           name: 'Darkness' },
    { index: 'pass-without-trace', name: 'Pass without Trace' },
  ],
  3: [
    { index: 'clairvoyance',       name: 'Clairvoyance' },
    { index: 'major-image',        name: 'Major Image' },
  ],
  4: [
    { index: 'greater-invisibility',   name: 'Greater Invisibility' },
    { index: 'hallucinatory-terrain',  name: 'Hallucinatory Terrain' },
  ],
  5: [
    { index: 'mislead', name: 'Mislead' },
  ],
};

const API_BASE = 'https://www.dnd5eapi.co';

// Spell details cache
const _spellCache = {};

const _LOCAL_SPELLS = {
  'word-of-radiance': {
    name: 'Word of Radiance', level: 0,
    casting_time: '1 action', range: '5 feet', duration: 'Instantaneous',
    components: ['V', 'M'], material: 'holy symbol',
    desc: ['You utter a divine word, and burning radiance erupts from you. Each creature of your choice that you can see within range must succeed on a Constitution saving throw or take 1d6 radiant damage.'],
    higher_level: ['The damage increases by 1d6 when you reach 5th level (2d6), 11th level (3d6), and 17th level (4d6).'],
  },
  'ray-of-sickness': {
    name: 'Ray of Sickness', level: 1,
    casting_time: '1 action', range: '60 feet', duration: 'Instantaneous',
    components: ['V', 'S'],
    desc: ['A ray of sickening greenish energy lashes out toward a creature within range. Make a ranged spell attack against the target. On a hit, the target takes 2d8 poison damage and must make a Constitution saving throw. On a failed save, it is also poisoned until the end of your next turn.'],
    higher_level: ['When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d8 for each slot level above 1st.'],
  },
};

// Spells cast via Innate Spellcasting require no material components
const _NO_MATERIAL_SPELLS = new Set(['animal-friendship', 'suggestion']);

async function _fetchSpellDetails(index) {
  if (_spellCache[index]) return _spellCache[index];
  if (_LOCAL_SPELLS[index]) { _spellCache[index] = _LOCAL_SPELLS[index]; return _LOCAL_SPELLS[index]; }
  const res = await fetch(`${API_BASE}/api/spells/${index}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  if (_NO_MATERIAL_SPELLS.has(index) && Array.isArray(data.components) && data.components.includes('M')) {
    data.material = 'not applicable';
  }
  _spellCache[index] = data;
  return data;
}

// Standard D&D 5e Cleric spell slot progression (no API needed)
const CLERIC_SPELL_SLOTS = {
  1:  { 1: 2 },
  2:  { 1: 3 },
  3:  { 1: 4, 2: 2 },
  4:  { 1: 4, 2: 3 },
  5:  { 1: 4, 2: 3, 3: 2 },
  6:  { 1: 4, 2: 3, 3: 3 },
  7:  { 1: 4, 2: 3, 3: 3, 4: 1 },
  8:  { 1: 4, 2: 3, 3: 3, 4: 2 },
  9:  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
};

const WIS_CANTRIPS = [
  { index: 'sacred-flame',     name: 'Holy Word',        source: 'Cleric',              ability: 'WIS' },
  { index: 'thaumaturgy',      name: 'Thaumaturgy',      source: 'Cleric',              ability: 'WIS' },
  { index: 'word-of-radiance', name: 'Word of Radiance', source: 'Cleric',              ability: 'WIS' },
  { index: 'chill-touch',      name: 'Chill Touch',      source: 'Death Domain (Reaper)', ability: 'WIS' },
];

const CHA_CANTRIPS = [
  { index: 'minor-illusion', name: 'Minor Illusion', source: 'Mark of Shadow',       ability: 'CHA' },
  { index: 'poison-spray',   name: 'Poison Spray',   source: 'Innate Spellcasting',  ability: 'CHA' },
];

const CHA_SPELLS = [
  { index: 'invisibility',      name: 'Invisibility',      source: 'Mark of Shadow',      note: '1/Long Rest',  ability: 'CHA' },
  { index: 'animal-friendship', name: 'Animal Friendship', source: 'Innate Spellcasting', note: 'Snakes only',  ability: 'CHA' },
  { index: 'suggestion',        name: 'Suggestion',        source: 'Innate Spellcasting', note: '1/Long Rest',  ability: 'CHA' },
];

// expandedSpell state (per session, not persisted)
let _expandedSpell = null;
let _expandedCantrip = null;

function _renderMarkSlots() {
  const root = document.getElementById('mark-slots-root');
  if (!root) return;

  const clericSlots = window.st.markSlots || {};
  const levels = Object.keys(clericSlots).map(Number).sort((a, b) => a - b);

  if (levels.length === 0) {
    root.innerHTML = '<div class="small muted">No spell slots available.</div>';
    return;
  }

  root.innerHTML = `<div class="slots-list">${levels.map(lvl => {
    const { max, used } = clericSlots[lvl];
    const remaining = max - used;
    const full = remaining === 0;
    return `
      <div class="slot-row${full ? ' slot-full' : ''}" data-level="${lvl}">
        <span class="level">Level ${lvl}</span>
        <div class="slot-controls">
          <button class="btn-slot-use" ${full ? 'disabled' : ''} title="Use slot">⚡</button>
          <span class="count">
            <span class="slot-remaining">${remaining}</span>
            <span class="separator">/</span>
            <span class="slot-max">${max}</span>
          </span>
        </div>
      </div>`;
  }).join('')}</div>`;

  root.querySelector('.slots-list').addEventListener('click', e => {
    const row = e.target.closest('.slot-row');
    if (!row || !e.target.closest('.btn-slot-use')) return;
    const lvl = Number(row.dataset.level);
    const slot = window.st.markSlots[lvl];
    if (slot && slot.used < slot.max) {
      slot.used++;
      window.save();
      _renderMarkSlots();
    }
  });
}

function _renderMarkSpells(maxSlotLevel) {
  const root = document.getElementById('mark-spells-root');
  if (!root) return;

  if (!maxSlotLevel || maxSlotLevel < 1) {
    root.innerHTML = '<div class="small muted">No Cleric levels — Mark of Shadow spells are not available.</div>';
    return;
  }

  const levels = Object.keys(MARK_SPELLS).map(Number).filter(l => l <= maxSlotLevel).sort((a, b) => a - b);

  root.innerHTML = levels.map(lvl =>
    MARK_SPELLS[lvl].map(sp => {
      const isExpanded = _expandedSpell === sp.index;
      return `
        <div class="mark-spell-item${isExpanded ? ' expanded' : ''}" data-index="${sp.index}">
          <div class="mark-spell-header">
            <span class="mark-spell-name">${sp.name}</span>
            <span class="mark-spell-level-badge">L${lvl}</span>
          </div>
          ${isExpanded ? `<div class="mark-spell-details"><div class="small muted">Loading...</div></div>` : ''}
        </div>`;
    }).join('')
  ).join('');

  root.addEventListener('click', async e => {
    const item = e.target.closest('.mark-spell-item');
    if (!item) return;
    const index = item.dataset.index;
    _expandedSpell = _expandedSpell === index ? null : index;
    _renderMarkSpells(maxSlotLevel);

    if (_expandedSpell === index) {
      try {
        const d = await _fetchSpellDetails(index);
        const detailEl = root.querySelector(`.mark-spell-item[data-index="${index}"] .mark-spell-details`);
        if (detailEl) detailEl.innerHTML = _renderSpellDetail(d);
      } catch {
        const detailEl = root.querySelector(`.mark-spell-item[data-index="${index}"] .mark-spell-details`);
        if (detailEl) detailEl.innerHTML = '<div class="small muted">Failed to load spell details.</div>';
      }
    }
  }, { once: true });
}

function _renderSpellDetail(d) {
  const lines = [];
  if (d.casting_time) lines.push(`<div><strong>Casting Time:</strong> ${d.casting_time}</div>`);
  if (d.range)        lines.push(`<div><strong>Range:</strong> ${d.range}</div>`);
  if (d.duration)     lines.push(`<div><strong>Duration:</strong> ${d.duration}</div>`);
  if (Array.isArray(d.components)) {
    const comps = d.components.map(c => (c === 'M' && d.material) ? `M (${d.material})` : c);
    lines.push(`<div><strong>Components:</strong> ${comps.join(', ')}</div>`);
  }
  if (d.concentration) lines.push(`<div><strong>Concentration:</strong> Yes</div>`);
  if (d.ritual)        lines.push(`<div><strong>Ritual:</strong> Yes</div>`);
  if (Array.isArray(d.desc)) lines.push(`<div class="spell-desc">${d.desc.join('<br><br>')}</div>`);
  if (Array.isArray(d.higher_level) && d.higher_level.length)
    lines.push(`<div><strong>At Higher Levels:</strong> ${d.higher_level.join(' ')}</div>`);
  return lines.join('');
}

function initMarkSpells() {
  const clericLevel = window.st.clericLevel || 0;
  if (!window.st.preparedClericSpells) window.st.preparedClericSpells = [];

  if (clericLevel < 1) {
    window.st.markSlots = {};
    _renderMarkSlots();
    _renderMarkSpells(0);
    return;
  }

  const slotTable = CLERIC_SPELL_SLOTS[Math.min(clericLevel, 10)] || {};
  const existing = window.st.markSlots || {};
  const merged = {};
  for (const [lvl, max] of Object.entries(slotTable)) {
    const n = Number(lvl);
    merged[n] = { max, used: Math.min(existing[n]?.used || 0, max) };
  }
  window.st.markSlots = merged;
  window.save();

  const maxSlotLevel = Math.max(0, ...Object.keys(merged).map(Number));
  _renderMarkSlots();
  _renderMarkSpells(maxSlotLevel);
}

// Called on Long Rest — reset used slots and clear cleric prepared list
function restoreMarkSlots() {
  const slots = window.st.markSlots;
  if (slots) {
    for (const lvl of Object.keys(slots)) {
      slots[lvl].used = 0;
    }
  }
  window.st.preparedClericSpells = [];
}

// ── Cleric Spell Preparation Browser ──

// Domain + Mark spells are always prepared — filter from regular prep browser
const _ALWAYS_PREPARED = new Set([
  'false-life', 'ray-of-sickness', 'blindness-deafness', 'ray-of-enfeeblement',
  'animate-dead', 'vampiric-touch', 'blight', 'death-ward', 'antilife-shell', 'cloudkill',
  'disguise-self', 'silent-image', 'darkness', 'pass-without-trace',
  'clairvoyance', 'major-image', 'greater-invisibility', 'hallucinatory-terrain', 'mislead',
]);

const _clericSpellsByLevel = {};
let _clericSpellSet = null;
let _prepExpandedLevel = null;
let _prepExpandedSpell = null;

async function _fetchClericSpellSet() {
  if (_clericSpellSet) return _clericSpellSet;
  const res = await fetch(`${API_BASE}/api/classes/cleric/spells`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  _clericSpellSet = new Set((data.results || []).map(s => s.index));
  return _clericSpellSet;
}

async function _fetchClericSpellsForLevel(slotLevel) {
  if (_clericSpellsByLevel[slotLevel]) return _clericSpellsByLevel[slotLevel];
  const [classSet, levelRes] = await Promise.all([
    _fetchClericSpellSet(),
    fetch(`${API_BASE}/api/spells?level=${slotLevel}`),
  ]);
  if (!levelRes.ok) throw new Error(`API ${levelRes.status}`);
  const levelData = await levelRes.json();
  const filtered = (levelData.results || [])
    .filter(s => classSet.has(s.index) && !_ALWAYS_PREPARED.has(s.index))
    .sort((a, b) => a.name.localeCompare(b.name));
  _clericSpellsByLevel[slotLevel] = filtered;
  return filtered;
}

function renderClericPrepSpells() {
  const root = document.getElementById('cleric-prep-root');
  if (!root) return;

  const clericLevel = window.st.clericLevel || 0;
  if (clericLevel < 1) {
    root.innerHTML = '<div class="small muted">No Cleric levels.</div>';
    return;
  }

  const wisMod = Math.floor(((window.st.wis || 10) - 10) / 2);
  const maxPrepared = Math.max(1, clericLevel + wisMod);
  const prepared = window.st.preparedClericSpells || [];
  const maxSlotLevel = Math.max(0, ...Object.keys(window.st.markSlots || {}).map(Number));

  if (maxSlotLevel < 1) {
    root.innerHTML = '<div class="small muted">No spell slots yet.</div>';
    return;
  }

  root.innerHTML = `
    <div class="prep-counter">Prepared: <strong>${prepared.length}/${maxPrepared}</strong> <span class="small muted">(Cleric ${clericLevel} + WIS ${wisMod >= 0 ? '+' : ''}${wisMod})</span></div>
    ${Array.from({length: maxSlotLevel}, (_, i) => i + 1).map(lvl => {
      const isOpen = _prepExpandedLevel === lvl;
      return `
        <details class="prep-level-acc"${isOpen ? ' open' : ''} data-slotlvl="${lvl}">
          <summary class="prep-level-summary">Level ${lvl} Spells</summary>
          <div class="prep-level-body" data-body-lvl="${lvl}">
            ${isOpen ? '<div class="small muted">Loading...</div>' : ''}
          </div>
        </details>`;
    }).join('')}`;

  if (_prepExpandedLevel && _prepExpandedLevel <= maxSlotLevel) {
    _loadClericLevelBody(_prepExpandedLevel);
  }

  root.querySelectorAll('details.prep-level-acc').forEach(det => {
    det.addEventListener('toggle', () => {
      const lvl = Number(det.dataset.slotlvl);
      if (det.open) {
        _prepExpandedLevel = lvl;
        _prepExpandedSpell = null;
        _loadClericLevelBody(lvl);
      } else if (_prepExpandedLevel === lvl) {
        _prepExpandedLevel = null;
      }
    });
  });
}

async function _loadClericLevelBody(slotLevel) {
  const root = document.getElementById('cleric-prep-root');
  if (!root) return;
  const oldBody = root.querySelector(`[data-body-lvl="${slotLevel}"]`);
  if (!oldBody) return;

  // Replace with fresh node so no old click listeners accumulate
  const body = oldBody.cloneNode(false);
  oldBody.replaceWith(body);
  body.innerHTML = '<div class="small muted">Loading...</div>';

  const prepared = window.st.preparedClericSpells || [];
  const clericLevel = window.st.clericLevel || 0;
  const wisMod = Math.floor(((window.st.wis || 10) - 10) / 2);
  const maxPrepared = Math.max(1, clericLevel + wisMod);
  const atMax = prepared.length >= maxPrepared;

  try {
    const spells = await _fetchClericSpellsForLevel(slotLevel);
    if (!spells.length) {
      body.innerHTML = '<div class="small muted">No Cleric spells at this level.</div>';
      return;
    }

    body.innerHTML = spells.map(sp => {
      const isPrepared = prepared.includes(sp.index);
      return `
        <div class="mark-spell-item${isPrepared ? ' mark-prepared' : ''}" data-pi="${sp.index}">
          <div class="mark-spell-header">
            <span class="mark-spell-name">${sp.name}</span>
            <button class="btn-mark-prep${isPrepared ? ' active' : ''}" data-prep="${sp.index}"${(!isPrepared && atMax) ? ' disabled' : ''} title="${isPrepared ? 'Un-prepare' : 'Prepare'}">P</button>
          </div>
        </div>`;
    }).join('');

    body.addEventListener('click', async e => {
      const prepBtn = e.target.closest('.btn-mark-prep');
      if (prepBtn) {
        e.stopPropagation();
        const idx = prepBtn.dataset.prep;
        const preps = window.st.preparedClericSpells || [];
        const freshMax = Math.max(1, (window.st.clericLevel || 0) + Math.floor(((window.st.wis || 10) - 10) / 2));
        const pos = preps.indexOf(idx);
        if (pos >= 0) preps.splice(pos, 1);
        else if (preps.length < freshMax) preps.push(idx);
        window.st.preparedClericSpells = preps;
        window.save();
        renderClericPrepSpells();
        return;
      }

      const item = e.target.closest('[data-pi]');
      if (!item) return;
      const index = item.dataset.pi;

      // Toggle expand in-place (no re-render needed)
      if (_prepExpandedSpell === index) {
        _prepExpandedSpell = null;
        item.classList.remove('expanded');
        item.querySelector('.mark-spell-details')?.remove();
      } else {
        if (_prepExpandedSpell) {
          const prev = body.querySelector(`[data-pi="${_prepExpandedSpell}"]`);
          if (prev) { prev.classList.remove('expanded'); prev.querySelector('.mark-spell-details')?.remove(); }
        }
        _prepExpandedSpell = index;
        item.classList.add('expanded');
        const detDiv = document.createElement('div');
        detDiv.className = 'mark-spell-details';
        detDiv.innerHTML = '<div class="small muted">Loading...</div>';
        item.appendChild(detDiv);
        _fetchSpellDetails(index)
          .then(d => { detDiv.innerHTML = _renderSpellDetail(d); })
          .catch(() => { detDiv.innerHTML = '<div class="small muted">Failed to load spell details.</div>'; });
      }
    });
  } catch {
    body.innerHTML = '<div class="small muted">Failed to load spells. Check your connection.</div>';
  }
}

window.renderClericPrepSpells = renderClericPrepSpells;

function _spellItemHTML(sp, expandedIndex, dataAttr = 'data-spell="1"') {
  const expanded = expandedIndex === sp.index;
  const abilityClass = (sp.ability || 'WIS').toLowerCase();
  const meta = [sp.source, sp.note].filter(Boolean).join(' · ');
  return `
    <div class="mark-spell-item${expanded ? ' expanded' : ''}" data-index="${sp.index}" ${dataAttr}>
      <div class="mark-spell-header">
        <span class="mark-spell-name">${sp.name}</span>
        <span class="spell-ability-badge ability-${abilityClass}">${sp.ability || 'WIS'}</span>
        ${meta ? `<span class="mark-spell-note">${meta}</span>` : ''}
      </div>
      ${expanded ? `<div class="mark-spell-details"><div class="small muted">Loading...</div></div>` : ''}
    </div>`;
}

function _attachSpellClicks(root, getExpanded, setExpanded, rerender) {
  root.addEventListener('click', async e => {
    const item = e.target.closest('.mark-spell-item');
    if (!item) return;
    const index = item.dataset.index;
    setExpanded(getExpanded() === index ? null : index);
    rerender();

    if (getExpanded() === index) {
      try {
        const d = await _fetchSpellDetails(index);
        const detailEl = root.querySelector(`.mark-spell-item[data-index="${index}"] .mark-spell-details`);
        if (detailEl) detailEl.innerHTML = _renderSpellDetail(d);
      } catch {
        const detailEl = root.querySelector(`.mark-spell-item[data-index="${index}"] .mark-spell-details`);
        if (detailEl) detailEl.innerHTML = '<div class="small muted">Failed to load spell details.</div>';
      }
    }
  }, { once: true });
}

let _expandedWisCantrip = null;
let _expandedChaCantrip = null;
let _expandedCha = null;

function renderWisCantrips() {
  const root = document.getElementById('wis-cantrips-root');
  if (!root) return;
  root.innerHTML = WIS_CANTRIPS.map(c => _spellItemHTML(c, _expandedWisCantrip)).join('');
  _attachSpellClicks(root,
    () => _expandedWisCantrip,
    v => { _expandedWisCantrip = v; },
    renderWisCantrips
  );
}

function renderChaCantrips() {
  const root = document.getElementById('cha-cantrips-root');
  if (!root) return;
  root.innerHTML = CHA_CANTRIPS.map(c => _spellItemHTML(c, _expandedChaCantrip)).join('');
  _attachSpellClicks(root,
    () => _expandedChaCantrip,
    v => { _expandedChaCantrip = v; },
    renderChaCantrips
  );
}

function renderClericCantrips() {
  renderWisCantrips();
  renderChaCantrips();
}

function renderChaSpells() {
  const root = document.getElementById('cha-spells-root');
  if (!root) return;
  root.innerHTML = CHA_SPELLS.map(s => _spellItemHTML(s, _expandedCha)).join('');
  _attachSpellClicks(root,
    () => _expandedCha,
    v => { _expandedCha = v; },
    renderChaSpells
  );
}

let _expandedDomain = null;

function renderDomainSpells(clericLevel) {
  const root = document.getElementById('domain-spells-root');
  if (!root) return;

  const available = DOMAIN_SPELL_ROWS.filter(r => r.minLevel <= clericLevel);

  if (available.length === 0) {
    root.innerHTML = '<div class="small muted">No domain spells at your current Cleric level.</div>';
    return;
  }

  root.innerHTML = available.flatMap(row =>
    row.spells.map(sp => {
      const expanded = _expandedDomain === sp.index;
      return `
        <div class="mark-spell-item${expanded ? ' expanded' : ''}" data-index="${sp.index}" data-domain="1">
          <div class="mark-spell-header">
            <span class="mark-spell-name">${sp.name}</span>
            <span class="mark-spell-level-badge">L${row.minLevel}</span>
          </div>
          ${expanded ? `<div class="mark-spell-details"><div class="small muted">Loading...</div></div>` : ''}
        </div>`;
    })
  ).join('');

  _attachSpellClicks(root,
    () => _expandedDomain,
    v => { _expandedDomain = v; },
    () => renderDomainSpells(clericLevel)
  );
}

function getClericSpellsGained(nextClericLevel) {
  const domainRow = DOMAIN_SPELL_ROWS.find(r => r.minLevel === nextClericLevel);
  const domainNames = domainRow ? domainRow.spells.map(s => s.name) : [];
  const markLevelMap = { 1: 1, 3: 2, 5: 3, 7: 4, 9: 5 };
  const markSlotLevel = markLevelMap[nextClericLevel];
  const markNames = markSlotLevel ? (MARK_SPELLS[markSlotLevel] || []).map(s => s.name) : [];
  return [...domainNames, ...markNames];
}

window.initMarkSpells = initMarkSpells;
window.restoreMarkSlots = restoreMarkSlots;
window.renderClericCantrips = renderClericCantrips;
window.renderWisCantrips = renderWisCantrips;
window.renderChaCantrips = renderChaCantrips;
window.renderChaSpells = renderChaSpells;
window.renderDomainSpells = renderDomainSpells;
window.getClericSpellsGained = getClericSpellsGained;
