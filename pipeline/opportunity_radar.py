"""Official Seoul history -> immutable snapshots -> gated, inspectable market-change radar.

v2 keeps the v1 commercial-area snapshot and adds official district aggregates.
Two independent gates per source geography:
  temporal  - may the same official geography/industry be compared across quarters?
  gis       - may it be drawn on / joined to the existing 1,650-area GIS?
A failed temporal gate blocks change signals. A failed GIS gate only blocks mapping.
No demand scores, economics, candidate gates or private records are touched.
"""
import argparse
import calendar
from datetime import date, datetime, timezone
import gzip
import hashlib
import json
import math
import os
from pathlib import Path
import re
import urllib.error
import urllib.parse
import urllib.request

from public_api_client import SourceError, NoRedirect, assert_sanitized

ROOT = Path(__file__).resolve().parents[1]
CONFIG = 'config/opportunity-radar-v2.json'
INDEX = 'docs/data/opportunity-radar.json'
STATUS = 'docs/data/opportunity-radar-status.json'
DETAILS = 'docs/data/opportunity-radar-details'
OFFICIAL_HOSTS = ('data.seoul.go.kr', 'golmok.seoul.go.kr', 'www.data.go.kr', 'www.code.go.kr')
IDENTITY = ('STDR_YYQU_CD', 'TRDAR_CD', 'TRDAR_CD_NM', 'SVC_INDUTY_CD', 'SVC_INDUTY_CD_NM')
MEASURES = {'sales': ('THSMON_SELNG_AMT', 'THSMON_SELNG_CO'),
            'stores': ('SIMILR_INDUTY_STOR_CO', 'STOR_CO', 'FRC_STOR_CO', 'OPBIZ_STOR_CO', 'CLSBIZ_STOR_CO')}
UNITS = {'sales': 'KRW/quarter', 'stores': 'establishments/quarter'}
# v1 commercial-area services (snapshot 2026-10-09 stays immutable and re-derivable).
SERVICES = {
    'sales': {'service': 'VwsmTrdarSelngQq', 'id': 'OA-15572', 'unit': UNITS['sales'], 'fields': MEASURES['sales']},
    'stores': {'service': 'VwsmTrdarStorQq', 'id': 'OA-15577', 'unit': UNITS['stores'], 'fields': MEASURES['stores']},
}
ENTITY_COLUMNS = ('domain', 'area_id', 'industry_id', 'sales', 'stores', 'opened', 'closed',
                  *(f'{m}_{c}_{f}' for m in ('sales', 'stores') for c in ('yoy', 'qoq') for f in ('status', 'pct')),
                  'flow', 'net_openings_4q', 'pattern', 'material', 'finding', 'blocked', 'map_area_id')
PATTERNS = ('spend_up_supply_flat_or_down', 'spend_down_supply_up', 'both_expand', 'both_contract', 'mixed_or_flat')


def encode(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False) + '\n').encode()


def digest(data):
    return hashlib.sha256(data).hexdigest()


def quarter_index(period):
    if not isinstance(period, str) or not re.fullmatch(r'20\d{2}[1-4]', period):
        raise SourceError('INVALID_QUARTER')
    return int(period[:4]) * 4 + int(period[4]) - 1


def quarter(index):
    y, q = divmod(index, 4)
    return str(y) + str(q + 1)


def period_end(period):
    quarter_index(period)
    y, m = int(period[:4]), int(period[4]) * 3
    return date(y, m, calendar.monthrange(y, m)[1])


def number(value):
    if isinstance(value, bool):
        raise SourceError('INVALID_NUMERIC_VALUE')
    if value is None or str(value).strip() == '':
        return None
    try:
        n = float(value)
    except (TypeError, ValueError):
        raise SourceError('INVALID_NUMERIC_VALUE') from None
    if not math.isfinite(n) or n < 0 or n != int(n):
        raise SourceError('INVALID_NUMERIC_VALUE')
    return int(n)


def load_config(root=ROOT):
    return json.loads((Path(root) / CONFIG).read_bytes())


# ---------------------------------------------------------------- normalization

def normalize_row(row, kind, period, spec, geo=None):
    """Exact allowlisted fields. Schema change, scope mismatch and identity faults fail closed."""
    code_key, name_key = spec['geo_code'], spec['geo_name']
    identity = ('STDR_YYQU_CD', code_key, name_key, 'SVC_INDUTY_CD', 'SVC_INDUTY_CD_NM')
    required = (*identity, *MEASURES[kind])
    if not isinstance(row, dict) or not set(required).issubset(row):
        raise SourceError('SCHEMA_CHANGED_' + kind.upper())
    r = {k: str(row[k]).strip() if row[k] is not None else '' for k in identity}
    if r['STDR_YYQU_CD'] != period or (geo is not None and r[code_key] != geo):
        raise SourceError('RESPONSE_SCOPE_MISMATCH')
    if not all(r.values()) or not re.fullmatch(spec['code_pattern'], r[code_key]) or not re.fullmatch(r'CS\d{6}', r['SVC_INDUTY_CD']):
        raise SourceError('INVALID_SOURCE_IDENTITY')
    r.update({k: number(row[k]) for k in MEASURES[kind]})
    if kind == 'stores' and all(r[k] is not None for k in ('SIMILR_INDUTY_STOR_CO', 'STOR_CO', 'FRC_STOR_CO')):
        if r['SIMILR_INDUTY_STOR_CO'] != r['STOR_CO'] + r['FRC_STOR_CO']:
            raise SourceError('STORE_TOTAL_IDENTITY_FAILED')
    return r


