import { test, expect } from '@playwright/test';

test.describe('Excuses - UI Interaction', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await page.locator('button[data-tab="excuses"]').click();
    await page.waitForTimeout(300);
  });

  const categories = [
    { btn: 'btnExLifeWisdom',   out: 'exLifeWisdom',   label: 'Life Wisdom' },
    { btn: 'btnExGameCheating', out: 'exGameCheating', label: 'Game Cheating' },
    { btn: 'btnExExcuses',      out: 'exExcuses',      label: 'Excuses' },
    { btn: 'btnExStorytime',    out: 'exStorytime',     label: 'Storytime' },
    { btn: 'btnExSlipaway',     out: 'exSlipaway',      label: 'Slip Away' },
  ];

  for (const cat of categories) {
    test(`${cat.label}: button click populates output`, async ({ page }) => {
      const btn = page.locator(`#${cat.btn}`);
      const out = page.locator(`#${cat.out}`);

      await expect(btn).toBeVisible();
      await expect(out).toBeVisible();

      await btn.click();
      await page.waitForTimeout(300);

      const val = await out.inputValue();
      expect(val.length).toBeGreaterThan(0);
      expect(val).not.toBe('(failed to load excuses.json)');
    });
  }

  test('Output fields are read-only', async ({ page }) => {
    for (const cat of categories) {
      const ro = await page.locator(`#${cat.out}`).getAttribute('readonly');
      expect(ro).not.toBeNull();
    }
  });

  test('Clicking same button twice can produce different results', async ({ page }) => {
    const results = new Set();
    for (let i = 0; i < 10; i++) {
      await page.locator('#btnExExcuses').click();
      await page.waitForTimeout(100);
      results.add(await page.locator('#exExcuses').inputValue());
    }
    expect(results.size).toBeGreaterThan(1);
  });
});
