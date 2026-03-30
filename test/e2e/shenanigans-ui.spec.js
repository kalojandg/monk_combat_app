import { test, expect } from '@playwright/test';

test.describe('Shenanigans - Full UI', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await page.locator('button[data-tab="shenanigans"]').click();
    await page.waitForTimeout(300);
  });

  test('Get Name button generates a name', async ({ page }) => {
    await page.locator('#btnGetName').click();
    await page.waitForTimeout(300);
    const val = await page.locator('#fakeNameOutput').inputValue();
    expect(val.length).toBeGreaterThan(0);
  });

  test('Name output is read-only', async ({ page }) => {
    const ro = await page.locator('#fakeNameOutput').getAttribute('readonly');
    expect(ro).not.toBeNull();
  });

  test('Save button is disabled until name is generated', async ({ page }) => {
    await expect(page.locator('#btnSaveAlias')).toBeDisabled();

    await page.locator('#btnGetName').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#btnSaveAlias')).toBeEnabled();
  });

  test('Save opens modal', async ({ page }) => {
    await page.locator('#btnGetName').click();
    await page.waitForTimeout(300);
    await page.locator('#btnSaveAlias').click();
    await page.waitForTimeout(100);

    await expect(page.locator('#aliasModal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#aliasToInput')).toBeVisible();
  });

  test('Cancel closes modal without saving', async ({ page }) => {
    await page.locator('#btnGetName').click();
    await page.waitForTimeout(300);
    await page.locator('#btnSaveAlias').click();
    await page.waitForTimeout(100);

    await page.locator('#aliasCancel').click();
    await page.waitForTimeout(100);

    await expect(page.locator('#aliasModal')).toHaveClass(/hidden/);
    // No table rows
    const rows = await page.locator('#aliasLog tr').count();
    expect(rows).toBeLessThanOrEqual(1); // header row at most
  });

  test('Confirm saves alias to table', async ({ page }) => {
    await page.locator('#btnGetName').click();
    await page.waitForTimeout(300);
    const name = await page.locator('#fakeNameOutput').inputValue();

    await page.locator('#btnSaveAlias').click();
    await page.waitForTimeout(100);
    await page.locator('#aliasToInput').fill('The innkeeper in Waterdeep');
    await page.locator('#aliasConfirm').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#aliasLog')).toContainText(name);
    await expect(page.locator('#aliasLog')).toContainText('The innkeeper in Waterdeep');
  });

  test('Multiple aliases accumulate in table', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await page.locator('#btnGetName').click();
      await page.waitForTimeout(300);
      await page.locator('#btnSaveAlias').click();
      await page.waitForTimeout(100);
      await page.locator('#aliasToInput').fill(`NPC ${i + 1}`);
      await page.locator('#aliasConfirm').click();
      await page.waitForTimeout(200);
    }

    const rows = page.locator('#aliasLog .alias-del');
    await expect(rows).toHaveCount(3);
  });

  test('Delete removes alias from table', async ({ page }) => {
    // Create one
    await page.locator('#btnGetName').click();
    await page.waitForTimeout(300);
    await page.locator('#btnSaveAlias').click();
    await page.waitForTimeout(100);
    await page.locator('#aliasToInput').fill('To delete');
    await page.locator('#aliasConfirm').click();
    await page.waitForTimeout(200);

    // Delete it
    await page.locator('.alias-del').first().click();
    await page.waitForTimeout(200);

    await expect(page.locator('#aliasLog')).not.toContainText('To delete');
  });

  test('Aliases persist after reload', async ({ page }) => {
    await page.locator('#btnGetName').click();
    await page.waitForTimeout(300);
    const name = await page.locator('#fakeNameOutput').inputValue();
    await page.locator('#btnSaveAlias').click();
    await page.waitForTimeout(100);
    await page.locator('#aliasToInput').fill('Persistent NPC');
    await page.locator('#aliasConfirm').click();
    await page.waitForTimeout(200);

    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await page.locator('button[data-tab="shenanigans"]').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#aliasLog')).toContainText(name);
    await expect(page.locator('#aliasLog')).toContainText('Persistent NPC');
  });

  test('Aliases included in export bundle', async ({ page }) => {
    await page.locator('#btnGetName').click();
    await page.waitForTimeout(300);
    await page.locator('#btnSaveAlias').click();
    await page.waitForTimeout(100);
    await page.locator('#aliasToInput').fill('Export test');
    await page.locator('#aliasConfirm').click();
    await page.waitForTimeout(200);

    const bundle = await page.evaluate(() => window.buildBundle());
    expect(bundle.state.aliases.length).toBeGreaterThanOrEqual(1);
    expect(bundle.state.aliases[0].to).toBe('Export test');
  });
});