V1_SPEC = {'geo_code': 'TRDAR_CD', 'geo_name': 'TRDAR_CD_NM', 'code_pattern': r'\d{7}'}


def normalize(row, kind, period, area):
    """v1 commercial-area contract (kept for the immutable 2026-10-09 snapshot)."""
    return normalize_row(row, kind, period, V1_SPEC, area)


# ---------------------------------------------------------------- transport

class SeoulHistoryClient:
    def __init__(self, key=None, opener=None, budget=80):
        self.key = os.environ.get('SEOUL', '').strip() if key is None else key.strip()
        if not self.key:
            raise SourceError('MISSING_SEOUL_SECRET')
        self.opener = opener or urllib.request.build_opener(NoRedirect())
        self.budget, self.calls = budget, 0

    def call(self, kind, start, end, period, area=None, service=None):
        service = service or SERVICES.get(kind, {}).get('service')
        if not service or not re.fullmatch(r'[A-Za-z]+', service) or not 1 <= start <= end or end - start >= 1000:
            raise SourceError('INVALID_REQUEST_SCOPE')
        if area is not None and not re.fullmatch(r'\d{5,10}', area):
            raise SourceError('INVALID_REQUEST_SCOPE')
        quarter_index(period)
        # Official legacy endpoint (also used by the existing demand collector).
        # GitHub Actions only. Never log or persist a URL containing the path key.
        parts = [urllib.parse.quote(self.key, safe=''), 'json', service, str(start), str(end), period]
        # Sales documents only a quarter argument; v1 stores also documents area.
        if area is not None and kind == 'stores' and service == SERVICES['stores']['service']:
            parts.append(area)
        path = '/'.join(parts)
        for attempt in range(2):
            if self.calls >= self.budget:
                raise SourceError('REQUEST_BUDGET_EXCEEDED')
            self.calls += 1
            try:
                with self.opener.open(urllib.request.Request('http://openapi.seoul.go.kr:8088/' + path + '/', headers={'User-Agent': 'SideEconomyLab/radar-v2'}), timeout=40) as resp:
                    body = resp.read(4_000_001)
                if len(body) > 4_000_000:
                    raise SourceError('RESPONSE_BUDGET_EXCEEDED')
                payload = json.loads(body)
                assert_sanitized(payload, (self.key,))
                return payload
            except SourceError:
                raise
            except urllib.error.HTTPError as exc:
                if exc.code < 500 or attempt == 1:
                    raise SourceError('HTTP_' + str(exc.code)) from None
            except Exception:
                if attempt == 1:
                    raise SourceError('SEOUL_TRANSPORT_OR_PARSE_FAILED') from None


def response(payload, kind, service=None):
    service = service or SERVICES[kind]['service']
    if not isinstance(payload, dict):
        raise SourceError('INVALID_API_RESPONSE')
    block = payload.get(service, {})
    if not isinstance(block, dict):
        raise SourceError('INVALID_API_RESPONSE')
    result = block.get('RESULT', payload.get('RESULT', {}))
    if not isinstance(result, dict):
        raise SourceError('INVALID_API_RESPONSE')
    code = result.get('CODE')
    if code == 'INFO-200':
        return [], 0
    if code != 'INFO-000':
        # Never echo API messages, which may contain the credential/request URL.
        raise SourceError('SEOUL_API_' + (code if isinstance(code, str) and re.fullmatch(r'[A-Z]+-\d{3}', code) else 'UNKNOWN'))
    rows, total = block.get('row'), block.get('list_total_count')
    if not isinstance(rows, list) or isinstance(total, bool) or not isinstance(total, int) or total <= 0:
        raise SourceError('INVALID_API_RESPONSE')
    return rows, total


