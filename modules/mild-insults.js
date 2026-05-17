/* ===== Mild Insults Module (IIFE) ===== */
(function () {

  /* ---------------------------------------------------------------
   * AI / BOT SECTION — COMMENTED OUT (kept for possible future use)
   * ---------------------------------------------------------------
  const STORAGE_KEY_API   = 'monkInsult_apiKey';
  const STORAGE_KEY_MODEL = 'monkInsult_model';

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

  async function generateInsult_AI() {
    const apiKey = getApiKey();
    if (!apiKey) { showInsult('Enter your Anthropic API key above first.', true); return; }
    if (loading) return;
    loading = true;

    const btn = document.getElementById('btnGenerateInsult');
    if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }
    showInsult(null);

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
        showInsult(`API error (${resp.status}): ${err}`, true);
        return;
      }

      const data = await resp.json();
      const text = data.content?.find(b => b.type === 'text')?.text || '...';
      showInsult(text);
    } catch (e) {
      showInsult('Even the API avoids me. Wise.', true);
    } finally {
      loading = false;
      if (btn) { btn.disabled = false; btn.textContent = 'Generate Insult'; }
    }
  }

  // --- API key / model settings HTML (was in mild-insults.html):
  // <div class="insult-settings">
  //   <label>API Key <input type="password" id="insultApiKey" placeholder="sk-ant-..." class="full-width"></label>
  //   <div class="insult-model-row">
  //     <label>Model
  //       <select id="insultModel">
  //         <option value="claude-sonnet-4-20250514">Sonnet 4 (recommended)</option>
  //         <option value="claude-haiku-4-5-20251001">Haiku 4.5 (cheap, bad Bulgarian)</option>
  //       </select>
  //     </label>
  //     <button id="btnSaveApiKey" class="primary">Save Key</button>
  //   </div>
  // </div>
  //
  // --- Enemy type fieldset (was in mild-insults.html):
  // <div class="insult-options">
  //   <fieldset class="insult-fieldset">
  //     <legend>Enemy type</legend>
  //     <label><input type="radio" name="enemyType" value="melee" checked> Melee</label>
  //     <label><input type="radio" name="enemyType" value="ranged"> Ranged (bow/crossbow)</label>
  //     <label><input type="radio" name="enemyType" value="caster"> Caster</label>
  //   </fieldset>
  // </div>
  //
  // --- History section (was in mild-insults.html + JS):
  // const STORAGE_KEY_HISTORY = 'monkInsult_history';
  // function getHistory() { ... }
  // function pushHistory(text) { ... }
  // function clearHistory() { ... }
  // function deleteHistoryItem(idx) { ... }
  // function renderHistory() { ... }
  // <div id="insultHistory" class="insult-history hidden">
  //   <h3>History <button id="btnClearInsultHistory" class="danger small">Clear</button></h3>
  //   <ul id="insultHistoryList"></ul>
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

  function showInsult(text, isError) {
    const box = document.getElementById('insultDisplay');
    if (!box) return;
    if (text === null) {
      box.innerHTML = '<div class="insult-spinner"></div>';
      return;
    }
    box.innerHTML = isError
      ? `<p class="insult-error">${text}</p>`
      : `<p class="insult-text">"${text}"</p>`;
  }

  async function pickRandomInsult() {
    const btn = document.getElementById('btnGenerateInsult');
    if (btn) { btn.disabled = true; }
    try {
      const insults = await loadInsults();
      const pick = insults[Math.floor(Math.random() * insults.length)];
      showInsult(pick);
    } catch (e) {
      showInsult('Не можах да заредя обидите.', true);
    } finally {
      if (btn) { btn.disabled = false; }
    }
  }

  /* --- public API --- */
  window.attachInsults = function () {
    const btnGen = document.getElementById('btnGenerateInsult');
    if (btnGen) btnGen.addEventListener('click', pickRandomInsult);
  };

  window.renderInsultsUI = function () {};
})();
