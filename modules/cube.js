// ===== Cube of Force widget =====
// Floating widget (right wall) + dialog with charges / faces / theme switching.
// Self-contained IIFE, initialises on DOMContentLoaded (window.st / window.save
// are already available then — app.js is a sync script before </body>).
(function () {
  'use strict';

  var MAX_CHARGES = 36;
  var DRAG_THRESHOLD = 5; // px — separates a click from a drag

  // Face table (RAW, DMG p.159). theme = themes/<theme>.css, accent = swatch colour.
  var FACES = [
    { face: 1, name: 'Fog',     theme: 'fog',     cost: 1, accent: '#5e7681', effect: "Gases, wind, and fog can't pass." },
    { face: 2, name: 'Stone',   theme: 'stone',   cost: 2, accent: '#8a6f4d', effect: "Nonliving matter can't pass." },
    { face: 3, name: 'Moss',    theme: 'moss',    cost: 3, accent: '#5e7a58', effect: "Living matter can't pass." },
    { face: 4, name: 'Arcane',  theme: 'arcane',  cost: 4, accent: '#71618f', effect: "Spell effects can't pass." },
    { face: 5, name: 'Bastion', theme: 'bastion', cost: 5, accent: '#8a5a62', effect: "Nothing can pass." }
  ];

  function faceByNum(n) {
    for (var i = 0; i < FACES.length; i++) if (FACES[i].face === n) return FACES[i];
    return null;
  }

  // Spell charge-drain table (RAW, DMG p.159). The die is rolled physically at the
  // table; the player types the rolled damage and Apply subtracts it from charges.
  var DRAIN_SPELLS = [
    { key: 'disintegrate',     name: 'Disintegrate',     dice: '1d12' },
    { key: 'horn-of-blasting', name: 'Horn of Blasting', dice: '1d10' },
    { key: 'passwall',         name: 'Passwall',         dice: '1d6'  },
    { key: 'prismatic-spray',  name: 'Prismatic Spray',  dice: '1d20' },
    { key: 'wall-of-fire',     name: 'Wall of Fire',     dice: '1d4'  }
  ];

  // Drain only makes sense while the barrier actually stops spells: face 4 or 5.
  function canDrain(cube) {
    return cube.activeFace === 4 || cube.activeFace === 5;
  }

  // ---- state helpers ----
  function getCube() {
    var st = window.st || {};
    if (!st.cube || typeof st.cube !== 'object') st.cube = { charges: MAX_CHARGES, activeFace: null };
    if (typeof st.cube.charges !== 'number') st.cube.charges = MAX_CHARGES;
    if (typeof st.cube.activeFace === 'undefined') st.cube.activeFace = null;
    return st.cube;
  }

  function persist() {
    if (typeof window.save === 'function') window.save();
    render();
  }

  // ---- theme link swap (no @import; themes are standalone files) ----
  function applyTheme(faceNum) {
    var f = faceByNum(faceNum);
    if (!f) { removeTheme(); return; }
    var link = document.getElementById('cubeThemeLink');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.id = 'cubeThemeLink';
    }
    var href = 'themes/' + f.theme + '.css';
    if (link.getAttribute('href') === href && link === document.head.lastElementChild) return;
    link.setAttribute('href', href);
    document.head.appendChild(link); // keep it the LAST element in <head> → wins the cascade
  }

  function removeTheme() {
    var link = document.getElementById('cubeThemeLink');
    if (link && link.parentNode) link.parentNode.removeChild(link);
  }

  // ---- DOM ----
  var widget, dialog, chargesValEl, regainInput, minuteBtn, facesEl;
  var ticker, drainToggle, drainPanel;

  function build() {
    // Peek handle (3x3 "Rubik" grid of muted accent colours)
    widget = document.createElement('div');
    widget.id = 'cubeWidget';
    widget.className = 'cube-widget peek';
    widget.title = 'Cube of Force';
    var grid = document.createElement('div');
    grid.className = 'cube-grid';
    var cellColors = ['#5e7681', '#8a6f4d', '#5e7a58', '#71618f', '#8a5a62', '#3d4c85', '#5e7a58', '#5e7681', '#71618f'];
    for (var i = 0; i < 9; i++) {
      var cell = document.createElement('span');
      cell.className = 'cube-cell';
      cell.style.background = cellColors[i];
      grid.appendChild(cell);
    }
    widget.appendChild(grid);
    document.body.appendChild(widget);

    // News ticker lives statically in index.html (between .header and #tab-combat).
    ticker = document.getElementById('cubeTicker');

    // Drain-accordion rows (5 spells from the RAW drain table)
    var drainRows = DRAIN_SPELLS.map(function (s) {
      return '<div class="cube-drain-item" data-spell="' + s.key + '">' +
          '<span class="cube-drain-name">' + s.name + '</span>' +
          '<span class="cube-drain-dice">' + s.dice + '</span>' +
          '<input class="cube-num cube-drain-input" type="number" min="1" step="1">' +
          '<button class="cube-btn cube-drain-apply" type="button">Apply</button>' +
        '</div>';
    }).join('');

    // Dialog
    dialog = document.createElement('div');
    dialog.id = 'cubeDialog';
    dialog.className = 'cube-dialog hidden';
    dialog.innerHTML =
      '<div class="cube-dialog__card">' +
        '<div class="cube-dialog__head">' +
          '<span class="cube-dialog__title">Cube of Force</span>' +
          '<button id="cubeClose" class="cube-close" type="button" aria-label="Close">✕</button>' +
        '</div>' +
        '<div class="cube-row cube-charges-row">' +
          '<span class="cube-charges">Charges: <span id="cubeChargesVal">36</span> / ' + MAX_CHARGES + '</span>' +
          '<input id="cubeRegainInput" class="cube-num" type="number" min="1" step="1">' +
          '<button id="cubeRegainBtn" class="cube-btn" type="button">Regain Charges</button>' +
        '</div>' +
        '<div class="cube-row">' +
          '<button id="cubeMinuteBtn" class="cube-btn" type="button">Minute Elapsed</button>' +
        '</div>' +
        '<div class="cube-row cube-drain-header-row">' +
          '<button id="cubeDrainToggle" class="cube-btn cube-drain-toggle" type="button" aria-expanded="false" disabled>' +
            '<span class="cube-drain-arrow">▶</span> Dmg from special spells' +
          '</button>' +
        '</div>' +
        '<div id="cubeDrainPanel" class="cube-drain-panel hidden">' + drainRows + '</div>' +
        '<div id="cubeFaces" class="cube-faces"></div>' +
      '</div>';
    document.body.appendChild(dialog);

    chargesValEl = dialog.querySelector('#cubeChargesVal');
    regainInput = dialog.querySelector('#cubeRegainInput');
    minuteBtn = dialog.querySelector('#cubeMinuteBtn');
    facesEl = dialog.querySelector('#cubeFaces');
    drainToggle = dialog.querySelector('#cubeDrainToggle');
    drainPanel = dialog.querySelector('#cubeDrainPanel');

    // Wire dialog controls
    dialog.querySelector('#cubeClose').addEventListener('click', closeDialog);
    dialog.querySelector('#cubeRegainBtn').addEventListener('click', regain);
    minuteBtn.addEventListener('click', minuteElapsed);
    facesEl.addEventListener('click', onFacesClick);
    drainToggle.addEventListener('click', toggleDrain);
    drainPanel.addEventListener('click', onDrainClick);
    // Backdrop click closes (but not clicks inside the card)
    dialog.addEventListener('click', function (e) { if (e.target === dialog) closeDialog(); });

    // Widget click / drag
    widget.addEventListener('pointerdown', onPointerDown);
  }

  // ---- rendering ----
  function render() {
    var cube = getCube();
    // sync the theme link with state — import (applyBundle) can change activeFace under us
    if (cube.activeFace !== null) applyTheme(cube.activeFace); else removeTheme();
    if (!dialog) return;
    if (chargesValEl) chargesValEl.textContent = String(cube.charges);
    if (minuteBtn) minuteBtn.disabled = (cube.activeFace === null);
    renderTicker(cube);
    renderDrain(cube);
    renderFaces(cube);
  }

  // News ticker — shown only while a barrier is up; restored on reload via render().
  function renderTicker(cube) {
    if (!ticker) return;
    var span = ticker.querySelector('span');
    var f = faceByNum(cube.activeFace);
    if (!f) {
      ticker.classList.add('hidden');
      if (span) span.textContent = '';
      return;
    }
    if (span) {
      span.textContent = 'FACE ' + f.face + ' ACTIVE — ' + f.effect + ' · ' +
        cube.charges + ' CHARGE' + (cube.charges === 1 ? '' : 'S');
    }
    ticker.classList.remove('hidden');
  }

  // Drain accordion — the toggle is enabled only on face 4/5; when the gate
  // closes (face 1-3 or no barrier) an open panel is collapsed.
  function renderDrain(cube) {
    if (!drainToggle) return;
    var allowed = canDrain(cube);
    drainToggle.disabled = !allowed;
    if (!allowed) collapseDrain();
  }

  function collapseDrain() {
    if (!drainPanel) return;
    drainPanel.classList.add('hidden');
    if (drainToggle) {
      drainToggle.setAttribute('aria-expanded', 'false');
      var arrow = drainToggle.querySelector('.cube-drain-arrow');
      if (arrow) arrow.textContent = '▶';
    }
  }

  function toggleDrain() {
    if (!drainToggle || drainToggle.disabled || !drainPanel) return;
    var open = drainPanel.classList.toggle('hidden'); // true → now hidden
    var nowOpen = !open;
    drainToggle.setAttribute('aria-expanded', nowOpen ? 'true' : 'false');
    var arrow = drainToggle.querySelector('.cube-drain-arrow');
    if (arrow) arrow.textContent = nowOpen ? '▼' : '▶';
  }

  function onDrainClick(e) {
    var btn = e.target.closest('.cube-drain-apply');
    if (!btn) return;
    var item = btn.closest('.cube-drain-item');
    if (!item) return;
    var input = item.querySelector('.cube-drain-input');
    var v = parseInt(input ? input.value : '', 10);
    if (!isFinite(v) || v <= 0) return;
    applyDrain(v);
    if (input) input.value = '';
  }

  function applyDrain(amount) {
    var cube = getCube();
    if (!canDrain(cube)) return;                    // gate — face 4/5 only
    cube.charges -= amount;
    if (cube.charges <= 0) {                         // drained to 0 → barrier drops
      cube.charges = 0;
      cube.activeFace = null;
      removeTheme();
    }
    persist();
  }

  function renderFaces(cube) {
    if (!facesEl) return;
    var html = '';
    FACES.forEach(function (f) {
      var active = cube.activeFace === f.face;
      var disabled = active || cube.charges < f.cost;
      html +=
        '<div class="cube-face' + (active ? ' active' : '') + '" data-face="' + f.face + '">' +
          '<span class="cube-face-swatch" style="background:' + f.accent + '"></span>' +
          '<div class="cube-face-info">' +
            '<strong>Face ' + f.face + ' — ' + f.name + '</strong>' +
            '<div class="cube-face-effect">' + f.effect + ' · ' + f.cost + ' charge' + (f.cost === 1 ? '' : 's') + '</div>' +
          '</div>' +
          '<button class="cube-btn cube-activate" type="button" data-face="' + f.face + '"' + (disabled ? ' disabled' : '') + '>Activate</button>' +
        '</div>';
    });
    // Face 6 — Deactivate
    var noBarrier = cube.activeFace === null;
    html +=
      '<div class="cube-face" data-face="6">' +
        '<span class="cube-face-swatch cube-face-swatch--off"></span>' +
        '<div class="cube-face-info">' +
          '<strong>Face 6 — Deactivate</strong>' +
          '<div class="cube-face-effect">The barrier drops. · 0 charges</div>' +
        '</div>' +
        '<button class="cube-btn cube-activate" type="button" data-face="6"' + (noBarrier ? ' disabled' : '') + '>Deactivate</button>' +
      '</div>';
    facesEl.innerHTML = html;
  }

  function onFacesClick(e) {
    var btn = e.target.closest('.cube-activate');
    if (!btn || btn.disabled) return;
    var n = parseInt(btn.getAttribute('data-face'), 10);
    if (n === 6) deactivate();
    else activate(n);
  }

  // ---- actions ----
  function activate(faceNum) {
    var cube = getCube();
    var f = faceByNum(faceNum);
    if (!f) return;
    if (cube.activeFace === faceNum) return;      // already active → no-op
    if (cube.charges < f.cost) return;            // insufficient → nothing happens, nothing spent
    cube.charges -= f.cost;
    if (cube.charges <= 0) {                       // drained to 0 → barrier drops
      cube.charges = 0;
      cube.activeFace = null;
      removeTheme();
    } else {
      cube.activeFace = faceNum;
      applyTheme(faceNum);
    }
    persist();
  }

  function deactivate() {
    var cube = getCube();
    cube.activeFace = null;
    removeTheme();
    persist();
  }

  function minuteElapsed() {
    var cube = getCube();
    if (cube.activeFace === null) return;          // nothing to expire
    cube.activeFace = null;                         // duration elapsed — no charge cost
    removeTheme();
    persist();
  }

  function regain() {
    var cube = getCube();
    var v = parseInt(regainInput.value, 10);
    if (isFinite(v) && v > 0) {
      cube.charges = Math.min(MAX_CHARGES, cube.charges + v);
      persist();
    }
    regainInput.value = '';
  }

  // ---- widget state machine (peek → expanded → dialog) ----
  function openDialog() {
    dialog.classList.remove('hidden');
    render();
  }

  function closeDialog() {
    dialog.classList.add('hidden');
    widget.classList.add('peek'); // ✕ / backdrop returns to peek
  }

  function onWidgetClick() {
    if (widget.classList.contains('peek')) {
      widget.classList.remove('peek');            // peek → full icon
    } else if (dialog.classList.contains('hidden')) {
      openDialog();                                // full icon → dialog
    }
  }

  // ---- vertical drag along the right wall ----
  var dragging = false, moved = false, startY = 0, startTop = 0;

  function onPointerDown(e) {
    dragging = true;
    moved = false;
    startY = e.clientY;
    startTop = widget.getBoundingClientRect().top;
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    try { widget.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!dragging) return;
    var dy = e.clientY - startY;
    if (Math.abs(dy) > DRAG_THRESHOLD) moved = true;
    var top = startTop + dy;
    var max = window.innerHeight - widget.offsetHeight;
    if (top < 0) top = 0;
    if (top > max) top = max;
    widget.style.top = top + 'px';
    widget.style.bottom = 'auto';
  }

  function onPointerUp() {
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    if (!dragging) return;
    dragging = false;
    if (!moved) onWidgetClick();                   // a real click, not a drag
  }

  // ---- init ----
  function init() {
    if (document.getElementById('cubeWidget')) return; // guard against double init
    build();
    var cube = getCube();
    if (cube.activeFace) applyTheme(cube.activeFace); // restore theme on reload
    render();
  }

  window.renderCube = render; // applyBundle hook — Import refreshes the widget without a reload

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
