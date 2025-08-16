// ===== Helpers =====
const el = id => document.getElementById(id);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const modFrom = (score) => Math.floor((Number(score || 0) - 10) / 2);

// XP thresholds 1..20 (RAW без 0-праг)
const XP_THRESH = [300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

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
  str: 10, dex: 10, con: 10, int_: 10, wis: 10, cha: 10,
  saveStrProf: false, saveDexProf: true, saveConProf: false, saveIntProf: false, saveWisProf: true, saveChaProf: false,
  saveAllBonus: 0,
  skillProfs: {},

  hpCurrent: 10,
  hpHomebrew: null,      // добавка към формулната Max HP (може отрицателна)
  kiCurrent: 1,
  dsSuccess: 0, dsFail: 0, status: "alive",
  hdAvail: 1,

  acMagic: 0, baseSpeed: 30, tough: false, hpAdjust: 0
};


// ===== Load/save =====
let st = load();
function load() {
  try {
    const raw = localStorage.getItem("monkSheet_v3");
    return raw ? { ...defaultState, ...JSON.parse(raw) } : { ...defaultState };
  } catch { return { ...defaultState }; }
}
function save() {
  localStorage.setItem("monkSheet_v3", JSON.stringify(st));
  renderAll();
  // Cloud write (debounced)
  cloudSchedule();
}

// ===== Derived =====
function levelFromXP(xp) {
  let lvl = 1;
  for (let i = 20; i >= 2; i--) {
    if (xp >= XP_THRESH[i - 2]) { lvl = i; break; }
  }
  return lvl;
}
function derived() {
  const level = levelFromXP(st.xp);
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

  return { level, mods, prof, ma, kiMax, hdMax, maxHP, ac, um, totalSpeed, savesBase, savesTotal };
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
  
  SKILLS.forEach(([n]) => {if (!(n in st.skillProfs)) st.skillProfs[n] = false; }); }
  
ensureSkillProfs();

function skillBonusTotal(name, mods, prof) {
  const entry = SKILLS.find(x => x[0] === name);
  if (!entry) return 0;
  const abil = entry[1];
  return (mods[abil] || 0) + (st.skillProfs[name] ? prof : 0);
}
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

  renderSkills(d.mods, d.prof);
  renderDeathSaves();
  attachShenanigans();
  attachOneLiners();
}

// ===== Events: inputs =====
el("charName") && el("charName").addEventListener("input", () => { st.name = el("charName").value; save(); });
el("notes") && el("notes").addEventListener("input", () => { st.notes = el("notes").value; save(); });

el("xpInput") && el("xpInput").addEventListener("input", () => {
  st.xp = Math.max(0, Math.floor(Number(el("xpInput").value || 0)));
  const d = derived();
  st.hdAvail = clamp(st.hdAvail, 0, d.hdMax);
  st.kiCurrent = clamp(st.kiCurrent, 0, d.kiMax);
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
        const rolled = prompt(`Колко HP върнаха заровете (сума на d8)? Ще добавя + CON мод × ${use}.`, "0");
        if (rolled !== null) {
          const heal = Math.max(0, Math.floor(Number(rolled) || 0)) + d.mods.con * use;
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
  const d = derived();
  const recover = Math.ceil(d.hdMax / 2);
  st.hdAvail = Math.min(d.hdMax, st.hdAvail + recover);
  st.kiCurrent = d.kiMax;
  st.hpCurrent = d.maxHP;
  st.dsSuccess = 0; st.dsFail = 0; st.status = "alive";
  save();
});

// Export / Import / Reset
el("btnExport") && el("btnExport").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(st, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = (st.name || "monk") + "_sheet.json";
  document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); a.remove();
});
el("importFile") && el("importFile").addEventListener("change", (e) => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { try { st = { ...defaultState, ...JSON.parse(reader.result) }; save(); } catch { alert("Грешен JSON."); } };
  reader.readAsText(file); e.target.value = "";
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
      const req = await cloudHandle.requestPermission({ mode: "readwrite" });
      if (req !== "granted") return;
    }
    const file = await cloudHandle.getFile();
    const writable = await cloudHandle.createWritable();
    await writable.write(new Blob([JSON.stringify(st, null, 2)], { type: "application/json" }));
    await writable.close();
  } catch (e) { /* тихо */ }
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
    const json = JSON.parse(text);
    st = { ...defaultState, ...json };
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
    { btn: 'btnCritMiss',   out: 'olCritMiss',   key: 'crit_miss'     },
    { btn: 'btnCritAttack', out: 'olCritAttack', key: 'crit_attack'   },
    { btn: 'btnSufferCrit', out: 'olSufferCrit', key: 'suffer_crit'   },
    { btn: 'btnTease',      out: 'olTease',      key: 'combat_tease'  },
    { btn: 'btnMagic',      out: 'olMagic',      key: 'magic'         }
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

function pickRandom(arr) {
  return arr && arr.length ? arr[Math.floor(Math.random()*arr.length)] : '';
}

function attachShenanigans(){
  const btn = document.getElementById('btnGetName');
  if (!btn) return; // ако табът липсва в този билд
  btn.addEventListener('click', async ()=>{
    const list = await loadShenanigans();
    const name = pickRandom(list).trim();
    const out = document.getElementById('fakeNameOutput');
    if (out) out.value = name || '(no names found)';
  });
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

// Bind UI
el("btnCloudLink") && el("btnCloudLink").addEventListener("click", async () => {
  // ако има handle – релинк/смяна
  await cloudPick();
});
el("btnCloudPull") && el("btnCloudPull").addEventListener("click", async () => { await cloudPull(); });

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

// ==== Boot ====
(async () => {
  await cloudRestore();   // опит за автоматично възстановяване
  renderAll();            // първи рендер
})();
