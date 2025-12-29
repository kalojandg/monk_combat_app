import { test, expect } from '@playwright/test';

/**
 * INVENTORY CRUD TESTS
 * 
 * Тестват добавяне, редакция и изтриване на предмети в Inventory.
 */

test.describe('Inventory - Add Item', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    
    // Open Inventory tab
    await page.locator('button[data-tab="inventory"]').click();
    await page.waitForTimeout(300); // Wait for tab HTML to load and event listeners to attach
  });

  test('Can add new inventory item', async ({ page }) => {
    // Click Add button
    await page.locator('#btnInvAdd').click();
    await page.waitForTimeout(100); // Wait for modal to open
    
    // Fill modal
    await page.locator('#invName').fill('Longsword');
    await page.locator('#invQty').fill('1');
    await page.locator('#invNote').fill('Магичен меч +1');
    
    // Save
    await page.locator('#invSave').click();
    await page.waitForTimeout(200); // Wait for save to complete
    
    // Verify item appears in list
    await expect(page.locator('text=Longsword')).toBeVisible();
    await expect(page.locator('text=Магичен меч +1')).toBeVisible();
  });

  test('Inventory item persists across page reload', async ({ page }) => {
    // Add item
    await page.locator('#btnInvAdd').click();
    await page.waitForTimeout(100); // Wait for modal to open
    await page.locator('#invName').fill('Health Potion');
    await page.locator('#invQty').fill('3');
    await page.locator('#invSave').click();
    await page.waitForTimeout(200); // Wait for save to complete
    
    // Reload page
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    
    // Open Inventory tab
    await page.locator('button[data-tab="inventory"]').click();
    await page.waitForTimeout(300); // Wait for tab HTML to load
    
    // Item still there
    await expect(page.locator('text=Health Potion')).toBeVisible();
  });

  test('Can add multiple items', async ({ page }) => {
    // Add item 1
    await page.locator('#btnInvAdd').click();
    await page.waitForTimeout(100); // Wait for modal to open
    await page.locator('#invName').fill('Rope');
    await page.locator('#invQty').fill('1');
    await page.locator('#invSave').click();
    await page.waitForTimeout(200); // Wait for save to complete
    
    // Add item 2
    await page.locator('#btnInvAdd').click();
    await page.waitForTimeout(100); // Wait for modal to open
    await page.locator('#invName').fill('Torch');
    await page.locator('#invQty').fill('5');
    await page.locator('#invSave').click();
    await page.waitForTimeout(200); // Wait for save to complete
    
    // Both visible
    await expect(page.locator('text=Rope')).toBeVisible();
    await expect(page.locator('text=Torch')).toBeVisible();
  });

  test('Can cancel adding item', async ({ page }) => {
    // Open modal
    await page.locator('#btnInvAdd').click();
    await page.waitForTimeout(100); // Wait for modal to open
    await page.locator('#invName').fill('Should not be saved');
    
    // Cancel
    await page.locator('#invCancel').click();
    await page.waitForTimeout(100); // Wait for modal to close
    
    // Modal closed, item not added
    await expect(page.locator('text=Should not be saved')).not.toBeVisible();
  });

});

test.describe('Inventory - Edit Item', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    
    // Open Inventory and add an item
    await page.locator('button[data-tab="inventory"]').click();
    await page.waitForTimeout(300); // Wait for tab HTML to load and event listeners to attach
    await page.locator('#btnInvAdd').click();
    await page.waitForTimeout(100); // Wait for modal to open
    await page.locator('#invName').fill('Dagger');
    await page.locator('#invQty').fill('1');
    await page.locator('#invNote').fill('Common weapon');
    await page.locator('#invSave').click();
    await page.waitForTimeout(200); // Wait for save to complete
  });

  test('Can edit existing item', async ({ page }) => {
    // Click edit button (🖊️)
    const editBtn = page.locator('button[data-edit="0"]');
    await editBtn.click();
    await page.waitForTimeout(100); // Wait for modal to open
    
    // Modal should pre-fill
    await expect(page.locator('#invName')).toHaveValue('Dagger');
    
    // Change values
    await page.locator('#invName').fill('Dagger +1');
    await page.locator('#invQty').fill('2');
    await page.locator('#invNote').fill('Magic weapon');
    await page.locator('#invSave').click();
    await page.waitForTimeout(200); // Wait for save to complete
    
    // Verify changes
    await expect(page.locator('text=Dagger +1')).toBeVisible();
    await expect(page.locator('text=Magic weapon')).toBeVisible();
    await expect(page.locator('text=Common weapon')).not.toBeVisible();
  });

  test('Edit persists across reload', async ({ page }) => {
    // Edit item
    await page.locator('button[data-edit="0"]').click();
    await page.waitForTimeout(100); // Wait for modal to open
    await page.locator('#invName').fill('Edited Name');
    await page.locator('#invSave').click();
    await page.waitForTimeout(200); // Wait for save to complete
    
    // Reload
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="inventory"]').click();
    await page.waitForTimeout(300); // Wait for tab HTML to load
    
    // Still edited
    await expect(page.locator('text=Edited Name')).toBeVisible();
  });

});

