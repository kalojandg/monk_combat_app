import { test, expect } from '@playwright/test';

/**
 * CUBE OF FORCE — end-to-end integration (capstone)
 *
 * Proves the THREE lanes work TOGETHER: a click inside the dialog (lane cube)
 * swaps the dynamic <link id="cubeThemeLink"> (lane cube) which pulls in a
 * standalone themes/<name>.css file (lane themes) whose :root override actually
 * repaints the WHOLE app (lane tokens → styles.css consumes only tokens).
 *
 * Unlike cube-themes.spec (loads the link by hand) and cube-widget.spec (asserts
 * link href / charges), this spec drives the real UI and observes the COMPUTED
 * colours of the live app plus the ticker, across activate / deactivate / minute
 * elapsed / spell-drain / reload / tab-switch.
 *
 * ⚠ New file only — touches no other spec.
 */

// Approved palette (bg column) → expected computed body background-color per face.
const FACES = [
  { face: 1, theme: 'fog',     cost: 1, bg: 'rgb(16, 19, 21)' }, // #101315
  { face: 2, theme: 'stone',   cost: 2, bg: 'rgb(21, 17, 13)' }, // #15110d
  { face: 3, theme: 'moss',    cost: 3, bg: 'rgb(14, 19, 16)' }, // #0e1310
  { face: 4, theme: 'arcane',  cost: 4, bg: 'rgb(18, 15, 25)' }, // #120f19
  { face: 5, theme: 'bastion', cost: 5, bg: 'rgb(22, 15, 17)' }, // #160f11
];

const DEFAULT_BG = 'rgb(11, 12, 18)'; // #0b0c12 — styles.css :root, no theme link

// Read the live computed surfaces that prove the theme is applied app-wide.
function readSurfaces(page) {
  return page.evaluate(() => {
    const rootCS = getComputedStyle(document.documentElement);
    return {
      bodyBg: getComputedStyle(document.body).backgroundColor,
      pill: rootCS.getPropertyValue('--pill').trim(),
      panel: rootCS.getPropertyValue('--panel').trim(),
      accent: rootCS.getPropertyValue('--accent').trim(),
    };
  });
}

// Seed st.cube then reload so cube.js re-initialises from it.
async function setCube(page, cube) {
  await page.evaluate((c) => {
    const raw = localStorage.getItem('monkSheet_v3');
    const st = raw ? JSON.parse(raw) : {};
    st.cube = c;
    localStorage.setItem('monkSheet_v3', JSON.stringify(st));
  }, cube);
  await page.reload();
  await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
  await expect(page.locator('#cubeWidget')).toBeVisible();
}

// peek → expanded → dialog
async function openDialog(page) {
  const w = page.locator('#cubeWidget');
  if (await w.evaluate((el) => el.classList.contains('peek'))) {
    await w.click();
  }
  await w.click();
  await expect(page.locator('#cubeDialog')).toBeVisible();
}

