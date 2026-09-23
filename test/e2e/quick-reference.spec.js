import { test, expect } from '@playwright/test';

/**
 * Quick Reference sub-tab (Skills → Quick Reference).
 * Read-only accordion rendered from quick-reference.json by modules/quick-reference.js.
 */

const SECTION_TITLES = ['Jumping', 'Conditions', 'Actions in Combat', 'Cover'];
const TOTAL_ENTRIES = 31;

async function openQuickReference(page) {
  await page.locator('#tab-skills button[data-subtab="quickref"]').click();
  await page.waitForSelector('#quickRefRoot details.feat', { timeout: 10000 });
}

test.describe('Skills Tab - Quick Reference', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="skills"]').click();
    await page.waitForTimeout(500);
  });

  test('renders the four rule sections in order', async ({ page }) => {
    await openQuickReference(page);
    const titles = page.locator('#quickRefRoot .section-title');
    await expect(titles).toHaveCount(SECTION_TITLES.length);
    await expect(titles).toHaveText(SECTION_TITLES);
  });

  test('renders every rule entry as an accordion item', async ({ page }) => {
    await openQuickReference(page);
    await expect(page.locator('#quickRefRoot details.feat')).toHaveCount(TOTAL_ENTRIES);
  });

  test('an entry opens on click and shows its rules text', async ({ page }) => {
    await openQuickReference(page);

    const stunned = page.locator('#quickRefRoot details.feat', { has: page.locator('summary', { hasText: 'Stunned' }) });
    await expect(stunned).toHaveCount(1);

    const card = stunned.locator('.feature-card');
    await expect(card).not.toBeVisible();

    await stunned.locator('summary').click();
    await expect(card).toBeVisible();
    await expect(card).toContainText('automatically fails Strength and Dexterity saving throws');
  });

  test('Exhaustion renders its six-level table', async ({ page }) => {
    await openQuickReference(page);

    const exhaustion = page.locator('#quickRefRoot details.feat', { has: page.locator('summary', { hasText: 'Exhaustion' }) });
    await exhaustion.locator('summary').click();

    const table = exhaustion.locator('.feature-card table');
    await expect(table).toBeVisible();
    await expect(table.locator('thead th')).toHaveText(['Level', 'Effect']);
    await expect(table.locator('tbody tr')).toHaveCount(6);
    await expect(table.locator('tbody tr').nth(5)).toContainText('Death');
  });

  test('switching sub-tabs back and forth does not duplicate the content', async ({ page }) => {
    await openQuickReference(page);
    await expect(page.locator('#quickRefRoot details.feat')).toHaveCount(TOTAL_ENTRIES);

    await page.locator('#tab-skills button[data-subtab="personal"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#subtab-personal')).toBeVisible();

    await openQuickReference(page);
    await expect(page.locator('#quickRefRoot .section-title')).toHaveCount(SECTION_TITLES.length);
    await expect(page.locator('#quickRefRoot details.feat')).toHaveCount(TOTAL_ENTRIES);

    // ...and the accordion still works after the re-render.
    const longJump = page.locator('#quickRefRoot details.feat', { has: page.locator('summary', { hasText: 'Long Jump' }) });
    await longJump.locator('summary').click();
    await expect(longJump.locator('.feature-card')).toBeVisible();
  });

});
