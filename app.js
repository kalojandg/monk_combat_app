// ===== Tab Loading (Dynamic HTML Fragments) =====
// Зарежда HTML табове от отделни файлове
async function loadTabs() {
  const tabMap = {
    'stats': 'tabs/stats.html',
    'pcchar': 'tabs/pcchar.html',
    'inventory': 'tabs/inventory.html',
    'shenanigans': 'tabs/shenanigans.html',
    'liners': 'tabs/liners.html',
    'excuses': 'tabs/excuses.html',
    'familiars': 'tabs/familiars.html',
    'skills': 'tabs/skills.html',
    'sessionNotes': 'tabs/sessionNotes.html',
    'quests': 'tabs/quests.html',
    'taunts': 'tabs/taunts.html'
  };

  const loadPromises = Object.entries(tabMap).map(async ([tabId, url]) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Failed to load ${url}: ${response.statusText}`);
        return;
      }
      const html = await response.text();
      if (!html || html.trim() === '') {
        console.error(`Empty content for ${url}`);
        return;
      }
      const tabEl = document.getElementById(`tab-${tabId}`);
      if (!tabEl) {
        console.error(`Tab element not found: tab-${tabId}`);
        return;
      }
      tabEl.innerHTML = html;
    } catch (error) {
      console.error(`Error loading tab ${tabId} from ${url}:`, error);
    }
  });

  await Promise.all(loadPromises);
}

// ===== Helpers =====
const el = id => document.getElementById(id);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const modFrom = (score) => Math.floor((Number(score || 0) - 10) / 2);
async function ensureDirRW(dirHandle) {
  const p = await dirHandle.queryPermission({ mode: 'readwrite' });
  if (p === 'granted') return true;
  const r = await dirHandle.requestPermission({ mode: 'readwrite' });
  return r === 'granted';
}

let _featuresRendered = false;
let _featuresDirty = false;  // ще го ползваме при смяна на ниво

// XP thresholds 1..20 (RAW без 0-праг)
const XP_THRESH = [300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
const NOTES_DB_NAME = "monkNotesDB";
const NOTES_STORE = "handles";
const NOTES_KEY = "notesFileHandle";

// Martial Arts die по ниво
function maDie(level) {
  if (level >= 17) return "d10";
  if (level >= 11) return "d8";
  if (level >= 5) return "d6";
  return "d4";
}
// Proficiency по ниво
function profBonus(level) {
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
}
// Unarmored Movement бонус
function umBonus(level) {
  if (level >= 18) return 30;
  if (level >= 14) return 25;
  if (level >= 10) return 20;
  if (level >= 6) return 15;
  if (level >= 2) return 10;
  return 0;
}
// Monk HP (fixed average RAW) + retroactive CON
function baseHP(level, conMod) {
  if (level <= 0) return 0;
  let hp = 8 + conMod; // 1st level
  if (level >= 2) hp += (level - 1) * (5 + conMod);
  return hp;
}

// ===== State =====
const defaultState = {
  name: "Пийс Ошит",
  notes: "",
  xp: 0,
  level: 1,  // Level is now stored in state, not calculated from XP
  unarmedMagic: 0,  // Magic bonus for unarmed attacks
  meleeWeaponMagic: 0,  // Magic bonus for melee weapon attacks
  rangedMagic: 0,
  str: 10, dex: 10, con: 10, int_: 10, wis: 10, cha: 10,
  saveStrProf: false, saveDexProf: true, saveConProf: false, saveIntProf: false, saveWisProf: true, saveChaProf: false,
  saveAllBonus: 0,
  skillProfs: {},

  languages: [],   // масив от { name }
  tools: [],       // масив от { name }
  personality: "",
  bond: "",
  flaw: "",

  inventory: [],
  goldPlatinum: 0,
  goldGold: 0,
  goldSilver: 0,
  goldCopper: 0,
  hpCurrent: 8,
  hpHomebrew: null,      // добавка към формулната Max HP (може отрицателна)
  kiCurrent: 1,
  dsSuccess: 0, dsFail: 0, status: "alive",
  hdAvail: 1,

  sessionNotes: "",
  aliases: [],
  familiars: [],
  quests: [],

  acMagic: 0,
  baseSpeed: 30,
  tough: false,
  hpAdjust: 0,
  kiSaveDcMagic: 0
};

// --- bundle helpers ---
function stripTransientState(s) {
  const { aliases, familiars, ...rest } = s; // ако все още съществуват – игнорирай
  return rest;
}

// ===== Load/save =====
let st = load();
// Export st to global scope for modules
window.st = st;
function load() {
  try {
    const raw = localStorage.getItem("monkSheet_v3");
    let obj = raw ? { ...defaultState, ...JSON.parse(raw) } : { ...defaultState };

    // --- миграция на стари алиаси от 'aliases_v1' → st.aliases
    try {
      const oldAliases = JSON.parse(localStorage.getItem('aliases_v1') || '[]');
      if (Array.isArray(oldAliases) && oldAliases.length && (!obj.aliases || obj.aliases.length === 0)) {
        obj.aliases = oldAliases;
        localStorage.removeItem('aliases_v1');
      }
    } catch { }

    // --- миграция: ако level не съществува, го инициализираме от XP (за стари данни)
    if (typeof obj.level === 'undefined' || obj.level === null) {
      obj.level = levelFromXP(obj.xp || 0);
    }

    // --- миграция: meleeMagic -> unarmedMagic (за стари данни)
    if (typeof obj.meleeMagic !== 'undefined' && typeof obj.unarmedMagic === 'undefined') {
      obj.unarmedMagic = obj.meleeMagic || 0;
      delete obj.meleeMagic;
    }
    // Инициализираме meleeWeaponMagic ако не съществува
    if (typeof obj.meleeWeaponMagic === 'undefined') {
      obj.meleeWeaponMagic = 0;
    }

    return obj;
  } catch {
    return { ...defaultState };
  }
}

function save() {
  // Sync st from window.st to ensure module changes are captured
  if (window.st) {
    st = window.st;
  }
  localStorage.setItem("monkSheet_v3", JSON.stringify(st));
  renderAll();
  window.renderAliasTable?.();      // ← безопасно, ще се изпълни ако функцията съществува
  window.renderFamTable?.();
  window.renderTauntUI?.();

  cloudSchedule();           // ← остава си
}
// Export save to global scope for modules
window.save = save;


// ===== Derived =====
function levelFromXP(xp) {
  let lvl = 1;
  for (let i = 20; i >= 2; i--) {
    if (xp >= XP_THRESH[i - 2]) { lvl = i; break; }
  }
  return lvl;
}
function derived() {
  // Use st.level instead of calculating from XP (level up happens on Long Rest)
  const level = st.level || 1;
  const mods = {
    str: modFrom(st.str), dex: modFrom(st.dex), con: modFrom(st.con), int_: modFrom(st.int_), wis: modFrom(st.wis), cha: modFrom(st.cha)
  };
  const prof = profBonus(level);
  const ma = maDie(level);
  const kiMax = level;
  const hdMax = level;

  const formulaMaxHP = baseHP(level, mods.con) + (st.tough ? 2 * level : 0) + Number(st.hpAdjust || 0);
  const hbAdj = Number(st.hpHomebrew || 0);
  const maxHP = Math.max(1, Math.floor(formulaMaxHP + hbAdj));

  const ac = 10 + mods.dex + mods.wis + Number(st.acMagic || 0);
  const um = umBonus(level);
  const totalSpeed = Number(st.baseSpeed || 0) + um;

  const savesBase = {
    str: mods.str + (st.saveStrProf ? prof : 0),
    dex: mods.dex + (st.saveDexProf ? prof : 0),
    con: mods.con + (st.saveConProf ? prof : 0),
    int_: mods.int_ + (st.saveIntProf ? prof : 0),
    wis: mods.wis + (st.saveWisProf ? prof : 0),
    cha: mods.cha + (st.saveChaProf ? prof : 0),
  };
  const allBonus = Number(st.saveAllBonus || 0);
  const savesTotal = {
    str: savesBase.str + allBonus,
    dex: savesBase.dex + allBonus,
    con: savesBase.con + allBonus,
    int_: savesBase.int_ + allBonus,
    wis: savesBase.wis + allBonus,
    cha: savesBase.cha + allBonus,
  };

  const meleeAtk = mods.dex + prof + Number(st.unarmedMagic || 0);  // Unarmed attack uses unarmedMagic
  const meleeWeaponAtk = mods.dex + prof + Number(st.meleeWeaponMagic || 0);  // Melee weapon attack
  const rangedAtk = mods.dex + prof + Number(st.rangedMagic || 0);

  // Ki Save DC = 8 + WIS mod + Prof + Magic bonus
  const kiSaveDC = 8 + mods.wis + prof + Number(st.kiSaveDcMagic || 0);

  return { level, mods, prof, ma, kiMax, hdMax, maxHP, ac, um, totalSpeed, savesBase, savesTotal, meleeAtk, meleeWeaponAtk, rangedAtk, kiSaveDC };
}

// ===== Skills =====
const SKILLS = [
  ["Acrobatics", "dex"],
  ["Animal Handling", "wis"],
  ["Arcana", "int_"],
  ["Athletics", "str"],
  ["Deception", "cha"],
  ["History", "int_"],
  ["Insight", "wis"],
  ["Intimidation", "cha"],
  ["Investigation", "int_"],
  ["Medicine", "wis"],
  ["Nature", "int_"],
  ["Perception", "wis"],
  ["Performance", "cha"],
  ["Persuasion", "cha"],
  ["Religion", "int_"],
  ["Sleight of Hand", "dex"],
  ["Stealth", "dex"],
  ["Survival", "wis"]
];
function ensureSkillProfs() {
  if (!st.skillProfs) {
    st.skillProfs = {};
  }

  SKILLS.forEach(([n]) => { if (!(n in st.skillProfs)) st.skillProfs[n] = false; });
}

ensureSkillProfs();

function skillBonusTotal(name, mods, prof) {
  const entry = SKILLS.find(x => x[0] === name);
  if (!entry) return 0;
  const abil = entry[1];
  return (mods[abil] || 0) + (st.skillProfs[name] ? prof : 0);
}
// Main skills table in Stats tab
function renderSkills(mods, prof) {
  const body = el("skillsBody");
  if (!body) return;
  body.innerHTML = "";
  SKILLS.forEach(([name, abil]) => {
    const profChecked = !!st.skillProfs[name];
    const bonus = (mods[abil] || 0) + (profChecked ? prof : 0);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${name}</td>
      <td>${abil.toUpperCase()}</td>
      <td><input type="checkbox" ${profChecked ? "checked" : ""} data-skill="${name}"></td>
      <td class="right">${bonus >= 0 ? "+" : ""}${bonus}</td>`;
    body.appendChild(tr);
  });
  body.querySelectorAll("input[type=checkbox]").forEach(chk => {
    chk.addEventListener("change", (e) => {
      const sk = e.target.getAttribute("data-skill");
      st.skillProfs[sk] = e.target.checked;
      save();
    });
  });
}
// Secondary skills table in Stats tab → Passive Skills sub-tab
function renderSkillsInSubtab(mods, prof) {
  const body = document.querySelector('#subtab-passiveskills #skillsBody');
  if (!body) return;
  body.innerHTML = "";
  SKILLS.forEach(([name, abil]) => {
    const profChecked = !!st.skillProfs[name];
    const bonus = (mods[abil] || 0) + (profChecked ? prof : 0);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${name}</td>
      <td>${abil.toUpperCase()}</td>
      <td><input type="checkbox" ${profChecked ? "checked" : ""} data-skill="${name}"></td>
      <td class="right">${bonus >= 0 ? "+" : ""}${bonus}</td>`;
    body.appendChild(tr);
  });
  body.querySelectorAll("input[type=checkbox]").forEach(chk => {
    chk.addEventListener("change", (e) => {
      const sk = e.target.getAttribute("data-skill");
      st.skillProfs[sk] = e.target.checked;
      save();
    });
  });
}

// ===== Tabs =====
document.addEventListener("click", (e) => {
  const tabBtn = e.target.closest("[data-tab]");
  if (!tabBtn) return;
  const tab = tabBtn.getAttribute("data-tab");

  // toggle active
  document.querySelectorAll("[data-tab]").forEach(b =>
    b.classList.toggle("active", b === tabBtn)
  );

  // hide/show tabs
  document.querySelectorAll(".tab").forEach(p => p.classList.add("hidden"));
  const pane = document.querySelector(`#tab-${tab}`) || document.querySelector(`#${tab}`);
  if (pane) pane.classList.remove("hidden");
});

// ===== Rendering =====
function renderAll() {
  // Update global st reference (in case it was reassigned)
  window.st = st;
  const d = derived();

  // Emoji
  let emoji = "🙂";
  if (st.status === "stable") emoji = "🛌";
  else if (st.status === "dead") emoji = "💀";
  else if (st.hpCurrent <= 0) emoji = "😵";
  el("lifeStatus") && (el("lifeStatus").textContent = emoji);

  // Combat pills
  el("hpCurrentSpan") && (el("hpCurrentSpan").textContent = st.hpCurrent);
  el("hpMaxSpan") && (el("hpMaxSpan").textContent = d.maxHP);
  el("kiCurrentSpan") && (el("kiCurrentSpan").textContent = st.kiCurrent);
  el("kiMaxSpan2") && (el("kiMaxSpan2").textContent = d.kiMax);
  el("acSpan") && (el("acSpan").textContent = d.ac);
  el("profSpan") && (el("profSpan").textContent = `+${d.prof}`);
  el("kiSaveDcSpan") && (el("kiSaveDcSpan").textContent = d.kiSaveDC);

  // Combat – attack pills
  el("meleeAtkSpan") && (el("meleeAtkSpan").textContent = (d.meleeAtk >= 0 ? "+" : "") + d.meleeAtk);
  el("rangedAtkSpan") && (el("rangedAtkSpan").textContent = (d.rangedAtk >= 0 ? "+" : "") + d.rangedAtk);
  // Melee Weapon Atk Bonus (DEX mod + Prof + Melee Weapon Magic)
  el("meleeWeaponMagicAtkSpan") && (el("meleeWeaponMagicAtkSpan").textContent = (d.meleeWeaponAtk >= 0 ? "+" : "") + d.meleeWeaponAtk);

  // Stats – inputs for magic atk bonuses
  el("unarmedMagicInput") && (el("unarmedMagicInput").value = st.unarmedMagic ?? 0);
  el("meleeWeaponMagicInput") && (el("meleeWeaponMagicInput").value = st.meleeWeaponMagic ?? 0);
  el("rangedMagicInput") && (el("rangedMagicInput").value = st.rangedMagic ?? 0);
  el("kiSaveDcMagicInput") && (el("kiSaveDcMagicInput").value = st.kiSaveDcMagic ?? 0);

  // Basics (Stats)
  el("charName") && (el("charName").value = st.name || "");
  el("xpInput") && (el("xpInput").value = st.xp);
  el("levelSpan") && (el("levelSpan").textContent = d.level);
  el("profSpan2") && (el("profSpan2").textContent = `+${d.prof}`);
  el("maDieSpan") && (el("maDieSpan").textContent = d.ma);
  el("maxHpSpan") && (el("maxHpSpan").textContent = d.maxHP);
  const hbEl = el("homebrewHp");
  if (hbEl) hbEl.value = (st.hpHomebrew === null || st.hpHomebrew === "") ? "" : st.hpHomebrew;
  el("hdMaxSpan") && (el("hdMaxSpan").textContent = d.hdMax);
  el("hdAvailSpan") && (el("hdAvailSpan").textContent = st.hdAvail);
  el("kiMaxSpan") && (el("kiMaxSpan").textContent = d.kiMax);
  el("acSpan2") && (el("acSpan2").textContent = d.ac);
  el("kiSaveDcSpan2") && (el("kiSaveDcSpan2").textContent = d.kiSaveDC);
  el("umBonusSpan") && (el("umBonusSpan").textContent = d.um);
  el("passPercSpan") && (el("passPercSpan").textContent = 10 + skillBonusTotal("Perception", d.mods, d.prof));
  el("passInvSpan") && (el("passInvSpan").textContent = 10 + skillBonusTotal("Investigation", d.mods, d.prof));
  el("passInsSpan") && (el("passInsSpan").textContent = 10 + skillBonusTotal("Insight", d.mods, d.prof));
  el("notes") && (el("notes").value = st.notes || "");

  // Mods
  const mods = d.mods;
  el("strModSpan") && (el("strModSpan").textContent = mods.str >= 0 ? `+${mods.str}` : `${mods.str}`);
  el("dexModSpan") && (el("dexModSpan").textContent = mods.dex >= 0 ? `+${mods.dex}` : `${mods.dex}`);
  el("conModSpan") && (el("conModSpan").textContent = mods.con >= 0 ? `+${mods.con}` : `${mods.con}`);
  el("intModSpan") && (el("intModSpan").textContent = mods.int_ >= 0 ? `+${mods.int_}` : `${mods.int_}`);
  el("wisModSpan") && (el("wisModSpan").textContent = mods.wis >= 0 ? `+${mods.wis}` : `${mods.wis}`);
  el("chaModSpan") && (el("chaModSpan").textContent = mods.cha >= 0 ? `+${mods.cha}` : `${mods.cha}`);

  // Inputs reflect state
  el("acMagicInput") && (el("acMagicInput").value = st.acMagic);
  el("saveAllBonusInput") && (el("saveAllBonusInput").value = st.saveAllBonus);
  el("strInput") && (el("strInput").value = st.str);
  el("dexInput") && (el("dexInput").value = st.dex);
  el("conInput") && (el("conInput").value = st.con);
  el("intInput") && (el("intInput").value = st.int_);
  el("wisInput") && (el("wisInput").value = st.wis);
  el("chaInput") && (el("chaInput").value = st.cha);
  el("saveStrProf") && (el("saveStrProf").checked = !!st.saveStrProf);
  el("saveDexProf") && (el("saveDexProf").checked = !!st.saveDexProf);
  el("saveConProf") && (el("saveConProf").checked = !!st.saveConProf);
  el("saveIntProf") && (el("saveIntProf").checked = !!st.saveIntProf);
  el("saveWisProf") && (el("saveWisProf").checked = !!st.saveWisProf);
  el("saveChaProf") && (el("saveChaProf").checked = !!st.saveChaProf);
  el("toughChk") && (el("toughChk").checked = !!st.tough);

  // Saves totals (as spans)
  el("saveStrTotalSpan") && (el("saveStrTotalSpan").textContent = (d.savesTotal.str >= 0 ? "+" : "") + d.savesTotal.str);
  el("saveDexTotalSpan") && (el("saveDexTotalSpan").textContent = (d.savesTotal.dex >= 0 ? "+" : "") + d.savesTotal.dex);
  el("saveConTotalSpan") && (el("saveConTotalSpan").textContent = (d.savesTotal.con >= 0 ? "+" : "") + d.savesTotal.con);
  el("saveIntTotalSpan") && (el("saveIntTotalSpan").textContent = (d.savesTotal.int_ >= 0 ? "+" : "") + d.savesTotal.int_);
  el("saveWisTotalSpan") && (el("saveWisTotalSpan").textContent = (d.savesTotal.wis >= 0 ? "+" : "") + d.savesTotal.wis);
  el("saveChaTotalSpan") && (el("saveChaTotalSpan").textContent = (d.savesTotal.cha >= 0 ? "+" : "") + d.savesTotal.cha);

  // PC Characteristics textareas
  el("pcPersonality") && (el("pcPersonality").value = st.personality || "");
  el("pcBond") && (el("pcBond").value = st.bond || "");
  el("pcFlaw") && (el("pcFlaw").value = st.flaw || "");

  // tables
  window.renderLangTable?.();
  window.renderToolTable?.();

  renderSkills(d.mods, d.prof);
  renderDeathSaves();
  window.renderInventoryTable?.();
  window.renderGold?.();
  // renderFeaturesAccordion(d.level);
}

// ===== Events: inputs =====
el("charName") && el("charName").addEventListener("input", () => { st.name = el("charName").value; save(); });
el("notes") && el("notes").addEventListener("input", () => { st.notes = el("notes").value; save(); });

el("xpInput") && el("xpInput").addEventListener("input", () => {
  st.xp = Math.max(0, Math.floor(Number(el("xpInput").value || 0)));
  const d = derived();
  st.hdAvail = clamp(st.hdAvail, 0, d.hdMax);
  st.kiCurrent = clamp(st.kiCurrent, 0, d.kiMax);

  _featuresDirty = true;  // 👈 маркираме за повторен рендер следващия път

  save();
});

["str", "dex", "con", "int_", "wis", "cha"].forEach(key => {
  const mapId = { str: "strInput", dex: "dexInput", con: "conInput", int_: "intInput", wis: "wisInput", cha: "chaInput" };
  if (el(mapId[key])) {
    el(mapId[key]).addEventListener("input", () => {
      let v = Math.floor(Number(el(mapId[key]).value || 0));
      st[key] = v; save();
    });
  }
});

el("toughChk") && el("toughChk").addEventListener("change", () => {
  const before = derived().maxHP;
  st.tough = el("toughChk").checked;
  const after = derived().maxHP;
  const delta = after - before;
  st.hpCurrent = clamp(st.hpCurrent + delta, 0, after);
  save();
});

el("acMagicInput") && el("acMagicInput").addEventListener("input", () => { st.acMagic = Math.floor(Number(el("acMagicInput").value || 0)); save(); });
el("kiSaveDcMagicInput") && el("kiSaveDcMagicInput").addEventListener("input", () => { st.kiSaveDcMagic = Math.floor(Number(el("kiSaveDcMagicInput").value || 0)); save(); });

el("saveAllBonusInput") && el("saveAllBonusInput").addEventListener("input", () => {
  let v = Math.floor(Number(el("saveAllBonusInput").value || 0));
  v = Math.max(-5, Math.min(10, v)); st.saveAllBonus = v; save();
});

["Str", "Dex", "Con", "Int", "Wis", "Cha"].forEach(S => {
  const id = "save" + S + "Prof";
  if (el(id)) el(id).addEventListener("change", () => { st[id] = el(id).checked; save(); });
});

// Homebrew HP
const hbInput = el("homebrewHp");
if (hbInput) {
  hbInput.addEventListener("input", () => {
    const raw = hbInput.value.trim();
    let v = (raw === "" ? 0 : Math.floor(Number(raw)));
    if (Number.isNaN(v)) v = 0;
    st.hpHomebrew = v;
    const d2 = derived();
    st.hpCurrent = clamp(st.hpCurrent, 0, d2.maxHP);
    save();
  });
}

// ===== Combat actions =====
function setHP(v) {
  const d = derived();
  if (st.status === "dead") return;  // мъртъв не се лекува с обикновено heal
  st.hpCurrent = clamp(v, 0, d.maxHP);
  if (st.hpCurrent > 0) { st.status = "alive"; st.dsSuccess = 0; st.dsFail = 0; }
  else if (st.hpCurrent === 0 && st.status !== "dead") { st.status = (st.dsSuccess >= 3) ? "stable" : "unconscious"; }
  save();
}
function setKi(v) {
  const d = derived();
  st.kiCurrent = clamp(v, 0, d.kiMax);
  save();
}

el("btnDamage") && el("btnDamage").addEventListener("click", () => {
  const dVal = Number(el("hpDelta").value || 0); if (dVal <= 0) return;
  if (st.hpCurrent === 0) {
    st.dsFail = clamp(st.dsFail + 1, 0, 3);
    if (st.dsFail >= 3) st.status = "dead";
    save();
  } else {
    if (st.status === "dead") return;  // мъртъв не се лекува с обикновено heal
    setHP(st.hpCurrent - dVal);
    if (st.hpCurrent === 0) st.status = "unconscious";
  }
});
el("btnHeal") && el("btnHeal").addEventListener("click", () => {
  const h = Number(el("hpDelta").value || 0); if (h <= 0) return;
  if (st.status === "dead") return;  // мъртъв не се лекува с обикновено heal
  setHP(st.hpCurrent + h);
});
el("btnHitAtZero") && el("btnHitAtZero").addEventListener("click", () => {
  if (st.hpCurrent === 0 && st.status !== "dead") {
    st.dsFail = clamp(st.dsFail + 1, 0, 3);
    if (st.dsFail >= 3) st.status = "dead";
    save();
  }
});
const btnRes = el("btnResurrect");
if (btnRes) {
  btnRes.addEventListener("click", () => {
    if (st.status !== "dead") return;
    // „възкресяваме“ – 1 HP, нулираме сейфовете
    st.hpCurrent = 1;
    st.dsSuccess = 0; st.dsFail = 0;
    st.status = "alive";
    save();
  });
}
el("btnSpendKi") && el("btnSpendKi").addEventListener("click", () => {
  const k = Number(el("kiDelta").value || 0); if (k <= 0) return; setKi(st.kiCurrent - k);
});
el("btnGainKi") && el("btnGainKi").addEventListener("click", () => {
  const k = Number(el("kiDelta").value || 0); if (k <= 0) return; setKi(st.kiCurrent + k);
});

// Death saves
el("btnDsPlus") && el("btnDsPlus").addEventListener("click", () => {
  if (st.status === "dead") return;
  st.dsSuccess = clamp(st.dsSuccess + 1, 0, 3);
  if (st.dsSuccess >= 3) st.status = "stable";
  save();
});
el("btnDsMinus") && el("btnDsMinus").addEventListener("click", () => {
  if (st.status === "dead") return;
  st.dsFail = clamp(st.dsFail + 1, 0, 3);
  if (st.dsFail >= 3) st.status = "dead";
  save();
});
el("btnCrit") && el("btnCrit").addEventListener("click", () => {
  setHP(Math.max(1, st.hpCurrent));
  st.dsSuccess = 0; st.dsFail = 0; st.status = "alive"; save();
});
el("btnCritFail") && el("btnCritFail").addEventListener("click", () => {
  if (st.status === "dead") return;
  st.dsFail = clamp(st.dsFail + 2, 0, 3);
  if (st.dsFail >= 3) st.status = "dead";
  save();
});
el("btnStabilize") && el("btnStabilize").addEventListener("click", () => {
  if (st.status !== "dead" && st.hpCurrent === 0) { st.status = "stable"; st.dsSuccess = 3; save(); }
});
el("btnHealFromZero") && el("btnHealFromZero").addEventListener("click", () => {
  const h = Number(el("hpDelta").value || 1); if (h <= 0) return;
  setHP(st.hpCurrent + h); st.dsSuccess = 0; st.dsFail = 0; st.status = "alive"; save();
});

// Short Rest
el("btnShortRest") && el("btnShortRest").addEventListener("click", () => {
  const d = derived();
  st.kiCurrent = d.kiMax;
  if (st.hdAvail > 0) {
    const maxDice = st.hdAvail;
    const ans = prompt(`Колко Hit Dice ще използваш? (0..${maxDice})`, `0`);
    if (ans !== null) {
      let use = Math.max(0, Math.min(maxDice, Math.floor(Number(ans) || 0)));
      if (use > 0) {
        const rolled = prompt(`Колко HP върнаха заровете (сума на d8)?`, "0");
        if (rolled !== null) {
          const heal = Math.max(0, Math.floor(Number(rolled) || 0));
          st.hdAvail -= use;
          setHP(st.hpCurrent + heal);
        }
      }
    }
  }
  save();
});

// Long Rest
el("btnLongRest") && el("btnLongRest").addEventListener("click", () => {
  // Check if level should increase based on XP
  const newLevel = levelFromXP(st.xp);
  if (newLevel > st.level) {
    st.level = newLevel;
    // When level increases, add the difference to available hit dice
    const oldHdMax = st.level - 1; // previous level's max HD
    const newHdMax = st.level;     // new level's max HD
    st.hdAvail = Math.min(newHdMax, st.hdAvail + (newHdMax - oldHdMax));
  }
  
  const d = derived();
  const recover = Math.ceil(d.hdMax / 2);
  st.hdAvail = Math.min(d.hdMax, st.hdAvail + recover);
  st.kiCurrent = d.kiMax;
  st.hpCurrent = d.maxHP;
  st.dsSuccess = 0; st.dsFail = 0; st.status = "alive";
  save();
});

// ---- Attack Bonuses ----
el("unarmedMagicInput") && el("unarmedMagicInput").addEventListener("input", () => {
  st.unarmedMagic = Math.floor(Number(el("unarmedMagicInput").value || 0));
  save(); // ще преизчисли и ще обнови спановете
});
el("meleeWeaponMagicInput") && el("meleeWeaponMagicInput").addEventListener("input", () => {
  st.meleeWeaponMagic = Math.floor(Number(el("meleeWeaponMagicInput").value || 0));
  save();
});
el("rangedMagicInput") && el("rangedMagicInput").addEventListener("input", () => {
  st.rangedMagic = Math.floor(Number(el("rangedMagicInput").value || 0));
  save();
});

// ---- Bundle sheet + aliases (backward-compatible) ----
function sanitizeStateForExport(src) {
  // дълбоко копие на st, без временни/външни ключове
  const s = JSON.parse(JSON.stringify(src || {}));
  delete s.aliases;     // ако по някаква причина е попаднал вътре
  // ...ако имаш други временни ключове – махни ги тук
  return s;
}

function getBundle() {
  return {
    schema: "monkSheetBundle/v1",
    state: sanitizeStateForExport(st), // inventory си остава вътре – ОК е
    aliases: Array.isArray(st.aliases) ? st.aliases : []  // само тук, извън state
  };
}

function readBundleOrState(x) {
  const obj = typeof x === "string" ? JSON.parse(x) : x;
  if (obj && typeof obj === "object" && obj.version === 2 && obj.state) {
    // For v2, return state but also preserve root-level aliases/familiars/sessionNotes if they exist
    const state = { ...obj.state };
    // If root-level arrays exist, prefer them over state-level (for backward compatibility)
    if (Array.isArray(obj.aliases)) state.aliases = obj.aliases;
    if (Array.isArray(obj.familiars)) state.familiars = obj.familiars;
    if (obj.sessionNotes !== undefined) state.sessionNotes = obj.sessionNotes;
    return state;
  }
  return obj || {};  // legacy raw state
}

function applyBundle(data) {
  const incoming = readBundleOrState(data);

  // За legacy файлове, където aliases/familiars бяха top-level:
  if (Array.isArray(data?.aliases) && !Array.isArray(incoming.aliases)) incoming.aliases = data.aliases;
  if (Array.isArray(data?.familiars) && !Array.isArray(incoming.familiars)) incoming.familiars = data.familiars;

  // За v2 bundle, ако aliases/familiars са в root на bundle, а не в state:
  if (data && typeof data === 'object' && data.version === 2) {
    if (Array.isArray(data.aliases) && !Array.isArray(incoming.aliases)) incoming.aliases = data.aliases;
    if (Array.isArray(data.familiars) && !Array.isArray(incoming.familiars)) incoming.familiars = data.familiars;
    if (data.sessionNotes !== undefined && incoming.sessionNotes === undefined) incoming.sessionNotes = data.sessionNotes;
  }

  st = { ...defaultState, ...incoming };
  
  // Ensure arrays exist
  if (!Array.isArray(st.aliases)) st.aliases = [];
  if (!Array.isArray(st.familiars)) st.familiars = [];
  if (!Array.isArray(st.languages)) st.languages = [];
  if (!Array.isArray(st.tools)) st.tools = [];
  if (!Array.isArray(st.inventory)) st.inventory = [];
  if (!Array.isArray(st.quests)) st.quests = [];
  
  // Migrate: if level doesn't exist, initialize from XP (for old imports)
  if (typeof st.level === 'undefined' || st.level === null) {
    st.level = levelFromXP(st.xp || 0);
  }
  
  // Migrate: initialize gold fields if missing (for old imports)
  if (typeof st.goldPlatinum === 'undefined' || st.goldPlatinum === null) st.goldPlatinum = 0;
  if (typeof st.goldGold === 'undefined' || st.goldGold === null) st.goldGold = 0;
  if (typeof st.goldSilver === 'undefined' || st.goldSilver === null) st.goldSilver = 0;
  if (typeof st.goldCopper === 'undefined' || st.goldCopper === null) st.goldCopper = 0;

  // Sync window.st before saving to ensure the new state is saved
  window.st = st;

  save();
  renderAll();
  
  // Update module-specific tables if they exist
  if (typeof window.renderLangTable === 'function') window.renderLangTable();
  if (typeof window.renderToolTable === 'function') window.renderToolTable();
  if (typeof window.renderInventoryTable === 'function') window.renderInventoryTable();
  if (typeof window.renderAliasTable === 'function') window.renderAliasTable();
  if (typeof window.renderFamTable === 'function') window.renderFamTable();
  if (typeof window.renderQuests === 'function') window.renderQuests();
}

// Inventory functions are in modules/inventory.js

// PC Characteristics functions moved to modules/pcchar.js

// Export / Import / Reset
// Export (bundle)
el("btnExport")?.addEventListener("click", () => {
  const bundle = buildBundle();
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });

  // timestamp: YYYYMMDD_HHMMSS
  const stamp = new Date().toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "")
    .replace("T", "_");

  // име на героя (пази Unicode, чисти само забранени за файлове символи)
  const rawName = (st.name ?? "").trim() || "hero";
  const safeName = rawName
    .replace(/[\\\/:*?"<>|]+/g, "_")  // забранени в имена на файлове
    .replace(/\s+/g, "_");           // интервали -> "_"

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${safeName}_${stamp}_bundle.json`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(a.href);
  a.remove();
});



// Import (bundle-aware)
async function importBundleFromFile(file) {
  const txt = await file.text();
  let data;
  try { data = JSON.parse(txt); }
  catch { alert('Грешен JSON.'); return; }

  // започваме от чисто
  let next = { ...defaultState };

  if (data && typeof data === 'object') {
    if (data.state) {
      // v2
      Object.assign(next, data.state);
      // коренови масиви (истинският източник)
      if (Array.isArray(data.aliases)) next.aliases = data.aliases.slice();
      if (Array.isArray(data.familiars)) next.familiars = data.familiars.slice();
      // ако все пак има state.familiars ⇒ слей и де-дуп
      if (data.state.familiars && Array.isArray(data.state.familiars)) {
        const merged = [...(next.familiars || []), ...data.state.familiars];
        const seen = new Set();
        next.familiars = merged.filter(it => {
          const key = (it.name || '') + '|' + (it.cat || it.type || '');
          if (seen.has(key)) return false; seen.add(key); return true;
        });
      }
    } else {
      // v1 fallback – всичко е в root
      Object.assign(next, data);
      if (Array.isArray(data.aliases)) next.aliases = data.aliases.slice();
      if (Array.isArray(data.familiars)) next.familiars = data.familiars.slice();
    }
  }

  // финално записване
  st = next;
  save();         // твоята функция, която localStorage-ва и render-ва
  renderAll();

  // ако поддържаш и отделни „логове“, обнови ги от state
  if (typeof saveAliases === 'function' && Array.isArray(st.aliases)) saveAliases(st.aliases);
  if (typeof saveFamiliars === 'function' && Array.isArray(st.familiars)) saveFamiliars(st.familiars);

  alert('Импортът мина успешно.');
}

el("btnImport")?.addEventListener("click", () => {
  el("importFile")?.click();
});

el("importFile")?.addEventListener("change", (e) => {
  const file = e.target.files?.[0]; if (!file) return;
  const rd = new FileReader();
  rd.onload = () => applyBundle(rd.result);
  rd.readAsText(file);
  e.target.value = "";
});

el("btnReset") && el("btnReset").addEventListener("click", () => {
  if (!confirm("Да нулирам всичко?")) return;
  st = { ...defaultState };
  const d = derived();
  st.hpCurrent = d.maxHP;
  st.kiCurrent = d.kiMax;
  st.hdAvail = d.hdMax;
  st.status = "alive"; st.dsSuccess = 0; st.dsFail = 0;
  save();
});

const NOTES_DB_KEY = "notesFileHandle";
let notesHandle = null;

// hook при показване на таба Notes
function attachNotesTab() {
  const notesEl = document.getElementById("sessionNotes");
  if (!notesEl) return;

  // ако няма handle, питай веднага
  if (!notesHandle) {
    notesPickDir().catch(() => {
      console.warn("Notes directory not selected.");
    });
  }

  // auto-save debounce
  notesEl.addEventListener("input", debounce(() => {
    saveNotes();
  }, 1200));
}

async function notesInitNewFile() {
  if (!notesHandle) return;
  try {
    const d = new Date();
    const pad = n => String(n).padStart(2, "0");
    let base = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_SessionNotes.json`;
    let name = base;
    let i = 2;
    const dir = await notesHandle.getFile();
    // За съжаление File System Access API не позволява лесно да провериш имена в директорията.
    // По-просто: винаги overwrite-ваш нов файл със stamp (или timestamp в ms).
    const file = await notesHandle.createWritable();
    const obj = { schema: "sessionNotes/v1", created: d.toISOString(), title: "Session Notes", content: "" };
    await file.write(new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" }));
    await file.close();
  } catch (e) { console.error("notesInitNewFile", e); }
}

async function notesWriteNow() {
  if (!notesHandle) return;
  try {
    const perm = await notesHandle.queryPermission({ mode: "readwrite" });
    if (perm !== "granted") {
      const req = await notesHandle.requestPermission({ mode: "readwrite" });
      if (req !== "granted") return;
    }
    const writable = await notesHandle.createWritable();
    const obj = { schema: "sessionNotes/v1", created: new Date().toISOString(), title: "Session Notes", content: st.sessionNotes };
    await writable.write(new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" }));
    await writable.close();
  } catch (e) { console.error("notesWriteNow", e); }
}
const notesSchedule = debounce(() => notesWriteNow(), 1200);

async function notesPickDir() {
  try {
    const dir = await window.showDirectoryPicker({ mode: 'readwrite' });
    notesDirHandle = dir;
    notesFileHandle = null;
    __notesFileCreatedThisRun = false;
    await idbSet("notesDirHandle_v2", dir);
    // по желание: чисти legacy ключове
    try { await idbDel("notesDirHandle"); } catch { }
    try { await idbDel("notesFileHandle"); } catch { }
    updateNotesStatus();
    await notesEnsureNewFile();
  } catch { }
}

// ---- Session Notes wiring ----
let __notesBound = false;

async function onNotesTabShown() {
  if (__notesBound) return;          // не ребиндваме
  __notesBound = true;

  const ta = document.getElementById('notesInput');
  if (!ta) return;

  // първи път: ако няма handle → попитай
  if (!notesHandle) {
    try { await notesPickDir(); } catch (_) { }
  }

  // зареди runtime стойност (ако пазиш в st.sessionNotes)
  ta.value = st.sessionNotes || '';

  // авто-сейв с debounce към JSON файла
  const debSave = debounce(async () => {
    st.sessionNotes = ta.value;
    await notesWriteNow();
  }, 1200);

  ta.addEventListener('input', debSave);
}

// ===== Cloud Sync (File System Access API) =====
const DB_NAME = "monkSheetCloudDB";
const DB_STORE = "handles";
const DB_KEY = "cloudFileHandle";
let cloudHandle = null;
let cloudWriteTimer = null;

function debounce(fn, ms = 800) {
  let t = null;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbSet(key, val) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(val, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
async function idbGet(key) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const req = tx.objectStore(DB_STORE).get(key);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
async function idbDel(key) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

async function notesIdbGet() {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction(NOTES_STORE, "readonly");
    const req = tx.objectStore(NOTES_STORE).get(NOTES_KEY);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

function cloudUiRefresh() {
  const dot = el("cloudDot");
  if (!dot) return;
  if (cloudHandle) {
    dot.classList.add("ok");      // напр. зелена точка в CSS
    dot.title = "Cloud linked";
  } else {
    dot.classList.remove("ok");
    dot.title = "Not linked";
  }
}

async function cloudWriteNow() {
  if (!cloudHandle) return;
  try {
    const perm = await cloudHandle.queryPermission({ mode: "readwrite" });
    if (perm !== "granted") {
      if (await cloudHandle.requestPermission({ mode: "readwrite" }) !== "granted") return;
    }
    const writable = await cloudHandle.createWritable();
    await writable.write(new Blob([JSON.stringify(buildBundle(), null, 2)], { type: "application/json" }));
    await writable.close();
  } catch { }
}


// ---- Bundle v2 (единственият формат) ----
function buildBundle() {
  // Ensure all arrays exist before bundling
  const stateCopy = { ...st };
  if (!Array.isArray(stateCopy.aliases)) stateCopy.aliases = [];
  if (!Array.isArray(stateCopy.familiars)) stateCopy.familiars = [];
  if (!Array.isArray(stateCopy.languages)) stateCopy.languages = [];
  if (!Array.isArray(stateCopy.tools)) stateCopy.tools = [];
  if (!Array.isArray(stateCopy.inventory)) stateCopy.inventory = [];
  if (!Array.isArray(stateCopy.quests)) stateCopy.quests = [];
  
  // Ensure gold fields exist (should already be in st, but ensure for safety)
  if (typeof stateCopy.goldPlatinum === 'undefined' || stateCopy.goldPlatinum === null) stateCopy.goldPlatinum = 0;
  if (typeof stateCopy.goldGold === 'undefined' || stateCopy.goldGold === null) stateCopy.goldGold = 0;
  if (typeof stateCopy.goldSilver === 'undefined' || stateCopy.goldSilver === null) stateCopy.goldSilver = 0;
  if (typeof stateCopy.goldCopper === 'undefined' || stateCopy.goldCopper === null) stateCopy.goldCopper = 0;
  
  return {
    version: 2,
    state: stateCopy,   // всичко вътре, включително aliases, familiars, languages, tools, inventory, gold
    sessionNotes: st.sessionNotes || ""  // sessionNotes се пази отделно
  };
}



const cloudSchedule = debounce(() => { cloudWriteNow(); }, 1000);

async function cloudPick() {
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: "monk_sheet.json",
      types: [{ description: "JSON", accept: { "application/json": [".json"] } }]
    });
    cloudHandle = handle;
    await idbSet(DB_KEY, handle);
    cloudUiRefresh();
    await cloudWriteNow();  // начално записване
  } catch (e) { /* cancel */ }
}

async function cloudPull() {
  if (!cloudHandle) return;
  try {
    const perm = await cloudHandle.queryPermission({ mode: "read" });
    if (perm !== "granted") {
      const req = await cloudHandle.requestPermission({ mode: "read" });
      if (req !== "granted") return;
    }
    const file = await cloudHandle.getFile();
    const text = await file.text();
    const data = JSON.parse(text);

    let next;
    if (data && data.state) next = { ...defaultState, ...data.state };
    else next = { ...defaultState, ...data };

    // aliases и familiars вече са в st, няма нужда от отделни функции

    st = next;
    save();
  } catch (e) { alert("Cloud pull error."); }
}

async function cloudRestore() {
  try {
    const h = await idbGet(DB_KEY);
    if (!h) { cloudHandle = null; cloudUiRefresh(); return; }
    // тест правата, ако не – ще поиска при първо действие
    const perm = await h.queryPermission({ mode: "readwrite" });
    cloudHandle = h;
    cloudUiRefresh();
  } catch (e) {
    cloudHandle = null;
    cloudUiRefresh();
  }
}

// --- Shenanigans (lazy load JSON) ---
let __sh_names = null;

async function loadShenanigans() {
  if (__sh_names) return __sh_names;
  try {
    const res = await fetch('shenanigans.json', { cache: 'no-store' });
    const data = await res.json();
    // Поддържа три формата: плосък масив или обект с ключ
    if (Array.isArray(data)) __sh_names = data;
    else if (Array.isArray(data.names)) __sh_names = data.names;
    else if (Array.isArray(data.fakeNames)) __sh_names = data.fakeNames;
    else __sh_names = [];
  } catch {
    __sh_names = [];
  }
  return __sh_names;
}

// --- One-Liners (lazy load JSON) ---
let __ol_cache = null;

// смени пътя ако файлът ти е в поддиректория
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

// --- Familiar Names (lazy load JSON) ---
let __fam_names = null;
const FAM_URL = 'familiars.json';

async function loadFamiliars() {
  if (__fam_names) return __fam_names;
  const res = await fetch(FAM_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('Cannot load familiars.json');
  __fam_names = await res.json(); // очакваме { feline:[], canine:[], ... }
  return __fam_names;
}

function famPickRandom(arr) {
  return arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : '';
}

// --- Familiar records (localStorage) ---
const FAM_LS_KEY = 'familiars_v1';

function loadFamRecords() {
  try { return JSON.parse(localStorage.getItem(FAM_LS_KEY)) || []; }
  catch { return []; }
}
function saveFamRecords(arr) {
  try { localStorage.setItem(FAM_LS_KEY, JSON.stringify(arr)); } catch { }
}

// текущ избор (за Save)
let _lastFamName = null;
let _lastFamCat = null;

function famSetSaveEnabled(on) {
  const b = document.getElementById('btnFamSave');
  if (b) b.disabled = !on;
}

function renderFamTable() {
  const root = document.getElementById('famLog');
  if (!root) return;
  const list = loadFamRecords();
  if (!list.length) {
    root.innerHTML = '<small>Няма записани имена още.</small>';
    return;
  }
  const rows = list.map((rec, i) => {
    const d = new Date(rec.ts || Date.now());
    const when = d.toLocaleString();
    return `<tr>
      <td>${escapeHtml(rec.name || '')}</td>
      <td>${escapeHtml(rec.cat || '')}</td>
      <td>${escapeHtml(rec.note || '')}</td>
      <td style="white-space:nowrap">${when}</td>
      <td style="text-align:center"><button class="alias-del" data-idx="${i}">🗑️</button></td>
    </tr>`;
  }).join('');
  root.innerHTML = `<table class="alias-table">
    <thead>
      <tr><th>Име</th><th>Тип</th><th>Бележка</th><th>Кога</th><th></th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;

  root.querySelectorAll('.alias-del').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx, 10);
      const arr = loadFamRecords();
      arr.splice(idx, 1);
      saveFamRecords(arr);
      renderFamTable();
    });
  });
}

function openFamModal() {
  const m = document.getElementById('famModal');
  const t = document.getElementById('famNoteInput');
  if (!m || !t) return;
  t.value = '';
  m.classList.remove('hidden');
  t.focus();
}
function closeFamModal() {
  const m = document.getElementById('famModal');
  if (m) m.classList.add('hidden');
}

function attachFamiliars() {
  // групови бутони
  document.querySelectorAll('.fam-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cat = btn.getAttribute('data-famcat');
      try {
        const data = await loadFamiliars();
        const list = Array.isArray(data[cat]) ? data[cat] : [];
        const name = (famPickRandom(list) || '').trim();
        const out = document.getElementById('famNameOutput');
        if (out) out.value = name || '(no names found)';
        _lastFamName = name || null;
        _lastFamCat = cat || null;
        famSetSaveEnabled(!!_lastFamName);
      } catch (e) {
        console.error(e);
      }
    });
  });

  // Save → модал
  const saveBtn = document.getElementById('btnFamSave');
  if (saveBtn) saveBtn.addEventListener('click', () => {
    if (!_lastFamName) return;
    openFamModal();
  });

  // модал бутони
  const cancelBtn = document.getElementById('famCancel');
  const okBtn = document.getElementById('famConfirm');
  const noteEl = document.getElementById('famNoteInput');
  cancelBtn && cancelBtn.addEventListener('click', closeFamModal);
  okBtn && okBtn.addEventListener('click', () => {
    const note = (noteEl && noteEl.value || '').trim();
    const rec = { name: _lastFamName, cat: _lastFamCat, note, ts: Date.now() };
    const arr = loadFamRecords();
    arr.unshift(rec);
    saveFamRecords(arr);
    renderFamTable();
    closeFamModal();
    famSetSaveEnabled(false);
  });

  // init
  renderFamTable();
  famSetSaveEnabled(false);
}

function attachShenanigans() {
  const btn = document.getElementById('btnGetName');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const list = await loadShenanigans();
    const name = pickRandom(list).trim();
    const out = document.getElementById('fakeNameOutput');
    if (out) {
      out.value = name || '(no names found)';
      // >>> Тук добавяме тези два реда:
      _lastRandomName = (out.value || '').trim();
      setSaveEnabled(!!_lastRandomName);
    }
  });
}

// ---------- Shenanigans aliases log ----------
const ALIAS_LS_KEY = 'aliases_v1';  // localStorage

let _lastRandomName = null;

// helpers
// ---------- Shenanigans aliases log ----------
// ПРЕПИШИ тези две функции така:
function loadAliases() {
  if (!Array.isArray(st.aliases)) st.aliases = [];
  return st.aliases;
}
function saveAliases(arr) {
  st.aliases = Array.isArray(arr) ? arr : [];
  save();                // ← пазим през твоята save(), за да тръгне cloud/рендър
}


function renderAliasTable() {
  const list = loadAliases();
  const root = document.getElementById('aliasLog');
  if (!root) return;
  if (!list.length) {
    root.innerHTML = '<small>Няма запазени представяния още.</small>';
    return;
  }
  const rows = list.map((rec, i) => {
    const d = new Date(rec.ts || Date.now());
    const when = d.toLocaleString();
    return `<tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(rec.name || '')}</td>
      <td>${escapeHtml(rec.to || '')}</td>
      <td style="white-space:nowrap">${when}</td>
      <td style="text-align:center">
        <button class="alias-del" data-idx="${i}">🗑️</button>
      </td>
    </tr>`;
  }).join('');
  root.innerHTML = `<table class="alias-table">
    <thead>
      <tr>
        <th>#</th><th>Име</th><th>На кого</th><th>Кога</th><th></th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;

  // вързваме event за триене
  root.querySelectorAll(".alias-del").forEach(btn => {
    btn.addEventListener("click", e => {
      const idx = parseInt(e.currentTarget.dataset.idx, 10);
      const list = loadAliases();
      list.splice(idx, 1);
      saveAliases(list);
      renderAliasTable();
    });
  });
}


function deleteAliasAt(index) {
  if (!Array.isArray(st.aliases)) st.aliases = [];
  st.aliases.splice(index, 1);
  save();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// hook Save button enable/disable
function setSaveEnabled(on) {
  const b = document.getElementById('btnSaveAlias');
  if (b) b.disabled = !on;
}

// modal controls
function openAliasModal() {
  const m = document.getElementById('aliasModal');
  document.getElementById('aliasToInput').value = '';
  m.classList.remove('hidden');
  setTimeout(() => document.getElementById('aliasToInput').focus(), 0);
}

function closeAliasModal() {
  const m = document.getElementById('aliasModal');
  if (m) m.classList.add('hidden');
}

document.getElementById('aliasModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'aliasModal') {
    closeAliasModal();

    document.getElementById('aliasToInput').value = '';
    document.getElementById('fakeNameOutput').value = '';
    document.getElementById('btnSaveAlias').disabled = true;
  }
});

// PC Modal functions moved to modules/pcchar.js

// attach
function attachAliasLog() {
  const getBtn = document.getElementById('btnGetName');
  const saveBtn = document.getElementById('btnSaveAlias');
  const out = document.getElementById('fakeNameOutput');

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      if (!_lastRandomName) return;
      openAliasModal();
    });
  }

  // modal buttons
  const cancelBtn = document.getElementById('aliasCancel');
  const okBtn = document.getElementById('aliasConfirm');
  const textArea = document.getElementById('aliasToInput');

  cancelBtn && cancelBtn.addEventListener('click', closeAliasModal);
  okBtn && okBtn.addEventListener('click', () => {
    const toWhom = (textArea && textArea.value || '').trim();
    const rec = { name: _lastRandomName, to: toWhom, ts: Date.now() };
    const arr = loadAliases();
    arr.unshift(rec);      // новите най-отгоре
    saveAliases(arr);
    renderAliasTable();
    setSaveEnabled(false);
    closeAliasModal();


    document.getElementById('aliasToInput').value = '';
    document.getElementById('fakeNameOutput').value = '';
    document.getElementById('btnSaveAlias').disabled = true;
  });

  // init
  renderAliasTable();
  setSaveEnabled(false);
}

