// ===== Characters Module =====
// Контейнер за героите: всеки герой има СОБСТВЕН st в СОБСТВЕН localStorage ключ
// (profile.storageKey). Указателят localStorage['activeCharacter'] казва кой е активен;
// липсва → монк → monkSheet_v3 (точно както преди). Модулът НИКОГА не пише в чужд ключ:
// записът минава само през window.save(), който пише в activeStorageKey().
(function () {
  'use strict';

  const POINTER_KEY = 'activeCharacter';
  const DEFAULT_ID = 'monk';

  function profiles() {
    return window.CLASS_PROFILES || {};
  }

  function active() {
    const id = localStorage.getItem(POINTER_KEY) || DEFAULT_ID;
    return profiles()[id] ? id : DEFAULT_ID;
  }

  function list() {
    const cur = active();
    return Object.values(profiles()).map(p => ({
      id: p.id,
      label: p.label,
      storageKey: p.storageKey,
      hasSave: localStorage.getItem(p.storageKey) !== null,
      active: p.id === cur
    }));
  }

  // Записът на героя от неговия ключ, или нов от defaultState + profile.defaults.
  function loadState(profile) {
    const raw = localStorage.getItem(profile.storageKey);
    if (raw) {
      try {
        const obj = { ...window.defaultState, ...JSON.parse(raw) };
        if (!obj.class && profile.id !== DEFAULT_ID) obj.class = profile.id;
        return obj;
      } catch { }
    }
    // Дълбоко копие — иначе масивите/обектите в defaultState стават общи между героите
    const fresh = JSON.parse(JSON.stringify(window.defaultState));
    return { ...fresh, ...JSON.parse(JSON.stringify(profile.defaults || {})), class: profile.id };
  }

  // Пререндер по пътя на applyBundle (app.js) след подмяна на state.
  function rerenderModules() {
    const st = window.st;
    if (typeof window.renderLangTable === 'function') window.renderLangTable();
    if (typeof window.renderToolTable === 'function') window.renderToolTable();
    if (typeof window.renderInventoryTable === 'function') window.renderInventoryTable();

    if (typeof window.renderDomainSpells === 'function') window.renderDomainSpells(st.clericLevel || 0);
    if (typeof window.initMarkSpells === 'function') window.initMarkSpells();
    if (typeof window.renderClericPrepSpells === 'function') window.renderClericPrepSpells();
    if (typeof window.renderClericCantrips === 'function') window.renderClericCantrips();
    if (typeof window.renderChaSpells === 'function') window.renderChaSpells();

    if (typeof window.renderCube === 'function') window.renderCube();
  }

  // Записва текущия герой в неговия ключ — само ако се различава от записаното,
  // за да не пренаписва (нормализира) непроменен жив запис като monkSheet_v3.
  function persistCurrent() {
    if (typeof window.save !== 'function') return;
    const raw = localStorage.getItem(window.activeStorageKey());
    if (raw !== null) {
      try {
        const stored = { ...window.defaultState, ...JSON.parse(raw) };
        if (JSON.stringify(stored) === JSON.stringify(window.st)) return;
      } catch { }
    }
    window.save();
  }

  function switchTo(id) {
    const profile = profiles()[id];
    if (!profile) return false;
    if (id === active()) return true;

    // 1) Записваме ТЕКУЩИЯ герой в неговия ключ, ПРЕДИ да сменим указателя
    persistCurrent();

    // 2) Сменяме указателя → activeStorageKey() вече сочи новия ключ
    localStorage.setItem(POINTER_KEY, id);

    // 3) Зареждаме/създаваме новия; save() пише само в неговия ключ и синхронизира app.js st
    window.st = loadState(profile);
    window.save();
    rerenderModules();
    render();
    return true;
  }

  // ===== Switcher UI (#charSwitcher в header-а) =====
  function render() {
    const mount = document.getElementById('charSwitcher');
    if (!mount) return;
    const items = list();
    mount.innerHTML = '';
    // Само един герой → нищо за превключване, header-ът остава както днес
    if (items.length < 2) return;

    const group = document.createElement('div');
    group.className = 'char-switcher';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Character');
    group.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center';

    items.forEach(c => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.char = c.id;
      btn.textContent = c.label || c.id;
      btn.setAttribute('aria-pressed', c.active ? 'true' : 'false');
      if (c.active) btn.classList.add('primary');
      btn.style.cssText = 'min-height:44px;min-width:44px;padding:8px 14px;font-size:1rem';
      group.appendChild(btn);
    });
    mount.appendChild(group);
  }

  function attach() {
    const mount = document.getElementById('charSwitcher');
    if (mount && !mount.__charBound) {
      mount.__charBound = true;
      mount.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-char]');
        if (btn) switchTo(btn.dataset.char);
      });
    }
    render();
  }

  window.Characters = { list, active, switchTo, render };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();
