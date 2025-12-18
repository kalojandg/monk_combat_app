# Пълна документация на поведението на Monk Combat App

## ВАЖНО: Реално използвано приложение
Това приложение се използва активно за D&D герой. **ВСЯКА ПРОМЯНА ТРЯБВА ДА ЗАПАЗВА СЪЩЕСТВУВАЩАТА ФУНКЦИОНАЛНОСТ!**

---

## 1. ОСНОВНА СТРУКТУРА НА ДАННИТЕ

### 1.1. State обект (st)
Основното състояние на приложението се съхранява в обект `st` с полетата:

```javascript
{
  name: string,              // Име на героя
  notes: string,             // Общи бележки
  xp: number,                // Натрупан опит
  
  // Способности (Abilities)
  str: number,               // Strength (по подразбиране 10)
  dex: number,               // Dexterity
  con: number,               // Constitution
  int_: number,              // Intelligence
  wis: number,               // Wisdom
  cha: number,               // Charisma
  
  // Saving Throw Proficiencies
  saveStrProf: boolean,
  saveDexProf: boolean,      // Monks имат по подразбиране
  saveConProf: boolean,
  saveIntProf: boolean,
  saveWisProf: boolean,      // Monks имат по подразбиране
  saveChaProf: boolean,
  saveAllBonus: number,      // Бонус към всички saves
  
  // Skills
  skillProfs: Object,        // { "Acrobatics": true/false, ... }
  
  // Combat Stats
  hpCurrent: number,         // Текущо HP
  hpHomebrew: number|null,   // Ръчна корекция на Max HP
  hpAdjust: number,          // Друга корекция
  kiCurrent: number,         // Текущо Ki
  acMagic: number,           // Магически бонус към AC
  meleeMagic: number,        // Магически бонус за melee attack
  rangedMagic: number,       // Магически бонус за ranged attack
  
  // Death Saves
  dsSuccess: number,         // Брой успешни death saves (0-3)
  dsFail: number,            // Брой неуспешни death saves (0-3)
  status: string,            // "alive" | "unconscious" | "stable" | "dead"
  
  // Resources
  hdAvail: number,           // Налични hit dice
  
  // Features
  tough: boolean,            // Feat: Tough (+2 HP per level)
  baseSpeed: number,         // Базова скорост (обикновено 30)
  
  // PC Characteristics
  languages: Array,          // [{ name: string }, ...]
  tools: Array,              // [{ name: string }, ...]
  personality: string,
  bond: string,
  flaw: string,
  
  // Inventory
  inventory: Array,          // [{ name, qty, note }, ...]
  
  // Session Notes
  sessionNotes: string,
  
  // Shenanigans & Aliases
  aliases: Array,            // [{ name, to, ts }, ...]
  familiars: Array          // [{ name, cat, note, ts }, ...]
}
```

---

## 2. СЪХРАНЕНИЕ И СИНХРОНИЗАЦИЯ (КРИТИЧНО!)

### 📱 QUICK REFERENCE - Какво работи къде:

| Feature | Desktop | Tablet | Описание |
|---------|---------|--------|----------|
| **localStorage** | ✅ | ✅ | Автоматично записване при всяка промяна |
| **Export button** | ✅ | ✅ | Download на .json файл |
| **Import button** | ✅ | ✅ | Зареждане от .json файл |
| **Cloud Sync** | ✅ | ❌ | Автоматично записване във файл (File System API) |
| **Session Notes** | ✅ | ❌ | Автоматично записване в папка (File System API) |
| **beforeunload** | ✅ | ✅ | Prompt преди затваряне/refresh |

**КРИТИЧНО ЗА ТАБЛЕТ:**
- Primary storage: **localStorage** (автоматично!)
- Backup method: **Export** → upload в cloud → **Import** на друго устройство
- Cloud Sync **не е необходим** - Export/Import работят отлично!

---

### ⚠️ ВАЖНО: Как работи storage на различни устройства

**PRIMARY STORAGE (Всички устройства):**
- Приложението **автоматично записва в localStorage** при всяка промяна
- localStorage е основното хранилище - data се пази в браузъра
- Работи на Desktop, Tablet, Phone - навсякъде!

**КАКВО РАБОТИ НА ТАБЛЕТ:**
- ✅ **localStorage** - автоматично записване при всяка промяна
- ✅ **Export button** - download на bundle.json файл
- ✅ **Import button** - избор на файл с file picker и зареждане
- ✅ **beforeunload handler** - предпазва от случайно затваряне
- ❌ **Cloud Sync** - НЕ работи (изисква File System Access API)

**ЗАЩО CLOUD SYNC НЕ РАБОТИ НА ТАБЛЕТ:**

**File System Access API** е специално Chrome API което позволява на web app да:
- Запази "handle" (референция) към файл или папка
- Автоматично записва във файла без да пита user всеки път
- Чете/записва директно в file system-a (като native app)
- `showSaveFilePicker()` - избор на файл за автоматично записване
- `showDirectoryPicker()` - избор на папка за session notes
- Запазване на "handle" към файл/папка
- Автоматично записване без да пита всеки път

**Поддръжка:**
- ✅ Desktop Chrome 86+
- ✅ Desktop Edge 86+
- ❌ **Android Chrome** (всички версии)
- ❌ **iOS Safari/Chrome** (всички версии)
- ❌ **Firefox** (всички платформи, flag needed)

**Заради това:**
```
ТАБЛЕТ:
├─ localStorage → автоматично записване ✅
├─ Export → ръчен backup ✅
├─ Import → ръчен restore ✅
└─ Cloud Sync → НЕ работи ❌

DESKTOP:
├─ localStorage → автоматично записване ✅
├─ Export → ръчен backup ✅
├─ Import → ръчен restore ✅
└─ Cloud Sync → автоматично sync ✅
```

**РЕАЛНИЯТ WORKFLOW (с таблет като main device):**

#### Типична D&D сесия:
```
ПРЕДИ СЕСИЯ:
1. Отваряш Chrome на таблета
2. Отваряш app-a (bookmark/shortcut)
3. localStorage автоматично зарежда последното state ✅
4. Готов си за игра!

ПО ВРЕМЕ НА СЕСИЯ:
1. Take damage → HP се намалява и записва веднага
2. Spend Ki → Ki се намалява и записва веднага
3. Roll death save → записва се веднага
4. Get XP → записва се веднага
5. Add loot to inventory → записва се веднага
   ↓
   Всяка промяна → save() → localStorage ✅

СЛЕД СЕСИЯ:
1. Refresh случайно → beforeunload prompt:
   "Changes you made may not be saved"
   → Click "Cancel" (не затваряй!)
2. Затваряш app правилно → данните са записани ✅
3. (Optional) Export за backup

PERIODIC BACKUP (седмично препоръчано):
1. На таблета: Бутон Export
2. Browser download-ва: "Hero_YYYYMMDD_HHMMSS_bundle.json"
3. Upload в Google Drive/Dropbox
4. ✅ Backup готов!

SYNC ОТ DESKTOP КЪМ ТАБЛЕТ (ако си правил промени на Desktop):
1. На Desktop: Export → upload в cloud
2. На таблета: Download файла от cloud
3. На таблета: Бутон Import → избираш файла
4. ✅ Таблетът е синхронизиран!

EMERGENCY RESTORE (ако browser crash-не):
1. Отвори app отново
2. localStorage има последното запазено state ✅
3. (Ако localStorage е cleared) → Import последния backup
```

#### Пример: Real session flow
```
18:00 - Отваряш app
        HP: 42/48, Ki: 5/6, XP: 14000 (Level 6)

18:30 - Combat started
        Take 15 damage → HP: 27/48 ✅ записано
        Spend 2 Ki → Ki: 3/6 ✅ записано

19:15 - Short rest
        Click "Short Rest"
        Use 2 HD → HP: 39/48 ✅ записано
        Ki restored → Ki: 6/6 ✅ записано

20:30 - Session end
        Gain 800 XP → XP: 14800 ✅ записано
        Add "Potion of Healing" → Inventory ✅ записано

20:45 - Export за backup
        Download: "Hero_20251218_204500_bundle.json"
        Upload в Drive ✅

21:00 - Затваряш browser
        beforeunload prompt → OK (данните са записани)
        ✅ Всичко е в localStorage!

NEXT SESSION (3 дни по-късно):
21:00 - Отваряш app
        localStorage зарежда:
        HP: 39/48, Ki: 6/6, XP: 14800 ✅
        Inventory има potion ✅
        ✅ Всичко е там както го остави!
```

