// ===== New Character Module =====
(function () {
  'use strict';

  const STORAGE_KEY = 'monkSheet_v3';

  function openNewCharModal() {
    document.getElementById('newCharModal')?.classList.remove('hidden');
  }

  function closeNewCharModal() {
    document.getElementById('newCharModal')?.classList.add('hidden');
  }

  function hasExistingCharacter() {
    return !!localStorage.getItem(STORAGE_KEY);
  }

  function createCharacter() {
    window.st = { ...window.defaultState };
    const d = window.derived();
    window.st.hpCurrent = d.maxHP;
    window.st.kiCurrent = d.kiMax;
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
