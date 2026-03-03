// ===== Taunts – Unit Tests =====
// Simple assertion-based tests; no external library.
// Run with: node test/taunts.unit.js

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
  assert(
    actual === expected,
    `${message}  (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`
  );
}

function assertContains(str, substr, message) {
  assert(
    typeof str === 'string' && str.includes(substr),
    `${message}  (expected to contain: "${substr}")`
  );
}

function assertNotContains(str, substr, message) {
  assert(
    typeof str === 'string' && !str.includes(substr),
    `${message}  (must NOT contain: "${substr}")`
  );
}

// ── Pure functions under test (mirrored from modules/taunts.js) ─
// Keeping them inline so the tests have zero runtime deps and can
// serve as the canonical spec before the module is implemented.

function hpStateFromCurrentHp(currentHp, maxHp) {
  if (!maxHp || maxHp <= 0) return 'confident';
  return currentHp > maxHp * 0.5 ? 'confident' : 'desperate';
}

const STYLE_RULES = {
  drunken:       'Style: speak with the wisdom of fermented grain. Alcohol metaphors welcome.',
  direct:        'Style: cutting personal insult aimed at one enemy only.',
  enlightenment: 'Style: fake profound Zen wisdom laced with contempt.',
  ranged:        'Style: you are far away – lure ONE enemy toward you personally.',
};

function buildTauntPrompt(style, hpState) {
  const toneRule = hpState === 'confident'
    ? 'Tone: playful dominance – you are winning and you know it.'
    : 'Tone: reckless wisdom – you are wounded but utterly fearless.';

  return [
    'You are Peace Oshiet, a drunken master monk.',
    '',
    'Generate ONE short combat taunt (max 14 words).',
    '',
    'All output MUST be in Bulgarian.',
    'Do not include English words.',
    'No explanation. No markdown. Single line only.',
    '',
    'Distract enemies away from the tank.',
    'Encourage single-target attack rolls.',
    'Never encourage area attacks.',
    'Never say "всички".',
    'Avoid triggering area spells.',
    'Do not reference spell mechanics.',
    '',
    toneRule,
    STYLE_RULES[style] || '',
    'Occasional alcohol philosophy.',
    'Occasional implication: "само да не дойда там".',
  ].join('\n');
}

function ensureNoFireballEncouragement(prompt) {
  // Strip the safety-rule prohibition phrase before scanning – the word
  // "всички" is allowed inside "Never say "всички"" (that's the guard).
  const withoutProhibition = prompt.replace('Never say "всички"', '');
  return (
    !withoutProhibition.includes('всички') &&
    !prompt.toLowerCase().includes('fireball')
  );
}

// ── Tests: hpStateFromCurrentHp ────────────────────────────────

console.log('\n=== hpStateFromCurrentHp ===');

assertEqual(hpStateFromCurrentHp(10, 10), 'confident', 'full HP → confident');
assertEqual(hpStateFromCurrentHp(6,  10), 'confident', '60 % HP → confident');
assertEqual(hpStateFromCurrentHp(5,  10), 'desperate', 'exactly 50 % HP → desperate');
assertEqual(hpStateFromCurrentHp(4,  10), 'desperate', '40 % HP → desperate');
assertEqual(hpStateFromCurrentHp(1,  10), 'desperate', '10 % HP → desperate');
assertEqual(hpStateFromCurrentHp(0,  10), 'desperate', '0 HP → desperate');
assertEqual(hpStateFromCurrentHp(1,   0), 'confident', 'maxHp = 0 → fallback confident');
assertEqual(hpStateFromCurrentHp(0,   0), 'confident', 'both 0 → fallback confident');

// ── Tests: buildTauntPrompt – style injection ──────────────────

console.log('\n=== buildTauntPrompt – style injection ===');

const drunkenPrompt = buildTauntPrompt('drunken', 'confident');
assertContains(drunkenPrompt,    'fermented grain',    'drunken → fermented grain');
assertContains(drunkenPrompt,    'Alcohol metaphors',  'drunken → alcohol metaphors');

const directPrompt = buildTauntPrompt('direct', 'confident');
assertContains(directPrompt,     'personal insult',    'direct → personal insult');
assertContains(directPrompt,     'one enemy only',     'direct → one enemy only');

const enlightenmentPrompt = buildTauntPrompt('enlightenment', 'desperate');
assertContains(enlightenmentPrompt, 'Zen wisdom',      'enlightenment → Zen wisdom');
assertContains(enlightenmentPrompt, 'contempt',        'enlightenment → contempt');

const rangedPrompt = buildTauntPrompt('ranged', 'desperate');
assertContains(rangedPrompt,     'lure ONE enemy',     'ranged → lure ONE enemy');
assertContains(rangedPrompt,     'far away',           'ranged → far away');

// ── Tests: buildTauntPrompt – HP state tones ──────────────────

console.log('\n=== buildTauntPrompt – hp state tones ===');

const confidentPrompt = buildTauntPrompt('direct', 'confident');
assertContains(confidentPrompt,     'playful dominance', 'confident → playful dominance');
assertNotContains(confidentPrompt,  'reckless wisdom',   'confident → no reckless wisdom');

const desperatePrompt = buildTauntPrompt('direct', 'desperate');
assertContains(desperatePrompt,     'reckless wisdom',   'desperate → reckless wisdom');
assertNotContains(desperatePrompt,  'playful dominance', 'desperate → no playful dominance');

// ── Tests: buildTauntPrompt – safety rules always present ─────

console.log('\n=== buildTauntPrompt – safety rules ===');

['drunken', 'direct', 'enlightenment', 'ranged'].forEach(style => {
  const p = buildTauntPrompt(style, 'confident');
  assertContains(p, 'Never encourage area attacks',  `${style}: no area attacks`);
  assertContains(p, 'Never say "всички"',             `${style}: no "всички"`);
  assertContains(p, 'single-target',                 `${style}: single-target present`);
  assertContains(p, 'Bulgarian',                     `${style}: Bulgarian output required`);
  assertContains(p, 'Peace Oshiet',                  `${style}: character name present`);
});

// ── Tests: ensureNoFireballEncouragement ──────────────────────

console.log('\n=== ensureNoFireballEncouragement ===');

assert(
  ensureNoFireballEncouragement(buildTauntPrompt('drunken', 'confident')),
  'drunken/confident prompt is clean'
);
assert(
  ensureNoFireballEncouragement(buildTauntPrompt('ranged', 'desperate')),
  'ranged/desperate prompt is clean'
);
assert(
  !ensureNoFireballEncouragement('хвърли fireball по всички!'),
  'dirty prompt is correctly flagged'
);
assert(
  !ensureNoFireballEncouragement('атакувай всички в стаята'),
  '"всички" alone is flagged'
);

// ── Summary ───────────────────────────────────────────────────

const total = passed + failed;
console.log(`\n${'─'.repeat(44)}`);
console.log(`  Tests: ${total}  |  ✓ Passed: ${passed}  |  ✗ Failed: ${failed}`);
console.log(`${'─'.repeat(44)}\n`);

if (failed > 0) process.exit(1);