### 2.0. beforeunload Handler ("Nagger")

**Какво прави:**
```javascript
window.addEventListener('beforeunload', (e) => {
  e.preventDefault();
  e.returnValue = '';  // показва browser prompt
});
```

**Резултат:**
- При опит за затваряне на tab/прозорец
- При refresh (F5)
- При navigate away
- **Браузърът пита: "Are you sure you want to leave?"**

**ВАЖНО за таблет:**
- Това е **единствената защита** срещу загуба на данни
- localStorage записва автоматично, НО ако browser crash-не преди записа → загуба!
- beforeunload дава време да се запише последната промяна

**Забележка:**
- Текстът на prompt-a се контролира от браузъра (не можеш да го customize)
- Различни браузъри показват различни съобщения
- Chrome/Edge: "Changes you made may not be saved"
- Firefox: "This page is asking you to confirm that you want to leave"

### 2.1. localStorage - Primary Storage (Работи навсякъде!)

**Концепция:**
- localStorage е браузърен API за съхранение на данни
- Данните остават **завинаги** (или докато не изтриеш ръчно)
- Уникален за всеки сайт/домейн
- Лимит: обикновено 5-10 MB (повече от достатъчно!)

**В това приложение:**
```javascript
Ключ: "monkSheet_v3"
Стойност: JSON string на целия state обект
Размер: ~3-5 KB (пренебрежимо малко!)
```

**Автоматично записване при ВСЯКА промяна:**
```javascript
save() → извиква се навсякъде:
  ├─ Промяна на XP
  ├─ Damage/Heal
  ├─ Spend/Gain Ki
  ├─ Ability score change
  ├─ Skill proficiency toggle
  ├─ Inventory add/edit/delete
  ├─ Alias/Familiar save
  └─ Всяко поле, всеки checkbox!

save() прави:
  1. localStorage.setItem("monkSheet_v3", JSON.stringify(st))
  2. renderAll() → обновява UI
  3. cloudSchedule() → опит за cloud sync (ако е linked)
```

**localStorage работи на:**
- ✅ Desktop (Windows/Mac/Linux)
- ✅ Android таблети/телефони
- ✅ iOS таблети/телефони
- ✅ Chrome, Firefox, Safari, Edge
- ❌ **НЕ** работи в Incognito/Private mode (изтрива се при затваряне!)

### 2.2. Export Функционалност (Работи навсякъде!)

**Как работи:**

```javascript
btnExport клик:
  1. Създава Bundle обект (виж 2.3)
  2. Конвертира го в JSON string с форматиране (2 spaces)
  3. Създава име на файл:
     - Взема името на героя (st.name)
     - Почиства забранени символи: \ / : * ? " < > |
     - Заменя интервали с _
     - Добавя timestamp: YYYYMMDD_HHMMSS
     - Резултат: "Пийс_Ошит_20251218_143025_bundle.json"
  4. Създава Blob със JSON
  5. Тригерира download в браузъра
```

**Пример файл име:**
- Герой: "Пийс Ошит"
- Дата: 18 Dec 2025, 14:30:25
- **Файл: `Пийс_Ошит_20251218_143025_bundle.json`**

**Къде се запазва:**
- Според настройките на браузъра (обикновено Downloads/)
- На Android/iOS таблет: може да е в Downloads или Files app

### 2.3. Import Функционалност (Работи навсякъде!)

**Как работи:**

```javascript
importFile.onChange:
  1. Чете избрания файл като text
  2. Parse JSON → data обект
  3. Извиква applyBundle(data):
     
     a) Детектира формат:
        - Ако има data.version === 2 && data.state → v2 format
        - Иначе → v1 format (legacy)
     
     b) За v2:
        st = { ...defaultState, ...data.state }
     
     c) За v1:
        st = { ...defaultState, ...data }
     
     d) Legacy миграция на aliases/familiars:
        - Ако data.aliases съществува → st.aliases = data.aliases
        - Ако data.familiars съществува → st.familiars = data.familiars
  
  4. Извиква save() → записва в localStorage + renderAll()
  5. Обновява renderAliasTable() и renderFamTable()
```

**ВАЖНО:** Import **презаписва напълно** текущия state!

**НА ТАБЛЕТ:**
- File picker се отваря нормално ✅
- Избираш .json файл от Downloads/Files app ✅
- Import зарежда данните перфектно ✅
- След Import всичко е в localStorage ✅

---

### 2.4. Cloud Sync (⚠️ DESKTOP ONLY!)

**КАКВО Е CLOUD SYNC:**
- Функционалност за **автоматично** записване във файл в cloud storage
- Бутони: "Cloud" (link file), "Pull" (sync from file)
- Използва **File System Access API**

**ЗАЩО НЕ РАБОТИ НА ТАБЛЕТ:**

File System Access API изисква:
```javascript
showSaveFilePicker()     // избор на файл за запис
showDirectoryPicker()    // избор на папка
FileSystemFileHandle     // "remember" файла за автоматично записване
```

**Поддръжка:**
- ✅ Desktop Chrome 86+
- ✅ Desktop Edge 86+
- ❌ Android Chrome (липсва API-то)
- ❌ iOS Safari/Chrome (липсва API-то)
- ❌ Firefox desktop (flag needed)

**КАКВО ОЗНАЧАВА ЗА ТЕКВОЕ НА ТАБЛЕТ:**
```
Cloud Sync бутони:
├─ "Cloud" button → НЕ работи (showSaveFilePicker undefined)
├─ "Pull" button → НЕ работи (няма файл handle)
└─ Cloud Dot indicator → винаги показва "Not linked"

ВМЕСТО ТОВА на таблет:
├─ localStorage → автоматично ✅
├─ Export button → ръчен backup ✅
└─ Import button → ръчен restore ✅
```

**НА DESKTOP (ако искаш Cloud Sync):**
```
1. Click "Cloud" → избираш файл (напр. в Dropbox/OneDrive папка)
2. App автоматично записва там при всяка промяна (debounced 1s)
3. Click "Pull" → зарежда от файла (sync от друго устройство)
4. ✅ Automatic sync between Desktops!
```

**ВАЖНО:**
- Cloud Sync е **bonus feature** за Desktop
- Не е необходим за нормална работа на app
- localStorage + Export/Import работят навсякъде!

---

### 2.5. Bundle Format v2 (CURRENT)

**Пълна структура:**

```json
{
  "version": 2,
  "state": {
    "name": "Пийс Ошит",
    "notes": "Пиян монах от Way of the Drunken Master",
    "xp": 14000,
    
    "str": 10,
    "dex": 16,
    "con": 14,
    "int_": 10,
    "wis": 14,
    "cha": 12,
    
    "saveStrProf": false,
    "saveDexProf": true,
    "saveConProf": false,
    "saveIntProf": false,
    "saveWisProf": true,
    "saveChaProf": false,
    "saveAllBonus": 0,
    
    "skillProfs": {
      "Acrobatics": true,
      "Animal Handling": false,
      "Arcana": false,
      "Athletics": true,
      "Deception": false,
      "History": false,
      "Insight": true,
      "Intimidation": false,
      "Investigation": false,
      "Medicine": false,
      "Nature": false,
      "Perception": true,
      "Performance": false,
      "Persuasion": false,
      "Religion": false,
      "Sleight of Hand": true,
      "Stealth": true,
      "Survival": false
    },
    
    "hpCurrent": 42,
    "hpHomebrew": 0,
    "hpAdjust": 0,
    "kiCurrent": 6,
    "acMagic": 0,
    "meleeMagic": 0,
    "rangedMagic": 0,
    
    "dsSuccess": 0,
    "dsFail": 0,
    "status": "alive",
    
    "hdAvail": 6,
    
    "tough": false,
    "baseSpeed": 30,
    
    "languages": [
      { "name": "Common" },
      { "name": "Draconic" }
    ],
    
    "tools": [
      { "name": "Brewer's supplies" }
    ],
    
    "personality": "Винаги с чаша в ръка и усмивка на лице",
    "bond": "Кръчмата 'Златната халба' е втория ми дом",
    "flaw": "Не мога да устоя на добро питие",
    
    "inventory": [
      {
        "name": "Dart",
        "qty": 10,
        "note": "Simple ranged weapon, 1d4"
      },
      {
        "name": "Rope",
        "qty": 1,
        "note": "50 feet hempen rope"
      },
      {
        "name": "Поtion of Healing",
        "qty": 2,
        "note": "2d4+2 HP"
      }
    ],
    
    "sessionNotes": "Session 12: Сражавахме се с орките...",
    
    "aliases": [
      {
        "name": "Zsik'rass",
        "to": "На стражата при северната порта",
        "ts": 1734525600000
      }
    ],
    
    "familiars": [
      {
        "name": "Furmidable",
        "cat": "feline",
        "note": "Котката на кръчмаря",
        "ts": 1734525700000
      }
    ]
  }
}
```

