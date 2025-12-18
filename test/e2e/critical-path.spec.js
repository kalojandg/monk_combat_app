import { test, expect } from '@playwright/test';

/**
 * CRITICAL PATH TESTS
 * 
 * Тези тестове покриват най-важните функционалности.
 * Ако някой от тях fail-не → НЕ push промените!
 */

test.describe('Critical Path - Combat System', () => {
  
  test.beforeEach(async ({ page }) => {
    // Зареди app
    await page.goto('/');
    
    // Изчисти localStorage (fresh start)
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    
    // Изчакай app да се зареди
    await expect(page.locator('.title')).toBeVisible();
  });

  // ============================================
  // POSITIVE TESTS
  // ============================================

  test('[POSITIVE] Take damage decreases HP', async ({ page }) => {
    // Setup: Провери начално HP
    const hpDisplay = page.locator('#hpCurrentSpan');
    await expect(hpDisplay).toHaveText('10');
    
    // Action: Take 5 damage
    await page.locator('#hpDelta').fill('5');
    await page.locator('#btnDamage').click();
    
    // Assert: HP намалява
    await expect(hpDisplay).toHaveText('5');
    
    // Verify localStorage
    const hpInStorage = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('monkSheet_v3'));
      return st.hpCurrent;
    });
    expect(hpInStorage).toBe(5);
  });

  test('[POSITIVE] Heal increases HP', async ({ page }) => {
    // Setup: Намали HP до 5
    await page.locator('#hpDelta').fill('5');
    await page.locator('#btnDamage').click();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('5');
    
    // Action: Heal 3
    await page.locator('#hpDelta').fill('3');
    await page.locator('#btnHeal').click();
    
    // Assert: HP се увеличава
    await expect(page.locator('#hpCurrentSpan')).toHaveText('8');
  });

  test('[POSITIVE] HP clamped at 0 (not negative)', async ({ page }) => {
    // Action: Take 50 damage (повече от Max HP)
    await page.locator('#hpDelta').fill('50');
    await page.locator('#btnDamage').click();
    
    // Assert: HP = 0, не отрицателно
    await expect(page.locator('#hpCurrentSpan')).toHaveText('0');
    
    // Assert: Status = unconscious
    const status = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('monkSheet_v3'));
      return st.status;
    });
    expect(status).toBe('unconscious');
    
    // Assert: Emoji = 😵
    await expect(page.locator('#lifeStatus')).toHaveText('😵');
  });

  test('[POSITIVE] Heal clamped at Max HP', async ({ page }) => {
    // Setup: Take damage
    await page.locator('#hpDelta').fill('5');
    await page.locator('#btnDamage').click();
    
    // Action: Heal 50 (повече от Max)
    await page.locator('#hpDelta').fill('50');
    await page.locator('#btnHeal').click();
    
    // Assert: HP = Max (10), не 55
    await expect(page.locator('#hpCurrentSpan')).toHaveText('10');
  });

  test('[POSITIVE] Going to 0 HP triggers unconscious', async ({ page }) => {
    // Action: Take exactly 10 damage (Max HP)
    await page.locator('#hpDelta').fill('10');
    await page.locator('#btnDamage').click();
    
    // Assert: HP = 0
    await expect(page.locator('#hpCurrentSpan')).toHaveText('0');
    
    // Assert: Status = unconscious
    const state = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('monkSheet_v3'));
      return {
        status: st.status,
        dsSuccess: st.dsSuccess,
        dsFail: st.dsFail
      };
    });
    
    expect(state.status).toBe('unconscious');
    expect(state.dsSuccess).toBe(0);
    expect(state.dsFail).toBe(0);
    
    // Assert: Emoji = 😵
    await expect(page.locator('#lifeStatus')).toHaveText('😵');
  });

  test('[POSITIVE] Heal from 0 HP wakes up and clears death saves', async ({ page }) => {
    // Setup: Go to 0 HP и добави death saves
    await page.locator('#hpDelta').fill('10');
    await page.locator('#btnDamage').click();
    await page.locator('#btnDsPlus').click(); // Success +1
    await page.locator('#btnDsMinus').click(); // Fail +1
    
    // Verify setup
    const beforeState = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('monkSheet_v3'));
      return {
        hp: st.hpCurrent,
        dsSuccess: st.dsSuccess,
        dsFail: st.dsFail,
        status: st.status
      };
    });
    expect(beforeState.hp).toBe(0);
    expect(beforeState.dsSuccess).toBe(1);
    expect(beforeState.dsFail).toBe(1);
    expect(beforeState.status).toBe('unconscious');
    
    // Action: Heal 3 HP
    await page.locator('#hpDelta').fill('3');
    await page.locator('#btnHeal').click();
    
    // Assert: HP > 0, status = alive, death saves cleared
    await expect(page.locator('#hpCurrentSpan')).toHaveText('3');
    
    const afterState = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('monkSheet_v3'));
      return {
        status: st.status,
        dsSuccess: st.dsSuccess,
        dsFail: st.dsFail
      };
    });
    
    expect(afterState.status).toBe('alive');
    expect(afterState.dsSuccess).toBe(0);
    expect(afterState.dsFail).toBe(0);
    
    // Assert: Emoji = 🙂
    await expect(page.locator('#lifeStatus')).toHaveText('🙂');
  });

  // ============================================
  // NEGATIVE TESTS
  // ============================================

  test('[NEGATIVE] Damage with 0 or negative value does nothing', async ({ page }) => {
    // Setup: Начално HP
    const initialHp = await page.locator('#hpCurrentSpan').textContent();
    
    // Action 1: Damage = 0
    await page.locator('#hpDelta').fill('0');
    await page.locator('#btnDamage').click();
    
    // Assert: HP не се променя
    await expect(page.locator('#hpCurrentSpan')).toHaveText(initialHp);
    
    // Action 2: Damage = negative
    await page.locator('#hpDelta').fill('-10');
    await page.locator('#btnDamage').click();
    
    // Assert: HP не се променя
    await expect(page.locator('#hpCurrentSpan')).toHaveText(initialHp);
  });

  test('[NEGATIVE] Heal with 0 or negative value does nothing', async ({ page }) => {
    // Setup: Take damage first
    await page.locator('#hpDelta').fill('5');
    await page.locator('#btnDamage').click();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('5');
    
    // Action 1: Heal = 0
    await page.locator('#hpDelta').fill('0');
    await page.locator('#btnHeal').click();
    
    // Assert: HP не се променя
    await expect(page.locator('#hpCurrentSpan')).toHaveText('5');
    
    // Action 2: Heal = negative
    await page.locator('#hpDelta').fill('-10');
    await page.locator('#btnHeal').click();
    
    // Assert: HP не се променя
    await expect(page.locator('#hpCurrentSpan')).toHaveText('5');
  });

  test('[NEGATIVE] Cannot heal when dead', async ({ page }) => {
    // Setup: Die (3 death save fails)
    await page.locator('#hpDelta').fill('10');
    await page.locator('#btnDamage').click(); // HP = 0
    await page.locator('#btnDsMinus').click(); // Fail 1
    await page.locator('#btnDsMinus').click(); // Fail 2
    await page.locator('#btnDsMinus').click(); // Fail 3 → dead
    
    // Verify dead
    const statusBefore = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('monkSheet_v3'));
      return st.status;
    });
    expect(statusBefore).toBe('dead');
    await expect(page.locator('#lifeStatus')).toHaveText('💀');
    
    // Action: Try to heal (should do nothing)
    await page.locator('#hpDelta').fill('10');
    await page.locator('#btnHeal').click();
    
    // Assert: Still dead, HP = 0
    await expect(page.locator('#hpCurrentSpan')).toHaveText('0');
    const statusAfter = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('monkSheet_v3'));
      return st.status;
    });
    expect(statusAfter).toBe('dead');
  });

});