def fetch_partition(client, kind, period, area, max_rows=5000, page_size=1000):
    """v1: store rows for one commercial area."""
    rows, total = response(client.call(kind, 1, page_size, period, area), kind)
    if total == 0:
        return {'kind': kind, 'period': period, 'area_id': area, 'total': 0, 'rows': [], 'complete': True}
    if total > max_rows:
        raise SourceError('PARTITION_ROW_BUDGET_EXCEEDED')
    if len(rows) != min(page_size, total):
        raise SourceError('INCOMPLETE_PAGINATION')
    all_rows = list(rows)
    for start in range(page_size + 1, total + 1, page_size):
        more, count = response(client.call(kind, start, min(start + page_size - 1, total), period, area), kind)
        if count != total or len(more) != min(page_size, total - start + 1):
            raise SourceError('INCOMPLETE_PAGINATION')
        all_rows.extend(more)
    normalized = [normalize(r, kind, period, area) for r in all_rows]
    if len({r['SVC_INDUTY_CD'] for r in normalized}) != total:
        raise SourceError('DUPLICATE_SOURCE_KEY')
    return {'kind': kind, 'period': period, 'area_id': area, 'total': total, 'complete': True,
            'rows': sorted(normalized, key=lambda r: r['SVC_INDUTY_CD'])}


def fetch_sales_period(client, period, areas, max_rows=60000, page_size=1000):
    """v1: API lacks an area filter; inspect each page once, retain selected rows."""
    selected = {area: [] for area in areas}; seen = set(); receipts = []
    rows, total = response(client.call('sales', 1, page_size, period, areas[0]), 'sales')
    if not 0 < total <= max_rows: raise SourceError('SALES_PERIOD_ROW_BUDGET_EXCEEDED')
    for start in range(1, total + 1, page_size):
        if start != 1:
            rows, count = response(client.call('sales', start, min(start + page_size - 1, total), period, areas[0]), 'sales')
            if count != total: raise SourceError('INCOMPLETE_PAGINATION')
        if len(rows) != min(page_size, total - start + 1): raise SourceError('INCOMPLETE_PAGINATION')
        receipts.append({'start': start, 'rows': len(rows), 'response_hash': digest(encode(rows))})
        for row in rows:
            area = str(row.get('TRDAR_CD', ''))
            r = normalize(row, 'sales', period, area)
            key = (area, r['SVC_INDUTY_CD'])
            if key in seen: raise SourceError('DUPLICATE_SOURCE_KEY')
            seen.add(key)
            if area in selected: selected[area].append(r)
    return [{'kind': 'sales', 'period': period, 'area_id': area, 'total': len(selected[area]),
             'rows': sorted(selected[area], key=lambda r: r['SVC_INDUTY_CD']), 'complete': True,
             'upstream_total': total, 'inspected_rows': len(seen), 'page_receipts': receipts,
             'selection': 'OFFICIAL_ID_FILTER_AFTER_COMPLETE_CITY_PAGINATION'} for area in areas]


def fetch_domain_period(client, kind, period, spec, max_rows, page_size=1000):
    """v2: complete official partition for one quarter (all geographies, all industries)."""
    service = spec['services'][kind]['service']
    rows, total = response(client.call(kind, 1, page_size, period, service=service), kind, service)
    if not 0 < total <= max_rows:
        raise SourceError('PERIOD_ROW_BUDGET_EXCEEDED' if total else 'EMPTY_PERIOD')
    out, seen, receipts = [], set(), []
    for start in range(1, total + 1, page_size):
        if start != 1:
            rows, count = response(client.call(kind, start, min(start + page_size - 1, total), period, service=service), kind, service)
            if count != total: raise SourceError('INCOMPLETE_PAGINATION')
        if len(rows) != min(page_size, total - start + 1): raise SourceError('INCOMPLETE_PAGINATION')
        receipts.append({'start': start, 'rows': len(rows), 'response_hash': digest(encode(rows))})
        for row in rows:
            r = normalize_row(row, kind, period, spec)
            key = (r[spec['geo_code']], r['SVC_INDUTY_CD'])
            if key in seen: raise SourceError('DUPLICATE_SOURCE_KEY')
            seen.add(key); out.append(r)
    return {'kind': kind, 'period': period, 'total': total, 'complete': True, 'page_receipts': receipts,
            'rows': sorted(out, key=lambda r: (r[spec['geo_code']], r['SVC_INDUTY_CD']))}


# ---------------------------------------------------------------- raw validation

def _validate_periods(raw):
    as_of = date.fromisoformat(raw['retrieved_at'][:10])
    periods = raw['periods']
    if len(periods) != 5 or len(set(periods)) != 5 or sorted(periods) != periods:
        raise SourceError('MISSING_HISTORY_PERIOD')
    if any(quarter_index(b) - quarter_index(a) != 1 for a, b in zip(periods, periods[1:])):
        raise SourceError('MISSING_HISTORY_PERIOD')
    if any(period_end(p) > as_of for p in periods):
        raise SourceError('FUTURE_OBSERVATION')