// ===== Class Features (accordion) =====

let __feat_cache = null;
const FEAT_URL = 'skills-and-features.json';

async function loadFeatures() {
  if (__feat_cache) return __feat_cache;
  const res = await fetch(FEAT_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Cannot load ${FEAT_URL} (${res.status})`);
  __feat_cache = await res.json();
  return __feat_cache;
}

function enhanceFeatureAccordions() {
  const root = document.getElementById('featuresAccordion');
  if (!root) return;

  root.querySelectorAll('details.feat').forEach(d => {
    const card = d.querySelector('.feature-card');
    if (!card) return;

    // инициална височина
    card.style.maxHeight = d.open ? card.scrollHeight + 'px' : '0px';

    d.addEventListener('toggle', () => {
      // динамична височина при отваряне/затваряне
      const h = d.open ? card.scrollHeight : 0;
      card.style.maxHeight = h + 'px';
    });

    // ако съдържанието се промени динамично (рядко), обнови височината
    const ro = new ResizeObserver(() => {
      if (d.open) card.style.maxHeight = card.scrollHeight + 'px';
    });
    ro.observe(card);
  });
}

async function renderFeaturesAccordion(level) {
  const host = document.getElementById('featuresAccordion'); // <-- тук
  if (!host) return;

  host.innerHTML = '<small>Чете от <code>skills-and-features.json</code>…</small>';

  try {
    const data = await loadFeatures();
    const items = Array.isArray(data) ? data :
      Array.isArray(data.features) ? data.features : [];
    const list = items
      .filter(it => (Number(it.level) || 1) <= Number(level || 1))
      .sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0));

    host.innerHTML = list.map(it => {
      const name = (it.name || '').replace(/</g, '&lt;');
      const lvl = Number(it.level) || 1;
      const desc = (Array.isArray(it.desc) ? it.desc : (it.desc ? [it.desc] : []))
        .map(p => `<p>${String(p).replace(/</g, '&lt;')}</p>`).join('');
      const bullets = (Array.isArray(it.bullets) ? it.bullets : [])
        .map(li => `<div class="feat-bullet">• ${String(li).replace(/</g, '&lt;')}</div>`).join('');
      const notes = it.notes ? `<p class="small-note">${String(it.notes).replace(/</g, '&lt;')}</p>` : '';
      return `
        <details class="feat">
          <summary>Lv ${lvl} ${name}</summary>
          <div class="feature-card">${desc}${bullets}${notes}</div>
        </details>`;
    }).join('');

    enhanceFeatureAccordions();
    // Attach collapse button after accordion is rendered
    attachCollapseBtn();
  } catch (e) {
    console.error(e);
    host.innerHTML = '<small style="color:#f66">Грешка при зареждане на features.</small>';
  }
}

// Attach collapse button handler - will be re-attached after tab loads
function attachCollapseBtn() {
  const btn = document.getElementById('collapseAllBtn');
  if (!btn) return;
  // Remove existing listeners by cloning
  const newBtn = btn.cloneNode(true);
  btn.replaceWith(newBtn);
  newBtn.addEventListener('click', () => {
    document.querySelectorAll('#featuresAccordion details[open]')
      .forEach(el => el.removeAttribute('open'));
  });
}

document.addEventListener("click", (e) => {
  const tabBtn = e.target.closest("[data-tab]");
  if (!tabBtn) return;
  const tab = tabBtn.getAttribute("data-tab");

  // ... твоя код за превключване ...

  if (tab === 'skills' || tab === 'features') {
    const d = derived();
    if (!_featuresRendered || _featuresDirty) {
      renderFeaturesAccordion(d.level);
      _featuresRendered = true;
      _featuresDirty = false;
    }
  }
});

// след глобалния таб-контрол
document.addEventListener('click', (e) => {
  const tabBtn = e.target.closest("[data-tab]");
  if (!tabBtn) return;
  const tab = tabBtn.getAttribute("data-tab");

  // ... твоята логика за активиране/скриване ...

  if (tab === 'skills' || tab === 'features') {
    console.log("render");
    // гарантирано рисуваме при отваряне
    const d = derived();           // вземи текущото ниво
    renderFeaturesAccordion(d.level);
  }
});


// ===== Session Notes — FOLDER MODE =====
const NOTES_DIR_KEY = "notesDirHandle_v2"; // ключ в IndexedDB
let notesDirHandle = null;     // избраната папка
let notesFileHandle = null;    // текущ файл за днешната сесия
let __notesFileCreatedThisRun = false;

function updateNotesStatus() {
  const s = document.getElementById('notesStatus');
  if (!s) return;
  if (notesFileHandle) s.textContent = `Notes: linked (file: ${notesFileHandle.name})`;
  else if (notesDirHandle) s.textContent = 'Notes: linked (folder only – no file yet)';
  else s.textContent = 'Notes: NOT linked (local only)';
}

async function idbSetHandle(key, val) { return idbSet(key, val); }
async function idbGetHandle(key) { return idbGet(key); }

async function fileExistsInDir(dirHandle, name) {
  try { await dirHandle.getFileHandle(name); return true; }
  catch { return false; }
}

function notesBaseName() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_SessionNotes`;
}

async function notesEnsureNewFile() {
  if (!notesDirHandle || __notesFileCreatedThisRun || notesFileHandle) return;

  // нужно е в user-gesture синхронен поток
  const ok = await ensureDirRW(notesDirHandle);
  if (!ok) { updateNotesStatus(); return; }

  const base = notesBaseName();
  let name = `${base}.json`, i = 2;
  while (await fileExistsInDir(notesDirHandle, name)) {
    name = `${base} (${i++}).json`;
  }
  notesFileHandle = await notesDirHandle.getFileHandle(name, { create: true });
  __notesFileCreatedThisRun = true;

  await notesWriteNow();        // първоначален запис (може и празен)
  updateNotesStatus();
}

async function notesWriteNow() {
  if (notesDirHandle && !notesFileHandle) {
    await notesEnsureNewFile();
  }
  if (!notesFileHandle) return; // няма папка/файл -> нищо

  try {
    const perm = await notesFileHandle.queryPermission({ mode: "readwrite" });
    if (perm !== "granted") {
      const req = await notesFileHandle.requestPermission({ mode: "readwrite" });
      if (req !== "granted") return;
    }
    const w = await notesFileHandle.createWritable();
    const obj = { schema: "sessionNotes/v1", updated: new Date().toISOString(), content: st.sessionNotes || "" };
    await w.write(new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" }));
    await w.close();
  } catch (e) { console.error("notesWriteNow", e); }
}


const notesDebouncedSave = debounce(() => notesWriteNow(), 1000);

async function notesPickDir() {
  try {
    if (!('showDirectoryPicker' in window)) {
      alert("Your browser doesn't support choosing a folder. Use Chrome/Edge desktop.");
      return;
    }
    const dir = await window.showDirectoryPicker({ mode: 'readwrite' });
    notesDirHandle = dir;
    notesFileHandle = null;
    __notesFileCreatedThisRun = false;
    await idbSetHandle(NOTES_DIR_KEY, dir);
    updateNotesStatus();
    await notesEnsureNewFile(); // веднъж за този boot
  } catch (e) {
    /* cancel or error */
    console.warn(e);
  }
}

async function notesRestoreDir() {
  try {
    const h = await idbGet("notesDirHandle_v2") || await idbGet("notesDirHandle");
    if (!h) {
      notesDirHandle = null;
      notesFileHandle = null;
      updateNotesStatus();
      return;
    }
    if (!notesFileHandle) {
      st.sessionNotes = "";
      const ta = document.getElementById('notesInput');
      if (ta) ta.value = "";
    }
    notesDirHandle = h;
    notesFileHandle = null;
    updateNotesStatus();
  } catch (e) {
    notesDirHandle = null; notesFileHandle = null; updateNotesStatus();
  }
}

// UI wiring (textarea + бутон Link folder)
function wireNotesUI() {
  const ta = document.getElementById('notesInput');
  const btn = document.getElementById('btnNotesLink');

  if (btn && !btn.__wired) {
    btn.__wired = true;
    btn.addEventListener('click', notesPickDir);
  }

  if (ta && !ta.__wired) {
    ta.__wired = true;
    ta.value = st.sessionNotes || "";

    let firstInputHandled = false;

    // 1) при първия user gesture – веднага опитай да създадеш днешния файл
    const onFirstGesture = async () => {
      if (!firstInputHandled) {
        firstInputHandled = true;
        if (notesDirHandle && !notesFileHandle) {
          try { await notesEnsureNewFile(); } catch { }
        }
      }
    };

    ta.addEventListener('keydown', onFirstGesture, { once: true });
    ta.addEventListener('pointerdown', onFirstGesture, { once: true });

    // 2) след това — нормален дебаунс за записите
    ta.addEventListener('input', () => {
      st.sessionNotes = ta.value;
      save();                    // локален бекъп
      notesDebouncedSave();      // ще пише, ако вече има file handle
    });
  }
}


function onNotesTabShown() {
  wireNotesUI();
  updateNotesStatus();
}

// ===== Death saves =====
function renderDeathSaves() {
  const s = st.dsSuccess, f = st.dsFail;
  const sIds = ["dsS1", "dsS2", "dsS3"], fIds = ["dsF1", "dsF2", "dsF3"];
  sIds.forEach((id, i) => {
    const n = el(id); if (!n) return;
    n.classList.toggle("active", s > i);
  });
  fIds.forEach((id, i) => {
    const n = el(id); if (!n) return;
    const active = f > i;
    n.classList.toggle("active", active);
    n.classList.toggle("lvl2", f >= 2 && i <= 1);   // подчертай първите две, когато са ≥2
    n.classList.toggle("lvl3", f >= 3 && i <= 2);   // всичките при 3 (смърт)
  });

  // overlay
  const ov = el("youDiedOverlay");
  if (ov) ov.classList.toggle("hidden", st.status !== "dead");
}

el("importNotesFile") && el("importNotesFile").addEventListener("change", (e) => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      el("notesPreview").value = obj.content || "(empty)";
    } catch { el("notesPreview").value = "(bad JSON)"; }
  };
  reader.readAsText(file);
  e.target.value = "";
});

