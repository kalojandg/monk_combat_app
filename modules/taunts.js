/* ===== Combat Taunts Module (IIFE) ===== */
(function () {

  /* ---------------------------------------------------------------
   * AI / BOT SECTION — COMMENTED OUT (kept for possible future use)
   * ---------------------------------------------------------------
  const STORAGE_KEY_API   = 'monkTaunt_apiKey';
  const STORAGE_KEY_MODEL = 'monkTaunt_model';

  const SYSTEM_PROMPT = `Ти си Пийс Ошит — пиян юан-ти монах (Way of the Drunken Master). ...`;

  const MOOD = {
    high: 'Пийс е на повече от 50% HP — самонадеян, надъхан, груб, нахален. Чувства се неуязвим.',
    mid:  'Пийс е на 30-50% HP — по-смирен, но все още хапещ.',
    low:  'Пийс е под 30% HP — отчаян, на ръба.'
  };

  const ENEMY_CONTEXT = {
    melee:  'Врагът е melee боец ...',
    ranged: 'Врагът има лък или арбалет ...',
    caster: 'Врагът е магьосник ...'
  };

  function getApiKey()  { return localStorage.getItem(STORAGE_KEY_API) || ''; }
  function setApiKey(k) { localStorage.setItem(STORAGE_KEY_API, k); }
  function getModel()   { return localStorage.getItem(STORAGE_KEY_MODEL) || 'claude-sonnet-4-20250514'; }
  function setModel(m)  { localStorage.setItem(STORAGE_KEY_MODEL, m); }

  function getMood() {
    const st = window.st;
    if (!st) return 'high';
    const d = window.derived ? window.derived() : null;
    const maxHP = d ? d.maxHP : 10;
    const pct = Math.round((st.hpCurrent / maxHP) * 100);
    if (pct > 50) return 'high';
    if (pct >= 30) return 'mid';
    return 'low';
  }

  function getEnemyType() {
    const checked = document.querySelector('input[name="enemyType"]:checked');
    return checked ? checked.value : 'melee';
  }

  function buildUserPrompt() {
    const mood = getMood();
    const enemyType = getEnemyType();
    const moodLine = MOOD[mood];
    const enemyLine = ENEMY_CONTEXT[enemyType];
    const prompts = [
      'Обиди врага с Vicious Mockery.',
      'Кажи нещо на врага, което ще го накара да те намрази лично.',
      'Измисли обида, която ще накара масата да се смее, а врага — да побеснее.',
      'Унижи врага с пиянска мъдрост и игра на думи.',
    ];
    const base = prompts[Math.floor(Math.random() * prompts.length)];
    return `${moodLine}\n${enemyLine}\n\n${base}`;
  }

  let loading = false;

  async function generateTaunt_AI() {
    const apiKey = getApiKey();
    if (!apiKey) { showTaunt('Enter your Anthropic API key above first.', true); return; }
    if (loading) return;
    loading = true;

    const btn = document.getElementById('btnGenerateTaunt');
    if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }
    showTaunt(null);
    updateMoodIndicator();

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: getModel(),
          max_tokens: 80,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: buildUserPrompt() }],
        }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        showTaunt(`API error (${resp.status}): ${err}`, true);
        return;
      }

      const data = await resp.json();
      const text = data.content?.find(b => b.type === 'text')?.text || '...';
      showTaunt(text);
    } catch (e) {
      showTaunt('Even the API avoids me. Wise.', true);
    } finally {
      loading = false;
      if (btn) { btn.disabled = false; btn.textContent = 'Generate Taunt'; }
    }
  }

  // --- API key / model settings HTML (was in taunts.html):
  // <div class="taunt-settings">
  //   <label>API Key <input type="password" id="tauntApiKey" placeholder="sk-ant-..." class="full-width"></label>
  //   <div class="taunt-model-row">
  //     <label>Model
  //       <select id="tauntModel">
  //         <option value="claude-sonnet-4-20250514">Sonnet 4 (recommended)</option>
  //         <option value="claude-haiku-4-5-20251001">Haiku 4.5 (cheap, bad Bulgarian)</option>
  //       </select>
  //     </label>
  //     <button id="btnSaveApiKey" class="primary">Save Key</button>
  //   </div>
  // </div>
  //
  // --- Enemy type fieldset (was in taunts.html):
  // <div class="taunt-options">
  //   <fieldset class="taunt-fieldset">
  //     <legend>Enemy type</legend>
  //     <label><input type="radio" name="enemyType" value="melee" checked> Melee</label>
  //     <label><input type="radio" name="enemyType" value="ranged"> Ranged (bow/crossbow)</label>
  //     <label><input type="radio" name="enemyType" value="caster"> Caster</label>
  //   </fieldset>
  // </div>
  //
  // --- History section (was in taunts.html + JS):
  // const STORAGE_KEY_HISTORY = 'monkTaunt_history';
  // function getHistory() { ... }
  // function pushHistory(text) { ... }
  // function clearHistory() { ... }
  // function deleteHistoryItem(idx) { ... }
  // function renderHistory() { ... }
  // <div id="tauntHistory" class="taunt-history hidden">
  //   <h3>History <button id="btnClearTauntHistory" class="danger small">Clear</button></h3>
  //   <ul id="tauntHistoryList"></ul>
  // </div>
  * --------------------------------------------------------------- */

  // ===== ACTIVE CODE — random insult from insults.json =====

  let __cache = null;

  async function loadInsults() {
    if (__cache) return __cache;
    const res = await fetch('insults.json', { cache: 'no-store' });
    __cache = await res.json();
    return __cache;
  }

  function getHpPercent() {
    const st = window.st;
    if (!st) return 100;
    const d = window.derived ? window.derived() : null;
    const maxHP = d ? d.maxHP : 10;
    return Math.round((st.hpCurrent / maxHP) * 100);
  }

  function updateMoodIndicator() {
    const el = document.getElementById('tauntMoodIndicator');
    if (!el) return;
    const pct = getHpPercent();
    let mood, label;
    if (pct > 50)      { mood = 'high'; label = 'Cocky & Brutal'; }
    else if (pct >= 30){ mood = 'mid';  label = 'Bloodied but Standing'; }
    else               { mood = 'low';  label = 'Desperate & Unhinged'; }
    el.className = 'taunt-mood taunt-mood-' + mood;
    el.textContent = `HP ${pct}% — ${label}`;
  }

  function showTaunt(text, isError) {
    const box = document.getElementById('tauntDisplay');
    if (!box) return;
    if (text === null) {
      box.innerHTML = '<div class="taunt-spinner"></div>';
      return;
    }
    box.innerHTML = isError
      ? `<p class="taunt-error">${text}</p>`
      : `<p class="taunt-text">"${text}"</p>`;
  }

  async function pickRandomTaunt() {
    const btn = document.getElementById('btnGenerateTaunt');
    if (btn) { btn.disabled = true; }
    updateMoodIndicator();
    try {
      const insults = await loadInsults();
      const pick = insults[Math.floor(Math.random() * insults.length)];
      showTaunt(pick);
    } catch (e) {
      showTaunt('Не можах да заредя обидите.', true);
    } finally {
      if (btn) { btn.disabled = false; }
    }
  }

  /* --- public API --- */
  window.attachTaunts = function () {
    const btnGen = document.getElementById('btnGenerateTaunt');
    if (btnGen) btnGen.addEventListener('click', pickRandomTaunt);
    updateMoodIndicator();
  };

  window.renderTauntsUI = function () {
    updateMoodIndicator();
  };
})();
