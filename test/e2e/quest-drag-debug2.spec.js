import { test, expect } from '@playwright/test';

test('Debug sortable instance', async ({ page }) => {
  // Listen to console messages
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
  await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });

  // Navigate to quests tab
  await page.locator('button[data-tab="quests"]').click();
  await page.waitForTimeout(300);

  // Check if Sortable is loaded
  const sortableLoaded = await page.evaluate(() => {
    return typeof Sortable !== 'undefined';
  });
  console.log('Sortable loaded:', sortableLoaded);

  // Create three quests
  const quests = ['Quest A', 'Quest B', 'Quest C'];
  for (const quest of quests) {
    await page.locator('#btnQuestAdd').click();
    await page.waitForTimeout(100);
    await page.locator('#questObjective').fill(quest);
    await page.locator('#questSave').click();
    await page.waitForTimeout(200);
  }

  // Check if sortable instance exists
  const instanceInfo = await page.evaluate(() => {
    const tbody = document.getElementById('questTableBody');
    if (!tbody) return { error: 'tbody not found' };

    // Check if Sortable instance is attached
    return {
      tbodyExists: !!tbody,
      hasDataReactid: tbody.hasAttribute('data-reactid'),
      hasSortableAttr: tbody.hasAttribute('data-sortable'),
      instanceExists: !!window.questSortableInstance,
    };
  });
  console.log('Instance info:', instanceInfo);

  // Try to manually trigger a save
  await page.evaluate(() => {
    console.log('Manually updating quest order...');
    if (window.st && window.st.quests && window.st.quests.length >= 3) {
      const temp = window.st.quests[2];
      window.st.quests[2] = window.st.quests[0];
      window.st.quests[0] = temp;
      window.st.quests[0].order = 0;
      window.st.quests[2].order = 2;
      console.log('Manually calling save...');
      window.save();
      console.log('Save called');
    }
  });

  await page.waitForTimeout(200);

  // Check if manual save worked
  const afterManualSave = await page.evaluate(() => {
    const raw = localStorage.getItem("monkSheet_v3");
    const state = JSON.parse(raw);
    return state.quests.map(q => ({ objective: q.objective, order: q.order }));
  });
  console.log('After manual save:', afterManualSave);
});