**Размер на типичен файл:** 3-5 KB (малък, лесен за споделяне)

### 2.4. Bundle Format v1 (LEGACY)

**Стара структура (backward compatible):**

```json
{
  "name": "Пийс Ошит",
  "xp": 14000,
  "str": 10,
  "dex": 16,
  ... (всички полета директно, без "state" wrapper)
}
```

**Как се импортва:**
- Детектира се липсата на `version` поле
- Целият обект се третира като state
- Мърджва се с defaultState: `{ ...defaultState, ...data }`

### 2.5. Backward Compatibility (КРИТИЧНО!)

**Защо е важна:**
- Стари export файлове трябва да работят винаги!
- При добавяне на нови features, старите файлове не ги имат
- При махане на features, старите файлове ги имат (но се игнорират)

**Как работи миграцията:**

```javascript
// Стъпка 1: Винаги започва от default
st = { ...defaultState }

// Стъпка 2: Override с import данни
if (data.version === 2) {
  st = { ...st, ...data.state }
} else {
  st = { ...st, ...data }
}

// Стъпка 3: Специални миграции
// Legacy aliases_v1 от localStorage
if (oldAliases exists && st.aliases empty) {
  st.aliases = oldAliases
}
```

**Примери:**

#### Пример 1: Стар файл без новото поле `tough`
```json
{
  "version": 2,
  "state": {
    "name": "Hero",
    "xp": 1000
    // няма "tough" поле
  }
}
```
**Резултат след import:**
```javascript
st.tough = false  // взема се от defaultState
```

#### Пример 2: Стар файл със старо поле `oldField`
```json
{
  "name": "Hero",
  "oldField": "some value"  // вече не се използва
}
```
**Резултат след import:**
```javascript
st.oldField = "some value"  // се запазва, но се игнорира от app
```

#### Пример 3: v1 файл (съвсем стар)
```json
{
  "name": "Hero",
  "xp": 300,
  "str": 14
}
```
**Резултат след import:**
```javascript
{
  ...defaultState,  // всички defaults
  name: "Hero",     // override
  xp: 300,          // override
  str: 14           // override
}
```

### 2.6. Export/Import Workflow (Best Practices)

**Препоръчан workflow:**

#### Daily Backup:
```
1. Край на session → Export
2. Запази файла с дата в името
3. Copy на Google Drive / Dropbox / Cloud storage
```

#### Синхронизация между устройства:
```
УСТРОЙСТВО 1 (Desktop):
1. Играеш session
2. Export → "Hero_20251218_210000_bundle.json"
3. Upload в cloud storage

УСТРОЙСТВО 2 (Tablet):
4. Download файла от cloud storage
5. Import в app
6. ✅ Sync complete!
```

#### Weekly Archive:
```
1. Създай папка "Character_Backups/2025-12/"
2. Copy всички weekly exports там
3. Keep последните 3 месеца online
4. Archive по-стари в offline storage
```

### 2.7. Import/Export Код Flow

**Export функция:**
```javascript
btnExport.click:
  ↓
buildBundle():
  return {
    version: 2,
    state: { ...st }
  }
  ↓
JSON.stringify(bundle, null, 2)
  ↓
Create Blob
  ↓
Generate filename:
  - sanitize name (remove / \ : * ? " < > |)
  - replace spaces → _
  - add timestamp
  ↓
Trigger download
```

**Import функция:**
```javascript
importFile.change:
  ↓
Read file as text
  ↓
JSON.parse(text)
  ↓
applyBundle(data):
  ↓
  Detect format (v1 vs v2)
  ↓
  Merge with defaultState
  ↓
  Handle legacy fields
  ↓
save():
  localStorage.setItem("monkSheet_v3", st)
  renderAll()
  renderAliasTable()
  renderFamTable()
```

### 2.8. Common Export/Import Issues

#### Issue 1: "Файлът не се отваря"
**Причина:** Невалиден JSON (corrupted file)
**Fix:** 
- Отвори файла в text editor
- Провери за syntax errors
- Ако има `...` или truncation → използвай по-стар backup

#### Issue 2: "Import не възстановява aliases/familiars"
**Причина:** Старо bundle format без тези полета
**Fix:**
- Експортирай отново с current version
- Ръчно добави полетата в JSON:
```json
{
  "version": 2,
  "state": {
    ...
    "aliases": [],
    "familiars": []
  }
}
```

#### Issue 3: "След Import level е различен"
**Причина:** XP е различно в файла
**Fix:** 
- Провери `"xp"` полето в JSON файла
- Promени го преди Import, или
- След Import промени XP в app

#### Issue 4: "Inventory изчезна"
**Причина:** Стар файл преди inventory feature
**Fix:**
- Ръчно добави inventory в JSON:
```json
"inventory": [
  { "name": "Item 1", "qty": 1, "note": "" }
]
```

### 2.9. Manual JSON Editing (Advanced)

**Понякога е полезно да редактираш JSON файла директно:**

#### Пример: Bulk add inventory
```json
"inventory": [
  { "name": "Dart", "qty": 10, "note": "1d4 damage" },
  { "name": "Dart", "qty": 10, "note": "1d4 damage" },
  { "name": "Dart", "qty": 10, "note": "1d4 damage" },
  { "name": "Potion of Healing", "qty": 5, "note": "2d4+2" },
  { "name": "Rations", "qty": 10, "note": "1 day each" }
]
```

#### Пример: Bulk add languages
```json
"languages": [
  { "name": "Common" },
  { "name": "Elvish" },
  { "name": "Draconic" },
  { "name": "Dwarvish" }
]
```

#### Пример: Fix corrupted XP
```json
"xp": 14000  // вместо "xp": "14000" (string)
```

**ВАЖНО:** 
- Винаги валидирай JSON след редакция: https://jsonlint.com/
- Прави backup ПРЕДИ да редактираш!
- Тествай Import в browser guest mode първо!

### 2.10. Export Format Evolution

**История на форматите:**

```
v1 (2023):
  - Плоска структура
  - Няма version field
  - Aliases в localStorage.aliases_v1

v2 (2024):
  - Nested structure с "state"
  - version: 2 field
  - Aliases/familiars в state
  - Добавен inventory
  - Добавени PC characteristics

v3 (future?):
  - Възможни подобрения:
    - Metadata (export date, app version)
    - Checksums за integrity
    - Compression за по-малък размер
```

**ВАЖНО за бъдещи versions:**
- Винаги запазвай backward compatibility!
- v3 трябва да чете v1 и v2 файлове!
- Използвай version field за migration logic!

### 2.11. Cloud Storage Alternatives

**Понеже File System API не работи на таблета ти, алтернативи:**

#### Google Drive / Dropbox:
```
1. Export на Desktop/Tablet
2. Manual upload в cloud
3. Manual download на друго устройство
4. Import
```

#### Email:
```
1. Export
2. Email файла до себе си
3. Open email на друго устройство
4. Download attachment
5. Import
```

#### USB Transfer (Android):
```
1. Connect tablet to PC via USB
2. Copy export file to PC
3. Copy to tablet Downloads/
4. Import в app
```

#### QR Code (за малки промени):
- Не е практично за пълен state (твърде голям)
- Но може за XP update или single stat change

### 2.12. Recommended Backup Strategy

**Тримесечна система:**

