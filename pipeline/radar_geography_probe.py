"""Official-source probe for Opportunity Radar v2 geography gates (GitHub Actions only).

Records public evidence needed to decide two independent questions:
  A. Can one official source geography be compared across the observed quarters?
  B. Does that geography correspond to the existing 1,650-area GIS?

Writes a sanitized JSON evidence file. Never writes credentials, request URLs or
API messages. The output is research evidence, not a publication input.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import html
import json
import os
from pathlib import Path
import re
import sys
import urllib.parse
import urllib.request

sys.path.insert(0, str(Path(__file__).resolve().parent))
from public_api_client import Client, SourceError, NoRedirect, assert_sanitized

ROOT = Path(__file__).resolve().parents[1]
PERIODS = ['20252', '20253', '20254', '20261', '20262']
PAGES = {
    'OA-22176': 'https://data.seoul.go.kr/dataList/OA-22176/S/1/datasetView.do',
    'OA-22173': 'https://data.seoul.go.kr/dataList/OA-22173/S/1/datasetView.do',
    'OA-22175': 'https://data.seoul.go.kr/dataList/OA-22175/S/1/datasetView.do',
    'OA-22172': 'https://data.seoul.go.kr/dataList/OA-22172/S/1/datasetView.do',
    'OA-15560': 'https://data.seoul.go.kr/dataList/OA-15560/S/1/datasetView.do',
    'OA-15572': 'https://data.seoul.go.kr/dataList/OA-15572/S/1/datasetView.do',
    'OA-15577': 'https://data.seoul.go.kr/dataList/OA-15577/S/1/datasetView.do',
    'notice-standard-unit': 'https://data.seoul.go.kr/together/notice/datasetNoticeView.do?bbsCd=10008&ditcCd=&pageIndex=1&seq=a2197dabd5a3a52edd6fe0d4eead6bd3',
    'golmok-definition': 'https://golmok.seoul.go.kr/introduce3.do',
}
CANDIDATE_SERVICES = [
    'VwsmSignguSelngW', 'VwsmSignguStorW', 'VwsmAdstrdSelngW', 'VwsmAdstrdStorW',
    'VwsmSignguSelngQq', 'VwsmSignguStorQq', 'VwsmAdstrdSelngQq', 'VwsmAdstrdStorQq',
]
GEO_FIELDS = ('SIGNGU_CD', 'SIGNGU_CD_NM', 'ADSTRD_CD', 'ADSTRD_CD_NM', 'TRDAR_CD', 'TRDAR_CD_NM')


def page_text(raw):
    text = re.sub(r'(?is)<(script|style)[^>]*>.*?</\1>', ' ', raw)
    text = re.sub(r'(?s)<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', html.unescape(text)).strip()
    # Public example URLs may show a credential parameter name; keep text, drop the pattern.
    return re.sub(r'(?i)([?&])(serviceKey|KEY|apiKey|authKey)(\s*=)', r'\1\2_param\3', text)


def fetch_page(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'SideEconomyLab/radar-v2-probe'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            body = r.read(3_000_001)
    except Exception as exc:  # public page; record class only
        return {'url': url, 'ok': False, 'error': type(exc).__name__}
    raw = body.decode('utf-8', 'replace')
    text = page_text(raw)
    return {'url': url, 'ok': True, 'sha256': hashlib.sha256(body).hexdigest(), 'bytes': len(body),
            'service_tokens': sorted(set(re.findall(r'\b(?:Vwsm|Tbgis)[A-Za-z]+\b', raw))),
            'file_tokens': sorted(set(re.findall(r'[\w가-힣()\-.]+\.(?:csv|zip|shp|xlsx|json|hwp|pdf)', raw)))[:80],
            'text': text[:40000]}


class Seoul:
    def __init__(self, budget):
        self.key = os.environ.get('SEOUL', '').strip()
        if not self.key:
            raise SourceError('MISSING_SEOUL_SECRET')
        self.opener = urllib.request.build_opener(NoRedirect())
        self.budget, self.calls = budget, 0

    def call(self, service, start, end, *args):
        if self.calls >= self.budget:
            raise SourceError('REQUEST_BUDGET_EXCEEDED')
        self.calls += 1
        path = '/'.join([urllib.parse.quote(self.key, safe=''), 'json', service, str(start), str(end), *map(str, args)])
        for attempt in range(2):
            try:
                with self.opener.open(urllib.request.Request('http://openapi.seoul.go.kr:8088/' + path + '/',
                                                             headers={'User-Agent': 'SideEconomyLab/radar-v2-probe'}), timeout=40) as r:
                    payload = json.loads(r.read(6_000_001))
                assert_sanitized(payload, (self.key,))
                return payload
            except SourceError:
                raise
            except Exception:
                if attempt:
                    return {'_transport_error': True}


def result(payload, service):
    if payload.get('_transport_error'):
        return 'TRANSPORT_ERROR', 0, []
    block = payload.get(service) if isinstance(payload.get(service), dict) else {}
    res = block.get('RESULT') or payload.get('RESULT') or {}
    code = res.get('CODE') if isinstance(res.get('CODE'), str) and re.fullmatch(r'[A-Z]+-\d{3}', res.get('CODE', '')) else 'UNKNOWN'
    rows = block.get('row') if isinstance(block.get('row'), list) else []
    total = block.get('list_total_count') if isinstance(block.get('list_total_count'), int) else 0
    return code, total, rows


def probe_service(client, service):
    out = {'service': service, 'attempts': []}
    for args in ([], ['20262']):
        code, total, rows = result(client.call(service, 1, 3, *args), service)
        out['attempts'].append({'args': args, 'code': code, 'total': total, 'fields': sorted(rows[0]) if rows else [],
                                'sample_identity': [{k: r.get(k) for k in ('STDR_YYQU_CD', *GEO_FIELDS, 'SVC_INDUTY_CD', 'SVC_INDUTY_CD_NM') if k in r} for r in rows]})
    return out


def scan(client, service, period, geo_code, geo_name, max_rows):
    """Full pagination; keeps identity sets only (no measurements)."""
    code, total, rows = result(client.call(service, 1, 1000, period), service)
    if code != 'INFO-000':
        return {'service': service, 'period': period, 'code': code}
    if total > max_rows:
        return {'service': service, 'period': period, 'code': 'ROW_BUDGET', 'total': total}
    seen, geos, inds, periods, mismatch = set(), {}, {}, set(), 0
    for start in range(1, total + 1, 1000):
        if start > 1:
            c, t, rows = result(client.call(service, start, min(start + 999, total), period), service)
            if c != 'INFO-000' or t != total:
                return {'service': service, 'period': period, 'code': 'INCOMPLETE_PAGINATION'}
        for r in rows:
            periods.add(str(r.get('STDR_YYQU_CD')))
            g, i = str(r.get(geo_code)), str(r.get('SVC_INDUTY_CD'))
            if (g, i) in seen:
                mismatch += 1
            seen.add((g, i))
            geos.setdefault(g, set()).add(str(r.get(geo_name)))
            inds.setdefault(i, set()).add(str(r.get('SVC_INDUTY_CD_NM')))
    return {'service': service, 'period': period, 'code': 'INFO-000', 'total': total, 'rows_seen': len(seen) + mismatch,
            'duplicate_keys': mismatch, 'periods_in_rows': sorted(periods),
            'geographies': {k: sorted(v) for k, v in sorted(geos.items())},
            'industries': {k: sorted(v) for k, v in sorted(inds.items())}}


def master_areas(client):
    code, total, rows = result(client.call('TbgisTrdarRelm', 1, 1000), 'TbgisTrdarRelm')
    allrows = list(rows)
    for start in range(1001, total + 1, 1000):
        allrows.extend(result(client.call('TbgisTrdarRelm', start, min(start + 999, total)), 'TbgisTrdarRelm')[2])
    fields = sorted(allrows[0]) if allrows else []
    existing = json.loads((ROOT / 'docs/data/seoul-opportunity-map.json').read_bytes())['areas']
    ex = {a['trdar_cd']: (a['x_epsg5181'], a['y_epsg5181'], a['trdar_name']) for a in existing}
    api = {str(r.get('TRDAR_CD')): (r.get('XCNTS_VALUE'), r.get('YDNTS_VALUE'), r.get('TRDAR_CD_NM')) for r in allrows}
    def same(a, b):
        try:
            return abs(float(a[0]) - float(b[0])) < 0.5 and abs(float(a[1]) - float(b[1])) < 0.5 and a[2] == b[2]
        except (TypeError, ValueError):
            return False
    return {'code': code, 'total': total, 'fields': fields, 'sample': allrows[:2],
            'codes': sorted(api), 'existing_gis_count': len(ex),
            'api_minus_existing': sorted(set(api) - set(ex)), 'existing_minus_api': sorted(set(ex) - set(api)),
            'center_and_name_equal': sum(1 for k in set(api) & set(ex) if same(api[k], ex[k])),
            'district_fields': sorted({(str(r.get('SIGNGU_CD')), str(r.get('SIGNGU_CD_NM'))) for r in allrows})}


def registry():
    """행정표준코드(법정동) for Seoul gu codes. Optional; DATA_GO may lack this subscription."""
    try:
        client = Client(budget=6)
        payload = client.data_go('1741000/StanReginCd/getStanReginCdList',
                                 {'type': 'json', 'pageNo': 1, 'numOfRows': 1000, 'flag': 'Y', 'locatadd_nm': '서울특별시'})
        client.sanitize(payload)
        rows = []
        for block in payload.get('StanReginCd', []) if isinstance(payload.get('StanReginCd'), list) else []:
            if isinstance(block, dict) and isinstance(block.get('row'), list):
                rows.extend(block['row'])
        gu = [r for r in rows if str(r.get('region_cd', '')).endswith('00000') and not str(r.get('region_cd', '')).endswith('00000000')]
        return {'ok': bool(rows), 'rows': len(rows), 'fields': sorted(rows[0]) if rows else [],
                'gu': [{k: r.get(k) for k in ('region_cd', 'locatadd_nm', 'adpt_de', 'locallow_nm', 'locat_rm')} for r in gu],
                'head': page_text(str(payload))[:600] if not rows else None}
    except SourceError as exc:
        return {'ok': False, 'error': str(exc)}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--out', default='artifacts/radar-geography-probe.json')
    ap.add_argument('--budget', type=int, default=900); args = ap.parse_args()
    out = {'schema_version': 1, 'retrieved_at': datetime.now(timezone.utc).isoformat(), 'periods': PERIODS,
           'pages': {k: fetch_page(u) for k, u in PAGES.items()}}
    client = Seoul(args.budget)
    tokens = sorted({t for p in out['pages'].values() for t in p.get('service_tokens', [])})
    services = list(dict.fromkeys(CANDIDATE_SERVICES + [t for t in tokens if re.search(r'Signgu|Adstrd', t)]))
    out['service_probes'] = [probe_service(client, s) for s in services]
    live = [p['service'] for p in out['service_probes'] if any(a['code'] == 'INFO-000' for a in p['attempts'])]
    out['live_services'] = live
    out['scans'] = []
    for service in live:
        geo = ('SIGNGU_CD', 'SIGNGU_CD_NM') if 'Signgu' in service else ('ADSTRD_CD', 'ADSTRD_CD_NM')
        for period in PERIODS:
            out['scans'].append(scan(client, service, period, *geo, max_rows=60000))
    for period in PERIODS:
        out['scans'].append(scan(client, 'VwsmTrdarSelngQq', period, 'TRDAR_CD', 'TRDAR_CD_NM', max_rows=60000))
    out['master_areas'] = master_areas(client)
    out['registry'] = registry()
    out['request_count'] = client.calls
    assert_sanitized(out, (client.key, os.environ.get('DATA_GO', ''), os.environ.get('R_ONE', '')))
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print('RADAR_PROBE_DONE requests=' + str(client.calls) + ' live=' + ','.join(live))


if __name__ == '__main__':
    main()
