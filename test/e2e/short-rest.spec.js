import { test, expect } from '@playwright/test';

/**
 * SHORT REST MECHANICS
 *
 * Фокусираме се САМО върху:
 * - Ki: винаги става kiMax
 * - Hit Dice: hdAvail, heal формулата и входната валидация
 *
 * НЯМА проверки за status / death saves – това ще се пипа по-късно.
 */

// Помощна функция за диалозите (prompt)
async function handlePrompts(page, answers) {
  let i = 0;
  page.on('dialog', async dialog => {
    const reply = answers[i++];
    if (reply === null) {
      await dialog.dismiss();
    } else {
      await dialog.accept(String(reply));
    }
  });
}

test.describe('Short Rest - Ki only', () => {
  test('Short Rest always refills Ki to max (with HD available)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });

    // Отиваме на Stats да видим ki - open Basic Info sub-tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    const kiMax = await page.locator('#subtab-basicinfo #kiMaxSpan').textContent();

    // Зануляваме текущото Ki през localStorage (st не е global)
    await page.evaluate(() => {
      const raw = localStorage.getItem('monkSheet_v3');
      const st = raw ? JSON.parse(raw) : {};
      st.kiCurrent = 0;
      localStorage.setItem('monkSheet_v3', JSON.stringify(st));
    });
    await page.reload();
    await page.locator('button[data-tab="stats"]').click();
    await expect(page.locator('#kiCurrentSpan')).toHaveText('0');

    // Настройваме диалозите: избираме 0 Hit Dice
    await handlePrompts(page, [0]);

    // Short Rest
    await page.locator('#btnShortRest').click();

    // Ki трябва да е равно на Ki Max
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#kiCurrentSpan')).toHaveText(kiMax || '');
  });

  test('Short Rest refills Ki even when no Hit Dice are available', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });

    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    const kiMax = await page.locator('#subtab-basicinfo #kiMaxSpan').textContent();

    // Зануляваме Ki и Hit Dice през localStorage
    await page.evaluate(() => {
      const raw = localStorage.getItem('monkSheet_v3');
      const st = raw ? JSON.parse(raw) : {};
      st.kiCurrent = 0;
      st.hdAvail = 0;
      localStorage.setItem('monkSheet_v3', JSON.stringify(st));
    });
    await page.reload();
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#kiCurrentSpan')).toHaveText('0');
    await expect(page.locator('#subtab-basicinfo #hdAvailSpan')).toHaveText('0');

    // Short Rest – не трябва да има prompt за HD, но Ki се пълни
    await page.locator('#btnShortRest').click();

    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#kiCurrentSpan')).toHaveText(kiMax || '');
    await expect(page.locator('#subtab-basicinfo #hdAvailSpan')).toHaveText('0');
  });
});

