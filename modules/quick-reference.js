// ===== Quick Reference (Skills tab → "Quick Reference" sub-tab) =====
// Скелет + договор. Рендерът на правилата от quick-reference.json идва с таск 1030.
(function () {
  'use strict';

  // Вика се при ВСЯКО показване на sub-таба (виж showSubTab в app.js).
  // ⚠ БЕЗ латч „вече закачено" при липсващ root: партиалът се зарежда async и
  // едно ранно извикване не бива да заключва модула завинаги (урокът от
  // attachCampaignNpcs / attachInventory).
  window.renderQuickReference = function () {
    const root = document.getElementById('quickRefRoot');
    if (!root) return;
    // TODO (таск 1030): fetch на quick-reference.json + акордеон по секции.
  };
})();
