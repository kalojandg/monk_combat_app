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

async function openTauntsTab(page) {
  await page.locator('button[data-tab="taunts"]').click();
  await expect(page.locator('#tab-taunts')).toBeVisible();
}

test.describe('Taunts - Tab Navigation', () => {

  test.beforeEach(async ({ page }) => {
    await mockInsults(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  test('Taunts tab button exists and is clickable', async ({ page }) => {
    const btn = page.locator('button[data-tab="taunts"]');
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(page.locator('#tab-taunts')).toBeVisible();
  });

  test('Taunts tab shows expected UI elements', async ({ page }) => {
    await openTauntsTab(page);
    await expect(page.locator('#btnGenerateTaunt')).toBeVisible();
    await expect(page.locator('#tauntDisplay')).toBeVisible();
    await expect(page.locator('#tauntMoodIndicator')).toBeVisible();
  });

  test('No API key input or model selector present', async ({ page }) => {
    await openTauntsTab(page);
    await expect(page.locator('#tauntApiKey')).toHaveCount(0);
    await expect(page.locator('#tauntModel')).toHaveCount(0);
    await expect(page.locator('#btnSaveApiKey')).toHaveCount(0);
  });

  test('No history section present', async ({ page }) => {
    await openTauntsTab(page);
    await expect(page.locator('#tauntHistory')).toHaveCount(0);
  });

  test('Has placeholder text before first generate', async ({ page }) => {
    await openTauntsTab(page);
    await expect(page.locator('#tauntDisplay .taunt-placeholder')).toBeVisible();
  });

});

test.describe('Taunts - Generate random insult', () => {

  test.beforeEach(async ({ page }) => {
    await mockInsults(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await openTauntsTab(page);
  });

  test('Clicking Generate Taunt shows an insult from the list', async ({ page }) => {
    await page.locator('#btnGenerateTaunt').click();
    await page.waitForTimeout(300);

    const tauntText = page.locator('#tauntDisplay .taunt-text');
    await expect(tauntText).toBeVisible();

    const displayed = await tauntText.textContent();
    const stripped = displayed.replace(/^"|"$/g, '').trim();
    expect(FAKE_INSULTS).toContain(stripped);
  });

  test('Displayed taunt is wrapped in quotes', async ({ page }) => {
    await page.locator('#btnGenerateTaunt').click();
    await page.waitForTimeout(300);

    const text = await page.locator('#tauntDisplay .taunt-text').textContent();
    expect(text.trim()).toMatch(/^".+"$/);
  });

  test('Multiple clicks show different content (not stuck)', async ({ page }) => {
    const results = new Set();
    for (let i = 0; i < 8; i++) {
      await page.locator('#btnGenerateTaunt').click();
      await page.waitForTimeout(200);
      const text = await page.locator('#tauntDisplay .taunt-text').textContent();
      results.add(text.trim());
    }
    // With 5 options and 8 clicks, at least 2 unique results expected
    expect(results.size).toBeGreaterThanOrEqual(2);
  });

  test('Button is re-enabled after generating', async ({ page }) => {
    await page.locator('#btnGenerateTaunt').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#btnGenerateTaunt')).toBeEnabled();
  });

  test('Shows error message when insults.json fails to load', async ({ page }) => {
    // Override with a failing route
    await page.route('**/insults.json', route => route.fulfill({ status: 500 }));

    // Clear cache so the new route is used
    await page.evaluate(() => window.__insults_cache = null);
    await page.locator('#btnGenerateTaunt').click();
    await page.waitForTimeout(500);

    await expect(page.locator('#tauntDisplay .taunt-error')).toBeVisible();
  });

});

test.describe('Taunts - Mood Indicator', () => {

  test.beforeEach(async ({ page }) => {
    await mockInsults(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  test('Mood indicator shows Cocky when HP is above 50%', async ({ page }) => {
    // Default HP=8, maxHP from derived — above 50%
    await openTauntsTab(page);
    const indicator = page.locator('#tauntMoodIndicator');
    await expect(indicator).toContainText('Cocky & Brutal');
    await expect(indicator).toHaveClass(/taunt-mood-high/);
  });

  test('Mood indicator shows Bloodied when HP is 30-50%', async ({ page }) => {
    // Set HP to 40% of maxHP (maxHP default ~10, so set hpCurrent=4)
    await page.evaluate(() => {
      window.st.hpCurrent = 4;
      window.st.hpMax = 10;
      window.save();
    });
    await openTauntsTab(page);
    const indicator = page.locator('#tauntMoodIndicator');
    await expect(indicator).toContainText('Bloodied but Standing');
    await expect(indicator).toHaveClass(/taunt-mood-mid/);
  });

  test('Mood indicator shows Desperate when HP is below 30%', async ({ page }) => {
    await page.evaluate(() => {
      window.st.hpCurrent = 1;
      window.save();
    });
    await openTauntsTab(page);
    const indicator = page.locator('#tauntMoodIndicator');
    await expect(indicator).toContainText('Desperate & Unhinged');
    await expect(indicator).toHaveClass(/taunt-mood-low/);
  });

  test('Mood indicator shows HP percentage', async ({ page }) => {
    await openTauntsTab(page);
    const text = await page.locator('#tauntMoodIndicator').textContent();
    expect(text).toMatch(/HP \d+%/);
  });

  test('Mood indicator updates when HP changes and tab is re-rendered', async ({ page }) => {
    await openTauntsTab(page);
    await expect(page.locator('#tauntMoodIndicator')).toContainText('Cocky');

    // Drop HP
    await page.evaluate(() => {
      window.st.hpCurrent = 1;
      window.save();
    });
    await page.waitForTimeout(300);

    await expect(page.locator('#tauntMoodIndicator')).toContainText('Desperate & Unhinged');
  });

});

test.describe('Taunts - insults.json caching', () => {

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
    await openTauntsTab(page);

    for (let i = 0; i < 5; i++) {
      await page.locator('#btnGenerateTaunt').click();
      await page.waitForTimeout(200);
    }

    expect(fetchCount).toBe(1);
  });

});