// Bind UI
el("btnCloudLink") && el("btnCloudLink").addEventListener("click", async () => {
  // ако има handle – релинк/смяна
  await cloudPick();
});
el("btnCloud") && el("btnCloudPull").addEventListener("click", async () => { await cloudPull(); });

// ===== Service Worker (не регистрираме в localhost за dev) =====
if ("serviceWorker" in navigator && location.hostname !== "localhost") {
  window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js"));
}
// PWA install prompt (ако имаш бутон)
let deferredPrompt = null;
el("btnInstall") && window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); deferredPrompt = e; el("btnInstall").classList.remove("hidden");
});
el("btnInstall") && el("btnInstall").addEventListener("click", async () => {
  if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null;
  el("btnInstall").classList.add("hidden");
});

(function tabsInit() {
  const btns = Array.from(document.querySelectorAll('.tab-nav [data-tab]'));
  // Only select actual tabs, not combat section
  const panels = Array.from(document.querySelectorAll('.tab')).filter(p => p.id !== 'tab-combat');

  function showTab(tabKey) {
    // Skip 'combat' - it's not a tab, it's always visible above tabs
    if (tabKey === 'combat') return;
    
    // 1) бутони
    document.querySelectorAll('.tab-nav .tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tabKey);
    });

    // 2) табове (скрий всички освен Combat, който е винаги видим)
    document.querySelectorAll('.tab').forEach(t => {
      if (t.id !== 'tab-combat') {
        t.classList.add('hidden');
      }
    });
    const tabEl = document.getElementById(`tab-${tabKey}`);
    if (tabEl) tabEl.classList.remove('hidden');

    // 3) лениво рендериране само когато е нужно
    if (tabKey === 'featuresSection') {
      const d = derived();
      renderFeaturesAccordion(d.level);
    }

    // Re-attach inventory event listeners when inventory tab is shown
    if (tabKey === 'inventory') {
      // Wait for HTML to be fully rendered and elements to be available
      setTimeout(() => {
        if (typeof window.attachInventory === 'function') {
          window.attachInventory();
        }
        if (typeof window.renderGold === 'function') {
          window.renderGold();
        }
      }, 100);
    }

    // Re-attach quest event listeners when quests tab is shown
    if (tabKey === 'quests') {
      setTimeout(() => {
        if (typeof window.attachQuestListeners === 'function') {
          window.attachQuestListeners();
        }
        if (typeof window.renderQuests === 'function') {
          window.renderQuests();
        }
        if (typeof window.initQuestDragAndDrop === 'function') {
          window.initQuestDragAndDrop();
        }
      }, 100);
    }

    if (tabKey === 'stats') {
      // Show first sub-tab by default if none is active
      const activeSubTab = document.querySelector('.sub-tab-btn.active');
      if (!activeSubTab) {
        showSubTab('basicinfo');
      }
      
      // Lazy render features accordion
      const d = derived();
      if (!_featuresRendered || _featuresDirty) {
        renderFeaturesAccordion(d.level);
        _featuresRendered = true;
        _featuresDirty = false;
      }
      // Attach collapse button after accordion is rendered
      setTimeout(() => attachCollapseBtn(), 100);
    } else {
      // Hide all sub-tabs when switching away from Stats tab
      hideAllSubTabs();
    }
  }
  
  // Track which sub-tabs have been loaded
  const __subTabsLoaded = {};
  
  // Sub-tab HTML mapping
  const subTabHtmlMap = {
    'basicinfo': 'tabs/stats-basicinfo.html',
    'stats': 'tabs/stats-stats.html',
    'passiveskills': 'tabs/stats-passiveskills.html'
  };
  
  // Helper function to show a sub-tab (loads HTML dynamically on first click)
  async function showSubTab(subTabKey) {
    // Hide all sub-tab contents
    document.querySelectorAll('.sub-tab-content').forEach(el => {
      el.classList.add('hidden');
    });
    
    // Show selected sub-tab content
    const subTabEl = document.getElementById(`subtab-${subTabKey}`);
    if (subTabEl) {
      // Load HTML if not already loaded
      if (!__subTabsLoaded[subTabKey] && subTabHtmlMap[subTabKey]) {
        try {
          const response = await fetch(subTabHtmlMap[subTabKey]);
          if (response.ok) {
            subTabEl.innerHTML = await response.text();
            __subTabsLoaded[subTabKey] = true;
            
            // Re-attach event listeners after loading HTML
            attachSubTabEventListeners(subTabKey);
            
            // Render current values
            renderAll();
          }
        } catch (e) {
          console.error(`Error loading sub-tab ${subTabKey}:`, e);
        }
      }
      
      subTabEl.classList.remove('hidden');
      
      // Render skills table if passive skills sub-tab is shown
      if (subTabKey === 'passiveskills') {
        const d = derived();
        renderSkillsInSubtab(d.mods, d.prof);
      }
    }
    
    // Update sub-tab buttons
    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.subtab === subTabKey);
    });
  }
  
  // Attach event listeners for dynamically loaded sub-tab content
  function attachSubTabEventListeners(subTabKey) {
    if (subTabKey === 'basicinfo') {
      // charName, notes, xpInput, homebrewHp, acMagicInput, unarmedMagicInput, meleeWeaponMagicInput, rangedMagicInput
      const charNameEl = document.getElementById('charName');
      if (charNameEl) {
        charNameEl.addEventListener('input', () => { st.name = charNameEl.value; save(); });
      }
      const notesEl = document.getElementById('notes');
      if (notesEl) {
        notesEl.addEventListener('input', () => { st.notes = notesEl.value; save(); });
      }
      const xpInputEl = document.getElementById('xpInput');
      if (xpInputEl) {
        xpInputEl.addEventListener('input', () => {
          st.xp = Math.max(0, Math.floor(Number(xpInputEl.value || 0)));
          const d = derived();
          st.hdAvail = clamp(st.hdAvail, 0, d.hdMax);
          st.kiCurrent = clamp(st.kiCurrent, 0, d.kiMax);
          _featuresDirty = true;
          save();
        });
      }
      const hbInput = document.getElementById('homebrewHp');
      if (hbInput) {
        hbInput.addEventListener('input', () => {
          const raw = hbInput.value.trim();
          let v = (raw === "" ? 0 : Math.floor(Number(raw)));
          if (Number.isNaN(v)) v = 0;
          st.hpHomebrew = v;
          const d2 = derived();
          st.hpCurrent = clamp(st.hpCurrent, 0, d2.maxHP);
          save();
        });
      }
      const acMagicEl = document.getElementById('acMagicInput');
      if (acMagicEl) {
        acMagicEl.addEventListener('input', () => { st.acMagic = Math.floor(Number(acMagicEl.value || 0)); save(); });
      }
      const kiSaveDcMagicEl = document.getElementById('kiSaveDcMagicInput');
      if (kiSaveDcMagicEl) {
        kiSaveDcMagicEl.addEventListener('input', () => { st.kiSaveDcMagic = Math.floor(Number(kiSaveDcMagicEl.value || 0)); save(); });
      }
      const unarmedMagicEl = document.getElementById('unarmedMagicInput');
      if (unarmedMagicEl) {
        unarmedMagicEl.addEventListener('input', () => {
          st.unarmedMagic = Math.floor(Number(unarmedMagicEl.value || 0));
          save();
        });
      }
      const meleeWeaponMagicEl = document.getElementById('meleeWeaponMagicInput');
      if (meleeWeaponMagicEl) {
        meleeWeaponMagicEl.addEventListener('input', () => {
          st.meleeWeaponMagic = Math.floor(Number(meleeWeaponMagicEl.value || 0));
          save();
        });
      }
      const rangedMagicEl = document.getElementById('rangedMagicInput');
      if (rangedMagicEl) {
        rangedMagicEl.addEventListener('input', () => {
          st.rangedMagic = Math.floor(Number(rangedMagicEl.value || 0));
          save();
        });
      }
    }
    
    if (subTabKey === 'stats') {
      // Ability inputs
      ["str", "dex", "con", "int_", "wis", "cha"].forEach(key => {
        const mapId = { str: "strInput", dex: "dexInput", con: "conInput", int_: "intInput", wis: "wisInput", cha: "chaInput" };
        const inputEl = document.getElementById(mapId[key]);
        if (inputEl) {
          inputEl.addEventListener('input', () => {
            let v = Math.floor(Number(inputEl.value || 0));
            st[key] = v; save();
          });
        }
      });
      
      // Save proficiency checkboxes
      ["Str", "Dex", "Con", "Int", "Wis", "Cha"].forEach(S => {
        const id = "save" + S + "Prof";
        const chk = document.getElementById(id);
        if (chk) chk.addEventListener("change", () => { st[id] = chk.checked; save(); });
      });
      
      // Tough checkbox
      const toughChkEl = document.getElementById('toughChk');
      if (toughChkEl) {
        toughChkEl.addEventListener('change', () => {
          const before = derived().maxHP;
          st.tough = toughChkEl.checked;
          const after = derived().maxHP;
          const delta = after - before;
          st.hpCurrent = clamp(st.hpCurrent + delta, 0, after);
          save();
        });
      }
      
      // All saves bonus
      const saveAllBonusEl = document.getElementById('saveAllBonusInput');
      if (saveAllBonusEl) {
        saveAllBonusEl.addEventListener('input', () => {
          let v = Math.floor(Number(saveAllBonusEl.value || 0));
          v = Math.max(-5, Math.min(10, v)); st.saveAllBonus = v; save();
        });
      }
    }
  }
  
  // Helper function to hide all sub-tabs
  function hideAllSubTabs() {
    document.querySelectorAll('.sub-tab-content').forEach(el => {
      el.classList.add('hidden');
    });
    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
  }
  
  // Initialize Stats sub-tabs navigation
  function initStatsSubTabs() {
    const subTabBtns = document.querySelectorAll('.sub-tab-btn');
    subTabBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const subTabKey = btn.dataset.subtab;
        if (subTabKey) {
          await showSubTab(subTabKey);
        }
      });
    });
    
    // Show first sub-tab by default
    if (subTabBtns.length > 0) {
      showSubTab('basicinfo');
    }
  }
  
  // Make functions available globally for initialization
  window.showSubTab = showSubTab;
  window.hideAllSubTabs = hideAllSubTabs;
  window.initStatsSubTabs = initStatsSubTabs;


  // wire (skip 'combat' - it's not a tab)
  btns.forEach(b => {
    if (b.dataset.tab !== 'combat') {
      b.addEventListener('click', () => showTab(b.dataset.tab));
    }
  });

  // Първоначален таб (помни последния; fallback към първия бутон)
  // Combat не е таб - е винаги видим отгоре, не го включваме в таб логиката
  const initial = localStorage.getItem('activeTab');
  // Filter out 'combat' from buttons (it's not a tab)
  const tabBtns = btns.filter(b => b.dataset.tab !== 'combat');
  if (initial && initial !== 'combat') {
    showTab(initial);
  } else if (tabBtns.length > 0) {
    // Fallback to first non-combat tab
    showTab(tabBtns[0].dataset.tab);
  }
})();

