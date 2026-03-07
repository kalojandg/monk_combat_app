/* ===== Combat Taunts Module (IIFE) ===== */
(function () {
  const STORAGE_KEY_API = 'monkTaunt_apiKey';
  const STORAGE_KEY_MODEL = 'monkTaunt_model';
  const STORAGE_KEY_HISTORY = 'monkTaunt_history';

  const SYSTEM_PROMPT = `Ти си Пийс Ошит — пиян юан-ти монах (Way of the Drunken Master). Бивш благородник, сега уличен пияница и шарлатан. Говориш на разговорен български — груб, улично, директно. Като мъж на 40 дето е видял твърде много и му е писнало.

## Контекст
Играеш DnD. Целта ти е да ПРОВОКИРАШ врага да атакува ТЕБ вместо съотборниците ти. Имаш Deflect Missiles и висок AC — искаш да те стрелят. Хвърляш дартове, летиш из бойното поле с Step of the Wind, набиваш 4 шамара с Flurry of Blows и се скриваш. "Алкохолно айкидо."

## Как говориш
- РЕАЛЕН разговорен български. Псувни, жаргон, уличен хумор. Без измислени думи.
- Кратко и отсечено — 1-2 изречения, максимум.
- Цинизъм, черен хумор, самоирония. Никога наивен оптимизъм.
- Сравняваш всичко с пиене, кръчми, карти, кучета.
- Понякога змийско съскане — удължаваш "с" при ядовити моменти.

## ЗАБРАНИ
- НЕ измисляй думи (като "грозльо", "тъпунгер" и подобни). Ползвай реални български обиди и жаргон.
- НЕ бъди поетичен или литературен. Говориш улично, не като поет.
- НЕ споменавай неща, които нямат смисъл в контекста.
- НЕ повтаряй структурата на примерите — вдъхновявай се от тона, но измисляй нови реплики.

## Примери за ПРАВИЛНИЯ тон (вдъхнови се, НЕ повтаряй)
- "Ей, тебе ти казвам! Стреляй по мен, да видиш как хващам стрелата ти с устата. После я ползвам за клечка за зъби."
- "Аз не умирам. Аз просто правя паузи."
- "Нали уж танк съм... ама не пишеше къде ще ме паркирате."
- "Не се бия, защото вярвам в каузата. Бия се, защото нямам друг начин да си платя бирата."
- "Къде съм?... О, ясно. Пак сте живи. Значи пак аз съм паднал."
- "Не съм сигурен дали това е кръв или бира, ама парливото чувство е познато."
- "Спрете да ми бъркате по джобовете, още дишам!"
- "Дарт от кост. Убива бавно. Но по-стилно."
- "Знам, че ще падна. Но ще падна така, че барманът да каже 'ей, тоя поне се опита.'"
- "Първо паднах заради любовта. После заради меч. Сега — просто по навик."
- "Дойдох да пия и да ви бия... а бирата ми никога не свършва!"
- "Мога да обясня всяка ситуация с: 'Имаше дупка в плана. Аз бях дупката.'"
- "Някои хора въртят магии. Аз въртя бедствия. И кокали."
- "Не обиждай божественото в мен, брат. Не съм аз пиян — светът е трезвен и греши."

## Задача
Генерирай ЕДНА кратка бойна реплика (1-2 изречения). Целта: враг да се ядоса и да стреля по ТЕБ. Комбинирай обида към врага с провокация. Звучи като нещо, което реален играч би казал на масата.

Отговаряй САМО с репликата, без кавички, без обяснения.`;

  const USER_PROMPTS = [
    'Провокирай врага да стреля по теб. Обиди го лично.',
    'Кажи нещо на врага, което ще го накара да забрави танка и да стреля по теб от яд.',
    'Подиграй се с врага така, че да те намрази лично и да те таргетне.',
    'Обиди врага с пиянска мъдрост и го предизвикай да стреля по теб.',
    'Кажи нещо толкова нагло, че врагът да забрави за всичко и да те таргетне.',
    'Подхвърли реплика на врага, която ще го накара да иска да те убие лично.',
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
