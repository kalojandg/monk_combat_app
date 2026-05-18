import { test, expect } from '@playwright/test';

const FAKE_INSULTS = [
  'Миришеш като сирене стояло 3 дни на слънце',
  'С тоя нож си по-опасен за себе си, отколкото за мен',
  'Лицето ти кара кучетата да бягат',
  'Движиш се като крава в блато',
  'Толкова си бавен, че зомби ще те надбяга в маратон',
];

const FAKE_TASHA_JOKES = [
  "Why did the scarecrow win an award? Because he was outstanding in his field!",
  "What's a pirate's favorite letter? You'd think it'd be AARRRR, but it's the 'C'.",
  "I'm reading a book about anti-gravity. I can't put it down.",
  "Why don't melons get married? Because they cantaloupe.",
  "What do you call a sleeping dinosaur? A dino-snore.",
];

const FAKE_DARK_JOKES = [
  "Why did the man miss the funeral? He wasn't a mourning person.",
  "Dark humor is like food. Not everyone gets it.",
  "My therapist said time heals all wounds. So I stabbed her.",
  "What do you call a dog with no legs? Doesn't matter what you call him. He won't come anyway.",
  "The cemetery is so crowded. People are just dying to get in.",
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

async function mockDarkJokes(page) {
  await page.route('**/dark-jokes.json', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(FAKE_DARK_JOKES),
    })
  );
}

async function mockTashaJokes(page) {
  await page.route('**/tasha-jokes.json', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(FAKE_TASHA_JOKES),
    })
  );
}

async function openInsultsTab(page) {
  await page.locator('button[data-tab="insults"]').click();
  await expect(page.locator('#tab-insults')).toBeVisible();
}

test.describe('Insults - Tab Navigation', () => {

  test.beforeEach(async ({ page }) => {
    await mockInsults(page);
    await mockDarkJokes(page);
    await mockTashaJokes(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  test('Insults tab button exists and is clickable', async ({ page }) => {
    const btn = page.locator('button[data-tab="insults"]');
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(page.locator('#tab-insults')).toBeVisible();
  });

  test('Insults tab shows expected UI elements', async ({ page }) => {
    await openInsultsTab(page);
    await expect(page.locator('#btnGenerateInsult')).toBeVisible();
    await expect(page.locator('#insultDisplay')).toBeVisible();
    await expect(page.locator('#btnGenerateDarkJoke')).toBeVisible();
    await expect(page.locator('#darkJokeDisplay')).toBeVisible();
    await expect(page.locator('#btnGenerateTasha')).toBeVisible();
    await expect(page.locator('#tashaDisplay')).toBeVisible();
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
    await expect(page.locator('#darkJokeDisplay .dark-joke-placeholder')).toBeVisible();
    await expect(page.locator('#tashaDisplay .tasha-placeholder')).toBeVisible();
  });

});

test.describe('Insults - Generate random insult', () => {

  test.beforeEach(async ({ page }) => {
    await mockInsults(page);
    await mockDarkJokes(page);
    await mockTashaJokes(page);
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
    expect(results.size).toBeGreaterThanOrEqual(2);
  });

  test('Button is re-enabled after generating', async ({ page }) => {
    await page.locator('#btnGenerateInsult').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#btnGenerateInsult')).toBeEnabled();
  });

  test('Shows error message when insults.json fails to load', async ({ page }) => {
    await page.route('**/insults.json', route => route.fulfill({ status: 500 }));
    await page.evaluate(() => window.__insults_cache = null);
    await page.locator('#btnGenerateInsult').click();
    await page.waitForTimeout(500);

    await expect(page.locator('#insultDisplay .insult-error')).toBeVisible();
  });

});

test.describe('Insults - Generate dark joke', () => {

  test.beforeEach(async ({ page }) => {
    await mockInsults(page);
    await mockDarkJokes(page);
    await mockTashaJokes(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await openInsultsTab(page);
  });

  test('Clicking Generate Dark Joke shows a joke from the list', async ({ page }) => {
    await page.locator('#btnGenerateDarkJoke').click();
    await page.waitForTimeout(300);

    const jokeText = page.locator('#darkJokeDisplay .dark-joke-text');
    await expect(jokeText).toBeVisible();

    const displayed = await jokeText.textContent();
    expect(FAKE_DARK_JOKES).toContain(displayed.trim());
  });

  test('Multiple clicks show different jokes (not stuck)', async ({ page }) => {
    const results = new Set();
    for (let i = 0; i < 8; i++) {
      await page.locator('#btnGenerateDarkJoke').click();
      await page.waitForTimeout(200);
      const text = await page.locator('#darkJokeDisplay .dark-joke-text').textContent();
      results.add(text.trim());
    }
    expect(results.size).toBeGreaterThanOrEqual(2);
  });

  test('Dark joke button is re-enabled after generating', async ({ page }) => {
    await page.locator('#btnGenerateDarkJoke').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#btnGenerateDarkJoke')).toBeEnabled();
  });

  test('Shows error message when dark-jokes.json fails to load', async ({ page }) => {
    await page.route('**/dark-jokes.json', route => route.fulfill({ status: 500 }));
    await page.evaluate(() => window.__dark_jokes_cache = null);
    await page.locator('#btnGenerateDarkJoke').click();
    await page.waitForTimeout(500);

    await expect(page.locator('#darkJokeDisplay .dark-joke-error')).toBeVisible();
  });

});

test.describe('Insults - insults.json caching', () => {

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
    await mockDarkJokes(page);
    await mockTashaJokes(page);

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

  test('dark-jokes.json is fetched only once across multiple generates', async ({ page }) => {
    let fetchCount = 0;
    await mockInsults(page);
    await page.route('**/dark-jokes.json', route => {
      fetchCount++;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FAKE_DARK_JOKES),
      });
    });

    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await openInsultsTab(page);

    for (let i = 0; i < 5; i++) {
      await page.locator('#btnGenerateDarkJoke').click();
      await page.waitForTimeout(200);
    }

    expect(fetchCount).toBe(1);
  });

  test('tasha-jokes.json is fetched only once across multiple generates', async ({ page }) => {
    let fetchCount = 0;
    await mockInsults(page);
    await mockDarkJokes(page);
    await page.route('**/tasha-jokes.json', route => {
      fetchCount++;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FAKE_TASHA_JOKES),
      });
    });

    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await openInsultsTab(page);

    for (let i = 0; i < 5; i++) {
      await page.locator('#btnGenerateTasha').click();
      await page.waitForTimeout(200);
    }

    expect(fetchCount).toBe(1);
  });

});

