// ===== Campaign NPCs Module =====
// Дневник на срещнатите NPC-та: име + фракция + свободен текст детайли.
// По модела на modules/inventory.js (същият CRUD/drag патърн).
(function () {
  'use strict';

  let __npcEditIndex = null; // null => Add, число => Edit
  let __npcAttached = false;
  let __npcSortableInstance = null;
  let __npcExpandedIdx = null; // реалният индекс на разгънатия детайлен ред (точно един)

  const safe = s => String(s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

  // Чиста функция (по прецедента на spendGold — спековете я викат директно).
  // И името, и фракцията могат да носят няколко стойности, разделени с / или \
  // („кралицата на Кислев/руснаците", „Кулсталтин/Распутин").
  function npcMatches(npc, query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return true;
    const parts = [npc && npc.name, npc && npc.faction]
      .flatMap(v => String(v || '').split(/[\/\\]/))
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    return parts.some(p => p.includes(q));
  }

  function npcQuery() {
    const el = document.getElementById('npcSearch');
    return el ? el.value : '';
  }

  // Свободен текст, не таблица (изискване): два блока, празният се пропуска.
  function npcDetailsHtml(npc) {
    const desc = String((npc && npc.description) || '').trim();
    const loc = String((npc && npc.location) || '').trim();
    if (!desc && !loc) return '<small class="npc-details-empty">Няма детайли.</small>';

    let html = '';
    if (desc) html += `<div class="npc-details-block"><strong>Description</strong><div class="npc-details-text">${safe(desc)}</div></div>`;
    if (loc) html += `<div class="npc-details-block"><strong>Where to find</strong><div class="npc-details-text">${safe(loc)}</div></div>`;
    return html;
  }

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

    const q = npcQuery();
    const filtering = String(q || '').trim() !== '';
    // Пази РЕАЛНИЯ индекс — edit/delete/детайли работят върху НЕфилтрирания масив.
    const visible = list.map((npc, i) => ({ npc, i })).filter(e => npcMatches(e.npc, q));

    if (!visible.length) {
      root.innerHTML = '<small>Няма съвпадения.</small>';
      return;
    }

    const rows = visible.map(({ npc, i }) => {
      const row = `<tr data-npc-idx="${i}">
        <td class="npc-drag-handle" title="Drag to reorder">☰</td>
        <td>${safe(npc.name)}</td>
        <td>${safe(npc.faction)}</td>
        <td style="white-space:nowrap;text-align:center">
          <button class="icon-btn" data-npc-details="${i}" title="Details">📖</button>
          <button class="icon-btn" data-npc-edit="${i}" title="Edit">✏️</button>
          <button class="icon-btn" data-npc-del="${i}" title="Delete">🗑️</button>
        </td>
      </tr>`;
      if (__npcExpandedIdx !== i) return row;
      return row + `<tr class="npc-details-row" data-npc-details-idx="${i}">
        <td colspan="4">${npcDetailsHtml(npc)}</td>
      </tr>`;
    }).join('');

    root.innerHTML = `
    <table class="alias-table npc-table">
      <thead>
        <tr><th></th><th>Име</th><th>Фракция</th><th></th></tr>
      </thead>
      <tbody id="npcTableBody">${rows}</tbody>
    </table>`;

    // wire details / edit / delete
    root.querySelectorAll('[data-npc-details]').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = parseInt(e.currentTarget.getAttribute('data-npc-details'), 10);
        __npcExpandedIdx = (__npcExpandedIdx === idx) ? null : idx;
        renderNpcTable();
      });
    });
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
        // Индексите се местят — дръж разгънатия ред честен.
        if (__npcExpandedIdx === idx) __npcExpandedIdx = null;
        else if (__npcExpandedIdx !== null && __npcExpandedIdx > idx) __npcExpandedIdx--;
        window.st.campaignNpcs.splice(idx, 1);
        window.save(); // render + cloud
      });
    });

    initNpcDragAndDrop(filtering);
  }

  function initNpcDragAndDrop(filtering) {
    if (__npcSortableInstance) {
      __npcSortableInstance.destroy();
      __npcSortableInstance = null;
    }

    // Преподреждане на филтриран изглед би разбъркало скритите редове.
    if (filtering) return;

    const tbody = document.getElementById('npcTableBody');
    if (!tbody || typeof Sortable === 'undefined') return;

    __npcSortableInstance = Sortable.create(tbody, {
      animation: 150,
      handle: '.npc-drag-handle',
      ghostClass: 'npc-dragging',
      draggable: 'tr[data-npc-idx]',
      filter: 'button, .icon-btn',
      onEnd: function () {
        // Чети новия ред от DOM-а по РЕАЛНИТЕ индекси — детайлният ред не се брои.
        const order = Array.from(tbody.querySelectorAll('tr[data-npc-idx]'))
          .map(tr => parseInt(tr.getAttribute('data-npc-idx'), 10));
        const list = window.st.campaignNpcs;
        if (order.length !== list.length || order.some(i => !list[i])) return;
        const same = order.every((idx, pos) => idx === pos);
        if (same) return;
        window.st.campaignNpcs = order.map(i => list[i]);
        __npcExpandedIdx = null;
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
    const search = document.getElementById('npcSearch');

    addBtn && addBtn.addEventListener('click', () => npcOpenModal());
    search && search.addEventListener('input', () => renderNpcTable()); // живо филтриране
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
  window.npcMatches = npcMatches;
})();