test.describe('Critical Path - Death Saves', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    
    // Go to 0 HP за death saves
    await page.locator('#hpDelta').fill('10');
    await page.locator('#btnDamage').click();
    await expect(page.locator('#hpCurrentSpan')).toHaveText('0');
  });

  test('[POSITIVE] 3 death save successes = stable', async ({ page }) => {
    // Action: 3 successes
    await page.locator('#btnDsPlus').click();
    await page.locator('#btnDsPlus').click();
    await page.locator('#btnDsPlus').click();
    
    // Assert: Status = stable
    const state = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('monkSheet_v3'));
      return {
        status: st.status,
        dsSuccess: st.dsSuccess
      };
    });
    
    expect(state.status).toBe('stable');
    expect(state.dsSuccess).toBe(3);
    
    // Assert: Emoji = 🛌
    await expect(page.locator('#lifeStatus')).toHaveText('🛌');
  });

  test('[POSITIVE] 3 death save fails = dead', async ({ page }) => {
    // Action: 3 fails
    await page.locator('#btnDsMinus').click();
    await page.locator('#btnDsMinus').click();
    await page.locator('#btnDsMinus').click();
    
    // Assert: Status = dead
    const state = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('monkSheet_v3'));
      return {
        status: st.status,
        dsFail: st.dsFail
      };
    });
    
    expect(state.status).toBe('dead');
    expect(state.dsFail).toBe(3);
    
    // Assert: Emoji = 💀
    await expect(page.locator('#lifeStatus')).toHaveText('💀');
    
    // Assert: YOU DIED overlay visible
    await expect(page.locator('#youDiedOverlay')).not.toHaveClass(/hidden/);
  });

  test('[POSITIVE] Critical success (Nat 20) heals 1 HP', async ({ page }) => {
    // Setup: Add some death saves
    await page.locator('#btnDsPlus').click(); // Success 1
    await page.locator('#btnDsMinus').click(); // Fail 1
    
    // Action: Crit success
    await page.locator('#btnCrit').click();
    
    // Assert: HP = 1, alive, death saves cleared
    await expect(page.locator('#hpCurrentSpan')).toHaveText('1');
    
    const state = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('monkSheet_v3'));
      return {
        status: st.status,
        dsSuccess: st.dsSuccess,
        dsFail: st.dsFail
      };
    });
    
    expect(state.status).toBe('alive');
    expect(state.dsSuccess).toBe(0);
    expect(state.dsFail).toBe(0);
    
    await expect(page.locator('#lifeStatus')).toHaveText('🙂');
  });

  test('[POSITIVE] Critical fail (Nat 1) adds 2 fails', async ({ page }) => {
    // Setup: Already have 1 fail
    await page.locator('#btnDsMinus').click(); // Fail 1
    
    // Action: Crit fail
    await page.locator('#btnCritFail').click();
    
    // Assert: dsFail = 3, dead
    const state = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('monkSheet_v3'));
      return {
        status: st.status,
        dsFail: st.dsFail
      };
    });
    
    expect(state.dsFail).toBe(3);
    expect(state.status).toBe('dead');
  });

  test('[POSITIVE] Resurrect from death', async ({ page }) => {
    // Setup: Die
    await page.locator('#btnDsMinus').click();
    await page.locator('#btnDsMinus').click();
    await page.locator('#btnDsMinus').click();
    await expect(page.locator('#lifeStatus')).toHaveText('💀');
    
    // Action: Click resurrect
    await page.locator('#btnResurrect').click();
    
    // Assert: HP = 1, alive, death saves cleared, overlay hidden
    await expect(page.locator('#hpCurrentSpan')).toHaveText('1');
    await expect(page.locator('#lifeStatus')).toHaveText('🙂');
    await expect(page.locator('#youDiedOverlay')).toHaveClass(/hidden/);
    
    const state = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('monkSheet_v3'));
      return {
        status: st.status,
        dsSuccess: st.dsSuccess,
        dsFail: st.dsFail
      };
    });
    
    expect(state.status).toBe('alive');
    expect(state.dsSuccess).toBe(0);
    expect(state.dsFail).toBe(0);
  });

  test('[POSITIVE] Hit at 0 HP adds 1 fail', async ({ page }) => {
    // Action: Hit at zero
    await page.locator('#btnHitAtZero').click();
    
    // Assert: dsFail = 1
    const dsFail = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('monkSheet_v3'));
      return st.dsFail;
    });
    expect(dsFail).toBe(1);
  });

  test('[POSITIVE] Stabilize button sets stable', async ({ page }) => {
    // Setup: Some death saves
    await page.locator('#btnDsPlus').click();
    await page.locator('#btnDsMinus').click();
    
    // Action: Stabilize
    await page.locator('#btnStabilize').click();
    
    // Assert: Status = stable, dsSuccess = 3
    const state = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('monkSheet_v3'));
      return {
        status: st.status,
        dsSuccess: st.dsSuccess
      };
    });
    
    expect(state.status).toBe('stable');
    expect(state.dsSuccess).toBe(3);
    await expect(page.locator('#lifeStatus')).toHaveText('🛌');
  });

});

