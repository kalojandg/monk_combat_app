// modifiers.js — pure calculations & helpers (no DOM)
export const clamp = (v, min, max) => Math.max(min, Math.min(max, Number(v||0)));
export const modFrom = (score) => Math.floor((Number(score||0) - 10) / 2);

// XP thresholds 1..20 (RAW)
export const XP_THRESH = [300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000];

export function maDie(level){
  if (level>=17) return "d10";
  if (level>=11) return "d8";
  if (level>=5) return "d6";
  return "d4";
}

export function profBonus(level){
  if (level>=17) return 6;
  if (level>=13) return 5;
  if (level>=9)  return 4;
  if (level>=5)  return 3;
  return 2;
}

export function umBonus(level){
  if (level>=18) return 30;
  if (level>=14) return 25;
  if (level>=10) return 20;
  if (level>=6)  return 15;
  if (level>=2)  return 10;
  return 0;
}

export function baseHP(level, conMod){
  // Level 1: 8 + CON; each next: + (5 + CON) average; rounded down
  const lvl = Math.max(1, Number(level||1));
  const first = 8 + conMod;
  const rest = (lvl-1) * (5 + conMod);
  return Math.max(1, first + rest);
}

export function levelFromXP(xp){
  const x = Number(xp||0);
  let lvl = 1;
  for (let i=0;i<XP_THRESH.length;i++){
    if (x >= XP_THRESH[i]) lvl = i+2; else break;
  }
  return lvl;
}

// Return a derived snapshot computed from the given state
export function derive(state){
  const level = levelFromXP(state.xp);
  const mods = {
    str: modFrom(state.str), dex: modFrom(state.dex), con: modFrom(state.con),
    int_: modFrom(state.int_), wis: modFrom(state.wis), cha: modFrom(state.cha)
  };
  const prof = profBonus(level);
  const ma = maDie(level);
  const kiMax = level;
  const hdMax = level;
  const formulaMaxHP = baseHP(level, mods.con) + (state.tough ? 2*level : 0) + Number(state.hpAdjust||0);
  const hbAdj = Number(state.hpHomebrew || 0);
  const maxHP = Math.max(1, Math.floor(formulaMaxHP + hbAdj));
  const ac = 10 + mods.dex + mods.wis + Number(state.acMagic||0);
  const um = umBonus(level);
  return { level, mods, prof, ma, kiMax, hdMax, maxHP, ac, um };
}