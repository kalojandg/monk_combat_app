// ===== Taunts Module =====
// Генерира бойни провокации за Peace Oshiet чрез OpenAI Responses API.
(function () {
  'use strict';

  const DEFAULT_KEY = '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';

  // ── Pure helpers ────────────────────────────────────────────

  function hpStateFromCurrentHp(currentHp, maxHp) {
    if (!maxHp || maxHp <= 0) return 'confident';
    return currentHp > maxHp * 0.5 ? 'confident' : 'desperate';
  }

  const STYLE_RULES = {
    drunken:       'Style: speak with the wisdom of fermented grain. Alcohol metaphors welcome.',
    direct:        'Style: cutting personal insult aimed at one enemy only.',
    enlightenment: 'Style: fake profound Zen wisdom laced with contempt.',
    ranged:        'Style: you are far away – lure ONE enemy toward you personally.',
  };

  function buildTauntPrompt(style, hpState) {
    const toneRule = hpState === 'confident'
      ? 'Tone: playful dominance – you are winning and you know it.'
      : 'Tone: reckless wisdom – you are wounded but utterly fearless.';

    return [
      'You are Peace Oshiet, a drunken master monk.',
      '',
      'Generate ONE short combat taunt (max 14 words).',
      '',
      'All output MUST be in Bulgarian.',
      'Do not include English words.',
      'No explanation. No markdown. Single line only.',
      '',
      'Distract enemies away from the tank.',
      'Encourage single-target attack rolls.',
      'Never encourage area attacks.',
      'Never say "всички".',
      'Avoid triggering area spells.',
      'Do not reference spell mechanics.',
      '',
      toneRule,
      STYLE_RULES[style] || '',
      'Occasional alcohol philosophy.',
      'Occasional implication: "само да не дойда там".',
    ].join('\n');
  }

  // ── API call ────────────────────────────────────────────────

  async function callOpenAI(prompt) {
    const apiKey = localStorage.getItem('taunts_openai_key') || DEFAULT_KEY;

    const resp = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'gpt-5.2', input: prompt }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${resp.status}`);
    }

    const data = await resp.json();
    return (data.output_text || '').trim();
  }

  async function generateTaunt(style) {
    const d = typeof window.derived === 'function' ? window.derived() : null;
    const currentHp = window.st ? Number(window.st.hpCurrent) : 0;
    const maxHp = d ? d.maxHP : Math.max(1, currentHp);

    const hpState = hpStateFromCurrentHp(currentHp, maxHp);
    const prompt = buildTauntPrompt(style, hpState);
    return callOpenAI(prompt);
  }

  // ── DOM ─────────────────────────────────────────────────────

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

  async function handleTauntClick(style) {
    __lastStyle = style;
    const outputEl  = document.getElementById('tauntOutput');
    const rerollBtn = document.getElementById('btnTauntReroll');
    if (!outputEl) return;

    outputEl.textContent = '…';
    outputEl.classList.add('taunt-loading');
    if (rerollBtn) rerollBtn.disabled = true;

    try {
      const line = await generateTaunt(style);
      outputEl.textContent = line || '(празен отговор)';
    } catch (e) {
      outputEl.textContent = e.message === 'no-key'
        ? '(въведи OpenAI API ключ по-горе)'
        : `(грешка: ${e.message})`;
    } finally {
      outputEl.classList.remove('taunt-loading');
      if (rerollBtn) rerollBtn.disabled = false;
    }
  }

  function attachTaunts() {
    // Style buttons
    [
      { id: 'btnTauntDrunken',       style: 'drunken' },
      { id: 'btnTauntDirect',        style: 'direct' },
      { id: 'btnTauntEnlightenment', style: 'enlightenment' },
      { id: 'btnTauntRanged',        style: 'ranged' },
    ].forEach(({ id, style }) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('click', () => handleTauntClick(style));
    });

    // Reroll
    const rerollBtn = document.getElementById('btnTauntReroll');
    if (rerollBtn) {
      rerollBtn.addEventListener('click', () => {
        if (__lastStyle) handleTauntClick(__lastStyle);
      });
    }

    // API key
    const keyInput   = document.getElementById('tauntApiKey');
    const keySaveBtn = document.getElementById('btnTauntSaveKey');
    if (keyInput) {
      keyInput.value = localStorage.getItem('taunts_openai_key') || '';
    }
    if (keyInput && keySaveBtn) {
      keySaveBtn.addEventListener('click', () => {
        localStorage.setItem('taunts_openai_key', keyInput.value.trim());
        keySaveBtn.textContent = '✓ Saved';
        setTimeout(() => { keySaveBtn.textContent = 'Save'; }, 1400);
      });
    }

    renderTauntUI();
  }

  function ensureNoFireballEncouragement(prompt) {
    // Strip the safety-rule prohibition phrase before scanning – the word
    // "всички" is allowed inside "Never say "всички"" (that's the guard).
    const withoutProhibition = prompt.replace('Never say "всички"', '');
    return (
      !withoutProhibition.includes('всички') &&
      !prompt.toLowerCase().includes('fireball')
    );
  }

  // ── Exports ─────────────────────────────────────────────────
  window.attachTaunts                  = attachTaunts;
  window.renderTauntUI                 = renderTauntUI;
  window.hpStateFromCurrentHp          = hpStateFromCurrentHp;
  window.buildTauntPrompt              = buildTauntPrompt;
  window.ensureNoFireballEncouragement = ensureNoFireballEncouragement;
})();