```
DAILY (след session):
├─ Export с timestamp
└─ Upload в Google Drive/Monk_Backups/Daily/

WEEKLY (неделя):
├─ Copy на най-новия daily export
└─ Rename → "Hero_Week_51_2025.json"

MONTHLY (край на месец):
├─ Copy на последния weekly
└─ Archive → "Hero_December_2025.json"

DELETE (след 3 месеца):
└─ Daily exports > 90 days
    (пази само weekly/monthly!)
```

**Storage space:**
- Daily export: ~5 KB
- 90 daily exports: ~450 KB
- **Пренебрежимо малко!**

---

## 3. ИЗЧИСЛЕНИ СТОЙНОСТИ (Derived Values)

Функцията `derived()` изчислява всички производни стойности от основното състояние.

### 2.1. Level (ниво)
```javascript
levelFromXP(xp) → level
```

**Таблица на XP прагове:**
- Level 1: 0 XP
- Level 2: 300 XP
- Level 3: 900 XP
- Level 4: 2,700 XP
- Level 5: 6,500 XP
- Level 6: 14,000 XP
- Level 7: 23,000 XP
- Level 8: 34,000 XP
- Level 9: 48,000 XP
- Level 10: 64,000 XP
- Level 11: 85,000 XP
- Level 12: 100,000 XP
- Level 13: 120,000 XP
- Level 14: 140,000 XP
- Level 15: 165,000 XP
- Level 16: 195,000 XP
- Level 17: 225,000 XP
- Level 18: 265,000 XP
- Level 19: 305,000 XP
- Level 20: 355,000 XP

**ВАЖНА ВРЪЗКА:** При промяна на XP → променя се level → променят се много други стойности!

### 2.2. Proficiency Bonus
```javascript
profBonus(level) → +2 до +6
```

**Таблица:**
- Levels 1-4: +2
- Levels 5-8: +3
- Levels 9-12: +4
- Levels 13-16: +5
- Levels 17-20: +6

**ЗАВИСИ ОТ:** Level  
**ВЛИЯЕ ВЪРХУ:** Saving throws, Skills, Attack rolls

### 2.3. Ability Modifiers (Модификатори на способности)
```javascript
modFrom(score) = Math.floor((score - 10) / 2)
```

**Примери:**
- Score 8 → Modifier -1
- Score 10 → Modifier +0
- Score 12 → Modifier +1
- Score 14 → Modifier +2
- Score 16 → Modifier +3
- Score 18 → Modifier +4
- Score 20 → Modifier +5

**ЗАВИСИ ОТ:** str, dex, con, int_, wis, cha  
**ВЛИЯЕ ВЪРХУ:** 
- AC (dex, wis)
- Max HP (con)
- Saving throws (всички)
- Skills (според ability)
- Attack rolls (dex)

### 2.4. Armor Class (AC)
```javascript
AC = 10 + dex_mod + wis_mod + acMagic
```

**ЗАВИСИ ОТ:**
- Dexterity modifier
- Wisdom modifier
- acMagic (магически предмети)

**ПРИМЕР:**
- DEX 16 (+3), WIS 14 (+2), acMagic +1 → AC = 10+3+2+1 = 16

### 2.5. Maximum Hit Points
```javascript
maxHP = baseHP(level, con_mod) + tough_bonus + hpAdjust + hpHomebrew

baseHP(level, conMod):
  if level <= 0: return 0
  hp = 8 + conMod          // 1st level
  if level >= 2:
    hp += (level-1) * (5 + conMod)  // остналите нива
  return hp

tough_bonus = tough ? 2 * level : 0
```

**ЗАВИСИ ОТ:**
- Level
- Constitution modifier (ретроактивно!)
- Tough feat (checkbox)
- hpAdjust (hidden field)
- hpHomebrew (user input)

**ВАЖНО:** Промяна на CON или level променя Max HP **ретроактивно** за всички нива!

**ПРИМЕР за level 5, CON 14 (+2):**
- 1st level: 8 + 2 = 10
- levels 2-5: 4 × (5 + 2) = 28
- Total: 38 HP
- С Tough: 38 + (2×5) = 48 HP

### 2.6. Maximum Ki Points
```javascript
kiMax = level
```

**ВАЖНА ВРЪЗКА:** При level up Ki Max се увеличава автоматично.

### 2.7. Hit Dice
```javascript
hdMax = level
```

**ВАЖНА ВРЪЗКА:** 
- Short rest: може да се използват налични HD
- Long rest: възстановяват се ceil(hdMax / 2) hit dice

### 2.8. Martial Arts Die
```javascript
maDie(level):
  if level >= 17: return "d10"
  if level >= 11: return "d8"
  if level >= 5: return "d6"
  return "d4"
```

**ТАБЛИЦА:**
- Levels 1-4: d4
- Levels 5-10: d6
- Levels 11-16: d8
- Levels 17-20: d10

### 2.9. Unarmored Movement Bonus
```javascript
umBonus(level):
  if level >= 18: return 30
  if level >= 14: return 25
  if level >= 10: return 20
  if level >= 6: return 15
  if level >= 2: return 10
  return 0
```

**Общa скорост:** `totalSpeed = baseSpeed + umBonus(level)`

**ТАБЛИЦА:**
- Level 1: +0 ft (30 ft общо)
- Level 2-5: +10 ft (40 ft общо)
- Level 6-9: +15 ft (45 ft общо)
- Level 10-13: +20 ft (50 ft общо)
- Level 14-17: +25 ft (55 ft общо)
- Level 18-20: +30 ft (60 ft общо)

### 2.10. Saving Throws
```javascript
save_total = ability_mod + (proficiency ? prof_bonus : 0) + saveAllBonus
```

**ЗАВИСИ ОТ:**
- Ability modifier (на съответната способност)
- Proficiency checkbox (за този save)
- Proficiency bonus (от level)
- saveAllBonus (общ бонус към всички saves)

**ПРИМЕР (DEX save):**
- DEX 16 (+3)
- saveDexProf = true
- prof = +3 (level 5)
- saveAllBonus = +1
- **Total: +3 +3 +1 = +7**

### 2.11. Skills
```javascript
skill_total = ability_mod + (proficiency ? prof_bonus : 0)
```

**Списък на Skills и техните Abilities:**
- Acrobatics (DEX)
- Animal Handling (WIS)
- Arcana (INT)
- Athletics (STR)
- Deception (CHA)
- History (INT)
- Insight (WIS)
- Intimidation (CHA)
- Investigation (INT)
- Medicine (WIS)
- Nature (INT)
- Perception (WIS)
- Performance (CHA)
- Persuasion (CHA)
- Religion (INT)
- Sleight of Hand (DEX)
- Stealth (DEX)
- Survival (WIS)

**Passive Skills:**
```javascript
passive_perception = 10 + perception_bonus
passive_investigation = 10 + investigation_bonus
passive_insight = 10 + insight_bonus
```

### 2.12. Attack Rolls
```javascript
meleeAtk = dex_mod + prof + meleeMagic
rangedAtk = dex_mod + prof + rangedMagic
```

**ЗАВИСИ ОТ:**
- Dexterity modifier
- Proficiency bonus (от level)
- Магически бонус от оръжие/предмети

---

## 3. COMBAT СИСТЕМА

### 3.1. Hit Points Management

#### Damage (Получаване на щета)
```javascript
btnDamage:
  if hpCurrent === 0:
    dsFail += 1
    if dsFail >= 3: status = "dead"
  else:
    hpCurrent -= damage
    if hpCurrent === 0: status = "unconscious"
```

**ВАЖНО:** Щета при 0 HP добавя Death Save failure!

#### Heal (Лечение)
```javascript
btnHeal:
  if status === "dead": return  // мъртъв не може да се лекува
  hpCurrent += healing
  if hpCurrent > 0:
    status = "alive"
    dsSuccess = 0
    dsFail = 0
```

**ВАЖНО:** Лечението автоматично събужда от unconscious и изчиства death saves.

#### Heal from Zero
```javascript
btnHealFromZero:
  hpCurrent += healing
  dsSuccess = 0
  dsFail = 0
  status = "alive"
```

