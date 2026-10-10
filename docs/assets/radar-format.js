/* Pure display/model helpers for Opportunity Radar. Browser global + CommonJS for tests. */
(function (root) {
  const finite = v => typeof v === 'number' && Number.isFinite(v);
  const group = n => Math.round(n).toLocaleString('ko-KR');
  // Rounded display only; exact won values stay in data and in the 원값 detail.
  function money(v) {
    if (!finite(v)) return {text: '미확인', exact: '미확인', rounded: false};
    const sign = v < 0 ? '−' : '', a = Math.abs(v), exact = sign + group(a) + '원';
    let shown, unit, suffix;
    if (a >= 1e10) [shown, unit, suffix] = [Math.round(a / 1e8), 1e8, '억원'];
    else if (a >= 1e8) [shown, unit, suffix] = [Math.round(a / 1e7) / 10, 1e8, '억원'];
    else if (a >= 1e4) [shown, unit, suffix] = [Math.round(a / 1e4), 1e4, '만원'];
    else [shown, unit, suffix] = [a, 1, '원'];
    const text = shown.toLocaleString('ko-KR', {maximumFractionDigits: 1}) + suffix;
    const rounded = Math.abs(shown * unit - a) > 1e-6;
    return {text: (rounded ? '약 ' : '') + sign + text, exact, rounded};
  }
  const count = v => finite(v) ? group(v) + '개' : '미확인';
  const signed = (v, digits = 1) => !finite(v) ? '미확인' : (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toLocaleString('ko-KR', {minimumFractionDigits: digits, maximumFractionDigits: digits});
  const quarter = p => /^20\d{2}[1-4]$/.test(p || '') ? `${p.slice(0, 4)}년 ${p[4]}분기` : '분기 미확인';
  const shortQuarter = p => /^20\d{2}[1-4]$/.test(p || '') ? `${p.slice(2, 4)}.${p[4]}Q` : '?';
  // Same rule as the pipeline: missing → UNKNOWN, zero baseline → UNKNOWN.
  function change(base, current) {
    if (!finite(base) || !finite(current)) return {status: 'UNKNOWN', reason: 'MISSING_OBSERVATION', pct: null, abs: null};
    if (base === 0) return {status: 'UNKNOWN', reason: 'ZERO_BASELINE', pct: null, abs: current - base};
    return {status: 'OK', pct: Math.floor((current / base - 1) * 10000 + 0.5) / 100, abs: current - base};
  }
  // Index = value / baseline × 100. Null when baseline missing/zero; never interpolated.
  function indexSeries(values) {
    const base = values[0];
    if (!finite(base) || base === 0) return values.map(() => null);
    return values.map(v => finite(v) ? Math.floor(v / base * 10000 + 0.5) / 100 : null);
  }
  function chartModel(periods, series, {width = 640, height = 240, pad = {l: 44, r: 16, t: 18, b: 34}} = {}) {
    const all = series.flatMap(s => s.index).filter(finite);
    if (!all.length) return null;
    let lo = Math.min(100, ...all), hi = Math.max(100, ...all);
    const span = Math.max(hi - lo, 4), margin = span * 0.12;
    lo = Math.floor((lo - margin) / 2) * 2; hi = Math.ceil((hi + margin) / 2) * 2;
    const x = i => pad.l + (periods.length === 1 ? 0 : i * (width - pad.l - pad.r) / (periods.length - 1));
    const y = v => pad.t + (hi - v) * (height - pad.t - pad.b) / (hi - lo);
    const step = (hi - lo) <= 12 ? 2 : (hi - lo) <= 30 ? 5 : (hi - lo) <= 80 ? 10 : 25;
    const ticks = []; for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t);
    return {width, height, pad, lo, hi, ticks, x, y,
      lines: series.map(s => ({...s, points: s.index.map((v, i) => finite(v) ? {i, v, x: x(i), y: y(v), raw: s.raw[i]} : null)}))};
  }
  const api = {money, count, signed, quarter, shortQuarter, change, indexSeries, chartModel, finite};
  if (typeof module === 'object' && module.exports) module.exports = api; else root.RadarFormat = api;
})(typeof window !== 'undefined' ? window : globalThis);