def validate_raw(raw):
    """v1 commercial-area snapshot."""
    assert_sanitized(raw)
    if raw.get('schema_version') != 1 or raw.get('evidence_origin') != 'LIVE_OFFICIAL_API':
        raise SourceError('NOT_LIVE_OFFICIAL_EVIDENCE')
    if raw.get('time_unit') != 'quarter' or raw.get('units') != UNITS:
        raise SourceError('INCOMPATIBLE_TIME_OR_UNITS')
    _validate_periods(raw)
    expected = {(k, p, a) for k in SERVICES for p in raw['periods'] for a in raw['area_ids']}
    seen = set()
    for part in raw['partitions']:
        key = (part['kind'], part['period'], part['area_id'])
        if key not in expected or key in seen or not part['complete'] or part['total'] != len(part['rows']):
            raise SourceError('INCOMPLETE_SOURCE_SNAPSHOT')
        seen.add(key)
        if part['kind'] == 'sales' and 'upstream_total' in part:
            if part['upstream_total'] != part['inspected_rows'] or sum(p['rows'] for p in part['page_receipts']) != part['upstream_total']:
                raise SourceError('INCOMPLETE_PAGINATION')
        normalized = [normalize(r, *key) for r in part['rows']]
        if normalized != part['rows'] or len({r['SVC_INDUTY_CD'] for r in normalized}) != len(normalized):
            raise SourceError('DUPLICATE_OR_INVALID_SOURCE_ROWS')
    if seen != expected:
        raise SourceError('MISSING_HISTORY_PERIOD')
    return raw


def validate_domain_raw(raw, spec):
    """v2 complete-partition snapshot (e.g. district)."""
    assert_sanitized(raw)
    if raw.get('schema_version') != 2 or raw.get('evidence_origin') != 'LIVE_OFFICIAL_API':
        raise SourceError('NOT_LIVE_OFFICIAL_EVIDENCE')
    if raw.get('time_unit') != 'quarter' or raw.get('units') != UNITS:
        raise SourceError('INCOMPATIBLE_TIME_OR_UNITS')
    if raw.get('services') != {k: {'id': v['id'], 'service': v['service']} for k, v in spec['services'].items()}:
        raise SourceError('SERVICE_CONTRACT_CHANGED')
    _validate_periods(raw)
    expected = {(k, p) for k in MEASURES for p in raw['periods']}
    seen = set()
    for part in raw['partitions']:
        key = (part['kind'], part['period'])
        if key not in expected or key in seen or not part['complete'] or part['total'] != len(part['rows']):
            raise SourceError('INCOMPLETE_SOURCE_SNAPSHOT')
        if sum(p['rows'] for p in part['page_receipts']) != part['total']:
            raise SourceError('INCOMPLETE_PAGINATION')
        seen.add(key)
        normalized = [normalize_row(r, *key, spec) for r in part['rows']]
        keys = [(r[spec['geo_code']], r['SVC_INDUTY_CD']) for r in normalized]
        if normalized != part['rows'] or len(set(keys)) != len(keys) or keys != sorted(keys):
            raise SourceError('DUPLICATE_OR_INVALID_SOURCE_ROWS')
    if seen != expected:
        raise SourceError('MISSING_HISTORY_PERIOD')
    return raw


def observations(raw, spec):
    """(geo, industry) -> period -> merged sales/store observation; plus names per period."""
    obs, geo_names, ind_names = {}, {}, {}
    code_key, name_key = spec['geo_code'], spec['geo_name']
    for part in raw['partitions']:
        for r in part['rows']:
            g, i, p = r[code_key], r['SVC_INDUTY_CD'], part['period']
            geo_names.setdefault(g, {}).setdefault(p, set()).add(r[name_key])
            ind_names.setdefault(i, {}).setdefault(p, set()).add(r['SVC_INDUTY_CD_NM'])
            slot = obs.setdefault((g, i), {}).setdefault(p, {})
            if part['kind'] == 'sales':
                slot.update(sales=r['THSMON_SELNG_AMT'], transactions=r['THSMON_SELNG_CO'])
            else:
                slot.update(stores=r['SIMILR_INDUTY_STOR_CO'], general=r['STOR_CO'], franchise=r['FRC_STOR_CO'],
                            opened=r['OPBIZ_STOR_CO'], closed=r['CLSBIZ_STOR_CO'])
    return obs, geo_names, ind_names


# ---------------------------------------------------------------- gates and signals

def official_url(url):
    try:
        u = urllib.parse.urlparse(url or '')
        return u.scheme == 'https' and u.hostname in OFFICIAL_HOSTS
    except ValueError:
        return False


def gate_status(gate, kind):
    """Reviewed official evidence only. Missing fields → NOT_VERIFIED, never assumed."""
    reasons = []
    if gate.get('verified') is not True:
        reasons.append('NOT_VERIFIED_BY_OFFICIAL_EVIDENCE')
    evidence = gate.get('evidence') or []
    if not evidence or not all(official_url(e.get('url')) and re.fullmatch(r'20\d{2}-\d{2}-\d{2}', e.get('observed') or '') and e.get('claim') for e in evidence):
        reasons.append('EVIDENCE_MISSING_OR_UNOFFICIAL')
    required = ('boundary_basis', 'code_basis', 'industry_basis') if kind == 'temporal' else ('crs', 'geometry_version', 'official_crosswalk')
    for key in required:
        if not gate.get(key):
            reasons.append(key.upper() + '_UNKNOWN')
    return {'status': 'VERIFIED' if not reasons else 'NOT_VERIFIED', 'reasons': reasons}


