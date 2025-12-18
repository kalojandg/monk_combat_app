import { test, expect } from '@playwright/test';

/**
 * TEXT FIELDS TESTS
 * 
 * Тестват persistence на text fields (Personality, Bond, Flaw, Notes).
 */

test.describe('Text Fields - PC Characteristics', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    
    // Open PC Characteristics tab
    await page.locator('button[data-tab="pcchar"]').click();
  });

  test('Can enter and save Personality text', async ({ page }) => {
    const text = 'Enthusiastic and curious monk who loves riddles';
    
    await page.locator('#pcPersonality').fill(text);
    
    // Reload to check persistence
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="pcchar"]').click();
    
    // Text persists
    await expect(page.locator('#pcPersonality')).toHaveValue(text);
  });

  test('Can enter and save Bond text', async ({ page }) => {
    const text = 'Loyal to the monastery where I was trained';
    
    await page.locator('#pcBond').fill(text);
    
    // Reload
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="pcchar"]').click();
    
    // Text persists
    await expect(page.locator('#pcBond')).toHaveValue(text);
  });

  test('Can enter and save Flaw text', async ({ page }) => {
    const text = 'I have a weakness for pretty faces';
    
    await page.locator('#pcFlaw').fill(text);
    
    // Reload
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="pcchar"]').click();
    
    // Text persists
    await expect(page.locator('#pcFlaw')).toHaveValue(text);
  });

  test('Can enter multiline text in Personality', async ({ page }) => {
    const text = 'Line 1: Calm and collected\nLine 2: Quick to help others\nLine 3: Enjoys meditation';
    
    await page.locator('#pcPersonality').fill(text);
    
    // Reload
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="pcchar"]').click();
    
    // Multiline text persists
    const saved = await page.locator('#pcPersonality').inputValue();
    expect(saved).toContain('Line 1');
    expect(saved).toContain('Line 2');
    expect(saved).toContain('Line 3');
  });

  test('Can clear text fields', async ({ page }) => {
    // Fill all three
    await page.locator('#pcPersonality').fill('Personality text');
    await page.locator('#pcBond').fill('Bond text');
    await page.locator('#pcFlaw').fill('Flaw text');
    
    // Clear them
    await page.locator('#pcPersonality').fill('');
    await page.locator('#pcBond').fill('');
    await page.locator('#pcFlaw').fill('');
    
    // Reload
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="pcchar"]').click();
    
    // Should be empty
    await expect(page.locator('#pcPersonality')).toHaveValue('');
    await expect(page.locator('#pcBond')).toHaveValue('');
    await expect(page.locator('#pcFlaw')).toHaveValue('');
  });

  test('Can enter special characters in text fields', async ({ page }) => {
    const text = 'Special chars: "quotes", №, %, &, @, #, emojis: 😊🎲';
    
    await page.locator('#pcPersonality').fill(text);
    
    // Reload
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="pcchar"]').click();
    
    // Special chars persist
    await expect(page.locator('#pcPersonality')).toHaveValue(text);
  });

});

test.describe('Text Fields - Notes', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    
    // Open Stats tab (where notes field is)
    await page.locator('button[data-tab="stats"]').click();
  });

  test('Can enter and save Notes text', async ({ page }) => {
    const text = 'Quest: Find the lost artifact\nNPCs: Mayor Goodwin, Blacksmith Thorn';
    
    await page.locator('#notes').fill(text);
    
    // Reload
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="stats"]').click();
    
    // Text persists
    await expect(page.locator('#notes')).toHaveValue(text);
  });

  test('Can enter very long text in Notes', async ({ page }) => {
    const longText = 'A'.repeat(500);
    
    await page.locator('#notes').fill(longText);
    
    // Reload
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    await page.locator('button[data-tab="stats"]').click();
    
    // Long text persists
    const saved = await page.locator('#notes').inputValue();
    expect(saved.length).toBe(500);
  });

  test('Notes persist independently from PC characteristics', async ({ page }) => {
    // Fill notes
    await page.locator('#notes').fill('Campaign notes');
    
    // Go to PC tab and fill personality
    await page.locator('button[data-tab="pcchar"]').click();
    await page.locator('#pcPersonality').fill('Character personality');
    
    // Reload
    await page.reload();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8', { timeout: 10000 });
    
    // Check both fields persist independently
    await page.locator('button[data-tab="stats"]').click();
    await expect(page.locator('#notes')).toHaveValue('Campaign notes');
    
    await page.locator('button[data-tab="pcchar"]').click();
    await expect(page.locator('#pcPersonality')).toHaveValue('Character personality');
  });

});
