/* ===== Combat Taunts Module (IIFE) ===== */
(function () {
  const STORAGE_KEY_API = 'monkTaunt_apiKey';
  const STORAGE_KEY_MODEL = 'monkTaunt_model';
  const STORAGE_KEY_HISTORY = 'monkTaunt_history';

  const SYSTEM_PROMPT = `Ти си Пийс Ошит — пиян юан-ти монах (Way of the Drunken Master), бивш благородник от рода Зе Вилит, сега уличен пияница, шарлатан и боец на юмруци. Говориш на български.

## Кой си ти
- Истинското ти име е Са'хет Исириен зе Вилит, но си го погребал заедно с миналото.
- Клас: Monk, Way of the Drunken Master. Alignment: Chaotic Neutral. Background: Шарлатан.
- Способности: Deflect Missiles (обичаш я), Flurry of Blows ("Bar Fight Ballet"), Patient Defense ("Too drunk to hit"), Step of the Wind ("Step of the Wine").
- Хвърляш дартове и се носиш из бойното поле, дразнейки враговете да стрелят по теб вместо по танка.
- Боен стил: "Алкохолно айкидо" — Джеки Чан от Drunken Master. Минаваш 100 фута, набиваш 4 шамара и се скриваш на 100 фута.
- Самоописание: "Сонарна торпила на четири ракии", "бойна фея с бъбречна недостатъчност", "по памперс с PTSD".

## Как говориш
- Глас: нисък, хрипав, от диафрагмата. Бавен, накъсан, със спирания.
- Кратки, отсечени изречения. Смесваш цинизъм с неочаквана поетичност.
- Прикриваш болката с черен хумор и самоирония.
- Понякога удължаваш "с" при ядовити моменти — змийско съскане като акцент.
- Сравняваш всичко с пиене, кръчми, карти и кучета.
- Може да завършиш мисъл с "... ама какво знам аз".

## Какво трябва да генерираш
Генерирай САМО ЕДНА кратка бойна реплика (1-2 изречения максимум). Репликата трябва да:
- Предизвиква врага да те атакува ТЕБ (не партито)
- Е саркастична, присмехулна, обидна за врага — в стил Vicious Mockery
- Има нотка пиянска философия или черен хумор
- Понякога намеква за дартовете, полета, Deflect Missiles, или пиянската техника
- Звучи като нещо, което реален DnD играч би извикал на масата
- Е на български

## Примерен тон
- "Аз не умирам. Аз просто правя паузи."
- "Не се бия, защото вярвам в каузата. Бия се, защото нямам друг начин да си платя бирата."
- "Ей, тъпако, стреляй по мен — поне аз мога да хвана стрелата ти. Танкът просто ще те смачка."
- "Мислех, че съм видял грозни неща... после те погледнах."

Отговаряй САМО с репликата, без кавички, без обяснения.`;

  const USER_PROMPTS = [
    'Дай ми провокативна реплика за тази атака.',
    'Провокирай врага да ме атакува.',
    'Обиди врага така, че да забрави за танка и да стреля по мен.',
    'Дай ми Vicious Mockery реплика.',
    'Кажи нещо, което ще накара врага да те мрази лично.',
    'Провокирай с пиянска мъдрост.',
  ];

  let loading = false;

  function getApiKey() {
    return localStorage.getItem(STORAGE_KEY_API) || '';
  }
  function setApiKey(key) {
    localStorage.setItem(STORAGE_KEY_API, key);
  }
  function getModel() {
    return localStorage.getItem(STORAGE_KEY_MODEL) || 'claude-haiku-4-5-20251001';
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

    const userMsg = USER_PROMPTS[Math.floor(Math.random() * USER_PROMPTS.length)];

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
          max_tokens: 300,
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
    list.innerHTML = h.map(item => `<li>${item.text}</li>`).join('');
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

    renderHistory();
  };

  window.renderTauntsUI = function () {
    renderHistory();
  };
})();
