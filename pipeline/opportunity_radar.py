"""Bounded Seoul history -> immutable snapshot -> inspectable, fail-closed radar.

No changes to demand scores, economics, candidate gates, or private records.
Unknown geography revisions prevent comparisons even when API collection succeeds.
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
INDEX = 'docs/data/opportunity-radar.json'
STATUS = 'docs/data/opportunity-radar-status.json'
IDENTITY = ('STDR_YYQU_CD', 'TRDAR_CD', 'TRDAR_CD_NM', 'SVC_INDUTY_CD', 'SVC_INDUTY_CD_NM')
SERVICES = {
    'sales': {'service': 'VwsmTrdarSelngQq', 'id': 'OA-15572', 'unit': 'KRW/quarter',
              'fields': ('THSMON_SELNG_AMT', 'THSMON_SELNG_CO')},
    'stores': {'service': 'VwsmTrdarStorQq', 'id': 'OA-15577', 'unit': 'establishments/quarter',
               'fields': ('SIMILR_INDUTY_STOR_CO', 'STOR_CO', 'FRC_STOR_CO', 'OPBIZ_STOR_CO', 'CLSBIZ_STOR_CO')}
}


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
    if value is None or isinstance(value, bool) or str(value).strip() == '':
        return None
    try:
        n = float(value)
    except (TypeError, ValueError):
        raise SourceError('INVALID_NUMERIC_VALUE') from None
    if not math.isfinite(n) or n < 0 or n != int(n):
        raise SourceError('INVALID_NUMERIC_VALUE')
    return int(n)


def normalize(row, kind, period, area):
    required = (*IDENTITY, *SERVICES[kind]['fields'])
    if not isinstance(row, dict) or not set(required).issubset(row):
        raise SourceError('SCHEMA_CHANGED_' + kind.upper())
    r = {k: str(row[k]).strip() if row[k] is not None else '' for k in IDENTITY}
    if r['STDR_YYQU_CD'] != period or r['TRDAR_CD'] != area:
        raise SourceError('RESPONSE_SCOPE_MISMATCH')
    if not all(r.values()) or not re.fullmatch(r'CS\d{6}', r['SVC_INDUTY_CD']):
        raise SourceError('INVALID_SOURCE_IDENTITY')
    r.update({k: number(row[k]) for k in SERVICES[kind]['fields']})
    if kind == 'stores' and all(r[k] is not None for k in ('SIMILR_INDUTY_STOR_CO', 'STOR_CO', 'FRC_STOR_CO')):
        if r['SIMILR_INDUTY_STOR_CO'] != r['STOR_CO'] + r['FRC_STOR_CO']:
            raise SourceError('STORE_TOTAL_IDENTITY_FAILED')
    return r


class SeoulHistoryClient:
    def __init__(self, key=None, opener=None, budget=80):
        self.key = os.environ.get('SEOUL', '').strip() if key is None else key.strip()
        if not self.key:
            raise SourceError('MISSING_SEOUL_SECRET')
        self.opener = opener or urllib.request.build_opener(NoRedirect())
        self.budget, self.calls = budget, 0

    def call(self, kind, start, end, period, area):
        if kind not in SERVICES or not 1 <= start <= end or end - start >= 1000 or not re.fullmatch(r'\d{7}', area):
            raise SourceError('INVALID_REQUEST_SCOPE')
        quarter_index(period)
        # Official legacy endpoint also used by the existing demand collector.
        # GitHub Actions only. Never log or persist a URL containing the path key.
        path = '/'.join((urllib.parse.quote(self.key, safe=''), 'json', SERVICES[kind]['service'], str(start), str(end), period, area))
        for attempt in range(2):
            if self.calls >= self.budget:
                raise SourceError('REQUEST_BUDGET_EXCEEDED')
            self.calls += 1
            try:
                with self.opener.open(urllib.request.Request('http://openapi.seoul.go.kr:8088/' + path + '/', headers={'User-Agent': 'SideEconomyLab/radar-v1'}), timeout=25) as response:
                    body = response.read(4_000_001)
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


def response(payload, kind):
    if not isinstance(payload, dict):
        raise SourceError('INVALID_API_RESPONSE')
    block = payload.get(SERVICES[kind]['service'], {})
    result = block.get('RESULT', payload.get('RESULT', {}))
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


def validate_raw(raw):
    assert_sanitized(raw)
    if raw.get('schema_version') != 1 or raw.get('evidence_origin') != 'LIVE_OFFICIAL_API':
        raise SourceError('NOT_LIVE_OFFICIAL_EVIDENCE')
    if raw.get('time_unit') != 'quarter' or raw.get('units') != {k: v['unit'] for k, v in SERVICES.items()}:
        raise SourceError('INCOMPATIBLE_TIME_OR_UNITS')
    as_of = date.fromisoformat(raw['retrieved_at'][:10])
    periods = raw['periods']
    if len(periods) != 5 or len(set(periods)) != 5 or sorted(periods) != periods:
        raise SourceError('MISSING_HISTORY_PERIOD')
    if any(quarter_index(b) - quarter_index(a) != 1 for a, b in zip(periods, periods[1:])):
        raise SourceError('MISSING_HISTORY_PERIOD')
    if any(period_end(p) > as_of for p in periods):
        raise SourceError('FUTURE_OBSERVATION')
    expected = {(k, p, a) for k in SERVICES for p in periods for a in raw['area_ids']}
    seen = set()
    for part in raw['partitions']:
        key = (part['kind'], part['period'], part['area_id'])
        if key not in expected or key in seen or not part['complete'] or part['total'] != len(part['rows']):
            raise SourceError('INCOMPLETE_SOURCE_SNAPSHOT')
        seen.add(key)
        normalized = [normalize(r, *key) for r in part['rows']]
        if normalized != part['rows'] or len({r['SVC_INDUTY_CD'] for r in normalized}) != len(normalized):
            raise SourceError('DUPLICATE_OR_INVALID_SOURCE_ROWS')
    if seen != expected:
        raise SourceError('MISSING_HISTORY_PERIOD')
    return raw


def derive(raw):
    validate_raw(raw)
    lookup = {(p['kind'], p['period'], p['area_id']): {r['SVC_INDUTY_CD']: r for r in p['rows']} for p in raw['partitions']}
    geography = raw['geography']
    comparable = geography.get('comparability_verified') is True and bool(geography.get('version')) and bool(geography.get('evidence_url'))
    fresh = (date.fromisoformat(raw['retrieved_at'][:10]) - period_end(raw['periods'][-1])).days <= raw['freshness_days']
    entities, details, signals = [], {}, []
    for area in raw['area_ids']:
        codes = sorted({r['SVC_INDUTY_CD'] for p in raw['partitions'] if p['area_id'] == area for r in p['rows']})
        for code in codes:
            identity = area + '-' + code
            history, names, industry_names = [], set(), set()
            for period in raw['periods']:
                s = lookup[('sales', period, area)].get(code)
                t = lookup[('stores', period, area)].get(code)
                for row in (s, t):
                    if row:
                        names.add(row['TRDAR_CD_NM']); industry_names.add(row['SVC_INDUTY_CD_NM'])
                history.append({'period': period, 'sales': s.get('THSMON_SELNG_AMT') if s else None,
                                'transactions': s.get('THSMON_SELNG_CO') if s else None,
                                'stores': t.get('SIMILR_INDUTY_STOR_CO') if t else None,
                                'opened': t.get('OPBIZ_STOR_CO') if t else None, 'closed': t.get('CLSBIZ_STOR_CO') if t else None})
            complete = sum(v is not None for h in history for k, v in h.items() if k != 'period') / 25
            issues = []
            if not comparable: issues.append('GEOGRAPHY_REVISION_UNKNOWN')
            if len(names) != 1 or len(industry_names) != 1: issues.append('SOURCE_IDENTITY_CHANGED')
            if not fresh: issues.append('STALE_OBSERVATION')
            if complete < 1: issues.append('MISSING_OBSERVATIONS')
            item = {'id': identity, 'area_id': area, 'area_name': sorted(names)[0] if names else area,
                    'industry_id': code, 'industry_name': sorted(industry_names)[0] if industry_names else code,
                    'period': raw['periods'][-1], 'evidence_completeness': round(complete, 4), 'issues': issues,
                    'map_area_id': None, 'geography_domain': geography['domain'], 'signal_ids': [],
                    'latest': history[-1], 'detail_url': './data/opportunity-radar-details/' + identity + '.json'}
            # No name/centroid crosswalk. Future mapping must be an official versioned
            # crosswalk bound to the exact existing GIS bytes, validated outside the UI.
            if not issues:
                baseline, latest = history[0], history[-1]
                if baseline['sales'] > 0 and baseline['stores'] > 0:
                    spending = (latest['sales'] / baseline['sales'] - 1) * 100
                    supply = (latest['stores'] / baseline['stores'] - 1) * 100
                    if spending > 0 and spending > supply:
                        signal = {'id': identity + '-spending', 'entity_id': identity, 'type': 'spending',
                                  'interpretation': '이 지역·업종은 전년 같은 분기보다 추정 소비가 늘었고, 증가율이 점포 증가율보다 높습니다.',
                                  'sales_change_pct': round(spending, 2), 'store_change_pct': round(supply, 2),
                                  'baseline': baseline, 'current': latest, 'periods': [baseline['period'], latest['period']],
                                  'alternative': '물가·카드 보정·기존 대형점 매출 집중으로도 나타날 수 있습니다. 시장 공백이나 수익의 증거는 아닙니다.',
                                  'next_action': '가격 변화와 점포별 매출 분포를 확인하고, 고객 5명에게 실제 불편·지출을 질문하세요.'}
                        signals.append(signal); item['signal_ids'].append(signal['id'])
                recent = history[-3:]
                if all(h['stores'] > 0 for h in recent) and all(h['opened'] + h['closed'] > 0 for h in recent):
                    directions = [h['opened'] - h['closed'] for h in recent]
                    kind = 'expansion' if all(d > 0 for d in directions) else 'contraction' if all(d < 0 for d in directions) else 'turnover'
                    signal = {'id': identity + '-churn', 'entity_id': identity, 'type': 'churn', 'churn_kind': kind,
                              'interpretation': {'expansion': '최근 3개 분기 연속 개업 점포가 폐업 점포보다 많습니다.', 'contraction': '최근 3개 분기 연속 폐업 점포가 개업 점포보다 많습니다.', 'turnover': '최근 3개 분기에 진입·퇴출이 이어지며 순증감 방향은 일정하지 않습니다.'}[kind],
                              'store_change_count': latest['stores'] - history[-2]['stores'],
                              'baseline': history[-2], 'current': latest, 'periods': [recent[0]['period'], latest['period']],
                              'alternative': '이전·업종 전환·등록 시차로도 개폐업이 발생합니다. 폐업만으로 사업 악화를 단정하지 않습니다.',
                              'next_action': '최근 개폐업 점포 3곳의 이전·폐업 사유와 실제 운영 상태를 확인하세요.'}
                    signals.append(signal); item['signal_ids'].append(signal['id'])
            details[identity] = {'schema_version': 1, 'entity': item, 'history': history, 'geography': geography,
                                 'sources': source_metadata(raw), 'comparable': not issues,
                                 'signals': [s for s in signals if s['entity_id'] == identity]}
            entities.append(item)
    for s in signals:
        s.update({'source_ids': ['OA-15572', 'OA-15577'], 'evidence_status': 'DERIVED_FROM_MODELED_STATISTICS', 'evidence_completeness': 1})
    index = {'schema_version': 1, 'status': 'AVAILABLE', 'retrieved_at': raw['retrieved_at'], 'as_of': raw['retrieved_at'][:10],
             'periods': raw['periods'], 'sources': source_metadata(raw), 'geography': geography,
             'coverage': {'source_areas': len(raw['area_ids']), 'area_industries': len(entities), 'eligible_signals': len(signals),
                          'mapped_signals': 0, 'rows': sum(p['total'] for p in raw['partitions']), 'fresh_sources': 2 if fresh else 0},
             'entities': entities, 'signals': signals, 'activity_enabled': False, 'hypotheses': []}
    return index, details


def source_metadata(raw):
    return [{'id': v['id'], 'name': '서울시 상권분석서비스(' + ('추정매출-상권' if k == 'sales' else '점포-상권') + ')',
             'url': 'https://data.seoul.go.kr/dataList/' + v['id'] + '/A/1/datasetView.do', 'service': v['service'],
             'unit': v['unit'], 'time_unit': 'quarter', 'periods': raw['periods'], 'publication_date': None,
             'retrieved_at': raw['retrieved_at'], 'geography': raw['geography'], 'license': '공공누리 1유형 · 서울특별시/서울신용보증재단 출처표시',
             'row_count': sum(p['total'] for p in raw['partitions'] if p['kind'] == k),
             'partitions': [{key: p[key] for key in ('period', 'area_id', 'total', 'complete')} for p in raw['partitions'] if p['kind'] == k]}
            for k, v in SERVICES.items()]


def atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.stage')
    try:
        temp.write_bytes(data); temp.replace(path)
    finally:
        temp.unlink(missing_ok=True)


def publish(raw, root=ROOT):
    root = Path(root)
    index, details = derive(raw)  # Entire source bundle passes before replacing anything.
    packed = gzip.compress(encode(raw), mtime=0)
    if len(packed) > 5_000_000: raise SourceError('SNAPSHOT_BUDGET_EXCEEDED')
    identity = raw['retrieved_at'][:10] + '-' + digest(packed)[:12]
    source = root / 'data/opportunity-radar' / identity / 'source.json.gz'
    if source.exists() and source.read_bytes() != packed: raise SourceError('IMMUTABLE_SNAPSHOT_COLLISION')
    index.update({'snapshot_id': identity, 'raw_hash': digest(packed)})
    outputs = {root / INDEX: encode(index)}
    for key, detail in details.items():
        detail['snapshot_id'] = identity
        b = encode(detail)
        if len(b) > 30000: raise SourceError('DETAIL_BUDGET_EXCEEDED')
        index['entities'][list(details).index(key)]['detail_hash'] = digest(b)
        outputs[root / 'docs/data/opportunity-radar-details' / (key + '.json')] = b
    outputs[root / INDEX] = encode(index)
    if len(outputs[root / INDEX]) > 250000: raise SourceError('INDEX_BUDGET_EXCEEDED')
    outputs[root / STATUS] = encode({'schema_version': 1, 'status': 'AVAILABLE', 'attempted_at': raw['retrieved_at'], 'snapshot_id': identity})
    before = {p: p.read_bytes() if p.exists() else None for p in outputs}
    existed = source.exists()
    try:
        if not existed: atomic(source, packed)
        # Detail first, index last. Content hashes reject a mixed cache/deployment.
        for p, b in outputs.items():
            if p != root / INDEX: atomic(p, b)
        atomic(root / INDEX, outputs[root / INDEX]); check(root)
    except Exception:
        for p, b in before.items():
            if b is None: p.unlink(missing_ok=True)
            else: atomic(p, b)
        if not existed: source.unlink(missing_ok=True)
        raise
    return identity


def check(root=ROOT):
    root = Path(root); index = json.loads((root / INDEX).read_bytes())
    if index.get('status') == 'NOT_COLLECTED':
        if index.get('entities') or index.get('signals'): raise SourceError('FABRICATED_EMPTY_STATE')
        return index
    identity = index['snapshot_id']
    if not re.fullmatch(r'20\d{2}-\d{2}-\d{2}-[a-f0-9]{12}', identity): raise SourceError('INVALID_SNAPSHOT_ID')
    packed = (root / 'data/opportunity-radar' / identity / 'source.json.gz').read_bytes()
    if digest(packed) != index['raw_hash']: raise SourceError('RAW_HASH_MISMATCH')
    expected, details = derive(json.loads(gzip.decompress(packed)))
    expected.update({'snapshot_id': identity, 'raw_hash': digest(packed)})
    for item in expected['entities']:
        d = details[item['id']]; d['snapshot_id'] = identity; b = encode(d)
        item['detail_hash'] = digest(b)
        if (root / 'docs/data/opportunity-radar-details' / (item['id'] + '.json')).read_bytes() != b:
            raise SourceError('DETAIL_DERIVATION_MISMATCH')
    if expected != index: raise SourceError('INDEX_DERIVATION_MISMATCH')
    return index


def collect(root=ROOT, client=None, now=None):
    root = Path(root); config = json.loads((root / 'config/opportunity-radar-v1.json').read_bytes())
    now = now or datetime.now(timezone.utc)
    if not client: client = SeoulHistoryClient(budget=config['request_budget'])
    # Probe completed quarters only; a publication-date change is not an observation.
    newest = now.year * 4 + (now.month - 1) // 3 - 1
    selected = None
    for offset in range(4):
        period = quarter(newest - offset)
        probes = [response(client.call(k, 1, 1, period, config['area_ids'][0]), k)[0] for k in SERVICES]
        if all(probes): selected = period; break
    if selected is None: raise SourceError('NO_COMMON_RECENT_QUARTER')
    periods = [quarter(quarter_index(selected) - n) for n in range(4, -1, -1)]
    raw = {'schema_version': 1, 'evidence_origin': 'LIVE_OFFICIAL_API', 'retrieved_at': now.isoformat(),
           'time_unit': 'quarter', 'units': {k: v['unit'] for k, v in SERVICES.items()}, 'geography': config['geography'],
           'freshness_days': config['freshness_days'], 'area_ids': config['area_ids'], 'periods': periods, 'partitions': []}
    for kind in SERVICES:
        for period in periods:
            for area in config['area_ids']:
                raw['partitions'].append(fetch_partition(client, kind, period, area, config['max_rows_per_partition']))
    raw['request_count'] = client.calls
    assert_sanitized(raw, (client.key,))
    identity = publish(raw, root)
    print('RADAR_SOURCE_VALIDATED snapshot=' + identity + ' requests=' + str(client.calls))
    return identity


def run(root=ROOT):
    now = datetime.now(timezone.utc).isoformat()
    try:
        collect(root)
        return 0
    except Exception as exc:
        code = str(exc) if isinstance(exc, SourceError) and re.fullmatch(r'[A-Z_0-9-]+', str(exc)) else 'SOURCE_VALIDATION_FAILED'
        atomic(Path(root) / STATUS, encode({'schema_version': 1, 'status': 'BLOCKED', 'attempted_at': now, 'reason': code, 'previous_snapshot_preserved': True}))
        print('RADAR_BLOCKED reason=' + code + '; previous snapshot preserved')
        return 1


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('--check', action='store_true'); args = parser.parse_args()
    if args.check:
        check(); print('RADAR_BUNDLE_VALID')
    else:
        raise SystemExit(run())
