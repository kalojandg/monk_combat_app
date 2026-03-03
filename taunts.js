// taunts.js
// Peace Oshiet Advanced Local Taunt Engine
// Offline • Pure JS • High Variation • Anti-AoE psychology

(function () {
  'use strict';

  // ── Pure helpers ─────────────────────────────────────────────

  function hpStateFromCurrentHp(currentHp, maxHp) {
    return currentHp > maxHp * 0.5 ? 'confident' : 'desperate';
  }

  function random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ── Fragment pools ───────────────────────────────────────────

  const fragments = {

    opener: [
      'Спокойно',
      'Полека',
      'Айде де',
      'Хайде, герой',
      'Внимавай',
      'Моля те',
      'Опитай пак',
      'Не се напрягай',
    ],

    rangedFocus: [
      'прицелявай се внимателно',
      'стреляй пак',
      'само не трепери',
      'да видим този изстрел',
      'покажи ми как пропускаш',
      'цели се сам',
      'не обвинявай вятъра',
    ],

    targetIsolation: [
      'Сам срещу мен си по-смел.',
      'Един по един, моля.',
      'Обичам личното внимание.',
      'Самотните удари са по-честни.',
      'Няма нужда от публика.',
    ],

    alcoholWisdom: [
      'Трезвеността ти е по-опасна от мен.',
      'Алкохолът учи на баланс.',
      'Пиян съм, но стабилен.',
      'Чашата ми има повече точност.',
      'Мъдростта идва след третия пропуск.',
      'Наздраве за следващия ти неуспех.',
    ],

    insultCore: [
      'Дори сянката ти се цели по-добре.',
      'Стрелата ти се срамува.',
      'Това ли наричаш умение?',
      'И баба ми хвърля по-смело.',
      'Честта ти е по-разклатена от стойката ти.',
      'Очите ти ли треперят?',
    ],

    zenCore: [
      'Болката е временна.',
      'Пропускът е истина.',
      'Балансът липсва.',
      'Срамът е учител.',
      'Търпението ми намалява.',
      'Истината реже по-дълбоко.',
    ],

    desperateEdge: [
      'Само да не дойда там.',
      'Не ме карай да се приближа.',
      'Остани далеч, по-безопасно е.',
      'Не ме изпитвай.',
      'Ще ти обясня лично.',
    ],

    confidentEnd: [
      'Спокойно, имаш време да се изложиш.',
      'Опитай пак, забавно е.',
      'Ще почакам.',
      'Не бързай, пак ще пропуснеш.',
      'Не се притеснявай, свикнал съм.',
    ],
  };

  // ── Engine ───────────────────────────────────────────────────

  function buildSentence(style, hpState) {
    const parts = [];

    if (style === 'ranged') {
      parts.push(random(fragments.opener));
      parts.push(random(fragments.rangedFocus));
      parts.push(random(fragments.targetIsolation));
    }

    if (style === 'drunken') parts.push(random(fragments.alcoholWisdom));
    if (style === 'insult')  parts.push(random(fragments.insultCore));
    if (style === 'zen')     parts.push(random(fragments.zenCore));

    if (hpState === 'desperate' && Math.random() > 0.4) {
      parts.push(random(fragments.desperateEdge));
    }
    if (hpState === 'confident' && Math.random() > 0.4) {
      parts.push(random(fragments.confidentEnd));
    }

    return parts.join(' ');
  }

  function generateTaunt(style, currentHp, maxHp) {
    const hpState = hpStateFromCurrentHp(currentHp, maxHp);
    return buildSentence(style, hpState);
  }

  // ── DOM ──────────────────────────────────────────────────────

  function renderTauntUI() {
    const badge = document.getElementById('tauntHpBadge');
    if (!badge) return;

    const d = typeof window.derived === 'function' ? window.derived() : null;
    const currentHp = window.st ? Number(window.st.hpCurrent) : 0;
    const maxHp = d ? d.maxHP : Math.max(1, currentHp);
    const hpState = hpStateFromCurrentHp(currentHp, maxHp);

    badge.textContent = hpState === 'confident'
      ? '💪 Confident (>50% HP)'
      : '🩸 Desperate (≤50% HP)';
    badge.className = 'taunt-hp-badge taunt-hp-' + hpState;
  }

  let __lastStyle = null;

  function handleTauntClick(style) {
    __lastStyle = style;
    const outputEl = document.getElementById('tauntOutput');
    if (!outputEl) return;

    const d = typeof window.derived === 'function' ? window.derived() : null;
    const currentHp = window.st ? Number(window.st.hpCurrent) : 0;
    const maxHp = d ? d.maxHP : Math.max(1, currentHp);

    outputEl.textContent = generateTaunt(style, currentHp, maxHp);
  }

  // ── Self-init via event delegation ───────────────────────────
  // Delegates clicks on #tab-taunts so no explicit boot call is needed.

  const STYLE_IDS = {
    btnTauntDrunken: 'drunken',
    btnTauntInsult:  'insult',
    btnTauntZen:     'zen',
    btnTauntRanged:  'ranged',
  };

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('#tab-taunts button');
    if (!btn) return;

    if (btn.id in STYLE_IDS) {
      handleTauntClick(STYLE_IDS[btn.id]);
    } else if (btn.id === 'btnTauntReroll' && __lastStyle) {
      handleTauntClick(__lastStyle);
    }
  });

  // Update HP badge whenever the tab becomes visible (tab-nav click).
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-tab="taunts"]')) {
      // Small delay so tab HTML is injected first.
      setTimeout(renderTauntUI, 50);
    }
  });

  // ── Exports ──────────────────────────────────────────────────
  window.PeaceTaunts   = { generateTaunt, hpStateFromCurrentHp };
  window.renderTauntUI = renderTauntUI;
})();
