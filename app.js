// ===== Helpers =====
const el = id => document.getElementById(id);
const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
const modFrom = (score)=>Math.floor((Number(score||0)-10)/2);

// XP thresholds for levels 1..20 (PHB)
const XP_THRESH = [0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000];

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
function load(){
  try { const raw = localStorage.getItem("monkSheet_v2"); return raw? {...defaultState, ...JSON.parse(raw)} : {...defaultState}; }
  catch { return {...defaultState}; }
}
function save(){ localStorage.setItem("monkSheet_v2", JSON.stringify(st)); renderAll(); }

// ===== Derived getters =====
function levelFromXP(xp){
  let lvl = 1;
  for (let i=20;i>=2;i--){ if (xp>=XP_THRESH[i-2]) { lvl=i; break; } }
  return lvl;
}
function derived(){
  const level = levelFromXP(st.xp);
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
  return {level, mods, prof, ma, kiMax, hdMax, maxHP, ac, um, totalSpeed, savesBase, savesTotal};
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

function ensureSkillProfs(){ if (!st.skillProfs) st.skillProfs={}; SKILLS.forEach(([name])=>{ if (!(name in st.skillProfs)) st.skillProfs[name]=false; }); }
ensureSkillProfs();

function renderSkills(mods, prof){
  const body = el("skillsBody");
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
    el("tab-combat").classList.toggle("hidden", tab!=="combat");
    el("tab-stats").classList.toggle("hidden", tab!=="stats");
  }
});

// ===== Rendering =====
function renderAll(){
  const d = derived();

  // Level & basics
  el("levelSpan").textContent = d.level;
  el("profSpan").textContent = `+${d.prof}`;
  el("profSpan2").textContent = `+${d.prof}`;
  el("maDieSpan").textContent = d.ma;
  el("kiMaxSpan").textContent = d.kiMax;
  el("kiMaxSpan2").textContent = d.kiMax;
  el("hdMaxSpan").textContent = d.hdMax;

  // Derived HP
  el("maxHpSpan").textContent = d.maxHP;
  el("hpMaxSpan").textContent = d.maxHP;
  el("hpCurrentSpan").textContent = st.hpCurrent;

  // Ki
  el("kiCurrentSpan").textContent = st.kiCurrent;

  // AC & speed
  el("acSpan").textContent = d.ac;
  el("acSpan2").textContent = d.ac;
  el("umBonusSpan").textContent = d.um;
  el("totalSpeedSpan").textContent = d.totalSpeed;
  el("lvl9Note").textContent = (d.level>=9) ? "You can move along vertical surfaces and across liquids (during your move)." : "—";

  // Mods
  const mods = d.mods;
  el("strModSpan").textContent = mods.str>=0? `+${mods.str}`: `${mods.str}`;
  el("dexModSpan").textContent = mods.dex>=0? `+${mods.dex}`: `${mods.dex}`;
  el("conModSpan").textContent = mods.con>=0? `+${mods.con}`: `${mods.con}`;
  el("intModSpan").textContent = mods.int_>=0? `+${mods.int_}`: `${mods.int_}`;
  el("wisModSpan").textContent = mods.wis>=0? `+${mods.wis}`: `${mods.wis}`;
  el("chaModSpan").textContent = mods.cha>=0? `+${mods.cha}`: `${mods.cha}`;

  // Inputs reflect state
  el("charName").value = st.name || "";
  el("xpInput").value = st.xp;
  el("hdAvailInput").value = st.hdAvail;
  el("conInput").value = st.con;
  el("hpAdjInput").value = st.hpAdjust;
  el("toughChk").checked = !!st.tough;
  el("acMagicInput").value = st.acMagic;
  el("baseSpeedInput").value = st.baseSpeed;
  el("strInput").value = st.str;
  el("dexInput").value = st.dex;
  el("intInput").value = st.int_;
  el("wisInput").value = st.wis;
  el("chaInput").value = st.cha;
  el("saveDexProf").checked = !!st.saveDexProf;
  el("saveStrProf").checked = !!st.saveStrProf;
  el("saveConProf").checked = !!st.saveConProf;
  el("saveIntProf").checked = !!st.saveIntProf;
  el("saveWisProf").checked = !!st.saveWisProf;
  el("saveChaProf").checked = !!st.saveChaProf;
  el("saveAllBonusInput").value = st.saveAllBonus;

  // Tables
  renderSaves(d);
  renderSkills(d.mods, d.prof);

  // Header status emoji
  let emoji = "🙂";
  if (st.status === "stable") emoji = "🛌";
  else if (st.status === "dead") emoji = "💀";
  else if (st.hpCurrent <= 0) emoji = "😵";
  el("lifeStatus").textContent = emoji;
}

// ===== Events: inputs =====
el("charName").addEventListener("input", ()=>{ st.name = el("charName").value; save(); });
el("xpInput").addEventListener("input", ()=>{
  st.xp = Math.max(0, Math.floor(Number(el("xpInput").value||0)));
  const d = derived();
  st.hdAvail = clamp(st.hdAvail, 0, d.hdMax);
  st.kiCurrent = clamp(st.kiCurrent, 0, d.kiMax);
  save();
});

