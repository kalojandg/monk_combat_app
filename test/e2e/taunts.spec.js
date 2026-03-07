import { test, expect } from '@playwright/test';

/**
 * COMBAT TAUNTS TAB TESTS
 *
 * Tests for the Taunts tab UI, API key management, and API call mocking.
 * Since API calls cost money, we mock the Anthropic API in tests.
 */

test.describe('Taunts - Tab Navigation', () => {

  test.beforeEach(async ({ page }) => {
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
    await page.locator('button[data-tab="taunts"]').click();
    await expect(page.locator('#tab-taunts')).toBeVisible();

    // API key input
    await expect(page.locator('#tauntApiKey')).toBeVisible();
    // Model selector
    await expect(page.locator('#tauntModel')).toBeVisible();
    // Save key button
    await expect(page.locator('#btnSaveApiKey')).toBeVisible();
    // Generate button
    await expect(page.locator('#btnGenerateTaunt')).toBeVisible();
    // Display area
    await expect(page.locator('#tauntDisplay')).toBeVisible();
  });

  test('Taunts tab has default placeholder text', async ({ page }) => {
    await page.locator('button[data-tab="taunts"]').click();
    const placeholder = page.locator('#tauntDisplay .taunt-placeholder');
    await expect(placeholder).toBeVisible();
  });

});

test.describe('Taunts - API Key Management', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="taunts"]').click();
  });

  test('API key saves to localStorage', async ({ page }) => {
    await page.locator('#tauntApiKey').fill('sk-ant-test-key-123');
    await page.locator('#btnSaveApiKey').click();

    const stored = await page.evaluate(() => localStorage.getItem('monkTaunt_apiKey'));
    expect(stored).toBe('sk-ant-test-key-123');
  });

  test('API key persists across tab switches', async ({ page }) => {
    await page.locator('#tauntApiKey').fill('sk-ant-persist-test');
    await page.locator('#btnSaveApiKey').click();

    // Switch away and back
    await page.locator('button[data-tab="inventory"]').click();
    await page.locator('button[data-tab="taunts"]').click();

    const val = await page.locator('#tauntApiKey').inputValue();
    expect(val).toBe('sk-ant-persist-test');
  });

  test('Model selection saves to localStorage', async ({ page }) => {
    await page.locator('#tauntModel').selectOption('claude-sonnet-4-20250514');
    await page.locator('#btnSaveApiKey').click();

    const stored = await page.evaluate(() => localStorage.getItem('monkTaunt_model'));
    expect(stored).toBe('claude-sonnet-4-20250514');
  });

  test('Default model is Haiku 4.5', async ({ page }) => {
    const val = await page.locator('#tauntModel').inputValue();
    expect(val).toBe('claude-haiku-4-5-20251001');
  });

  test('Save button shows confirmation feedback', async ({ page }) => {
    await page.locator('#tauntApiKey').fill('sk-ant-test');
    await page.locator('#btnSaveApiKey').click();

    await expect(page.locator('#btnSaveApiKey')).toHaveText('Saved!');
    // Reverts back after timeout
    await expect(page.locator('#btnSaveApiKey')).toHaveText('Save Key', { timeout: 3000 });
  });

});

