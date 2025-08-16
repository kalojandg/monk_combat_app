// ui.js — DOM rendering and event listeners
import { getState, setState, replaceState, defaultState, onChange, serialize } from "./state.js";
import { derive, modFrom, clamp } from "./modifiers.js";
import * as cloud from "./cloud.js";

const el = (id)=>document.getElementById(id);

// ---- Skills map (name -> ability) ----
const SKILLS = [
  ["Acrobatics","dex"], ["Animal Handling","wis"], ["Arcana","int_"],
  ["Athletics","str"], ["Deception","cha"], ["History","int_"],
  ["Insight","wis"], ["Intimidation","cha"], ["Investigation","int_"],
  ["Medicine","wis"], ["Nature","int_"], ["Perception","wis"],
  ["Performance","cha"], ["Persuasion","cha"], ["Religion","int_"],
  ["Sleight of Hand","dex"], ["Stealth","dex"], ["Survival","wis"]
];

function ensureSkillProfs(){
  const st = getState();
  if (!st.skillProfs) st.skillProfs = {};
  SKILLS.forEach(([name])=>{ if (!(name in st.skillProfs)) st.skillProfs[name]=false; });
}

function skillBonusTotal(name, mods, prof){
  const st = getState();
  const abil = SKILLS.find(s=>s[0]===name)?.[1] || "dex";
  const profBonus = (st.skillProfs && st.skillProfs[name]) ? prof : 0;
  const modVal = mods[abil] || 0;
  return modVal + profBonus;
}

// ---- Rendering ----
export function renderAll(){
  ensureSkillProfs();
  const st = getState();
  const d = derive(st);

  // Emoji status
  let emoji = "🙂";
  if (st.status === "stable") emoji = "🛌";
  else if (st.status === "dead") emoji = "💀";
  else if (st.hpCurrent <= 0) emoji = "😵";
  if (el("lifeStatus")) el("lifeStatus").textContent = emoji;

  // Combat pills
  if (el("hpCurrentSpan")) el("hpCurrentSpan").textContent = st.hpCurrent;
  if (el("hpMaxSpan")) el("hpMaxSpan").textContent = d.maxHP;
  if (el("kiCurrentSpan")) el("kiCurrentSpan").textContent = st.kiCurrent;
  if (el("kiMaxSpan2")) el("kiMaxSpan2").textContent = d.kiMax;
  if (el("acSpan")) el("acSpan").textContent = d.ac;

  // Top panel values
  if (el("charName")) el("charName").value = st.name || "";
  if (el("xpInput")) el("xpInput").value = st.xp;
  if (el("levelSpan")) el("levelSpan").textContent = d.level;
  if (el("maDieSpan")) el("maDieSpan").textContent = d.ma;
  if (el("profSpan")) el("profSpan").textContent = `+${d.prof}`;
  if (el("baseSpeedSpan")) el("baseSpeedSpan").textContent = (Number(st.baseSpeed||30) + d.um);

  // Stats & mods
  const mods = d.mods;
  const statMap = { str:"str", dex:"dex", con:"con", int_:"int_", wis:"wis", cha:"cha" };
  Object.entries(statMap).forEach(([id,key])=>{
    if (el(id)) el(id).value = st[key];
    const modEl = el(id+"ModSpan");
    if (modEl){
      const v = mods[key];
      modEl.textContent = v>=0? `+${v}` : `${v}`;
    }
  });

  // AC, Ki/HD, notes
  const hbEl = el("homebrewHp");
  if (hbEl) hbEl.value = (st.hpHomebrew === null || st.hpHomebrew === "") ? "" : st.hpHomebrew;
  if (el("hdMaxSpan")) el("hdMaxSpan").textContent = d.hdMax;
  if (el("hdAvailSpan")) el("hdAvailSpan").textContent = st.hdAvail;
  if (el("kiMaxSpan")) el("kiMaxSpan").textContent = d.kiMax;
  if (el("acSpan2")) el("acSpan2").textContent = d.ac;
  if (el("umBonusSpan")) el("umBonusSpan").textContent = d.um;
  if (el("passPercSpan")) el("passPercSpan").textContent = 10 + skillBonusTotal("Perception", d.mods, d.prof);
  if (el("passInvSpan")) el("passInvSpan").textContent = 10 + skillBonusTotal("Investigation", d.mods, d.prof);
  if (el("passInsSpan")) el("passInsSpan").textContent = 10 + skillBonusTotal("Insight", d.mods, d.prof);
  if (el("notes")) el("notes").value = st.notes || "";

  renderSkills(d.mods, d.prof);
  renderDeathSaves();
  cloudDotRefresh();
}