(function tabsInitToggleable() {
  const btns = Array.from(document.querySelectorAll('.tab-nav [data-tab]'));
  // Only select actual tabs, not combat section
  const panels = Array.from(document.querySelectorAll('.tab')).filter(p => p.id !== 'tab-combat');
  let activeName = null;

  function setActive(name) {
    // Skip 'combat' - it's not a tab, it's always visible above tabs
    if (name === 'combat') {
      activeName = null;
      return;
    }
    
    activeName = name;

    // 1) скрий всички табове (Combat не е таб, не го докосваме)
    panels.forEach(p => p.classList.add('hidden'));

    // 2) покажи избрания (ако има такъв)
    if (name) {
      const panel = document.getElementById(`tab-${name}`);
      if (panel) panel.classList.remove('hidden');
    }

    // 3) активна визия за бутоните
    btns.forEach(b => b.classList.toggle('active', !!name && b.dataset.tab === name));

    // 4) лениво зареждане на съдържание
    if (name === 'stats') {            // второ ниво навигация под Stats
      // Show first sub-tab by default if none is active
      const activeSubTab = document.querySelector('.sub-tab-btn.active');
      if (!activeSubTab && typeof window.showSubTab === 'function') {
        window.showSubTab('basicinfo');
      }
      // при Stats не чертаем акордеона
    } else {
      // Hide all sub-tabs when switching away from Stats tab
      if (typeof window.hideAllSubTabs === 'function') {
        window.hideAllSubTabs();
      }
    }
    // Skills табът все още чертае features акордеона
    if (name === 'skills') {
      const d = derived();
      renderFeaturesAccordion(d.level); // чертай акордеона тук
    }
    if (name === 'sessionNotes') {
      onNotesTabShown();                // както вече имаш
    }
  }

  btns.forEach(b => {
    b.setAttribute('type', 'button');
    // Skip 'combat' button - it's not a tab
    if (b.dataset.tab === 'combat') return;
    // поддържаме "collapse all" при повторно кликване
    b.addEventListener('click', () => setActive(activeName === b.dataset.tab ? null : b.dataset.tab));
  });

  // Combat табът е винаги видим, не го скриваме
  // setActive(null); // старт без отворен таб (ако искаш определен — подай името му)
})();