def change(base, current):
    """Percent and absolute change. Missing → UNKNOWN. Zero baseline → UNKNOWN pct."""
    if base is None or current is None:
        return {'status': 'UNKNOWN', 'reason': 'MISSING_OBSERVATION', 'pct': None, 'abs': None}
    if base == 0:
        return {'status': 'UNKNOWN', 'reason': 'ZERO_BASELINE', 'pct': None, 'abs': current - base}
    return {'status': 'OK', 'pct': round((current / base - 1) * 100, 2), 'abs': current - base}


def classify(sales, stores, bands):
    s, t = sales['pct'], stores['pct']
    up_s, down_s = s >= bands['spending_pct'], s <= -bands['spending_pct']
    up_t, down_t = t >= bands['stores_pct'], t <= -bands['stores_pct']
    if up_s and not up_t: return 'spend_up_supply_flat_or_down'
    if down_s and up_t: return 'spend_down_supply_up'
    if up_s and up_t: return 'both_expand'
    if down_s and down_t: return 'both_contract'
    return 'mixed_or_flat'


def flow_direction(history):
    """Last four quarterly net flows (opened − closed). Needs all four observed."""
    recent = history[-4:]
    if any(h.get('opened') is None or h.get('closed') is None for h in recent):
        return 'UNKNOWN', None
    nets = [h['opened'] - h['closed'] for h in recent]
    kind = 'expansion' if all(n > 0 for n in nets) else 'contraction' if all(n < 0 for n in nets) else 'mixed'
    return kind, sum(nets)


def derive_domain(domain_id, spec, raw, periods, rules, gates):
    obs, geo_names, ind_names = observations(raw, spec)
    base_p, prev_p, cur_p = periods[0], periods[-2], periods[-1]
    fresh = (date.fromisoformat(raw['retrieved_at'][:10]) - period_end(cur_p)).days <= rules['freshness_days']
    temporal_ok = gates['temporal']['status'] == 'VERIFIED' and fresh
    rows, details = [], {}
    for (g, i) in sorted(obs):
        history = [dict(period=p, **{k: obs[(g, i)].get(p, {}).get(k) for k in ('sales', 'transactions', 'stores', 'general', 'franchise', 'opened', 'closed')}) for p in periods]
        g_names = {n for p in periods for n in geo_names[g].get(p, set())}
        i_names = {n for p in periods for n in ind_names[i].get(p, set())}
        # Identity must hold in every observed quarter; absence is handled as missing values.
        identity_ok = len(g_names) == 1 and len(i_names) == 1 and all(p in geo_names[g] for p in periods)
        blocked = None if temporal_ok and identity_ok else ('GEOGRAPHY_TEMPORAL_GATE' if not gates['temporal']['status'] == 'VERIFIED' else 'STALE_OBSERVATION' if not fresh else 'SOURCE_IDENTITY_CHANGED')
        def yoy(field, a=base_p):
            if blocked:
                return {'status': 'BLOCKED', 'reason': blocked, 'pct': None, 'abs': None}
            h = {x['period']: x for x in history}
            return change(h[a][field], h[cur_p][field])
        sales, stores = yoy('sales'), yoy('stores')
        sales_q, stores_q = yoy('sales', prev_p), yoy('stores', prev_p)
        flow, net4 = flow_direction(history) if not blocked else ('BLOCKED', None)
        pattern = classify(sales, stores, rules['bands']) if sales['status'] == stores['status'] == 'OK' else None
        material = (history[0]['sales'] or 0) >= rules['materiality']['min_baseline_sales_krw'] and (history[0]['stores'] or 0) >= rules['materiality']['min_baseline_stores']
        finding = bool(material and ((pattern and pattern != 'mixed_or_flat') or flow in ('expansion', 'contraction')))
        row = {'domain': domain_id, 'area_id': g, 'industry_id': i,
               'sales': [history[0]['sales'], history[-2]['sales'], history[-1]['sales']],
               'stores': [history[0]['stores'], history[-2]['stores'], history[-1]['stores']],
               'opened': history[-1]['opened'], 'closed': history[-1]['closed'],
               'sales_yoy': sales, 'stores_yoy': stores, 'sales_qoq': sales_q, 'stores_qoq': stores_q,
               'flow': flow, 'net_openings_4q': net4, 'pattern': pattern, 'material': material, 'finding': finding,
               'blocked': blocked, 'map_area_id': None}
        rows.append(row)
        details.setdefault(g, {})[i] = {'name': sorted(i_names)[0], 'history': history, 'identity_consistent': identity_ok}
    names = {g: sorted({n for p in periods for n in geo_names[g].get(p, set())})[0] for g in geo_names}
    industries = {i: sorted({n for p in periods for n in ind_names[i].get(p, set())})[0] for i in ind_names}
    return rows, details, names, industries, fresh


