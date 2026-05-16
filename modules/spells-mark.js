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
    components: ['V', 'M (holy symbol)'],
    desc: ['You utter a divine word, and burning radiance erupts from you. Each creature of your choice that you can see within range must succeed on a Constitution saving throw or take 1d6 radiant damage.'],
    higher_level: ['The damage increases by 1d6 when you reach 5th level (2d6), 11th level (3d6), and 17th level (4d6).'],
  },
};

async function _fetchSpellDetails(index) {
  if (_spellCache[index]) return _spellCache[index];
  if (_LOCAL_SPELLS[index]) { _spellCache[index] = _LOCAL_SPELLS[index]; return _LOCAL_SPELLS[index]; }
  const res = await fetch(`${API_BASE}/api/spells/${index}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  _spellCache[index] = data;
  return data;
}

async function _fetchClericSlots(clericLevel) {
  const res = await fetch(`${API_BASE}/api/classes/cleric/levels/${clericLevel}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const sc = data.spellcasting || {};
  const slots = {};
  for (let i = 1; i <= 9; i++) {
    const max = sc[`spell_slots_level_${i}`] || 0;
    if (max > 0) slots[i] = max;
  }
  return slots;
}

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

  root.innerHTML = levels.map(lvl => {
    const spells = MARK_SPELLS[lvl];
    return spells.map(sp => {
      const expanded = _expandedSpell === sp.index;
      return `
        <div class="mark-spell-item${expanded ? ' expanded' : ''}" data-index="${sp.index}">
          <div class="mark-spell-header">
            <span class="mark-spell-name">${sp.name}</span>
            <span class="mark-spell-level-badge">L${lvl}</span>
          </div>
          ${expanded ? `<div class="mark-spell-details"><div class="small muted">Loading...</div></div>` : ''}
        </div>`;
    }).join('');
  }).join('');

  root.addEventListener('click', async e => {
    const item = e.target.closest('.mark-spell-item');
    if (!item) return;
    const index = item.dataset.index;
    if (_expandedSpell === index) {
      _expandedSpell = null;
    } else {
      _expandedSpell = index;
    }
    _renderMarkSpells(maxSlotLevel);

    if (_expandedSpell === index) {
      try {
        const d = await _fetchSpellDetails(index);
        const detailEl = root.querySelector(`.mark-spell-item[data-index="${index}"] .mark-spell-details`);
        if (detailEl) detailEl.innerHTML = _renderSpellDetail(d);
      } catch (err) {
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
  if (Array.isArray(d.components)) lines.push(`<div><strong>Components:</strong> ${d.components.join(', ')}</div>`);
  if (d.concentration) lines.push(`<div><strong>Concentration:</strong> Yes</div>`);
  if (d.ritual)        lines.push(`<div><strong>Ritual:</strong> Yes</div>`);
  if (Array.isArray(d.desc)) lines.push(`<div class="spell-desc">${d.desc.join('<br><br>')}</div>`);
  if (Array.isArray(d.higher_level) && d.higher_level.length)
    lines.push(`<div><strong>At Higher Levels:</strong> ${d.higher_level.join(' ')}</div>`);
  return lines.join('');
}

async function initMarkSpells() {
  const clericLevel = window.st.clericLevel || 0;

  if (clericLevel < 1) {
    _renderMarkSlots();
    _renderMarkSpells(0);
    return;
  }

  try {
    const apiSlots = await _fetchClericSlots(clericLevel);
    // Sync max values, preserve used counts
    const existing = window.st.markSlots || {};
    const merged = {};
    for (const [lvl, max] of Object.entries(apiSlots)) {
      const n = Number(lvl);
      merged[n] = {
        max,
        used: Math.min(existing[n]?.used || 0, max),
      };
    }
    window.st.markSlots = merged;
    window.save();
  } catch (err) {
    // API unavailable — use cached state
    if (!window.st.markSlots) window.st.markSlots = {};
  }

  const slots = window.st.markSlots || {};
  const maxSlotLevel = Math.max(0, ...Object.keys(slots).map(Number));
  _renderMarkSlots();
  _renderMarkSpells(maxSlotLevel);
}

// Called on Long Rest to reset used slots
function restoreMarkSlots() {
  const slots = window.st.markSlots;
  if (!slots) return;
  for (const lvl of Object.keys(slots)) {
    slots[lvl].used = 0;
  }
}

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
