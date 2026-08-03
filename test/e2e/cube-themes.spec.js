import { test, expect } from '@playwright/test';

/**
 * CUBE OF FORCE — theme stylesheets (themes/*.css)
 *
 * Всяка тема е НАПЪЛНО САМОСТОЯТЕЛЕН CSS файл, който override-ва :root токените.
 * Прилагането е динамичен link swap (както го прави modules/cube.js): слагаме
 * <link rel="stylesheet" href="themes/<име>.css"> като ПОСЛЕДНО дете на <head>
 * (по-късният stylesheet печели каскадата при равна специфичност :root ↔ :root).
 * Премахването на link-а връща дефолта от styles.css.
 *
 * ⚠ Тук НЕ се пипа cube.js — спекът зарежда link-а ръчно (page.evaluate),
 * тества САМО темите: computed цветовете следват палитрата и се връщат.
 */

// Одобрена палитра (bg колоната) → очаквани computed body background-color.
const THEMES = [
  { name: 'fog', bg: 'rgb(16, 19, 21)' },
  { name: 'stone', bg: 'rgb(21, 17, 13)' },
  { name: 'moss', bg: 'rgb(14, 19, 16)' },
  { name: 'arcane', bg: 'rgb(18, 15, 25)' },
  { name: 'bastion', bg: 'rgb(22, 15, 17)' },
];

const DEFAULT_BG = 'rgb(11, 12, 18)'; // #0b0c12 от styles.css :root

// Добавя тема link-а като последно дете на head и изчаква да се зареди.
async function addTheme(page, name) {
  await page.evaluate((theme) => {
    return new Promise((resolve, reject) => {
      const existing = document.getElementById('cubeThemeLink');
      if (existing) existing.remove();
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.id = 'cubeThemeLink';
      link.href = 'themes/' + theme + '.css';
      link.onload = () => resolve();
      link.onerror = () => reject(new Error('failed to load ' + link.href));
      document.head.appendChild(link); // последно дете → печели каскадата
    });
  }, name);
}

async function removeTheme(page) {
  await page.evaluate(() => {
    const link = document.getElementById('cubeThemeLink');
    if (link) link.remove();
  });
}

// Чете computed стойностите, които доказват, че темата се е приложила.
function readSurfaces(page) {
  return page.evaluate(() => {
    const rootCS = getComputedStyle(document.documentElement);
    return {
      bodyBg: getComputedStyle(document.body).backgroundColor,
      panel: rootCS.getPropertyValue('--panel').trim(),
      pill: rootCS.getPropertyValue('--pill').trim(),
      accent: rootCS.getPropertyValue('--accent').trim(),
    };
  });
}

test.describe('Cube of Force — theme stylesheets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  for (const t of THEMES) {
    test(`theme "${t.name}" repaints body background to its palette bg and reverts`, async ({ page }) => {
      // дефолтът е активен преди темата
      await expect
        .poll(async () => (await readSurfaces(page)).bodyBg)
        .toBe(DEFAULT_BG);

      await addTheme(page, t.name);

      // body фонът става bg стойността от палитрата
      await expect
        .poll(async () => (await readSurfaces(page)).bodyBg)
        .toBe(t.bg);

      // премахваме link-а → дефолтът се връща
      await removeTheme(page);
      await expect
        .poll(async () => (await readSurfaces(page)).bodyBg)
        .toBe(DEFAULT_BG);
    });
  }

  test('themes also swap surface tokens (--panel/--pill/--accent), not just body', async ({ page }) => {
    const base = await readSurfaces(page);

    for (const t of THEMES) {
      await addTheme(page, t.name);
      const themed = await readSurfaces(page);

      // повърхностните токени и акцентът се сменят спрямо дефолта
      expect(themed.panel, `${t.name} --panel should differ from default`).not.toBe(base.panel);
      expect(themed.pill, `${t.name} --pill should differ from default`).not.toBe(base.pill);
      expect(themed.accent, `${t.name} --accent should differ from default`).not.toBe(base.accent);

      await removeTheme(page);
      const reverted = await readSurfaces(page);
      expect(reverted.panel, `${t.name} --panel should revert`).toBe(base.panel);
      expect(reverted.pill, `${t.name} --pill should revert`).toBe(base.pill);
      expect(reverted.accent, `${t.name} --accent should revert`).toBe(base.accent);
    }
  });
});
