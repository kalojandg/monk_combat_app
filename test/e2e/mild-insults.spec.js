import { test, expect } from '@playwright/test';

// Fake insults list used in all tests that need insults.json
const FAKE_INSULTS = [
  'Миришеш като сирене стояло 3 дни на слънце',
  'С тоя нож си по-опасен за себе си, отколкото за мен',
  'Лицето ти кара кучетата да бягат',
  'Движиш се като крава в блато',
  'Толкова си бавен, че зомби ще те надбяга в маратон',
];

async function mockInsults(page) {
  await page.route('**/insults.json', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(FAKE_INSULTS),
    })
  );
}

async function openInsultsTab(page) {
  await page.locator('button[data-tab="mild-insults"]').click();
  await expect(page.locator('#tab-mild-insults')).toBeVisible();
}

test.describe('Mild Insults - Tab Navigation', () => {

  test.beforeEach(async ({ page }) => {
    await mockInsults(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  test('Mild Insults tab button exists and is clickable', async ({ page }) => {
    const btn = page.locator('button[data-tab="mild-insults"]');
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(page.locator('#tab-mild-insults')).toBeVisible();
  });

  test('Mild Insults tab shows expected UI elements', async ({ page }) => {
    await openInsultsTab(page);
    await expect(page.locator('#btnGenerateInsult')).toBeVisible();
    await expect(page.locator('#insultDisplay')).toBeVisible();
  });

  test('No API key input or model selector present', async ({ page }) => {
    await openInsultsTab(page);
    await expect(page.locator('#insultApiKey')).toHaveCount(0);
    await expect(page.locator('#insultModel')).toHaveCount(0);
    await expect(page.locator('#btnSaveApiKey')).toHaveCount(0);
  });

  test('No history section present', async ({ page }) => {
    await openInsultsTab(page);
    await expect(page.locator('#insultHistory')).toHaveCount(0);
  });

  test('Has placeholder text before first generate', async ({ page }) => {
    await openInsultsTab(page);
    await expect(page.locator('#insultDisplay .insult-placeholder')).toBeVisible();
  });

});

test.describe('Mild Insults - Generate random insult', () => {

  test.beforeEach(async ({ page }) => {
    await mockInsults(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await openInsultsTab(page);
  });

  test('Clicking Generate Insult shows an insult from the list', async ({ page }) => {
    await page.locator('#btnGenerateInsult').click();
    await page.waitForTimeout(300);

    const insultText = page.locator('#insultDisplay .insult-text');
    await expect(insultText).toBeVisible();

    const displayed = await insultText.textContent();
    const stripped = displayed.replace(/^"|"$/g, '').trim();
    expect(FAKE_INSULTS).toContain(stripped);
  });

  test('Displayed insult is wrapped in quotes', async ({ page }) => {
    await page.locator('#btnGenerateInsult').click();
    await page.waitForTimeout(300);

    const text = await page.locator('#insultDisplay .insult-text').textContent();
    expect(text.trim()).toMatch(/^".+"$/);
  });

  test('Multiple clicks show different content (not stuck)', async ({ page }) => {
    const results = new Set();
    for (let i = 0; i < 8; i++) {
      await page.locator('#btnGenerateInsult').click();
      await page.waitForTimeout(200);
      const text = await page.locator('#insultDisplay .insult-text').textContent();
      results.add(text.trim());
    }
    // With 5 options and 8 clicks, at least 2 unique results expected
    expect(results.size).toBeGreaterThanOrEqual(2);
  });

  test('Button is re-enabled after generating', async ({ page }) => {
    await page.locator('#btnGenerateInsult').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#btnGenerateInsult')).toBeEnabled();
  });

  test('Shows error message when insults.json fails to load', async ({ page }) => {
    // Override with a failing route
    await page.route('**/insults.json', route => route.fulfill({ status: 500 }));

    // Clear cache so the new route is used
    await page.evaluate(() => window.__insults_cache = null);
    await page.locator('#btnGenerateInsult').click();
    await page.waitForTimeout(500);

    await expect(page.locator('#insultDisplay .insult-error')).toBeVisible();
  });

});

test.describe('Mild Insults - insults.json caching', () => {

  test('insults.json is fetched only once across multiple generates', async ({ page }) => {
    let fetchCount = 0;
    await page.route('**/insults.json', route => {
      fetchCount++;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FAKE_INSULTS),
      });
    });

    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await openInsultsTab(page);

    for (let i = 0; i < 5; i++) {
      await page.locator('#btnGenerateInsult').click();
      await page.waitForTimeout(200);
    }

    expect(fetchCount).toBe(1);
  });

});