function renderSkills(mods, prof){
  const st = getState();
  const body = el("skillsBody");
  if (!body) return;
  body.innerHTML = "";
  SKILLS.forEach(([name, abil])=>{
    const profd = !!(st.skillProfs && st.skillProfs[name]);
    const val = (mods[abil]||0) + (profd? prof : 0);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input type="checkbox" data-skill="${name}" ${profd?"checked":""}/></td>
      <td>${name}</td>
      <td>${abil.toUpperCase().replace("_","")}</td>
      <td>${val>=0? "+"+val : val}</td>
    `;
    body.appendChild(row);
  });
  // bind once for new checkboxes
  body.querySelectorAll('input[type=checkbox]').forEach(chk=>{
    chk.addEventListener("change",(e)=>{
      const sk = e.target.getAttribute("data-skill");
      const st = getState();
      if (!st.skillProfs) st.skillProfs = {};
      st.skillProfs[sk] = e.target.checked;
      setState({}); // trigger save & render
    });
  });
}

function renderDeathSaves(){
  const st = getState();
  const s = st.dsSuccess, f = st.dsFail;
  const sIds = ["dsS1","dsS2","dsS3"], fIds = ["dsF1","dsF2","dsF3"];
  sIds.forEach((id, i)=>{
    const n = el(id); if (!n) return;
    n.classList.toggle("active", s > i);
  });
  fIds.forEach((id, i)=>{
    const n = el(id); if (!n) return;
    const active = f > i;
    n.classList.toggle("active", active);
    n.classList.toggle("lvl2", f >= 2 && i <= 1);
    n.classList.toggle("lvl3", f >= 3 && i <= 2);
  });
  const ov = el("youDiedOverlay");
  if (ov) ov.classList.toggle("hidden", st.status !== "dead");
}

// ---- Listeners ----
function setHP(v){
  const st = getState();
  const d = derive(st);
  if (st.status === "dead") return;
  st.hpCurrent = clamp(v, 0, d.maxHP);
  if (st.hpCurrent > 0){ st.status="alive"; st.dsSuccess=0; st.dsFail=0; }
  else if (st.hpCurrent===0 && st.status!=="dead"){ st.status = (st.dsSuccess>=3)?"stable":"unconscious"; }
  setState({});
}

function setKi(v){
  const st = getState();
  const d = derive(st);
  st.kiCurrent = clamp(v, 0, d.kiMax);
  setState({});
}

function attachCombatListeners(){
  const st = getState();
  // HP inputs
  el("btnDmg") && el("btnDmg").addEventListener("click", ()=>{
    const n = Number(el("hpDelta").value||0);
    setHP(getState().hpCurrent - n);
  });
  el("btnHeal") && el("btnHeal").addEventListener("click", ()=>{
    const n = Number(el("hpDelta").value||0);
    setHP(getState().hpCurrent + n);
  });
  el("btnHealFromZero") && el("btnHealFromZero").addEventListener("click", ()=>{
    setHP(Math.max(1, getState().hpCurrent)); // wake up at 1
  });

  // Ki inputs
  el("btnKiSpend") && el("btnKiSpend").addEventListener("click", ()=>{
    const n = Number(el("kiDelta").value||0);
    setKi(getState().kiCurrent - n);
  });
  el("btnKiGain") && el("btnKiGain").addEventListener("click", ()=>{
    const n = Number(el("kiDelta").value||0);
    setKi(getState().kiCurrent + n);
  });

  // Short / Long rest
  el("btnShortRest") && el("btnShortRest").addEventListener("click", ()=>{
    const d = derive(getState());
    const st = getState();
    if (st.hdAvail<=0){ alert("Няма останали Hit Dice."); return; }
    st.hdAvail = Math.max(0, st.hdAvail - 1);
    // simple: heal for 1d8+CON average (5+CON)
    const healed = 5 + (d.mods.con||0);
    setHP(st.hpCurrent + healed);
    setState({});
  });

  el("btnLongRest") && el("btnLongRest").addEventListener("click", ()=>{
    const d = derive(getState());
    const st = getState();
    st.hdAvail = d.hdMax;
    st.kiCurrent = d.kiMax;
    st.status = "alive"; st.dsSuccess=0; st.dsFail=0;
    setHP(d.maxHP);
    setState({});
  });

  // Death saves buttons
  el("btnDsSucc") && el("btnDsSucc").addEventListener("click", ()=>{
    const st = getState();
    st.dsSuccess = clamp(st.dsSuccess+1, 0, 3);
    if (st.dsSuccess>=3){ st.status="stable"; }
    setState({});
  });
  el("btnDsFail") && el("btnDsFail").addEventListener("click", ()=>{
    const st = getState();
    st.dsFail = clamp(st.dsFail+1, 0, 3);
    if (st.dsFail>=3){ st.status="dead"; }
    setState({});
  });
  el("btnDsCritSucc") && el("btnDsCritSucc").addEventListener("click", ()=>{
    const st = getState();
    st.dsSuccess = Math.min(3, st.dsSuccess+2);
    if (st.dsSuccess>=3){ st.status="stable"; }
    setState({});
  });
  el("btnDsCritFail") && el("btnDsCritFail").addEventListener("click", ()=>{
    const st = getState();
    st.dsFail = Math.min(3, st.dsFail+2);
    if (st.dsFail>=3){ st.status="dead"; }
    setState({});
  });
  el("btnResurrect") && el("btnResurrect").addEventListener("click", ()=>{
    const st = getState();
    st.status="alive"; st.dsSuccess=0; st.dsFail=0;
    setHP(1);
  });
}

function attachTopPanelListeners(){
  // Name, Notes
  el("charName") && el("charName").addEventListener("input", ()=>{ setState({ name: el("charName").value }); });
  el("notes") && el("notes").addEventListener("input", ()=>{ setState({ notes: el("notes").value }); });

  // XP
  el("xpInput") && el("xpInput").addEventListener("input", ()=>{
    const xp = Math.max(0, Math.floor(Number(el("xpInput").value||0)));
    const st = getState();
    st.xp = xp;
    // adjust dependent pools when level changes
    const d = derive(st);
    st.hdAvail = Math.min(st.hdAvail, d.hdMax);
    st.kiCurrent = Math.min(st.kiCurrent, d.kiMax);
    setHP(Math.min(st.hpCurrent, d.maxHP));
    setState({});
  });

  // Stats map
  const mapId = { str:"str", dex:"dex", con:"con", int_:"int_", wis:"wis", cha:"cha" };
  Object.entries(mapId).forEach(([id,key])=>{
    if (el(id)) el(id).addEventListener("input", ()=>{
      const st = getState();
      st[key] = Math.max(1, Math.floor(Number(el(id).value||0)));
      setState({});
    });
  });

  // Tough feat, AC magic, Save all bonus
  el("toughChk") && el("toughChk").addEventListener("change", ()=>{ setState({ tough: !!el("toughChk").checked }); });
  el("acMagicInput") && el("acMagicInput").addEventListener("input", ()=>{
    setState({ acMagic: Math.floor(Number(el("acMagicInput").value||0)) });
  });
  el("saveAllBonusInput") && el("saveAllBonusInput").addEventListener("input", ()=>{
    const v = Math.floor(Number(el("saveAllBonusInput").value||0));
    setState({ saveAllBonus: v });
  });

  // Saving throw prof checkboxes (ids match state keys)
  ["saveStrProf","saveDexProf","saveConProf","saveIntProf","saveWisProf","saveChaProf"].forEach(id=>{
    if (el(id)) el(id).addEventListener("change", ()=>{
      const st = getState(); st[id] = el(id).checked; setState({});
    });
  });

  // Homebrew HP additive
  const hbInput = el("homebrewHp");
  if (hbInput){
    hbInput.addEventListener("input", ()=>{
      const raw = hbInput.value;
      if (raw==="" || raw===null){ setState({ hpHomebrew: null }); }
      else { setState({ hpHomebrew: Math.floor(Number(raw||0)) }); }
    });
  }
}

function attachTabs(){
  document.addEventListener("click",(e)=>{
    const tabBtn = e.target.closest("[data-tab]");
    if (!tabBtn) return;
    const tab = tabBtn.getAttribute("data-tab");
    document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active", b===tabBtn));
    document.querySelectorAll(".tab").forEach(p=>p.classList.add("hidden"));
    const pane = document.querySelector(`#${tab}`);
    if (pane) pane.classList.remove("hidden");
  });
}

