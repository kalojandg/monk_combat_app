/* ===== Insults Module (IIFE) ===== */
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

  // --- API key / model settings HTML (was in insults.html):
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
  // --- Enemy type fieldset (was in insults.html):
  // <div class="insult-options">
  //   <fieldset class="insult-fieldset">
  //     <legend>Enemy type</legend>
  //     <label><input type="radio" name="enemyType" value="melee" checked> Melee</label>
  //     <label><input type="radio" name="enemyType" value="ranged"> Ranged (bow/crossbow)</label>
  //     <label><input type="radio" name="enemyType" value="caster"> Caster</label>
  //   </fieldset>
  // </div>
  //
  // --- History section (was in insults.html + JS):
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

  // ===== Insults (insults.json) =====

  let __insultsCache = null;

  async function loadInsults() {
    if (__insultsCache) return __insultsCache;
    const res = await fetch('insults.json', { cache: 'no-store' });
    __insultsCache = await res.json();
    return __insultsCache;
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
    if (btn) btn.disabled = true;
    try {
      const insults = await loadInsults();
      const pick = insults[Math.floor(Math.random() * insults.length)];
      showInsult(pick);
    } catch (e) {
      showInsult('Не можах да заредя обидите.', true);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // ===== Tasha's Hideous Laughter (tasha-jokes.json) =====

  let __tashaJokesCache = null;

  async function loadTashaJokes() {
    if (__tashaJokesCache) return __tashaJokesCache;
    const res = await fetch('tasha-jokes.json', { cache: 'no-store' });
    __tashaJokesCache = await res.json();
    return __tashaJokesCache;
  }

  function showTashaJoke(text, isError) {
    const box = document.getElementById('tashaDisplay');
    if (!box) return;
    if (text === null) {
      box.innerHTML = '<div class="tasha-spinner"></div>';
      return;
    }
    box.innerHTML = isError
      ? `<p class="tasha-error">${text}</p>`
      : `<p class="tasha-text">${text}</p>`;
  }

  async function pickRandomTashaJoke() {
    const btn = document.getElementById('btnGenerateTasha');
    if (btn) btn.disabled = true;
    try {
      const jokes = await loadTashaJokes();
      const pick = jokes[Math.floor(Math.random() * jokes.length)];
      showTashaJoke(pick);
    } catch (e) {
      showTashaJoke('Failed to load jokes.', true);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // ===== Brutal Dark Jokes (dark-jokes.json) =====

  let __darkJokesCache = null;

  async function loadDarkJokes() {
    if (__darkJokesCache) return __darkJokesCache;
    const res = await fetch('dark-jokes.json', { cache: 'no-store' });
    __darkJokesCache = await res.json();
    return __darkJokesCache;
  }

  function showDarkJoke(text, isError) {
    const box = document.getElementById('darkJokeDisplay');
    if (!box) return;
    if (text === null) {
      box.innerHTML = '<div class="dark-joke-spinner"></div>';
      return;
    }
    box.innerHTML = isError
      ? `<p class="dark-joke-error">${text}</p>`
      : `<p class="dark-joke-text">${text}</p>`;
  }

  async function pickRandomDarkJoke() {
    const btn = document.getElementById('btnGenerateDarkJoke');
    if (btn) btn.disabled = true;
    try {
      const jokes = await loadDarkJokes();
      const pick = jokes[Math.floor(Math.random() * jokes.length)];
      showDarkJoke(pick);
    } catch (e) {
      showDarkJoke('Failed to load jokes.', true);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  /* --- public API --- */
  window.attachInsults = function () {
    const btnInsult = document.getElementById('btnGenerateInsult');
    if (btnInsult) btnInsult.addEventListener('click', pickRandomInsult);
    const btnJoke = document.getElementById('btnGenerateDarkJoke');
    if (btnJoke) btnJoke.addEventListener('click', pickRandomDarkJoke);
    const btnTasha = document.getElementById('btnGenerateTasha');
    if (btnTasha) btnTasha.addEventListener('click', pickRandomTashaJoke);
  };

  window.renderInsultsUI = function () {};
})();