// abilities
["str","dex","con","int_","wis","cha"].forEach(key=>{
  const mapId = {str:"strInput", dex:"dexInput", con:"conInput", int_:"intInput", wis:"wisInput", cha:"chaInput"};
  el(mapId[key]).addEventListener("input", ()=>{
    let v = Math.floor(Number(el(mapId[key]).value||0));
    st[key] = v;
    save();
  });
});

// items / adjust
el("toughChk").addEventListener("change", ()=>{ st.tough = el("toughChk").checked; save(); });
el("hpAdjInput").addEventListener("input", ()=>{ st.hpAdjust = Math.floor(Number(el("hpAdjInput").value||0)); save(); });
el("acMagicInput").addEventListener("input", ()=>{ st.acMagic = Math.floor(Number(el("acMagicInput").value||0)); save(); });
el("baseSpeedInput").addEventListener("input", ()=>{ st.baseSpeed = Math.floor(Number(el("baseSpeedInput").value||0)); save(); });
el("saveAllBonusInput").addEventListener("input", ()=>{
  let v = Math.floor(Number(el("saveAllBonusInput").value||0));
  v = Math.max(-5, Math.min(10, v)); // clamp sanity
  st.saveAllBonus = v; save();
});

// saves prof toggles
["Str","Dex","Con","Int","Wis","Cha"].forEach(S=>{
  const id = "save"+S+"Prof";
  el(id).addEventListener("change", ()=>{ st[id] = el(id).checked; save(); });
});

el("hdAvailInput").addEventListener("input", ()=>{
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

el("btnDamage").addEventListener("click", ()=>{
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
el("btnHeal").addEventListener("click", ()=>{
  const h = Number(el("hpDelta").value||0); if (h<=0) return; setHP(st.hpCurrent + h);
});
el("btnHitAtZero").addEventListener("click", ()=>{
  if (st.hpCurrent===0 && st.status!=="dead"){
    st.dsFail = clamp(st.dsFail+1,0,3);
    if (st.dsFail>=3) st.status="dead";
    save();
  }
});
el("btnSpendKi").addEventListener("click", ()=>{
  const k = Number(el("kiDelta").value||0); if (k<=0) return; setKi(st.kiCurrent - k);
});
el("btnGainKi").addEventListener("click", ()=>{
  const k = Number(el("kiDelta").value||0); if (k<=0) return; setKi(st.kiCurrent + k);
});

// Death saves
el("btnDsPlus").addEventListener("click", ()=>{
  if (st.status==="dead") return;
  st.dsSuccess = clamp(st.dsSuccess+1,0,3);
  if (st.dsSuccess>=3) st.status="stable";
  save();
});
el("btnDsMinus").addEventListener("click", ()=>{
  if (st.status==="dead") return;
  st.dsFail = clamp(st.dsFail+1,0,3);
  if (st.dsFail>=3) st.status="dead";
  save();
});
el("btnCrit").addEventListener("click", ()=>{
  setHP(Math.max(1, st.hpCurrent));
  st.dsSuccess=0; st.dsFail=0; st.status="alive"; save();
});
el("btnCritFail").addEventListener("click", ()=>{
  if (st.status==="dead") return;
  st.dsFail = clamp(st.dsFail+2,0,3);
  if (st.dsFail>=3) st.status="dead";
  save();
});
el("btnStabilize").addEventListener("click", ()=>{
  if (st.status!=="dead" && st.hpCurrent===0){ st.status="stable"; st.dsSuccess=3; save(); }
});
el("btnHealFromZero").addEventListener("click", ()=>{
  const h = Number(el("hpDelta").value||1); if (h<=0) return;
  setHP(st.hpCurrent + h); st.dsSuccess=0; st.dsFail=0; st.status="alive"; save();
});

// Short Rest (RAW): Ki to max; spend HD
el("btnShortRest").addEventListener("click", ()=>{
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

// Long Rest (RAW): full HP, Ki max, recover half HD (ceil)
el("btnLongRest").addEventListener("click", ()=>{
  const d = derived();
  // recover half of total hit dice
  const recover = Math.ceil(d.hdMax / 2);
  st.hdAvail = Math.min(d.hdMax, st.hdAvail + recover);
  // full heal / ki
  st.kiCurrent = d.kiMax;
  st.hpCurrent = d.maxHP;
  st.dsSuccess=0; st.dsFail=0; st.status="alive";
  save();
});

// Export / Import / Reset
el("btnExport").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(st, null, 2)], {type: "application/json"});
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
el("btnReset").addEventListener("click", ()=>{
  if (!confirm("Да нулирам всичко?")) return;
  st = {...defaultState};
  // set current to derived max
  const d = derived();
  st.hpCurrent = d.maxHP;
  st.kiCurrent = d.kiMax;
  st.hdAvail = d.hdMax;
  st.status="alive"; st.dsSuccess=0; st.dsFail=0;
  save();
});

// PWA install/register
let deferredPrompt=null;
window.addEventListener("beforeinstallprompt",(e)=>{ e.preventDefault(); deferredPrompt=e; document.getElementById("btnInstall").classList.remove("hidden"); });
document.getElementById("btnInstall").addEventListener("click", async ()=>{
  if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null;
  document.getElementById("btnInstall").classList.add("hidden");
});
if ("serviceWorker" in navigator) { window.addEventListener("load", ()=>navigator.serviceWorker.register("service-worker.js")); }

// First render
renderAll();
