// ===== Taunts – Unit Tests =====
// No external library. Run with: node test/taunts.unit.js
'use strict';

// ── Assert helpers ─────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓  ${message}`);
    passed++;
  } else {
    console.error(`  ✗  ${message}`);
    failed++;
  }
}

function assertEqual(actual, expected, message) {
  assert(actual === expected,
    `${message}  (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`);
}

function assertNotContains(str, substr, message) {
  assert(typeof str === 'string' && !str.includes(substr),
    `${message}  (must NOT contain: "${substr}")`);
}

// ── Functions under test (mirrored exactly from taunts.js) ────

function hpStateFromCurrentHp(currentHp, maxHp) {
  return currentHp > maxHp * 0.5 ? 'confident' : 'desperate';
}

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const fragments = {
  opener: [
    'Спокойно', 'Полека', 'Айде де', 'Хайде, герой',
    'Внимавай', 'Моля те', 'Опитай пак', 'Не се напрягай',
  ],
  rangedFocus: [
    'прицелявай се внимателно', 'стреляй пак', 'само не трепери',
    'да видим този изстрел', 'покажи ми как пропускаш',
    'цели се сам', 'не обвинявай вятъра',
  ],
  targetIsolation: [
    'Сам срещу мен си по-смел.', 'Един по един, моля.',
    'Обичам личното внимание.', 'Самотните удари са по-честни.',
    'Няма нужда от публика.',
  ],
  alcoholWisdom: [
    'Трезвеността ти е по-опасна от мен.',
    'Алкохолът учи на баланс.', 'Пиян съм, но стабилен.',
    'Чашата ми има повече точност.',
    'Мъдростта идва след третия пропуск.',
    'Наздраве за следващия ти неуспех.',
  ],
  insultCore: [
    'Дори сянката ти се цели по-добре.',
    'Стрелата ти се срамува.', 'Това ли наричаш умение?',
    'И баба ми хвърля по-смело.',
    'Честта ти е по-разклатена от стойката ти.',
    'Очите ти ли треперят?',
  ],
  zenCore: [
    'Болката е временна.', 'Пропускът е истина.',
    'Балансът липсва.', 'Срамът е учител.',
    'Търпението ми намалява.', 'Истината реже по-дълбоко.',
  ],
  desperateEdge: [
    'Само да не дойда там.', 'Не ме карай да се приближа.',
    'Остани далеч, по-безопасно е.', 'Не ме изпитвай.',
    'Ще ти обясня лично.',
  ],
  confidentEnd: [
    'Спокойно, имаш време да се изложиш.', 'Опитай пак, забавно е.',
    'Ще почакам.', 'Не бързай, пак ще пропуснеш.',
    'Не се притеснявай, свикнал съм.',
  ],
};

function buildSentence(style, hpState) {
  const parts = [];
  if (style === 'ranged') {
    parts.push(random(fragments.opener));
    parts.push(random(fragments.rangedFocus));
    parts.push(random(fragments.targetIsolation));
  }
  if (style === 'drunken')  parts.push(random(fragments.alcoholWisdom));
  if (style === 'insult')   parts.push(random(fragments.insultCore));
  if (style === 'zen')      parts.push(random(fragments.zenCore));
  if (hpState === 'desperate' && Math.random() > 0.4) parts.push(random(fragments.desperateEdge));
  if (hpState === 'confident' && Math.random() > 0.4) parts.push(random(fragments.confidentEnd));
  return parts.join(' ');
}

function generateTaunt(style, currentHp, maxHp) {
  return buildSentence(style, hpStateFromCurrentHp(currentHp, maxHp));
}

// ── Tests: hpStateFromCurrentHp ────────────────────────────────

console.log('\n=== hpStateFromCurrentHp ===');

assertEqual(hpStateFromCurrentHp(10, 10), 'confident', 'full HP → confident');
assertEqual(hpStateFromCurrentHp(6,  10), 'confident', '60% HP → confident');
assertEqual(hpStateFromCurrentHp(5,  10), 'desperate', 'exactly 50% → desperate');
assertEqual(hpStateFromCurrentHp(4,  10), 'desperate', '40% → desperate');
assertEqual(hpStateFromCurrentHp(0,  10), 'desperate', '0 HP → desperate');
assertEqual(hpStateFromCurrentHp(1,   0), 'confident', 'currentHp=1 maxHp=0 → confident (1 > 0)');
assertEqual(hpStateFromCurrentHp(0,   0), 'desperate', 'both 0 → desperate (0 > 0 = false)');

// ── Tests: generateTaunt – non-empty for all styles ────────────

console.log('\n=== generateTaunt – non-empty output ===');

['drunken', 'insult', 'zen', 'ranged'].forEach(style => {
  const outConf = generateTaunt(style, 10, 10);
  const outDesp = generateTaunt(style, 3, 10);
  assert(typeof outConf === 'string' && outConf.length > 0, `${style}/confident → non-empty string`);
  assert(typeof outDesp === 'string' && outDesp.length > 0, `${style}/desperate → non-empty string`);
});

// ── Tests: ranged style has 3-part base output ─────────────────

console.log('\n=== generateTaunt – ranged is multi-part ===');

// Seed-test: run 20 times without desperate/confident appends.
// Ranged baseline = opener + rangedFocus + targetIsolation (3 words minimum).
for (let i = 0; i < 20; i++) {
  const out = generateTaunt('ranged', 10, 10); // confident (no desperate appends)
  assert(out.split(' ').length >= 3, `ranged run ${i + 1}: at least 3 tokens`);
}

// ── Tests: no AoE-encouraging fragments ────────────────────────

console.log('\n=== fragment safety – no AoE language ===');

const BANNED = ['всички', 'fireball', 'гръмотевица', 'cone', 'blast'];
const allFragments = Object.values(fragments).flat();

allFragments.forEach(text => {
  BANNED.forEach(banned => {
    assertNotContains(text.toLowerCase(), banned,
      `"${text.substring(0, 30)}…" is free of "${banned}"`);
  });
});

// ── Tests: targetIsolation fragments encourage single-target ───

console.log('\n=== targetIsolation – single-target psychology ===');

const SINGLE_TARGET_HINTS = ['сам', 'един', 'лично', 'самотни', 'публика'];
fragments.targetIsolation.forEach(text => {
  const lower = text.toLowerCase();
  const hasSingleTarget = SINGLE_TARGET_HINTS.some(hint => lower.includes(hint));
  assert(hasSingleTarget, `targetIsolation: "${text}" implies single target`);
});

// ── Tests: desperate mode appends edge phrases sometimes ───────

console.log('\n=== desperate mode – appends desperateEdge ===');

let desperateHits = 0;
for (let i = 0; i < 100; i++) {
  const out = generateTaunt('insult', 3, 10); // 30% HP → always desperate
  const hasEdge = fragments.desperateEdge.some(e => out.includes(e));
  if (hasEdge) desperateHits++;
}
// With p=0.6 chance of appending, expect ~60 hits out of 100
assert(desperateHits > 20, `desperate mode appended edge phrase in ${desperateHits}/100 runs (expected >20)`);
assert(desperateHits < 100, `desperate appends are not always forced (${desperateHits}/100 < 100)`);

// ── Summary ───────────────────────────────────────────────────

console.log(`\n${'─'.repeat(46)}`);
console.log(`  Tests: ${passed + failed}  |  ✓ Passed: ${passed}  |  ✗ Failed: ${failed}`);
console.log(`${'─'.repeat(46)}\n`);

if (failed > 0) process.exit(1);