#### Hit at Zero
```javascript
btnHitAtZero:
  if hpCurrent === 0 && status !== "dead":
    dsFail += 1
    if dsFail >= 3: status = "dead"
```

**ПРАВИЛО:** Удар при 0 HP = 1 death save fail (критичен удар = 2!)

### 3.2. Death Saves System

**Счетчици:**
- `dsSuccess`: 0-3 (успешни)
- `dsFail`: 0-3 (неуспешни)

**Бутони:**

#### Death Save Success (+)
```javascript
btnDsPlus:
  dsSuccess += 1
  if dsSuccess >= 3: status = "stable"
```

#### Death Save Fail (-)
```javascript
btnDsMinus:
  dsFail += 1
  if dsFail >= 3: status = "dead"
```

#### Critical Success
```javascript
btnCrit:
  hpCurrent = max(1, hpCurrent)
  dsSuccess = 0
  dsFail = 0
  status = "alive"
```

**ПРАВИЛО:** Nat 20 на death save = връщане на 1 HP!

#### Critical Fail (+2)
```javascript
btnCritFail:
  dsFail += 2
  if dsFail >= 3: status = "dead"
```

**ПРАВИЛО:** Nat 1 на death save = 2 fails!

#### Stabilize
```javascript
btnStabilize:
  if hpCurrent === 0:
    status = "stable"
    dsSuccess = 3
```

**ПРАВИЛО:** Medicine check или spare the dying → stable

### 3.3. Status States

**Възможни статуси:**
- `"alive"`: нормално състояние (HP > 0)
- `"unconscious"`: HP = 0, правиш death saves
- `"stable"`: HP = 0, но стабилизиран (3 success saves)
- `"dead"`: 3 fail saves или масивна щета

**Emoji индикатори:**
- 🙂 = alive
- 😵 = unconscious (HP = 0)
- 🛌 = stable
- 💀 = dead

**YOU DIED overlay:**
- Показва се само при `status === "dead"`
- Има бутон "Resurrect" → връща на 1 HP, нулира saves, status = "alive"

### 3.4. Ki System

```javascript
kiCurrent: текущо Ki (0 до kiMax)
kiMax: равно на level
```

**Бутони:**
- **Spend Ki**: намалява kiCurrent
- **Gain Ki**: увеличава kiCurrent (за специални ефекти)

**ВАЖНО:** Ki не може да надхвърли kiMax или да падне под 0 (clamp).

---

## 4. REST МЕХАНИКИ

### 4.1. Short Rest
```javascript
btnShortRest:
  // 1. Пълно Ki
  kiCurrent = kiMax
  
  // 2. Hit Dice (prompt)
  if hdAvail > 0:
    ask: "Колко Hit Dice ще използваш?"
    use = user input (0 до hdAvail)
    if use > 0:
      ask: "Колко HP върнаха заровете?"
      rolled = user input
      heal = rolled + (con_mod × use)
      hdAvail -= use
      hpCurrent += heal
```

**ВАЖНО:** Ki винаги се пълни напълно. Hit Dice са опционални.

### 4.2. Long Rest
```javascript
btnLongRest:
  // 1. Пълно HP
  hpCurrent = maxHP
  
  // 2. Пълно Ki
  kiCurrent = kiMax
  
  // 3. Възстановяване на Hit Dice
  recover = Math.ceil(hdMax / 2)
  hdAvail = min(hdMax, hdAvail + recover)
  
  // 4. Изчистване на death saves
  dsSuccess = 0
  dsFail = 0
  status = "alive"
```

**ВАЖНО:** Long rest връща половината hit dice (закръглено нагоре).

---

## 5. TABS И ФУНКЦИОНАЛНОСТИ

### 5.1. Stats Tab

**Съдържа:**
- Основни полета: Name, XP, Level (readonly)
- Proficiency, Martial Arts Die (readonly)
- Max HP (readonly), Homebrew HP (editable)
- Max Hit Dice (readonly), Available Hit Dice (readonly)
- Max Ki (readonly)
- AC (readonly), Magic Item AC Bonus (editable)
- Melee/Ranged Magic Attack Bonus (editable)
- Unarmored Movement Bonus (readonly)
- Passive Perception/Investigation/Insight (readonly)
- All Saves Bonus (editable)
- 6 Abilities (editable) с Modifiers (readonly) и Save Totals (readonly)
- Saving Throw Proficiency checkboxes
- Tough feat checkbox
- Skills таблица (checkbox за proficiency)
- Notes textarea

**ВАЖНИ ВРЪЗКИ:**

#### Промяна на XP:
1. Изчислява се нов level
2. Ограничава se hdAvail до новия hdMax
3. Ограничава se kiCurrent до новия kiMax
4. Маркира се `_featuresDirty = true` за презареждане на Skills tab
5. Извиква `save()` → `renderAll()`

#### Промяна на Ability (напр. CON):
1. Променя се модификатора
2. Преизчислява се Max HP (ретроактивно!)
3. Ако текущото HP > новото Max HP → намалява се до Max HP
4. Преизчисляват се всички saves за тази ability
5. Преизчисляват се всички skills за тази ability
6. Обновява се AC (ако е DEX или WIS)
7. Обновяват се attack rolls (ако е DEX)

#### Промяна на Tough feat:
1. Изчислява се Max HP преди
2. Toggle Tough
3. Изчислява се Max HP след
4. delta = after - before
5. `hpCurrent = clamp(hpCurrent + delta, 0, after)`

**ПРИМЕР:**
- Level 5, CON +2, без Tough → Max HP = 38
- Enable Tough → Max HP = 48
- Ако бях на 38/38, станам 48/48
- Ако бях на 20/38, ставам 30/48

#### Промяна на Homebrew HP:
1. Добавя се към формулата за Max HP
2. Може да е отрицателна
3. Current HP се clamp-ва до новото Max HP

### 5.2. PC Characteristics Tab

**Съдържа:**
- **Languages**: списък с езици (Add/Edit/Delete)
- **Tools**: списък с инструменти (Add/Edit/Delete)
- **Personality**: textarea
- **Bond**: textarea
- **Flaw**: textarea

**Формат в state:**
```javascript
languages: [{ name: "Common" }, { name: "Elvish" }, ...]
tools: [{ name: "Brewer's supplies" }, ...]
```

### 5.3. Inventory Tab

**Формат:**
```javascript
inventory: [
  { name: "Dart", qty: 10, note: "Simple ranged weapon" },
  { name: "Rope", qty: 1, note: "50 feet" },
  ...
]
```

**Функции:**
- Add Item (modal)
- Edit Item (modal)
- Delete Item (confirm)

### 5.4. Shenanigans Tab

**Функция:** Генериране на фалшиви имена от `shenanigans.json`

**Aliases Log:**
```javascript
aliases: [
  { name: "Zsik'rass", to: "На стражата при портата", ts: 1234567890 },
  ...
]
```

**Workflow:**
1. Click "Get Name" → взема random име от JSON
2. Click "Save" → отваря modal
3. Въвеждаш на кого си се представил така
4. Записва се в aliases масив
5. Показва се в таблица с timestamp

### 5.5. One-Liners Tab

**9 категории фрази от `one-liners.json`:**
- Critical Miss (`miss_attack`)
- Miss Attack (`miss_attack`)
- Critical Attack (`crit_attack`)
- Suffer Critical Hit (`suffer_crit`)
- Combat Tease (`combat_tease`)
- Magic (`magic`)
- Q&A (`Q&A`)
- Social (`social`)
- Cocktail Magic (`magic_cocktails`)

**Всяка има:**
- readonly textarea
- "Get" бутон → показва random фраза от масива

### 5.6. Excuses Tab

**5 категории от `excuses.json`:**
- Life Wisdom (`life_wisdom`)
- Game Cheating (`game_cheating`)
- Excuses (`excuses`)
- Storytime (`storytime`)
- Slip Away (`slipaway`)

**Същия механизъм като One-Liners.**

### 5.7. Familiar Names Tab

**Групи от `familiars.json`:**
- Feline
- Canine
- Avian
- Rodentia
- Creepycrawlies
- Aquatic
- Arcane

**Формат:**
```javascript
familiars: [
  { name: "Furmidable", cat: "feline", note: "Котката на кръчмаря", ts: 123456 },
  ...
]
```