test.describe('Insults - Tasha\'s Hideous Laughter', () => {

  test.beforeEach(async ({ page }) => {
    await mockInsults(page);
    await mockDarkJokes(page);
    await mockTashaJokes(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await openInsultsTab(page);
  });

  test('Clicking Generate Joke shows a joke from the list', async ({ page }) => {
    await page.locator('#btnGenerateTasha').click();
    await page.waitForTimeout(300);

    const jokeText = page.locator('#tashaDisplay .tasha-text');
    await expect(jokeText).toBeVisible();

    const displayed = await jokeText.textContent();
    expect(FAKE_TASHA_JOKES).toContain(displayed.trim());
  });

  test('Multiple clicks show different jokes (not stuck)', async ({ page }) => {
    const results = new Set();
    for (let i = 0; i < 8; i++) {
      await page.locator('#btnGenerateTasha').click();
      await page.waitForTimeout(200);
      const text = await page.locator('#tashaDisplay .tasha-text').textContent();
      results.add(text.trim());
    }
    expect(results.size).toBeGreaterThanOrEqual(2);
  });

  test('Tasha button is re-enabled after generating', async ({ page }) => {
    await page.locator('#btnGenerateTasha').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#btnGenerateTasha')).toBeEnabled();
  });

  test('Shows error message when tasha-jokes.json fails to load', async ({ page }) => {
    await page.route('**/tasha-jokes.json', route => route.fulfill({ status: 500 }));
    await page.evaluate(() => window.__tasha_jokes_cache = null);
    await page.locator('#btnGenerateTasha').click();
    await page.waitForTimeout(500);

    await expect(page.locator('#tashaDisplay .tasha-error')).toBeVisible();
  });

});
