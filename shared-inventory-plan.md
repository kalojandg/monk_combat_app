# Споделен Инвентар — План

## Стек (безплатен, без спиране)

| Слой | Технология | Цена | Спира ли се? |
|------|-----------|------|--------------|
| Hosting | GitHub Pages | безплатно завинаги | НЕ — статичен файл |
| Database | Firebase Firestore | безплатно завинаги* | НЕ — serverless |
| Domain | `username.github.io/repo` | безплатно | — |

*Firebase Spark план (без кредитна карта):
- 1 GB storage
- 50 000 reads/ден
- 20 000 writes/ден
- 1 GB bandwidth/ден

За D&D група от 5-6 човека → **никога няма да надхвърлите лимитите.**

AWS Free Tier е различно — виртуална машина (EC2) вървя на час и след 12 месеца се плаща.
Firebase е serverless — плащаш само ако правиш заявки, free tier-ът никога не изтича.

---

## Какво ще направи Claude (автоматично)

- [ ] Целия код на апа (HTML + CSS + JS — един файл, без build стъпка)
- [ ] Firebase интеграция (real-time sync)
- [ ] GitHub репо + GitHub Pages deploy (чрез `gh` CLI)

## Какво трябва да направиш ти (ръчно, ~10 мин)

1. **Firebase проект** → [console.firebase.google.com](https://console.firebase.google.com)
   - "Create project" → дай му име → disable Google Analytics → Create
   - Firestore Database → "Create database" → "Start in test mode" → избери регион (europe-west)
   - Project Settings → "Your apps" → Web app (`</>`) → Register → копирай `firebaseConfig` обекта

2. **GitHub акаунт** (ако нямаш) → github.com

3. Дай ми `firebaseConfig` → аз довършвам всичко

---

## Функционалности на апа

- Добавяне / редактиране / изтриване на предмети
- Колони: Предмет | Брой | Тежест | Стойност | Носи | Бележки
- Категории: Оръжие / Броня / Разни / Консумативи
- Обща тежест и стойност (автоматично)
- Gold tracker (PP / GP / SP / CP)
- Real-time sync — всички виждат промените веднага без reload
- Mobile friendly
- Без login — всеки с линка може да пише

---

## Структура на файловете

```
shared-inventory/
├── index.html      ← целия апп (HTML + CSS + JS в един файл)
└── README.md       ← линк + инструкции за групата
```

Без `package.json`, без build, без node_modules.

---

## Deploy команди (аз ги изпълнявам)

```bash
gh repo create shared-inventory --public --source=. --push
# GitHub Pages се активира автоматично от Settings
```

URL ще е: `https://kalojandg.github.io/shared-inventory/`

---

## Следващи стъпки

1. Ти създаваш Firebase проект и ми даваш `firebaseConfig`
2. Аз пиша кода и правя deploy
3. Пращаш линка в Discord на групата
