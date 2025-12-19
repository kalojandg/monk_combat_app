// ===== PC Characteristics Module =====
// Изолиран модул за функционалността на PC Characteristics (Languages, Tools, Personality/Bond/Flaw)
(function() {
  'use strict';

  let __pcModalType = null;     // 'lang' | 'tool'
  let __pcModalIndex = null;    // null => add, number => edit

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  let _handlersAttached = false;

  function openPcModal(type, index = null) {
    console.log('openPcModal called', { type, index });
    __pcModalType = type;
    __pcModalIndex = (typeof index === 'number') ? index : null;

    const m = document.getElementById('pcModal');
    const title = document.getElementById('pcModalTitle');
    const label = document.getElementById('pcModalLabel');
    const name = document.getElementById('pcModalName');
    const cancelBtn = document.getElementById('pcModalCancel');
    const saveBtn = document.getElementById('pcModalSave');

    console.log('Elements found:', { m: !!m, title: !!title, label: !!label, name: !!name, cancelBtn: !!cancelBtn, saveBtn: !!saveBtn });

    if (!m || !title || !label || !name) {
      console.warn('PC Modal elements not found', { m: !!m, title: !!title, label: !!label, name: !!name });
      return;
    }
    // Attach handlers when modal opens (elements are guaranteed to be in DOM)
    if (!_handlersAttached && cancelBtn && saveBtn) {
      console.log('Attaching handlers to PC Modal');
      cancelBtn.addEventListener('click', closePcModal);

      saveBtn.addEventListener('click', () => {
        if (!__pcModalType) {
          console.warn('No modal type set');
          return;
        }
        
        const nameInput = document.getElementById('pcModalName');
        if (!nameInput) {
          console.warn('Name input not found');
          return;
        }
        
        const val = (nameInput.value || '').trim();
        if (!val) { 
          alert('Името е задължително.'); 
          return; 
        }

        if (typeof window.st === 'undefined' || typeof window.save === 'undefined') {
          console.warn('st or save not available yet');
          return;
        }

        if (__pcModalType === 'lang') {
          if (!Array.isArray(window.st.languages)) window.st.languages = [];
          if (__pcModalIndex === null) {
            window.st.languages.push({ name: val });
          } else {
            window.st.languages[__pcModalIndex] = { name: val };
          }
        } else {
          if (!Array.isArray(window.st.tools)) window.st.tools = [];
          if (__pcModalIndex === null) {
            window.st.tools.push({ name: val });
          } else {
            window.st.tools[__pcModalIndex] = { name: val };
          }
        }
        window.save();
        renderLangTable();
        renderToolTable();
        closePcModal();
      });

      _handlersAttached = true;
    }

    const isLang = type === 'lang';
    title.textContent = (__pcModalIndex === null) ? (isLang ? 'Add language' : 'Add tool')
      : (isLang ? 'Edit language' : 'Edit tool');
    label.textContent = isLang ? 'Language' : 'Tool';

    if (typeof window.st === 'undefined') {
      console.warn('st not available yet');
      return;
    }

    const list = isLang ? window.st.languages : window.st.tools;
    name.value = (__pcModalIndex !== null && list[__pcModalIndex]) ? (list[__pcModalIndex].name || '') : '';

    m.classList.remove('hidden');
    name.focus();
  }

  function closePcModal() {
    const m = document.getElementById('pcModal');
    if (m) m.classList.add('hidden');
    __pcModalType = null; __pcModalIndex = null;
  }

  function renderLangTable() {
    const root = document.getElementById('langTableRoot');
    if (!root) return;
    if (typeof window.st === 'undefined') {
      console.warn('st not available yet');
      return;
    }
    const list = Array.isArray(window.st.languages) ? window.st.languages : [];
    if (!list.length) { root.innerHTML = '<small>Няма добавени езици още.</small>'; return; }

    const rows = list.map((it, i) => {
      const safe = escapeHtml;
      return `<tr>
        <td>${i + 1}</td>
        <td>${safe(it.name)}</td>
        <td style="white-space:nowrap;text-align:center">
          <button class="icon-btn" data-lang-edit="${i}" title="Edit">✏️</button>
          <button class="icon-btn" data-lang-del="${i}" title="Delete">🗑️</button>
        </td>
      </tr>`;
    }).join('');

    root.innerHTML = `
    <table class="alias-table">
      <thead><tr><th>#</th><th>Language</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

    root.querySelectorAll('[data-lang-edit]').forEach(btn => {
      btn.addEventListener('click', e => {
        console.log('Edit language button clicked', e.currentTarget.dataset.langEdit);
        openPcModal('lang', parseInt(e.currentTarget.dataset.langEdit, 10));
      });
    });
    root.querySelectorAll('[data-lang-del]').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = parseInt(e.currentTarget.dataset.langDel, 10);
        const ok = confirm('Изтриване на този език?'); if (!ok) return;
        window.st.languages.splice(idx, 1);
        window.save();
      });
    });
  }

  function renderToolTable() {
    const root = document.getElementById('toolTableRoot');
    if (!root) return;
    if (typeof window.st === 'undefined') {
      console.warn('st not available yet');
      return;
    }
    const list = Array.isArray(window.st.tools) ? window.st.tools : [];
    if (!list.length) { root.innerHTML = '<small>Няма добавени инструменти още.</small>'; return; }

    const rows = list.map((it, i) => {
      const safe = escapeHtml;
      return `<tr>
        <td>${i + 1}</td>
        <td>${safe(it.name)}</td>
        <td style="white-space:nowrap;text-align:center">
          <button class="icon-btn" data-tool-edit="${i}" title="Edit">✏️</button>
          <button class="icon-btn" data-tool-del="${i}" title="Delete">🗑️</button>
        </td>
      </tr>`;
    }).join('');

    root.innerHTML = `
    <table class="alias-table">
      <thead><tr><th>#</th><th>Tool</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

    root.querySelectorAll('[data-tool-edit]').forEach(btn => {
      btn.addEventListener('click', e => {
        console.log('Edit tool button clicked', e.currentTarget.dataset.toolEdit);
        openPcModal('tool', parseInt(e.currentTarget.dataset.toolEdit, 10));
      });
    });
    root.querySelectorAll('[data-tool-del]').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = parseInt(e.currentTarget.dataset.toolDel, 10);
        const ok = confirm('Изтриване на този инструмент?'); if (!ok) return;
        window.st.tools.splice(idx, 1);
        window.save();
      });
    });
  }

  function attachPCChar() {
    console.log('attachPCChar called');
    const addLang = document.getElementById('btnLangAdd');
    const addTool = document.getElementById('btnToolAdd');

    console.log('attachPCChar: buttons found', { addLang: !!addLang, addTool: !!addTool });

    if (!addLang || !addTool) {
      console.warn('PC Char buttons not found, will retry...');
      setTimeout(attachPCChar, 100);
      return;
    }

    addLang.addEventListener('click', () => {
      console.log('btnLangAdd clicked');
      openPcModal('lang');
    });
    addTool.addEventListener('click', () => {
      console.log('btnToolAdd clicked');
      openPcModal('tool');
    });

    const tPers = document.getElementById('pcPersonality');
    const tBond = document.getElementById('pcBond');
    const tFlaw = document.getElementById('pcFlaw');

    tPers && tPers.addEventListener('input', () => {
      if (typeof window.st !== 'undefined' && typeof window.save !== 'undefined') {
        window.st.personality = tPers.value;
        window.save();
      }
    });
    tBond && tBond.addEventListener('input', () => {
      if (typeof window.st !== 'undefined' && typeof window.save !== 'undefined') {
        window.st.bond = tBond.value;
        window.save();
      }
    });
    tFlaw && tFlaw.addEventListener('input', () => {
      if (typeof window.st !== 'undefined' && typeof window.save !== 'undefined') {
        window.st.flaw = tFlaw.value;
        window.save();
      }
    });

  }

  // Export functions to global scope
  window.attachPCChar = attachPCChar;
  window.renderLangTable = renderLangTable;
  window.renderToolTable = renderToolTable;
  window.openPcModal = openPcModal;
  window.closePcModal = closePcModal;
})();
