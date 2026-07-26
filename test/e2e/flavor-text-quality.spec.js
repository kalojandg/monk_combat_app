import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Качество на текста във флейвър JSON-ите.
// Не иска браузър — чете файловете директно.
//
// ЗАЩО: репликите се четат на глас през Google TTS. Неща, които на екран минават
// незабелязано, чупят изговора — латинско "o" вътре в кирилска дума кара модела да
// прочете съвсем друга дума, а точка насред съкращение реже репликата. Русизмите и
// осиротелите кавички идват от копиране и от генериране с AI.
// Тези дефекти вече са се появявали ТРИ пъти с нови партиди реплики, затова е тест,
// а не ръчна проверка. Виж TTS-SETUP.md т. 7 за правилата при писане.

const ROOT = path.resolve(__dirname, '../..');
const FILES = ['one-liners.json', 'excuses.json', 'insults.json', 'dark-jokes.json', 'tasha-jokes.json'];

function allLines() {
  const out = [];
  for (const f of FILES) {
    const d = JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
    if (Array.isArray(d)) d.forEach(s => out.push({ f, s: String(s) }));
    else Object.entries(d).forEach(([k, v]) => (v || []).forEach(s => out.push({ f, k, s: String(s) })));
  }
  return out;
}

// Показва провинилите се реплики в съобщението за грешка — иначе тестът е безполезен.
function report(hits) {
  return '\n' + hits.map(h => `  [${h.f}] ${h.why ? '«' + h.why + '» ' : ''}${h.s}`).join('\n') + '\n';
}

const LINES = allLines();

test.describe('Flavor текстове — качество за четене на глас', () => {

  test('няма русизми', () => {
    // Само думи, които НЕ съществуват в българския — споделените (просто, работа,
    // пиво, там) нарочно липсват, за да няма фалшиви попадения.
    const RU = ['уже', 'один', 'одна', 'одно', 'сейчас', 'очень', 'можно', 'нельзя', 'всегда',
      'никогда', 'тоже', 'здесь', 'если', 'чтобы', 'потому', 'хорошо', 'спасибо', 'значит',
      'конечно', 'вообще', 'слишком', 'почему', 'зачем', 'сколько', 'откуда', 'ещё'];
    const hits = [];
    for (const x of LINES) {
      for (const w of RU) {
        if (new RegExp('(^|[^А-Яа-яA-Za-z])' + w + '([^А-Яа-яA-Za-z]|$)', 'i').test(x.s)) hits.push({ ...x, why: w });
      }
    }
    expect(hits, report(hits)).toHaveLength(0);
  });

  test('няма смесени азбуки в една дума', () => {
    // напр. "дракoнов" с латинско o — невидимо на екран, но моделът чете друга дума
    const LAT = /[A-Za-z]/, CYR = /[А-Яа-яЁё]/;
    const hits = [];
    for (const x of LINES) {
      for (const w of x.s.split(/[\s.,!?;:„“”"'()\-–—…/]+/)) {
        if (w.length > 1 && LAT.test(w) && CYR.test(w)) hits.push({ ...x, why: w });
      }
    }
    expect(hits, report(hits)).toHaveLength(0);
  });

  test('няма съкращения с точка (т.к, т.че)', () => {
    // Точката насред съкращението обърква изговора — пиши го с цели думи.
    const hits = LINES.filter(x => /[А-Яа-я]\.[а-я]|\bт\.\s*[кче]/i.test(x.s));
    expect(hits, report(hits)).toHaveLength(0);
  });

  test('няма осиротели кавички', () => {
    // Валидни двойки: български „…“ и английски “…”. Нечетен брой = сирак.
    const hits = LINES.filter(x => ((x.s.match(/[„“”]/g) || []).length) % 2);
    expect(hits, report(hits)).toHaveLength(0);
  });

  test('тиретата са с интервали от двете страни или от нито една', () => {
    // "дишаш- мисля" губи паузата; "по-силен" е съставна дума и е наред.
    const hits = LINES.filter(x => /[^\s][-–—]\s|\s[-–—][^\s]/.test(x.s));
    expect(hits, report(hits)).toHaveLength(0);
  });

  test('няма разбъркана пунктуация и интервали', () => {
    const hits = LINES.filter(x =>
      /[!?][.,](?!\.)|[.,][!?]/.test(x.s) ||   // "тук!." — но "?..." е нарочно
      /\s[.,!?;:]/.test(x.s) ||                // интервал ПРЕДИ пунктуация
      /[,;:][A-Za-zА-Яа-я]/.test(x.s) ||       // липсващ интервал СЛЕД запетая
      / {2,}/.test(x.s) ||
      x.s !== x.s.trim());
    expect(hits, report(hits)).toHaveLength(0);
  });

  test('всяка реплика се побира в лимита на една TTS заявка', () => {
    // Google Cloud TTS: 5000 байта на заявка.
    const hits = LINES.filter(x => Buffer.byteLength(x.s, 'utf8') > 4500)
      .map(x => ({ ...x, why: Buffer.byteLength(x.s, 'utf8') + 'B' }));
    expect(hits, report(hits)).toHaveLength(0);
  });
});
