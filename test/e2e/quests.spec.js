import { test, expect } from '@playwright/test';

/**
 * QUESTS FEATURE TESTS
 *
 * Comprehensive test suite for the Quests feature including:
 * - Tab navigation
 * - Quest creation, editing, and fulfillment (CRUD operations)
 * - Drag-and-drop reordering
 * - Import/export integration
 */

test.describe('Quests - Tab Navigation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  test('Can navigate to Quests tab', async ({ page }) => {
    // Click Quests tab
    await page.locator('button[data-tab="quests"]').click();
    await page.waitForTimeout(300);

    // Verify Quests tab is visible
    const tabContent = page.locator('#tab-quests');
    await expect(tabContent).toBeVisible();

    // Verify quest elements are present
    await expect(page.locator('#btnQuestAdd')).toBeVisible();
    await expect(page.locator('#questTable')).toBeVisible();
    // Modal should exist but be hidden
    await expect(page.locator('#questModal')).toHaveClass(/hidden/);
  });

  test('Quests tab shows empty state initially', async ({ page }) => {
    await page.locator('button[data-tab="quests"]').click();
    await page.waitForTimeout(300);

    // Should show empty state message
    const emptyMessage = page.locator('#questTableBody td[colspan]');
    await expect(emptyMessage).toBeVisible();
    await expect(emptyMessage).toContainText('No quests yet');
  });
});