def load_raw(root, snapshot_id):
    if not re.fullmatch(r'20\d{2}-\d{2}-\d{2}-[a-f0-9]{12}', snapshot_id or ''):
        raise SourceError('INVALID_SNAPSHOT_ID')
    packed = (Path(root) / 'data/opportunity-radar' / snapshot_id / 'source.json.gz').read_bytes()
    if snapshot_id[11:] != digest(packed)[:12]:
        raise SourceError('RAW_HASH_MISMATCH')
    return json.loads(gzip.decompress(packed)), digest(packed)


def source_metadata(domain_id, spec, raw):
    out = []
    for kind, svc in spec['services'].items():
        parts = [p for p in raw['partitions'] if p['kind'] == kind]
        out.append({'id': svc['id'], 'name': svc['name'], 'service': svc['service'],
                    'url': 'https://data.seoul.go.kr/dataList/' + svc['id'] + '/S/1/datasetView.do',
                    'unit': UNITS[kind], 'time_unit': 'quarter', 'periods': raw['periods'],
                    'retrieved_at': raw['retrieved_at'], 'publication_date': None, 'license': spec['license'],
                    'row_count': sum(p['total'] for p in parts),
                    'partitions': sorted([{'period': p['period'], 'area_id': p.get('area_id'), 'rows': p['total'],
                                           'upstream_rows': p.get('upstream_total', p['total']), 'complete': p['complete']} for p in parts],
                                         key=lambda x: (x['period'], x['area_id'] or ''))})
    return out


def columns(row):
    flat = dict(row)
    for m in ('sales', 'stores'):
        for c in ('yoy', 'qoq'):
            ch = flat.pop(f'{m}_{c}')
            # Status carries the reason (ZERO_BASELINE / MISSING_OBSERVATION / BLOCKED); abs = current − base.
            flat.update({f'{m}_{c}_status': ch['status'] if ch['status'] != 'UNKNOWN' else ch['reason'], f'{m}_{c}_pct': ch['pct']})
    return [flat[k] for k in ENTITY_COLUMNS]


def entity_dicts(index):
    return [dict(zip(index['entity_columns'], r)) for r in index['entities']]


def derive(config, raws):
    """raws: domain_id -> (raw, raw_hash, snapshot_id). Deterministic, no network."""
    rules = {k: config[k] for k in ('freshness_days', 'bands', 'materiality')}
    domains, rows, details, industries, periods_all, conflicts = [], [], {}, {}, None, []
    for domain_id, spec in config['domains'].items():
        raw, raw_hash, snapshot_id = raws[domain_id]
        if spec['snapshot_schema'] == 1:
            validate_raw(raw)
            if raw['area_ids'] != spec['area_ids']:
                raise SourceError('SNAPSHOT_SCOPE_MISMATCH')
        else:
            validate_domain_raw(raw, spec)
        periods = raw['periods']
        if periods_all is None: periods_all = periods
        if periods != periods_all:
            raise SourceError('INCOMPATIBLE_PERIODS_ACROSS_DOMAINS')
        gates = {k: gate_status(spec['gates'][k], k) for k in ('temporal', 'gis')}
        d_rows, d_details, names, inds, fresh = derive_domain(domain_id, spec, raw, periods, rules, gates)
        for i, n in inds.items():
            # Domains are never compared with each other; a naming difference is recorded, not merged.
            if industries.setdefault(i, n) != n:
                conflicts.append([i, domain_id, n])
        rows.extend(d_rows)
        for g, items in d_details.items():
            details[(domain_id, g)] = {'schema_version': 2, 'domain': domain_id, 'area_id': g, 'area_name': names[g],
                                       'periods': periods, 'gates': gates, 'snapshot_id': snapshot_id,
                                       'sources': [s['id'] for s in spec['services'].values()],
                                       'industries': items}
        domains.append({'id': domain_id, 'label': spec['label'], 'scope': spec['scope'], 'snapshot_id': snapshot_id, 'raw_hash': raw_hash,
                        'gates': {k: {**gates[k], **{x: spec['gates'][k].get(x) for x in ('summary', 'limitation', 'evidence', 'boundary_basis', 'code_basis', 'industry_basis', 'crs', 'geometry_version', 'official_crosswalk')}}
                                  for k in gates},
                        'fresh': fresh, 'retrieved_at': raw['retrieved_at'], 'sources': source_metadata(domain_id, spec, raw),
                        'areas': [[g, names[g]] for g in sorted(names)],
                        'coverage': {'areas': len(names), 'industries': len(inds), 'entities': len(d_rows),
                                     'comparable': sum(r['blocked'] is None for r in d_rows),
                                     'findings': sum(r['finding'] for r in d_rows), 'mapped': 0}})
    index = {'schema_version': 2, 'status': 'AVAILABLE', 'periods': periods_all,
             'comparisons': {'yoy': [periods_all[0], periods_all[-1]], 'qoq': [periods_all[-2], periods_all[-1]]},
             'rules': {**rules, 'formula': '(비교값 ÷ 기준값 − 1) × 100', 'zero_baseline': 'UNKNOWN', 'missing': 'UNKNOWN', 'incompatible': 'BLOCKED'},
             'patterns': config['patterns'], 'domains': domains,
             'industries': [[i, industries[i]] for i in sorted(industries)], 'industry_name_differences': conflicts,
             # Columnar rows keep the summary index compact; values are identical to the per-area details.
             'entity_columns': list(ENTITY_COLUMNS), 'entities': [columns(r) for r in rows],
             'coverage': {'entities': len(rows), 'comparable': sum(r['blocked'] is None for r in rows),
                          'findings': sum(r['finding'] for r in rows), 'mapped': 0},
             'hypotheses': [], 'activity_enabled': False}
    return index, details


