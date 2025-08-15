// ===== Helpers =====
const el = id => document.getElementById(id);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const modFrom = (score) => Math.floor((Number(score || 0) - 10) / 2);

// XP thresholds 1..20
const XP_THRESH = [300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

// ==== Cloud Sync (File System Access API) ====
let cloudHandle = null;         // файлов хендъл към JSON-а за синк
let cloudDebounce = null;       // таймер за дебаунс
let cloudDirty = false;         // има локални промени за писане

function cloudUiRefresh() {
  const dot = el("cloudDot"), linkBtn = el("btnCloudLink");
  if (!dot || !linkBtn) return;
  if (cloudHandle) { dot.classList.add("ok"); linkBtn.textContent = "Cloud ✓"; }
  else { dot.classList.remove("ok"); linkBtn.textContent = "Cloud"; }
}

async function cloudLink() {
  if (!("showSaveFilePicker" in window)) {
    alert("Cloud sync изисква Chrome/Edge (File System Access API).");
    return;
  }
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: (st.name || "monk") + "_sheet.json",
      types: [{ description: "JSON", accept: { "application/json": [".json"] } }]
    });
    // вземи разрешение
    let perm = handle.queryPermission ? await handle.queryPermission({mode:'readwrite'}) : 'granted';
    if (perm === 'prompt' && handle.requestPermission) {
      perm = await handle.requestPermission({mode:'readwrite'});
    }
    if (perm !== 'granted') {
      alert("Няма разрешение за писане към файла.");
      return;
    }
    cloudHandle = handle;
    await idbSet('cloudHandle', handle);
    await cloudWrite(true); // запиши веднага
    cloudUiRefresh();
  } catch(e) { /* cancel */ }
}

async function cloudUnlink(){
  cloudHandle = null;
  await idbDel('cloudHandle');
  cloudUiRefresh();
}

async function cloudPull() {
  if (!cloudHandle) { alert("Първо свържи файл (Cloud)."); return; }
  try {
    const file = await cloudHandle.getFile();
    const text = await file.text();
    const incoming = JSON.parse(text);
    // merge върху defaultState, после save()
    st = { ...defaultState, ...incoming };
    save();                         // save() ще рендърне и ще насрочи cloudWrite()
  } catch (e) {
    console.error(e);
    alert("Грешка при четене от файла.");
  }
}

async function cloudWrite(force=false) {
  if (!cloudHandle) return;
  if (!force && !cloudDirty) return;
  try {
    // гарантирай разрешение
    let perm = cloudHandle.queryPermission ? await cloudHandle.queryPermission({mode:'readwrite'}) : 'granted';
    if (perm === 'prompt' && cloudHandle.requestPermission) {
      perm = await cloudHandle.requestPermission({mode:'readwrite'});
    }
    if (perm !== 'granted') {
      // откачи линка — иначе ще създадем нов файл при следващ Cloud
      cloudHandle = null;
      await idbDel('cloudHandle');
      cloudUiRefresh();
      console.warn('Cloud write skipped: no permission');
      return;
    }

    const writable = await cloudHandle.createWritable();
    await writable.write(new Blob([JSON.stringify(st, null, 2)], {type:"application/json"}));
    await writable.close();
    cloudDirty = false;
  } catch (e) {
    console.error('cloudWrite err', e);
    // handle-ът може да е станал невалиден (Android документи/провайдър)
    cloudHandle = null;
    await idbDel('cloudHandle');
    cloudUiRefresh();
    // по желание: alert('Cloud file is not available. Please relink.');
  }
}


function cloudSchedule() {
  if (!cloudHandle) return;
  cloudDirty = true;
  clearTimeout(cloudDebounce);
  cloudDebounce = setTimeout(() => cloudWrite(false), 1500);  // debounce ~1.5s
}

function maDie(level) {
  if (level >= 17) return "d10";
  if (level >= 11) return "d8";
  if (level >= 5) return "d6";
  return "d4";
}
function profBonus(level) {
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
}
function umBonus(level) {
  if (level >= 18) return 30;
  if (level >= 14) return 25;
  if (level >= 10) return 20;
  if (level >= 6) return 15;
  if (level >= 2) return 10;
  return 0;
}
function baseHP(level, conMod) {
  if (level <= 0) return 0;
  let hp = 8 + conMod; // level 1
  if (level >= 2) {
    hp += (level - 1) * (5 + conMod);
  }
  return hp;
}

