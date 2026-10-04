#!/usr/bin/env python3
"""Audited market context; never site terms, scoring, or a new demand model."""
import argparse
import calendar
import csv
import hashlib
import io
import json
import math
import re
import tempfile
import urllib.parse
import urllib.request
import zipfile
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SNAPSHOT = ROOT / 'data/real-estate-context/2026-10-04'
OUTPUT = ROOT / 'docs/data/real-estate-context.json'
SEOUL_DISTRICTS = set('종로구 중구 용산구 성동구 광진구 동대문구 중랑구 성북구 강북구 도봉구 노원구 은평구 서대문구 마포구 양천구 강서구 구로구 금천구 영등포구 동작구 관악구 서초구 강남구 송파구 강동구'.split())
TABLES = {'rent': 'T248223134698125', 'vacancy': 'T241833134686576'}
UNITS = {'rent': '천원/㎡', 'vacancy': '%'}
ITEMS = {'rent': '임대료', 'vacancy': '공실률'}
COUNT_FIELDS = ['similr_induty_stor_co', 'stor_co', 'frc_stor_co', 'opbiz_stor_co', 'clsbiz_stor_co']
STATUSES = ['AVAILABLE', 'UNAVAILABLE', 'NOT_COLLECTED', 'STALE', 'INCOMPATIBLE_GEOGRAPHY', 'SOURCE_ERROR']


def sha(data):
    return hashlib.sha256(data).hexdigest()


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


def active_snapshot():
    if OUTPUT.exists():
        identity = json.loads(OUTPUT.read_bytes()).get('snapshot_id')
        if isinstance(identity, str) and re.fullmatch(r'20\d{2}-\d{2}-\d{2}(?:-[a-f0-9]{12})?', identity):
            path = ROOT / 'data/real-estate-context' / identity
            if path.is_dir():
                return path
    return DEFAULT_SNAPSHOT


def period_end(period):
    if not isinstance(period, str) or not re.fullmatch(r'20\d{2}[1-4]', period):
        raise ValueError('invalid quarter')
    year, month = int(period[:4]), int(period[-1]) * 3
    return date(year, month, calendar.monthrange(year, month)[1])


def freshness(period, as_of, max_age_days=180):
    age = (date.fromisoformat(as_of) - period_end(period)).days
    if age < 0:
        raise ValueError('future observation period')
    return {'status': 'STALE' if age > max_age_days else 'AVAILABLE', 'age_days': age,
            'max_age_days': max_age_days, 'period_end': period_end(period).isoformat()}


def nonnegative(value):
    if isinstance(value, bool) or value is None or str(value).strip() == '':
        raise ValueError('missing numeric observation')
    result = float(value)
    if not math.isfinite(result) or result < 0:
        raise ValueError('invalid numeric observation')
    return result


def parse_stores(raw):
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        entries = archive.infolist()
        if len(entries) != 1 or not entries[0].filename.endswith('.csv') or entries[0].file_size > 60_000_000:
            raise ValueError('unexpected store archive')
        data = archive.read(entries[0])
    try:
        text = data.decode('utf-8-sig')
    except UnicodeDecodeError:
        text = data.decode('cp949')
    rows = list(csv.DictReader(io.StringIO(text)))
    required = {'stdr_yyqu_cd', 'trdar_cd', 'trdar_cd_nm', 'svc_induty_cd', *COUNT_FIELDS}
    if not rows or not required.issubset(rows[0]):
        raise ValueError('store schema changed')
    periods = sorted({r['stdr_yyqu_cd'] for r in rows})
    for p in periods:
        period_end(p)
    latest = periods[-1]
    groups = defaultdict(lambda: {'name': None, 'industry_count': 0, 'store_count': 0, 'opened_count': 0, 'closed_count': 0})
    seen = set()
    latest_count = 0
    for row in rows:
        if row['stdr_yyqu_cd'] != latest:
            continue
        key = (row['trdar_cd'], row['svc_induty_cd'])
        if not all(key) or key in seen:
            raise ValueError('duplicate or empty store key')
        seen.add(key)
        values = {f: nonnegative(row[f]) for f in COUNT_FIELDS}
        if any(v != int(v) for v in values.values()):
            raise ValueError('fractional store count')
        if values['similr_induty_stor_co'] != values['stor_co'] + values['frc_stor_co']:
            raise ValueError('store count identity changed')
        group = groups[row['trdar_cd']]
        if group['name'] not in (None, row['trdar_cd_nm']) or not row['trdar_cd_nm']:
            raise ValueError('inconsistent area name')
        group['name'] = row['trdar_cd_nm']
        group['industry_count'] += 1
        group['store_count'] += int(values['similr_induty_stor_co'])
        group['opened_count'] += int(values['opbiz_stor_co'])
        group['closed_count'] += int(values['clsbiz_stor_co'])
        latest_count += 1
    return dict(groups), {'period': latest, 'periods': periods, 'raw_rows': len(rows),
                         'latest_rows': latest_count, 'source_area_count': len(groups), 'csv_hash': sha(data)}