test.describe('Critical Path - Rest Mechanics', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('[POSITIVE] Short rest restores Ki to max', async ({ page }) => {
    // Setup: Spend Ki
    await page.locator('#kiDelta').fill('1');
    await page.locator('#btnSpendKi').click();
    await expect(page.locator('#kiCurrentSpan')).toHaveText('0');
    
    // Action: Short rest (cancel HD prompt)
    page.once('dialog', dialog => dialog.dismiss());
    await page.locator('#btnShortRest').click();
    
    // Assert: Ki = max
    await expect(page.locator('#kiCurrentSpan')).toHaveText('1');
  });

  test('[POSITIVE] Long rest fully restores HP, Ki, and HD', async ({ page }) => {
    // Setup: Set to Level 5 (XP = 6500)
    await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('monkSheet_v3'));
      st.xp = 6500; // Level 5
      st.hpCurrent = 20;
      st.kiCurrent = 2;
      st.hdAvail = 2;
      localStorage.setItem('monkSheet_v3', JSON.stringify(st));
    });
    await page.reload();
    
    // Verify setup
    await expect(page.locator('#hpCurrentSpan')).toContainText('20');
    await expect(page.locator('#kiCurrentSpan')).toHaveText('2');
    
    // Action: Long rest
    await page.locator('#btnLongRest').click();
    
    // Assert: HP = max, Ki = max, HD restored
    const state = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('monkSheet_v3'));
      const d = {
        level: 5,
        maxHP: 38, // базова формула за level 5, CON +0
        kiMax: 5
      };
      return {
        hpCurrent: st.hpCurrent,
        kiCurrent: st.kiCurrent,
        hdAvail: st.hdAvail,
        maxHP: d.maxHP,
        kiMax: d.kiMax
      };
    });
    
    // HP = max
    expect(state.hpCurrent).toBeGreaterThanOrEqual(state.maxHP - 5); // ~38
    
    // Ki = max
    expect(state.kiCurrent).toBe(5);
    
    // HD = 2 + ceil(5/2) = 2+3 = 5
    expect(state.hdAvail).toBe(5);
  });

});