**Workflow:**
1. Click група (напр. "Feline") → random име
2. Click "Save" → modal за бележка
3. Записва се с категория и timestamp
4. Показва се в таблица

### 5.8. Skills Tab

**Class Features & Abilities** според level от `skills-and-features.json`

**Филтриране:**
```javascript
items.filter(feature => feature.level <= current_level)
```

**Lazy Loading:**
- Зарежда се само при първо отваряне на таба
- Презарежда се при промяна на level (`_featuresDirty = true`)

**Accordion format:**
```html
<details class="feat">
  <summary>Lv 2 Ki</summary>
  <div class="feature-card">
    <p>Description...</p>
    <div class="feat-bullet">• Bullet point</div>
  </div>
</details>
```

**Бутон "Collapse All":** затваря всички отворени accordions.

### 5.9. Session Notes Tab

**File System Access API - Folder Mode:**

**Workflow:**
1. Click "Link notes folder..." → избираш папка
2. Първия път като въведеш текст → създава се нов файл `YYYYMMDD_SessionNotes.json`
3. Auto-save на всеки 1.2s (debounce)
4. Формат:
```json
{
  "schema": "sessionNotes/v1",
  "updated": "2025-12-18T10:30:00.000Z",
  "content": "текстът от textarea"
}
```

**ВАЖНО:** 
- Всяко зареждане на приложението създава **НОВ** файл за днешната дата
- Не препокрива стари файлове
- Ако вече има файл за днес → създава с (2), (3) и т.н.

**Import старии бележки:**
- File picker за .json файл
- Показва content-a в readonly textarea

---

## 6. CLOUD SYNC

### 6.1. File System Access API

**Как работи:**

1. **Link Cloud File:**
```javascript
btnCloudLink:
  handle = await showSaveFilePicker("monk_sheet.json")
  cloudHandle = handle
  await idbSet("cloudFileHandle", handle)  // IndexedDB
  await cloudWriteNow()  // първоначален запис
```

2. **Auto-save (debounced 1s):**
```javascript
cloudSchedule():
  debounce(() => cloudWriteNow(), 1000)
```

Извиква се при всяко `save()`.

3. **Write:**
```javascript
cloudWriteNow():
  writable = await cloudHandle.createWritable()
  await writable.write(JSON.stringify(buildBundle(), null, 2))
  await writable.close()
```

4. **Pull (sync from cloud):**
```javascript
btnCloudPull:
  file = await cloudHandle.getFile()
  text = await file.text()
  data = JSON.parse(text)
  applyBundle(data)
```

**ВАЖНО:** Permissions се питат автоматично при нужда.

### 6.2. Bundle Format v2

```json
{
  "version": 2,
  "state": {
    ... (целият st обект) ...
  }
}
```

**Legacy v1 format (backward compatible):**
```json
{
  // директно properties, без "state" wrapper
  "name": "Пийс Ошит",
  "xp": 1000,
  ...
}
```

### 6.3. Export/Import

**Export:**
- Бутон "Export" → създава `{name}_{YYYYMMDD_HHMMSS}_bundle.json`
- Име на файла съдържа име на героя (Unicode-safe)
- Формат: Bundle v2

**Import:**
- File picker (`<input type="file">`)
- Чете bundle (v1 или v2)
- Презаписва целия state
- Извиква `renderAll()`

**ВАЖНО:** Import **презаписва** локалния state напълно!

---

## 7. ЛОКАЛНО СЪХРАНЕНИЕ

### 7.1. localStorage

**Ключ:** `"monkSheet_v3"`

**Запис:**
```javascript
save():
  localStorage.setItem("monkSheet_v3", JSON.stringify(st))
  renderAll()
  renderAliasTable?.()
  renderFamTable?.()
  cloudSchedule()
```

**Зареждане:**
```javascript
load():
  raw = localStorage.getItem("monkSheet_v3")
  if raw:
    obj = JSON.parse(raw)
    return { ...defaultState, ...obj }
  return defaultState
```

**ВАЖНО:** Винаги се мърджва с defaultState за backward compatibility!

### 7.2. IndexedDB

**Използва се за:**
- `cloudFileHandle`: File handle за cloud sync
- `notesDirHandle_v2`: Directory handle за session notes

**Функции:**
```javascript
idbSet(key, value)
idbGet(key)
idbDel(key)
```

---

## 8. RENDER СИСТЕМА

### 8.1. renderAll()

**Извиква се при:**
- Всяка промяна в state (`save()`)
- Boot на приложението
- Import на данни

**Какво прави:**
1. Изчислява derived values
2. Обновява emoji индикатор (🙂😵🛌💀)
3. Обновява combat pills (HP, Ki, AC, Prof)
4. Обновява attack pills
5. Обновява Stats tab полета
6. Обновява ability modifiers (spans)
7. Обновява saving throws (spans)
8. Обновява PC characteristics textareas
9. Извиква renderLangTable()
10. Извиква renderToolTable()
11. Извиква renderSkills()
12. Извиква renderDeathSaves()
13. Извиква renderInventoryTable()

### 8.2. Lazy Rendering

**Някои табове се зареждат lazy:**

- **Skills Tab (Class Features):**
```javascript
onTabClick("skills"):
  if !_featuresRendered || _featuresDirty:
    renderFeaturesAccordion(level)
    _featuresRendered = true
    _featuresDirty = false
```

**Маркиране за презареждане:**
```javascript
xpInput.onChange:
  ...
  _featuresDirty = true  // следващия път ще се презареди
```

- **Session Notes Tab:**
```javascript
onTabClick("sessionNotes"):
  wireNotesUI()  // setup textarea event listeners
  updateNotesStatus()
```

---

## 9. КРИТИЧНИ ВРЪЗКИ И ЗАВИСИМОСТИ

### 9.1. XP → Level → Всичко

```
XP изменение
  ↓
Level изчисление
  ↓
├─→ Proficiency Bonus → Saves, Skills, Attacks
├─→ Ki Max → clamp kiCurrent
├─→ HD Max → clamp hdAvail
├─→ Max HP → clamp hpCurrent
├─→ Martial Arts Die
├─→ Unarmored Movement
└─→ Class Features list → _featuresDirty
```

### 9.2. Ability Score → Множество

```
CON изменение
  ↓
├─→ CON Modifier
│   ↓
│   ├─→ Max HP (ретроактивно!)
│   └─→ CON Save
│
DEX изменение
  ↓
├─→ DEX Modifier
│   ↓
│   ├─→ AC
│   ├─→ Melee Attack
│   ├─→ Ranged Attack
│   ├─→ DEX Save
│   └─→ DEX Skills (Acrobatics, Sleight of Hand, Stealth)
│
WIS изменение
  ↓
└─→ WIS Modifier
    ↓
    ├─→ AC
    ├─→ WIS Save
    ├─→ Ki Save DC
    └─→ WIS Skills (Animal Handling, Insight, Medicine, Perception, Survival)
```

### 9.3. Tough Feat

```
Tough checkbox toggle
  ↓
Max HP Before = baseHP + 0
Max HP After = baseHP + (2 × level)
  ↓
Delta = After - Before
  ↓
hpCurrent += delta
  ↓
clamp(hpCurrent, 0, Max HP After)
```

**ПРИМЕР:**
- Level 10, без Tough: Max HP = 75
- Enable Tough: Max HP = 95
- Ако беше 75/75 → става 95/95 ✓
- Ако беше 50/75 → става 70/95 ✓

### 9.4. Death Save Критична Логика

```
Death Save >= 3 Success
  ↓
status = "stable"
  ↓
остава на 0 HP, но не умира

Death Save >= 3 Fails
  ↓
status = "dead"
  ↓
показва се YOU DIED overlay

Heal при HP = 0
  ↓
hpCurrent > 0
  ↓
dsSuccess = 0
dsFail = 0
status = "alive"
```

### 9.5. Rest Механики

**Short Rest:**
```
Ki → пълно (= level)
Hit Dice → опционално използване
  ↓
  heal = rolled + (CON mod × dice used)
  hdAvail -= dice used
```

**Long Rest:**
```
HP → пълно (= Max HP)
Ki → пълно (= level)
HD → +ceil(Max / 2), max = Max
Death Saves → нулиране
Status → "alive"
```

---

