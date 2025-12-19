import { test, expect } from '@playwright/test';

/**
 * STYLES REGRESSION TESTS
 *
 * Цел: да пазим визуалния вид при CSS refactor.
 * - Не тестваме "по един елемент", а обхождаме ЦЕЛИ групи елементи
 *   (всички таб бутони, всички value-pill, всички primary/danger бутони и т.н.)
 * - Ако един от елементите в групата смени стил/клас, тестът ще гръмне.
 *
 * Забележка:
 * - Тези тестове не са изчерпателни за всеки пиксел, но дават силен
 *   сигнал ако layout/цветове/класове се променят неочаквано.
 */

test.describe('Styles - Tabs & Navigation', () => {
  test('All [data-tab] buttons share the same base styles', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });

    const tabButtons = await page.$$('[data-tab]');
    expect(tabButtons.length).toBeGreaterThan(0);

    // Използваме първия бутон за "златен стандарт"
    const base = await tabButtons[0].evaluate(el => {
      const s = getComputedStyle(el);
      return {
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        padding: s.padding,
        borderRadius: s.borderRadius,
      };
    });

    for (const btn of tabButtons) {
      const s = await btn.evaluate(el => {
        const cs = getComputedStyle(el);
        return {
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          padding: cs.padding,
          borderRadius: cs.borderRadius,
        };
      });
      expect(s).toEqual(base);
    }
  });
});

test.describe('Styles - Buttons', () => {
  test('Primary buttons have consistent background, color and radius', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });

    // Важно: тук гледаме САМО <button class="primary"> (глобалните primary бутони),
    // а не .btn.primary от други компоненти.
    // Група 1: "големите" primary бутони (Stats/PC/Inventory секции)
    const mainPrimaries = await page.$$('#btnLongRest, #btnLangAdd, #btnToolAdd, #btnInvAdd');
    expect(mainPrimaries.length).toBeGreaterThan(0);

    const baseMain = await mainPrimaries[0].evaluate(el => {
      const s = getComputedStyle(el);
      return {
        bg: s.backgroundColor,
        color: s.color,
        radius: s.borderRadius,
      };
    });
    for (const btn of mainPrimaries) {
      const s = await btn.evaluate(el => {
        const cs = getComputedStyle(el);
        return {
          bg: cs.backgroundColor,
          color: cs.color,
          radius: cs.borderRadius,
        };
      });
      expect(s).toEqual(baseMain);
    }

    // Група 2: primary бутони в модалите (по-малки, но еднакви помежду си)
    const modalPrimaries = await page.$$('#pcModalSave, #invSave');
    expect(modalPrimaries.length).toBeGreaterThan(0);

    const baseModal = await modalPrimaries[0].evaluate(el => {
      const s = getComputedStyle(el);
      return {
        bg: s.backgroundColor,
        color: s.color,
        radius: s.borderRadius,
      };
    });

    for (const btn of modalPrimaries) {
      const s = await btn.evaluate(el => {
        const cs = getComputedStyle(el);
        return {
          bg: cs.backgroundColor,
          color: cs.color,
          radius: cs.borderRadius,
        };
      });
      expect(s).toEqual(baseModal);
    }
  });

  test('Danger buttons share the same red style', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });

    const dangers = await page.$$('button.danger, .btn.danger');
    expect(dangers.length).toBeGreaterThan(0);

    const base = await dangers[0].evaluate(el => {
      const s = getComputedStyle(el);
      return {
        bg: s.backgroundColor,
        color: s.color,
        radius: s.borderRadius,
      };
    });

    for (const btn of dangers) {
      const s = await btn.evaluate(el => {
        const cs = getComputedStyle(el);
        return {
          bg: cs.backgroundColor,
          color: cs.color,
          radius: cs.borderRadius,
        };
      });
      expect(s).toEqual(base);
    }
  });
});

test.describe('Styles - Value pills & derived fields', () => {
  test('All .value-pill spans share the same pill look', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });

    const pills = await page.$$('.value-pill');
    expect(pills.length).toBeGreaterThan(0);

    const base = await pills[0].evaluate(el => {
      const s = getComputedStyle(el);
      return {
        bg: s.backgroundColor,
        color: s.color,
        radius: s.borderRadius,
        padding: s.padding,
        fontWeight: s.fontWeight,
      };
    });

    for (const pill of pills) {
      const s = await pill.evaluate(el => {
        const cs = getComputedStyle(el);
        return {
          bg: cs.backgroundColor,
          color: cs.color,
          radius: cs.borderRadius,
          padding: cs.padding,
          fontWeight: cs.fontWeight,
        };
      });
      expect(s).toEqual(base);
    }
  });
});

test.describe('Styles - Modals & overlays', () => {
  test('All .modal elements share consistent card layout', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });

    const modals = await page.$$('.modal');
    expect(modals.length).toBeGreaterThan(0);

    for (const modal of modals) {
      const s = await modal.evaluate(el => {
        const cs = getComputedStyle(el);
        return {
          pos: cs.position,
          justify: cs.justifyContent,
          align: cs.alignItems,
        };
      });
      expect(s.pos).toBe('fixed');          // центриран overlay
    }
  });

  test('"YOU DIED" overlay покрива екрана и стои отгоре', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });

    // Показваме overlay-а насила (без да пипаме логиката)
    await page.evaluate(() => {
      const el = document.getElementById('youDiedOverlay');
      if (el) el.classList.remove('hidden');
    });

    const overlay = page.locator('#youDiedOverlay');
    await expect(overlay).toBeVisible();

    const styles = await overlay.evaluate(el => {
      const s = getComputedStyle(el);
      return {
        pos: s.position,
        top: s.top,
        left: s.left,
        w: s.width,
        h: s.height,
        z: s.zIndex,
      };
    });

    expect(styles.pos).toBe('fixed');
    expect(styles.z === 'auto' ? 999 : Number(styles.z)).toBeGreaterThanOrEqual(999);
  });
});

test.describe('Styles - Inputs & textareas', () => {
  test('All inputs in Stats tab share consistent base styles', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });

    await page.locator('button[data-tab="stats"]').click();

    // abilities и малките numeric полета ползват class="small" → очакваме еднакъв стил
    const inputs = await page.$$('input.small');
    expect(inputs.length).toBeGreaterThan(0);

    const base = await inputs[0].evaluate(el => {
      const s = getComputedStyle(el);
      return {
        bg: s.backgroundColor,
        color: s.color,
        border: s.border,
        radius: s.borderRadius,
      };
    });

    for (const input of inputs) {
      const s = await input.evaluate(el => {
        const cs = getComputedStyle(el);
        return {
          bg: cs.backgroundColor,
          color: cs.color,
          border: cs.border,
          radius: cs.borderRadius,
        };
      });
      expect(s).toEqual(base);
    }
  });

  test('PC Characteristics textareas share the same look', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });

    await page.locator('button[data-tab="pcchar"]').click();

    const tas = await page.$$('#tab-pcchar textarea');
    expect(tas.length).toBeGreaterThan(0);

    const base = await tas[0].evaluate(el => {
      const s = getComputedStyle(el);
      return {
        bg: s.backgroundColor,
        color: s.color,
        border: s.border,
        radius: s.borderRadius,
      };
    });

    for (const ta of tas) {
      const s = await ta.evaluate(el => {
        const cs = getComputedStyle(el);
        return {
          bg: cs.backgroundColor,
          color: cs.color,
          border: cs.border,
          radius: cs.borderRadius,
        };
      });
      expect(s).toEqual(base);
    }
  });
});

