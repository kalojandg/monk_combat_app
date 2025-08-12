// Helpers
const el = id => document.getElementById(id);
const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));

// State
const defaultState = {
  name: "Пийс Ошит",
  notes: "",
  hpMax: 10, hpCurrent: 10,
  kiMax: 2, kiCurrent: 2,
  ac: 10, prof: 2,
  dsSuccess: 0, dsFail: 0,
  status: "alive" // alive | stable | dead | unconscious
};
let st = load();

function load() {
  try {
    const raw = localStorage.getItem("monkSheet");
    if (!raw) return {...defaultState};
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed };
  } catch { return {...defaultState}; }
}
function persist() { localStorage.setItem("monkSheet", JSON.stringify(st)); }

function render() {
  // text
  el("charName").value = st.name;
  el("notes").value = st.notes;
  // top pills
  el("hpCurrentSpan").textContent = st.hpCurrent;
  el("kiCurrentSpan").textContent = st.kiCurrent;
  el("hpMaxInput").value = st.hpMax;
  el("kiMaxInput").value = st.kiMax;
  el("acInput").value = st.ac;
  el("profInput").value = st.prof;
  // death saves
  el("dsSuccess").textContent = st.dsSuccess;
  el("dsFail").textContent = st.dsFail;
  // emoji
  let emoji = "🙂";
  if (st.status === "stable") emoji = "🛌";
  else if (st.status === "dead") emoji = "💀";
  else if (st.hpCurrent <= 0) emoji = "😵";
  el("lifeStatus").textContent = emoji;
}

function save() { persist(); render(); }

function resetDeathSaves() {
  st.dsSuccess = 0; st.dsFail = 0;
  st.status = (st.hpCurrent > 0) ? "alive" : "unconscious";
}
function setHP(v) {
  st.hpCurrent = clamp(v, 0, st.hpMax);
  if (st.hpCurrent > 0) { st.status = "alive"; resetDeathSaves(); }
  else if (st.hpCurrent === 0 && st.status !== "dead") {
    st.status = (st.dsSuccess >=3) ? "stable" : "unconscious";
  }
  save();
}
function setKi(v) {
  st.kiCurrent = clamp(v, 0, st.kiMax);
  save();
}

// Inputs — update on input for immediate feedback
el("charName").addEventListener("input", ()=>{ st.name = el("charName").value; save(); });
el("notes").addEventListener("input", ()=>{ st.notes = el("notes").value; save(); });

// Max HP -> also fill current and clear death saves
el("hpMaxInput").addEventListener("input", ()=>{
  const v = Math.max(0, Math.floor(Number(el("hpMaxInput").value || 0)));
  st.hpMax = v;
  st.hpCurrent = v;        // <- fill to max
  resetDeathSaves();       // <- clear saves, set alive if > 0
  save();
});

// Max Ki -> also fill current
el("kiMaxInput").addEventListener("input", ()=>{
  const v = Math.max(0, Math.floor(Number(el("kiMaxInput").value || 0)));
  st.kiMax = v;
  st.kiCurrent = v;        // <- fill to max
  save();
});

el("acInput").addEventListener("input", ()=>{
  st.ac = Math.max(0, Math.floor(Number(el("acInput").value || 0)));
  save();
});
el("profInput").addEventListener("input", ()=>{
  st.prof = Math.max(0, Math.floor(Number(el("profInput").value || 0)));
  save();
});

// Quick HP
el("btnDamage").addEventListener("click", ()=>{
  const d = Number(el("hpDelta").value||0);
  if (d<=0) return;
  if (st.hpCurrent===0) {
    st.dsFail = clamp(st.dsFail+1,0,3);
    if (st.dsFail>=3) st.status = "dead";
    save();
  } else {
    setHP(st.hpCurrent - d);
    if (st.hpCurrent===0) st.status = "unconscious";
  }
});
el("btnHeal").addEventListener("click", ()=>{
  const h = Number(el("hpDelta").value||0);
  if (h<=0) return;
  setHP(st.hpCurrent + h);
});
el("btnHitAtZero").addEventListener("click", ()=>{
  if (st.hpCurrent===0 && st.status!=="dead") {
    st.dsFail = clamp(st.dsFail+1,0,3);
    if (st.dsFail>=3) st.status="dead";
    save();
  }
});

// Quick Ki
el("btnSpendKi").addEventListener("click", ()=>{
  const k = Number(el("kiDelta").value||0);
  if (k<=0) return;
  setKi(st.kiCurrent - k);
});
el("btnGainKi").addEventListener("click", ()=>{
  const k = Number(el("kiDelta").value||0);
  if (k<=0) return;
  setKi(st.kiCurrent + k);
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
  resetDeathSaves();
  st.status="alive"; save();
});
el("btnCritFail").addEventListener("click", ()=>{
  if (st.status==="dead") return;
  st.dsFail = clamp(st.dsFail+2,0,3);
  if (st.dsFail>=3) st.status="dead";
  save();
});
el("btnStabilize").addEventListener("click", ()=>{
  if (st.status!=="dead" && st.hpCurrent===0) {
    st.status="stable"; st.dsSuccess=3; save();
  }
});
el("btnHealFromZero").addEventListener("click", ()=>{
  const h = Number(el("hpDelta").value||1);
  if (h<=0) return;
  setHP(st.hpCurrent + h);
  resetDeathSaves();
  st.status="alive"; save();
});

// Export / Import / Reset same as before
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
  st.hpCurrent = st.hpMax;   // full to max
  st.kiCurrent = st.kiMax;   // full to max
  resetDeathSaves();
  st.status = "alive";
  save();
});

// PWA
let deferredPrompt=null;
window.addEventListener("beforeinstallprompt",(e)=>{ e.preventDefault(); deferredPrompt=e; document.getElementById("btnInstall").classList.remove("hidden"); });
document.getElementById("btnInstall").addEventListener("click", async ()=>{
  if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null;
  document.getElementById("btnInstall").classList.add("hidden");
});
if ("serviceWorker" in navigator) { window.addEventListener("load", ()=>navigator.serviceWorker.register("service-worker.js")); }

// First render
render();
