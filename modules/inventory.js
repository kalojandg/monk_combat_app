// ===== Inventory Module =====
// Изолиран модул за функционалността на Inventory
(function() {
  'use strict';

  let __invEditIndex = null; // null => Add, число => Edit

  function invOpenModal(editIndex = null, item = null) {
    __invEditIndex = (typeof editIndex === 'number') ? editIndex : null;
    const m = document.getElementById('invModal');
    const title = document.getElementById('invModalTitle');
    const name = document.getElementById('invName');
    const qty = document.getElementById('invQty');
    const note = document.getElementById('invNote');

    title.textContent = (__invEditIndex === null) ? 'Add item' : 'Edit item';
    name.value = item?.name || '';
    qty.value = (item?.qty ?? 1);
    note.value = item?.note || '';

    m.classList.remove('hidden');
    name.focus();
  }

  function invCloseModal() {
    const m = document.getElementById('invModal');
    if (m) m.classList.add('hidden');
    __invEditIndex = null;
  }

  function renderInventoryTable() {
    const root = document.getElementById('invTableRoot');
    if (!root) return;

    // Access global st
    if (typeof window.st === 'undefined') {
      console.warn('st not available yet');
      return;
    }

    const list = Array.isArray(window.st.inventory) ? window.st.inventory : [];
    if (!list.length) {
      root.innerHTML = '<small>Няма добавени предмети още.</small>';
      return;
    }

    const rows = list.map((it, i) => {
      const safe = s => String(s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
      return `<tr>
        <td>${i + 1}</td>
        <td>${safe(it.name)}</td>
        <td class="right">${Number(it.qty) || 0}</td>
        <td>${safe(it.note)}</td>
        <td style="white-space:nowrap;text-align:center">
          <button class="icon-btn" data-edit="${i}" title="Edit">✏️</button>
          <button class="icon-btn" data-del="${i}" title="Delete">🗑️</button>
        </td>
      </tr>`;
    }).join('');

    root.innerHTML = `
    <table class="alias-table inv-table">
      <thead>
        <tr><th>#</th><th>Име</th><th class="right">Кол.</th><th>Бележка</th><th></th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

    // wire edit/delete
    root.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = parseInt(e.currentTarget.getAttribute('data-edit'), 10);
        const it = window.st.inventory[idx];
        invOpenModal(idx, it);
      });
    });
    root.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = parseInt(e.currentTarget.getAttribute('data-del'), 10);
        const sure = confirm('Изтриване на този предмет?');
        if (!sure) return;
        window.st.inventory.splice(idx, 1);
        window.save(); // render + cloud
      });
    });
  }

  function attachInventory() {
    const addBtn = document.getElementById('btnInvAdd');
    const saveBtn = document.getElementById('invSave');
    const cancelBtn = document.getElementById('invCancel');

    addBtn && addBtn.addEventListener('click', () => invOpenModal());

    cancelBtn && cancelBtn.addEventListener('click', invCloseModal);

    saveBtn && saveBtn.addEventListener('click', () => {
      const name = (document.getElementById('invName').value || '').trim();
      const qty = Math.max(0, Math.floor(Number(document.getElementById('invQty').value || 0)));
      const note = (document.getElementById('invNote').value || '').trim();

      if (!name) {
        alert('Името е задължително.');
        return;
      }
      const rec = { name, qty, note };

      if (typeof window.st === 'undefined' || typeof window.save === 'undefined') {
        console.warn('st or save not available yet');
        return;
      }

      if (__invEditIndex === null) {
        // add
        window.st.inventory.push(rec);
      } else {
        // edit
        window.st.inventory[__invEditIndex] = rec;
      }
      invCloseModal();
      window.save(); // trigger render + cloud write
    });
  }

  // Export functions to global scope
  window.attachInventory = attachInventory;
  window.renderInventoryTable = renderInventoryTable;
})();