test.describe('Quests - CRUD Operations', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });

    // Navigate to quests tab
    await page.locator('button[data-tab="quests"]').click();
    await page.waitForTimeout(300);
  });

  test('Can create a new quest', async ({ page }) => {
    // Click Add Quest button
    await page.locator('#btnQuestAdd').click();
    await page.waitForTimeout(100);

    // Modal should be visible
    await expect(page.locator('#questModal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#questModalTitle')).toHaveText('Add Quest');

    // Fill in quest details
    await page.locator('#questObjective').fill('Defeat the dragon in the mountain');
    await page.locator('#questLocation').fill('Dragon Peak Mountains');
    await page.locator('#questReward').fill('1000 GP and Dragon Scale Armor');

    // Save the quest
    await page.locator('#questSave').click();
    await page.waitForTimeout(200);

    // Modal should be hidden
    await expect(page.locator('#questModal')).toHaveClass(/hidden/);

    // Quest should appear in table
    await expect(page.locator('.quest-objective')).toContainText('Defeat the dragon');
    await expect(page.locator('.quest-location')).toContainText('Dragon Peak Mountains');
    await expect(page.locator('.quest-reward')).toContainText('1000 GP and Dragon Scale Armor');

    // Edit and Fulfill buttons should be visible
    await expect(page.locator('.quest-edit-btn')).toBeVisible();
    await expect(page.locator('.quest-fulfill-btn')).toBeVisible();
  });

  test('Quest objective is required', async ({ page }) => {
    // Setup alert handler
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Objective is required');
      await dialog.accept();
    });

    // Click Add Quest button
    await page.locator('#btnQuestAdd').click();
    await page.waitForTimeout(100);

    // Try to save without objective
    await page.locator('#questLocation').fill('Some location');
    await page.locator('#questSave').click();

    // Modal should still be visible
    await expect(page.locator('#questModal')).not.toHaveClass(/hidden/);
  });

  test('Can edit an existing quest', async ({ page }) => {
    // First, create a quest
    await page.locator('#btnQuestAdd').click();
    await page.waitForTimeout(100);
    await page.locator('#questObjective').fill('Original objective');
    await page.locator('#questLocation').fill('Original location');
    await page.locator('#questReward').fill('Original reward');
    await page.locator('#questSave').click();
    await page.waitForTimeout(200);

    // Click Edit button
    await page.locator('.quest-edit-btn').click();
    await page.waitForTimeout(100);

    // Modal should open in edit mode
    await expect(page.locator('#questModalTitle')).toHaveText('Edit Quest');

    // Fields should be pre-filled
    await expect(page.locator('#questObjective')).toHaveValue('Original objective');
    await expect(page.locator('#questLocation')).toHaveValue('Original location');
    await expect(page.locator('#questReward')).toHaveValue('Original reward');

    // Modify quest
    await page.locator('#questObjective').fill('Updated objective');
    await page.locator('#questLocation').fill('Updated location');
    await page.locator('#questSave').click();
    await page.waitForTimeout(200);

    // Updated quest should appear in table
    await expect(page.locator('.quest-objective')).toContainText('Updated objective');
    await expect(page.locator('.quest-location')).toContainText('Updated location');
    await expect(page.locator('.quest-reward')).toContainText('Original reward');
  });

  test('Can cancel quest creation', async ({ page }) => {
    // Click Add Quest button
    await page.locator('#btnQuestAdd').click();
    await page.waitForTimeout(100);

    // Fill in some data
    await page.locator('#questObjective').fill('Test quest');

    // Click Cancel
    await page.locator('#questCancel').click();
    await page.waitForTimeout(100);

    // Modal should be hidden
    await expect(page.locator('#questModal')).toHaveClass(/hidden/);

    // Quest should not be in table
    await expect(page.locator('.quest-objective')).not.toBeVisible();
  });

  test('Can fulfill a quest', async ({ page }) => {
    // Create a quest
    await page.locator('#btnQuestAdd').click();
    await page.waitForTimeout(100);
    await page.locator('#questObjective').fill('Quest to fulfill');
    await page.locator('#questSave').click();
    await page.waitForTimeout(200);

    // Verify quest is active
    const questRow = page.locator('tr').filter({ hasText: 'Quest to fulfill' });
    await expect(questRow).not.toHaveClass(/quest-fulfilled/);

    // Click Fulfill button
    await page.locator('.quest-fulfill-btn').click();
    await page.waitForTimeout(200);

    // Quest should be marked as fulfilled
    await expect(questRow).toHaveClass(/quest-fulfilled/);
    await expect(page.locator('.quest-objective')).toHaveCSS('text-decoration', /line-through/);

    // Fulfill button should be replaced with Reactivate button
    await expect(page.locator('.quest-fulfill-btn')).not.toBeVisible();
    await expect(page.locator('.quest-unfulfill-btn')).toBeVisible();
  });

  test('Can reactivate a fulfilled quest', async ({ page }) => {
    // Create and fulfill a quest
    await page.locator('#btnQuestAdd').click();
    await page.waitForTimeout(100);
    await page.locator('#questObjective').fill('Quest to reactivate');
    await page.locator('#questSave').click();
    await page.waitForTimeout(200);
    await page.locator('.quest-fulfill-btn').click();
    await page.waitForTimeout(200);

    // Verify quest is fulfilled
    const questRow = page.locator('tr').filter({ hasText: 'Quest to reactivate' });
    await expect(questRow).toHaveClass(/quest-fulfilled/);

    // Click Reactivate button
    await page.locator('.quest-unfulfill-btn').click();
    await page.waitForTimeout(200);

    // Quest should be active again
    await expect(questRow).not.toHaveClass(/quest-fulfilled/);
    await expect(page.locator('.quest-fulfill-btn')).toBeVisible();
    await expect(page.locator('.quest-unfulfill-btn')).not.toBeVisible();
  });

  test('Can create multiple quests', async ({ page }) => {
    // Create first quest
    await page.locator('#btnQuestAdd').click();
    await page.waitForTimeout(100);
    await page.locator('#questObjective').fill('First quest');
    await page.locator('#questSave').click();
    await page.waitForTimeout(200);

    // Create second quest
    await page.locator('#btnQuestAdd').click();
    await page.waitForTimeout(100);
    await page.locator('#questObjective').fill('Second quest');
    await page.locator('#questSave').click();
    await page.waitForTimeout(200);

    // Create third quest
    await page.locator('#btnQuestAdd').click();
    await page.waitForTimeout(100);
    await page.locator('#questObjective').fill('Third quest');
    await page.locator('#questSave').click();
    await page.waitForTimeout(200);

    // All three quests should be visible
    await expect(page.locator('.quest-objective').nth(0)).toContainText('First quest');
    await expect(page.locator('.quest-objective').nth(1)).toContainText('Second quest');
    await expect(page.locator('.quest-objective').nth(2)).toContainText('Third quest');
  });
});

