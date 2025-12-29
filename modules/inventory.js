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

  function renderGold() {
    if (typeof window.st === 'undefined') {
      console.warn('st not available yet');
      return;
    }

    const el = id => document.getElementById(id);
    if (el('goldPlatinumSpan')) el('goldPlatinumSpan').textContent = Number(window.st.goldPlatinum || 0);
    if (el('goldGoldSpan')) el('goldGoldSpan').textContent = Number(window.st.goldGold || 0);
    if (el('goldSilverSpan')) el('goldSilverSpan').textContent = Number(window.st.goldSilver || 0);
    if (el('goldCopperSpan')) el('goldCopperSpan').textContent = Number(window.st.goldCopper || 0);
  }

  function handleGoldGain() {
    if (typeof window.st === 'undefined' || typeof window.save === 'undefined') {
      console.warn('st or save not available yet');
      return;
    }

    const getInput = id => Math.max(0, Math.floor(Number(document.getElementById(id)?.value || 0)));

    const plat = getInput('goldPlatinumInput');
    const gold = getInput('goldGoldInput');
    const silver = getInput('goldSilverInput');
    const copper = getInput('goldCopperInput');

    window.st.goldPlatinum = (Number(window.st.goldPlatinum || 0) + plat);
    window.st.goldGold = (Number(window.st.goldGold || 0) + gold);
    window.st.goldSilver = (Number(window.st.goldSilver || 0) + silver);
    window.st.goldCopper = (Number(window.st.goldCopper || 0) + copper);

    // Clear inputs
    const el = id => document.getElementById(id);
    if (el('goldPlatinumInput')) el('goldPlatinumInput').value = '';
    if (el('goldGoldInput')) el('goldGoldInput').value = '';
    if (el('goldSilverInput')) el('goldSilverInput').value = '';
    if (el('goldCopperInput')) el('goldCopperInput').value = '';

    window.save(); // trigger render + cloud write
    renderGold(); // Update display immediately
  }

  function handleGoldSpend() {
    if (typeof window.st === 'undefined' || typeof window.save === 'undefined') {
      console.warn('st or save not available yet');
      return;
    }

    const getInput = id => Math.max(0, Math.floor(Number(document.getElementById(id)?.value || 0)));

    const plat = getInput('goldPlatinumInput');
    const gold = getInput('goldGoldInput');
    const silver = getInput('goldSilverInput');
    const copper = getInput('goldCopperInput');

    // Subtract, but don't go below zero
    window.st.goldPlatinum = Math.max(0, (Number(window.st.goldPlatinum || 0) - plat));
    window.st.goldGold = Math.max(0, (Number(window.st.goldGold || 0) - gold));
    window.st.goldSilver = Math.max(0, (Number(window.st.goldSilver || 0) - silver));
    window.st.goldCopper = Math.max(0, (Number(window.st.goldCopper || 0) - copper));

    // Clear inputs
    const el = id => document.getElementById(id);
    if (el('goldPlatinumInput')) el('goldPlatinumInput').value = '';
    if (el('goldGoldInput')) el('goldGoldInput').value = '';
    if (el('goldSilverInput')) el('goldSilverInput').value = '';
    if (el('goldCopperInput')) el('goldCopperInput').value = '';

    window.save(); // trigger render + cloud write
    renderGold(); // Update display immediately
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

    // Gold buttons - handlers are already attached via inline onclick in HTML
    // But we can also attach programmatically as backup
    const gainBtn = document.getElementById('goldGainBtn');
    const spendBtn = document.getElementById('goldSpendBtn');
    
    if (gainBtn && !gainBtn.onclick) {
      gainBtn.onclick = (e) => {
        e.preventDefault();
        handleGoldGain();
      };
    }
    
    if (spendBtn && !spendBtn.onclick) {
      spendBtn.onclick = (e) => {
        e.preventDefault();
        handleGoldSpend();
      };
    }
  }

  // Export functions to global scope
  window.attachInventory = attachInventory;
  window.renderInventoryTable = renderInventoryTable;
  window.renderGold = renderGold;
  window.handleGoldGain = handleGoldGain;
  window.handleGoldSpend = handleGoldSpend;
})();
