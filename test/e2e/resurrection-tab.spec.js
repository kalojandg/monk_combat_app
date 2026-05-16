import { test, expect } from '@playwright/test';

/**
 * RESURRECTION TAB TESTS (TDD)
 *
 * Тестват таба "Resurrection" с Mark of Shadow dragonmark traits.
 */

test.describe('Resurrection Tab - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
  });

  test('Resurrection tab button exists between PC Characteristics and Inventory', async ({ page }) => {
    const buttons = await page.locator('.tab-nav .tab-btn').allTextContents();
    const pcCharIndex = buttons.findIndex(t => t.includes('PC Characteristics'));
    const resIndex = buttons.findIndex(t => t.includes('Resurrection'));
    const inventoryIndex = buttons.findIndex(t => t.includes('Inventory'));

    expect(resIndex).toBeGreaterThan(pcCharIndex);
    expect(resIndex).toBeLessThan(inventoryIndex);
  });

  test('Clicking Resurrection tab shows tab content', async ({ page }) => {
    await page.locator('button.tab-btn', { hasText: 'Resurrection' }).click();
    await page.waitForTimeout(200);

    await expect(page.locator('#tab-resurrection')).toBeVisible();
  });

  test('Resurrection tab is hidden when other tab is active', async ({ page }) => {
    await page.locator('button.tab-btn', { hasText: 'PC Characteristics' }).click();
    await page.waitForTimeout(200);

    await expect(page.locator('#tab-resurrection')).not.toBeVisible();
  });
});

test.describe('Resurrection Tab - Content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await page.locator('button.tab-btn', { hasText: 'Resurrection' }).click();
    await page.waitForTimeout(300);
  });

  test('Tab has section title with "Resurrection"', async ({ page }) => {
    await expect(page.locator('#tab-resurrection .section-title')).toContainText('Resurrection');
  });

  test('Mark of Shadow accordion entry exists', async ({ page }) => {
    const summaries = await page.locator('#tab-resurrection details.feat summary').allTextContents();
    expect(summaries.some(s => s.includes('Mark of Shadow'))).toBe(true);
  });

  test('Cunning Intuition accordion entry exists', async ({ page }) => {
    const summaries = await page.locator('#tab-resurrection details.feat summary').allTextContents();
    expect(summaries.some(s => s.includes('Cunning Intuition'))).toBe(true);
  });

  test('Shape Shadows accordion entry exists', async ({ page }) => {
    const summaries = await page.locator('#tab-resurrection details.feat summary').allTextContents();
    expect(summaries.some(s => s.includes('Shape Shadows'))).toBe(true);
  });

  test('Spells of the Mark accordion entry exists', async ({ page }) => {
    const summaries = await page.locator('#tab-resurrection details.feat summary').allTextContents();
    expect(summaries.some(s => s.includes('Spells of the Mark'))).toBe(true);
  });

  test('Exactly 4 accordion entries in resurrection tab', async ({ page }) => {
    const count = await page.locator('#tab-resurrection details.feat').count();
    expect(count).toBe(4);
  });
});

test.describe('Resurrection Tab - Accordion Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await page.locator('button.tab-btn', { hasText: 'Resurrection' }).click();
    await page.waitForTimeout(300);
  });

  test('Cunning Intuition expands and shows d4 content', async ({ page }) => {
    const details = page.locator('#tab-resurrection details.feat', { hasText: 'Cunning Intuition' });
    await details.locator('summary').click();
    await page.waitForTimeout(400);

    await expect(details.locator('.feature-card')).toBeVisible();
    const text = await details.locator('.feature-card').textContent();
    expect(text).toContain('d4');
  });

  test('Shape Shadows expands and shows minor illusion + invisibility', async ({ page }) => {
    const details = page.locator('#tab-resurrection details.feat', { hasText: 'Shape Shadows' });
    await details.locator('summary').click();
    await page.waitForTimeout(400);

    await expect(details.locator('.feature-card')).toBeVisible();
    const text = await details.locator('.feature-card').textContent();
    expect(text).toContain('minor illusion');
    expect(text).toContain('invisibility');
  });

  test('Spells of the Mark expands and lists all 5 spell levels', async ({ page }) => {
    const details = page.locator('#tab-resurrection details.feat', { hasText: 'Spells of the Mark' });
    await details.locator('summary').click();
    await page.waitForTimeout(400);

    await expect(details.locator('.feature-card')).toBeVisible();
    const text = await details.locator('.feature-card').textContent();
    expect(text).toContain('disguise self');
    expect(text).toContain('pass without trace');
    expect(text).toContain('major image');
    expect(text).toContain('greater invisibility');
    expect(text).toContain('mislead');
  });

  test('Mark of Shadow expands and shows partial elf note', async ({ page }) => {
    const details = page.locator('#tab-resurrection details.feat', { hasText: 'Mark of Shadow' });
    await details.locator('summary').click();
    await page.waitForTimeout(400);

    await expect(details.locator('.feature-card')).toBeVisible();
    const text = await details.locator('.feature-card').textContent();
    expect(text.length).toBeGreaterThan(10);
  });

  test('Feature card is visible after opening (not clipped by max-height)', async ({ page }) => {
    const details = page.locator('#tab-resurrection details.feat', { hasText: 'Cunning Intuition' });
    await details.locator('summary').click();
    await page.waitForTimeout(400);

    const card = details.locator('.feature-card');
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThan(20);
  });
});