test.describe('Inventory - Delete Item', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    
    // Add 2 items
    await page.locator('button[data-tab="inventory"]').click();
    await page.waitForTimeout(300); // Wait for tab HTML to load and event listeners to attach
    
    await page.locator('#btnInvAdd').click();
    await page.waitForTimeout(100); // Wait for modal to open
    await page.locator('#invName').fill('Item A');
    await page.locator('#invQty').fill('1');
    await page.locator('#invSave').click();
    await page.waitForTimeout(200); // Wait for save to complete
    
    await page.locator('#btnInvAdd').click();
    await page.waitForTimeout(100); // Wait for modal to open
    await page.locator('#invName').fill('Item B');
    await page.locator('#invQty').fill('1');
    await page.locator('#invSave').click();
    await page.waitForTimeout(200); // Wait for save to complete
  });

  test('Can delete item with confirmation', async ({ page }) => {
    // Wait for items to render
    await page.waitForTimeout(300);
    
    // Setup dialog handler
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Изтриване');
      await dialog.accept();
    });
    
    // Delete first item (🗑️)
    await page.locator('button[data-del="0"]').click();
    
    // Wait for delete to process
    await page.waitForTimeout(300);
    
    // Item A gone, Item B still there (check in inventory table specifically)
    const invTable = page.locator('#invTableRoot');
    await expect(invTable).not.toContainText('Item A');
    await expect(invTable).toContainText('Item B');
  });

  test('Can cancel delete', async ({ page }) => {
    // Wait for items to render
    await page.waitForTimeout(300);
    
    // Setup dialog handler to cancel
    page.on('dialog', async dialog => {
      await dialog.dismiss();
    });
    
    // Try to delete
    await page.locator('button[data-del="0"]').click();
    
    // Both items still there
    const invTable = page.locator('#invTableRoot');
    await expect(invTable).toContainText('Item A');
    await expect(invTable).toContainText('Item B');
  });

  test('Delete persists across reload', async ({ page }) => {
    // Wait for items to render
    await page.waitForTimeout(300);
    
    page.on('dialog', async dialog => await dialog.accept());
    
    // Delete Item A
    await page.locator('button[data-del="0"]').click();
    
    // Wait for delete
    await page.waitForTimeout(300);
    
    const invTable = page.locator('#invTableRoot');
    await expect(invTable).not.toContainText('Item A');
    
    // Reload
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="inventory"]').click();
    await page.waitForTimeout(300); // Wait for tab HTML to load
    
    // Item A still gone
    await expect(invTable).not.toContainText('Item A');
    await expect(invTable).toContainText('Item B');
  });

});

test.describe('Inventory - Edge Cases', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="inventory"]').click();
    await page.waitForTimeout(300); // Wait for tab HTML to load and event listeners to attach
  });

  test('Empty inventory shows placeholder', async ({ page }) => {
    // Should show "няма предмети" message
    await expect(page.locator('text=Няма добавени предмети')).toBeVisible();
  });

  test('Can add item with special characters', async ({ page }) => {
    await page.locator('#btnInvAdd').click();
    await page.waitForTimeout(100); // Wait for modal to open
    await page.locator('#invName').fill('Меч "Светкавица" (магичен)');
    await page.locator('#invNote').fill('Със спец. символи: #@!%&');
    await page.locator('#invSave').click();
    await page.waitForTimeout(200); // Wait for save to complete
    
    await expect(page.locator('text=Меч "Светкавица" (магичен)')).toBeVisible();
  });

  test('Can add item with very large quantity', async ({ page }) => {
    await page.locator('#btnInvAdd').click();
    await page.waitForTimeout(100); // Wait for modal to open
    await page.locator('#invName').fill('Gold coins');
    await page.locator('#invQty').fill('999999');
    await page.locator('#invSave').click();
    await page.waitForTimeout(200); // Wait for save to complete
    
    await expect(page.locator('text=Gold coins')).toBeVisible();
    await expect(page.locator('text=999999')).toBeVisible();
  });

  test('Can add item with multiline note', async ({ page }) => {
    await page.locator('#btnInvAdd').click();
    await page.waitForTimeout(100); // Wait for modal to open
    await page.locator('#invName').fill('Scroll');
    await page.locator('#invNote').fill('Line 1\nLine 2\nLine 3');
    await page.locator('#invSave').click();
    await page.waitForTimeout(200); // Wait for save to complete
    
    await expect(page.locator('text=Scroll')).toBeVisible();
  });

});
