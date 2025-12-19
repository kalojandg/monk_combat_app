// ===== Familiars Module =====
// Изолиран модул за функционалността на Familiar Names
(function() {
  'use strict';

  // --- Familiar Names (lazy load JSON) ---
  let __fam_names = null;
  const FAM_URL = 'familiars.json';

  async function loadFamiliars() {
    if (__fam_names) return __fam_names;
    const res = await fetch(FAM_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('Cannot load familiars.json');
    __fam_names = await res.json(); // очакваме { feline:[], canine:[], ... }
    return __fam_names;
  }

  function famPickRandom(arr) {
    return arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : '';
  }

  // --- Familiar records (localStorage) ---
  const FAM_LS_KEY = 'familiars_v1';

  function loadFamRecords() {
    try { return JSON.parse(localStorage.getItem(FAM_LS_KEY)) || []; }
    catch { return []; }
  }
  function saveFamRecords(arr) {
    try { localStorage.setItem(FAM_LS_KEY, JSON.stringify(arr)); } catch { }
  }

  // текущ избор (за Save)
  let _lastFamName = null;
  let _lastFamCat = null;

  function famSetSaveEnabled(on) {
    const b = document.getElementById('btnFamSave');
    if (b) b.disabled = !on;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function renderFamTable() {
    const root = document.getElementById('famLog');
    if (!root) return;
    const list = loadFamRecords();
    if (!list.length) {
      root.innerHTML = '<small>Няма записани имена още.</small>';
      return;
    }
    const rows = list.map((rec, i) => {
      const d = new Date(rec.ts || Date.now());
      const when = d.toLocaleString();
      return `<tr>
        <td>${escapeHtml(rec.name || '')}</td>
        <td>${escapeHtml(rec.cat || '')}</td>
        <td>${escapeHtml(rec.note || '')}</td>
        <td style="white-space:nowrap">${when}</td>
        <td style="text-align:center"><button class="alias-del" data-idx="${i}">🗑️</button></td>
      </tr>`;
    }).join('');
    root.innerHTML = `<table class="alias-table">
      <thead>
        <tr><th>Име</th><th>Тип</th><th>Бележка</th><th>Кога</th><th></th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

    root.querySelectorAll('.alias-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx, 10);
        const arr = loadFamRecords();
        arr.splice(idx, 1);
        saveFamRecords(arr);
        renderFamTable();
      });
    });
  }

  function openFamModal() {
    const m = document.getElementById('famModal');
    const t = document.getElementById('famNoteInput');
    if (!m || !t) return;
    t.value = '';
    m.classList.remove('hidden');
    t.focus();
  }
  function closeFamModal() {
    const m = document.getElementById('famModal');
    if (m) m.classList.add('hidden');
  }

  function attachFamiliars() {
    // групови бутони
    document.querySelectorAll('.fam-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cat = btn.getAttribute('data-famcat');
        try {
          const data = await loadFamiliars();
          const list = Array.isArray(data[cat]) ? data[cat] : [];
          const name = (famPickRandom(list) || '').trim();
          const out = document.getElementById('famNameOutput');
          if (out) out.value = name || '(no names found)';
          _lastFamName = name || null;
          _lastFamCat = cat || null;
          famSetSaveEnabled(!!_lastFamName);
        } catch (e) {
          console.error(e);
        }
      });
    });

    // Save → модал
    const saveBtn = document.getElementById('btnFamSave');
    if (saveBtn) saveBtn.addEventListener('click', () => {
      if (!_lastFamName) return;
      openFamModal();
    });

    // модал бутони
    const cancelBtn = document.getElementById('famCancel');
    const okBtn = document.getElementById('famConfirm');
    const noteEl = document.getElementById('famNoteInput');
    cancelBtn && cancelBtn.addEventListener('click', closeFamModal);
    okBtn && okBtn.addEventListener('click', () => {
      const note = (noteEl && noteEl.value || '').trim();
      const rec = { name: _lastFamName, cat: _lastFamCat, note, ts: Date.now() };
      const arr = loadFamRecords();
      arr.unshift(rec);
      saveFamRecords(arr);
      renderFamTable();
      closeFamModal();
      famSetSaveEnabled(false);
    });

    // init
    renderFamTable();
    famSetSaveEnabled(false);
  }

  // Export functions to global scope
  window.attachFamiliars = attachFamiliars;
  window.renderFamTable = renderFamTable;
})();
