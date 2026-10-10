/* Pure checks: Korean money display, growth rules and chart indices match the pipeline rules. */
const assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const F = require(path.resolve('docs/assets/radar-format.js'));

assert.deepEqual(F.money(110794283933), {text: '약 1,108억원', exact: '110,794,283,933원', rounded: true});
assert.equal(F.money(250000000).text, '2.5억원'); assert.equal(F.money(250000000).rounded, false);
assert.equal(F.money(1234567890).text, '약 12.3억원');
assert.equal(F.money(12345678).text, '약 1,235만원');
assert.equal(F.money(9999).text, '9,999원');
assert.equal(F.money(-19600000000).text, '−196억원');
assert.equal(F.money(null).text, '미확인'); assert.equal(F.money(NaN).text, '미확인');
assert.equal(F.signed(12.345), '+12.3'); assert.equal(F.signed(-0.04), '−0.0'); assert.equal(F.signed(0), '±0.0');
assert.deepEqual(F.change(0, 5), {status: 'UNKNOWN', reason: 'ZERO_BASELINE', pct: null, abs: 5});
assert.equal(F.change(null, 5).reason, 'MISSING_OBSERVATION');
assert.equal(F.change(200, 250).pct, 25);
assert.deepEqual(F.indexSeries([200, 210, null, 190, 250]), [100, 105, null, 95, 125]);
assert.deepEqual(F.indexSeries([0, 1, 2]), [null, null, null], 'zero baseline never becomes an index');
const m = F.chartModel(['20252', '20253', '20254', '20261', '20262'], [{key: 'a', label: 'a', index: [100, 110, 120, 130, 140], raw: [1, 2, 3, 4, 5]}]);
assert.ok(m.lo <= 100 && m.hi >= 140 && m.ticks.includes(100));
assert.ok(m.lines[0].points[0].y > m.lines[0].points[4].y, 'higher index plots higher');

// Every committed entity: browser formula reproduces the pipeline's growth values exactly.
const index = JSON.parse(fs.readFileSync('docs/data/opportunity-radar.json', 'utf8'));
let checked = 0;
for (const r of index.entities) {
  const e = Object.fromEntries(index.entity_columns.map((c, i) => [c, r[i]]));
  for (const k of ['sales', 'stores']) for (const [c, i0] of [['yoy', 0], ['qoq', 1]]) {
    const status = e[`${k}_${c}_status`];
    if (status === 'BLOCKED') { assert.equal(e[`${k}_${c}_pct`], null); continue; }
    const ch = F.change(e[k][i0], e[k][2]);
    assert.equal(ch.status === 'OK' ? 'OK' : ch.reason, status, `${e.domain}:${e.area_id}:${e.industry_id}:${k}_${c}`);
    assert.equal(ch.pct, e[`${k}_${c}_pct`]); checked++;
  }
}
console.log('RADAR_MODELS_PASS checked=' + checked);