def parse_reb(raw, codes_raw, metric, period):
    """Sample API is sufficient only for this EXACT one-cell request, not a census."""
    payload = json.loads(raw)
    blocks = payload.get('SttsApiTblData')
    if not isinstance(blocks, list):
        raise ValueError('REB response unavailable')
    heads = [h for block in blocks for h in block.get('head', [])]
    rows = [r for block in blocks for r in block.get('row', [])]
    if not any(h.get('RESULT', {}).get('CODE') == 'INFO-000' for h in heads):
        raise ValueError('REB source error')
    if [h['list_total_count'] for h in heads if 'list_total_count' in h] != [1] or len(rows) != 1:
        raise ValueError('REB target incomplete or mixed')
    row = rows[0]
    expected = {'STATBL_ID': TABLES[metric], 'DTACYCLE_CD': 'QY', 'CLS_ID': 500002,
                'CLS_NM': '서울', 'CLS_FULLNM': '서울', 'ITM_ID': 100001,
                'ITM_NM': ITEMS[metric], 'UI_NM': UNITS[metric], 'WRTTIME_IDTFR_ID': period}
    if any(row.get(k) != v for k, v in expected.items()):
        raise ValueError('REB geography, unit or period mismatch')
    codes = json.loads(codes_raw).get('data', [])
    if not any(c.get('statblId') == TABLES[metric] and c.get('itmTag') == '분류'
               and c.get('itmId') == 500002 and c.get('itmNm') == '서울' for c in codes):
        raise ValueError('REB code geography not proven')
    value = nonnegative(row.get('DTA_VAL'))
    if metric == 'vacancy' and value > 100:
        raise ValueError('invalid vacancy percentage')
    return value


def build(snapshot=None, demand_path=ROOT / 'docs/data/seoul-opportunity-map.json', as_of=None):
    snapshot = Path(snapshot) if snapshot else active_snapshot()
    manifest_bytes = (snapshot / 'manifest.json').read_bytes()
    manifest = json.loads(manifest_bytes)
    as_of = as_of or manifest['retrieved_at'][:10]
    date.fromisoformat(as_of)
    retrieved = datetime.fromisoformat(manifest['retrieved_at'].replace('Z', '+00:00'))
    if retrieved.utcoffset() is None:
        raise ValueError('retrieval timezone missing')
    raw = {}
    for name, digest in manifest['files'].items():
        if Path(name).name != name:
            raise ValueError('invalid source path')
        raw[name] = (snapshot / name).read_bytes()
        if sha(raw[name]) != digest:
            raise ValueError('raw snapshot identity mismatch')
    demand_bytes = Path(demand_path).read_bytes()
    demand = json.loads(demand_bytes)
    areas = demand['areas']
    if not areas or len({a['trdar_cd'] for a in areas}) != len(areas) or any(a['district'] not in SEOUL_DISTRICTS for a in areas):
        raise ValueError('unproven Seoul target geography')
    stores, store_meta = parse_stores(raw['seoul-stores-2025.zip'])
    # IDs alone are insufficient: names must also match. No implicit aliases.
    matched = [a for a in areas if a['trdar_cd'] in stores and stores[a['trdar_cd']]['name'] == a['trdar_name']]
    if len(matched) / len(areas) < .99 or set(stores) != {a['trdar_cd'] for a in areas}:
        raise ValueError('store geography changed; new audit required')
    store_freshness = freshness(store_meta['period'], as_of)
    observations = []
    for area in sorted(areas, key=lambda a: a['trdar_cd']):
        row = stores.get(area['trdar_cd'])
        compatible = bool(row and row['name'] == area['trdar_name'])
        observations.append({'trdar_cd': area['trdar_cd'], 'target_name': area['trdar_name'],
            'source_name': row['name'] if row else None, 'source_id': 'seoul-stores',
            'geography_type': 'commercial_area_id', 'mapping': 'exact_id_and_name' if compatible else 'rejected_name_mismatch',
            'exactness': 'published_area_aggregate' if compatible else 'unproven',
            'period': store_meta['period'], 'freshness': store_freshness,
            'status': store_freshness['status'] if compatible else 'INCOMPATIBLE_GEOGRAPHY',
            'store_count': row['store_count'] if compatible else None,
            'opened_count': row['opened_count'] if compatible else None,
            'closed_count': row['closed_count'] if compatible else None,
            'industry_count': row['industry_count'] if compatible else None})
    reb_period = manifest['reb_period']
    if not re.fullmatch(r'20\d{2}0[1-4]', reb_period):
        raise ValueError('invalid REB quarter')
    market_period = reb_period[:4] + reb_period[-1]
    market = {'geography_type': 'city', 'geography_id': '11', 'name': '서울 전체 · 소규모 상가',
              'exactness': 'contextual_only', 'mapping': 'Seoul city membership; no submarket/district inference',
              'period': market_period, 'freshness': freshness(market_period, as_of), 'source_id': 'reb-small-retail'}
    market['status'] = market['freshness']['status']
    market['rent_thousand_krw_per_sqm'] = parse_reb(raw['reb-rent.json'], raw['reb-rent-codes.json'], 'rent', reb_period)
    market['vacancy_pct'] = parse_reb(raw['reb-vacancy.json'], raw['reb-vacancy-codes.json'], 'vacancy', reb_period)
    return {'schema_version': 1, 'as_of': as_of, 'demand_hash': sha(demand_bytes),
            'snapshot_id': manifest['snapshot_id'], 'manifest_hash': sha(manifest_bytes),
            'retrieved_at': manifest['retrieved_at'], 'raw_hashes': manifest['files'], 'sources': manifest['sources'],
            'coverage': {**store_meta, 'target_area_count': len(areas), 'matched_area_count': len(matched),
                         'incompatible_area_count': len(areas) - len(matched), 'market_cell_count': 2},
            'freshness_policy': 'STALE when observation-quarter end is over 180 days old; retrieval does not reset age',
            'statuses': STATUSES, 'markets': [market], 'areas': observations,
            'not_collected': {'building_context': 'NOT_COLLECTED', 'actual_site_terms': 'NOT_COLLECTED'},
            'limitations': ['Market context is not site terms; no rent imputation, ROI or ranking effects.',
                            'Store counts cover listed service categories, not all commercial premises or vacancy.',
                            'Area ID/name match is not proof of unchanged polygons or a standard-unit crosswalk.',
                            'No direct join to 2024+ standard spatial units; no fine-grained REB submarket mapping.']}