// ===== State =====
const defaultState = {
  name: "Пийс Ошит",
  notes: "",
  xp: 0,
  levelApplied: 1,
  str: 10, dex: 10, con: 10, int_: 10, wis: 10, cha: 10,
  saveStrProf: false, saveDexProf: true, saveConProf: false, saveIntProf: false, saveWisProf: true, saveChaProf: false,
  saveAllBonus: 0,
  skillProfs: {},
  hpCurrent: 10,
  hpHomebrew: null,
  kiCurrent: 1,
  dsSuccess: 0, dsFail: 0, status: "alive",
  hdAvail: 1,
  acMagic: 0, baseSpeed: 30, tough: false, hpAdjust: 0
};

let st = load();
function load() {
  try { const raw = localStorage.getItem("monkSheet_v3"); return raw ? { ...defaultState, ...JSON.parse(raw) } : { ...defaultState }; }
  catch { return { ...defaultState }; }
}
function save() {
  localStorage.setItem("monkSheet_v3", JSON.stringify(st));
  renderAll();
  cloudSchedule();
}

// ===== Derived =====
function levelFromXP(xp) {
  let lvl = 1;
  for (let i = 20; i >= 2; i--) {
    if (xp >= XP_THRESH[i - 2]) {
      lvl = i;
      break;
    }
  }
  return lvl;
}
function derived() {
  const level = st.levelApplied;                 // <-- вместо levelFromXP(st.xp)
  const mods = {
    str: modFrom(st.str), dex: modFrom(st.dex), con: modFrom(st.con),
    int_: modFrom(st.int_), wis: modFrom(st.wis), cha: modFrom(st.cha)
  };
  const prof = profBonus(level);
  const ma = maDie(level);
  const kiMax = level;
  const hdMax = level;
  const calculatedMaxHP = baseHP(level, mods.con) + (st.tough ? 2 * level : 0) + Number(st.hpAdjust || 0);
  const hbAdj = Number(st.hpHomebrew || 0);
  const maxHP = Math.max(1, Math.floor(calculatedMaxHP + hbAdj));

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
function ensureSkillProfs() { if (!st.skillProfs) st.skillProfs = {}; SKILLS.forEach(([name]) => { if (!(name in st.skillProfs)) st.skillProfs[name] = false; }); }
ensureSkillProfs();

function skillBonusTotal(name, mods, prof) {
  const entry = SKILLS.find(x => x[0] === name);
  if (!entry) return 0;
  const abil = entry[1];
  const base = (mods[abil] || 0) + (st.skillProfs[name] ? prof : 0);
  return base;
}
function renderSkills(mods, prof) {
  const body = el("skillsBody");
  if (!body) return;
  body.innerHTML = "";
  SKILLS.forEach(([name, abil]) => {
    const tr = document.createElement("tr");
    const profChecked = !!st.skillProfs[name];
    const bonus = (mods[abil] || 0) + (profChecked ? prof : 0);
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
  if (e.target.classList.contains("tab-btn")) {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    e.target.classList.add("active");
    const tab = e.target.getAttribute("data-tab");
    el("tab-combat").classList.toggle("hidden", tab !== "combat");
    el("tab-stats").classList.toggle("hidden", tab !== "stats");
  }
});

const cloudLinkBtn = el("btnCloudLink");
if (cloudLinkBtn) cloudLinkBtn.addEventListener("click", () => {
  if (cloudHandle) cloudUnlink(); else cloudLink();
});
const cloudPullBtn = el("btnCloudPull");
if (cloudPullBtn) cloudPullBtn.addEventListener("click", () => cloudPull());

cloudUiRefresh();


// ===== Rendering =====
function renderAll() {
  const d = derived();

  // header
  let emoji = "🙂";
  if (st.status === "stable") emoji = "🛌";
  else if (st.status === "dead") emoji = "💀";
  else if (st.hpCurrent <= 0) emoji = "😵";
  el("lifeStatus").textContent = emoji;

  // Combat pills
  el("hpCurrentSpan").textContent = st.hpCurrent;
  el("hpMaxSpan").textContent = d.maxHP;
  el("kiCurrentSpan").textContent = st.kiCurrent;
  el("kiMaxSpan2").textContent = d.kiMax;
  el("acSpan").textContent = d.ac;
  el("profSpan").textContent = `+${d.prof}`;

  // Basic in stats
  el("charName").value = st.name || "";
  el("xpInput").value = st.xp;
  el("levelSpan").textContent = d.level;
  el("profSpan2").textContent = `+${d.prof}`;
  el("maDieSpan").textContent = d.ma;
  el("maxHpSpan").textContent = d.maxHP;
  const hbEl = el("homebrewHp");
  if (hbEl) hbEl.value = (st.hpHomebrew === null || st.hpHomebrew === "") ? "" : st.hpHomebrew;
  el("hdMaxSpan").textContent = d.hdMax;
  el("hdAvailSpan").textContent = st.hdAvail;
  el("kiMaxSpan").textContent = d.kiMax;
  el("acSpan2").textContent = d.ac;
  el("umBonusSpan").textContent = d.um;
  el("passPercSpan").textContent = 10 + skillBonusTotal("Perception", d.mods, d.prof);
  el("passInvSpan").textContent = 10 + skillBonusTotal("Investigation", d.mods, d.prof);
  el("passInsSpan").textContent = 10 + skillBonusTotal("Insight", d.mods, d.prof);
  el("notes").value = st.notes || "";

  // Mods
  const mods = d.mods;
  el("strModSpan").textContent = mods.str >= 0 ? `+${mods.str}` : `${mods.str}`;
  el("dexModSpan").textContent = mods.dex >= 0 ? `+${mods.dex}` : `${mods.dex}`;
  el("conModSpan").textContent = mods.con >= 0 ? `+${mods.con}` : `${mods.con}`;
  el("intModSpan").textContent = mods.int_ >= 0 ? `+${mods.int_}` : `${mods.int_}`;
  el("wisModSpan").textContent = mods.wis >= 0 ? `+${mods.wis}` : `${mods.wis}`;
  el("chaModSpan").textContent = mods.cha >= 0 ? `+${mods.cha}` : `${mods.cha}`;

  // inputs reflecting state
  el("acMagicInput").value = st.acMagic;
  el("saveAllBonusInput").value = st.saveAllBonus;
  el("strInput").value = st.str;
  el("dexInput").value = st.dex;
  el("conInput").value = st.con;
  el("intInput").value = st.int_;
  el("wisInput").value = st.wis;
  el("chaInput").value = st.cha;
  el("saveStrProf").checked = !!st.saveStrProf;
  el("saveDexProf").checked = !!st.saveDexProf;
  el("saveConProf").checked = !!st.saveConProf;
  el("saveIntProf").checked = !!st.saveIntProf;
  el("saveWisProf").checked = !!st.saveWisProf;
  el("saveChaProf").checked = !!st.saveChaProf;
  el("toughChk").checked = !!st.tough;

  // Saves totals (as spans)
  el("saveStrTotalSpan").textContent = (d.savesTotal.str >= 0 ? "+" : "") + d.savesTotal.str;
  el("saveDexTotalSpan").textContent = (d.savesTotal.dex >= 0 ? "+" : "") + d.savesTotal.dex;
  el("saveConTotalSpan").textContent = (d.savesTotal.con >= 0 ? "+" : "") + d.savesTotal.con;
  el("saveIntTotalSpan").textContent = (d.savesTotal.int_ >= 0 ? "+" : "") + d.savesTotal.int_;
  el("saveWisTotalSpan").textContent = (d.savesTotal.wis >= 0 ? "+" : "") + d.savesTotal.wis;
  el("saveChaTotalSpan").textContent = (d.savesTotal.cha >= 0 ? "+" : "") + d.savesTotal.cha;

  renderSkills(d.mods, d.prof);
}

// ===== Events: inputs =====
el("charName").addEventListener("input", () => { st.name = el("charName").value; save(); });
el("notes").addEventListener("input", () => { st.notes = el("notes").value; save(); });
el("xpInput").addEventListener("input", () => {
  st.xp = Math.max(0, Math.floor(Number(el("xpInput").value || 0)));
  save();  // без derived(), без клампове тук
});
["str", "dex", "con", "int_", "wis", "cha"].forEach(key => {
  const mapId = { str: "strInput", dex: "dexInput", con: "conInput", int_: "intInput", wis: "wisInput", cha: "chaInput" };
  el(mapId[key]).addEventListener("input", () => {
    let v = Math.floor(Number(el(mapId[key]).value || 0));
    st[key] = v;
    save();
  });
});
el("toughChk").addEventListener("change", () => {
  const before = derived().maxHP;
  st.tough = el("toughChk").checked;
  const after = derived().maxHP;
  const delta = after - before;
  st.hpCurrent = clamp(st.hpCurrent + delta, 0, after);
  save();
});
el("acMagicInput").addEventListener("input", () => { st.acMagic = Math.floor(Number(el("acMagicInput").value || 0)); save(); });
el("saveAllBonusInput").addEventListener("input", () => {
  let v = Math.floor(Number(el("saveAllBonusInput").value || 0));
  v = Math.max(-5, Math.min(10, v)); st.saveAllBonus = v; save();
});
["Str", "Dex", "Con", "Int", "Wis", "Cha"].forEach(S => {
  const id = "save" + S + "Prof";
  el(id).addEventListener("change", () => { st[id] = el(id).checked; save(); });
});
const hbInput = el("homebrewHp");
if (hbInput) {
  hbInput.addEventListener("input", () => {
    // позволяваме и отрицателни стойности; празно -> 0
    const raw = hbInput.value.trim();
    let v = (raw === "" ? 0 : Math.floor(Number(raw)));
    if (Number.isNaN(v)) v = 0;
    st.hpHomebrew = v;

    // ако новият макс е по-малък от текущото HP -> clamp
    const d2 = derived();
    st.hpCurrent = clamp(st.hpCurrent, 0, d2.maxHP);
    save();
  });
}


// ===== Combat actions =====
function setHP(v) {
  const d = derived();
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
el("btnDamage").addEventListener("click", () => {
  const dVal = Number(el("hpDelta").value || 0); if (dVal <= 0) return;
  if (st.hpCurrent === 0) {
    st.dsFail = clamp(st.dsFail + 1, 0, 3);
    if (st.dsFail >= 3) st.status = "dead";
    save();
  } else {
    setHP(st.hpCurrent - dVal);
    if (st.hpCurrent === 0) st.status = "unconscious";
  }
});
el("btnHeal").addEventListener("click", () => {
  const h = Number(el("hpDelta").value || 0); if (h <= 0) return; setHP(st.hpCurrent + h);
});
el("btnHitAtZero").addEventListener("click", () => {
  if (st.hpCurrent === 0 && st.status !== "dead") {
    st.dsFail = clamp(st.dsFail + 1, 0, 3);
    if (st.dsFail >= 3) st.status = "dead";
    save();
  }
});
el("btnSpendKi").addEventListener("click", () => {
  const k = Number(el("kiDelta").value || 0); if (k <= 0) return; setKi(st.kiCurrent - k);
});
el("btnGainKi").addEventListener("click", () => {
  const k = Number(el("kiDelta").value || 0); if (k <= 0) return; setKi(st.kiCurrent + k);
});

// Death saves
el("btnDsPlus").addEventListener("click", () => {
  if (st.status === "dead") return;
  st.dsSuccess = clamp(st.dsSuccess + 1, 0, 3);
  if (st.dsSuccess >= 3) st.status = "stable";
  save();
});
el("btnDsMinus").addEventListener("click", () => {
  if (st.status === "dead") return;
  st.dsFail = clamp(st.dsFail + 1, 0, 3);
  if (st.dsFail >= 3) st.status = "dead";
  save();
});
el("btnCrit").addEventListener("click", () => {
  setHP(Math.max(1, st.hpCurrent));
  st.dsSuccess = 0; st.dsFail = 0; st.status = "alive"; save();
});
el("btnCritFail").addEventListener("click", () => {
  if (st.status === "dead") return;
  st.dsFail = clamp(st.dsFail + 2, 0, 3);
  if (st.dsFail >= 3) st.status = "dead";
  save();
});
el("btnStabilize").addEventListener("click", () => {
  if (st.status !== "dead" && st.hpCurrent === 0) { st.status = "stable"; st.dsSuccess = 3; save(); }
});
el("btnHealFromZero").addEventListener("click", () => {
  const h = Number(el("hpDelta").value || 1); if (h <= 0) return;
  setHP(st.hpCurrent + h); st.dsSuccess = 0; st.dsFail = 0; st.status = "alive"; save();
});

// Short Rest: Ki max; spend HD (prompt)
el("btnShortRest").addEventListener("click", () => {
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

// Long Rest: full HP, Ki max, recover half HD (ceil) + level-up applies here only
el("btnLongRest").addEventListener("click", () => {
  const oldLevel = st.levelApplied;
  const newLevel = levelFromXP(st.xp);
  const leveledUp = newLevel > oldLevel;

  // приложи новото ниво
  st.levelApplied = newLevel;

  // пресметни по новото ниво
  const d = derived();

  // HD: ако има level-up -> пълним на макс; иначе възстановяваме половината (ceil)
  if (leveledUp) {
    st.hdAvail = d.hdMax;
  } else {
    const recover = Math.ceil(d.hdMax / 2);
    st.hdAvail = Math.min(d.hdMax, st.hdAvail + recover);
  }

  // Ki/HP и статут
  st.kiCurrent = d.kiMax;
  st.hpCurrent = d.maxHP;
  st.dsSuccess = 0; st.dsFail = 0; st.status = "alive";

  // (по желание) нотификация:
  // if (leveledUp) alert(`Вече сте ниво ${newLevel}.`);

  save();
});

// Export / Import / Reset
el("btnExport").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(st, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = (st.name || "monk") + "_sheet.json";
  document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); a.remove();
});
el("importFile").addEventListener("change", (e) => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { try { st = { ...defaultState, ...JSON.parse(reader.result) }; save(); } catch { alert("Грешен JSON."); } };
  reader.readAsText(file); e.target.value = "";
});
el("btnReset").addEventListener("click", () => {
  if (!confirm("Да нулирам всичко?")) return;
  st = { ...defaultState };
  const d = derived();
  st.hpCurrent = d.maxHP;
  st.kiCurrent = d.kiMax;
  st.hdAvail = d.hdMax;
  st.status = "alive"; st.dsSuccess = 0; st.dsFail = 0;
  save();
});

// PWA register (disabled on localhost to avoid caching during dev)
if ("serviceWorker" in navigator && location.hostname !== "localhost") {
  window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js"));
}
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredPrompt = e; el("btnInstall").classList.remove("hidden"); });
el("btnInstall").addEventListener("click", async () => {
  if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null;
  el("btnInstall").classList.add("hidden");
});

