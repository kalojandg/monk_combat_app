// cloud.js — File System Access API + IndexedDB handle persistence
import { serialize, replaceState } from "./state.js";

const DB_NAME = "monkSheetCloudDB";
const DB_STORE = "handles";
const DB_KEY = "cloudFileHandle";
let cloudHandle = null;

function debounce(fn, ms=800){
  let t=null;
  return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); };
}

// IndexedDB helpers
function idbOpen(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME,1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    req.onsuccess = ()=>resolve(req.result);
    req.onerror = ()=>reject(req.error);
  });
}
async function idbSet(key, val){
  const db = await idbOpen();
  return new Promise((res,rej)=>{
    const tx = db.transaction(DB_STORE,"readwrite");
    tx.objectStore(DB_STORE).put(val, key);
    tx.oncomplete = ()=>res();
    tx.onerror = ()=>rej(tx.error);
  });
}
async function idbGet(key){
  const db = await idbOpen();
  return new Promise((res,rej)=>{
    const tx = db.transaction(DB_STORE,"readonly");
    const req = tx.objectStore(DB_STORE).get(key);
    req.onsuccess = ()=>res(req.result||null);
    req.onerror = ()=>rej(req.error);
  });
}

export function isLinked(){ return !!cloudHandle; }

export async function link(){
  try{
    const handle = await window.showSaveFilePicker({
      suggestedName: "monk_sheet.json",
      types: [{ description:"JSON", accept:{ "application/json":[".json"] } }]
    });
    cloudHandle = handle;
    await idbSet(DB_KEY, handle);
    await pushNow();
    return true;
  }catch{ return false; }
}

export async function restore(){
  try{
    const h = await idbGet(DB_KEY);
    if (!h){ cloudHandle=null; return; }
    // test permission (will request later on first use if needed)
    await h.queryPermission({mode:"readwrite"});
    cloudHandle = h;
  }catch{ cloudHandle=null; }
}

export async function pull(){
  if (!cloudHandle) return false;
  try{
    let perm = await cloudHandle.queryPermission({mode:"read"});
    if (perm !== "granted"){
      perm = await cloudHandle.requestPermission({mode:"read"});
      if (perm !== "granted") return false;
    }
    const file = await cloudHandle.getFile();
    const text = await file.text();
    replaceState(JSON.parse(text));
    return true;
  }catch(e){ alert("Cloud pull error."); return false; }
}

async function pushNow(){
  if (!cloudHandle) return false;
  try{
    let perm = await cloudHandle.queryPermission({mode:"readwrite"});
    if (perm !== "granted"){
      perm = await cloudHandle.requestPermission({mode:"readwrite"});
      if (perm !== "granted") return false;
    }
    const writable = await cloudHandle.createWritable();
    await writable.write(new Blob([ serialize() ], {type:"application/json"}));
    await writable.close();
    return true;
  }catch{ return false; }
}

export const schedulePush = debounce(()=>{ pushNow(); }, 1000);