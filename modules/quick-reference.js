// ===== Quick Reference (Skills tab → "Quick Reference" sub-tab) =====
// Статични D&D правила от quick-reference.json, рендерирани като акордеон по
// модела на renderFeaturesAccordion/_buildFeatureHTML в app.js (същият markup и
// същите CSS класове → визуално еднакво с Class Features). Само за четене:
// нищо в st, нищо в localStorage, никакви listener-и освен нативния <details>.
(function () {
  'use strict';

  const QREF_URL = 'quick-reference.json';
  let __qref_cache = null;

  async function loadQuickReference() {
    if (__qref_cache) return __qref_cache;
    const res = await fetch(QREF_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Cannot load ${QREF_URL} (${res.status})`);
    __qref_cache = await res.json();
    return __qref_cache;
  }

  const esc = x => String(x).replace(/</g, '&lt;');

  function _buildTableHTML(table) {
    if (!table || !Array.isArray(table.rows) || !table.rows.length) return '';
    const headers = (Array.isArray(table.headers) ? table.headers : [])
      .map(h => `<th>${esc(h)}</th>`).join('');
    const thead = headers ? `<thead><tr>${headers}</tr></thead>` : '';
    const tbody = table.rows
      .map(row => `<tr>${(Array.isArray(row) ? row : [row]).map(c => `<td>${esc(c)}</td>`).join('')}</tr>`)
      .join('');
    return `<table>${thead}<tbody>${tbody}</tbody></table>`;
  }

  function _buildEntryHTML(entry) {
    const name = esc(entry.name || '');
    const desc = (Array.isArray(entry.desc) ? entry.desc : (entry.desc ? [entry.desc] : []))
      .map(p => `<p>${esc(p)}</p>`).join('');
    const bullets = (Array.isArray(entry.bullets) ? entry.bullets : [])
      .map(li => `<div class="feat-bullet">• ${esc(li)}</div>`).join('');
    const table = _buildTableHTML(entry.table);
    const notes = entry.notes ? `<p class="small-note">${esc(entry.notes)}</p>` : '';
    return `
    <details class="feat">
      <summary>${name}</summary>
      <div class="feature-card">${desc}${bullets}${table}${notes}</div>
    </details>`;
  }

  function _buildSectionHTML(section) {
    const title = `<div class="section-title mt-14">${esc(section.title || '')}</div>`;
    const entries = (Array.isArray(section.entries) ? section.entries : [])
      .map(_buildEntryHTML).join('');
    return title + entries;
  }

  // Вика се при ВСЯКО показване на sub-таба (виж showSubTab в app.js).
  // ⚠ БЕЗ латч „вече закачено" при липсващ root: партиалът се зарежда async и
  // едно ранно извикване не бива да заключва модула завинаги (урокът от
  // attachCampaignNpcs / attachInventory). Рендерът е идемпотентен —
  // innerHTML се презаписва, така че повторните показвания не дублират нищо.
  window.renderQuickReference = async function () {
    const root = document.getElementById('quickRefRoot');
    if (!root) return;

    root.innerHTML = '<small>Чете правилата…</small>';

    try {
      const data = await loadQuickReference();
      const sections = Array.isArray(data) ? data
        : (Array.isArray(data.sections) ? data.sections : []);
      root.innerHTML = sections.map(_buildSectionHTML).join('');
    } catch (e) {
      console.error(e);
      root.innerHTML = '<small style="color:#f66">Грешка при зареждане на Quick Reference.</small>';
    }
  };
})();
