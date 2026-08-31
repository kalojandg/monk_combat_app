// ===== Campaign NPCs Module =====
// Дневник на срещнатите NPC-та: име + фракция + свободен текст детайли.
// По модела на modules/inventory.js (същият CRUD/drag патърн).
(function () {
  'use strict';

  let __npcEditIndex = null; // null => Add, число => Edit
  let __npcAttached = false;
  let __npcSortableInstance = null;

  const safe = s => String(s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

  function npcList() {
    if (typeof window.st === 'undefined') return null;
    if (!Array.isArray(window.st.campaignNpcs)) window.st.campaignNpcs = [];
    return window.st.campaignNpcs;
  }

  function npcOpenModal(editIndex = null, npc = null) {
    __npcEditIndex = (typeof editIndex === 'number') ? editIndex : null;
    const m = document.getElementById('npcModal');
    const title = document.getElementById('npcModalTitle');
    const name = document.getElementById('npcName');
    const faction = document.getElementById('npcFaction');
    const description = document.getElementById('npcDescription');
    const location = document.getElementById('npcLocation');
    if (!m || !name) return;

    title && (title.textContent = (__npcEditIndex === null) ? 'Add NPC' : 'Edit NPC');
    name.value = npc?.name || '';
    faction && (faction.value = npc?.faction || '');
    description && (description.value = npc?.description || '');
    location && (location.value = npc?.location || '');

    m.classList.remove('hidden');
    name.focus();
  }

  function npcCloseModal() {
    const m = document.getElementById('npcModal');
    if (m) m.classList.add('hidden');
    __npcEditIndex = null;
  }

  function renderNpcTable() {
    const root = document.getElementById('npcTableRoot');
    if (!root) return;

    const list = npcList();
    if (list === null) {
      console.warn('st not available yet');
      return;
    }

    if (!list.length) {
      root.innerHTML = '<small>Няма записани NPC-та още.</small>';
      return;
    }

    const rows = list.map((npc, i) => `<tr data-npc-idx="${i}">
        <td class="npc-drag-handle" title="Drag to reorder">☰</td>
        <td>${safe(npc.name)}</td>
        <td>${safe(npc.faction)}</td>
        <td style="white-space:nowrap;text-align:center">
          <button class="icon-btn" data-npc-edit="${i}" title="Edit">✏️</button>
          <button class="icon-btn" data-npc-del="${i}" title="Delete">🗑️</button>
        </td>
      </tr>`).join('');

    root.innerHTML = `
    <table class="alias-table npc-table">
      <thead>
        <tr><th></th><th>Име</th><th>Фракция</th><th></th></tr>
      </thead>
      <tbody id="npcTableBody">${rows}</tbody>
    </table>`;

    // wire edit/delete
    root.querySelectorAll('[data-npc-edit]').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = parseInt(e.currentTarget.getAttribute('data-npc-edit'), 10);
        npcOpenModal(idx, window.st.campaignNpcs[idx]);
      });
    });
    root.querySelectorAll('[data-npc-del]').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = parseInt(e.currentTarget.getAttribute('data-npc-del'), 10);
        const sure = confirm('Изтриване на този NPC?');
        if (!sure) return;
        window.st.campaignNpcs.splice(idx, 1);
        window.save(); // render + cloud
      });
    });

    initNpcDragAndDrop();
  }

  function initNpcDragAndDrop() {
    const tbody = document.getElementById('npcTableBody');
    if (!tbody || typeof Sortable === 'undefined') return;

    if (__npcSortableInstance) {
      __npcSortableInstance.destroy();
    }

    __npcSortableInstance = Sortable.create(tbody, {
      animation: 150,
      handle: '.npc-drag-handle',
      ghostClass: 'npc-dragging',
      filter: 'button, .icon-btn',
      onEnd: function (evt) {
        if (evt.oldIndex === evt.newIndex) return;
        const moved = window.st.campaignNpcs.splice(evt.oldIndex, 1)[0];
        window.st.campaignNpcs.splice(evt.newIndex, 0, moved);
        window.save();
      }
    });
  }

  function attachCampaignNpcs() {
    if (__npcAttached) return;
    __npcAttached = true;

    const addBtn = document.getElementById('btnNpcAdd');
    const saveBtn = document.getElementById('npcSave');
    const cancelBtn = document.getElementById('npcCancel');

    addBtn && addBtn.addEventListener('click', () => npcOpenModal());
    cancelBtn && cancelBtn.addEventListener('click', npcCloseModal);

    saveBtn && saveBtn.addEventListener('click', () => {
      const val = id => (document.getElementById(id)?.value || '').trim();
      const name = val('npcName');

      if (!name) {
        alert('Името е задължително.');
        return;
      }

      const rec = {
        name,
        faction: val('npcFaction'),
        description: val('npcDescription'),
        location: val('npcLocation')
      };

      if (npcList() === null || typeof window.save === 'undefined') {
        console.warn('st or save not available yet');
        return;
      }

      if (__npcEditIndex === null) {
        window.st.campaignNpcs.push(rec);
      } else {
        window.st.campaignNpcs[__npcEditIndex] = rec;
      }
      npcCloseModal();
      window.save(); // trigger render + cloud write
    });
  }

  // Export functions to global scope
  window.attachCampaignNpcs = attachCampaignNpcs;
  window.renderNpcTable = renderNpcTable;
})();
