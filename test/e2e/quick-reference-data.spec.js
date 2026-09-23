import { test, expect } from '@playwright/test';

/**
 * QUICK REFERENCE DATA TESTS
 *
 * Тестват дали quick-reference.json е валиден и следва контракта, описан
 * в таск 1020 (sections/entries форма, четирите секции по ред, дословност
 * на ключови D&D 5e SRD фрази). Не зависи от UI — не кликва табове.
 */

async function loadQuickReference(page) {
  await page.goto('/');
  return page.evaluate(() => fetch('quick-reference.json').then(r => r.json()));
}

test.describe('Data Loading - Quick Reference', () => {

  test('quick-reference.json is valid JSON with 4 sections in order', async ({ page }) => {
    const data = await loadQuickReference(page);

    expect(Array.isArray(data.sections)).toBe(true);
    expect(data.sections.length).toBe(4);

    const expected = [
      { id: 'jumping', title: 'Jumping' },
      { id: 'conditions', title: 'Conditions' },
      { id: 'actions', title: 'Actions in Combat' },
      { id: 'cover', title: 'Cover' },
    ];

    data.sections.forEach((section, i) => {
      expect(section.id).toBe(expected[i].id);
      expect(section.title).toBe(expected[i].title);
      expect(Array.isArray(section.entries)).toBe(true);
      expect(section.entries.length).toBeGreaterThan(0);
    });
  });

  test('section entry counts match the contract (2/15/11/3)', async ({ page }) => {
    const data = await loadQuickReference(page);
    const byId = Object.fromEntries(data.sections.map(s => [s.id, s.entries.length]));

    expect(byId.jumping).toBe(2);
    expect(byId.conditions).toBe(15);
    expect(byId.actions).toBe(11);
    expect(byId.cover).toBe(3);
  });

  test('every entry has a non-empty name and at least one of desc/bullets/table', async ({ page }) => {
    const data = await loadQuickReference(page);

    for (const section of data.sections) {
      for (const entry of section.entries) {
        expect(typeof entry.name).toBe('string');
        expect(entry.name.trim().length).toBeGreaterThan(0);

        const hasDesc = Array.isArray(entry.desc) && entry.desc.length > 0;
        const hasBullets = Array.isArray(entry.bullets) && entry.bullets.length > 0;
        const hasTable = !!entry.table;
        expect(hasDesc || hasBullets || hasTable).toBe(true);
      }
    }
  });

  test('no desc or bullets element is an empty string', async ({ page }) => {
    const data = await loadQuickReference(page);

    for (const section of data.sections) {
      for (const entry of section.entries) {
        (entry.desc || []).forEach(paragraph => {
          expect(typeof paragraph).toBe('string');
          expect(paragraph.trim().length).toBeGreaterThan(0);
        });
        (entry.bullets || []).forEach(bullet => {
          expect(typeof bullet).toBe('string');
          expect(bullet.trim().length).toBeGreaterThan(0);
        });
      }
    }
  });

  test('Exhaustion has a 6-row table with Level/Effect headers', async ({ page }) => {
    const data = await loadQuickReference(page);
    const conditions = data.sections.find(s => s.id === 'conditions');
    const exhaustion = conditions.entries.find(e => e.name === 'Exhaustion');

    expect(exhaustion).toBeTruthy();
    expect(exhaustion.table).toBeTruthy();
    expect(exhaustion.table.headers).toEqual(['Level', 'Effect']);
    expect(exhaustion.table.rows.length).toBe(6);
    exhaustion.table.rows.forEach((row, i) => {
      expect(row[0]).toBe(String(i + 1));
    });
  });

  test('key SRD phrases are carried verbatim', async ({ page }) => {
    const data = await loadQuickReference(page);
    const conditions = data.sections.find(s => s.id === 'conditions');
    const cover = data.sections.find(s => s.id === 'cover');

    const blinded = conditions.entries.find(e => e.name === 'Blinded');
    expect(blinded.bullets.join(' ')).toContain('automatically fails any ability check that requires sight');

    const halfCover = cover.entries.find(e => e.name === 'Half Cover');
    expect(halfCover.desc.join(' ')).toContain('+2 bonus to AC');

    const threeQuarters = cover.entries.find(e => e.name === 'Three-Quarters Cover');
    expect(threeQuarters.desc.join(' ')).toContain('+5 bonus to AC');
  });

});
