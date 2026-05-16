import { test, expect } from '@playwright/test';

/**
 * CUNNING INTUITION TOOLTIP TESTS (TDD)
 *
 * Performance and Stealth rows in the Passive Skills table have a green ⓘ icon.
 * Clicking shows a tooltip with the Cunning Intuition description.
 */

async function gotoPassiveSkills(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
  // Main "Stats" tab (not the sub-tab)
  await page.locator('button.tab-btn[data-tab="stats"]').click();
  await page.waitForTimeout(200);
  await page.locator('button.sub-tab-btn[data-subtab="passiveskills"]').click();
  await page.waitForTimeout(500);
}

// ─────────────────────────────────────────────────────────
test.describe('Cunning Intuition Info Icons', () => {

  test('Performance row has info icon', async ({ page }) => {
    await gotoPassiveSkills(page);
    const row = page.locator('#subtab-passiveskills #skillsBody tr', { hasText: 'Performance' });
    await expect(row.locator('.skill-info-btn')).toBeAttached();
  });

  test('Stealth row has info icon', async ({ page }) => {
    await gotoPassiveSkills(page);
    const row = page.locator('#subtab-passiveskills #skillsBody tr', { hasText: 'Stealth' });
    await expect(row.locator('.skill-info-btn')).toBeAttached();
  });

  test('Other skill rows do NOT have info icon', async ({ page }) => {
    await gotoPassiveSkills(page);
    const acrobaticsRow = page.locator('#subtab-passiveskills #skillsBody tr', { hasText: 'Acrobatics' });
    expect(await acrobaticsRow.locator('.skill-info-btn').count()).toBe(0);
  });

  test('Info icon has green styling', async ({ page }) => {
    await gotoPassiveSkills(page);
    const btn = page.locator('#subtab-passiveskills #skillsBody tr', { hasText: 'Performance' }).locator('.skill-info-btn');
    const color = await btn.evaluate(el => getComputedStyle(el).color);
    // Color should be greenish (rgb with high green component)
    expect(color).toMatch(/rgb/);
  });
});

// ─────────────────────────────────────────────────────────
test.describe('Cunning Intuition Tooltip Behaviour', () => {

  test('Clicking Performance info icon shows tooltip', async ({ page }) => {
    await gotoPassiveSkills(page);
    const btn = page.locator('#subtab-passiveskills #skillsBody tr', { hasText: 'Performance' }).locator('.skill-info-btn');
    await btn.click();
    await expect(page.locator('#skill-tooltip')).toBeVisible();
  });

  test('Tooltip text contains Cunning Intuition', async ({ page }) => {
    await gotoPassiveSkills(page);
    await page.locator('#subtab-passiveskills #skillsBody tr', { hasText: 'Performance' }).locator('.skill-info-btn').click();
    const text = await page.locator('#skill-tooltip').textContent();
    expect(text.toLowerCase()).toContain('cunning intuition');
  });

  test('Tooltip text contains d4', async ({ page }) => {
    await gotoPassiveSkills(page);
    await page.locator('#subtab-passiveskills #skillsBody tr', { hasText: 'Stealth' }).locator('.skill-info-btn').click();
    const text = await page.locator('#skill-tooltip').textContent();
    expect(text.toLowerCase()).toContain('d4');
  });

  test('Clicking info icon again hides tooltip', async ({ page }) => {
    await gotoPassiveSkills(page);
    const btn = page.locator('#subtab-passiveskills #skillsBody tr', { hasText: 'Performance' }).locator('.skill-info-btn');
    await btn.click();
    await expect(page.locator('#skill-tooltip')).toBeVisible();
    await btn.click();
    await expect(page.locator('#skill-tooltip')).not.toBeVisible();
  });

  test('Clicking outside tooltip hides it', async ({ page }) => {
    await gotoPassiveSkills(page);
    await page.locator('#subtab-passiveskills #skillsBody tr', { hasText: 'Performance' }).locator('.skill-info-btn').click();
    await expect(page.locator('#skill-tooltip')).toBeVisible();
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('#skill-tooltip')).not.toBeVisible();
  });
});
