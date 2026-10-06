// ===== Class Profile: Monk =====
// Монашеската математика, изнесена от derived() в app.js. app.js смята неутралната
// част (level, mods, prof, hdMax, maxHP, saves, rangedAtk) и слива derive() отгоре.
// Договорът по-долу е общ за всички профили (cleric.js го следва дословно).
(function () {
  'use strict';

  // Martial Arts die по ниво
  function maDie(level) {
    if (level >= 17) return "d10";
    if (level >= 11) return "d8";
    if (level >= 5) return "d6";
    return "d4";
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

  function derive(st, base) {
    const { mods, prof } = base;
    // Monk level drives: Ki, Martial Arts die, Unarmored Movement
    const monkLevel = st.monkLevel || 1;
    const ma = maDie(monkLevel);
    // Над 20-то ниво кампанията дава нива по милион опит, но класовата прогресия спира —
    // расте само кръвта. maDie и umBonus се изравняват сами (17+/18+), ки — не, затова тук.
    const kiMax = Math.min(monkLevel, 20);

    const ac = 10 + mods.dex + mods.wis + Number(st.acMagic || 0);
    const um = umBonus(monkLevel);
    const totalSpeed = Number(st.baseSpeed || 0) + um;

    const meleeAtk = mods.dex + prof + Number(st.unarmedMagic || 0);  // Unarmed attack uses unarmedMagic
    const meleeWeaponAtk = mods.dex + prof + Number(st.meleeWeaponMagic || 0);  // Melee weapon attack

    // Ki Save DC = 8 + WIS mod + Prof + Magic bonus
    const kiSaveDC = 8 + mods.wis + prof + Number(st.kiSaveDcMagic || 0);

    // Spell Save DC / Spell Attack — WIS (Cleric) and CHA (Mark of Shadow)
    const spellSaveDC_WIS = 8 + prof + mods.wis;
    const spellAtk_WIS    = prof + mods.wis;
    const spellSaveDC_CHA = 8 + prof + mods.cha;
    const spellAtk_CHA    = prof + mods.cha;

    return { ma, kiMax, ac, um, totalSpeed, meleeAtk, meleeWeaponAtk, kiSaveDC, spellSaveDC_WIS, spellAtk_WIS, spellSaveDC_CHA, spellAtk_CHA };
  }

  window.CLASS_PROFILES = window.CLASS_PROFILES || {};
  window.CLASS_PROFILES.monk = {
    id: 'monk',
    label: 'Monk',
    storageKey: 'monkSheet_v3',   // ⚠ НЕ СЕ ПРОМЕНЯ — живи герои и ~51 спека сеят този ключ
    defaults: {},                  // допълнителни полета към defaultState (монкът няма нови)
    derive,
    hiddenFieldIds: [],            // id-та, чийто .field контейнер се скрива (монкът не крие нищо)
    hasClassBadges: true,          // баджовете горе вляво
    hasLevelUpModal: true,         // избор на клас при level-up
    restoresKi: true,              // почивките пълнят ки
    // Табовете, които героят вижда, в реда на показване (ключовете от data-tab в index.html)
    tabs: ['stats', 'pcchar', 'resurrection', 'inventory', 'flavor', 'skills', 'sessionNotes', 'namegen', 'campaignNpc'],
    // JSON-ите на Skills → Personal: монашките умения + Death Domain дипът
    featureFiles: ['skills-and-features.json', 'cleric-features.json'],
    // Изричен списък, а не null: откакто клерикът си има СВОИ flavor бутони
    // (insult-grave, cancel-crit), „всички" вече не значи „неговите". Съдържанието е
    // непроменено — това са същите 19 бутона, които монкът вижда и досега.
    flavorTypes: [
      'crit-miss', 'miss-attack', 'crit-attack', 'suffer-crit', 'combat-tease',
      'magic', 'qa', 'social', 'magic-cocktails',
      'life-wisdom', 'game-cheating', 'excuses', 'storytime', 'slipaway',
      'insult', 'dark-joke', 'tasha',
      'spare-dying', 'heal-zero',
    ],
    ttsVoice: null                 // TTS глас (null = конфигурацията по подразбиране в tts.js)
  };
})();