test.describe('Quests - Drag and Drop', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });

    // Navigate to quests tab
    await page.locator('button[data-tab="quests"]').click();
    await page.waitForTimeout(300);
  });

  test('Quest rows are draggable', async ({ page }) => {
    // Create two quests
    await page.locator('#btnQuestAdd').click();
    await page.waitForTimeout(100);
    await page.locator('#questObjective').fill('First quest');
    await page.locator('#questSave').click();
    await page.waitForTimeout(200);

    await page.locator('#btnQuestAdd').click();
    await page.waitForTimeout(100);
    await page.locator('#questObjective').fill('Second quest');
    await page.locator('#questSave').click();
    await page.waitForTimeout(200);

    // Verify initial order
    const firstRow = page.locator('#questTableBody tr').nth(0);
    const secondRow = page.locator('#questTableBody tr').nth(1);

    await expect(firstRow.locator('.quest-objective')).toContainText('First quest');
    await expect(secondRow.locator('.quest-objective')).toContainText('Second quest');

    // Drag second row to first position
    const firstRowBox = await firstRow.boundingBox();
    const secondRowBox = await secondRow.boundingBox();

    if (firstRowBox && secondRowBox) {
      await page.mouse.move(secondRowBox.x + secondRowBox.width / 2, secondRowBox.y + secondRowBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(firstRowBox.x + firstRowBox.width / 2, firstRowBox.y + firstRowBox.height / 2, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(300);

      // Verify order has changed
      await expect(page.locator('#questTableBody tr').nth(0).locator('.quest-objective')).toContainText('Second quest');
      await expect(page.locator('#questTableBody tr').nth(1).locator('.quest-objective')).toContainText('First quest');
    }
  });

  test.skip('Quest order persists after reload', async ({ page }) => {
    // Create three quests
    const quests = ['Quest A', 'Quest B', 'Quest C'];
    for (const quest of quests) {
      await page.locator('#btnQuestAdd').click();
      await page.waitForTimeout(100);
      await page.locator('#questObjective').fill(quest);
      await page.locator('#questSave').click();
      await page.waitForTimeout(200);
    }

    // Drag Quest C to first position
    const firstRow = page.locator('#questTableBody tr').nth(0);
    const thirdRow = page.locator('#questTableBody tr').nth(2);

    const firstRowBox = await firstRow.boundingBox();
    const thirdRowBox = await thirdRow.boundingBox();

    if (firstRowBox && thirdRowBox) {
      await page.mouse.move(thirdRowBox.x + thirdRowBox.width / 2, thirdRowBox.y + thirdRowBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(firstRowBox.x + firstRowBox.width / 2, firstRowBox.y + firstRowBox.height / 2, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(500); // Wait for save to complete
    }

    // Wait a bit more to ensure localStorage write completes
    await page.waitForTimeout(300);

    // Reload page
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await page.locator('button[data-tab="quests"]').click();
    await page.waitForTimeout(300);

    // Verify order is preserved
    await expect(page.locator('#questTableBody tr').nth(0).locator('.quest-objective')).toContainText('Quest C');
    await expect(page.locator('#questTableBody tr').nth(1).locator('.quest-objective')).toContainText('Quest A');
    await expect(page.locator('#questTableBody tr').nth(2).locator('.quest-objective')).toContainText('Quest B');
  });
});

test.describe('Quests - Import/Export', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
  });

  test('Quests are included in export bundle', async ({ page }) => {
    // Navigate to quests tab and create a quest
    await page.locator('button[data-tab="quests"]').click();
    await page.waitForTimeout(300);

    await page.locator('#btnQuestAdd').click();
    await page.waitForTimeout(100);
    await page.locator('#questObjective').fill('Test export quest');
    await page.locator('#questLocation').fill('Export location');
    await page.locator('#questReward').fill('Export reward');
    await page.locator('#questSave').click();
    await page.waitForTimeout(300);

    // Get bundle
    const bundle = await page.evaluate(() => {
      if (typeof window.buildBundle === 'function') {
        return window.buildBundle();
      }
      return null;
    });

    // Verify bundle structure
    expect(bundle).toBeTruthy();
    expect(bundle.version).toBe(2);
    expect(bundle.state).toBeTruthy();
    expect(Array.isArray(bundle.state.quests)).toBe(true);
    expect(bundle.state.quests.length).toBe(1);

    // Verify quest data
    const quest = bundle.state.quests[0];
    expect(quest.objective).toBe('Test export quest');
    expect(quest.location).toBe('Export location');
    expect(quest.reward).toBe('Export reward');
    expect(quest.status).toBe('active');
    expect(quest.id).toBeTruthy();
    expect(typeof quest.order).toBe('number');
  });

  test('Quests are restored on import', async ({ page }) => {
    // Create a bundle with quests
    const testBundle = {
      version: 2,
      state: {
        name: "Test Hero",
        xp: 0,
        level: 1,
        str: 10, dex: 10, con: 10, int_: 10, wis: 10, cha: 10,
        quests: [
          {
            id: 'quest_test_1',
            objective: 'Imported quest 1',
            location: 'Import location 1',
            reward: 'Import reward 1',
            status: 'active',
            order: 0
          },
          {
            id: 'quest_test_2',
            objective: 'Imported quest 2',
            location: 'Import location 2',
            reward: 'Import reward 2',
            status: 'fulfilled',
            order: 1
          }
        ],
        inventory: [],
        aliases: [],
        familiars: [],
        languages: [],
        tools: [],
        goldPlatinum: 0,
        goldGold: 0,
        goldSilver: 0,
        goldCopper: 0
      },
      sessionNotes: ""
    };

    // Import the bundle
    await page.evaluate((bundle) => {
      if (typeof window.applyBundle === 'function') {
        window.applyBundle(JSON.stringify(bundle));
      }
    }, testBundle);

    await page.waitForTimeout(500);

    // Navigate to quests tab
    await page.locator('button[data-tab="quests"]').click();
    await page.waitForTimeout(300);

    // Verify quests are present
    const questRows = page.locator('#questTableBody tr');
    await expect(questRows).toHaveCount(2);

    await expect(page.locator('.quest-objective').nth(0)).toContainText('Imported quest 1');
    await expect(page.locator('.quest-objective').nth(1)).toContainText('Imported quest 2');

    // Verify first quest is active
    await expect(page.locator('#questTableBody tr').nth(0)).not.toHaveClass(/quest-fulfilled/);

    // Verify second quest is fulfilled
    await expect(page.locator('#questTableBody tr').nth(1)).toHaveClass(/quest-fulfilled/);
  });

  test('Quest data survives export-import round trip', async ({ page }) => {
    // Create multiple quests with different states
    await page.locator('button[data-tab="quests"]').click();
    await page.waitForTimeout(300);

    // Active quest
    await page.locator('#btnQuestAdd').click();
    await page.waitForTimeout(100);
    await page.locator('#questObjective').fill('Round trip quest 1');
    await page.locator('#questLocation').fill('Location 1');
    await page.locator('#questReward').fill('Reward 1');
    await page.locator('#questSave').click();
    await page.waitForTimeout(200);

    // Fulfilled quest
    await page.locator('#btnQuestAdd').click();
    await page.waitForTimeout(100);
    await page.locator('#questObjective').fill('Round trip quest 2');
    await page.locator('#questLocation').fill('Location 2');
    await page.locator('#questReward').fill('Reward 2');
    await page.locator('#questSave').click();
    await page.waitForTimeout(200);
    await page.locator('.quest-fulfill-btn').nth(1).click();
    await page.waitForTimeout(200);

    // Export bundle
    const bundle = await page.evaluate(() => {
      if (typeof window.buildBundle === 'function') {
        return window.buildBundle();
      }
      return null;
    });

    // Clear data
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });

    // Import bundle
    await page.evaluate((bundle) => {
      if (typeof window.applyBundle === 'function') {
        window.applyBundle(JSON.stringify(bundle));
      }
    }, bundle);

    await page.waitForTimeout(500);

    // Navigate to quests tab
    await page.locator('button[data-tab="quests"]').click();
    await page.waitForTimeout(300);

    // Verify quests are restored exactly
    await expect(page.locator('.quest-objective').nth(0)).toContainText('Round trip quest 1');
    await expect(page.locator('.quest-location').nth(0)).toContainText('Location 1');
    await expect(page.locator('.quest-reward').nth(0)).toContainText('Reward 1');
    await expect(page.locator('#questTableBody tr').nth(0)).not.toHaveClass(/quest-fulfilled/);

    await expect(page.locator('.quest-objective').nth(1)).toContainText('Round trip quest 2');
    await expect(page.locator('.quest-location').nth(1)).toContainText('Location 2');
    await expect(page.locator('.quest-reward').nth(1)).toContainText('Reward 2');
    await expect(page.locator('#questTableBody tr').nth(1)).toHaveClass(/quest-fulfilled/);
  });
});
