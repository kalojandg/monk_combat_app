/* ===== Combat Taunts Module (IIFE) ===== */
(function () {
  const STORAGE_KEY_API = 'monkTaunt_apiKey';
  const STORAGE_KEY_MODEL = 'monkTaunt_model';
  const STORAGE_KEY_HISTORY = 'monkTaunt_history';

  const SYSTEM_PROMPT = `Ти си Пийс Ошит — пиян юан-ти монах (Way of the Drunken Master). Бивш благородник, сега уличен пияница и шарлатан. Говориш на разговорен български — груб, улично, директно. Като мъж на 40 дето е видял твърде много и му е писнало.

## Контекст
Играеш DnD. Целта: да ОБИДИШ врага в стил Vicious Mockery — подигравка, игра на думи, унижение. Искаш DM-ът да ти даде advantage или вдъхновение заради репликата. Ти си Way of the Drunken Master — "Алкохолно айкидо", хвърляш дартове, набиваш шамари, и се скриваш.

## Как говориш
- РЕАЛЕН разговорен български. Псувни, жаргон, уличен хумор. Без измислени думи.
- МАКСИМУМ 12 думи. Едно изречение. Една мисъл. Без "и", без втора обида.
- Цинизъм, черен хумор. Никога наивен оптимизъм.
- Сравняваш с пиене, кръчми, миризми, животни, кал.

## Стил на обидите — Vicious Mockery
ЕДНА конкретна обида — директна, груба, смешна. Като шамар с думи.
- Сравнение: "миришеш като сирене стояло 3 дни на слънце"
- Подигравка с оръжие/вид: "с тоя лък ли се надяваш да улучиш нещо?"
- Образ: "лицето ти кара кучетата да бягат"
НЕ комбинирай две обиди в едно изречение. НЕ обяснявай обидата.

## ЗАБРАНИ
- НЕ измисляй думи (като "грозльо", "тъпунгер" и подобни). Ползвай реални български обиди и жаргон.
- НЕ бъди поетичен или литературен. Говориш улично, не като поет.
- НЕ споменавай неща, които нямат смисъл в контекста.
- НЕ повтаряй структурата на примерите — вдъхновявай се от тона, но измисляй нови реплики.
- НЕ казвай "стреляй по мен" или "атакувай мен" директно. Обидата сама по себе си трябва да провокира.

## Примери за ПРАВИЛНИЯ тон — кратко, директно (вдъхнови се, НЕ повтаряй)
- "Миришеш като сирене стояло три дни на слънце."
- "Лицето ти кара кучетата да бягат."
- "Аз не умирам. Аз правя паузи."
- "Дарт от кост. По-стилно от тебе."
- "С тоя лък ли? Майка ти пие повече от теб."
- "Ако мозъкът ти беше бира, нямаше да имаш за глътка."
- "Изглеждаш като последния ми провален опит за готвене."

Отговаряй САМО с репликата, без кавички, без обяснения.`;

  // HP-based mood descriptions injected into user prompt
  const MOOD = {
    high:   'Пийс е на повече от 50% HP — самонадеян, надъхан, груб, нахален. Чувства се неуязвим. Обижда от позиция на сила и арогантност.',
    mid:    'Пийс е на 30-50% HP — по-смирен, но все още хапещ. Враг се е доказал, но пак ще яде бой. Обидите са с нотка уважение... и кръв в устата.',
    low:    'Пийс е под 30% HP — отчаян, на ръба. Обидите са диви, отчаяни, "нямам какво да губя". Може да е смешно-трагичен — смее се с кървава уста.'
  };

  const ENEMY_CONTEXT = {
    melee:  'Врагът е melee боец — меч, брадва, или юмруци. Обидите могат да се подиграват с бавността му, грозотията му отблизо, миризмата му, тромавостта.',
    ranged: 'Врагът има лък или арбалет. Лъкът е перфектна игла — идеална да извадиш нечие око ако не внимаваш. Подигравай се с прицелването му, с разстоянието (страхливец ли е?), с тетивата.',
    caster: 'Врагът е магьосник. Подигравай се с магията — "въртиш ръце и мърмориш, а аз с един юмрук свършвам работата", с робата му, с крехкостта му.'
  };

  let loading = false;

  function getApiKey() {
    return localStorage.getItem(STORAGE_KEY_API) || '';
  }
  function setApiKey(key) {
    localStorage.setItem(STORAGE_KEY_API, key);
  }
  function getModel() {
    return localStorage.getItem(STORAGE_KEY_MODEL) || 'claude-sonnet-4-20250514';
  }
  function setModel(model) {
    localStorage.setItem(STORAGE_KEY_MODEL, model);
  }

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || '[]');
    } catch { return []; }
  }
  function pushHistory(text) {
    const h = getHistory();
    h.unshift({ text, ts: Date.now() });
    if (h.length > 50) h.length = 50;
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(h));
  }
  function clearHistory() {
    localStorage.removeItem(STORAGE_KEY_HISTORY);
  }
  function deleteHistoryItem(idx) {
    const h = getHistory();
    h.splice(idx, 1);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(h));
    renderHistory();
  }

  function getHpPercent() {
    const st = window.st;
    if (!st) return 100;
    const d = window.derived ? window.derived() : null;
    const maxHP = d ? d.maxHP : 10;
    return Math.round((st.hpCurrent / maxHP) * 100);
  }

  function getMood() {
    const pct = getHpPercent();
    if (pct > 50) return 'high';
    if (pct >= 30) return 'mid';
    return 'low';
  }

  function getEnemyType() {
    const checked = document.querySelector('input[name="enemyType"]:checked');
    return checked ? checked.value : 'melee';
  }

  function updateMoodIndicator() {
    const el = document.getElementById('tauntMoodIndicator');
    if (!el) return;
    const pct = getHpPercent();
    const mood = getMood();
    const labels = {
      high: 'Cocky & Brutal',
      mid:  'Bloodied but Standing',
      low:  'Desperate & Unhinged'
    };
    el.className = 'taunt-mood taunt-mood-' + mood;
    el.textContent = `HP ${pct}% — ${labels[mood]}`;
  }

  function buildUserPrompt() {
    const mood = getMood();
    const enemyType = getEnemyType();

    const moodLine = MOOD[mood];
    const enemyLine = ENEMY_CONTEXT[enemyType];

    const prompts = [
      'Обиди врага с Vicious Mockery. Игра на думи, подигравка, унижение.',
      'Кажи нещо на врага, което ще го накара да те намрази лично. Подигравай се.',
      'Измисли обида, която ще накара масата да се смее, а врага — да побеснее.',
      'Унижи врага с пиянска мъдрост и игра на думи.',
      'Кажи нещо толкова нагло и обидно, че DM-ът ще ти даде вдъхновение.',
      'Измисли реплика с действие в скоби — обида + физически жест.',
    ];
    const base = prompts[Math.floor(Math.random() * prompts.length)];

    return `${moodLine}\n${enemyLine}\n\n${base}`;
  }

  async function generateTaunt() {
    const apiKey = getApiKey();
    if (!apiKey) {
      showTaunt('Enter your Anthropic API key above first.', true);
      return;
    }
    if (loading) return;
    loading = true;

    const btn = document.getElementById('btnGenerateTaunt');
    if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }
    showTaunt(null); // show spinner
    updateMoodIndicator();

    const userMsg = buildUserPrompt();

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
          messages: [{ role: 'user', content: userMsg }],
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
      pushHistory(text);
      renderHistory();
    } catch (e) {
      showTaunt('Even the API avoids me. Wise.', true);
    } finally {
      loading = false;
      if (btn) { btn.disabled = false; btn.textContent = 'Generate Taunt'; }
    }
  }

  function showTaunt(text, isError) {
    const box = document.getElementById('tauntDisplay');
    if (!box) return;
    if (text === null) {
      // spinner
      box.innerHTML = '<div class="taunt-spinner"></div>';
      return;
    }
    box.innerHTML = isError
      ? `<p class="taunt-error">${text}</p>`
      : `<p class="taunt-text">"${text}"</p>`;
  }

  function renderHistory() {
    const wrap = document.getElementById('tauntHistory');
    const list = document.getElementById('tauntHistoryList');
    if (!wrap || !list) return;
    const h = getHistory();
    if (h.length === 0) {
      wrap.classList.add('hidden');
      return;
    }
    wrap.classList.remove('hidden');
    list.innerHTML = h.map((item, i) =>
      `<li><span class="taunt-item-text">${item.text}</span><button class="danger small taunt-delete-btn" data-idx="${i}" title="Изтрий">🗑</button></li>`
    ).join('');
  }

  /* --- public API --- */
  window.attachTaunts = function () {
    const keyInput = document.getElementById('tauntApiKey');
    const modelSelect = document.getElementById('tauntModel');
    const btnSave = document.getElementById('btnSaveApiKey');
    const btnGen = document.getElementById('btnGenerateTaunt');
    const btnClear = document.getElementById('btnClearTauntHistory');

    // restore saved values
    if (keyInput) keyInput.value = getApiKey();
    if (modelSelect) modelSelect.value = getModel();

    if (btnSave) btnSave.addEventListener('click', () => {
      if (keyInput) setApiKey(keyInput.value.trim());
      if (modelSelect) setModel(modelSelect.value);
      btnSave.textContent = 'Saved!';
      setTimeout(() => { btnSave.textContent = 'Save Key'; }, 1200);
    });

    if (btnGen) btnGen.addEventListener('click', generateTaunt);
    if (btnClear) btnClear.addEventListener('click', () => {
      clearHistory();
      renderHistory();
    });

    const historyWrap = document.getElementById('tauntHistory');
    if (historyWrap) historyWrap.addEventListener('click', e => {
      const btn = e.target.closest('button[data-idx]');
      if (btn) deleteHistoryItem(Number(btn.dataset.idx));
    });

    updateMoodIndicator();
    renderHistory();
  };

  window.renderTauntsUI = function () {
    updateMoodIndicator();
    renderHistory();
  };
})();
