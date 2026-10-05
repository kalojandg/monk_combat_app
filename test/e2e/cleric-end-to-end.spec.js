import { test, expect } from '@playwright/test';

/**
 * CLERIC END TO END
 *
 * Клерикът като втори играем герой: създаване през превключвателя (#charSwitcher),
 * статове/броня → AC, скорост, unarmed атака, WIS DC; без монашески полета, без
 * класови баджове и без level-up модал (линейно ниво); почивки без ки; монк ⇄ клерик
 * без смесване на данни; експорт/импорт с маркера за герой (bundle v3).
 */

async function ready(page) {
  await page.waitForFunction(() => window.__tabsLoaded === true, { timeout: 10000 });
}

async function switchTo(page, id) {
  await page.locator(`#charSwitcher [data-char="${id}"]`).click();
  await expect(page.locator(`#charSwitcher [data-char="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
}

async function openBasicInfo(page) {
  await page.locator('.tab-btn[data-tab="stats"]').click();
  await page.locator('[data-subtab="basicinfo"]').click();
  await expect(page.locator('#acMagicInput')).toBeVisible();
}

async function openAbilityScores(page) {
  await page.locator('.tab-btn[data-tab="stats"]').click();
  await page.locator('[data-subtab="stats"]').click();
  await expect(page.locator('#strInput')).toBeVisible();
}

async function fillStat(page, id, value) {
  await page.locator(`#${id}`).fill(String(value));
  await page.locator(`#${id}`).dispatchEvent('input');
}

// Combat strip pill/controls, които принадлежат на ки
const KI_COMBAT = ['#kiCurrentSpan', '#kiSaveDcSpan', '#btnSpendKi'];
// Stats → Basic Info монашески полета
const MONK_FIELDS = ['#monkLevelSpan', '#maDieSpan', '#kiMaxSpan', '#kiSaveDcSpan2', '#kiSaveDcMagicInput', '#umBonusSpan'];

test.describe('Cleric end to end', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    // Посят монк — живият запис, който никога не бива да се смесва с клерика
    await page.evaluate(() => localStorage.setItem('monkSheet_v3', JSON.stringify({
      name: 'Monky', level: 3, monkLevel: 3, clericLevel: 0, xp: 900,
      dex: 16, wis: 14, hpCurrent: 12, kiCurrent: 2
    })));
    await page.reload();
    await ready(page);
    await expect(page.locator('#hpCurrentSpan')).toHaveText('12', { timeout: 10000 });
  });

  test('(a) creating a cleric and filling stats/armor gives correct AC, speed, unarmed attack and WIS DC', async ({ page }) => {
    await switchTo(page, 'cleric');

    const created = await page.evaluate(() => ({
      pointer: localStorage.getItem('activeCharacter'),
      cls: window.st.class,
      armorAc: window.st.armorAc,
      armorMaxDex: window.st.armorMaxDex,
      saved: JSON.parse(localStorage.getItem('cleric_v1') || 'null')
    }));
    expect(created.pointer).toBe('cleric');
    expect(created.cls).toBe('cleric');
    expect(created.armorAc).toBe(0);
    expect(created.armorMaxDex).toBeNull();
    expect(created.saved).not.toBeNull();
    expect(created.saved.class).toBe('cleric');

    await openAbilityScores(page);
    await fillStat(page, 'strInput', 14);  // +2
    await fillStat(page, 'dexInput', 16);  // +3
    await fillStat(page, 'wisInput', 18);  // +4

    await openBasicInfo(page);
    await expect(page.locator('#armorRow')).toBeVisible();
    await fillStat(page, 'armorAcInput', 16);
    await fillStat(page, 'armorMaxDexInput', 2);

    // AC = 16 + min(3, 2) = 18
    await expect(page.locator('#acSpan')).toHaveText('18');
    // Unarmed = 1 + STR = +3
    await expect(page.locator('#meleeAtkSpan')).toHaveText('+3');
    // WIS DC = 8 + 2 + 4 = 14, WIS atk = +6
    await expect(page.locator('#spellDcWisSpan')).toHaveText('14');
    await expect(page.locator('#spellAtkWisSpan')).toHaveText('+6');
    // Скорост = расова (30), без Unarmored Movement
    expect(await page.evaluate(() => window.derived().totalSpeed)).toBe(30);

    // Нищо „undefined"/NaN на екрана
    const strip = await page.locator('#tab-combat').innerText();
    expect(strip).not.toMatch(/undefined|NaN/);
  });

  test('(b) monk fields are hidden for the cleric and visible again after switching back to monk', async ({ page }) => {
    await openBasicInfo(page);
    for (const sel of [...MONK_FIELDS, ...KI_COMBAT]) await expect(page.locator(sel)).toBeVisible();

    await switchTo(page, 'cleric');
    for (const sel of [...MONK_FIELDS, ...KI_COMBAT]) await expect(page.locator(sel)).toBeHidden();
    // Неутралните полета си остават
    for (const sel of ['#levelSpan', '#clericLevelSpan', '#hpCurrentSpan', '#acSpan', '#spellDcWisSpan']) {
      await expect(page.locator(sel)).toBeVisible();
    }

    await switchTo(page, 'monk');
    for (const sel of [...MONK_FIELDS, ...KI_COMBAT]) await expect(page.locator(sel)).toBeVisible();
  });

  test('(c) no class badges and no level-up modal for the cleric; level grows linearly', async ({ page }) => {
    await expect(page.locator('#class-badges')).toBeVisible();

    await switchTo(page, 'cleric');
    await expect(page.locator('#class-badges')).toBeHidden();

    await page.evaluate(() => { window.st.xp = 900; window.save(); });  // праг за ниво 3
    await page.locator('#btnLongRest').click();
    await page.waitForTimeout(600);

    await expect(page.locator('#levelUpModal')).toHaveCount(0);
    const r = await page.evaluate(() => ({
      level: window.st.level, clericLevel: window.st.clericLevel, monkLevel: window.st.monkLevel,
      hdAvail: window.st.hdAvail, hdMax: window.derived().hdMax
    }));
    expect(r.level).toBe(3);
    expect(r.clericLevel).toBe(3);
    expect(r.monkLevel).toBe(0);
    expect(r.hdMax).toBe(3);
    expect(r.hdAvail).toBe(3);

    // Нивото се пази след reload (миграцията в load() не го връща към монк)
    await page.reload();
    await ready(page);
    const after = await page.evaluate(() => ({ level: window.st.level, clericLevel: window.st.clericLevel, monkLevel: window.st.monkLevel }));
    expect(after).toEqual({ level: 3, clericLevel: 3, monkLevel: 0 });
    await expect(page.locator('#class-badges')).toBeHidden();

    // Монкът пак има баджове
    await switchTo(page, 'monk');
    await expect(page.locator('#class-badges')).toBeVisible();
  });

  test('(d) short and long rest run without errors for the cleric and do not touch ki', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => d.dismiss());

    await switchTo(page, 'cleric');
    await page.evaluate(() => {
      window.st.hpCurrent = 3; window.st.hdAvail = 0; window.st.dsFail = 1; window.save();
    });
    const kiBefore = await page.evaluate(() => window.st.kiCurrent);

    await page.locator('#btnShortRest').click();
    await page.waitForTimeout(300);
    let r = await page.evaluate(() => ({ ki: window.st.kiCurrent, hp: window.st.hpCurrent }));
    expect(r.ki).toBe(kiBefore);
    expect(r.hp).toBe(3);

    await page.locator('#btnLongRest').click();
    await page.waitForTimeout(500);
    r = await page.evaluate(() => ({
      ki: window.st.kiCurrent, hp: window.st.hpCurrent, maxHP: window.derived().maxHP,
      hdAvail: window.st.hdAvail, dsFail: window.st.dsFail, status: window.st.status,
      saved: JSON.parse(localStorage.getItem('cleric_v1'))
    }));
    expect(r.ki).toBe(kiBefore);
    expect(r.hp).toBe(r.maxHP);
    expect(r.hdAvail).toBe(1);
    expect(r.dsFail).toBe(0);
    expect(r.status).toBe('alive');
    expect(r.saved.kiCurrent).toBe(kiBefore);

    // XP добавяне също не пипа ки
    await openBasicInfo(page);
    await page.locator('#xpAddInput').fill('50');
    await page.locator('#btnAddXp').click();
    expect(await page.evaluate(() => window.st.kiCurrent)).toBe(kiBefore);

    await expect(page.locator('#tab-combat')).not.toContainText('NaN');
    expect(errors).toEqual([]);
  });

  test('(e) switching monk -> cleric -> monk keeps both heroes\' data', async ({ page }) => {
    await switchTo(page, 'cleric');
    // Записът на монка в момента на напускане — нищо по клерика не бива да го пипа
    const MONK = { name: 'Monky', level: 3, monkLevel: 3, clericLevel: 0, dex: 16, wis: 14, hpCurrent: 12, kiCurrent: 2 };
    expect(JSON.parse(await page.evaluate(() => localStorage.getItem('monkSheet_v3')))).toMatchObject(MONK);

    await openAbilityScores(page);
    await fillStat(page, 'wisInput', 16);
    await openBasicInfo(page);
    await page.locator('#charName').fill('Grave Priest');
    await fillStat(page, 'armorAcInput', 14);
    await page.evaluate(() => { window.st.hpCurrent = 4; window.save(); });

    await switchTo(page, 'monk');
    let r = await page.evaluate(() => ({
      name: window.st.name, level: window.st.level, monkLevel: window.st.monkLevel,
      ki: window.st.kiCurrent, hp: window.st.hpCurrent, cls: window.st.class, armorAc: window.st.armorAc
    }));
    expect(r).toMatchObject({ name: 'Monky', level: 3, monkLevel: 3, ki: 2, hp: 12 });
    expect(r.cls === undefined || r.cls === 'monk').toBe(true);
    expect(r.armorAc).toBeUndefined();
    await expect(page.locator('#charName')).toHaveValue('Monky');
    await expect(page.locator('#hpCurrentSpan')).toHaveText('12');
    // Монашеският AC (10 + DEX + WIS) е обратно
    await expect(page.locator('#acSpan')).toHaveText('15');
    // Записът на монка носи същите стойности и нищо от клерика
    const monkSaved = JSON.parse(await page.evaluate(() => localStorage.getItem('monkSheet_v3')));
    expect(monkSaved).toMatchObject(MONK);
    expect(monkSaved.class).toBeUndefined();
    expect(monkSaved.armorAc).toBeUndefined();

    await switchTo(page, 'cleric');
    r = await page.evaluate(() => ({ name: window.st.name, wis: window.st.wis, armorAc: window.st.armorAc, hp: window.st.hpCurrent }));
    expect(r).toEqual({ name: 'Grave Priest', wis: 16, armorAc: 14, hp: 4 });
    await expect(page.locator('#charName')).toHaveValue('Grave Priest');
    await expect(page.locator('#armorAcInput')).toHaveValue('14');
    await expect(page.locator('#hpCurrentSpan')).toHaveText('4');
  });

  test('(f) exporting the cleric and importing it back restores the same values', async ({ page }) => {
    await switchTo(page, 'cleric');
    await page.evaluate(() => {
      Object.assign(window.st, { name: 'Exported Cleric', wis: 17, dex: 14, armorAc: 18, armorMaxDex: 0, xp: 300 });
      window.save();
    });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#btnExport').click()
    ]);
    const bundle = JSON.parse(await (await download.createReadStream()).toArray().then(c => Buffer.concat(c).toString('utf8')));
    expect(bundle.version).toBe(3);
    expect(bundle.character).toBe('cleric');
    expect(bundle.state.class).toBe('cleric');

    const expected = await page.evaluate(() => ({ ac: window.derived().ac, dc: window.derived().spellSaveDC_WIS }));
    expect(expected.ac).toBe(18);  // 18 + min(+2, 0)

    // Развалям героя, после импортирам файла обратно
    await page.evaluate(() => { Object.assign(window.st, { name: 'Broken', wis: 8, armorAc: 0 }); window.save(); });
    await page.locator('#importFile').setInputFiles({
      name: 'cleric.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bundle))
    });
    await expect(page.locator('#acSpan')).toHaveText('18');

    const r = await page.evaluate(() => ({
      name: window.st.name, wis: window.st.wis, armorAc: window.st.armorAc, armorMaxDex: window.st.armorMaxDex,
      cls: window.st.class, dc: window.derived().spellSaveDC_WIS,
      pointer: localStorage.getItem('activeCharacter'),
      saved: JSON.parse(localStorage.getItem('cleric_v1'))
    }));
    expect(r).toMatchObject({ name: 'Exported Cleric', wis: 17, armorAc: 18, armorMaxDex: 0, cls: 'cleric', dc: expected.dc, pointer: 'cleric' });
    expect(r.saved.name).toBe('Exported Cleric');
    await expect(page.locator('#class-badges')).toBeHidden();

    // Файлът на клерика се отказва при активен монк, монкът остава непокътнат
    await switchTo(page, 'monk');
    const monkRaw = await page.evaluate(() => localStorage.getItem('monkSheet_v3'));
    let alertText = '';
    page.once('dialog', d => { alertText = d.message(); d.accept(); });
    await page.locator('#importFile').setInputFiles({
      name: 'cleric.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bundle))
    });
    await page.waitForTimeout(400);
    expect(alertText).toMatch(/cleric/i);
    expect(await page.evaluate(() => window.st.name)).toBe('Monky');
    expect(await page.evaluate(() => localStorage.getItem('monkSheet_v3'))).toBe(monkRaw);
  });
});