// --- Tiny IDB helpers (no deps) ---
function idbOpen(name = 'monkCloud', store = 'kv') {
  return new Promise((res, rej) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(store);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
function idbGet(key, name = 'monkCloud', store = 'kv') {
  return idbOpen(name, store).then(db => new Promise((res, rej) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error);
  }));
}
function idbSet(key, val, name = 'monkCloud', store = 'kv') {
  return idbOpen(name, store).then(db => new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(val, key);
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
  }));
}
function idbDel(key, name = 'monkCloud', store = 'kv') {
  return idbOpen(name, store).then(db => new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
  }));
}

async function cloudLink() {
  if (!("showSaveFilePicker" in window)) { alert("Cloud sync иска Chrome/Edge."); return; }
  try {
    cloudHandle = await window.showSaveFilePicker({
      suggestedName: (st.name || "monk") + "_sheet.json",
      types: [{ description: "JSON", accept: { "application/json": [".json"] } }]
    });
    await idbSet('cloudHandle', cloudHandle);   // <— запази handle-а
    await cloudWrite(true);
    cloudUiRefresh();
  } catch (e) { }
}

async function cloudUnlink() {
  cloudHandle = null;
  await idbDel('cloudHandle');                  // <— изтрий запазения handle
  cloudUiRefresh();
}

async function cloudRestore() {
  try {
    const h  = await idbGet('cloudHandle');
    if (!h) { cloudHandle = null; cloudUiRefresh(); return; }

    // проверка/искане на разрешение
    let perm = h.queryPermission ? await h.queryPermission({ mode: 'readwrite' }) : 'granted';
    if (perm === 'prompt' && h.requestPermission) {
      perm = await h.requestPermission({ mode: 'readwrite' });
    }
    if (perm === 'granted') {
      cloudHandle = h;
    } else {
      cloudHandle = null; // няма права -> няма линк
    }
    cloudUiRefresh();
  } catch (e) {
    console.warn('cloudRestore err', e);
    cloudHandle = null; cloudUiRefresh();
  }
}

await cloudRestore();

// First render
renderAll();