def publish(snapshot, output=OUTPUT, demand_path=ROOT / 'docs/data/seoul-opportunity-map.json', as_of=None):
    # Complete validation BEFORE any replacement. Failure preserves previous bytes.
    payload = build(snapshot, demand_path, as_of)
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=output.parent, delete=False) as f:
        temp = Path(f.name)
        f.write((json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(',', ':')) + '\n').encode())
    temp.replace(output)
    return payload


def refresh(snapshot=None, output=OUTPUT):
    """Manual, five unauthenticated official reads; all-or-nothing new snapshot."""
    snapshot = Path(snapshot) if snapshot else active_snapshot()
    manifest = json.loads((snapshot / 'manifest.json').read_bytes())
    urls = manifest['retrieval_urls']
    new_raw = {}
    for name, spec in urls.items():
        url = spec['url']
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme != 'https' or parsed.hostname not in ('www.reb.or.kr', 'datafile.seoul.go.kr'):
            raise ValueError('unapproved source host')
        data = urllib.parse.urlencode(spec['post']).encode() if spec.get('post') else None
        req = urllib.request.Request(url, data=data, headers={'User-Agent': 'SideEconomyLab/context-v1'})
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                new_raw[name] = response.read(10_000_001)
            if len(new_raw[name]) > 10_000_000:
                raise ValueError('source exceeds budget')
        except Exception:
            raise RuntimeError('SOURCE_ERROR: refresh incomplete; last snapshot preserved') from None
    manifest['retrieved_at'] = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    manifest['files'] = {name: sha(data) for name, data in new_raw.items()}
    manifest['snapshot_id'] = manifest['retrieved_at'][:10] + '-' + sha(encoded(manifest['files']))[:12]
    target = ROOT / 'data/real-estate-context' / manifest['snapshot_id']
    with tempfile.TemporaryDirectory() as temporary:
        staged = Path(temporary)
        for name, data in new_raw.items():
            (staged / name).write_bytes(data)
        (staged / 'manifest.json').write_bytes(encoded(manifest))
        payload = build(staged)
        if target.exists():
            raise ValueError('immutable snapshot already exists')
        target.mkdir(parents=True)
        for f in staged.iterdir():
            (target / f.name).write_bytes(f.read_bytes())
        publish(target, output)
    return payload


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot', type=Path, help='Defaults to committed active snapshot, or first audited snapshot')
    parser.add_argument('--output', type=Path, default=OUTPUT)
    parser.add_argument('--as-of', help='ISO date for reproducible offline freshness')
    parser.add_argument('--refresh', action='store_true', help='Manually refetch audited, pinned sources, never secrets')
    args = parser.parse_args()
    try:
        result = refresh(args.snapshot, args.output) if args.refresh else publish(args.snapshot, args.output, as_of=args.as_of)
    except Exception:
        raise SystemExit('SOURCE_ERROR / validation failure: prior context preserved; inspect source audit') from None
    print(json.dumps({'snapshot_id': result['snapshot_id'], 'coverage': result['coverage']}, ensure_ascii=False))
