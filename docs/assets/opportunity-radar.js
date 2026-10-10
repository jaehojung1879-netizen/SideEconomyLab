/* Opportunity Radar v2: official source-geography market changes; summary first, detail on selection. */
(() => {
  const F = window.RadarFormat;
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const sourceUrl = u => { try { const url = new URL(u); return url.protocol === 'https:' && ['data.seoul.go.kr', 'golmok.seoul.go.kr', 'www.data.go.kr', 'www.code.go.kr'].includes(url.hostname) ? url.href : ''; } catch { return ''; } };
  const STATUS_TEXT = {ZERO_BASELINE: '기준 분기 값이 0이라 변화율을 계산하지 않습니다.', MISSING_OBSERVATION: '비교 분기 중 관측이 없어 변화율을 계산하지 않습니다.',
    GEOGRAPHY_TEMPORAL_GATE: '분기마다 같은 지역 경계인지 공식 근거로 확인되지 않아 비교를 보류합니다.', STALE_OBSERVATION: '관측이 오래되어 최근 변화로 비교하지 않습니다.',
    SOURCE_IDENTITY_CHANGED: '분기마다 지역·업종 이름이나 코드가 달라 비교를 보류합니다.'};
  const FLOW_TEXT = {expansion: '최근 4개 분기 모두 개업이 폐업보다 많음', contraction: '최근 4개 분기 모두 폐업이 개업보다 많음', mixed: '최근 4개 분기 순증감 방향이 섞임', UNKNOWN: '개폐업 관측 누락', BLOCKED: '비교 보류'};
  let data = null, sourceState = null, limit = 8, sequence = 0, detail = null;
  const cache = new Map(), byKey = new Map();
  const filters = {area: '', industry: '', compare: 'yoy', pattern: '', sort: 'size', scope: 'all'};

  function decode(index) {
    const cols = index.entity_columns;
    return index.entities.map(row => {
      const e = Object.fromEntries(cols.map((c, i) => [c, row[i]]));
      for (const k of ['sales', 'stores']) for (const [c, i0] of [['yoy', 0], ['qoq', 1]]) {
        const raw = e[`${k}_${c}_status`], status = ['OK', 'BLOCKED'].includes(raw) ? raw : 'UNKNOWN';
        e[`${k}_${c}`] = {status, reason: status === 'BLOCKED' ? e.blocked : status === 'UNKNOWN' ? raw : null, pct: e[`${k}_${c}_pct`],
          abs: status !== 'BLOCKED' && F.finite(e[k][i0]) && F.finite(e[k][2]) ? e[k][2] - e[k][i0] : null};
      }
      return e;
    });
  }
  function prepare(index) {
    if (index?.schema_version !== 2 || index.status !== 'AVAILABLE' || !Array.isArray(index.domains) || !Array.isArray(index.entities) || !Array.isArray(index.entity_columns) || !Array.isArray(index.periods) || index.periods.length !== 5) throw Error('형식 확인 필요');
    const domains = new Map(index.domains.map(d => [d.id, d]));
    const entities = decode(index);
    for (const e of entities) {
      const d = domains.get(e.domain);
      if (!d || !/^CS\d{6}$/.test(e.industry_id) || !/^\d{5,10}$/.test(e.area_id)) throw Error('지역 근거 형식 오류');
      // Independent gates: temporal gate controls change values, GIS gate controls map joins.
      if (d.gates.temporal.status !== 'VERIFIED' && ['sales_yoy', 'stores_yoy', 'sales_qoq', 'stores_qoq'].some(k => e[k].status !== 'BLOCKED')) throw Error('비교 검증 없는 변화');
      if (e.finding && (e.sales_yoy.status !== 'OK' && !['expansion', 'contraction'].includes(e.flow))) throw Error('근거 없는 발견');
      if (e.map_area_id !== null && d.gates.gis.status !== 'VERIFIED') throw Error('공식 지도 대응 미검증');
      for (const k of ['sales', 'stores']) for (const v of e[k]) if (v !== null && (!Number.isFinite(v) || v < 0)) throw Error('관측값 형식 오류');
    }
    for (const d of index.domains) for (const s of d.sources) if (!sourceUrl(s.url)) throw Error('출처 확인 필요');
    return {...index, domainMap: domains, list: entities, industryName: new Map(index.industries)};
  }
  const domainOf = id => data.domainMap.get(id);
  const areaName = (domain, area) => (domainOf(domain)?.areas.find(a => a[0] === area) || [, area])[1];
  const parseArea = v => { const [domain, area] = String(v || '').split(':'); return {domain: domain || 'district', area: area && area !== '*' ? area : ''}; };
  const pctText = c => c.status === 'OK' ? F.signed(c.pct) + '%' : c.status === 'BLOCKED' ? '비교 보류' : '변화율 미확인';
  const tone = c => c.status !== 'OK' ? 'unknown' : c.pct > 0 ? 'up' : c.pct < 0 ? 'down' : 'flat';
  const cmp = () => filters.compare === 'qoq' ? data.comparisons.qoq : data.comparisons.yoy;
  const cmpIndex = () => filters.compare === 'qoq' ? [1, 2] : [0, 2];

  function mode(value, {push = false} = {}) {
    const next = ['radar', 'region', 'evaluate'].includes(value) ? value : 'radar';
    if (next !== 'evaluate' && document.body.dataset.workbench === 'true') $('wb-toggle').click();
    document.body.dataset.workspace = next; document.body.dataset.sheet = '';
    document.querySelector('.brand h1').textContent = {radar: '기회 탐색', region: '지역 분석', evaluate: '사업성 검토'}[next];
    document.querySelectorAll('[data-workspace-nav]').forEach(a => a.setAttribute('aria-current', a.dataset.workspaceNav === next ? 'page' : 'false'));
    if (push && location.hash !== `#${next}`) location.hash = next;
    window.dispatchEvent(new CustomEvent('sideeconomy:workspace-mode', {detail: next}));
    window.SideEconomyGIS?.refresh();
    if (next === 'evaluate' && matchMedia('(max-width:800px)').matches) document.body.dataset.sheet = 'decision';
  }
  function view(value) {
    document.body.dataset.radarView = value;
    document.querySelectorAll('button[data-radar-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.radarView === value)));
  }

  function controls() {
    const {domain} = parseArea(filters.area);
    $('radar-area').innerHTML = data.domains.map(d => `<optgroup label="${esc(d.label)} · ${d.gates.temporal.status === 'VERIFIED' ? '변화 비교 가능' : '비교 보류'}">${d.id === 'district' ? `<option value="district:*">서울 ${d.areas.length}개 자치구 비교</option>` : ''}${d.areas.map(([id, name]) => `<option value="${esc(d.id + ':' + id)}">${esc(name)}</option>`).join('')}</optgroup>`).join('');
    const inDomain = new Set(data.list.filter(e => e.domain === domain).map(e => e.industry_id));
    $('radar-industry').innerHTML = `<option value="">이 지역의 업종 비교</option>` + data.industries.filter(([id]) => inDomain.has(id)).sort((a, b) => a[1].localeCompare(b[1], 'ko')).map(([id, name]) => `<option value="${id}">${esc(name)}</option>`).join('');
    $('radar-pattern').innerHTML = '<option value="">모든 발견</option>' + Object.entries(data.patterns).filter(([k]) => k !== 'mixed_or_flat').map(([k, p]) => `<option value="${k}">${esc(p.label)}</option>`).join('') + '<option value="flow">개폐업 방향 지속</option><option value="extreme">급변 · 원자료 먼저 확인</option>';
    $('radar-area').value = filters.area; $('radar-industry').value = filters.industry; $('radar-compare').value = filters.compare; $('radar-pattern').value = filters.pattern; $('radar-sort').value = filters.sort; $('radar-scope').value = filters.scope;
  }

  function headline() {
    const d = domainOf('district'), c = data.coverage;
    $('radar-headline').innerHTML = d && d.gates.temporal.status === 'VERIFIED'
      ? `${F.quarter(data.periods[0])} → ${F.quarter(data.periods.at(-1))}, 서울 ${d.areas.length}개 자치구의 공식 추정 소비와 점포 변화를 비교합니다. 비교 가능한 조합 ${c.comparable.toLocaleString('ko-KR')}개 중 <strong>${c.findings.toLocaleString('ko-KR')}건</strong>을 추가 조사 후보로 표시했습니다. 서울 전체 중앙값은 소비 ${F.signed(d.context.median_sales_yoy_pct)}%, 점포 ${F.signed(d.context.median_stores_yoy_pct)}%입니다.`
      : '관측 자료는 확보했지만 같은 지리 기준을 공식 근거로 확인하지 못해 변화 비교를 보류합니다.';
  }

  // ---------- market view
  function market() {
    const {domain, area} = parseArea(filters.area), d = domainOf(domain), ind = filters.industry;
    if (!d) { $('radar-market').innerHTML = '<p>지역을 선택하세요.</p>'; return; }
    if (area && ind) return marketDetail(d, area, ind);
    if (area) return rankingTable(d, `${esc(areaName(domain, area))} · 업종별 변화`, data.list.filter(e => e.domain === domain && e.area_id === area), e => data.industryName.get(e.industry_id), e => ({area: filters.area, industry: e.industry_id}), '같은 지역 안의 업종을 변화율로 비교합니다. 업종마다 규모가 달라 원 단위 금액은 비교하지 않습니다.');
    if (ind) return rankingTable(d, `${esc(data.industryName.get(ind))} · 자치구별 변화`, data.list.filter(e => e.domain === domain && e.industry_id === ind), e => areaName(domain, e.area_id), e => ({area: domain + ':' + e.area_id, industry: ind}), '같은 업종을 자치구끼리 비교합니다. 겹치지 않는 공식 자치구 집계입니다.');
    $('radar-market').innerHTML = '<p>업종이나 지역을 선택하세요.</p>';
  }
  function gateNote(d) {
    const t = d.gates.temporal, g = d.gates.gis;
    return `<details class="radar-gate"><summary><span class="radar-badge" data-ok="${t.status === 'VERIFIED'}">${t.status === 'VERIFIED' ? '분기 비교 가능' : '분기 비교 보류'}</span><span class="radar-badge" data-ok="${g.status === 'VERIFIED'}">${g.status === 'VERIFIED' ? '지도 연결 검증' : '지도 연결 안 함'}</span><span>${esc(d.label)} 기준 · 왜?</span></summary><p><strong>분기 비교:</strong> ${esc(t.summary)}</p><p><strong>지도:</strong> ${esc(g.summary)}</p>${t.limitation ? `<p class="radar-limit">${esc(t.limitation)}</p>` : ''}<ul>${(t.evidence || []).map(e => `<li><a href="${esc(sourceUrl(e.url))}" target="_blank" rel="noopener">${esc(e.claim)}</a> <small>(${esc(e.observed)} 확인)</small></li>`).join('')}</ul></details>`;
  }
  function summary(e, i0, i1) {
    const [base, cur] = cmp(), c = filters.compare === 'qoq' ? 'qoq' : 'yoy', s = e['sales_' + c], t = e['stores_' + c];
    const ms = [F.money(e.sales[i0]), F.money(e.sales[i1])], abs = s.abs === null || s.abs === undefined ? null : F.money(s.abs);
    return `<div class="radar-cards">
      <article class="radar-card" data-tone="${tone(s)}"><h4>추정 소비 · 분기 합계</h4><strong>${pctText(s)}</strong><p>${ms[0].text} → ${ms[1].text}</p><small>${abs ? `차이 ${s.abs > 0 ? '+' : ''}${abs.text}` : esc(STATUS_TEXT[s.reason] || '')}</small><small>${F.quarter(base)} → ${F.quarter(cur)} · 명목 금액(물가 미보정)</small></article>
      <article class="radar-card" data-tone="${tone(t)}"><h4>점포 수 · 유사업종 포함</h4><strong>${pctText(t)}</strong><p>${F.count(e.stores[i0])} → ${F.count(e.stores[i1])}</p><small>${t.abs !== null && t.abs !== undefined ? `차이 ${t.abs > 0 ? '+' : ''}${t.abs.toLocaleString('ko-KR')}개` : esc(STATUS_TEXT[t.reason] || '')}</small><small>최근 분기 개업 ${F.count(e.opened)} · 폐업 ${F.count(e.closed)} · ${esc(FLOW_TEXT[e.flow] || '')}${Number.isFinite(e.net_openings_4q) ? ` (4개 분기 순 ${F.signed(e.net_openings_4q, 0)}개)` : ''}</small></article>
    </div>`;
  }
  function marketDetail(d, area, ind) {
    const e = byKey.get(`${d.id}:${area}:${ind}`), [i0, i1] = cmpIndex();
    const title = `${esc(areaName(d.id, area))} · ${esc(data.industryName.get(ind))}`;
    if (!e) { $('radar-market').innerHTML = `<h3>${title}</h3>${gateNote(d)}<p class="radar-empty">이 지역에는 해당 업종의 공식 관측이 없습니다. 없는 값은 0으로 바꾸지 않습니다.</p>`; return; }
    const p = e.pattern && data.patterns[e.pattern];
    $('radar-market').innerHTML = `<div class="radar-market-head"><div><span>${esc(d.label)}</span><h3>${title}</h3></div><button class="radar-action" data-radar-up="area">← ${esc(areaName(d.id, area))} 전체 업종</button></div>
      ${summary(e, i0, i1)}
      ${p && filters.compare === 'yoy' ? `<p class="radar-pattern" data-pattern="${e.pattern}"><strong>${esc(p.label)}</strong> ${esc(p.meaning)}${e.material ? '' : ' <em>기준 규모가 작아 발견 목록에서는 제외했습니다.</em>'}</p>` : filters.compare === 'qoq' ? '<p class="radar-pattern">직전 분기 비교는 계절 영향이 포함됩니다. 발견 분류는 전년 같은 분기 기준으로만 합니다.</p>' : ''}
      ${e.extreme ? `<p class="radar-notice"><strong>급변 · 원자료 먼저 확인</strong> ${esc(data.rules.extreme.note)} 아래 분기별 원값에서 변화가 한 분기에 몰렸는지 보세요.</p>` : ''}
      ${gateNote(d)}
      <section class="radar-chart-wrap" id="radar-chart" aria-live="polite"><p>분기별 추이를 불러오고 있습니다.</p></section>
      ${p && filters.compare === 'yoy' ? `<div class="radar-why"><p><strong>왜 볼 만한가</strong> ${esc(p.why)}</p><p><strong>다른 설명</strong> ${esc(p.alternatives)}</p><p class="radar-next"><strong>다음 확인</strong> ${esc(p.next)}</p></div>` : ''}
      <p class="radar-handoff-note">이 통계는 업종 전체의 공식 추정치입니다. 사업 매출 전망에 자동으로 넣지 않습니다.</p><button class="radar-action" id="radar-handoff">현재 사업 가설로 사업성 검토</button>`;
    bindMarket(); loadDetail(d.id, area, ind);
  }
  function rankingTable(d, title, rows, label, target, note) {
    const c = filters.compare === 'qoq' ? 'qoq' : 'yoy', [base, cur] = cmp();
    const ok = rows.filter(e => e['sales_' + c].status === 'OK');
    const sorted = [...rows].sort((a, b) => (b.material - a.material) || ((b['sales_' + c].pct ?? -Infinity) - (a['sales_' + c].pct ?? -Infinity)) || a.area_id.localeCompare(b.area_id) || a.industry_id.localeCompare(b.industry_id));
    const max = Math.max(5, ...ok.map(e => Math.abs(e['sales_' + c].pct)).filter(Number.isFinite).map(v => Math.min(v, 100)));
    const up = ok.filter(e => e['sales_' + c].pct > 0).length, down = ok.filter(e => e['sales_' + c].pct < 0).length;
    const st = rows.filter(e => e['stores_' + c].status === 'OK'), sUp = st.filter(e => e['stores_' + c].pct > 0).length, sDown = st.filter(e => e['stores_' + c].pct < 0).length;
    const med = arr => { const v = arr.filter(Number.isFinite).sort((a, b) => a - b); return v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : null; };
    $('radar-market').innerHTML = `<div class="radar-market-head"><div><span>${esc(d.label)} · ${F.quarter(base)} → ${F.quarter(cur)}</span><h3>${title}</h3></div></div>
      <div class="radar-cards"><article class="radar-card"><h4>추정 소비</h4><strong>${up}곳 증가 · ${down}곳 감소</strong><p>중앙값 ${F.signed(med(ok.map(e => e['sales_' + c].pct)))}%</p><small>변화율 계산 가능 ${ok.length}/${rows.length}</small></article><article class="radar-card"><h4>점포 수</h4><strong>${sUp}곳 증가 · ${sDown}곳 감소</strong><p>중앙값 ${F.signed(med(st.map(e => e['stores_' + c].pct)))}%</p><small>변화율 계산 가능 ${st.length}/${rows.length}</small></article></div>
      ${gateNote(d)}<p class="radar-note">${esc(note)} 막대는 추정 소비 변화율(±${max.toFixed(0)}% 축, 100% 초과는 잘림)입니다. 기준 규모가 작은 항목은 아래로 정렬합니다.</p>
      <ol class="radar-rank">${sorted.map(e => { const s = e['sales_' + c], t = e['stores_' + c], w = s.status === 'OK' ? Math.min(Math.abs(s.pct), max) / max * 50 : 0; return `<li><button data-radar-pick="${esc(JSON.stringify(target(e)))}"><span class="radar-rank-name">${esc(label(e))}${e.material ? '' : '<small>기준 규모 작음</small>'}${e.extreme ? '<small>급변 · 원자료 확인</small>' : ''}</span><span class="radar-bar" aria-hidden="true"><i data-tone="${tone(s)}" style="${s.pct < 0 ? `right:50%;width:${w}%` : `left:50%;width:${w}%`}"></i></span><span class="radar-rank-val"><b data-tone="${tone(s)}">${pctText(s)}</b><small>점포 ${pctText(t)}</small></span></button></li>`; }).join('')}</ol>`;
    bindMarket();
  }
  function bindMarket() {
    document.querySelectorAll('[data-radar-pick]').forEach(b => b.onclick = () => { Object.assign(filters, JSON.parse(b.dataset.radarPick)); controls(); render(); focusMarket(); });
    document.querySelectorAll('[data-radar-up]').forEach(b => b.onclick = () => { filters.industry = ''; controls(); render(); focusMarket(); });
    const h = $('radar-handoff'); if (h) h.onclick = () => mode('evaluate', {push: true});
  }
  function focusMarket() {
    const m = $('radar-market');
    if (matchMedia('(max-width:800px)').matches) { view('market'); window.scrollTo(0, Math.max(0, m.getBoundingClientRect().top + scrollY - 60)); }
    m.focus({preventScroll: true});
  }

  async function loadDetail(domain, area, ind) {
    const token = ++sequence, key = `${domain}-${area}`;
    try {
      let d = cache.get(key);
      if (!d) {
        const r = await fetch(`./data/opportunity-radar-details/${key}.json`); if (!r.ok) throw Error('network');
        const bytes = await r.arrayBuffer();
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(v => v.toString(16).padStart(2, '0')).join('');
        if (hash !== data.detail_hashes[key]) throw Error('mixed snapshot');
        d = JSON.parse(new TextDecoder().decode(bytes));
        if (d.domain !== domain || d.area_id !== area || d.snapshot_id !== domainOf(domain).snapshot_id) throw Error('identity');
        cache.set(key, d);
      }
      if (token !== sequence) return;
      detail = d; chart(d, ind);
    } catch {
      if (token === sequence && $('radar-chart')) $('radar-chart').innerHTML = '<p>분기별 원자료를 불러오지 못했습니다. 자료가 갱신됐거나 연결이 실패했습니다.</p><button class="radar-action" id="radar-retry-detail">다시 확인</button>', $('radar-retry-detail').onclick = () => loadDetail(domain, area, ind);
    }
  }
  function chart(d, ind) {
    const item = d.industries[ind], box = $('radar-chart'); if (!box || !item) return;
    const h = item.history, periods = d.periods, gate = d.gates.temporal.status === 'VERIFIED' && item.identity_consistent;
    const table = `<details class="radar-raw"><summary>원값 보기 · 반올림 없음</summary><table class="radar-table"><caption>${esc(d.area_name)} · ${esc(item.name)} · 공식 추정통계</caption><thead><tr><th>분기</th><th>추정 소비(원)</th><th>건수</th><th>점포</th><th>개업</th><th>폐업</th></tr></thead><tbody>${h.map(x => `<tr><td>${F.quarter(x.period)}</td><td>${F.finite(x.sales) ? x.sales.toLocaleString('ko-KR') : '미확인'}</td><td>${F.finite(x.transactions) ? x.transactions.toLocaleString('ko-KR') : '미확인'}</td><td>${F.finite(x.stores) ? x.stores.toLocaleString('ko-KR') : '미확인'}</td><td>${F.finite(x.opened) ? x.opened : '미확인'}</td><td>${F.finite(x.closed) ? x.closed : '미확인'}</td></tr>`).join('')}</tbody></table></details>`;
    if (!gate) { box.innerHTML = `<h4>분기별 관측</h4><p>같은 지리 기준이 확인되지 않아 추세선을 그리지 않습니다. 아래 표는 각 분기의 개별 관측입니다.</p>${table}`; return; }
    const sales = h.map(x => x.sales), stores = h.map(x => x.stores);
    const width = Math.round(Math.min(760, Math.max(300, box.clientWidth - 28))), narrow = width < 480;
    const model = F.chartModel(periods, [{key: 'sales', label: '추정 소비', index: F.indexSeries(sales), raw: sales}, {key: 'stores', label: '점포 수', index: F.indexSeries(stores), raw: stores}], {width, height: narrow ? 220 : 250, pad: {l: 38, r: narrow ? 26 : 34, t: 26, b: 30}});
    if (!model) { box.innerHTML = `<h4>분기별 관측</h4><p>기준 분기 값이 없거나 0이어서 지수 추이를 그리지 않습니다.</p>${table}`; return; }
    const fmt = (k, v) => k === 'sales' ? F.money(v).text : F.count(v);
    const svg = `<svg class="radar-chart" viewBox="0 0 ${model.width} ${model.height}" role="img" aria-label="${esc(item.name)} 추정 소비와 점포 수 지수, ${F.quarter(periods[0])}=100">
      ${model.ticks.map(t => `<line class="grid${t === 100 ? ' base' : ''}" x1="${model.pad.l}" x2="${model.width - model.pad.r}" y1="${model.y(t)}" y2="${model.y(t)}"/><text x="${model.pad.l - 6}" y="${model.y(t) + 4}" text-anchor="end">${t}</text>`).join('')}
      ${periods.map((p, i) => `<text x="${model.x(i)}" y="${model.height - 10}" text-anchor="middle">${F.shortQuarter(p)}</text>`).join('')}
      ${model.lines.map(l => { const pts = l.points.filter(Boolean); const path = l.points.map((pt, i) => pt ? `${i && l.points[i - 1] ? 'L' : 'M'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}` : '').join(''); return `<path class="line-${l.key}" d="${path}"/>${pts.map(pt => `<circle class="dot-${l.key}" cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="4" tabindex="0" data-radar-point="${l.key}:${pt.i}"><title>${F.quarter(periods[pt.i])} ${l.label}: 지수 ${pt.v} · ${fmt(l.key, pt.raw)}${l.key === 'sales' ? ` (${pt.raw.toLocaleString('ko-KR')}원)` : ''}</title></circle>`).join('')}<text class="end-${l.key}" x="${(pts.at(-1)?.x ?? 0) - 4}" y="${(pts.at(-1)?.y ?? 0) - 9}" text-anchor="end">${l.label} ${pts.at(-1)?.v ?? ''}</text>`; }).join('')}
    </svg>`;
    const flows = h.map(x => [x.opened, x.closed]), fmax = Math.max(1, ...flows.flat().filter(F.finite));
    const flow = `<div class="radar-flow" aria-label="분기별 개업·폐업">${h.map(x => `<div><p><span class="o" style="height:${F.finite(x.opened) ? Math.max(2, x.opened / fmax * 44) : 0}px" title="개업 ${F.finite(x.opened) ? x.opened : '미확인'}"></span><span class="c" style="height:${F.finite(x.closed) ? Math.max(2, x.closed / fmax * 44) : 0}px" title="폐업 ${F.finite(x.closed) ? x.closed : '미확인'}"></span></p><small>${F.shortQuarter(x.period)}<br>+${F.finite(x.opened) ? x.opened : '?'} / −${F.finite(x.closed) ? x.closed : '?'}</small></div>`).join('')}</div>`;
    box.innerHTML = `<h4>분기별 추이 · ${F.quarter(periods[0])} = 100</h4><p class="radar-legend"><span class="k-sales">추정 소비 지수</span><span class="k-stores">점포 수 지수</span> 두 지표의 단위가 달라 기준 분기를 100으로 맞췄습니다. 점을 누르거나 가리키면 원래 값이 보입니다.</p>${svg}<p id="radar-point-detail" class="radar-point" role="status">${F.quarter(periods.at(-1))}: 추정 소비 ${fmt('sales', sales.at(-1))} · 점포 ${fmt('stores', stores.at(-1))}</p><h4>분기별 <span class="k-open">개업</span> · <span class="k-close">폐업</span> 점포 수</h4>${flow}${table}`;
    box.querySelectorAll('[data-radar-point]').forEach(c => { const show = () => { const [k, i] = c.dataset.radarPoint.split(':'); $('radar-point-detail').textContent = `${F.quarter(periods[i])}: ${k === 'sales' ? '추정 소비 ' + fmt('sales', sales[i]) + ` (${F.finite(sales[i]) ? sales[i].toLocaleString('ko-KR') : '미확인'}원) · 지수 ${model.lines[0].index[i] ?? '미확인'}` : '점포 ' + fmt('stores', stores[i]) + ` · 지수 ${model.lines[1].index[i] ?? '미확인'}`}`; }; c.onmouseenter = show; c.onfocus = show; c.onclick = show; });
  }

  // ---------- findings
  function findings() {
    const {domain, area} = parseArea(filters.area), sel = filters.scope === 'selection';
    let rows = data.list.filter(e => e.finding && (!sel || ((!area || (e.domain === domain && e.area_id === area)) && (!filters.industry || e.industry_id === filters.industry))));
    if (filters.pattern === 'flow') rows = rows.filter(e => ['expansion', 'contraction'].includes(e.flow));
    else if (filters.pattern === 'extreme') rows = rows.filter(e => e.extreme);
    else if (filters.pattern) rows = rows.filter(e => e.pattern === filters.pattern);
    // size: larger baseline estimates first (less noisy, more decision-relevant); not an opportunity ranking.
    const key = {size: e => -(e.sales[0] ?? 0), sales: e => -Math.abs(e.sales_yoy.pct ?? 0), stores: e => -Math.abs(e.stores_yoy.pct ?? 0), area: () => 0}[filters.sort];
    // Extreme jumps are listed after ordinary findings: check the source before treating them as market change.
    rows.sort((a, b) => (a.extreme - b.extreme) || key(a) - key(b) || areaName(a.domain, a.area_id).localeCompare(areaName(b.domain, b.area_id), 'ko') || a.industry_id.localeCompare(b.industry_id));
    $('radar-result-count').textContent = `${rows.length.toLocaleString('ko-KR')}건`;
    let state = '';
    if (sourceState?.status === 'BLOCKED') state += `<p class="radar-notice">최근 수집 시도(${esc((sourceState.attempted_at || '').slice(0, 10))})가 실패했습니다. 이전에 검증한 자료를 그대로 보여줍니다. 사유 코드 <code>${esc(sourceState.reason)}</code></p>`;
    for (const d of data.domains) if (!d.fresh) state += `<p class="radar-notice">${esc(d.label)} 관측이 오래되었습니다. 최근 변화로 해석하지 마세요.</p>`;
    if (filters.compare === 'qoq') state += '<p class="radar-notice">발견 목록은 계절 영향을 줄이기 위해 전년 같은 분기 비교만 사용합니다.</p>';
    if (filters.sort === 'size') state += '<p class="radar-note">기준 분기 소비가 큰 시장부터 보여줍니다. 규모가 클수록 추정이 안정적이라는 읽기 순서이며 기회 순위가 아닙니다.</p>';
    if (!rows.length) state += '<p class="empty-state">조건에 맞는 발견이 없습니다. 지역·업종·변화 유형을 바꿔 보세요.</p>';
    $('radar-source-state').innerHTML = state;
    const [base, cur] = data.comparisons.yoy;
    $('radar-list').innerHTML = rows.slice(0, limit).map(e => {
      const p = data.patterns[e.pattern] || null, flowOnly = !p || e.pattern === 'mixed_or_flat';
      const why = flowOnly ? data.patterns.mixed_or_flat : p;
      const what = flowOnly ? FLOW_TEXT[e.flow] : p.label;
      return `<button class="radar-item" data-radar-finding="${esc(JSON.stringify({area: e.domain + ':' + e.area_id, industry: e.industry_id}))}" data-pattern="${esc(e.pattern || e.flow)}">
        <span class="radar-item-tag">${esc(what)}</span>${e.extreme ? '<span class="radar-item-tag radar-extreme">급변 · 원자료 먼저 확인</span>' : ''}<strong>${esc(areaName(e.domain, e.area_id))} · ${esc(data.industryName.get(e.industry_id))}</strong>
        <span class="radar-metric"><b data-tone="${tone(e.sales_yoy)}">소비 ${pctText(e.sales_yoy)}</b><b data-tone="${tone(e.stores_yoy)}">점포 ${pctText(e.stores_yoy)}</b>${Number.isFinite(e.net_openings_4q) ? `<b>4분기 순개업 ${F.signed(e.net_openings_4q, 0)}</b>` : ''}</span>
        <small>${F.money(e.sales[0]).text} → ${F.money(e.sales[2]).text} · 점포 ${F.count(e.stores[0])} → ${F.count(e.stores[2])} · ${F.shortQuarter(base)}→${F.shortQuarter(cur)}</small>
        <small><em>왜</em> ${esc(flowOnly ? '공급 진입·퇴출이 한 방향으로 이어지고 있습니다.' : why.why)}</small><small><em>다른 설명</em> ${esc(flowOnly ? '이전·업종 전환·등록 시차로도 개폐업이 생깁니다.' : why.alternatives)}</small><small class="radar-item-next"><em>다음 확인</em> ${esc(flowOnly ? '최근 개폐업 점포 몇 곳의 실제 운영 상태와 사유를 확인하세요.' : why.next)}</small></button>`;
    }).join('');
    $('radar-more').hidden = rows.length <= limit;
    document.querySelectorAll('[data-radar-finding]').forEach(b => b.onclick = () => { Object.assign(filters, JSON.parse(b.dataset.radarFinding), {compare: 'yoy'}); controls(); render(); focusMarket(); });
  }

  function render() {
    if (!data) {
      $('radar-market').innerHTML = '<div class="radar-empty"><strong>자료를 불러오지 못했습니다.</strong><p>네트워크 또는 자료 형식을 확인해야 합니다. 임의의 수치를 표시하지 않습니다. 기존 지도와 연구는 계속 사용할 수 있습니다.</p><button data-radar-retry>다시 불러오기</button> <button data-radar-region>기존 지역 분석</button></div>';
      $('radar-list').innerHTML = ''; $('radar-source-state').innerHTML = ''; $('radar-result-count').textContent = '';
      document.querySelectorAll('[data-radar-retry]').forEach(b => b.onclick = init);
      document.querySelectorAll('[data-radar-region]').forEach(b => b.onclick = () => mode('region', {push: true}));
      return;
    }
    headline(); market(); findings();
  }

  async function init() {
    data = null; sequence++; cache.clear(); byKey.clear();
    try {
      const [r, s] = await Promise.all([fetch('./data/opportunity-radar.json'), fetch('./data/opportunity-radar-status.json').catch(() => null)]);
      if (!r.ok) throw Error('network');
      data = prepare(await r.json()); sourceState = s?.ok ? await s.json() : null;
      for (const e of data.list) byKey.set(`${e.domain}:${e.area_id}:${e.industry_id}`, e);
      if (!filters.area) {
        // Neutral default: district view of the industry with the largest observed baseline spending.
        const totals = new Map();
        for (const e of data.list) if (e.domain === 'district' && F.finite(e.sales[0])) totals.set(e.industry_id, (totals.get(e.industry_id) || 0) + e.sales[0]);
        filters.area = 'district:*'; filters.industry = [...totals].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
      }
      controls();
    } catch { data = null; }
    render();
  }

  $('radar-area').onchange = () => { filters.area = $('radar-area').value; const {domain} = parseArea(filters.area); if (filters.industry && !data.list.some(e => e.domain === domain && e.industry_id === filters.industry)) filters.industry = ''; if (filters.area === 'district:*' && !filters.industry) filters.industry = data.list.find(e => e.domain === 'district')?.industry_id || ''; limit = 8; controls(); render(); };
  $('radar-industry').onchange = () => { filters.industry = $('radar-industry').value; if (!filters.industry && filters.area === 'district:*') { filters.industry = ''; } limit = 8; render(); };
  $('radar-compare').onchange = () => { filters.compare = $('radar-compare').value; render(); };
  $('radar-pattern').onchange = () => { filters.pattern = $('radar-pattern').value; limit = 8; findings(); };
  $('radar-sort').onchange = () => { filters.sort = $('radar-sort').value; findings(); };
  $('radar-scope').onchange = () => { filters.scope = $('radar-scope').value; limit = 8; findings(); };
  $('radar-more').onclick = () => { limit += 8; findings(); };
  document.querySelectorAll('[data-workspace-nav]').forEach(a => a.onclick = () => mode(a.dataset.workspaceNav));
  document.querySelectorAll('button[data-radar-view]').forEach(b => b.onclick = () => view(b.dataset.radarView));
  window.addEventListener('hashchange', () => mode(location.hash.slice(1)));
  window.OpportunityRadar = {mapRows: rows => document.body.dataset.workspace === 'radar' ? rows.slice(0, 12) : rows, mode, prepare, state: () => ({filters: {...filters}, detail})};
  mode(location.hash.slice(1)); view('market'); init();
})();