test.describe('Taunts - Generate (mocked API)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });

    // Set a fake API key so the module doesn't reject
    await page.evaluate(() => localStorage.setItem('monkTaunt_apiKey', 'sk-ant-fake-test'));

    await page.locator('button[data-tab="taunts"]').click();
  });

  test('Shows error when no API key is set', async ({ page }) => {
    // Clear key
    await page.evaluate(() => localStorage.removeItem('monkTaunt_apiKey'));
    // Re-open tab to re-attach with cleared key
    await page.locator('button[data-tab="inventory"]').click();
    await page.locator('button[data-tab="taunts"]').click();

    await page.locator('#btnGenerateTaunt').click();
    await page.waitForTimeout(500);

    const error = page.locator('#tauntDisplay .taunt-error');
    await expect(error).toBeVisible();
  });

  test('Generate button shows loading state during API call', async ({ page }) => {
    // Mock API with a delayed response
    await page.route('**/api.anthropic.com/v1/messages', async route => {
      await new Promise(r => setTimeout(r, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [{ type: 'text', text: 'Test taunt response' }]
        }),
      });
    });

    await page.locator('#btnGenerateTaunt').click();

    // Button should show loading text
    await expect(page.locator('#btnGenerateTaunt')).toHaveText('Generating...');
    await expect(page.locator('#btnGenerateTaunt')).toBeDisabled();

    // Wait for completion
    await expect(page.locator('#btnGenerateTaunt')).toHaveText('Generate Taunt', { timeout: 5000 });
    await expect(page.locator('#btnGenerateTaunt')).toBeEnabled();
  });

  test('Displays taunt from mocked API response', async ({ page }) => {
    await page.route('**/api.anthropic.com/v1/messages', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [{ type: 'text', text: 'Ей, тъпако, стреляй по мен!' }]
        }),
      });
    });

    await page.locator('#btnGenerateTaunt').click();
    await page.waitForTimeout(1000);

    const tauntText = page.locator('#tauntDisplay .taunt-text');
    await expect(tauntText).toBeVisible();
    await expect(tauntText).toContainText('Ей, тъпако, стреляй по мен!');
  });

  test('Taunt is added to history after generation', async ({ page }) => {
    await page.route('**/api.anthropic.com/v1/messages', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [{ type: 'text', text: 'History test taunt' }]
        }),
      });
    });

    await page.locator('#btnGenerateTaunt').click();
    await page.waitForTimeout(1000);

    // History section should be visible
    const history = page.locator('#tauntHistory');
    await expect(history).toBeVisible();

    // History list should contain the taunt
    const historyItem = page.locator('#tauntHistoryList li');
    await expect(historyItem.first()).toContainText('History test taunt');
  });

  test('Multiple taunts accumulate in history', async ({ page }) => {
    let callCount = 0;
    await page.route('**/api.anthropic.com/v1/messages', async route => {
      callCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [{ type: 'text', text: `Taunt number ${callCount}` }]
        }),
      });
    });

    // Generate 3 taunts
    for (let i = 0; i < 3; i++) {
      await page.locator('#btnGenerateTaunt').click();
      await expect(page.locator('#btnGenerateTaunt')).toHaveText('Generate Taunt', { timeout: 5000 });
    }

    const items = page.locator('#tauntHistoryList li');
    await expect(items).toHaveCount(3);
  });

  test('Clear history button works', async ({ page }) => {
    await page.route('**/api.anthropic.com/v1/messages', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [{ type: 'text', text: 'Will be cleared' }]
        }),
      });
    });

    await page.locator('#btnGenerateTaunt').click();
    await expect(page.locator('#tauntHistory')).toBeVisible({ timeout: 3000 });

    await page.locator('#btnClearTauntHistory').click();
    await expect(page.locator('#tauntHistory')).not.toBeVisible();
  });

  test('Shows error on API failure', async ({ page }) => {
    await page.route('**/api.anthropic.com/v1/messages', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Invalid API key' } }),
      });
    });

    await page.locator('#btnGenerateTaunt').click();
    await page.waitForTimeout(1000);

    const error = page.locator('#tauntDisplay .taunt-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText('API error');
  });

  test('API request sends correct headers and model', async ({ page }) => {
    let capturedRequest = null;
    await page.route('**/api.anthropic.com/v1/messages', async route => {
      capturedRequest = {
        headers: route.request().headers(),
        body: JSON.parse(route.request().postData()),
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [{ type: 'text', text: 'Test' }]
        }),
      });
    });

    await page.locator('#btnGenerateTaunt').click();
    await expect(page.locator('#btnGenerateTaunt')).toHaveText('Generate Taunt', { timeout: 5000 });

    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest.headers['x-api-key']).toBe('sk-ant-fake-test');
    expect(capturedRequest.headers['anthropic-dangerous-direct-browser-access']).toBe('true');
    expect(capturedRequest.body.model).toBe('claude-haiku-4-5-20251001');
    expect(capturedRequest.body.system).toBeTruthy();
    expect(capturedRequest.body.messages).toHaveLength(1);
  });

});
