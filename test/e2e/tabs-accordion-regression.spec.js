import { test, expect } from '@playwright/test';

/**
 * REGRESSION: spell accordions on Resurrection used to stop working on every
 * 2nd visit — `{ once: true }` click listeners accumulated on the persistent
 * root element, so N renders → N toggles per click (no-op when N is even).
 * Also: tapping the already-active Stats tab used to wipe its sub-tabs
 * (a second "toggle" tab controller called hideAllSubTabs()).
 */

async function boot(page) {
  // count click listeners registered on the spell roots
  await page.addInitScript(() => {
    window.__listenerLog = {};
    const orig = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, fn, opts) {
      if (type === 'click' && this instanceof Element && this.id && this.id.endsWith('-root')) {
        window.__listenerLog[this.id] = (window.__listenerLog[this.id] || 0) + 1;
      }
      return orig.call(this, type, fn, opts);
    };
  });
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
}

async function visitResurrection(page) {
  await page.locator('button[data-tab="resurrection"]').click();
  await expect(page.locator('#tab-resurrection')).toBeVisible();
  await page.waitForTimeout(250); // showTab's 50ms setTimeout re-render
}

async function clickFirstCantrip(page) {
  const item = page.locator('#wis-cantrips-root .mark-spell-item').first();
  await item.click();
  await page.waitForTimeout(150);
  return page.locator('#wis-cantrips-root .mark-spell-item').first().evaluate(n => n.classList.contains('expanded'));
}

test.describe('Regression: Resurrection spell accordion + active-tab re-tap', () => {
  test('1st visit: cantrip opens', async ({ page }) => {
    await boot(page);
    await visitResurrection(page);
    const open = await clickFirstCantrip(page);
    console.log('VISIT 1 → expanded:', open, '| listeners:', JSON.stringify(await page.evaluate(() => window.__listenerLog)));
    expect(open).toBe(true);
  });

  test('2nd visit (tab away and back): cantrip still opens', async ({ page }) => {
    await boot(page);
    await visitResurrection(page);
    await page.locator('button[data-tab="sessionNotes"]').click();
    await visitResurrection(page);
    const open = await clickFirstCantrip(page);
    console.log('VISIT 2 → expanded:', open, '| listeners:', JSON.stringify(await page.evaluate(() => window.__listenerLog)));
    expect(open).toBe(true);
  });

  test('3rd visit: cantrip opens again', async ({ page }) => {
    await boot(page);
    await visitResurrection(page);
    await page.locator('button[data-tab="sessionNotes"]').click();
    await visitResurrection(page);
    await page.locator('button[data-tab="sessionNotes"]').click();
    await visitResurrection(page);
    const open = await clickFirstCantrip(page);
    console.log('VISIT 3 → expanded:', open, '| listeners:', JSON.stringify(await page.evaluate(() => window.__listenerLog)));
    expect(open).toBe(true);
  });

  test('Stats tapped while already active keeps its sub-tabs', async ({ page }) => {
    await boot(page);
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#subtab-basicinfo')).toBeVisible();
    await page.locator('button[data-tab="stats"]').click();
    await page.waitForTimeout(300);
    const basicVisible = await page.locator('#subtab-basicinfo').isVisible();
    const anySub = await page.evaluate(() => !!document.querySelector('.sub-tab-btn.active'));
    console.log('STATS 2nd click → basicinfo visible:', basicVisible, '| active sub-tab:', anySub);
    expect(basicVisible).toBe(true);
  });
});
