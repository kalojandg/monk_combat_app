// ===== New Character Module =====
// Прави нов герой от АКТИВНИЯ профил в НЕГОВИЯ ключ. Нищо тук не е монашеско:
// класът, полетата по подразбиране и ки-то идват от профила (modules/classes/*.js).
(function () {
  'use strict';

  // Фасада към контейнера за герои (modules/characters.js). Резервният вариант важи
  // само ако онзи модул липсва — тогава апът е едногеройски, тоест монк.
  function profile() {
    if (window.Characters && typeof window.Characters.profile === 'function') {
      return window.Characters.profile();
    }
    return (window.CLASS_PROFILES && window.CLASS_PROFILES.monk) || { id: 'monk', label: 'Monk' };
  }

  function freshState(p) {
    if (window.Characters && typeof window.Characters.fresh === 'function') {
      return window.Characters.fresh(p);
    }
    const base = JSON.parse(JSON.stringify(window.defaultState));
    return { ...base, ...JSON.parse(JSON.stringify(p.defaults || {})), class: p.id };
  }

  function storageKey() {
    return typeof window.activeStorageKey === 'function'
      ? window.activeStorageKey()
      : 'monkSheet_v3';
  }

  function openNewCharModal() {
    const text = document.getElementById('newCharText');
    if (text) {
      // Трие се САМО активният герой — другият си седи в своя ключ
      text.textContent = `Ще се създаде нов герой ${profile().label} с d8 хит зар. `
        + 'Всички текущи данни за него ще бъдат изтрити.';
    }
    document.getElementById('newCharModal')?.classList.remove('hidden');
  }

  function closeNewCharModal() {
    document.getElementById('newCharModal')?.classList.add('hidden');
  }

  // Предупреждението гледа ключа на АКТИВНИЯ герой: иначе клерик без запазен монк
  // се трие без въпрос, а празен клерик пита заради чужд запис.
  function hasExistingCharacter() {
    return !!localStorage.getItem(storageKey());
  }

  function createCharacter() {
    const p = profile();
    window.st = freshState(p);
    // save() ПРЕДИ derived(): той синхронизира app.js `st` с новия герой, а derived()
    // чете точно него. Без това пуловете долу се смятаха по СТАРИЯ герой (ниво, CON).
    window.save();

    const d = window.derived();
    window.st.hpCurrent = d.maxHP;
    if (p.restoresKi) window.st.kiCurrent = d.kiMax;
    window.st.hdAvail = d.hdMax;
    window.st.status = 'alive';
    window.st.dsSuccess = 0;
    window.st.dsFail = 0;
    window.save();
    closeNewCharModal();
  }

  function attachNewChar() {
    document.getElementById('btnNewChar')?.addEventListener('click', () => {
      if (hasExistingCharacter()) {
        const ok = confirm(
          'Ако сегашният ви герой не е експортнат, той ще бъде изтрит.\nСигурни ли сте?'
        );
        if (!ok) return;
      }
      openNewCharModal();
    });

    document.getElementById('newCharConfirm')?.addEventListener('click', createCharacter);
    document.getElementById('newCharCancel')?.addEventListener('click', closeNewCharModal);
  }

  window.attachNewChar = attachNewChar;
})();
