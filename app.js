// ===== Helpers =====
const el = id => document.getElementById(id);
const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
const modFrom = (score)=>Math.floor((Number(score||0)-10)/2);

// ===== Tiny IndexedDB helpers (store the FileSystemFileHandle for backup) =====
const DB_NAME = "monk_backup_db";
const DB_STORE = "handles";
function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function idbGet(key) {
  return idbOpen().then(db => new Promise((resolve,reject)=>{
    const tx = db.transaction(DB_STORE, "readonly");
    const req = tx.objectStore(DB_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}
function idbSet(key, value) {
  return idbOpen().then(db => new Promise((resolve,reject)=>{
    const tx = db.transaction(DB_STORE, "readwrite");
    const req = tx.objectStore(DB_STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}
function idbDel(key) {
  return idbOpen().then(db => new Promise((resolve,reject)=>{
    const tx = db.transaction(DB_STORE, "readwrite");
    const req = tx.objectStore(DB_STORE).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}

// XP thresholds for levels 1..20 (PHB) = мин. XP за всяко ниво
const XP_THRESH = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000
];

// Martial Arts die by level
function maDie(level){
  if (level>=17) return "d10";
  if (level>=11) return "d8";
  if (level>=5) return "d6";
  return "d4";
}

// Proficiency bonus by level
function profBonus(level){
  if (level>=17) return 6;
  if (level>=13) return 5;
  if (level>=9) return 4;
  if (level>=5) return 3;
  return 2;
}

// Unarmored Movement bonus by level
function umBonus(level){
  if (level>=18) return 30;
  if (level>=14) return 25;
  if (level>=10) return 20;
  if (level>=6) return 15;
  if (level>=2) return 10;
  return 0;
}

// Base HP for Monk using fixed average (RAW) and retroactive CON mod
function baseHP(level, conMod){
  if (level<=0) return 0;
  let hp = 8 + conMod; // level 1
  if (level>=2){
    hp += (level-1) * (5 + conMod);
  }
  return hp;
}

// ===== State =====
const defaultState = {
  name:"Peace Oshiet",
  xp:0,
  level:1, // АКТИВНО ниво (прилага се на Long Rest)
  // abilities
  str:10, dex:10, con:10, int_:10, wis:10, cha:10,
  // saves profs
  saveStrProf:false, saveDexProf:true, saveConProf:false, saveIntProf:false, saveWisProf:true, saveChaProf:false,
  saveAllBonus:0,
  // skills
  skillProfs:{},
  // combat
  hpCurrent:10,
  kiCurrent:1,
  dsSuccess:0, dsFail:0, status:"alive",
  // resources
  hdAvail:1,
  // items/adjust
  acMagic:0, baseSpeed:30, tough:false, hpAdjust:0
};

let st = load();
migrate(); // за стари сейвове без st.level

function load(){
  try { const raw = localStorage.getItem("monkSheet_v2"); return raw? {...defaultState, ...JSON.parse(raw)} : {...defaultState}; }
  catch { return {...defaultState}; }
}

// ===== Backup state & helpers =====
const HAS_FSA = !!window.showSaveFilePicker; // Chrome/Edge/Android Chrome
let backupHandle = null;
let backupConnected = false;
let backupTimer = null;
const BACKUP_KEY = "backupHandle";
const BACKUP_DEBOUNCE_MS = 600;
let backupPending = false;

async function tryRestoreBackupHandle() {
  if (!HAS_FSA) return;
  try {
    const handle = await idbGet(BACKUP_KEY);
    if (!handle) return;
    const perm = await handle.queryPermission?.({ mode: "readwrite" }) || "granted";
    const granted = perm === "granted" || (await handle.requestPermission?.({ mode:"readwrite" })) === "granted";
    if (granted) {
      backupHandle = handle;
      backupConnected = true;
      const badge = el("backupBadge"); if (badge) badge.classList.remove("hidden");
    }
  } catch {}
}
async function connectBackup() {
  if (!HAS_FSA) { alert("Automatic backup is not supported in this browser. Use Export/Share instead."); return; }
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: (st.name || "monk") + "_sheet.json",
      types: [{ description: "JSON", accept: { "application/json": [".json"] } }]
    });
    backupHandle = handle;
    await idbSet(BACKUP_KEY, handle);
    backupConnected = true;
    const badge = el("backupBadge"); if (badge) badge.classList.remove("hidden");
    await doBackupNow();
    alert("Backup connected. Autosave enabled.");
  } catch (e) { /* canceled */ }
}
async function writeToHandle(handle, text) {
  const w = await handle.createWritable();
  await w.write(text);
  await w.close();
}
async function doBackupNow() {
  if (!backupConnected || !backupHandle) return;
  try {
    await writeToHandle(backupHandle, JSON.stringify(st, null, 2));
    // по желание: визуален feedback (напр. мигащ бейдж) — може да добавим
  } catch (e) {
    console.warn("Backup failed:", e);
  }
}
function scheduleBackup() {
  if (!backupConnected) return;
  backupPending = true;
  clearTimeout(backupTimer);
  backupTimer = setTimeout(async ()=>{
    if (!backupPending) return;
    backupPending = false;
    await doBackupNow();
  }, BACKUP_DEBOUNCE_MS);
}
async function loadFromBackup() {
  if (!backupConnected || !backupHandle) { alert("No connected backup file."); return; }
  try {
    const file = await backupHandle.getFile();
    const text = await file.text();
    const obj = JSON.parse(text);
    st = { ...defaultState, ...obj };
    if (typeof st.level !== "number" || !isFinite(st.level)) st.level = 1;
    save();
    alert("Loaded from backup.");
  } catch { alert("Failed to load from backup file."); }
}

function save(){
  localStorage.setItem("monkSheet_v2", JSON.stringify(st));
  renderAll();
  scheduleBackup();
}

function migrate(){
  if (typeof st.level !== "number" || !isFinite(st.level)) {
    st.level = 1;
    localStorage.setItem("monkSheet_v2", JSON.stringify(st));
  }
}

// ===== Derived getters =====
function levelFromXP(xp){
  let lvl = 1;
  for (let i = 20; i >= 1; i--) {
    if (xp >= XP_THRESH[i-1]) { lvl = i; break; }
  }
  return lvl;
}
function derived(){
  const level = st.level; // ползваме АКТИВНОТО ниво
  const mods = {
    str:modFrom(st.str), dex:modFrom(st.dex), con:modFrom(st.con), int_:modFrom(st.int_), wis:modFrom(st.wis), cha:modFrom(st.cha)
  };
  const prof = profBonus(level);
  const ma = maDie(level);
  const kiMax = level;
  const hdMax = level;
  const maxHP = baseHP(level, mods.con) + (st.tough? 2*level : 0) + Number(st.hpAdjust||0);
  const ac = 10 + mods.dex + mods.wis + Number(st.acMagic||0);
  const um = umBonus(level);
  const totalSpeed = Number(st.baseSpeed||0) + um;
  const savesBase = {
    str: mods.str + (st.saveStrProf? prof:0),
    dex: mods.dex + (st.saveDexProf? prof:0),
    con: mods.con + (st.saveConProf? prof:0),
    int_: mods.int_ + (st.saveIntProf? prof:0),
    wis: mods.wis + (st.saveWisProf? prof:0),
    cha: mods.cha + (st.saveChaProf? prof:0),
  };
  const allBonus = Number(st.saveAllBonus||0);
  const savesTotal = {
    str: savesBase.str + allBonus,
    dex: savesBase.dex + allBonus,
    con: savesBase.con + allBonus,
    int_: savesBase.int_ + allBonus,
    wis: savesBase.wis + allBonus,
    cha: savesBase.cha + allBonus,
  };
  const pendingLevel = levelFromXP(st.xp); // само за показване (tool-tip)
  return {level, pendingLevel, mods, prof, ma, kiMax, hdMax, maxHP, ac, um, totalSpeed, savesBase, savesTotal};
}

// ===== Skills table =====
const SKILLS = [
  ["Acrobatics","dex"],
  ["Animal Handling","wis"],
  ["Arcana","int_"],
  ["Athletics","str"],
  ["Deception","cha"],
  ["History","int_"],
  ["Insight","wis"],
  ["Intimidation","cha"],
  ["Investigation","int_"],
  ["Medicine","wis"],
  ["Nature","int_"],
  ["Perception","wis"],
  ["Performance","cha"],
  ["Persuasion","cha"],
  ["Religion","int_"],
  ["Sleight of Hand","dex"],
  ["Stealth","dex"],
  ["Survival","wis"]
];

// mapping + helper за бонуса на скил (за пасивките)
const SKILL_TO_ABILITY = {
  "Acrobatics":"dex","Animal Handling":"wis","Arcana":"int_","Athletics":"str",
  "Deception":"cha","History":"int_","Insight":"wis","Intimidation":"cha",
  "Investigation":"int_","Medicine":"wis","Nature":"int_","Perception":"wis",
  "Performance":"cha","Persuasion":"cha","Religion":"int_","Sleight of Hand":"dex",
  "Stealth":"dex","Survival":"wis"
};
function skillBonusTotal(name, mods, prof) {
  const abil = SKILL_TO_ABILITY[name];
  return (mods[abil] || 0) + (st.skillProfs[name] ? prof : 0);
}

function ensureSkillProfs(){ if (!st.skillProfs) st.skillProfs={}; SKILLS.forEach(([name])=>{ if (!(name in st.skillProfs)) st.skillProfs[name]=false; }); }
ensureSkillProfs();

function renderSkills(mods, prof){
  const body = el("skillsBody");
  if (!body) return;
  body.innerHTML = "";
  SKILLS.forEach(([name, abil])=>{
    const tr = document.createElement("tr");
    const profChecked = !!st.skillProfs[name];
    const bonus = (mods[abil]||0) + (profChecked? prof:0);
    tr.innerHTML = `<td>${name}</td>
      <td>${abil.toUpperCase()}</td>
      <td><input type="checkbox" ${profChecked? "checked": ""} data-skill="${name}"></td>
      <td class="right">${bonus>=0?"+":""}${bonus}</td>`;
    body.appendChild(tr);
  });
  body.querySelectorAll("input[type=checkbox]").forEach(chk=>{
    chk.addEventListener("change", (e)=>{
      const sk = e.target.getAttribute("data-skill");
      st.skillProfs[sk] = e.target.checked;
      save();
    });
  });
}

function renderSaves(d){
  const body = el("savesBody");
  if (!body) return;
  body.innerHTML = "";
  const names = [["STR","str"],["DEX","dex"],["CON","con"],["INT","int_"],["WIS","wis"],["CHA","cha"]];
  names.forEach(([label,key])=>{
    const base = d.savesBase[key];
    const total = d.savesTotal[key];
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${label}</td>
      <td>${base>=0?"+":""}${base}</td>
      <td>${Number(st.saveAllBonus||0)>=0?"+":""}${Number(st.saveAllBonus||0)}</td>
      <td class="right">${total>=0?"+":""}${total}</td>`;
    body.appendChild(tr);
  });
}

// ===== Tabs =====
document.addEventListener("click",(e)=>{
  if (e.target.classList.contains("tab-btn")){
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    e.target.classList.add("active");
    const tab = e.target.getAttribute("data-tab");
    el("tab-combat")?.classList.toggle("hidden", tab!=="combat");
    el("tab-stats")?.classList.toggle("hidden", tab!=="stats");
  }
});

// ===== Rendering =====
function renderAll(){
  const d = derived();

  // Level & basics
  const levelSpan = el("levelSpan");
  if (levelSpan) {
    levelSpan.textContent = d.level;
    levelSpan.title = (d.pendingLevel > d.level) ? `Pending: ${d.pendingLevel} (ще се приложи на Long Rest)` : "";
  }
  el("profSpan") && (el("profSpan").textContent = `+${d.prof}`);
  el("profSpan2") && (el("profSpan2").textContent = `+${d.prof}`);
  el("maDieSpan") && (el("maDieSpan").textContent = d.ma);
  el("kiMaxSpan") && (el("kiMaxSpan").textContent = d.kiMax);
  el("kiMaxSpan2") && (el("kiMaxSpan2").textContent = d.kiMax);
  el("hdMaxSpan") && (el("hdMaxSpan").textContent = d.hdMax);

  // Derived HP
  el("maxHpSpan") && (el("maxHpSpan").textContent = d.maxHP);
  el("hpMaxSpan") && (el("hpMaxSpan").textContent = d.maxHP);
  el("hpCurrentSpan") && (el("hpCurrentSpan").textContent = st.hpCurrent);

  // Ki
  el("kiCurrentSpan") && (el("kiCurrentSpan").textContent = st.kiCurrent);

  // AC & speed
  el("acSpan") && (el("acSpan").textContent = d.ac);
  el("acSpan2") && (el("acSpan2").textContent = d.ac);
  el("umBonusSpan") && (el("umBonusSpan").textContent = d.um);
  el("totalSpeedSpan") && (el("totalSpeedSpan").textContent = d.totalSpeed);
  el("lvl9Note") && (el("lvl9Note").textContent = (d.level>=9) ? "You can move along vertical surfaces and across liquids (during your move)." : "—");

  // Mods
  el("strModSpan") && (el("strModSpan").textContent = d.mods.str>=0? `+${d.mods.str}`: `${d.mods.str}`);
  el("dexModSpan") && (el("dexModSpan").textContent = d.mods.dex>=0? `+${d.mods.dex}`: `${d.mods.dex}`);
  el("conModSpan") && (el("conModSpan").textContent = d.mods.con>=0? `+${d.mods.con}`: `${d.mods.con}`);
  el("intModSpan") && (el("intModSpan").textContent = d.mods.int_>=0? `+${d.mods.int_}`: `${d.mods.int_}`);
  el("wisModSpan") && (el("wisModSpan").textContent = d.mods.wis>=0? `+${d.mods.wis}`: `${d.mods.wis}`);
  el("chaModSpan") && (el("chaModSpan").textContent = d.mods.cha>=0? `+${d.mods.cha}`: `${d.mods.cha}`);

  // Passive skills = 10 + скил бонус
  const perc = 10 + skillBonusTotal("Perception", d.mods, d.prof);
  const inv  = 10 + skillBonusTotal("Investigation", d.mods, d.prof);
  el("passPercSpan") && (el("passPercSpan").textContent = perc);
  el("passInvSpan") && (el("passInvSpan").textContent = inv);

  // Inputs reflect state
  el("charName") && (el("charName").value = st.name || "");
  el("xpInput") && (el("xpInput").value = st.xp);
  el("hdAvailInput") && (el("hdAvailInput").value = st.hdAvail);
  el("conInput") && (el("conInput").value = st.con);
  el("hpAdjInput") && (el("hpAdjInput").value = st.hpAdjust);
  el("toughChk") && (el("toughChk").checked = !!st.tough);
  el("acMagicInput") && (el("acMagicInput").value = st.acMagic);
  el("baseSpeedInput") && (el("baseSpeedInput").value = st.baseSpeed);
  el("strInput") && (el("strInput").value = st.str);
  el("dexInput") && (el("dexInput").value = st.dex);
  el("intInput") && (el("intInput").value = st.int_);
  el("wisInput") && (el("wisInput").value = st.wis);
  el("chaInput") && (el("chaInput").value = st.cha);
  el("saveDexProf") && (el("saveDexProf").checked = !!st.saveDexProf);
  el("saveStrProf") && (el("saveStrProf").checked = !!st.saveStrProf);
  el("saveConProf") && (el("saveConProf").checked = !!st.saveConProf);
  el("saveIntProf") && (el("saveIntProf").checked = !!st.saveIntProf);
  el("saveWisProf") && (el("saveWisProf").checked = !!st.saveWisProf);
  el("saveChaProf") && (el("saveChaProf").checked = !!st.saveChaProf);
  el("saveAllBonusInput") && (el("saveAllBonusInput").value = st.saveAllBonus);

  // Tables
  renderSaves(d);
  renderSkills(d.mods, d.prof);

  // Header status emoji
  let emoji = "🙂";
  if (st.status === "stable") emoji = "🛌";
  else if (st.status === "dead") emoji = "💀";
  else if (st.hpCurrent <= 0) emoji = "😵";
  el("lifeStatus") && (el("lifeStatus").textContent = emoji);

  // Backup badge visibility
  const badge = el("backupBadge");
  if (badge) badge.classList.toggle("hidden", !backupConnected);
}

// ===== Events: inputs =====
el("charName")?.addEventListener("input", ()=>{ st.name = el("charName").value; save(); });
el("xpInput")?.addEventListener("input", ()=>{
  st.xp = Math.max(0, Math.floor(Number(el("xpInput").value||0)));
  // level се прилага само на Long Rest
  const d = derived();
  st.hdAvail = clamp(st.hdAvail, 0, d.hdMax);
  st.kiCurrent = clamp(st.kiCurrent, 0, d.kiMax);
  save();
});

// abilities
["str","dex","con","int_","wis","cha"].forEach(key=>{
  const mapId = {str:"strInput", dex:"dexInput", con:"conInput", int_:"intInput", wis:"wisInput", cha:"chaInput"};
  const inp = el(mapId[key]); if (!inp) return;
  inp.addEventListener("input", ()=>{
    let v = Math.floor(Number(inp.value||0));
    st[key] = v;
    save();
  });
});

// items / adjust
el("toughChk")?.addEventListener("change", ()=>{ st.tough = el("toughChk").checked; save(); });
el("hpAdjInput")?.addEventListener("input", ()=>{ st.hpAdjust = Math.floor(Number(el("hpAdjInput").value||0)); save(); });
el("acMagicInput")?.addEventListener("input", ()=>{ st.acMagic = Math.floor(Number(el("acMagicInput").value||0)); save(); });
el("baseSpeedInput")?.addEventListener("input", ()=>{ st.baseSpeed = Math.floor(Number(el("baseSpeedInput").value||0)); save(); });
el("saveAllBonusInput")?.addEventListener("input", ()=>{
  let v = Math.floor(Number(el("saveAllBonusInput").value||0));
  v = Math.max(-5, Math.min(10, v));
  st.saveAllBonus = v; save();
});

// saves prof toggles
["Str","Dex","Con","Int","Wis","Cha"].forEach(S=>{
  const id = "save"+S+"Prof";
  const chk = el(id); if (!chk) return;
  chk.addEventListener("change", ()=>{ st[id] = chk.checked; save(); });
});

el("hdAvailInput")?.addEventListener("input", ()=>{
  const d = derived();
  st.hdAvail = clamp(Math.floor(Number(el("hdAvailInput").value||0)), 0, d.hdMax);
  save();
});

// ===== Combat actions =====
function setHP(v){
  const d = derived();
  st.hpCurrent = clamp(v, 0, d.maxHP);
  if (st.hpCurrent > 0){ st.status="alive"; st.dsSuccess=0; st.dsFail=0; }
  else if (st.hpCurrent===0 && st.status!=="dead"){ st.status = (st.dsSuccess>=3)?"stable":"unconscious"; }
  save();
}
function setKi(v){
  const d = derived();
  st.kiCurrent = clamp(v, 0, d.kiMax);
  save();
}

el("btnDamage")?.addEventListener("click", ()=>{
  const dVal = Number(el("hpDelta").value||0); if (dVal<=0) return;
  if (st.hpCurrent===0){
    st.dsFail = clamp(st.dsFail+1,0,3);
    if (st.dsFail>=3) st.status="dead";
    save();
  } else {
    setHP(st.hpCurrent - dVal);
    if (st.hpCurrent===0) st.status="unconscious";
  }
});
el("btnHeal")?.addEventListener("click", ()=>{
  const h = Number(el("hpDelta").value||0); if (h<=0) return; setHP(st.hpCurrent + h);
});
el("btnHitAtZero")?.addEventListener("click", ()=>{
  if (st.hpCurrent===0 && st.status!=="dead"){
    st.dsFail = clamp(st.dsFail+1,0,3);
    if (st.dsFail>=3) st.status="dead";
    save();
  }
});
el("btnSpendKi")?.addEventListener("click", ()=>{
  const k = Number(el("kiDelta").value||0); if (k<=0) return; setKi(st.kiCurrent - k);
});
el("btnGainKi")?.addEventListener("click", ()=>{
  const k = Number(el("kiDelta").value||0); if (k<=0) return; setKi(st.kiCurrent + k);
});

// Death saves
el("btnDsPlus")?.addEventListener("click", ()=>{
  if (st.status==="dead") return;
  st.dsSuccess = clamp(st.dsSuccess+1,0,3);
  if (st.dsSuccess>=3) st.status="stable";
  save();
});
el("btnDsMinus")?.addEventListener("click", ()=>{
  if (st.status==="dead") return;
  st.dsFail = clamp(st.dsFail+1,0,3);
  if (st.dsFail>=3) st.status="dead";
  save();
});
el("btnCrit")?.addEventListener("click", ()=>{
  setHP(Math.max(1, st.hpCurrent));
  st.dsSuccess=0; st.dsFail=0; st.status="alive"; save();
});
el("btnCritFail")?.addEventListener("click", ()=>{
  if (st.status==="dead") return;
  st.dsFail = clamp(st.dsFail+2,0,3);
  if (st.dsFail>=3) st.status="dead";
  save();
});
el("btnStabilize")?.addEventListener("click", ()=>{
  if (st.status!=="dead" && st.hpCurrent===0){ st.status="stable"; st.dsSuccess=3; save(); }
});
el("btnHealFromZero")?.addEventListener("click", ()=>{
  const h = Number(el("hpDelta").value||1); if (h<=0) return;
  setHP(st.hpCurrent + h); st.dsSuccess=0; st.dsFail=0; st.status="alive"; save();
});

// Short Rest (RAW): Ki to max; spend HD
el("btnShortRest")?.addEventListener("click", ()=>{
  const d = derived();
  st.kiCurrent = d.kiMax;
  if (st.hdAvail > 0){
    const maxDice = st.hdAvail;
    const ans = prompt(`Колко Hit Dice ще използваш? (0..${maxDice})`,`0`);
    if (ans!==null){
      let use = Math.max(0, Math.min(maxDice, Math.floor(Number(ans)||0)));
      if (use>0){
        const rolled = prompt(`Колко HP върнаха заровете (сума на d8)? Ще добавя + CON мод × ${use}.`, "0");
        if (rolled!==null){
          const heal = Math.max(0, Math.floor(Number(rolled)||0)) + d.mods.con * use;
          st.hdAvail -= use;
          setHP(st.hpCurrent + heal);
        }
      }
    }
  }
  save();
});

// Long Rest (RAW): full HP, Ki max, recover half HD (ceil), APPLY LEVEL-UP from XP
el("btnLongRest")?.addEventListener("click", ()=>{
  const oldLevel = st.level;
  const pending = levelFromXP(st.xp);
  let leveled = false;

  if (pending > oldLevel) {
    st.level = pending;
    leveled = true;
    // при увеличение на max HD, добавяме разликата към наличните (ако има)
    st.hdAvail = Math.min(st.level, st.hdAvail + (st.level - oldLevel));
  }

  const d = derived(); // вече по новото ниво, ако има

  // recover half of total hit dice (ceil)
  const recover = Math.ceil(d.hdMax / 2);
  st.hdAvail = Math.min(d.hdMax, st.hdAvail + recover);

  // full heal / ki
  st.kiCurrent = d.kiMax;
  st.hpCurrent = d.maxHP;
  st.dsSuccess=0; st.dsFail=0; st.status="alive";
  save();

  if (leveled) { setTimeout(()=>alert(`Вече сте ${st.level} ниво!`), 10); }
});

// Export / Import / Reset
el("btnExport")?.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(st, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = (st.name || "monk") + "_sheet.json";
  document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); a.remove();
});
el("importFile")?.addEventListener("change", (e) => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { try { st = { ...defaultState, ...JSON.parse(reader.result) }; if (typeof st.level!=="number") st.level=1; save(); } catch { alert("Грешен JSON."); } };
  reader.readAsText(file); e.target.value = "";
});
el("btnReset")?.addEventListener("click", ()=>{
  if (!confirm("Да нулирам всичко?")) return;
  st = {...defaultState};
  const d = derived();
  st.hpCurrent = d.maxHP;
  st.kiCurrent = d.kiMax;
  st.hdAvail = d.hdMax;
  st.status="alive"; st.dsSuccess=0; st.dsFail=0;
  save();
});

// Backup buttons (safe if missing)
el("btnConnectBackup")?.addEventListener("click", connectBackup);
el("btnBackupNow")?.addEventListener("click", doBackupNow);
el("btnLoadBackup")?.addEventListener("click", loadFromBackup);

// PWA install/register
let deferredPrompt=null;
window.addEventListener("beforeinstallprompt",(e)=>{ e.preventDefault(); deferredPrompt=e; el("btnInstall")?.classList.remove("hidden"); });
el("btnInstall")?.addEventListener("click", async ()=>{
  if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null;
  el("btnInstall")?.classList.add("hidden");
});
if ("serviceWorker" in navigator) { window.addEventListener("load", ()=>navigator.serviceWorker.register("service-worker.js")); }

// Try restore backup handle; final-save on hide
tryRestoreBackupHandle();
window.addEventListener("visibilitychange", ()=>{ if (document.visibilityState === "hidden") doBackupNow(); });
window.addEventListener("pagehide", ()=>{ doBackupNow(); });

// First render
renderAll();
