import { test, expect } from '@playwright/test';

/**
 * ALIASES & FAMILIARS CRUD TESTS
 * 
 * Тестват добавяне и изтриване на aliases (shenanigans) и familiars.
 */

test.describe('Aliases - Add & Delete', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    
    // Open Shenanigans tab
    await page.locator('button[data-tab="shenanigans"]').click();
  });

  test('Can generate random alias and save it', async ({ page }) => {
    // Generate random name
    await page.locator('#btnGetName').click();
    
    // Wait for async load
    await page.waitForTimeout(500);
    
    // Random name should appear
    const randomName = await page.locator('#fakeNameOutput').inputValue();
    expect(randomName).toBeTruthy();
    expect(randomName.length).toBeGreaterThan(0);
    
    // Click "Save" button (should be enabled after generation)
    await page.locator('#btnSaveAlias').click();
    
    // Modal should appear
    await expect(page.locator('#aliasModal')).toBeVisible();
    
    // Fill note
    await page.locator('#aliasToInput').fill('Представих се на страж в порта');
    
    // Save
    await page.locator('#aliasConfirm').click();
    
    // Alias should appear in log (use more specific selector to avoid ambiguity)
    const aliasTable = page.locator('#aliasLog');
    await expect(aliasTable).toContainText(randomName);
    await expect(aliasTable).toContainText('Представих се на страж в порта');
  });

  test('Alias persists across page reload', async ({ page }) => {
    // Generate and save alias
    await page.locator('#btnGetName').click();
    await page.waitForTimeout(500);
    const name = await page.locator('#fakeNameOutput').inputValue();
    
    await page.locator('#btnSaveAlias').click();
    await page.locator('#aliasToInput').fill('Test context');
    await page.locator('#aliasConfirm').click();
    
    // Reload
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="shenanigans"]').click();
    
    // Alias still there
    const aliasTable = page.locator('#aliasLog');
    await expect(aliasTable).toContainText(name);
  });

  test('Can cancel saving alias', async ({ page }) => {
    await page.locator('#btnGetName').click();
    await page.waitForTimeout(500);
    const name = await page.locator('#fakeNameOutput').inputValue();
    
    await page.locator('#btnSaveAlias').click();
    await page.locator('#aliasToInput').fill('Should not be saved');
    
    // Cancel
    await page.locator('#aliasCancel').click();
    
    // Modal closed, alias not in log
    await expect(page.locator('#aliasModal')).not.toBeVisible();
    await expect(page.locator('text=Should not be saved')).not.toBeVisible();
  });

  test('Can delete alias', async ({ page }) => {
    // Add alias
    await page.locator('#btnGetName').click();
    await page.waitForTimeout(500);
    const name = await page.locator('#fakeNameOutput').inputValue();
    await page.locator('#btnSaveAlias').click();
    await page.locator('#aliasToInput').fill('To be deleted');
    await page.locator('#aliasConfirm').click();
    
    // Wait for table to render
    await page.waitForTimeout(300);
    
    // Alias is there
    const aliasTable = page.locator('#aliasLog');
    await expect(aliasTable).toContainText(name);
    
    // Delete it (🗑️ button in alias table)
    const delBtn = page.locator('.alias-del').first();
    await delBtn.click();
    
    // Alias gone
    await expect(page.locator('text=To be deleted')).not.toBeVisible();
  });

  test('Can save multiple aliases', async ({ page }) => {
    // Add alias 1
    await page.locator('#btnGetName').click();
    await page.waitForTimeout(500);
    const name1 = await page.locator('#fakeNameOutput').inputValue();
    await page.locator('#btnSaveAlias').click();
    await page.locator('#aliasToInput').fill('Context 1');
    await page.locator('#aliasConfirm').click();
    
    // Add alias 2
    await page.locator('#btnGetName').click();
    await page.waitForTimeout(500);
    const name2 = await page.locator('#fakeNameOutput').inputValue();
    await page.locator('#btnSaveAlias').click();
    await page.locator('#aliasToInput').fill('Context 2');
    await page.locator('#aliasConfirm').click();
    
    // Both visible
    const aliasTable = page.locator('#aliasLog');
    await expect(aliasTable).toContainText(name1);
    await expect(aliasTable).toContainText(name2);
  });

});

test.describe('Familiars - Add & Delete', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    
    // Open Familiars tab
    await page.locator('button[data-tab="familiars"]').click();
  });

  test('Can generate random familiar name and save it', async ({ page }) => {
    // Generate random name (click one of the category buttons, e.g., Feline)
    await page.locator('.fam-btn[data-famcat="feline"]').click();
    
    // Wait for async load
    await page.waitForTimeout(500);
    
    // Random name should appear
    const randomName = await page.locator('#famNameOutput').inputValue();
    expect(randomName).toBeTruthy();
    expect(randomName.length).toBeGreaterThan(0);
    
    // Click "Save" button
    await page.locator('#btnFamSave').click();
    
    // Modal should appear
    await expect(page.locator('#famModal')).toBeVisible();
    
    // Fill note
    await page.locator('#famNoteInput').fill('Ястребът на Майора');
    
    // Save
    await page.locator('#famConfirm').click();
    
    // Familiar should appear in log
    const famTable = page.locator('#famLog');
    await expect(famTable).toContainText(randomName);
    await expect(famTable).toContainText('Ястребът на Майора');
  });

  test('Familiar persists across reload', async ({ page }) => {
    // Generate and save
    await page.locator('.fam-btn[data-famcat="avian"]').click();
    await page.waitForTimeout(500);
    const name = await page.locator('#famNameOutput').inputValue();
    
    await page.locator('#btnFamSave').click();
    await page.locator('#famNoteInput').fill('Паяк в шапката');
    await page.locator('#famConfirm').click();
    
    // Reload
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="familiars"]').click();
    
    // Still there
    const famTable = page.locator('#famLog');
    await expect(famTable).toContainText(name);
  });

  test('Can delete familiar', async ({ page }) => {
    // Add familiar
    await page.locator('.fam-btn[data-famcat="canine"]').click();
    await page.waitForTimeout(500);
    await page.locator('#btnFamSave').click();
    await page.locator('#famNoteInput').fill('To be deleted');
    await page.locator('#famConfirm').click();
    
    // Wait for table to render
    await page.waitForTimeout(300);
    
    // Delete it (familiars also use .alias-del class)
    const delBtn = page.locator('.alias-del').first();
    await delBtn.click();
    
    // Gone
    await expect(page.locator('text=To be deleted')).not.toBeVisible();
  });

  test('Can cancel saving familiar', async ({ page }) => {
    await page.locator('.fam-btn[data-famcat="rodentia"]').click();
    await page.waitForTimeout(500);
    await page.locator('#btnFamSave').click();
    await page.locator('#famNoteInput').fill('Should not save');
    
    // Cancel
    await page.locator('#famCancel').click();
    
    // Not saved
    await expect(page.locator('#famModal')).not.toBeVisible();
    await expect(page.locator('text=Should not save')).not.toBeVisible();
  });

});
