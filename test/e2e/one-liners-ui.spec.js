import { test, expect } from '@playwright/test';

test.describe('One-Liners - UI Interaction', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await page.locator('button[data-tab="liners"]').click();
    await page.waitForTimeout(300);
  });

  const categories = [
    { btn: 'btnCritMiss',    out: 'olCritMiss',    label: 'Critical Miss' },
    { btn: 'btnMissAttack',  out: 'olMissAttack',  label: 'Miss Attack' },
    { btn: 'btnCritAttack',  out: 'olCritAttack',  label: 'Critical Attack' },
    { btn: 'btnSufferCrit',  out: 'olSufferCrit',  label: 'Suffer Critical' },
    { btn: 'btnTease',       out: 'olTease',       label: 'Combat Tease' },
    { btn: 'btnMagic',       out: 'olMagic',       label: 'Magic' },
    { btn: 'btnQA',          out: 'olQA',          label: 'Q&A' },
    { btn: 'btnSocial',      out: 'olSocial',      label: 'Social' },
    { btn: 'btnCoctailMagic',out: 'olCoctailMagic', label: 'Cocktail Magic' },
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
      expect(val).not.toBe('(failed to load one-liners.json)');
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
      await page.locator('#btnCritMiss').click();
      await page.waitForTimeout(100);
      results.add(await page.locator('#olCritMiss').inputValue());
    }
    expect(results.size).toBeGreaterThan(1);
  });
});
