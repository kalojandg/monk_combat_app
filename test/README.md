# Monk Combat App - Test Suite

## Setup (еднократно)

```bash
# 1. Install Node.js dependencies
npm install

# 2. Install Playwright browsers
npx playwright install chromium
```

## Пускане на Тестовете

### Основна команда (headless mode - не виждаш browser):
```bash
npm test
```

### С видим browser (headed mode):
```bash
npm run test:headed
```

### Debug mode (стъпка по стъпка):
```bash
npm run test:debug
```

### Interactive UI mode (най-добър за development):
```bash
npm run test:ui
```

### Само critical path тестове:
```bash
npm run test:critical
```

### Покажи последния HTML report:
```bash
npm run test:report
```

---

## Output Explanation

### Успешен тест:
```
✓ [POSITIVE] Take damage decreases HP (523ms)
```

### Неуспешен тест:
```
✗ [NEGATIVE] Cannot heal when dead (1.2s)

  Error: expect(received).toBe(expected)
  
  Expected: "dead"
  Received: "alive"
```

### Summary:
```
  5 passed (2.5s)
  1 failed
  2 skipped
```

---

## Test Structure

```
test/
└─ e2e/
   └─ critical-path.spec.js    # Критични тестове (Combat, Death Saves, etc.)
```

### Test Naming Convention:

- `[POSITIVE]` - Normal usage, expected to pass
- `[NEGATIVE]` - Invalid input, edge cases, should handle gracefully

---

## Debugging Failed Tests

### 1. Виж screenshot на fail:
```bash
# Screenshots са в:
test-results/
  └─ critical-path-Take-damage/
     └─ test-failed-1.png
```

### 2. Виж HTML report:
```bash
npm run test:report
# Отваря browser с подробен report
```

### 3. Debug един конкретен тест:
```bash
# Добави .only към теста:
test.only('[POSITIVE] Take damage', async ({ page }) => {
  // ...
});

# После пусни:
npm run test:debug
```

### 4. Виж trace (recording на теста):
```bash
# Trace files са в test-results/
# Отвори в Playwright Trace Viewer:
npx playwright show-trace test-results/.../trace.zip
```

---

## Before Push Checklist

```bash
# 1. Start local server (в отделен терминал)
python -m http.server 8000

# 2. Run all tests
npm test

# 3. Ако всички минават → safe to push!
git add .
git commit -m "Fix: bug description"
git push
```

---

## Adding New Tests

### Template:

```javascript
test('[POSITIVE/NEGATIVE] Test description', async ({ page }) => {
  // Setup: Initial state
  await page.goto('/');
  
  // Action: What you're testing
  await page.locator('#someButton').click();
  
  // Assert: Expected result
  await expect(page.locator('#result')).toHaveText('expected');
});
```

### Best Practices:

1. **One assertion per test** (или closely related assertions)
2. **Clear test names** - описват какво тестват
3. **Setup → Action → Assert** структура
4. **Test localStorage** за persistence
5. **Positive AND Negative** cases

---

## Test Coverage

### Currently Covered:
- ✅ Combat System (damage, heal, clamping)
- ✅ Death Saves (success, fail, crit, stabilize, resurrect)
- ✅ Rest Mechanics (short rest, long rest, Ki/HP/HD restore)
- ✅ Ki System (spend, gain, clamping)
- ✅ localStorage Persistence (save, load, refresh)

### Not Yet Covered:
- ⬜ Level progression (XP → Level → derived values)
- ⬜ Ability scores (changes → cascading effects)
- ⬜ Skills & Saving Throws
- ⬜ Inventory (add, edit, delete)
- ⬜ Export/Import
- ⬜ Tough feat
- ⬜ PC Characteristics
- ⬜ Aliases & Familiars

---

## Troubleshooting

### "Error: No tests found"
```bash
# Провери дали файловете са в правилната папка:
ls test/e2e/*.spec.js
```

### "Error: page.goto: net::ERR_CONNECTION_REFUSED"
```bash
# Local server не е стартиран!
# В нов терминал:
python -m http.server 8000
```

### "Error: Target closed"
```bash
# Browser crash-на. Опитай:
npx playwright install --force chromium
```

### Tests много бавни:
```bash
# Провери дали имаш само 1 worker в playwright.config.js:
workers: 1
```

---

## CI/CD Integration (Optional)

Ако решиш да добавиш GitHub Actions:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm test
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: test-results
          path: test-results/
```

Но за твоя use case (solo project, manual testing) **НЕ е необходимо!**

---

## Questions?

Check:
- `TEST_CASES.md` - Plain text test cases (за reference)
- `BEHAVIOR_DOCUMENTATION.md` - Пълна документация на app behavior
- Playwright docs: https://playwright.dev/

---

**Remember: Ако някой Critical Path тест fail-не → НЕ push промените!**