## 10. ПОТЕНЦИАЛНИ ПРОБЛЕМИ ПРИ ПРОМЕНИ

### 10.1. Промяна на XP формула
**Засяга:**
- Целия level progression
- Всички derived values
- Class features list
- Ki/HD пределите

### 10.2. Промяна на HP формула
**Засяга:**
- Max HP изчисление
- Short/Long rest healing
- Tough feat ефект
- Current HP clamping

### 10.3. Промяна на ability модификатори
**Засяга:**
- Всички saves
- Всички skills
- AC
- Attack rolls
- Max HP (ако е CON)

### 10.4. Промяна на save() функция
**Засяга:**
- localStorage запис
- Cloud sync
- Всички render операции
- Aliases/Familiars запис

### 10.5. Добавяне на нови полета
**Трябва:**
1. Добави в `defaultState`
2. Добави в `renderAll()` ако е видимо
3. Добави event listener ако е editable
4. Провери дали влияе на derived values
5. Тествай Import на стар файл (backward compatibility!)

---

## 11. ТЕСТОВИ СЦЕНАРИИ

### 11.1. Level Up Тест
```
1. Увеличи XP от 0 → 300
2. Провери: Level = 2
3. Провери: Prof = +2
4. Провери: Ki Max = 2
5. Провери: HD Max = 2
6. Провери: Unarmored Movement = +10
7. Провери: Skills tab показва Ki, Unarmored Movement features
```

### 11.2. CON Промяна Тест
```
1. Level 5, CON 14 (+2), Max HP = 38
2. Current HP = 30
3. Промени CON → 16 (+3)
4. Провери: Max HP = 43 (+5 по 1 за всяко ниво)
5. Провери: Current HP = 30 (не се променя автоматично)
6. Промени Current HP → 43 (heal до max)
```

### 11.3. Death Sequence Тест
```
1. HP = 10
2. Take 12 damage
3. Провери: HP = 0, Status = "unconscious"
4. Click "Death Save –" × 2
5. Провери: dsFail = 2
6. Click "Death Save –" × 1
7. Провери: dsFail = 3, Status = "dead"
8. Провери: YOU DIED overlay visible
9. Click "Resurrect"
10. Провери: HP = 1, Status = "alive", dsSuccess = 0, dsFail = 0
```

### 11.4. Tough Feat Тест
```
1. Level 5, CON +2, HP = 25/38
2. Enable Tough
3. Провери: Max HP = 48
4. Провери: Current HP = 35 (25 + 10 delta)
5. Disable Tough
6. Провери: Max HP = 38
7. Провери: Current HP = 35 (не се clamp-ва автоматично)
8. Take 0 damage (за trigger на clamp)
9. Провери: Current HP = 35 → clamped до 38 ✗ (няма auto-clamp!)
```

**ВАЖНО:** Промяна на Max HP **не** намалява автоматично Current HP! Трябва event (damage/heal) за clamp.

### 11.5. Export/Import Тест
```
1. Създай герой с Level 5, 25 HP, 3 Ki, 2 aliases
2. Export
3. Промени локално: Level 1, 5 HP, 0 aliases
4. Import файла от стъпка 2
5. Провери: Level 5, 25 HP, 3 Ki, 2 aliases възстановени
```

### 11.6. Cloud Sync Тест
```
1. Link cloud file
2. Промени XP
3. Изчакай 1s
4. Провери файла директно (File System)
5. Промени файла external
6. Click "Pull"
7. Провери: промените са заредени
```

---

## 12. BACKWARDS COMPATIBILITY

### 12.1. State Migration

**При load():**
```javascript
obj = JSON.parse(localStorage)
return { ...defaultState, ...obj }
```

**Това означава:**
- Нови полета получават default стойности
- Стари полета се запазват
- Премахнати полета се игнорират

### 12.2. Bundle Format

**v1 format (legacy):**
```json
{
  "name": "Hero",
  "xp": 1000,
  ... (плоска структура)
}
```

**v2 format (current):**
```json
{
  "version": 2,
  "state": { ... }
}
```

**Import detection:**
```javascript
if (data.version === 2 && data.state):
  use data.state
else:
  use data directly (v1 fallback)
```

### 12.3. Aliases Migration

**Стар формат:** `localStorage.aliases_v1`  
**Нов формат:** `st.aliases` (в основния state)

**Migration код:**
```javascript
try {
  const oldAliases = JSON.parse(localStorage.getItem('aliases_v1'))
  if (oldAliases.length && !obj.aliases.length):
    obj.aliases = oldAliases
    localStorage.removeItem('aliases_v1')
} catch {}
```

---

## 13. PWA ФУНКЦИОНАЛНОСТ

### 13.1. Service Worker

**Регистрация:**
```javascript
if ("serviceWorker" in navigator && location.hostname !== "localhost"):
  navigator.serviceWorker.register("service-worker.js")
```

**ВАЖНО:** Не се регистрира на localhost за development!

### 13.2. Install Prompt

```javascript
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault()
  deferredPrompt = e
  btnInstall.classList.remove("hidden")
})

btnInstall.click(() => {
  deferredPrompt.prompt()
  await deferredPrompt.userChoice
  deferredPrompt = null
  btnInstall.classList.add("hidden")
})
```

### 13.3. Manifest

**Файл:** `manifest.json`
- name, short_name
- icons (192x192, 512x512)
- theme_color: #0b0c12
- background_color
- display: standalone

---

## 14. UI/UX ОСОБЕНОСТИ

### 14.1. Tab System

**Toggleable Tabs:**
- Click на активен tab → collapse (hide tab)
- Click на друг tab → показва го
- Lazy loading на Skills и Session Notes

### 14.2. Emoji Status

- 🙂 = alive (зелено)
- 😵 = unconscious (HP=0, правиш saves)
- 🛌 = stable (HP=0, стабилизиран)
- 💀 = dead (3 fail saves)

### 14.3. Death Saves Визуализация

**Success dots:**
- Празни → active (зелени) при 1, 2, 3

**Fail dots:**
- Празни → active (червени)
- Fail 1: червен dot 1
- Fail 2: червени dots 1-2, по-интензивен цвят
- Fail 3: червени dots 1-3, glow effect, "YOU DIED"

### 14.4. Accordion Animation

**Class Features:**
- Smooth expand/collapse
- Max-height animation
- Icon rotation (▸ → 90°)
- ResizeObserver за динамична височина

### 14.5. Cloud Dot Indicator

- 🔴 (grey) = Not linked
- 🟢 (green) = Cloud linked

---

## 15. JSON DATA FILES

### 15.1. shenanigans.json
```json
["Name1", "Name2", ...]
```
**Използва се за:** Get Name бутон в Shenanigans tab

### 15.2. one-liners.json
```json
{
  "miss_attack": [...],
  "crit_attack": [...],
  "suffer_crit": [...],
  "combat_tease": [...],
  "magic": [...],
  "Q&A": [...],
  "social": [...],
  "magic_cocktails": [...]
}
```

### 15.3. excuses.json
```json
{
  "life_wisdom": [...],
  "game_cheating": [...],
  "excuses": [...],
  "storytime": [...],
  "slipaway": [...]
}
```

### 15.4. familiars.json
```json
{
  "feline": [...],
  "canine": [...],
  "avian": [...],
  "rodentia": [...],
  "creepycrawlies": [...],
  "aquatic": [...],
  "arcane": [...]
}
```

### 15.5. skills-and-features.json
```json
{
  "class": "Monk",
  "features": [
    {
      "id": "unarmored_defense",
      "name": "Unarmored Defense",
      "level": 1,
      "short": "...",
      "desc": ["..."],
      "bullets": ["..."],
      "notes": "..."
    },
    ...
  ]
}
```

**Филтриране:** `features.filter(f => f.level <= current_level)`

---

## 16. KEYBOARD SHORTCUTS

**Няма имплементирани keyboard shortcuts.**

**Потенциални допълнения:**
- `D` = Damage
- `H` = Heal
- `K` = Spend Ki
- `R` = Long Rest
- `S` = Short Rest
- `Tab` = Next tab
- `Shift+Tab` = Previous tab

---

## 17. SECURITY & PRIVACY

