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

  // ===== Armor AC / Max DEX входове (tabs/stats-basicinfo.html) =====
  // app.js не знае за тях: слушателите са делегирани на document (партиалът се зарежда
  // лениво), а видимостта е ОБРАТНАТА на hiddenFieldIds — редът #armorRow е display:none
  // в HTML-а и се показва само при активен клерик. Синхронизира се при всяка промяна на
  // DOM-а (зареждане на партиала) и след всеки renderAll() (смяна на профил/import).
  function isCleric() {
    return typeof window.activeProfile === 'function' && window.activeProfile().id === 'cleric';
  }

  function syncArmorFields() {
    const row = document.getElementById('armorRow');
    if (!row) return;
    const show = isCleric();
    row.style.display = show ? '' : 'none';
    if (!show || !window.st) return;
    const ac = document.getElementById('armorAcInput');
    const dex = document.getElementById('armorMaxDexInput');
    // Не презаписвай полето, което се пише в момента
    if (ac && ac !== document.activeElement) ac.value = Number(window.st.armorAc || 0) || '';
    if (dex && dex !== document.activeElement) dex.value = num(window.st.armorMaxDex) === null ? '' : window.st.armorMaxDex;
  }

  document.addEventListener('input', e => {
    const id = e.target && e.target.id;
    if (id !== 'armorAcInput' && id !== 'armorMaxDexInput') return;
    if (!isCleric()) return;
    const raw = e.target.value;
    if (id === 'armorAcInput') {
      window.st.armorAc = raw === '' ? 0 : Math.floor(Number(raw));
    } else {
      window.st.armorMaxDex = raw === '' ? null : Math.floor(Number(raw));  // празно = без таван
    }
    window.save();
  });

  document.addEventListener('DOMContentLoaded', () => {
    new MutationObserver(syncArmorFields).observe(document.body, { childList: true, subtree: true });
    if (typeof window.renderAll === 'function') {
      const origRenderAll = window.renderAll;
      window.renderAll = function () {
        const r = origRenderAll.apply(this, arguments);
        syncArmorFields();
        return r;
      };
    }
    syncArmorFields();
  });

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
    restoresKi: false,             // няма ки
    // Като монка, но Spellcasting стои на мястото на Resurrection
    tabs: ['stats', 'pcchar', 'spellcasting', 'inventory', 'flavor', 'skills', 'sessionNotes', 'namegen', 'campaignNpc'],
    featureFiles: ['grave-features.json'],
    // Клерикът има СВОИ обиди (insult-grave заменя монашеския insult) + отмяна на
    // критикъл (Sentinel at Death's Door). Портиерът е общ за двамата герои.
    flavorTypes: ['insult-grave', 'cancel-crit', 'spare-dying', 'heal-zero'],
    // Само името на гласа — езикът се взима от текста, така че звучи еднакво
    // и на български, и на английски (Chirp3-HD имената са общи за двата).
    ttsVoice: 'Algieba'
  };
})();
