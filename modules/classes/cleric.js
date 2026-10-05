// ===== Class Profile: Cleric (Grave Domain, без мултиклас) =====
// Следва договора от modules/classes/monk.js дословно. app.js смята неутралната
// част (level, mods, prof, hdMax, maxHP, saves, rangedAtk) и слива derive() отгоре.
// Без ki, без martial arts die, без Unarmored Movement, без CHA spell DC.
(function () {
  'use strict';

  // Празно / null / 0 → няма стойност
  function num(v) {
    return (v === null || v === undefined || v === '') ? null : Number(v);
  }

  function derive(st, base) {
    const { mods, prof } = base;
    const acMagic = Number(st.acMagic || 0);

    // AC = броня + DEX (капнат от armorMaxDex) + магия; без броня → 10 + DEX + магия
    const armorAc = Number(st.armorAc || 0);
    const maxDex = num(st.armorMaxDex);
    const ac = armorAc > 0
      ? armorAc + (maxDex === null ? mods.dex : Math.min(mods.dex, maxDex)) + acMagic
      : 10 + mods.dex + acMagic;

    // Скоростта идва от расата — една стойност, без бонуси по ниво
    const totalSpeed = Number(st.baseSpeed || 0);

    const meleeAtk = 1 + mods.str + Number(st.unarmedMagic || 0);  // Unarmed strike: 1 + STR, мени се само от айтъми
    const meleeWeaponAtk = mods.str + prof + Number(st.meleeWeaponMagic || 0);  // Melee weapon attack (STR)

    // Spell Save DC / Spell Attack — само WIS
    const spellSaveDC_WIS = 8 + prof + mods.wis;
    const spellAtk_WIS    = prof + mods.wis;

    return { ac, totalSpeed, meleeAtk, meleeWeaponAtk, spellSaveDC_WIS, spellAtk_WIS };
  }

  window.CLASS_PROFILES = window.CLASS_PROFILES || {};
  window.CLASS_PROFILES.cleric = {
    id: 'cleric',
    label: 'Cleric',
    storageKey: 'cleric_v1',       // ⚠ собствен запис — НИКОГА monkSheet_v3 (живият монк)
    defaults: { armorAc: 0, armorMaxDex: null },  // armorMaxDex null = без таван
    derive,
    hiddenFieldIds: ['monkLevelSpan', 'maDieSpan', 'kiMaxSpan', 'kiSaveDcSpan2', 'kiSaveDcMagicInput', 'umBonusSpan'],
    hasClassBadges: false,         // линейна прогресия
    hasLevelUpModal: false,        // без избор на клас при level-up
    restoresKi: false              // няма ки
  };
})();