### 17.1. Локално съхранение
- Всички данни са в localStorage (browser)
- Няма server-side компонент
- Няма network requests (освен JSON файлове)

### 17.2. Cloud Sync
- File System Access API (user избира файл/папка)
- Permissions се питат всеки път
- Няма automatic upload

### 17.3. Sensitive Data
**Няма чувствителни данни** (passwords, personal info)
- Само game data

---

## 18. BROWSER COMPATIBILITY

### 18.1. Required Features
- localStorage
- ES6+ (async/await, spread, etc.)
- JSON.parse/stringify
- IndexedDB
- **File System Access API** (за Cloud Sync & Session Notes)

### 18.2. File System Access Support
**Поддържа се в:**
- Chrome 86+
- Edge 86+
- Opera 72+

**НЕ се поддържа в:**
- Firefox (flag needed)
- Safari

**Fallback:** Export/Import с `<input type="file">`

---

## 19. PERFORMANCE CONSIDERATIONS

### 19.1. Debounce Pattern
```javascript
debounce(fn, ms):
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
```

**Използва се за:**
- Cloud sync (1000ms)
- Session notes save (1200ms)

### 19.2. Lazy Loading
- Skills/Features JSON (14KB) зарежда се само при отваряне на tab
- One-liners JSON (8KB) - lazy
- Excuses JSON (10KB) - lazy
- Familiars JSON (4KB) - lazy

### 19.3. Render Optimization
- Selective re-render (само променените parts)
- Не се ререндерва целия DOM при всяка промяна

---

## 20. ИЗВЕСТНИ BUGS & LIMITATIONS

### 20.1. Current HP Clamping
**ПРОБЛЕМ:** При намаляване на Max HP, Current HP не се clamp-ва автоматично.

**ПРИМЕР:**
1. Current HP = 50, Max HP = 50
2. Намали CON → Max HP = 45
3. Current HP остава 50 (над максимума!)

**FIX:** Добавен е clamp при damage/heal events.

### 20.2. XP Input
**ПРОБЛЕМ:** Може да се въведе отрицателно XP (се clamp-ва до 0).

**ЖЕЛАНА BEHAVIOR:** Input[type=number] с min="0".

### 20.3. File System Permissions
**ПРОБЛЕМ:** Permissions могат да изтекат между sessions.

**BEHAVIOR:** Приложението пита отново при нужда.

### 20.4. Session Notes File Creation
**ПРОБЛЕМ:** Създава НОВ файл при всяко зареждане на приложението.

**ЖЕЛАНА BEHAVIOR:** Може би reuse на днешния файл, ако вече съществува?

**CURRENT:** Създава `YYYYMMDD_SessionNotes (2).json` при повторно зареждане.

### 20.5. Cloud Sync Conflicts
**ПРОБЛЕМ:** Няма conflict resolution при едновременни промени.

**BEHAVIOR:** Последната промяна печели (last-write-wins).

---

## 21. FUTURE ENHANCEMENTS

### 21.1. Planned Features
- ✅ Death saves система
- ✅ Cloud sync
- ✅ Session notes folder mode
- ⬜ Spell slots tracking (multiclassing)
- ⬜ Custom features
- ⬜ Dice roller integration
- ⬜ Combat encounter tracker

### 21.2. Nice-to-Have
- ⬜ Keyboard shortcuts
- ⬜ Dark/Light theme toggle
- ⬜ Mobile gestures (swipe between tabs)
- ⬜ Character portrait upload
- ⬜ Export to PDF
- ⬜ Backup history (multiple save slots)

---

## 22. CODE STYLE & CONVENTIONS

### 22.1. Naming
- Variables: camelCase (`hpCurrent`, `kiMax`)
- Functions: camelCase (`derived()`, `renderAll()`)
- Constants: UPPER_SNAKE_CASE (`XP_THRESH`, `DB_NAME`)
- Private/Internal: `__prefix` или `_prefix` (`__invEditIndex`, `_lastRandomName`)

### 22.2. State Management
```javascript
// ✅ Good
st.xp = 1000
save()  // triggers render + cloud

// ❌ Bad
st.xp = 1000  // without save() - no render!
```

### 22.3. Derived Values
```javascript
// ✅ Good
const d = derived()
console.log(d.maxHP)

// ❌ Bad
const maxHP = baseHP(level, con_mod) + ...  // recalculating
```

---

## 23. TESTING CHECKLIST

### Основни Функции:
- [ ] XP → Level progression
- [ ] Level → Все derived values
- [ ] Ability → Modifiers, Saves, Skills
- [ ] HP → Damage, Heal, Death Saves
- [ ] Ki → Spend, Gain, Rest
- [ ] Short Rest → Ki refill, HD usage
- [ ] Long Rest → Full HP/Ki, HD recovery

### Combat:
- [ ] Damage при HP > 0
- [ ] Damage при HP = 0 (death save fail)
- [ ] Heal при HP > 0
- [ ] Heal при HP = 0 (wake up)
- [ ] Death save +
- [ ] Death save -
- [ ] Critical success (heal 1 HP)
- [ ] Critical fail (+2 fails)
- [ ] Stabilize
- [ ] Death at 3 fails
- [ ] Resurrect

### Tabs:
- [ ] Stats - всички полета
- [ ] PC Characteristics - add/edit/delete
- [ ] Inventory - add/edit/delete
- [ ] Shenanigans - get name, save alias
- [ ] One-Liners - всички категории
- [ ] Excuses - всички категории
- [ ] Familiar Names - всички групи
- [ ] Skills - lazy load, collapse all
- [ ] Session Notes - folder link, auto-save

### Data Persistence:
- [ ] localStorage save/load
- [ ] Export bundle
- [ ] Import bundle (v1 format)
- [ ] Import bundle (v2 format)
- [ ] Cloud link
- [ ] Cloud auto-save
- [ ] Cloud pull

### Edge Cases:
- [ ] Import на стар файл (v1)
- [ ] Negative HP input
- [ ] XP = 0
- [ ] XP > 355000
- [ ] Level = 20
- [ ] CON = 1 (Max HP = 1)
- [ ] Tough enable/disable при различни HP
- [ ] Death при HP = 0 + damage

---

## 24. КОНТАКТИ И SUPPORT

**Repository:** (няма публично repo засега)
**Author:** (не е посочено)
**License:** (не е посочено)

---

## 25. CHANGELOG

### Current Version (v3)
- ✅ Death saves system
- ✅ Cloud sync (File System API)
- ✅ Session notes (folder mode)
- ✅ Familiar names tab
- ✅ Class features accordion
- ✅ Tough feat
- ✅ Magic item bonuses
- ✅ PC characteristics

### Previous Versions
- v2: Shenanigans + Aliases
- v1: Basic monk sheet

---

## 26. CRITICAL REMINDERS

### ⚠️ BEFORE MAKING CHANGES:

1. **Backup current state:**
   - Export current character
   - Save to multiple locations

2. **Test in separate profile:**
   - Use browser's guest mode
   - Or create test localStorage

3. **Check dependencies:**
   - Ако променяш X, провери какво зависи от X
   - Ако променяш derived(), провери всички извиквания

4. **Preserve backward compatibility:**
   - Старите export файлове трябва да работят!
   - Не махай полета от state, освен ако не е необходимо

5. **Test ALL tabs:**
   - Някои функции са lazy-loaded
   - Бъгове могат да се крият в нетествани tabs

6. **Test rest mechanics:**
   - Short rest
   - Long rest
   - Ki refill
   - HD recovery

7. **Test cloud sync:**
   - Auto-save работи ли?
   - Pull работи ли?
   - Permissions питат ли се?

---

## ЗАКЛЮЧЕНИЕ

Това приложение има **множество свързани части**. Промяна в едно поле може да засегне 10+ други места.

**Ключови правила:**
1. Винаги извиквай `save()` след промяна на state
2. Винаги проверявай `derived()` за зависимости
3. Винаги тествай Import/Export
4. Винаги тествай backward compatibility
5. **ВИНАГИ ПРАВИ BACKUP ПРЕДИ ПРОМЕНИ!**

Това приложение се използва за **реален D&D герой**. Загубата на данни е неприемлива!

---

**Документ създаден на:** 2025-12-18  
**Версия на приложението:** v3  
**Статус:** Production (Active Use)