window.addEventListener('beforeunload', (e) => {
  // покажи подсказка ако има непратени промени
  e.preventDefault();
  e.returnValue = ''; // стандартен трик за prompt
});
+

  // ==== Boot ====
  (async () => {
    // Load tab HTML fragments first (before attaching event listeners)
    await loadTabs();
    
    // Initialize Stats sub-tabs navigation after tabs are loaded
    if (typeof window.initStatsSubTabs === 'function') window.initStatsSubTabs();

    await cloudRestore();

    __notesFileCreatedThisRun = false;     // <-- гарантирано нов файл за тази сесия
    await notesRestoreDir();               // опитай да върнеш папката
    await notesEnsureNewFile();            // ако има папка → създай *нов* днешен файл

    renderAll();
    // Module functions are now loaded from separate files (modules/*.js)
    if (typeof window.attachShenanigans === 'function') attachShenanigans();
    if (typeof window.attachOneLiners === 'function') attachOneLiners();
    if (typeof window.attachExcuses === 'function') attachExcuses();
    if (typeof window.attachFamiliars === 'function') attachFamiliars();
    if (typeof window.attachAliasLog === 'function') attachAliasLog();
    // attachInventory will be called when inventory tab is shown (in showTab function)
    if (typeof window.attachPCChar === 'function') attachPCChar();
    
    // Attach collapse button if skills tab is visible
    attachCollapseBtn();
    
    // Signal that tabs are loaded (for tests)
    window.__tabsLoaded = true;
    
    // Export bundle functions for tests
    window.buildBundle = buildBundle;
    window.applyBundle = applyBundle;
    window.getBundle = getBundle;
  })();

