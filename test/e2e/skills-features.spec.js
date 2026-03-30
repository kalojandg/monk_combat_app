import { test, expect } from '@playwright/test';

test.describe('Skills & Features Tab', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await page.locator('button[data-tab="skills"]').click();
    await page.waitForTimeout(500);
  });

  test('Skills tab shows accordion container', async ({ page }) => {
    await expect(page.locator('#featuresAccordion')).toBeVisible();
  });

  test('Skills tab shows collapse all button', async ({ page }) => {
    await expect(page.locator('#collapseAllBtn')).toBeVisible();
  });

  test('Features accordion shows level 1 features by default', async ({ page }) => {
    // Wait for async JSON load
    await page.waitForSelector('#featuresAccordion details.feat', { timeout: 5000 });
    const count = await page.locator('#featuresAccordion details.feat').count();
    expect(count).toBeGreaterThan(0);
  });

  test('Accordion items are expandable', async ({ page }) => {
    await page.waitForSelector('#featuresAccordion details.feat', { timeout: 5000 });
    const first = page.locator('#featuresAccordion details.feat').first();

    // Click summary to open
    await first.locator('summary').click();
    await page.waitForTimeout(200);

    const isOpen = await first.getAttribute('open');
    expect(isOpen).not.toBeNull();
  });

  test('Collapse all button collapses all items', async ({ page }) => {
    await page.waitForSelector('#featuresAccordion details.feat', { timeout: 5000 });

    // Open first item
    await page.locator('#featuresAccordion details.feat summary').first().click();
    await page.waitForTimeout(200);

    // Collapse all
    await page.locator('#collapseAllBtn').click();
    await page.waitForTimeout(200);

    const details = page.locator('#featuresAccordion details.feat');
    const count = await details.count();
    for (let i = 0; i < count; i++) {
      const isOpen = await details.nth(i).getAttribute('open');
      expect(isOpen).toBeNull();
    }
  });

  test('Features update when level changes', async ({ page }) => {
    await page.waitForSelector('#featuresAccordion details.feat', { timeout: 5000 });
    const initialCount = await page.locator('#featuresAccordion details.feat').count();

    // Level up to 5
    await page.evaluate(() => {
      window.st.level = 5;
      window.save();
    });
    // Re-open skills tab to trigger re-render
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('button[data-tab="skills"]').click();
    await page.waitForTimeout(500);
    await page.waitForSelector('#featuresAccordion details.feat', { timeout: 5000 });

    const newCount = await page.locator('#featuresAccordion details.feat').count();
    expect(newCount).toBeGreaterThan(initialCount);
  });

  test('Features at level 20 show maximum features', async ({ page }) => {
    await page.evaluate(() => {
      window.st.level = 20;
      window.save();
    });
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(200);
    await page.locator('button[data-tab="skills"]').click();
    await page.waitForTimeout(500);
    await page.waitForSelector('#featuresAccordion details.feat', { timeout: 5000 });

    const count = await page.locator('#featuresAccordion details.feat').count();
    expect(count).toBeGreaterThan(10);
  });
});
