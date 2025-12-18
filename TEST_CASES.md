# Monk Combat App - Test Cases

## TEST SUITE VERSION: 1.0
## Application Version: v3
## Date: 2025-12-18

---

## TABLE OF CONTENTS

1. [State Management](#1-state-management)
2. [Derived Values](#2-derived-values)
3. [Combat System](#3-combat-system)
4. [Death Saves](#4-death-saves)
5. [Rest Mechanics](#5-rest-mechanics)
6. [Ability Scores](#6-ability-scores)
7. [Skills System](#7-skills-system)
8. [Saving Throws](#8-saving-throws)
9. [Ki System](#9-ki-system)
10. [HP System](#10-hp-system)
11. [Feats (Tough)](#11-feats-tough)
12. [Export/Import](#12-exportimport)
13. [Inventory](#13-inventory)
14. [PC Characteristics](#14-pc-characteristics)
15. [Aliases & Familiars](#15-aliases--familiars)
16. [Edge Cases](#16-edge-cases)
17. [Integration Tests](#17-integration-tests)

---

## 1. STATE MANAGEMENT

### Test Case 1.1: localStorage Save
**Type:** Positive  
**Description:** Verify that state is saved to localStorage on every change  
**Preconditions:** Fresh app load  
**Steps:**
1. Change XP from 0 to 300
2. Check localStorage key "monkSheet_v3"

**Expected:**
- localStorage contains JSON string with xp: 300
- JSON is valid and parseable

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 1.2: localStorage Load
**Type:** Positive  
**Description:** Verify that state is loaded from localStorage on boot  
**Preconditions:** localStorage has saved state with xp: 1000  
**Steps:**
1. Refresh page
2. Check XP display

**Expected:**
- XP shows 1000
- Level shows 3
- All derived values correct

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 1.3: localStorage Merge with defaultState
**Type:** Positive  
**Description:** Verify backward compatibility when loading old state  
**Preconditions:** localStorage has old state without new field (e.g., "tough")  
**Steps:**
1. Set localStorage with state missing "tough" field
2. Refresh page
3. Check state

**Expected:**
- State has tough: false (from defaultState)
- Other fields from localStorage preserved

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 1.4: Empty localStorage
**Type:** Positive  
**Description:** Verify that app works with no saved state  
**Preconditions:** localStorage cleared  
**Steps:**
1. Clear localStorage
2. Refresh page

**Expected:**
- App loads with defaultState
- Name: "Пийс Ошит"
- XP: 0, Level: 1
- HP: 10/10, Ki: 1/1

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 1.5: Corrupted localStorage
**Type:** Negative  
**Description:** Verify app handles corrupted JSON in localStorage  
**Preconditions:** None  
**Steps:**
1. Set localStorage "monkSheet_v3" to invalid JSON: "{invalid"
2. Refresh page

**Expected:**
- App loads with defaultState (fallback)
- No crash
- Console may show error

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

## 2. DERIVED VALUES

### Test Case 2.1: Level from XP
**Type:** Positive  
**Description:** Verify level calculation from XP  
**Test Data:**

| XP | Expected Level |
|----|----------------|
| 0 | 1 |
| 299 | 1 |
| 300 | 2 |
| 900 | 3 |
| 2700 | 4 |
| 6500 | 5 |
| 14000 | 6 |
| 23000 | 7 |
| 355000 | 20 |

**Steps:**
1. For each XP value, set XP
2. Check level display

**Expected:** Level matches table  
**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 2.2: Proficiency Bonus from Level
**Type:** Positive  
**Description:** Verify proficiency calculation  
**Test Data:**

| Level | Expected Prof |
|-------|---------------|
| 1 | +2 |
| 4 | +2 |
| 5 | +3 |
| 8 | +3 |
| 9 | +4 |
| 12 | +4 |
| 13 | +5 |
| 16 | +5 |
| 17 | +6 |
| 20 | +6 |

**Steps:**
1. For each level (via XP), check Prof display

**Expected:** Prof matches table  
**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 2.3: Martial Arts Die from Level
**Type:** Positive  
**Description:** Verify MA die scaling  
**Test Data:**

| Level Range | Expected Die |
|-------------|--------------|
| 1-4 | d4 |
| 5-10 | d6 |
| 11-16 | d8 |
| 17-20 | d10 |

**Steps:**
1. Set XP for each level range
2. Check MA Die display

**Expected:** MA Die matches table  
**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 2.4: Unarmored Movement from Level
**Type:** Positive  
**Description:** Verify UM bonus scaling  
**Test Data:**

| Level | Expected Bonus |
|-------|----------------|
| 1 | +0 ft |
| 2 | +10 ft |
| 6 | +15 ft |
| 10 | +20 ft |
| 14 | +25 ft |
| 18 | +30 ft |

**Steps:**
1. Set XP for each level
2. Check UM Bonus display

**Expected:** UM Bonus matches table  
**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 2.5: Ability Modifier Calculation
**Type:** Positive  
**Description:** Verify modifier from ability score  
**Test Data:**

| Score | Expected Mod |
|-------|--------------|
| 1 | -5 |
| 8 | -1 |
| 9 | -1 |
| 10 | +0 |
| 11 | +0 |
| 12 | +1 |
| 16 | +3 |
| 18 | +4 |
| 20 | +5 |
| 30 | +10 |

**Steps:**
1. For each score, set any ability (e.g., STR)
2. Check modifier display

**Expected:** Modifier matches table  
**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 2.6: Max HP Calculation (No Tough)
**Type:** Positive  
**Description:** Verify Max HP formula without Tough feat  
**Preconditions:** Tough = false  
**Test Data:**

| Level | CON | Expected HP |
|-------|-----|-------------|
| 1 | 10 (+0) | 8 |
| 1 | 14 (+2) | 10 |
| 5 | 14 (+2) | 38 |
| 10 | 16 (+3) | 85 |
| 20 | 20 (+5) | 203 |

**Formula:** 8 + CON_mod + (level-1) × (5 + CON_mod)

**Steps:**
1. Set level (via XP) and CON
2. Check Max HP display

**Expected:** Max HP matches formula  
**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 2.7: Max HP Calculation (With Tough)
**Type:** Positive  
**Description:** Verify Max HP formula with Tough feat  
**Preconditions:** Tough = true  
**Test Data:**

| Level | CON | Expected HP (base + 2×level) |
|-------|-----|------------------------------|
| 1 | 10 (+0) | 10 (8+2) |
| 5 | 14 (+2) | 48 (38+10) |
| 10 | 16 (+3) | 105 (85+20) |

**Steps:**
1. Enable Tough
2. Set level and CON
3. Check Max HP

**Expected:** Max HP = base + (2 × level)  
**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 2.8: Armor Class Calculation
**Type:** Positive  
**Description:** Verify AC formula  
**Formula:** AC = 10 + DEX_mod + WIS_mod + acMagic

**Test Data:**

| DEX | WIS | Magic | Expected AC |
|-----|-----|-------|-------------|
| 10 | 10 | 0 | 10 |
| 16 | 14 | 0 | 15 |
| 18 | 16 | 0 | 17 |
| 16 | 14 | 2 | 17 |

**Steps:**
1. Set DEX, WIS, acMagic
2. Check AC display

**Expected:** AC matches formula  
**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 2.9: Attack Roll Calculation
**Type:** Positive  
**Description:** Verify attack bonus formula  
**Formula:** 
- Melee: DEX_mod + prof + meleeMagic
- Ranged: DEX_mod + prof + rangedMagic

**Test Data:**

| Level | DEX | Melee Magic | Expected Melee Atk |
|-------|-----|-------------|---------------------|
| 1 | 16 (+3) | 0 | +5 (+3 dex, +2 prof) |
| 5 | 18 (+4) | 1 | +8 (+4 dex, +3 prof, +1 magic) |

**Steps:**
1. Set level, DEX, magic bonuses
2. Check attack displays

**Expected:** Attack bonuses match formulas  
**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 2.10: Ki Max equals Level
**Type:** Positive  
**Description:** Verify Ki Max = Level  
**Test Data:**

| Level (XP) | Expected Ki Max |
|------------|-----------------|
| 1 (0) | 1 |
| 2 (300) | 2 |
| 5 (6500) | 5 |
| 10 (64000) | 10 |
| 20 (355000) | 20 |

**Steps:**
1. Set XP for each level
2. Check Ki Max display

**Expected:** Ki Max = Level  
**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

## 3. COMBAT SYSTEM

### Test Case 3.1: Take Damage (HP > 0)
**Type:** Positive  
**Description:** Verify damage reduces HP  
**Preconditions:** HP = 40/40  
**Steps:**
1. Enter 15 in HP Δ field
2. Click "Take damage"

**Expected:**
- HP = 25/40
- Status = "alive"
- No death saves

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 3.2: Take Damage to Exactly 0
**Type:** Positive  
**Description:** Verify going to 0 HP  
**Preconditions:** HP = 15/40  
**Steps:**
1. Enter 15 in HP Δ
2. Click "Take damage"

**Expected:**
- HP = 0/40
- Status = "unconscious"
- Death saves = 0/0
- Emoji = 😵

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 3.3: Take Damage Below 0 (Clamped)
**Type:** Positive  
**Description:** Verify HP doesn't go negative  
**Preconditions:** HP = 10/40  
**Steps:**
1. Enter 50 in HP Δ
2. Click "Take damage"

**Expected:**
- HP = 0/40 (not -40)
- Status = "unconscious"

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 3.4: Take Damage at 0 HP
**Type:** Positive  
**Description:** Verify damage at 0 adds death save fail  
**Preconditions:** HP = 0, Status = "unconscious", dsFail = 0  
**Steps:**
1. Enter 10 in HP Δ
2. Click "Take damage"

**Expected:**
- HP = 0 (unchanged)
- dsFail = 1
- Status = "unconscious"

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 3.5: Heal (HP > 0)
**Type:** Positive  
**Description:** Verify healing increases HP  
**Preconditions:** HP = 20/40  
**Steps:**
1. Enter 10 in HP Δ
2. Click "Heal"

**Expected:**
- HP = 30/40

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 3.6: Heal Over Max (Clamped)
**Type:** Positive  
**Description:** Verify HP doesn't exceed max  
**Preconditions:** HP = 35/40  
**Steps:**
1. Enter 20 in HP Δ
2. Click "Heal"

**Expected:**
- HP = 40/40 (not 55)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 3.7: Heal from 0 HP
**Type:** Positive  
**Description:** Verify healing from unconscious  
**Preconditions:** HP = 0, Status = "unconscious", dsSuccess = 1, dsFail = 2  
**Steps:**
1. Enter 5 in HP Δ
2. Click "Heal"

**Expected:**
- HP = 5/40
- Status = "alive"
- dsSuccess = 0
- dsFail = 0
- Emoji = 🙂

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 3.8: Heal from 0 HP (Specific Button)
**Type:** Positive  
**Description:** Verify "Heal from 0" button  
**Preconditions:** HP = 0, Status = "unconscious", dsSuccess = 2, dsFail = 1  
**Steps:**
1. Enter 3 in HP Δ
2. Click "Heal from 0"

**Expected:**
- HP = 3/40
- Status = "alive"
- dsSuccess = 0
- dsFail = 0

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 3.9: Cannot Heal When Dead
**Type:** Negative  
**Description:** Verify healing doesn't work on dead character  
**Preconditions:** HP = 0, Status = "dead"  
**Steps:**
1. Enter 10 in HP Δ
2. Click "Heal"

**Expected:**
- HP = 0 (unchanged)
- Status = "dead" (unchanged)
- No effect

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 3.10: Damage with Negative Value
**Type:** Negative  
**Description:** Verify negative damage is ignored  
**Preconditions:** HP = 30/40  
**Steps:**
1. Enter -10 in HP Δ
2. Click "Take damage"

**Expected:**
- HP = 30/40 (unchanged)
- No effect (function returns early)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 3.11: Heal with Zero Value
**Type:** Negative  
**Description:** Verify zero healing is ignored  
**Preconditions:** HP = 30/40  
**Steps:**
1. Enter 0 in HP Δ
2. Click "Heal"

**Expected:**
- HP = 30/40 (unchanged)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

## 4. DEATH SAVES

### Test Case 4.1: Death Save Success
**Type:** Positive  
**Description:** Verify success increment  
**Preconditions:** HP = 0, dsSuccess = 0, dsFail = 0  
**Steps:**
1. Click "Death Save +"

**Expected:**
- dsSuccess = 1
- Status = "unconscious"
- Success dot 1 active

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 4.2: Death Save Success (3rd - Stabilize)
**Type:** Positive  
**Description:** Verify 3 successes stabilize  
**Preconditions:** HP = 0, dsSuccess = 2, dsFail = 1  
**Steps:**
1. Click "Death Save +"

**Expected:**
- dsSuccess = 3
- Status = "stable"
- Emoji = 🛌
- All 3 success dots active

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 4.3: Death Save Fail
**Type:** Positive  
**Description:** Verify fail increment  
**Preconditions:** HP = 0, dsSuccess = 1, dsFail = 0  
**Steps:**
1. Click "Death Save –"

**Expected:**
- dsFail = 1
- Status = "unconscious"
- Fail dot 1 active (red)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 4.4: Death Save Fail (3rd - Death)
**Type:** Positive  
**Description:** Verify 3 fails = death  
**Preconditions:** HP = 0, dsSuccess = 1, dsFail = 2  
**Steps:**
1. Click "Death Save –"

**Expected:**
- dsFail = 3
- Status = "dead"
- Emoji = 💀
- "YOU DIED" overlay visible
- All 3 fail dots active (red, glow)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 4.5: Critical Success (Nat 20)
**Type:** Positive  
**Description:** Verify crit success heals 1 HP  
**Preconditions:** HP = 0, dsSuccess = 1, dsFail = 2  
**Steps:**
1. Click "Crit Success"

**Expected:**
- HP = 1/max
- Status = "alive"
- dsSuccess = 0
- dsFail = 0
- Emoji = 🙂

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 4.6: Critical Fail (Nat 1, +2 fails)
**Type:** Positive  
**Description:** Verify crit fail adds 2 fails  
**Preconditions:** HP = 0, dsSuccess = 1, dsFail = 1  
**Steps:**
1. Click "Crit Fail (+2)"

**Expected:**
- dsFail = 3
- Status = "dead"
- "YOU DIED" overlay visible

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 4.7: Stabilize Button
**Type:** Positive  
**Description:** Verify stabilize (Medicine check / Spare the Dying)  
**Preconditions:** HP = 0, dsSuccess = 1, dsFail = 2  
**Steps:**
1. Click "Stabilize"

**Expected:**
- dsSuccess = 3
- Status = "stable"
- Emoji = 🛌

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 4.8: Hit at Zero Button
**Type:** Positive  
**Description:** Verify melee hit at 0 HP = 1 fail  
**Preconditions:** HP = 0, dsSuccess = 2, dsFail = 1  
**Steps:**
1. Click "Hit at 0 ⇒ DS fail"

**Expected:**
- dsFail = 2
- Status = "unconscious"

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 4.9: Hit at Zero (Causes Death)
**Type:** Positive  
**Description:** Verify 3rd fail from hit  
**Preconditions:** HP = 0, dsFail = 2  
**Steps:**
1. Click "Hit at 0 ⇒ DS fail"

**Expected:**
- dsFail = 3
- Status = "dead"

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 4.10: Resurrect Button
**Type:** Positive  
**Description:** Verify resurrection from death  
**Preconditions:** HP = 0, Status = "dead", dsFail = 3  
**Steps:**
1. Click "Resurrect (1 HP)" in YOU DIED overlay

**Expected:**
- HP = 1/max
- Status = "alive"
- dsSuccess = 0
- dsFail = 0
- "YOU DIED" overlay hidden
- Emoji = 🙂

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 4.11: Death Saves Cannot Exceed 3
**Type:** Negative  
**Description:** Verify saves cap at 3  
**Preconditions:** dsSuccess = 3  
**Steps:**
1. Click "Death Save +" again

**Expected:**
- dsSuccess = 3 (unchanged, or remains at 3)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 4.12: Death Saves on Alive Character
**Type:** Negative  
**Description:** Verify DS buttons do nothing when HP > 0  
**Preconditions:** HP = 30/40, Status = "alive"  
**Steps:**
1. Click "Death Save +"

**Expected:**
- No effect (or handled gracefully)
- Status remains "alive"

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

## 5. REST MECHANICS

### Test Case 5.1: Short Rest - Ki Restore
**Type:** Positive  
**Description:** Verify Ki fully restores on short rest  
**Preconditions:** Level 5, Ki = 2/5  
**Steps:**
1. Click "Short rest"
2. Answer HD prompt: 0

**Expected:**
- Ki = 5/5
- HP unchanged
- hdAvail unchanged

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 5.2: Short Rest - Use Hit Dice
**Type:** Positive  
**Description:** Verify HD usage and healing  
**Preconditions:** Level 5, HP = 20/38, hdAvail = 5, CON +2  
**Steps:**
1. Click "Short rest"
2. Prompt: "How many HD?" → Enter 2
3. Prompt: "HP rolled?" → Enter 10

**Expected:**
- Ki = 5/5
- hdAvail = 3 (5-2)
- HP = 34/38 (20 + 10 + 2×2 CON)
- Healing = rolled + (CON_mod × dice_used)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 5.3: Short Rest - No HD Available
**Type:** Positive  
**Description:** Verify short rest when HD = 0  
**Preconditions:** hdAvail = 0, Ki = 2/5  
**Steps:**
1. Click "Short rest"

**Expected:**
- Ki = 5/5
- No HD prompt (skip if hdAvail = 0)
- HP unchanged

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 5.4: Short Rest - Cancel HD Use
**Type:** Positive  
**Description:** Verify canceling HD prompt  
**Preconditions:** hdAvail = 3  
**Steps:**
1. Click "Short rest"
2. Prompt: "How many HD?" → Cancel

**Expected:**
- Ki still restored
- HP unchanged
- hdAvail unchanged

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 5.5: Long Rest - Full Restore
**Type:** Positive  
**Description:** Verify long rest fully restores  
**Preconditions:** Level 10, HP = 30/85, Ki = 3/10, hdAvail = 4/10, dsFail = 2  
**Steps:**
1. Click "Long rest"

**Expected:**
- HP = 85/85 (full)
- Ki = 10/10 (full)
- hdAvail = 9/10 (4 + ceil(10/2) = 4+5)
- dsSuccess = 0
- dsFail = 0
- Status = "alive"

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 5.6: Long Rest - HD Recovery Calculation
**Type:** Positive  
**Description:** Verify HD recovery = ceil(max/2)  
**Test Data:**

| Level (max HD) | HD before | Expected after |
|----------------|-----------|----------------|
| 1 | 0 | 1 (0 + ceil(1/2)) |
| 5 | 0 | 3 (0 + ceil(5/2)) |
| 10 | 3 | 8 (3 + ceil(10/2)) |
| 11 | 0 | 6 (0 + ceil(11/2)) |

**Steps:**
1. Set level and hdAvail
2. Click "Long rest"
3. Check hdAvail

**Expected:** hdAvail matches table  
**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 5.7: Long Rest - HD Cap at Max
**Type:** Positive  
**Description:** Verify HD can't exceed max  
**Preconditions:** Level 5 (max 5), hdAvail = 3  
**Steps:**
1. Click "Long rest"

**Expected:**
- hdAvail = 5 (not 6)
- Clamped to max

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 5.8: Long Rest from Death
**Type:** Positive  
**Description:** Verify long rest doesn't resurrect  
**Preconditions:** Status = "dead", HP = 0  
**Steps:**
1. Click "Long rest"

**Expected:**
- HP = max HP
- Ki = max Ki
- Status = "alive" (death saves cleared)
- **Effectively resurrects!**

**Note:** This may be intended behavior or a bug to discuss!

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

## 6. ABILITY SCORES

### Test Case 6.1: Change Single Ability
**Type:** Positive  
**Description:** Verify ability change updates modifier  
**Preconditions:** STR = 10  
**Steps:**
1. Change STR to 16
2. Check STR modifier

**Expected:**
- STR mod = +3
- Save triggers (localStorage, render)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 6.2: CON Change - HP Recalculation (Retroactive)
**Type:** Positive  
**Description:** Verify CON affects all levels of HP  
**Preconditions:** Level 5, CON 14 (+2), Max HP = 38  
**Steps:**
1. Change CON to 16 (+3)

**Expected:**
- Max HP = 43 (38 + 5)
- Formula: +1 HP per level for +1 CON mod
- Current HP unchanged (or clamped if over max)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 6.3: CON Decrease - HP Recalculation
**Type:** Positive  
**Description:** Verify CON decrease lowers max HP  
**Preconditions:** Level 5, CON 16 (+3), HP = 43/43  
**Steps:**
1. Change CON to 14 (+2)

**Expected:**
- Max HP = 38 (43 - 5)
- Current HP = 43 (NOT clamped automatically!)
- **Bug/Feature:** Current HP stays at 43/38 until next clamp

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 6.4: DEX Change - AC Recalculation
**Type:** Positive  
**Description:** Verify DEX affects AC  
**Preconditions:** DEX 14 (+2), WIS 14 (+2), AC = 14  
**Steps:**
1. Change DEX to 18 (+4)

**Expected:**
- AC = 16 (10+4+2)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 6.5: DEX Change - Attack Rolls
**Type:** Positive  
**Description:** Verify DEX affects attacks  
**Preconditions:** Level 5, DEX 14 (+2), Prof +3, Melee Atk = +5  
**Steps:**
1. Change DEX to 18 (+4)

**Expected:**
- Melee Atk = +7 (+4 dex, +3 prof)
- Ranged Atk = +7

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 6.6: WIS Change - AC Recalculation
**Type:** Positive  
**Description:** Verify WIS affects AC (Monk Unarmored Defense)  
**Preconditions:** DEX 16 (+3), WIS 14 (+2), AC = 15  
**Steps:**
1. Change WIS to 18 (+4)

**Expected:**
- AC = 17 (10+3+4)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 6.7: All Abilities - Saving Throws Update
**Type:** Positive  
**Description:** Verify each ability affects its save  
**Preconditions:** Level 5 (prof +3), all abilities at 10  
**Steps:**
1. Change STR to 16
2. Check STR save (no proficiency) = +3
3. Change DEX to 16
4. Check DEX save (with proficiency) = +6

**Expected:**
- Each save = ability_mod + (prof if proficient)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 6.8: Ability Change - Skills Update
**Type:** Positive  
**Description:** Verify ability change affects related skills  
**Preconditions:** DEX 14 (+2), Acrobatics proficient, bonus = +5  
**Steps:**
1. Change DEX to 18 (+4)

**Expected:**
- Acrobatics bonus = +7 (+4 dex, +3 prof)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 6.9: Invalid Ability Score (Negative)
**Type:** Negative  
**Description:** Verify handling of invalid ability scores  
**Preconditions:** STR = 10  
**Steps:**
1. Try to enter STR = -5

**Expected:**
- Either: prevented by input validation
- Or: accepted and modFrom(-5) = -8

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 6.10: Extreme Ability Score (>20)
**Type:** Positive  
**Description:** Verify app handles high ability scores  
**Preconditions:** STR = 10  
**Steps:**
1. Change STR to 30

**Expected:**
- STR mod = +10
- All calculations work correctly
- No overflow errors

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

## 7. SKILLS SYSTEM

### Test Case 7.1: Skill Proficiency Toggle
**Type:** Positive  
**Description:** Verify toggling skill proficiency  
**Preconditions:** Level 5 (prof +3), DEX 16 (+3), Acrobatics not proficient  
**Steps:**
1. Check Acrobatics checkbox

**Expected:**
- Acrobatics bonus changes from +3 to +6
- State saved

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 7.2: Skill Bonus Calculation
**Type:** Positive  
**Description:** Verify skill bonus = ability + prof (if proficient)  
**Preconditions:** Level 5 (prof +3)  
**Test Data:**

| Skill | Ability | Score | Proficient | Expected Bonus |
|-------|---------|-------|------------|----------------|
| Athletics | STR | 16 (+3) | No | +3 |
| Athletics | STR | 16 (+3) | Yes | +6 |
| Perception | WIS | 14 (+2) | Yes | +5 |

**Steps:**
1. Set ability and proficiency
2. Check skill bonus

**Expected:** Bonus matches calculation  
**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 7.3: Passive Skills Calculation
**Type:** Positive  
**Description:** Verify passive = 10 + skill bonus  
**Preconditions:** WIS 16 (+3), Perception proficient, prof +3  
**Steps:**
1. Check Passive Perception display

**Expected:**
- Perception bonus = +6 (+3 wis, +3 prof)
- Passive Perception = 16 (10 + 6)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 7.4: All 18 Skills Present
**Type:** Positive  
**Description:** Verify all skills are rendered  
**Steps:**
1. Open Stats tab
2. Count skills in table

**Expected:**
- 18 skills total
- All abilities represented correctly

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

## 8. SAVING THROWS

### Test Case 8.1: Save Proficiency Toggle
**Type:** Positive  
**Description:** Verify toggling save proficiency  
**Preconditions:** Level 5 (prof +3), STR 14 (+2), no STR prof  
**Steps:**
1. Check "STR Prof" checkbox
2. Check STR save total

**Expected:**
- STR save changes from +2 to +5 (+2 mod, +3 prof)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 8.2: Default Monk Proficiencies
**Type:** Positive  
**Description:** Verify Monks have DEX and WIS save proficiency by default  
**Preconditions:** Fresh character  
**Steps:**
1. Load default state
2. Check save proficiencies

**Expected:**
- saveDexProf = true
- saveWisProf = true
- All others = false

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 8.3: All Saves Bonus
**Type:** Positive  
**Description:** Verify all saves bonus applies to every save  
**Preconditions:** Level 5, all abilities at 10, all saves not proficient  
**Steps:**
1. Set "All Saves Bonus" to +2
2. Check all save totals

**Expected:**
- Each save = +2 (ability mod 0, prof 0, all bonus +2)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 8.4: Save Calculation with All Bonuses
**Type:** Positive  
**Description:** Verify full save formula  
**Formula:** save = ability_mod + (prof if proficient) + all_saves_bonus

**Preconditions:** Level 5 (prof +3), CON 16 (+3), CON prof checked, all saves bonus +1  
**Steps:**
1. Check CON save total

**Expected:**
- CON save = +7 (+3 mod, +3 prof, +1 all)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 8.5: All Saves Bonus Limits
**Type:** Negative  
**Description:** Verify all saves bonus has bounds  
**Steps:**
1. Try to set All Saves Bonus to 100

**Expected:**
- Clamped to max (10 in code)
- Or accepted if no validation

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

## 9. KI SYSTEM

### Test Case 9.1: Spend Ki
**Type:** Positive  
**Description:** Verify spending Ki  
**Preconditions:** Ki = 5/5  
**Steps:**
1. Enter 2 in Ki Δ
2. Click "Spend Ki"

**Expected:**
- Ki = 3/5

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 9.2: Spend Ki Below 0 (Clamped)
**Type:** Positive  
**Description:** Verify Ki can't go negative  
**Preconditions:** Ki = 2/5  
**Steps:**
1. Enter 10 in Ki Δ
2. Click "Spend Ki"

**Expected:**
- Ki = 0/5 (not -8)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 9.3: Gain Ki
**Type:** Positive  
**Description:** Verify gaining Ki  
**Preconditions:** Ki = 2/5  
**Steps:**
1. Enter 2 in Ki Δ
2. Click "Gain Ki"

**Expected:**
- Ki = 4/5

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 9.4: Gain Ki Above Max (Clamped)
**Type:** Positive  
**Description:** Verify Ki can't exceed max  
**Preconditions:** Ki = 4/5  
**Steps:**
1. Enter 10 in Ki Δ
2. Click "Gain Ki"

**Expected:**
- Ki = 5/5 (not 14)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 9.5: Ki Max Updates with Level
**Type:** Positive  
**Description:** Verify Ki Max = Level always  
**Preconditions:** Level 3 (XP 900), Ki = 3/3  
**Steps:**
1. Change XP to 2700 (Level 4)

**Expected:**
- Ki Max = 4
- Current Ki = 3 (unchanged, or clamped)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 9.6: Ki with Zero or Negative Input
**Type:** Negative  
**Description:** Verify invalid Ki inputs  
**Preconditions:** Ki = 3/5  
**Steps:**
1. Enter 0 in Ki Δ → Spend Ki
2. Enter -5 in Ki Δ → Spend Ki

**Expected:**
- No effect (returns early if <= 0)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

## 10. HP SYSTEM

### Test Case 10.1: Max HP with Homebrew Bonus
**Type:** Positive  
**Description:** Verify homebrew HP adjusts max  
**Preconditions:** Level 5, CON +2, base Max HP = 38  
**Steps:**
1. Enter 5 in "Homebrew HP"

**Expected:**
- Max HP = 43 (38 + 5)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 10.2: Max HP with Negative Homebrew
**Type:** Positive  
**Description:** Verify negative homebrew HP  
**Preconditions:** Base Max HP = 38  
**Steps:**
1. Enter -10 in "Homebrew HP"

**Expected:**
- Max HP = 28 (38 - 10)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 10.3: Max HP Minimum 1
**Type:** Positive  
**Description:** Verify Max HP can't be 0  
**Preconditions:** Base HP = 10, Homebrew = -20  
**Steps:**
1. Check Max HP

**Expected:**
- Max HP = 1 (Math.max(1, ...))

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 10.4: Current HP Clamp on Max HP Decrease
**Type:** Negative  
**Description:** Verify current HP when max decreases  
**Preconditions:** HP = 38/38, Homebrew = 0  
**Steps:**
1. Enter -10 in Homebrew HP

**Expected:**
- Max HP = 28
- Current HP = 38 (NOT automatically clamped!)
- **Known issue:** Stays 38/28 until next damage/heal

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

## 11. FEATS (TOUGH)

### Test Case 11.1: Enable Tough Feat
**Type:** Positive  
**Description:** Verify enabling Tough adds 2 HP per level  
**Preconditions:** Level 5, CON +2, HP = 30/38  
**Steps:**
1. Check "Tough" checkbox

**Expected:**
- Max HP = 48 (38 + 2×5)
- Current HP = 40 (30 + 10 delta)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 11.2: Disable Tough Feat
**Type:** Positive  
**Description:** Verify disabling Tough removes bonus  
**Preconditions:** Level 5, Tough enabled, HP = 40/48  
**Steps:**
1. Uncheck "Tough" checkbox

**Expected:**
- Max HP = 38 (48 - 10)
- Current HP = 30 (40 - 10 delta)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 11.3: Tough at Level 1
**Type:** Positive  
**Description:** Verify Tough gives +2 at level 1  
**Preconditions:** Level 1, CON +0, base HP = 8  
**Steps:**
1. Check "Tough"

**Expected:**
- Max HP = 10 (8 + 2×1)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 11.4: Tough at Level 20
**Type:** Positive  
**Description:** Verify Tough scaling at max level  
**Preconditions:** Level 20, CON +5, base HP = 203  
**Steps:**
1. Check "Tough"

**Expected:**
- Max HP = 243 (203 + 2×20)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 11.5: Tough Toggle Preserves Relative HP
**Type:** Positive  
**Description:** Verify current HP adjusts proportionally  
**Preconditions:** Level 10, HP = 50/85 (59% health)  
**Steps:**
1. Check "Tough"

**Expected:**
- Max HP = 105
- Current HP = 70 (50 + 20 delta)
- Still at ~67% health (or exact delta maintained)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

## 12. EXPORT/IMPORT

### Test Case 12.1: Export Creates Valid JSON
**Type:** Positive  
**Description:** Verify export creates valid bundle  
**Preconditions:** Any character state  
**Steps:**
1. Click "Export"
2. Open downloaded file in text editor
3. Validate JSON

**Expected:**
- Valid JSON structure
- Has "version": 2
- Has "state" object with all fields

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 12.2: Export Filename Format
**Type:** Positive  
**Description:** Verify filename format  
**Preconditions:** Name = "Пийс Ошит"  
**Steps:**
1. Click "Export"
2. Check filename

**Expected:**
- Format: `{name}_{YYYYMMDD_HHMMSS}_bundle.json`
- Example: `Пийс_Ошит_20251218_143025_bundle.json`
- No invalid characters (/ \ : * ? " < > |)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 12.3: Export Contains All Data
**Type:** Positive  
**Description:** Verify export includes all state fields  
**Preconditions:** Character with inventory, aliases, familiars  
**Steps:**
1. Click "Export"
2. Open file, check contents

**Expected:**
- All state fields present
- inventory array included
- aliases array included
- familiars array included

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 12.4: Import v2 Bundle
**Type:** Positive  
**Description:** Verify importing current format  
**Preconditions:** Valid v2 bundle file  
**Steps:**
1. Click "Import" (file input)
2. Select bundle file

**Expected:**
- State loaded completely
- All fields match export
- localStorage updated
- UI rendered correctly

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 12.5: Import v1 Bundle (Legacy)
**Type:** Positive  
**Description:** Verify backward compatibility  
**Preconditions:** Old v1 format file (no "version" field)  
**Steps:**
1. Import v1 file

**Expected:**
- Data loaded successfully
- Missing fields get defaults
- No errors

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 12.6: Import Overwrites Current State
**Type:** Positive  
**Description:** Verify import replaces everything  
**Preconditions:** Current state has XP=1000, import has XP=5000  
**Steps:**
1. Import file

**Expected:**
- XP = 5000 (from import)
- All other fields from import
- Previous state completely replaced

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 12.7: Import with Missing Fields
**Type:** Positive  
**Description:** Verify defaults for missing fields  
**Preconditions:** Bundle missing "tough" field  
**Steps:**
1. Import file

**Expected:**
- tough = false (from defaultState)
- Other fields from import

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 12.8: Import Invalid JSON
**Type:** Negative  
**Description:** Verify handling of corrupted file  
**Preconditions:** Text file with invalid JSON  
**Steps:**
1. Try to import invalid file

**Expected:**
- Error message (alert or console)
- State unchanged
- No crash

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 12.9: Export-Import Round Trip
**Type:** Positive  
**Description:** Verify export/import preserves data  
**Preconditions:** Complex character state  
**Steps:**
1. Note current state (XP, HP, Ki, inventory, etc.)
2. Export
3. Change some values locally
4. Import the export file
5. Check state

**Expected:**
- All values match original state exactly
- Perfect round trip

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 12.10: Import Triggers Re-render
**Type:** Positive  
**Description:** Verify UI updates after import  
**Preconditions:** Import file with different level  
**Steps:**
1. Import file with Level 10
2. Check UI displays

**Expected:**
- Level display updates
- All derived values recalculated
- Skills/features re-rendered

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

## 13. INVENTORY

### Test Case 13.1: Add Inventory Item
**Type:** Positive  
**Description:** Verify adding item to inventory  
**Preconditions:** Empty inventory  
**Steps:**
1. Click "+ Add item"
2. Enter name: "Dart", qty: 10, note: "1d4 damage"
3. Click "Запази"

**Expected:**
- Inventory has 1 item
- Item appears in table
- State saved

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 13.2: Edit Inventory Item
**Type:** Positive  
**Description:** Verify editing existing item  
**Preconditions:** Inventory has "Dart" (qty 10)  
**Steps:**
1. Click edit button (✏️)
2. Change qty to 15
3. Click "Запази"

**Expected:**
- Item qty updated to 15
- Table reflects change

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 13.3: Delete Inventory Item
**Type:** Positive  
**Description:** Verify deleting item  
**Preconditions:** Inventory has 3 items  
**Steps:**
1. Click delete button (🗑️) on item 2
2. Confirm deletion

**Expected:**
- Item removed
- Inventory has 2 items
- Remaining items re-indexed

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 13.4: Cancel Item Delete
**Type:** Positive  
**Description:** Verify cancel on delete confirmation  
**Preconditions:** Inventory has items  
**Steps:**
1. Click delete
2. Click "Cancel" on confirm dialog

**Expected:**
- Item NOT deleted
- Inventory unchanged

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 13.5: Add Item with Empty Name
**Type:** Negative  
**Description:** Verify validation on empty name  
**Steps:**
1. Click "+ Add item"
2. Leave name empty
3. Click "Запази"

**Expected:**
- Alert: "Името е задължително."
- Modal stays open
- Item NOT added

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 13.6: Multiple Items
**Type:** Positive  
**Description:** Verify handling many items  
**Steps:**
1. Add 20 different items

**Expected:**
- All items display in table
- No performance issues
- Edit/delete work on each

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

## 14. PC CHARACTERISTICS

### Test Case 14.1: Add Language
**Type:** Positive  
**Description:** Verify adding language  
**Preconditions:** No languages  
**Steps:**
1. Click "+ Add language"
2. Enter "Common"
3. Click "Запази"

**Expected:**
- Language added to table
- State saved

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 14.2: Edit Language
**Type:** Positive  
**Description:** Verify editing language  
**Preconditions:** Has "Common"  
**Steps:**
1. Click edit on "Common"
2. Change to "Elvish"
3. Save

**Expected:**
- Language updated to "Elvish"

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 14.3: Delete Language
**Type:** Positive  
**Description:** Verify deleting language  
**Steps:**
1. Click delete
2. Confirm

**Expected:**
- Language removed

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 14.4: Add Tool
**Type:** Positive  
**Description:** Verify adding tool proficiency  
**Steps:**
1. Click "+ Add tool"
2. Enter "Brewer's supplies"
3. Save

**Expected:**
- Tool added to table

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 14.5: Personality/Bond/Flaw Textareas
**Type:** Positive  
**Description:** Verify character description fields  
**Steps:**
1. Type in Personality textarea
2. Tab to another field

**Expected:**
- Text saved automatically (on input event)
- State updated

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

## 15. ALIASES & FAMILIARS

### Test Case 15.1: Generate Shenanigan Name
**Type:** Positive  
**Description:** Verify random name generation  
**Preconditions:** shenanigans.json loaded  
**Steps:**
1. Open Shenanigans tab
2. Click "Get Name"

**Expected:**
- Random name appears in field
- Name is from shenanigans.json
- "Save" button enabled

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 15.2: Save Alias
**Type:** Positive  
**Description:** Verify saving alias with context  
**Preconditions:** Name generated  
**Steps:**
1. Click "Save"
2. Enter "На стражата при северната порта"
3. Click "Запази"

**Expected:**
- Alias saved with name, to, and timestamp
- Appears in table
- "Save" button disabled

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 15.3: Delete Alias
**Type:** Positive  
**Description:** Verify deleting alias  
**Steps:**
1. Click 🗑️ on alias

**Expected:**
- Alias removed from table
- State saved

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 15.4: Generate Familiar Name (Category)
**Type:** Positive  
**Description:** Verify familiar name generation by category  
**Preconditions:** familiars.json loaded  
**Steps:**
1. Open Familiar Names tab
2. Click "Feline" button

**Expected:**
- Random name from feline array
- Name appears in field
- "Save" button enabled

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 15.5: Save Familiar with Note
**Type:** Positive  
**Description:** Verify saving familiar  
**Steps:**
1. Generate name (e.g., "Furmidable")
2. Click "Save"
3. Enter note: "Котката на кръчмаря"
4. Save

**Expected:**
- Familiar saved with name, category, note, timestamp
- Appears in table

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 15.6: All Familiar Categories
**Type:** Positive  
**Description:** Verify all 7 categories work  
**Steps:**
1. Click each category button:
   - Feline, Canine, Avian, Rodentia, Creepycrawlies, Aquatic, Arcane
2. Check name output

**Expected:**
- Each category produces valid name from its array

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

## 16. EDGE CASES

### Test Case 16.1: Level 0 (XP negative)
**Type:** Negative  
**Description:** Verify handling of invalid level  
**Steps:**
1. Manually set XP to -1000 (in console or import)

**Expected:**
- Level = 1 (or handled gracefully)
- No divide-by-zero errors

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 16.2: Level 21+ (Beyond max)
**Type:** Positive  
**Description:** Verify handling of extreme XP  
**Steps:**
1. Set XP to 1000000

**Expected:**
- Level = 20 (caps at max)
- All calculations work
- No errors

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 16.3: All Abilities at 1
**Type:** Positive  
**Description:** Verify minimum ability scores  
**Steps:**
1. Set all abilities to 1

**Expected:**
- All modifiers = -5
- AC = 0 (or minimum 1?)
- Max HP = 1 (minimum enforced)
- No crashes

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 16.4: All Abilities at 30
**Type:** Positive  
**Description:** Verify maximum ability scores  
**Steps:**
1. Set all abilities to 30

**Expected:**
- All modifiers = +10
- AC = 30 (10+10+10)
- Max HP very high
- No overflow errors

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 16.5: Empty Name
**Type:** Positive  
**Description:** Verify empty character name  
**Steps:**
1. Clear name field

**Expected:**
- Export filename uses fallback: "hero_timestamp.json"
- No errors

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 16.6: Unicode Name
**Type:** Positive  
**Description:** Verify Unicode character names  
**Preconditions:** Name = "Пийс Ошит 中文 🎲"  
**Steps:**
1. Export

**Expected:**
- Filename preserves Unicode (if possible)
- Or sanitizes to safe characters
- No export errors

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 16.7: Very Large Inventory (100+ items)
**Type:** Positive  
**Description:** Verify performance with many items  
**Steps:**
1. Import file with 100 inventory items

**Expected:**
- All items render
- Edit/delete work
- No lag (or acceptable lag)

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 16.8: Max Integer XP
**Type:** Negative  
**Description:** Verify XP overflow handling  
**Steps:**
1. Set XP to 2147483647 (max 32-bit int)

**Expected:**
- Level = 20
- No errors
- State saves correctly

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 16.9: Fractional XP
**Type:** Negative  
**Description:** Verify XP validation  
**Steps:**
1. Try to enter XP = 150.5

**Expected:**
- Input field rounds or rejects decimals
- Or Math.floor() in code handles it

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 16.10: Special Characters in Text Fields
**Type:** Positive  
**Description:** Verify HTML escaping  
**Steps:**
1. Enter name: `<script>alert('XSS')</script>`
2. Check display and export

**Expected:**
- Text displayed safely (HTML escaped)
- No script execution
- Export contains raw text

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

## 17. INTEGRATION TESTS

### Test Case 17.1: Full Combat Scenario
**Type:** Integration  
**Description:** Simulate combat from full HP to death and resurrect  
**Preconditions:** Level 5, HP = 38/38, Ki = 5/5  
**Steps:**
1. Take 20 damage → HP = 18/38
2. Spend 2 Ki → Ki = 3/5
3. Take 18 damage → HP = 0, unconscious
4. Roll DS fail → dsFail = 1
5. Take hit at 0 → dsFail = 2
6. Roll DS fail → dsFail = 3, dead
7. Resurrect → HP = 1, alive

**Expected:**
- Each step updates state correctly
- Death triggers overlay
- Resurrect works

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 17.2: Level Up Progression
**Type:** Integration  
**Description:** Test leveling from 1 to 5  
**Preconditions:** Level 1, XP = 0  
**Steps:**
1. Set XP = 300 → Level 2, check Ki Max = 2
2. Set XP = 900 → Level 3, check Prof = +2
3. Set XP = 2700 → Level 4, check HD = 4
4. Set XP = 6500 → Level 5, check Prof = +3, MA die = d6

**Expected:**
- All derived values update correctly at each level

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 17.3: Character Creation to Export
**Type:** Integration  
**Description:** Full workflow from scratch  
**Steps:**
1. Clear localStorage
2. Set name, XP, abilities
3. Add skills, inventory, languages
4. Export
5. Verify export contains all data

**Expected:**
- Complete character in export

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 17.4: Import and Modify
**Type:** Integration  
**Description:** Import character and make changes  
**Steps:**
1. Import character (Level 5)
2. Gain 1000 XP → Level 6
3. Take damage
4. Add item to inventory
5. Export again
6. Compare exports

**Expected:**
- All changes reflected in new export

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 17.5: Tab Navigation
**Type:** Integration  
**Description:** Verify all tabs render correctly  
**Steps:**
1. Click each tab button
2. Check content renders
3. Check no console errors

**Expected:**
- All 9 tabs accessible
- Content loads properly
- No render errors

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 17.6: Ability Change Cascade
**Type:** Integration  
**Description:** Verify changing ability updates everything  
**Preconditions:** Level 5, DEX 14  
**Steps:**
1. Change DEX to 18
2. Check all affected values:
   - DEX mod, AC, DEX save, Melee/Ranged atk
   - Acrobatics, Sleight of Hand, Stealth skills

**Expected:**
- All values recalculate correctly

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 17.7: Short Rest → Combat → Long Rest
**Type:** Integration  
**Description:** Full rest cycle  
**Preconditions:** Level 5, HP = 20/38, Ki = 2/5, HD = 3/5  
**Steps:**
1. Short rest, use 2 HD, roll 8 → HP = 32, Ki = 5, HD = 1
2. Combat: take 15 damage, spend 3 Ki → HP = 17, Ki = 2
3. Long rest → HP = 38, Ki = 5, HD = 4

**Expected:**
- All resources managed correctly

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 17.8: beforeunload Handler
**Type:** Integration  
**Description:** Verify navigation warning  
**Steps:**
1. Make any change to state
2. Try to close tab or refresh (F5)

**Expected:**
- Browser shows "Are you sure?" prompt
- Canceling prevents navigation
- Confirming allows navigation

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 17.9: localStorage Persistence
**Type:** Integration  
**Description:** Verify data survives browser restart  
**Steps:**
1. Set character to specific state (note values)
2. Close browser completely
3. Reopen browser and app

**Expected:**
- All data loads correctly from localStorage
- State identical to before close

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

### Test Case 17.10: Export → Clear → Import
**Type:** Integration  
**Description:** Full backup/restore cycle  
**Steps:**
1. Export character
2. Clear localStorage
3. Refresh page (should show defaults)
4. Import exported file

**Expected:**
- Character fully restored
- All data intact

**Actual:** ___  
**Status:** ⬜ Pass | ⬜ Fail

---

## TEST EXECUTION SUMMARY

**Total Test Cases:** 175+

**By Category:**
- State Management: 5
- Derived Values: 12
- Combat System: 11
- Death Saves: 12
- Rest Mechanics: 8
- Ability Scores: 10
- Skills System: 4
- Saving Throws: 5
- Ki System: 6
- HP System: 4
- Feats: 5
- Export/Import: 10
- Inventory: 6
- PC Characteristics: 5
- Aliases & Familiars: 6
- Edge Cases: 10
- Integration Tests: 10

**Test Results:**
- ⬜ Pass: ___
- ⬜ Fail: ___
- ⬜ Blocked: ___

**Date Tested:** _______________  
**Tester:** _______________  
**Notes:** _______________

---

## CRITICAL PATH TESTS (Must Pass!)

These tests are absolutely critical for game play:

1. **Test 1.1** - localStorage Save
2. **Test 1.2** - localStorage Load
3. **Test 2.1** - Level from XP
4. **Test 2.6** - Max HP Calculation
5. **Test 3.2** - Take Damage to 0
6. **Test 3.7** - Heal from 0
7. **Test 4.4** - Death at 3 Fails
8. **Test 4.10** - Resurrect
9. **Test 5.1** - Short Rest Ki Restore
10. **Test 5.5** - Long Rest Full Restore
11. **Test 12.4** - Import v2 Bundle
12. **Test 12.9** - Export-Import Round Trip
13. **Test 17.9** - localStorage Persistence

**If any Critical Path test fails, DO NOT deploy changes!**

---

## REGRESSION TESTING CHECKLIST

Before ANY code change, run these quick smoke tests:

- [ ] Change XP → Level updates
- [ ] Take damage → HP decreases
- [ ] Heal → HP increases
- [ ] Spend Ki → Ki decreases
- [ ] Short rest → Ki refills
- [ ] Long rest → All resources refill
- [ ] Export → Download works
- [ ] Import → Loads correctly
- [ ] Refresh page → Data persists

**If any smoke test fails, investigate before continuing!**

---

END OF TEST SUITE