# ---------------------------------------------------------------- publication

def atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.stage')
    try:
        temp.write_bytes(data); temp.replace(path)
    finally:
        temp.unlink(missing_ok=True)


def detail_path(root, domain_id, area):
    return Path(root) / DETAILS / (domain_id + '-' + area + '.json')


def build(root, config, snapshots):
    raws = {d: (*load_raw(root, s), s) for d, s in snapshots.items()}
    index, details = derive(config, raws)
    outputs = {}
    for (domain_id, area), detail in details.items():
        b = encode(detail)
        if len(b) > 120000: raise SourceError('DETAIL_BUDGET_EXCEEDED')
        outputs[detail_path(root, domain_id, area)] = b
    index['detail_hashes'] = {p.stem: digest(b) for p, b in sorted(outputs.items())}
    ib = encode(index)
    if len(ib) > 1_500_000: raise SourceError('INDEX_BUDGET_EXCEEDED')
    outputs[Path(root) / INDEX] = ib
    return index, outputs


def store_snapshot(root, raw):
    packed = gzip.compress(encode(raw), mtime=0)
    if len(packed) > 5_000_000: raise SourceError('SNAPSHOT_BUDGET_EXCEEDED')
    identity = raw['retrieved_at'][:10] + '-' + digest(packed)[:12]
    source = Path(root) / 'data/opportunity-radar' / identity / 'source.json.gz'
    if source.exists() and source.read_bytes() != packed: raise SourceError('IMMUTABLE_SNAPSHOT_COLLISION')
    return identity, source, packed


def publish(root, config, snapshots, new_raw=None, status=None):
    """Validate everything in memory, then write details → index → status; restore on any failure."""
    root = Path(root)
    staged = None
    if new_raw is not None:
        domain_id, raw = new_raw
        validate_domain_raw(raw, config['domains'][domain_id])  # nothing is written for an invalid source
        identity, source, packed = store_snapshot(root, raw)
        snapshots = {**snapshots, domain_id: identity}
        staged = (source, packed, source.exists())
        if not staged[2]: atomic(source, packed)
    stale = sorted(p for p in (root / DETAILS).glob('*.json')) if (root / DETAILS).exists() else []
    before = {p: p.read_bytes() for p in [*stale, root / INDEX, root / STATUS] if p.exists()}
    try:
        index, outputs = build(root, config, snapshots)
        for p in stale:
            if p not in outputs: p.unlink()
        for p, b in outputs.items():
            if p != root / INDEX: atomic(p, b)
        atomic(root / INDEX, outputs[root / INDEX])
        atomic(root / STATUS, encode(status or {'schema_version': 2, 'status': 'AVAILABLE', 'snapshots': snapshots}))
        check(root)
    except Exception:
        for p in (root / DETAILS).glob('*.json') if (root / DETAILS).exists() else []:
            if p not in before: p.unlink()
        for p, b in before.items(): atomic(p, b)
        if root / INDEX not in before: (root / INDEX).unlink(missing_ok=True)
        if staged and not staged[2]:
            staged[0].unlink(missing_ok=True)
            try: staged[0].parent.rmdir()
            except OSError: pass
        raise
    return snapshots


def current_snapshots(root=ROOT):
    index = json.loads((Path(root) / INDEX).read_bytes())
    if index.get('schema_version') != 2: raise SourceError('INDEX_SCHEMA_UNSUPPORTED')
    return {d['id']: d['snapshot_id'] for d in index['domains']}