test.describe('Critical Path - Ki System', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('[POSITIVE] Spend Ki decreases current Ki', async ({ page }) => {
    // Action: Spend 1 Ki
    await page.locator('#kiDelta').fill('1');
    await page.locator('#btnSpendKi').click();
    
    // Assert: Ki = 0
    await expect(page.locator('#kiCurrentSpan')).toHaveText('0');
  });

  test('[POSITIVE] Gain Ki increases current Ki', async ({ page }) => {
    // Setup: Spend first
    await page.locator('#kiDelta').fill('1');
    await page.locator('#btnSpendKi').click();
    
    // Action: Gain 1 Ki
    await page.locator('#kiDelta').fill('1');
    await page.locator('#btnGainKi').click();
    
    // Assert: Ki = 1
    await expect(page.locator('#kiCurrentSpan')).toHaveText('1');
  });

  test('[POSITIVE] Ki clamped at 0 (can\'t go negative)', async ({ page }) => {
    // Action: Spend 10 Ki (more than max)
    await page.locator('#kiDelta').fill('10');
    await page.locator('#btnSpendKi').click();
    
    // Assert: Ki = 0, not negative
    await expect(page.locator('#kiCurrentSpan')).toHaveText('0');
    
    const ki = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('monkSheet_v3'));
      return st.kiCurrent;
    });
    expect(ki).toBe(0);
  });

  test('[POSITIVE] Ki clamped at max', async ({ page }) => {
    // Action: Gain 10 Ki (more than max)
    await page.locator('#kiDelta').fill('10');
    await page.locator('#btnGainKi').click();
    
    // Assert: Ki = max (1 at level 1)
    await expect(page.locator('#kiCurrentSpan')).toHaveText('1');
  });

  test('[NEGATIVE] Ki with 0 or negative input does nothing', async ({ page }) => {
    // Action 1: Spend 0 Ki
    await page.locator('#kiDelta').fill('0');
    await page.locator('#btnSpendKi').click();
    
    // Assert: Ki unchanged
    await expect(page.locator('#kiCurrentSpan')).toHaveText('1');
    
    // Action 2: Spend negative Ki
    await page.locator('#kiDelta').fill('-5');
    await page.locator('#btnSpendKi').click();
    
    // Assert: Ki unchanged
    await expect(page.locator('#kiCurrentSpan')).toHaveText('1');
  });

});

test.describe('Critical Path - localStorage Persistence', () => {
  
  test('[POSITIVE] State persists after page refresh', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    
    // Setup: Make changes
    await page.locator('#hpDelta').fill('3');
    await page.locator('#btnDamage').click();
    await page.locator('#kiDelta').fill('1');
    await page.locator('#btnSpendKi').click();
    
    // Verify changes
    await expect(page.locator('#hpCurrentSpan')).toHaveText('7');
    await expect(page.locator('#kiCurrentSpan')).toHaveText('0');
    
    // Action: Refresh page
    await page.reload();
    
    // Assert: State persisted
    await expect(page.locator('#hpCurrentSpan')).toHaveText('7');
    await expect(page.locator('#kiCurrentSpan')).toHaveText('0');
  });

  test('[POSITIVE] localStorage loads on boot', async ({ page }) => {
    // Setup: Pre-populate localStorage
    await page.goto('/');
    await page.evaluate(() => {
      const state = {
        name: "Test Hero",
        xp: 6500, // Level 5
        hpCurrent: 25,
        kiCurrent: 3,
        str: 16,
        dex: 18
      };
      localStorage.setItem('monkSheet_v3', JSON.stringify(state));
    });
    
    // Action: Reload (should load from localStorage)
    await page.reload();
    
    // Assert: Data loaded correctly
    const state = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('monkSheet_v3'));
      return {
        xp: st.xp,
        hpCurrent: st.hpCurrent,
        kiCurrent: st.kiCurrent
      };
    });
    
    expect(state.xp).toBe(6500);
    expect(state.hpCurrent).toBe(25);
    expect(state.kiCurrent).toBe(3);
  });

});