test.describe('Cube of Force — integration (dialog click themes the whole app)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#cubeWidget')).toBeVisible();
    // default theme is active before anything happens
    await expect.poll(async () => (await readSurfaces(page)).bodyBg).toBe(DEFAULT_BG);
  });

  // ===== 1. Each face: Activate via the dialog repaints the whole app =====
  for (const f of FACES) {
    test(`activating Face ${f.face} (${f.theme}) repaints body + pills + shows ticker`, async ({ page }) => {
      const base = await readSurfaces(page);

      await openDialog(page);
      await page.locator(`.cube-activate[data-face="${f.face}"]`).click();

      // wait for the standalone theme stylesheet to actually load & apply
      await expect
        .poll(async () => (await readSurfaces(page)).bodyBg, { timeout: 10000 })
        .toBe(f.bg);

      // pill surfaces (and other ambient tokens) moved off the default too
      const themed = await readSurfaces(page);
      expect(themed.pill, `${f.theme} --pill should differ from default`).not.toBe(base.pill);
      expect(themed.panel, `${f.theme} --panel should differ from default`).not.toBe(base.panel);
      expect(themed.accent, `${f.theme} --accent should differ from default`).not.toBe(base.accent);

      // the dynamic link points at THIS theme file
      const link = page.locator('#cubeThemeLink');
      await expect(link).toHaveCount(1);
      expect(await link.getAttribute('href')).toMatch(new RegExp('themes/' + f.theme + '\\.css$'));

      // ticker is visible with the right face text (close the dialog to see it)
      await page.locator('#cubeClose').click();
      const ticker = page.locator('#cubeTicker');
      await expect(ticker).toBeVisible();
      await expect(ticker).toContainText(`FACE ${f.face} ACTIVE`);
    });
  }

  // ===== 2. Deactivate reverts to the default theme =====
  test('Deactivate returns the app to the default theme and hides the ticker', async ({ page }) => {
    await openDialog(page);
    await page.locator('.cube-activate[data-face="3"]').click();
    await expect.poll(async () => (await readSurfaces(page)).bodyBg).toBe(FACES[2].bg);

    await page.locator('.cube-activate[data-face="6"]').click(); // Deactivate

    await expect.poll(async () => (await readSurfaces(page)).bodyBg).toBe(DEFAULT_BG);
    await expect(page.locator('#cubeThemeLink')).toHaveCount(0);
    await page.locator('#cubeClose').click();
    await expect(page.locator('#cubeTicker')).toBeHidden();
  });

  // ===== 3. Minute Elapsed re-pays and keeps the theme; drops to default only when broke =====
  test('Minute Elapsed keeps the theme while affordable, reverts to default when charges run short', async ({ page }) => {
    await openDialog(page);
    await page.locator('.cube-activate[data-face="4"]').click();
    await expect.poll(async () => (await readSurfaces(page)).bodyBg).toBe(FACES[3].bg);

    // affordable → the shield is re-charged, the theme stays
    await page.locator('#cubeMinuteBtn').click();
    await expect(page.locator('#cubeChargesVal')).toHaveText('28'); // 36 − 4 − 4
    await expect.poll(async () => (await readSurfaces(page)).bodyBg).toBe(FACES[3].bg);

    // broke (cost 4 > 2) → the barrier finally drops
    await setCube(page, { charges: 2, activeFace: 4 });
    await openDialog(page);
    await page.locator('#cubeMinuteBtn').click();

    await expect.poll(async () => (await readSurfaces(page)).bodyBg).toBe(DEFAULT_BG);
    await expect(page.locator('#cubeThemeLink')).toHaveCount(0);
    await page.locator('#cubeClose').click();
    await expect(page.locator('#cubeTicker')).toBeHidden();
  });

  // ===== 4. Spell-drain to 0 reverts to the default theme =====
  test('draining charges to 0 (face 4) drops the theme and hides the ticker', async ({ page }) => {
    await setCube(page, { charges: 8, activeFace: 4 });
    await expect.poll(async () => (await readSurfaces(page)).bodyBg).toBe(FACES[3].bg);

    await openDialog(page);
    await page.locator('#cubeDrainToggle').click();
    const row = page.locator('.cube-drain-item[data-spell="disintegrate"]');
    await row.locator('.cube-drain-input').fill('99'); // huge roll → drains past 0
    await row.locator('.cube-drain-apply').click();

    await expect(page.locator('#cubeChargesVal')).toHaveText('0');
    await expect.poll(async () => (await readSurfaces(page)).bodyBg).toBe(DEFAULT_BG);
    await expect(page.locator('#cubeThemeLink')).toHaveCount(0);
    await page.locator('#cubeClose').click();
    await expect(page.locator('#cubeTicker')).toBeHidden();
  });

  // ===== 5. Reload with an active theme survives =====
  test('reload with an active barrier restores the theme app-wide', async ({ page }) => {
    await openDialog(page);
    await page.locator('.cube-activate[data-face="5"]').click();
    await expect.poll(async () => (await readSurfaces(page)).bodyBg).toBe(FACES[4].bg);

    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#cubeWidget')).toBeVisible();

    // theme survived: link restored from st.cube.activeFace, body still bastion
    await expect(page.locator('#cubeThemeLink')).toHaveCount(1);
    await expect.poll(async () => (await readSurfaces(page)).bodyBg).toBe(FACES[4].bg);
    await expect(page.locator('#cubeTicker')).toBeVisible();
    await expect(page.locator('#cubeTicker')).toContainText('FACE 5 ACTIVE');
  });

  // ===== 6. Switching tabs keeps the active theme =====
  test('switching tabs keeps the active theme (link lives in <head>, not a tab)', async ({ page }) => {
    await openDialog(page);
    await page.locator('.cube-activate[data-face="2"]').click();
    await expect.poll(async () => (await readSurfaces(page)).bodyBg).toBe(FACES[1].bg);
    await page.locator('#cubeClose').click();

    // navigate to a lazily-loaded tab
    await page.locator('.tab-btn[data-tab="inventory"]').click();
    await expect(page.locator('#tab-inventory')).toBeVisible();

    // theme unaffected by the tab change
    await expect(page.locator('#cubeThemeLink')).toHaveCount(1);
    await expect.poll(async () => (await readSurfaces(page)).bodyBg).toBe(FACES[1].bg);

    // switch to another tab — still themed
    await page.locator('.tab-btn[data-tab="stats"]').click();
    await expect(page.locator('#tab-stats')).toBeVisible();
    await expect(page.locator('#cubeThemeLink')).toHaveCount(1);
    await expect.poll(async () => (await readSurfaces(page)).bodyBg).toBe(FACES[1].bg);
  });
});