test.describe('Short Rest - Hit Dice prompts', () => {
  test('Happy path: spend Hit Dice and heal HP', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });

    // Конфигуриране на състоянието: малко HP и 3 налични Hit Dice (през localStorage)
    await page.evaluate(() => {
      const raw = localStorage.getItem('monkSheet_v3');
      const st = raw ? JSON.parse(raw) : {};
      st.hpCurrent = 3;
      st.hdAvail = 3;
      localStorage.setItem('monkSheet_v3', JSON.stringify(st));
    });
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('3');

    // Четем CON мод за формулата - open Stats tab and Stats sub-tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    const conModText = await page.locator('#subtab-stats #conModSpan').textContent();
    const conMod = Number(conModText);

    // Ще използваме 2 Hit Dice и ще върнем 7 от зарове
    await handlePrompts(page, [2, 7]);

    await page.locator('#btnShortRest').click();

    // Очакваме hdAvail да е намаляло с 2 - open Basic Info sub-tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #hdAvailSpan')).toHaveText('1');

    // HP трябва да е 3 + (7 + conMod*2), clamp-нато до maxHP
    const maxHpText = await page.locator('#subtab-basicinfo #maxHpSpan').textContent();
    const maxHP = Number(maxHpText);
    const expectedHeal = 7 + conMod * 2;
    const expectedHp = Math.min(maxHP, 3 + expectedHeal);
    await expect(page.locator('#hpCurrentSpan')).toHaveText(String(expectedHp));
  });

  test('First prompt: invalid and out-of-range values do not spend Hit Dice', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });

    // Конфигуриране: 3 HD, HP = 5
    await page.evaluate(() => {
      const raw = localStorage.getItem('monkSheet_v3');
      const st = raw ? JSON.parse(raw) : {};
      st.hpCurrent = 5;
      st.hdAvail = 3;
      localStorage.setItem('monkSheet_v3', JSON.stringify(st));
    });
    await page.reload();

    const cases = [
      { label: 'negative', answer: -5 },
      { label: 'too big', answer: 100 },
      { label: 'float', answer: 1.7 },
      { label: 'non-number', answer: 'abc' },
      { label: 'empty', answer: '' },
      { label: 'zero', answer: 0 },
    ];

    for (const c of cases) {
      // reset hdAvail / HP за всяка итерация
      await page.evaluate(() => {
        const raw = localStorage.getItem('monkSheet_v3');
        const st = raw ? JSON.parse(raw) : {};
        st.hpCurrent = 5;
        st.hdAvail = 3;
        localStorage.setItem('monkSheet_v3', JSON.stringify(st));
      });
      await page.reload();

      // За този случай имаме само един prompt (първия) – за всеки кейс закачаме еднократен handler
      page.once('dialog', async dialog => {
        const reply = c.answer;
        if (reply === null) {
          await dialog.dismiss();
        } else {
          await dialog.accept(String(reply));
        }
      });
      await page.locator('#btnShortRest').click();

      // hdAvail и HP не трябва да се променят (use ≤ 0) - open Basic Info sub-tab
      await page.locator('button[data-tab="stats"]').click();
      await page.waitForTimeout(300);
      await page.locator('button[data-subtab="basicinfo"]').click();
      await page.waitForTimeout(200);
      await expect(page.locator('#subtab-basicinfo #hdAvailSpan')).toHaveText('3');
      await expect(page.locator('#hpCurrentSpan')).toHaveText('5');
    }
  });

  test('First prompt: cancel does not change HD or HP', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });

    await page.evaluate(() => {
      const raw = localStorage.getItem('monkSheet_v3');
      const st = raw ? JSON.parse(raw) : {};
      st.hpCurrent = 5;
      st.hdAvail = 3;
      localStorage.setItem('monkSheet_v3', JSON.stringify(st));
    });
    await page.reload();

    await handlePrompts(page, [null]); // cancel първия prompt
    await page.locator('#btnShortRest').click();

    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #hdAvailSpan')).toHaveText('3');
    await expect(page.locator('#hpCurrentSpan')).toHaveText('5');
  });

  test('Second prompt: cancel does not spend Hit Dice or change HP', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });

    await page.evaluate(() => {
      const raw = localStorage.getItem('monkSheet_v3');
      const st = raw ? JSON.parse(raw) : {};
      st.hpCurrent = 5;
      st.hdAvail = 3;
      localStorage.setItem('monkSheet_v3', JSON.stringify(st));
    });
    await page.reload();

    // Първи prompt: искаме да използваме 2 HD, втори: cancel
    await handlePrompts(page, [2, null]);
    await page.locator('#btnShortRest').click();

    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#subtab-basicinfo #hdAvailSpan')).toHaveText('3');
    await expect(page.locator('#hpCurrentSpan')).toHaveText('5');
  });
});

test.describe('Short Rest - negative CON modifier effects', () => {
  test('Negative CON modifier can reduce or nullify heal, but clamps HP within [0, maxHP]', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });

    // Set CON така, че модификаторът да е -1 (примерно CON 8) - open Stats sub-tab
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('#subtab-stats #conInput').fill('8');
    await page.locator('#subtab-stats #conInput').blur();
    await page.waitForTimeout(200);
    const conModText = await page.locator('#subtab-stats #conModSpan').textContent();
    const conMod = Number(conModText);
    expect(conMod).toBe(-1);

    // HP = 10, hdAvail = 3
    await page.evaluate(() => {
      const raw = localStorage.getItem('monkSheet_v3');
      const st = raw ? JSON.parse(raw) : {};
      st.hpCurrent = 10;
      st.hdAvail = 3;
      localStorage.setItem('monkSheet_v3', JSON.stringify(st));
    });
    await page.reload();

    // Използваме 2 Hit Dice, rolled = 0  → heal = 0 + (-1)*2 = -2
    await handlePrompts(page, [2, 0]);
    await page.locator('#btnShortRest').click();

    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-subtab="basicinfo"]').click();
    await page.waitForTimeout(200);

    // hdAvail трябва да намалее с 2
    await expect(page.locator('#subtab-basicinfo #hdAvailSpan')).toHaveText('1');

    // HP трябва да е clamp-нато >= 0 и <= maxHP
    const hpText = await page.locator('#hpCurrentSpan').textContent();
    const maxHpText = await page.locator('#subtab-basicinfo #maxHpSpan').textContent();
    const hp = Number(hpText);
    const maxHP = Number(maxHpText);
    expect(hp).toBeGreaterThanOrEqual(0);
    expect(hp).toBeLessThanOrEqual(maxHP);
  });
});