function attachImportExport(){
  // Export
  el("btnExport") && el("btnExport").addEventListener("click", ()=>{
    const blob = new Blob([ serialize() ], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "monk_sheet.json";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  });
  // Import
  el("importFile") && el("importFile").addEventListener("change",(e)=>{
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{ replaceState(JSON.parse(reader.result)); }
      catch{ alert("Грешен JSON."); }
    };
    reader.readAsText(file); e.target.value="";
  });
  // Reset
  el("btnReset") && el("btnReset").addEventListener("click", ()=>{
    if (!confirm("Да нулирам всичко?")) return;
    replaceState({ ...defaultState });
    const d = derive(getState());
    const st = getState();
    st.hpCurrent = d.maxHP;
    st.kiCurrent = d.kiMax;
    st.hdAvail = d.hdMax;
    st.status="alive"; st.dsSuccess=0; st.dsFail=0;
    setState({});
  });
}

function attachCloud(){
  // Link
  el("btnCloudLink") && el("btnCloudLink").addEventListener("click", async ()=>{
    const ok = await cloud.link();
    cloudDotRefresh();
    if (ok) cloud.schedulePush(); // initial write already done in link()
  });
  // Pull
  el("btnCloudPull") && el("btnCloudPull").addEventListener("click", async ()=>{
    await cloud.pull();
  });
}

function cloudDotRefresh(){
  const dot = el("cloudDot");
  if (!dot) return;
  if (cloud.isLinked()){
    dot.classList.add("ok"); dot.title = "Cloud linked";
  } else {
    dot.classList.remove("ok"); dot.title = "Not linked";
  }
}

function attachPWA(){
  if ("serviceWorker" in navigator && location.hostname !== "localhost"){
    window.addEventListener("load", ()=>navigator.serviceWorker.register("service-worker.js"));
  }
  let deferredPrompt=null;
  el("btnInstall") && window.addEventListener("beforeinstallprompt",(e)=>{
    e.preventDefault(); deferredPrompt=e; el("btnInstall").classList.remove("hidden");
  });
  el("btnInstall") && el("btnInstall").addEventListener("click", async ()=>{
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt=null;
    el("btnInstall").classList.add("hidden");
  });
}

export async function attachListeners(){
  attachTopPanelListeners();
  attachCombatListeners();
  attachTabs();
  attachImportExport();
  attachCloud();
  attachPWA();
  // Re-render on any state change and schedule cloud push if linked
  onChange(()=>{ renderAll(); if (cloud.isLinked()) cloud.schedulePush(); });
}

export async function init(){
  await cloud.restore(); // try restore handle
  renderAll();
}