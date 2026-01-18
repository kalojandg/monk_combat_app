import { test, expect } from '@playwright/test';

test.skip('Debug drag and localStorage', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
  await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });

  // Navigate to quests tab
  await page.locator('button[data-tab="quests"]').click();
  await page.waitForTimeout(300);

  // Create three quests
  const quests = ['Quest A', 'Quest B', 'Quest C'];
  for (const quest of quests) {
    await page.locator('#btnQuestAdd').click();
    await page.waitForTimeout(100);
    await page.locator('#questObjective').fill(quest);
    await page.locator('#questSave').click();
    await page.waitForTimeout(200);
  }

  // Check initial state in localStorage
  const initialState = await page.evaluate(() => {
    const raw = localStorage.getItem("monkSheet_v3");
    const state = JSON.parse(raw);
    return state.quests.map(q => ({ objective: q.objective, order: q.order }));
  });
  console.log('Initial quests:', initialState);

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
    await page.waitForTimeout(500);
  }

  // Check state after drag
  const afterDragState = await page.evaluate(() => {
    const raw = localStorage.getItem("monkSheet_v3");
    const state = JSON.parse(raw);
    return state.quests.map(q => ({ objective: q.objective, order: q.order }));
  });
  console.log('After drag quests:', afterDragState);

  // Check what's in window.st
  const windowStQuests = await page.evaluate(() => {
    return window.st.quests.map(q => ({ objective: q.objective, order: q.order }));
  });
  console.log('window.st.quests:', windowStQuests);

  // Verify the drag updated the state correctly
  expect(afterDragState[0].objective).toBe('Quest C');
  expect(afterDragState[0].order).toBe(0);
  expect(afterDragState[1].objective).toBe('Quest A');
  expect(afterDragState[1].order).toBe(1);
  expect(afterDragState[2].objective).toBe('Quest B');
  expect(afterDragState[2].order).toBe(2);
});
