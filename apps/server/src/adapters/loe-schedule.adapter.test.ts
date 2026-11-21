import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseLoeScheduleHtml } from './loe-schedule.adapter.js';

const REAL_LOE_HTML = `<div><p><b>Графік погодинних відключень на 21.11.2026</b></p>
<p><b>Інформація станом на 17:44 21.11.2026</b></p>
<p>Група 1.1. Електроенергії немає з 21:30 до 24:00.</p>
<p>Група 1.2. Електроенергія є.</p>
<p>Група 2.1. Електроенергії немає з 00:00 до 00:30.</p>
<p>Група 2.2. Електроенергії немає з 00:00 до 00:30.</p>
<p>Група 3.1. Електроенергія є.</p>
<p>Група 3.2. Електроенергії немає з 00:30 до 01:30.</p>
<p>Група 4.1. Електроенергії немає з 21:30 до 24:00.</p>
<p>Група 4.2. Електроенергія є.</p>
<p>Група 5.1. Електроенергії немає з 21:30 до 24:00.</p>
<p>Група 5.2. Електроенергії немає з 21:30 до 24:00.</p>
<p>Група 6.1. Електроенергії немає з 00:00 до 00:30, з 21:30 до 24:00.</p>
<p>Група 6.2. Електроенергія є.</p>
</div>`;

describe('parseLoeScheduleHtml', () => {
  it('коректно парсить реальну відповідь Львівобленерго у 48 півгодинних слотів', () => {
    const parsed = parseLoeScheduleHtml(REAL_LOE_HTML);
    assert.ok(parsed);
    assert.equal(parsed.date, '2026-11-21');
    assert.equal(parsed.sourceInfo, 'Інформація станом на 17:44 21.11.2026');

    const g11 = parsed.groups['1.1'];
    assert.ok(g11);
    assert.equal(g11.length, 48);
    assert.equal(g11[42], 'on'); // 21:00-21:30
    assert.equal(g11[43], 'off'); // 21:30-22:00
    assert.equal(g11[47], 'off'); // 23:30-24:00

    const g12 = parsed.groups['1.2'];
    assert.ok(g12);
    assert.ok(g12.every((slot) => slot === 'on'));

    const g61 = parsed.groups['6.1'];
    assert.ok(g61);
    assert.equal(g61[0], 'off'); // 00:00-00:30
    assert.equal(g61[1], 'on'); // 00:30-01:00
    assert.equal(g61[43], 'off'); // 21:30-22:00
    assert.equal(g61[47], 'off'); // 23:30-24:00
  });

  it('повертає null для порожнього HTML (коли графік на завтра не опублікований)', () => {
    assert.equal(parseLoeScheduleHtml(''), null);
    assert.equal(parseLoeScheduleHtml(null), null);
  });
});
