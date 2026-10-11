/* Opportunity Radar v2 journeys on the committed live bundle; failures are explicit synthetic network doubles. */
const {chromium} = require('playwright'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const F = require(path.resolve('docs/assets/radar-format.js'));
const base = process.env.GIS_TEST_URL || 'http://127.0.0.1:8765/SideEconomyLab/';
const output = process.env.RADAR_SCREENSHOTS || '/tmp/radar-browser'; fs.mkdirSync(output, {recursive: true});
const index = JSON.parse(fs.readFileSync('docs/data/opportunity-radar.json', 'utf8'));
const rows = index.entities.map(r => Object.fromEntries(index.entity_columns.map((c, i) => [c, r[i]])));
const domain = id => index.domains.find(d => d.id === id);
const industryName = new Map(index.industries);
(async () => {
  const browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}}), errors = [], requests = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('request', r => requests.push({url: r.url(), method: r.method()}));
  for (const [url, file] of [['https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'leaflet/dist/leaflet.js'], ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'leaflet/dist/leaflet.css'], ['https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.11.0/proj4.js', 'proj4/dist/proj4.js']]) await page.route(url, r => r.fulfill({path: require.resolve(file)}));
  await page.route('https://*.tile.openstreetmap.org/**', r => r.abort());
  const ready = () => page.waitForFunction(() => typeof state !== 'undefined' && state.data && document.querySelector('#radar-market h3'));
  const marketText = () => page.locator('#radar-market').innerText();
  const detailRequests = () => requests.filter(r => /opportunity-radar-details/.test(r.url)).length;
  const district = domain('district'), districtVerified = district.gates.temporal.status === 'VERIFIED';
  try {
    await page.goto(base); await ready();
    assert.equal(await page.evaluate(() => document.body.dataset.workspace), 'radar');
    assert.equal(await page.locator('[data-workspace-nav]').count(), 3);
    assert.ok(!await page.locator('.map-wrap').isVisible(), 'radar shows the source-geography view, not unverified map joins');
    assert.ok(!requests.some(r => /decision-evidence\.json|source\.json\.gz/.test(r.url)), 'heavy evidence and raw snapshots stay lazy');
    assert.equal(detailRequests(), 0, 'no per-area detail before an area is selected');
    // Default: district view of the industry with largest baseline spending (neutral rule).
    const totals = new Map(); for (const e of rows) if (e.domain === 'district' && Number.isFinite(e.sales[0])) totals.set(e.industry_id, (totals.get(e.industry_id) || 0) + e.sales[0]);
    const defaultInd = [...totals].sort((a, b) => b[1] - a[1])[0][0];
    assert.equal(await page.locator('#radar-industry').inputValue(), defaultInd);
    const ranked = rows.filter(e => e.domain === 'district' && e.industry_id === defaultInd);
    assert.equal(await page.locator('.radar-rank li').count(), ranked.length);
    // District-level comparison counts DISTRICTS (not "곳"), with counts that match the committed data.
    const dirCount = (list, key) => [list.filter(e => e[key + '_yoy_status'] === 'OK' && e[key + '_yoy_pct'] > 0).length, list.filter(e => e[key + '_yoy_status'] === 'OK' && e[key + '_yoy_pct'] < 0).length];
    const cards = await page.locator('.radar-cards').first().innerText();
    const [su, sd] = dirCount(ranked, 'sales'), [tu, td] = dirCount(ranked, 'stores');
    assert.ok(cards.includes(`${su}개 자치구 증가 · ${sd}개 자치구 감소`) && cards.includes(`${tu}개 자치구 증가 · ${td}개 자치구 감소`), 'district counts are districts');
    assert.ok(!/\d곳/.test(cards) && !cards.includes('개 업종 증가'), 'no ambiguous 곳 / industry wording in a district comparison');
    assert.ok(cards.includes('자치구별 변화율의 중앙값'), 'median is described as a median of district change rates');
    const dirNote = await page.locator('.radar-dir-note').innerText();
    assert.ok(dirNote.includes('방향') && dirNote.includes('좋고 나쁨을 뜻하지 않습니다') && dirNote.includes('합계의 증가율이 아닙니다'));
    // Up/down colours are a neutral direction pair: never red/green (which read as bad/good).
    const colours = await page.evaluate(() => { const rgb = el => getComputedStyle(el).color.match(/\d+/g).map(Number); const up = document.querySelector('.radar-rank b[data-tone=up]'), down = document.querySelector('.radar-rank b[data-tone=down]'); return {up: up && rgb(up), down: down && rgb(down), upText: up?.textContent, downText: down?.textContent}; });
    for (const [name, c] of [['up', colours.up], ['down', colours.down]]) { assert.ok(c, name + ' present'); const [r, g, b] = c; assert.ok(!(r > g + 40 && r > b + 40) && !(g > r + 20 && g > b + 20), `${name} colour is not red/green: ${c}`); }
    assert.ok(colours.upText.startsWith('▲') && colours.downText.startsWith('▼'), 'direction also carried by arrows, not colour alone');
    for (const e of ranked) {
      const name = district.areas.find(a => a[0] === e.area_id)[1];
      const text = await page.locator('.radar-rank li', {hasText: name}).first().innerText();
      if (e.sales_yoy_status === 'OK') assert.ok(text.includes(F.signed(e.sales_yoy_pct) + '%'), `ranking pct ${name}`);
    }
    if (districtVerified) {
      const headline = await page.locator('#radar-headline').innerText();
      assert.ok(headline.includes('추가 조사 후보'));
      assert.ok(!headline.includes('서울 전체 중앙값'), 'no ambiguous Seoul-wide median');
      const ctx = district.context;
      assert.ok(headline.includes('조합별 1년 변화율의 중앙값') && headline.includes('서울 전체 소비·점포의 증가율이 아닙니다'));
      assert.ok(headline.includes(`소비 ${F.signed(ctx.median_sales_yoy_pct, 2)}%(${ctx.comparable_sales.toLocaleString('ko-KR')}개 조합)`) && headline.includes(`점포 ${F.signed(ctx.median_stores_yoy_pct, 2)}%(${ctx.comparable_stores.toLocaleString('ko-KR')}개 조합)`));
    }
    await page.screenshot({path: output + '/desktop-overview.png'});
    fs.writeFileSync(output + '/initial-load.json', JSON.stringify(await page.evaluate(() => ({navigation: performance.getEntriesByType('navigation').map(e => ({domContentLoaded_ms: e.domContentLoadedEventEnd, load_ms: e.loadEventEnd})), public_json: performance.getEntriesByType('resource').filter(e => e.name.includes('/data/')).map(e => ({file: new URL(e.name).pathname.split('/').at(-1), encoded_bytes: e.encodedBodySize, transfer_bytes: e.transferSize}))})), null, 2));

    // Findings: every listed card is an eligible signal with consistent numbers.
    const findings = rows.filter(e => e.finding);
    assert.equal(await page.locator('#radar-result-count').innerText(), findings.length.toLocaleString('ko-KR') + '건');
    await page.selectOption('#radar-scope', 'selection');
    assert.equal(await page.locator('#radar-result-count').innerText(), findings.filter(e => e.domain === 'district' && e.industry_id === defaultInd).length.toLocaleString('ko-KR') + '건');
    await page.selectOption('#radar-scope', 'all');
    for (const e of findings) assert.ok(e.sales_yoy_status === 'OK' || ['expansion', 'contraction'].includes(e.flow));
    assert.ok(!findings.some(e => domain(e.domain).gates.temporal.status !== 'VERIFIED'), 'blocked geography never yields a finding');
    if (findings.length) {
      await page.selectOption('#radar-pattern', '');
      assert.equal(await page.locator('#radar-sort').inputValue(), 'size');
      const firstSize = JSON.parse(await page.locator('.radar-item').first().getAttribute('data-radar-finding'));
      const bySize = [...findings].sort((a, b) => (a.extreme - b.extreme) || (b.sales[0] ?? 0) - (a.sales[0] ?? 0))[0];
      assert.equal(firstSize.area + ':' + firstSize.industry, `${bySize.domain}:${bySize.area_id}:${bySize.industry_id}`, 'default reading order: larger baseline markets');
      await page.selectOption('#radar-sort', 'sales');
      const card = page.locator('.radar-item').first();
      const target = JSON.parse(await card.getAttribute('data-radar-finding'));
      const e = rows.find(x => `${x.domain}:${x.area_id}` === target.area && x.industry_id === target.industry);
      const top = [...findings].sort((a, b) => (a.extreme - b.extreme) || Math.abs(b.sales_yoy_pct ?? 0) - Math.abs(a.sales_yoy_pct ?? 0))[0];
      assert.equal(e.extreme, false, 'extreme jumps are not the first thing a user reads');
      assert.equal(Math.abs(e.sales_yoy_pct ?? 0), Math.abs(top.sales_yoy_pct ?? 0), 'sorted by explicit metric, not a composite score');
      const ctext = await card.innerText();
      for (const label of ['왜', '다른 설명', '다음 확인']) assert.ok(ctext.includes(label), label);
      await page.selectOption('#radar-pattern', 'extreme');
      assert.equal(await page.locator('#radar-result-count').innerText(), findings.filter(x => x.extreme).length.toLocaleString('ko-KR') + '건');
      if (findings.some(x => x.extreme)) assert.ok((await page.locator('.radar-item').first().innerText()).includes('원자료 먼저 확인'));
      await page.selectOption('#radar-pattern', '');
      await card.click(); await page.waitForFunction(() => document.querySelector('#radar-chart svg, #radar-chart table'));
      assert.equal(detailRequests(), 1);
      const t = await marketText();
      assert.ok(t.includes(F.signed(e.sales_yoy_pct) + '%'), 'card pct'); assert.ok(t.includes(F.money(e.sales[0]).text) && t.includes(F.money(e.sales[2]).text), 'readable money');
      assert.ok(!/\d{9,}원/.test(t.split('원값 보기')[0]), 'no huge raw won values in the summary');
      // Chart/table consistency with the lazily loaded official detail.
      const detail = JSON.parse(fs.readFileSync(`docs/data/opportunity-radar-details/${e.domain}-${e.area_id}.json`, 'utf8'));
      const hist = detail.industries[e.industry_id].history;
      assert.equal(hist[0].sales, e.sales[0]); assert.equal(hist[4].sales, e.sales[2]); assert.equal(hist[4].stores, e.stores[2]);
      const idx = F.indexSeries(hist.map(h => h.sales));
      assert.ok(Math.abs(idx[4] - 100 - e.sales_yoy_pct) < 0.011, 'index end − 100 equals YoY growth');
      assert.equal(await page.locator('#radar-chart svg path.line-sales').count(), 1); assert.equal(await page.locator('#radar-chart svg circle.dot-sales').count(), hist.filter(h => Number.isFinite(h.sales)).length);
      const titles = await page.locator('#radar-chart circle.dot-sales title').allTextContents();
      assert.ok(titles[4].includes(hist[4].sales.toLocaleString('ko-KR') + '원'), 'tooltip keeps the original value');
      await page.locator('.radar-raw summary').click();
      const table = await page.locator('.radar-raw table').innerText();
      for (const h of hist) if (Number.isFinite(h.sales)) assert.ok(table.includes(h.sales.toLocaleString('ko-KR')), 'exact original values');
      await page.locator('#radar-chart circle.dot-stores').last().focus(); assert.ok((await page.locator('#radar-point-detail').innerText()).includes('점포'));
      await page.locator('.radar-gate summary').click(); assert.ok((await page.locator('.radar-gate').innerText()).includes('지도'));
      await page.screenshot({path: output + '/selected-market.png', fullPage: false});
      // Comparison period: QoQ uses the previous quarter and never reuses YoY numbers.
      await page.selectOption('#radar-compare', 'qoq');
      if (e.sales_qoq_status === 'OK') assert.ok((await marketText()).includes(F.signed(e.sales_qoq_pct) + '%'));
      assert.ok((await page.locator('#radar-source-state').innerText()).includes('전년 같은 분기'));
      await page.selectOption('#radar-compare', 'yoy');
      // Area → industry ranking and back.
      await page.locator('[data-radar-up]').click(); assert.ok((await marketText()).includes('업종별 변화'));
      // Within-district comparison counts INDUSTRIES.
      const inArea = rows.filter(x => x.domain === e.domain && x.area_id === e.area_id), areaCards = await page.locator('.radar-cards').first().innerText();
      const [au, ad] = dirCount(inArea, 'sales');
      assert.ok(areaCards.includes(`${au}개 업종 증가 · ${ad}개 업종 감소`) && !areaCards.includes('개 자치구 증가') && areaCards.includes('업종별 변화율의 중앙값'), 'industry counts are industries');
    }

    // Blocked commercial-area domain: observations visible, comparison and trend line disabled.
    const ca = domain('commercial_area');
    if (ca && ca.gates.temporal.status !== 'VERIFIED') {
      await page.selectOption('#radar-area', 'commercial_area:3001492'); await page.selectOption('#radar-industry', 'CS100001');
      await page.waitForFunction(() => document.querySelector('#radar-chart table'));
      const t = await marketText();
      assert.ok(t.includes('비교 보류')); assert.equal(await page.locator('#radar-chart svg').count(), 0, 'no trend line without temporal gate');
      const e = rows.find(x => x.domain === 'commercial_area' && x.area_id === '3001492' && x.industry_id === 'CS100001');
      assert.ok(t.includes(F.money(e.sales[2]).text));
      await page.screenshot({path: output + '/blocked-geography.png'});
    }

    // Handoff keeps map selection and candidate; never writes private data.
    await page.selectOption('#radar-area', 'district:*');
    const originalArea = await page.evaluate(() => state.selectedArea?.trdar_cd);
    await page.selectOption('#candidate', 'vending');
    await page.locator('.radar-rank button').first().click(); await page.waitForFunction(() => document.querySelector('#radar-handoff'));
    await page.locator('#radar-handoff').click(); await page.waitForFunction(() => document.querySelectorAll('.di-play').length === 4);
    assert.equal(await page.evaluate(() => state.selectedArea?.trdar_cd), originalArea);
    assert.equal(await page.locator('#candidate').inputValue(), 'vending');
    assert.ok(requests.some(r => r.url.endsWith('decision-evidence.json')));
    assert.equal(await page.evaluate(() => localStorage.length), 0, 'research handoff must not fabricate private sites/scenarios');
    await page.click('#wb-toggle'); assert.ok(await page.locator('#workbench').isVisible());
    await page.goBack(); await page.waitForFunction(() => document.body.dataset.workspace === 'radar');
    assert.equal(await page.evaluate(() => document.body.dataset.workbench), 'false');
    await page.click('[data-workspace-nav=region]'); assert.ok(await page.locator('#map').isVisible()); assert.ok(await page.locator('#selected-card').isVisible());
    assert.equal(await page.evaluate(() => state.adapter.layers.demand.getLayers().length > 12), true, 'region analysis restores the full existing map');
    await page.goBack(); await page.waitForFunction(() => document.body.dataset.workspace === 'radar');

    // Responsive journeys.
    for (const width of [1440, 1024, 390]) {
      await page.setViewportSize({width, height: width === 390 ? 844 : 1000});
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no page overflow ' + width);
      if (width === 1024) await page.screenshot({path: output + '/tablet.png'});
      if (width === 390) {
        await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({path: output + '/mobile-overview.png'});
        const sel = await page.locator('#radar-area').boundingBox(); assert.ok(sel.height >= 40, 'filters are easy to change');
        await page.click('button[data-radar-view=findings]'); assert.ok(await page.locator('.radar-panel').isVisible()); assert.ok(!await page.locator('.radar-market').isVisible());
        if (findings.length) {
          await page.locator('.radar-item').first().click(); await page.waitForFunction(() => document.querySelector('#radar-chart svg, #radar-chart table'));
          assert.ok(await page.locator('.radar-market').isVisible()); assert.ok(!await page.locator('.radar-panel').isVisible());
          assert.equal(await page.locator('button[data-radar-view=market]').getAttribute('aria-pressed'), 'true');
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no overflow in mobile detail');
          const svg = await page.locator('#radar-chart svg').boundingBox(); if (svg) assert.ok(svg.width <= 390 && svg.height >= 180, 'readable mobile chart');
          await page.screenshot({path: output + '/mobile-market.png', fullPage: true});
          await page.click('button[data-radar-view=findings]'); assert.ok(await page.locator('.radar-item').first().isVisible());
          await page.click('button[data-radar-view=market]');
        }
      }
    }
    await page.setViewportSize({width: 1440, height: 1000});

    // Unavailable / blocked refresh / stale / integrity mismatch / tampered gate.
    await page.route('**/data/opportunity-radar.json', r => r.abort()); await page.reload(); await page.locator('[data-radar-retry]').waitFor();
    assert.ok((await marketText()).includes('불러오지')); await page.unroute('**/data/opportunity-radar.json'); await page.click('[data-radar-retry]'); await ready();
    await page.route('**/data/opportunity-radar-status.json', r => r.fulfill({json: {schema_version: 2, status: 'BLOCKED', reason: 'SYNTHETIC_AUTH_FAILURE_FOR_BROWSER_TEST', attempted_at: '2026-10-10T00:00:00Z', previous_snapshot_preserved: true}}));
    await page.reload(); await ready(); assert.ok((await page.locator('#radar-source-state').innerText()).includes('이전에 검증한 자료'));
    await page.screenshot({path: output + '/blocked-refresh.png'}); await page.unroute('**/data/opportunity-radar-status.json');
    const stale = structuredClone(index); for (const d of stale.domains) d.fresh = false;
    await page.route('**/data/opportunity-radar.json', r => r.fulfill({json: stale})); await page.reload(); await ready();
    assert.ok((await page.locator('#radar-source-state').innerText()).includes('오래되었습니다')); await page.unroute('**/data/opportunity-radar.json');
    if (ca) {
      const tampered = structuredClone(index), col = tampered.entity_columns.indexOf('sales_yoy_status');
      const k = tampered.entities.findIndex(r => r[0] === 'commercial_area'); tampered.entities[k][col] = 'OK';
      if (ca.gates.temporal.status !== 'VERIFIED') {
        await page.route('**/data/opportunity-radar.json', r => r.fulfill({json: tampered})); await page.reload(); await page.locator('[data-radar-retry]').waitFor();
        await page.unroute('**/data/opportunity-radar.json');
      }
    }
    await page.reload(); await ready();
    if (findings.length) {
      const e = findings[0], url = `**/opportunity-radar-details/${e.domain}-${e.area_id}.json`;
      await page.route(url, r => r.fulfill({json: {schema_version: 2, snapshot_id: 'mismatched'}}));
      await page.selectOption('#radar-area', `${e.domain}:${e.area_id}`); await page.selectOption('#radar-industry', e.industry_id);
      await page.locator('#radar-retry-detail').waitFor(); assert.equal(await page.locator('#radar-chart svg').count(), 0);
      await page.unroute(url); await page.click('#radar-retry-detail'); await page.waitForFunction(() => document.querySelector('#radar-chart svg, #radar-chart table'));
    }
    assert.deepEqual(errors, [], 'no browser runtime errors');
    assert.ok(!requests.some(r => r.method !== 'GET'), 'no writes');
    assert.ok(!requests.some(r => /openapi\.seoul|apis\.data\.go|reb\.or\.kr|source\.json\.gz/.test(r.url)), 'no secret/source API requests in browser');
    console.log('RADAR_BROWSER_PASS: findings, consistency, gates, compare period, blocked geography, handoff, responsive, failure states');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
