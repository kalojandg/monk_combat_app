import { test, expect } from '@playwright/test';

// Всичките 17 типа, както са в registry-то на modules/flavor.js.
const TYPES = [
  { id: 'crit-miss',       label: 'Critical Miss' },
  { id: 'miss-attack',     label: 'Miss Attack' },
  { id: 'crit-attack',     label: 'Critical Attack' },
  { id: 'suffer-crit',     label: 'Suffer Critical' },
  { id: 'combat-tease',    label: 'Combat Tease' },
  { id: 'magic',           label: 'Magic' },
  { id: 'qa',              label: 'Q&A' },
  { id: 'social',          label: 'Social' },
  { id: 'magic-cocktails', label: 'Cocktail Magic' },
  { id: 'life-wisdom',     label: 'Life Wisdom' },
  { id: 'game-cheating',   label: 'Game Cheating' },
  { id: 'excuses',         label: 'Excuses' },
  { id: 'storytime',       label: 'Storytime' },
  { id: 'slipaway',        label: 'Slip Away' },
  { id: 'insult',          label: 'Insult' },
  { id: 'dark-joke',       label: 'Dark Joke' },
  { id: 'tasha',           label: "Tasha's Joke" },
];

const btn = (page, id) => page.locator(`#tab-flavor [data-flavor="${id}"]`);
const output = (page) => page.locator('#flavorOutput');

test.describe('Flavor - UI Interaction', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await page.locator('button[data-tab="flavor"]').click();
    await page.waitForTimeout(300);
  });

  test('Tab opens with a visible, empty, read-only output area', async ({ page }) => {
    await expect(output(page)).toBeVisible();
    expect(await output(page).inputValue()).toBe('');
    expect(await output(page).getAttribute('readonly')).not.toBeNull();
  });

  test('All 17 flavor buttons are visible', async ({ page }) => {
    for (const t of TYPES) {
      await expect(btn(page, t.id), `${t.label} button`).toBeVisible();
    }
    await expect(page.locator('#tab-flavor .flavor-btn')).toHaveCount(TYPES.length);
  });

  for (const t of TYPES) {
    test(`${t.label}: click fills the output and marks the button active`, async ({ page }) => {
      await btn(page, t.id).click();
      await page.waitForTimeout(300);

      const val = await output(page).inputValue();
      expect(val.length).toBeGreaterThan(0);
      expect(val).not.toBe('(empty)');
      expect(val).not.toContain('(failed to load');
      await expect(btn(page, t.id)).toHaveClass(/\bactive\b/);
    });
  }

  test('Switching type refills the output and moves .active', async ({ page }) => {
    await btn(page, 'crit-miss').click();
    await page.waitForTimeout(300);
    const first = await output(page).inputValue();
    expect(first.length).toBeGreaterThan(0);

    await btn(page, 'tasha').click();
    await page.waitForTimeout(300);
    const second = await output(page).inputValue();
    expect(second.length).toBeGreaterThan(0);
    expect(second).not.toBe(first);

    await expect(btn(page, 'tasha')).toHaveClass(/\bactive\b/);
    await expect(btn(page, 'crit-miss')).not.toHaveClass(/\bactive\b/);
    await expect(page.locator('#tab-flavor .flavor-btn.active')).toHaveCount(1);
  });

  test('Clicking the same button again keeps producing lines (and varies)', async ({ page }) => {
    const results = new Set();
    for (let i = 0; i < 10; i++) {
      await btn(page, 'insult').click();
      await page.waitForTimeout(100);
      const val = await output(page).inputValue();
      expect(val.length).toBeGreaterThan(0);
      results.add(val);
    }
    expect(results.size).toBeGreaterThan(1);
    await expect(btn(page, 'insult')).toHaveClass(/\bactive\b/);
  });
});
