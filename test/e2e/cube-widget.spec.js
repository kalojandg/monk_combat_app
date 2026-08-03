import { test, expect } from '@playwright/test';

/**
 * CUBE OF FORCE — floating widget
 *
 * Peek → icon → dialog; charges/regain; 6 faces with theme link swap;
 * Minute Elapsed; vertical drag; reload restore.
 */

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

test.describe('Cube of Force widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#cubeWidget')).toBeVisible();
  });

  test('[a] widget starts in peek state, half off the right edge', async ({ page }) => {
    await expect(page.locator('#cubeWidget')).toHaveClass(/peek/);
    await expect(page.locator('#cubeDialog')).toBeHidden();

    // peek must visibly stick out beyond the viewport's right edge
    const vw = page.viewportSize().width;
    const box = await page.locator('#cubeWidget').boundingBox();
    expect(box.x + box.width).toBeGreaterThan(vw + 5);
  });

  test('[b] click 1 expands, click 2 opens dialog, ✕ returns to peek', async ({ page }) => {
    const w = page.locator('#cubeWidget');
    const vw = page.viewportSize().width;
    await w.click();
    await expect(w).not.toHaveClass(/peek/);
    await expect(page.locator('#cubeDialog')).toBeHidden();

    // expanded icon slides fully inside the viewport — visibly different from peek
    await expect.poll(async () => {
      const box = await w.boundingBox();
      return box.x + box.width;
    }).toBeLessThanOrEqual(vw);

    await w.click();
    await expect(page.locator('#cubeDialog')).toBeVisible();

    await page.locator('#cubeClose').click();
    await expect(page.locator('#cubeDialog')).toBeHidden();
    await expect(w).toHaveClass(/peek/);
  });

  test('[c] Activate Face 2 spends charges, swaps theme link, persists', async ({ page }) => {
    await openDialog(page);
    await page.locator('.cube-activate[data-face="2"]').click();

    await expect(page.locator('#cubeChargesVal')).toHaveText('34');

    const link = page.locator('#cubeThemeLink');
    await expect(link).toHaveCount(1);
    expect(await link.getAttribute('href')).toMatch(/themes\/stone\.css$/);

    const isLast = await page.evaluate(
      () => document.head.lastElementChild === document.getElementById('cubeThemeLink')
    );
    expect(isLast).toBe(true);

    const cube = await page.evaluate(() => JSON.parse(localStorage.getItem('monkSheet_v3')).cube);
    expect(cube.charges).toBe(34);
    expect(cube.activeFace).toBe(2);
  });

  test('[d] Activate on the already-active face is disabled', async ({ page }) => {
    await openDialog(page);
    await page.locator('.cube-activate[data-face="2"]').click();
    await expect(page.locator('.cube-activate[data-face="2"]')).toBeDisabled();
  });

  test('[e] switching to Face 5 pays its cost and swaps theme', async ({ page }) => {
    await openDialog(page);
    await page.locator('.cube-activate[data-face="2"]').click();
    await expect(page.locator('#cubeChargesVal')).toHaveText('34');

    await page.locator('.cube-activate[data-face="5"]').click();
    await expect(page.locator('#cubeChargesVal')).toHaveText('29');
    expect(await page.getAttribute('#cubeThemeLink', 'href')).toMatch(/themes\/bastion\.css$/);
  });

  test('[f] Deactivate removes the theme link and leaves charges unchanged', async ({ page }) => {
    await openDialog(page);
    await page.locator('.cube-activate[data-face="5"]').click();
    await expect(page.locator('#cubeChargesVal')).toHaveText('31');

    await page.locator('.cube-activate[data-face="6"]').click(); // Deactivate
    await expect(page.locator('#cubeThemeLink')).toHaveCount(0);
    await expect(page.locator('#cubeChargesVal')).toHaveText('31');

    const cube = await page.evaluate(() => JSON.parse(localStorage.getItem('monkSheet_v3')).cube);
    expect(cube.activeFace).toBeNull();
  });

  test('[g] Regain adds the entered number and caps at 36', async ({ page }) => {
    await setCube(page, { charges: 29, activeFace: null });
    await openDialog(page);
    await page.locator('#cubeRegainInput').fill('10');
    await page.locator('#cubeRegainBtn').click();
    await expect(page.locator('#cubeChargesVal')).toHaveText('36'); // capped
    await expect(page.locator('#cubeRegainInput')).toHaveValue('');

    await setCube(page, { charges: 20, activeFace: null });
    await openDialog(page);
    await page.locator('#cubeRegainInput').fill('5');
    await page.locator('#cubeRegainBtn').click();
    await expect(page.locator('#cubeChargesVal')).toHaveText('25');
  });

  test('[h] Activate is disabled when charges < cost', async ({ page }) => {
    await setCube(page, { charges: 1, activeFace: null });
    await openDialog(page);
    await expect(page.locator('.cube-activate[data-face="2"]')).toBeDisabled();
    await expect(page.locator('.cube-activate[data-face="5"]')).toBeDisabled();
    await expect(page.locator('.cube-activate[data-face="1"]')).toBeEnabled(); // cost 1 is affordable
  });

  test('[i] Minute Elapsed drops the barrier without charge cost', async ({ page }) => {
    await openDialog(page);
    await expect(page.locator('#cubeMinuteBtn')).toBeDisabled(); // no barrier yet

    await page.locator('.cube-activate[data-face="3"]').click();
    await expect(page.locator('#cubeChargesVal')).toHaveText('33');
    await expect(page.locator('#cubeMinuteBtn')).toBeEnabled();

    await page.locator('#cubeMinuteBtn').click();
    await expect(page.locator('#cubeThemeLink')).toHaveCount(0);
    await expect(page.locator('#cubeChargesVal')).toHaveText('33'); // unchanged — no cost

    const cube = await page.evaluate(() => JSON.parse(localStorage.getItem('monkSheet_v3')).cube);
    expect(cube.activeFace).toBeNull();
  });

  test('[k] reload with an active barrier restores the theme link and charges', async ({ page }) => {
    await setCube(page, { charges: 20, activeFace: 4 });

    await expect(page.locator('#cubeThemeLink')).toHaveCount(1);
    expect(await page.getAttribute('#cubeThemeLink', 'href')).toMatch(/themes\/arcane\.css$/);

    await openDialog(page);
    await expect(page.locator('#cubeChargesVal')).toHaveText('20');
    await expect(page.locator('.cube-activate[data-face="4"]')).toBeDisabled(); // still active
  });

  test('[l] vertical drag moves the widget and does not open the dialog', async ({ page }) => {
    const box = await page.locator('#cubeWidget').boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy + 140, { steps: 10 });
    await page.mouse.up();

    const after = await page.locator('#cubeWidget').boundingBox();
    expect(after.y).toBeGreaterThan(box.y + 60);
    await expect(page.locator('#cubeDialog')).toBeHidden();
  });

  // ===== News ticker (task 540) =====

  test('[m] ticker is hidden while no barrier is active', async ({ page }) => {
    await expect(page.locator('#cubeTicker')).toBeHidden();
  });

  test('[n] activating Face 4 shows the ticker with FACE 4 ACTIVE text', async ({ page }) => {
    await openDialog(page);
    await page.locator('.cube-activate[data-face="4"]').click();
    await page.locator('#cubeClose').click();

    const ticker = page.locator('#cubeTicker');
    await expect(ticker).toBeVisible();
    await expect(ticker).toContainText('FACE 4 ACTIVE');
  });

  test('[o] ticker animation is ~32s per cycle and bold', async ({ page }) => {
    await setCube(page, { charges: 20, activeFace: 4 });
    await expect(page.locator('#cubeTicker')).toBeVisible();

    const span = page.locator('#cubeTicker span');
    const duration = await span.evaluate((el) => getComputedStyle(el).animationDuration);
    expect(parseFloat(duration)).toBeCloseTo(32, 0); // slow — accessibility requirement

    const weight = await span.evaluate((el) => getComputedStyle(el).fontWeight);
    expect(parseInt(weight, 10)).toBeGreaterThanOrEqual(700); // bold
  });

  test('[p] reload with an active barrier restores the ticker', async ({ page }) => {
    await setCube(page, { charges: 20, activeFace: 5 });
    await expect(page.locator('#cubeTicker')).toBeVisible();
    await expect(page.locator('#cubeTicker')).toContainText('FACE 5 ACTIVE');
  });

  // ===== Spell-drain accordion (task 540) =====

  test('[q] drain accordion is disabled without a barrier and on faces 1-3, enabled on 4 and 5', async ({ page }) => {
    await openDialog(page);
    await expect(page.locator('#cubeDrainToggle')).toBeDisabled(); // no barrier

    await page.locator('.cube-activate[data-face="3"]').click();
    await expect(page.locator('#cubeDrainToggle')).toBeDisabled(); // face 3

    await page.locator('.cube-activate[data-face="4"]').click();
    await expect(page.locator('#cubeDrainToggle')).toBeEnabled(); // face 4 (spell shield)

    await page.locator('.cube-activate[data-face="5"]').click();
    await expect(page.locator('#cubeDrainToggle')).toBeEnabled(); // face 5 (everything)
  });

  test('[r] accordion closes when switching from a shielded face to a low face', async ({ page }) => {
    await openDialog(page);
    await page.locator('.cube-activate[data-face="4"]').click();
    await page.locator('#cubeDrainToggle').click();
    await expect(page.locator('#cubeDrainPanel')).toBeVisible();

    await page.locator('.cube-activate[data-face="2"]').click();
    await expect(page.locator('#cubeDrainPanel')).toBeHidden();
    await expect(page.locator('#cubeDrainToggle')).toBeDisabled();
  });

  test('[s] Apply subtracts the entered number from charges (7 from 30 → 23)', async ({ page }) => {
    await setCube(page, { charges: 30, activeFace: 4 });
    await openDialog(page);
    await page.locator('#cubeDrainToggle').click();

    const row = page.locator('.cube-drain-item[data-spell="disintegrate"]');
    await row.locator('.cube-drain-input').fill('7');
    await row.locator('.cube-drain-apply').click();

    await expect(page.locator('#cubeChargesVal')).toHaveText('23');
    const cube = await page.evaluate(() => JSON.parse(localStorage.getItem('monkSheet_v3')).cube);
    expect(cube.charges).toBe(23);
    expect(cube.activeFace).toBe(4);
  });

  test('[t] Apply that drains to 0 drops the barrier, removes the theme and hides the ticker', async ({ page }) => {
    await setCube(page, { charges: 5, activeFace: 5 });
    await openDialog(page);
    await page.locator('#cubeDrainToggle').click();

    const row = page.locator('.cube-drain-item[data-spell="prismatic-spray"]');
    await row.locator('.cube-drain-input').fill('8');
    await row.locator('.cube-drain-apply').click();

    await expect(page.locator('#cubeChargesVal')).toHaveText('0'); // floored at 0
    await expect(page.locator('#cubeThemeLink')).toHaveCount(0);
    await expect(page.locator('#cubeTicker')).toBeHidden();

    const cube = await page.evaluate(() => JSON.parse(localStorage.getItem('monkSheet_v3')).cube);
    expect(cube.charges).toBe(0);
    expect(cube.activeFace).toBeNull();
  });

  test('[u] applyBundle refreshes theme, ticker and charges without a reload', async ({ page }) => {
    // active barrier on Face 2, then import a bundle with no barrier
    await setCube(page, { charges: 30, activeFace: 2 });
    await expect(page.locator('#cubeThemeLink')).toHaveAttribute('href', /stone\.css/);

    await page.evaluate(() => {
      const b = window.buildBundle();
      b.state.cube = { charges: 12, activeFace: null };
      window.applyBundle(b);
    });
    await expect(page.locator('#cubeThemeLink')).toHaveCount(0);
    await expect(page.locator('#cubeTicker')).toBeHidden();
    await openDialog(page);
    await expect(page.locator('#cubeChargesVal')).toHaveText('12');

    // and the reverse: import a bundle WITH an active barrier
    await page.evaluate(() => {
      const b = window.buildBundle();
      b.state.cube = { charges: 20, activeFace: 4 };
      window.applyBundle(b);
    });
    await expect(page.locator('#cubeThemeLink')).toHaveAttribute('href', /arcane\.css/);
    await expect(page.locator('#cubeTicker')).toBeVisible();
    await expect(page.locator('#cubeTicker')).toContainText('FACE 4 ACTIVE');
    await expect(page.locator('#cubeChargesVal')).toHaveText('20');
  });
});
