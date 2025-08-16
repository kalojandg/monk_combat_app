// state.js — single source of truth + persistence (no DOM)
const STORAGE_KEY = "monkSheet_v3";

export const defaultState = {
  name:"Пийс Ошит",
  notes:"",
  xp:0,
  str:10, dex:10, con:10, int_:10, wis:10, cha:10,
  saveStrProf:false, saveDexProf:true, saveConProf:false, saveIntProf:false, saveWisProf:true, saveChaProf:false,
  saveAllBonus:0,
  skillProfs:{},
  hpCurrent:10,
  hpHomebrew: null,
  kiCurrent:1,
  dsSuccess:0, dsFail:0, status:"alive",
  hdAvail:1,
  acMagic:0, baseSpeed:30, tough:false, hpAdjust:0,
  // Future-proof: appliedLevel kept separate if used later
  appliedLevel: null
};

let st = loadLocal();

const subs = new Set();
function notify(){ subs.forEach(fn=>{ try{ fn(getState()); }catch{} }) }

export function onChange(fn){ subs.add(fn); return ()=>subs.delete(fn); }

export function getState(){ return st; } // returns live reference

export function replaceState(next){
  st = { ...defaultState, ...(next||{}) };
  saveLocal();
  notify();
  return st;
}

export function setState(patch){
  Object.assign(st, patch||{});
  saveLocal();
  notify();
  return st;
}

export function loadLocal(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultState, ...JSON.parse(raw) } : { ...defaultState };
  }catch{
    return { ...defaultState };
  }
}

export function saveLocal(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(st)); }catch{}
}

export function serialize(){ return JSON.stringify(st); }
export function hydrate(jsonString){
  try{
    const obj = JSON.parse(jsonString);
    replaceState(obj);
  }catch(e){
    throw new Error("Invalid JSON");
  }
}