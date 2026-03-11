/* ===== NPC Names Module (IIFE) ===== */
(function () {
  'use strict';

  let __data = null;
  let _lastGeneratedName = null;

  async function loadData() {
    if (__data) return __data;
    try {
      const res = await fetch('npc-names.json', { cache: 'no-store' });
      __data = await res.json();
    } catch {
      __data = [];
    }
    return __data;
  }

  function pickRandom(arr) {
    return arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : '';
  }

  // ---- State helpers ----
  function loadNpcNames() {
    if (typeof window.st === 'undefined') return [];
    if (!Array.isArray(window.st.npcNames)) window.st.npcNames = [];
    return window.st.npcNames;
  }

  function saveNpcNames(arr) {
    if (typeof window.st === 'undefined' || typeof window.save === 'undefined') return;
    window.st.npcNames = Array.isArray(arr) ? arr : [];
    window.save();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
    ));
  }

  // ---- UI helpers ----
  function setSaveEnabled(on) {
    const b = document.getElementById('btnSaveName');
    if (b) b.disabled = !on;
  }

  function getSelectedRace() {
    const el = document.querySelector('input[name="npcRace"]:checked');
    return el ? el.value : 'human';
  }

  function getSelectedGender() {
    const el = document.querySelector('input[name="npcGender"]:checked');
    return el ? el.value : 'male';
  }

  function updateGenderVisibility() {
    const race = getSelectedRace();
    const group = document.getElementById('npcGenderGroup');
    if (!group) return;
    if (race === 'toblin') {
      group.classList.add('hidden');
    } else {
      group.classList.remove('hidden');
    }
  }

  // ---- Render table ----
  function renderNpcNamesLog() {
    const list = loadNpcNames();
    const root = document.getElementById('npcNamesLog');
    if (!root) return;
    if (!list.length) {
      root.innerHTML = '<small class="muted">No saved NPC names yet.</small>';
      return;
    }
    const rows = list.map((rec, i) => `
      <tr>
        <td>${escapeHtml(rec.name || '')}</td>
        <td>${escapeHtml(rec.note || '')}</td>
        <td style="text-align:center;white-space:nowrap">
          <button class="npc-name-del" data-idx="${i}">🗑️</button>
        </td>
      </tr>`).join('');
    root.innerHTML = `<table class="npc-names-table">
      <thead><tr><th>Name</th><th>Note</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

    root.querySelectorAll('.npc-name-del').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = parseInt(e.currentTarget.dataset.idx, 10);
        const arr = loadNpcNames();
        arr.splice(idx, 1);
        saveNpcNames(arr);
        renderNpcNamesLog();
      });
    });
  }

  // ---- Modal ----
  function openModal() {
    const m = document.getElementById('npcNameModal');
    if (!m) return;
    document.getElementById('npcNameNote').value = '';
    m.classList.remove('hidden');
    setTimeout(() => document.getElementById('npcNameNote').focus(), 0);
  }

  function closeModal() {
    const m = document.getElementById('npcNameModal');
    if (m) m.classList.add('hidden');
  }

  // ---- Generate ----
  async function generateName() {
    const data = await loadData();
    const raceKey = getSelectedRace();
    const genderKey = raceKey === 'toblin' ? 'any' : getSelectedGender();

    const raceObj = data.find(r => r.key === raceKey);
    if (!raceObj) return;
    const genderObj = raceObj.genders.find(g => g.key === genderKey);
    if (!genderObj) return;

    const name = pickRandom(genderObj.names);
    const out = document.getElementById('npcNameOutput');
    if (out) out.value = name;
    _lastGeneratedName = name;
    setSaveEnabled(!!name);
  }

  // ---- Attach ----
  window.attachNpcNames = function () {
    const btnGen   = document.getElementById('btnGenerateName');
    const btnSave  = document.getElementById('btnSaveName');
    const btnCancel  = document.getElementById('npcNameCancel');
    const btnConfirm = document.getElementById('npcNameConfirm');

    // Race radios → toggle gender visibility
    document.querySelectorAll('input[name="npcRace"]').forEach(r => {
      r.addEventListener('change', updateGenderVisibility);
    });
    updateGenderVisibility();

    btnGen  && btnGen.addEventListener('click', generateName);

    btnSave && btnSave.addEventListener('click', () => {
      if (_lastGeneratedName) openModal();
    });

    btnCancel && btnCancel.addEventListener('click', closeModal);

    btnConfirm && btnConfirm.addEventListener('click', () => {
      const note = (document.getElementById('npcNameNote')?.value || '').trim();
      const arr = loadNpcNames();
      arr.unshift({ name: _lastGeneratedName, note, ts: Date.now() });
      saveNpcNames(arr);
      renderNpcNamesLog();
      setSaveEnabled(false);
      closeModal();
    });

    // Click outside modal to close
    document.getElementById('npcNameModal')?.addEventListener('click', e => {
      if (e.target.id === 'npcNameModal') closeModal();
    });

    renderNpcNamesLog();
    setSaveEnabled(false);
  };

  window.renderNpcNamesUI = function () {
    renderNpcNamesLog();
  };
})();
