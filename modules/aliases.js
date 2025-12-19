// ===== Aliases (Shenanigans) Module =====
// Изолиран модул за функционалността на Shenanigans/Aliases
(function() {
  'use strict';

  let __sh_names = null;

  async function loadShenanigans() {
    if (__sh_names) return __sh_names;
    try {
      const res = await fetch('shenanigans.json', { cache: 'no-store' });
      const data = await res.json();
      // Поддържа три формата: плосък масив или обект с ключ
      if (Array.isArray(data)) __sh_names = data;
      else if (Array.isArray(data.names)) __sh_names = data.names;
      else if (Array.isArray(data.fakeNames)) __sh_names = data.fakeNames;
      else __sh_names = [];
    } catch {
      __sh_names = [];
    }
    return __sh_names;
  }

  function pickRandom(arr) {
    return arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : '';
  }

  // ---------- Shenanigans aliases log ----------
  let _lastRandomName = null;

  // helpers
  function loadAliases() {
    // Access global st - will be available when module loads
    if (typeof window.st === 'undefined') {
      console.warn('st not available yet');
      return [];
    }
    if (!Array.isArray(window.st.aliases)) window.st.aliases = [];
    return window.st.aliases;
  }
  function saveAliases(arr) {
    if (typeof window.st === 'undefined' || typeof window.save === 'undefined') {
      console.warn('st or save not available yet');
      return;
    }
    window.st.aliases = Array.isArray(arr) ? arr : [];
    window.save();                // ← пазим през твоята save(), за да тръгне cloud/рендър
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function renderAliasTable() {
    const list = loadAliases();
    const root = document.getElementById('aliasLog');
    if (!root) return;
    if (!list.length) {
      root.innerHTML = '<small>Няма запазени представяния още.</small>';
      return;
    }
    const rows = list.map((rec, i) => {
      const d = new Date(rec.ts || Date.now());
      const when = d.toLocaleString();
      return `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(rec.name || '')}</td>
        <td>${escapeHtml(rec.to || '')}</td>
        <td style="white-space:nowrap">${when}</td>
        <td style="text-align:center">
          <button class="alias-del" data-idx="${i}">🗑️</button>
        </td>
      </tr>`;
    }).join('');
    root.innerHTML = `<table class="alias-table">
      <thead>
        <tr>
          <th>#</th><th>Име</th><th>На кого</th><th>Кога</th><th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

    // вързваме event за триене
    root.querySelectorAll(".alias-del").forEach(btn => {
      btn.addEventListener("click", e => {
        const idx = parseInt(e.currentTarget.dataset.idx, 10);
        const list = loadAliases();
        list.splice(idx, 1);
        saveAliases(list);
        renderAliasTable();
      });
    });
  }

  function deleteAliasAt(index) {
    if (typeof window.st === 'undefined' || typeof window.save === 'undefined') return;
    if (!Array.isArray(window.st.aliases)) window.st.aliases = [];
    window.st.aliases.splice(index, 1);
    window.save();
  }

  // hook Save button enable/disable
  function setSaveEnabled(on) {
    const b = document.getElementById('btnSaveAlias');
    if (b) b.disabled = !on;
  }

  // modal controls
  function openAliasModal() {
    const m = document.getElementById('aliasModal');
    document.getElementById('aliasToInput').value = '';
    m.classList.remove('hidden');
    setTimeout(() => document.getElementById('aliasToInput').focus(), 0);
  }

  function closeAliasModal() {
    const m = document.getElementById('aliasModal');
    if (m) m.classList.add('hidden');
  }

  function attachShenanigans() {
    const btn = document.getElementById('btnGetName');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const list = await loadShenanigans();
      const name = pickRandom(list).trim();
      const out = document.getElementById('fakeNameOutput');
      if (out) {
        out.value = name || '(no names found)';
        // >>> Тук добавяме тези два реда:
        _lastRandomName = (out.value || '').trim();
        setSaveEnabled(!!_lastRandomName);
      }
    });
  }

  function attachAliasLog() {
    const getBtn = document.getElementById('btnGetName');
    const saveBtn = document.getElementById('btnSaveAlias');
    const out = document.getElementById('fakeNameOutput');

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (!_lastRandomName) return;
        openAliasModal();
      });
    }

    const cancelBtn = document.getElementById('aliasCancel');
    const okBtn = document.getElementById('aliasConfirm');
    const toInput = document.getElementById('aliasToInput');

    cancelBtn && cancelBtn.addEventListener('click', closeAliasModal);
    okBtn && okBtn.addEventListener('click', () => {
      const to = (toInput && toInput.value || '').trim();
      const rec = { name: _lastRandomName, to, ts: Date.now() };
      const arr = loadAliases();
      arr.unshift(rec);      // новите най-отгоре
      saveAliases(arr);
      renderAliasTable();
      setSaveEnabled(false);
      closeAliasModal();
    });

    document.getElementById('aliasModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'aliasModal') {
        closeAliasModal();
        document.getElementById('aliasToInput').value = '';
        document.getElementById('fakeNameOutput').value = '';
        document.getElementById('btnSaveAlias').disabled = true;
      }
    });

    // init
    renderAliasTable();
    setSaveEnabled(false);
  }

  // Export functions to global scope
  window.attachShenanigans = attachShenanigans;
  window.attachAliasLog = attachAliasLog;
  window.renderAliasTable = renderAliasTable;
})();