def check(root=ROOT):
    root = Path(root); config = load_config(root)
    index = json.loads((root / INDEX).read_bytes())
    snapshots = current_snapshots(root)
    if set(snapshots) != set(config['domains']): raise SourceError('DOMAIN_SET_MISMATCH')
    expected, outputs = build(root, config, snapshots)
    for p, b in outputs.items():
        if not p.exists() or p.read_bytes() != b:
            raise SourceError('DETAIL_DERIVATION_MISMATCH' if p.parent.name == Path(DETAILS).name else 'INDEX_DERIVATION_MISMATCH')
    extra = {p for p in (root / DETAILS).glob('*.json')} - set(outputs)
    if extra: raise SourceError('ORPHAN_DETAIL_FILES')
    # Gate independence: mapping requires the GIS gate; signals require the temporal gate.
    for d in expected['domains']:
        rows = [r for r in entity_dicts(expected) if r['domain'] == d['id']]
        if d['gates']['gis']['status'] != 'VERIFIED' and any(r['map_area_id'] for r in rows):
            raise SourceError('UNVERIFIED_MAP_JOIN')
        if d['gates']['temporal']['status'] != 'VERIFIED' and any(r[k] != 'BLOCKED' for r in rows for k in ('sales_yoy_status', 'stores_yoy_status', 'sales_qoq_status', 'stores_qoq_status')):
            raise SourceError('UNVERIFIED_TEMPORAL_SIGNAL')
    return index


def collect_domain(domain_id, root=ROOT, client=None, now=None):
    root = Path(root); config = load_config(root); spec = config['domains'][domain_id]
    if spec['snapshot_schema'] != 2: raise SourceError('DOMAIN_NOT_COLLECTABLE')
    now = now or datetime.now(timezone.utc)
    if not client: client = SeoulHistoryClient(budget=spec['request_budget'])
    # Probe completed quarters only; a publication-date change is not an observation.
    newest = now.year * 4 + (now.month - 1) // 3 - 1
    selected = None
    for offset in range(4):
        period = quarter(newest - offset)
        probes = [response(client.call(k, 1, 1, period, service=spec['services'][k]['service']), k, spec['services'][k]['service'])[0] for k in MEASURES]
        if all(probes): selected = period; break
    if selected is None: raise SourceError('NO_COMMON_RECENT_QUARTER')
    periods = [quarter(quarter_index(selected) - n) for n in range(4, -1, -1)]
    raw = {'schema_version': 2, 'evidence_origin': 'LIVE_OFFICIAL_API', 'domain': domain_id, 'retrieved_at': now.isoformat(),
           'time_unit': 'quarter', 'units': UNITS, 'periods': periods,
           'services': {k: {'id': v['id'], 'service': v['service']} for k, v in spec['services'].items()}, 'partitions': []}
    for period in periods:
        for kind in MEASURES:
            raw['partitions'].append(fetch_domain_period(client, kind, period, spec, spec['max_rows_per_period']))
    raw['request_count'] = client.calls
    assert_sanitized(raw, (client.key,))
    validate_domain_raw(raw, spec)
    return raw


def run(root=ROOT, domain_id='district'):
    root = Path(root); now = datetime.now(timezone.utc).isoformat()
    config = load_config(root)
    # Fixed (non-collectable) snapshots, then whatever the current valid index publishes.
    previous = {d: s['snapshot'] for d, s in config['domains'].items() if s.get('snapshot')}
    try:
        previous.update(current_snapshots(root))
    except Exception:
        pass
    try:
        raw = collect_domain(domain_id, root)
        snapshots = publish(root, config, previous, new_raw=(domain_id, raw),
                            status={'schema_version': 2, 'status': 'AVAILABLE', 'domain': domain_id, 'attempted_at': now})
    except Exception as exc:
        code = str(exc) if isinstance(exc, SourceError) and re.fullmatch(r'[A-Z_0-9-]+', str(exc)) else 'SOURCE_VALIDATION_FAILED'
        atomic(root / STATUS, encode({'schema_version': 2, 'status': 'BLOCKED', 'domain': domain_id, 'attempted_at': now,
                                      'reason': code, 'previous_snapshot_preserved': True, 'snapshots': previous}))
        print('RADAR_BLOCKED domain=' + domain_id + ' reason=' + code + '; previous snapshot preserved')
        return 1
    print('RADAR_SOURCE_VALIDATED domain=' + domain_id + ' snapshot=' + snapshots[domain_id] + ' requests=' + str(raw.get('request_count')))
    return 0


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--domain', default='district')
    parser.add_argument('--rebuild', nargs='*', metavar='DOMAIN=SNAPSHOT', help='re-derive from existing immutable snapshots')
    args = parser.parse_args()
    if args.check:
        check(); print('RADAR_BUNDLE_VALID')
    elif args.rebuild is not None:
        snaps = dict(x.split('=', 1) for x in args.rebuild) if args.rebuild else current_snapshots()
        publish(ROOT, load_config(), snaps); print('RADAR_REBUILT ' + json.dumps(snaps))
    else:
        raise SystemExit(run(domain_id=args.domain))
