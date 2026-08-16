# Monk Combat App — Code Rules (за код ревю)

Vanilla JS PWA, без bundler. Кратък правилник — дълбочината е в ralph structure reference-а.

1. **Целият persistent state живее в `st`** — нов localStorage ключ извън st = блокер
   (bundle-ът няма да го round-trip-ва; урокът от familiars бъга).
2. **Фича логика = модул** (`modules/<име>.js`, IIFE с window.attachX) — нова логика,
   изсипана в app.js ядрото, = важно. app.js се пипа хирургично.
3. **Данните са в JSON файлове, не в кода** — нови реплики/имена/фичъри отиват в *.json.
4. **HTML инжекция**: всеки потребителски/данен низ в innerHTML минава през esc() = иначе блокер.
5. **Тестове**: променено поведение без обновен спек = важно; спековете са единственият
   поведенчески контракт (BEHAVIOR docs са изтрити). Legacy auto-Monk resolver-ът не се маха.
6. **TTS ключът** не се мести/логва; no-key fallback пътят е задължителен.
7. Без runtime боклук в git (playwright-report, test-results, tmp файлове).
