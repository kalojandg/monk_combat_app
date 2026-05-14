import { test, expect } from '@playwright/test';

async function freshPage(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
  await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 8000 });
}

async function pageWithChar(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
  await page.evaluate(() => { window.st.name = 'Тест'; window.st.xp = 500; window.save(); });
}

test.describe('New Character — button & confirmation', () => {
  test('Button exists in header', async ({ page }) => {
    await freshPage(page);
    await expect(page.locator('#btnNewChar')).toBeVisible();
  });

  test('Fresh page — no confirm, modal opens directly', async ({ page }) => {
    await freshPage(page);
    await page.locator('#btnNewChar').click();
    await expect(page.locator('#newCharModal')).not.toHaveClass(/hidden/);
  });

  test('With saved character — confirm dialog appears', async ({ page }) => {
    await pageWithChar(page);
    let prompted = false;
    page.on('dialog', async d => { prompted = true; await d.dismiss(); });
    await page.locator('#btnNewChar').click();
    await page.waitForTimeout(200);
    expect(prompted).toBe(true);
  });

  test('Dismiss confirm — modal stays closed, character unchanged', async ({ page }) => {
    await pageWithChar(page);
    page.on('dialog', d => d.dismiss());
    await page.locator('#btnNewChar').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#newCharModal')).toHaveClass(/hidden/);
    const name = await page.evaluate(() => window.st.name);
    expect(name).toBe('Тест');
  });

  test('Accept confirm — modal opens', async ({ page }) => {
    await pageWithChar(page);
    page.on('dialog', d => d.accept());
    await page.locator('#btnNewChar').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#newCharModal')).not.toHaveClass(/hidden/);
  });

  test('Confirm message mentions export', async ({ page }) => {
    await pageWithChar(page);
    let msg = '';
    page.on('dialog', async d => { msg = d.message(); await d.dismiss(); });
    await page.locator('#btnNewChar').click();
    await page.waitForTimeout(200);
    expect(msg.toLowerCase()).toMatch(/експорт|export/);
  });
});

test.describe('New Character — create & reset', () => {
  test.beforeEach(async ({ page }) => { await freshPage(page); });

  test('Cancel closes modal without touching state', async ({ page }) => {
    await page.evaluate(() => { window.st.name = 'Билбо'; window.save(); });
    page.on('dialog', d => d.accept());
    await page.locator('#btnNewChar').click();
    await page.locator('#newCharCancel').click();
    await page.waitForTimeout(100);
    await expect(page.locator('#newCharModal')).toHaveClass(/hidden/);
    expect(await page.evaluate(() => window.st.name)).toBe('Билбо');
  });

  test('Create resets name to default', async ({ page }) => {
    await page.evaluate(() => { window.st.name = 'Билбо'; window.save(); });
    page.on('dialog', d => d.accept());
    await page.locator('#btnNewChar').click();
    await page.locator('#newCharConfirm').click();
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.st.name)).toBe('Пийс Ошит');
  });

  test('Create resets xp to 0 and level to 1', async ({ page }) => {
    await page.evaluate(() => { window.st.xp = 5000; window.st.level = 5; window.save(); });
    page.on('dialog', d => d.accept());
    await page.locator('#btnNewChar').click();
    await page.locator('#newCharConfirm').click();
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.st.xp)).toBe(0);
    expect(await page.evaluate(() => window.st.level)).toBe(1);
  });

  test('Create — HP shows 8 (d8 monk)', async ({ page }) => {
    await page.locator('#btnNewChar').click();
    await page.locator('#newCharConfirm').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8');
  });

  test('Create — Ki shows 1', async ({ page }) => {
    await page.evaluate(() => { window.st.kiCurrent = 5; window.save(); });
    page.on('dialog', d => d.accept());
    await page.locator('#btnNewChar').click();
    await page.locator('#newCharConfirm').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#kiCurrentSpan')).toHaveText('1');
  });

  test('Create resets inventory', async ({ page }) => {
    await page.evaluate(() => {
      window.st.inventory = [{ name: 'Меч', qty: 1, note: '' }];
      window.save();
    });
    page.on('dialog', d => d.accept());
    await page.locator('#btnNewChar').click();
    await page.locator('#newCharConfirm').click();
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.st.inventory.length)).toBe(0);
  });

  test('Create closes modal', async ({ page }) => {
    await page.locator('#btnNewChar').click();
    await page.locator('#newCharConfirm').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#newCharModal')).toHaveClass(/hidden/);
  });

  test('Fresh state persists after reload', async ({ page }) => {
    await page.locator('#btnNewChar').click();
    await page.locator('#newCharConfirm').click();
    await page.waitForTimeout(200);
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    expect(await page.evaluate(() => window.st.name)).toBe('Пийс Ошит');
    expect(await page.evaluate(() => window.st.xp)).toBe(0);
  });
});
