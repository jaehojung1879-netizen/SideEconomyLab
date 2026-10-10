"""API doubles are synthetic and isolated in temporary directories, never live artifacts."""
import copy
from datetime import datetime, timezone
import gzip
import io
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'pipeline'))
import opportunity_radar as R
from public_api_client import SourceError

PERIODS = ['20252', '20253', '20254', '20261', '20262']
VERIFIED_TEMPORAL = {'verified': True, 'summary': 'synthetic', 'boundary_basis': 'synthetic', 'code_basis': 'synthetic', 'industry_basis': 'synthetic',
                     'evidence': [{'claim': 'synthetic test only', 'url': 'https://data.seoul.go.kr/test-only', 'observed': '2026-10-10'}]}


def config(temporal=True):
    c = R.load_config()
    spec = c['domains']['district']
    spec['services'] = {'sales': {'id': 'OA-22176', 'service': 'SyntheticSales', 'name': 'synthetic'},
                        'stores': {'id': 'OA-22173', 'service': 'SyntheticStores', 'name': 'synthetic'}}
    spec['gates']['temporal'] = copy.deepcopy(VERIFIED_TEMPORAL) if temporal else {'verified': False, 'evidence': []}
    del c['domains']['commercial_area']
    return c


def row(kind, period='20262', geo='11110', industry='CS100001', amount=200_000_000, stores=20, opened=3, closed=1, name='합성구'):
    x = {'STDR_YYQU_CD': period, 'SIGNGU_CD': geo, 'SIGNGU_CD_NM': name, 'SVC_INDUTY_CD': industry, 'SVC_INDUTY_CD_NM': '합성 업종'}
    x.update({'THSMON_SELNG_AMT': amount, 'THSMON_SELNG_CO': 20} if kind == 'sales' else
             {'SIMILR_INDUTY_STOR_CO': stores, 'STOR_CO': stores - 1, 'FRC_STOR_CO': 1, 'OPBIZ_STOR_CO': opened, 'CLSBIZ_STOR_CO': closed})
    return x


def raw(sales=(100, 110, 120, 125, 150), stores=(20, 20, 20, 20, 20)):
    """Spending +50% (in 1e7 KRW units), stores flat by default."""
    x = {'schema_version': 2, 'evidence_origin': 'LIVE_OFFICIAL_API', 'domain': 'district', 'retrieved_at': '2026-10-09T09:00:00+00:00',
         'time_unit': 'quarter', 'units': dict(R.UNITS), 'periods': list(PERIODS), 'partitions': [],
         'services': {'sales': {'id': 'OA-22176', 'service': 'SyntheticSales'}, 'stores': {'id': 'OA-22173', 'service': 'SyntheticStores'}}}
    for i, p in enumerate(PERIODS):
        for kind in ('sales', 'stores'):
            r = row(kind, p, amount=None if sales[i] is None else sales[i] * 10_000_000, stores=stores[i])
            x['partitions'].append({'kind': kind, 'period': p, 'total': 1, 'complete': True,
                                    'page_receipts': [{'start': 1, 'rows': 1, 'response_hash': 'x'}], 'rows': [R.normalize_row(r, kind, p, config()['domains']['district'])]})
    return x


def derive(x, c=None):
    c = c or config()
    index, details = R.derive(c, {'district': (x, 'h', '2026-10-09-000000000000')})
    return index, R.entity_dicts(index), details


def payload(service, rows, total=None):
    return {service: {'RESULT': {'CODE': 'INFO-000'}, 'list_total_count': len(rows) if total is None else total, 'row': rows}}


class ApiDouble:
    def __init__(self, responses): self.responses = iter(responses); self.calls = 0
    def call(self, *args, **kw): self.calls += 1; return next(self.responses)


class RadarTests(unittest.TestCase):
    def test_live_committed_bundle_reproduces_from_live_snapshots(self):
        index = R.check()
        self.assertEqual(index['schema_version'], 2)
        self.assertEqual(index['periods'], PERIODS)
        for d in index['domains']:
            raw, _ = R.load_raw(R.ROOT, d['snapshot_id'])
            self.assertEqual(raw['evidence_origin'], 'LIVE_OFFICIAL_API')
        rows = R.entity_dicts(index)
        self.assertTrue(all(r['map_area_id'] is None for r in rows))
        self.assertLess((R.ROOT / R.INDEX).stat().st_size, 1_500_000)

    def test_gates_are_independent(self):
        index = R.check()
        rows = R.entity_dicts(index)
        for d in index['domains']:
            mine = [r for r in rows if r['domain'] == d['id']]
            if d['gates']['temporal']['status'] != 'VERIFIED':
                self.assertTrue(all(r['sales_yoy_status'] == 'BLOCKED' and not r['finding'] for r in mine))
            # No domain may be joined to the existing GIS without the GIS gate, even when temporal passes.
            if d['gates']['gis']['status'] != 'VERIFIED':
                self.assertEqual(d['coverage']['mapped'], 0)
        c = config(); c['domains']['district']['gates']['gis'] = {'verified': False}
        _, rows, _ = derive(raw(), c)
        self.assertEqual(rows[0]['sales_yoy_status'], 'OK'); self.assertIsNone(rows[0]['map_area_id'])

    def test_unverified_temporal_gate_blocks_all_change_values(self):
        for gate in ({'verified': False, 'evidence': VERIFIED_TEMPORAL['evidence']},
                     {**VERIFIED_TEMPORAL, 'boundary_basis': None},
                     {**VERIFIED_TEMPORAL, 'evidence': [{'claim': 'x', 'url': 'https://unverified.example/b', 'observed': '2026-10-10'}]}):
            c = config(); c['domains']['district']['gates']['temporal'] = gate
            index, rows, _ = derive(raw(), c)
            self.assertEqual({rows[0][k] for k in ('sales_yoy_status', 'stores_yoy_status', 'sales_qoq_status', 'stores_qoq_status')}, {'BLOCKED'})
            self.assertFalse(rows[0]['finding']); self.assertIsNone(rows[0]['pattern'])

    def test_growth_rules_zero_missing_and_exact_values(self):
        _, rows, details = derive(raw())
        r = rows[0]
        self.assertEqual(r['sales_yoy_pct'], 50.0); self.assertEqual(r['stores_yoy_pct'], 0.0)
        self.assertEqual(r['sales_qoq_pct'], 20.0)
        self.assertEqual(r['sales'], [1_000_000_000, 1_250_000_000, 1_500_000_000])
        self.assertEqual(r['pattern'], 'spend_up_supply_flat_or_down'); self.assertTrue(r['finding'])
        hist = details[('district', '11110')]['industries']['CS100001']['history']
        self.assertEqual([h['sales'] for h in hist], [s * 10_000_000 for s in (100, 110, 120, 125, 150)])
        _, rows, _ = derive(raw(sales=(0, 1, 1, 1, 5)))
        self.assertEqual(rows[0]['sales_yoy_status'], 'ZERO_BASELINE'); self.assertIsNone(rows[0]['sales_yoy_pct']); self.assertIsNone(rows[0]['pattern'])
        _, rows, _ = derive(raw(sales=(None, 1, 1, 1, 5)))
        self.assertEqual(rows[0]['sales_yoy_status'], 'MISSING_OBSERVATION')

    def test_divergence_patterns_and_bands(self):
        cases = {((100, 100, 100, 100, 120), (20, 20, 20, 20, 19)): 'spend_up_supply_flat_or_down',
                 ((100, 100, 100, 100, 90), (20, 20, 20, 20, 22)): 'spend_down_supply_up',
                 ((100, 100, 100, 100, 110), (20, 20, 20, 20, 22)): 'both_expand',
                 ((100, 100, 100, 100, 90), (20, 20, 20, 20, 18)): 'both_contract',
                 ((100, 100, 100, 100, 103), (20, 20, 20, 20, 20)): 'mixed_or_flat'}
        for (s, t), expected in cases.items():
            _, rows, _ = derive(raw(sales=s, stores=t))
            self.assertEqual(rows[0]['pattern'], expected, (s, t))
        x = raw(sales=(100, 100, 100, 100, 103), stores=(20, 20, 20, 20, 20))
        for p in x['partitions']:
            if p['kind'] == 'stores': p['rows'][0].update(OPBIZ_STOR_CO=1, CLSBIZ_STOR_CO=1)
        _, rows, _ = derive(x)
        self.assertEqual(rows[0]['flow'], 'mixed')
        self.assertFalse(rows[0]['finding'], 'flat pattern without persistent flow is not a finding')

    def test_materiality_and_flow_direction(self):
        _, rows, _ = derive(raw(sales=(5, 5, 5, 5, 9), stores=(4, 4, 4, 4, 4)))
        self.assertFalse(rows[0]['material']); self.assertFalse(rows[0]['finding'])
        _, rows, _ = derive(raw())
        self.assertEqual(rows[0]['flow'], 'expansion'); self.assertEqual(rows[0]['net_openings_4q'], 8)
        x = raw()
        for p in x['partitions']:
            if p['kind'] == 'stores' and p['period'] == '20254': p['rows'][0].update(OPBIZ_STOR_CO=0, CLSBIZ_STOR_CO=4)
        _, rows, _ = derive(x)
        self.assertEqual(rows[0]['flow'], 'mixed')
        x = raw()
        for p in x['partitions']:
            if p['kind'] == 'stores' and p['period'] == '20254': p['rows'][0]['OPBIZ_STOR_CO'] = None
        _, rows, _ = derive(x)
        self.assertEqual(rows[0]['flow'], 'UNKNOWN')

    def test_identity_change_blocks_comparison(self):
        x = raw(); x['partitions'][0]['rows'][0]['SIGNGU_CD_NM'] = '다른 이름'
        _, rows, _ = derive(x)
        self.assertEqual(rows[0]['blocked'], 'SOURCE_IDENTITY_CHANGED'); self.assertEqual(rows[0]['sales_yoy_status'], 'BLOCKED')

    def test_stale_and_period_rules(self):
        x = raw(); x['retrieved_at'] = '2027-10-09T00:00:00+00:00'
        _, rows, _ = derive(x)
        self.assertEqual(rows[0]['blocked'], 'STALE_OBSERVATION')
        x = raw(); x['partitions'].pop()
        with self.assertRaisesRegex(SourceError, 'MISSING_HISTORY_PERIOD'): derive(x)
        x = raw(); x['periods'][1] = '20251'
        with self.assertRaisesRegex(SourceError, 'MISSING_HISTORY_PERIOD'): derive(x)
        x = raw(); x['retrieved_at'] = '2026-04-01T00:00:00+00:00'
        with self.assertRaisesRegex(SourceError, 'FUTURE_OBSERVATION'): derive(x)

    def test_schema_units_service_contract_and_fixture_rejection(self):
        spec = config()['domains']['district']
        r = row('sales'); del r['THSMON_SELNG_AMT']
        with self.assertRaisesRegex(SourceError, 'SCHEMA_CHANGED'): R.normalize_row(r, 'sales', '20262', spec)
        r = row('sales', geo='99999')
        with self.assertRaisesRegex(SourceError, 'INVALID_SOURCE_IDENTITY'): R.normalize_row(r, 'sales', '20262', spec)
        r = row('stores'); r['SIMILR_INDUTY_STOR_CO'] = 99
        with self.assertRaisesRegex(SourceError, 'STORE_TOTAL_IDENTITY'): R.normalize_row(r, 'stores', '20262', spec)
        for mutate, err in ((lambda x: x.update(evidence_origin='TEST_FIXTURE'), 'NOT_LIVE'),
                            (lambda x: x['units'].update(sales='KRW/month'), 'INCOMPATIBLE'),
                            (lambda x: x['services']['sales'].update(service='Other'), 'SERVICE_CONTRACT')):
            x = raw(); x['units'] = dict(x['units']); mutate(x)
            with self.assertRaisesRegex(SourceError, err): derive(x)
        for value in (True, -1, 'bad', float('nan'), 1.5):
            with self.assertRaises(SourceError): R.number(value)

    def test_domain_pagination_duplicates_and_scope(self):
        spec = config()['domains']['district']
        a, b = row('sales', industry='CS100001'), row('sales', industry='CS100002')
        out = R.fetch_domain_period(ApiDouble([payload('SyntheticSales', [a], 2), payload('SyntheticSales', [b], 2)]), 'sales', '20262', spec, 100, page_size=1)
        self.assertEqual(out['total'], 2); self.assertEqual(len(out['page_receipts']), 2)
        for responses, err in (([payload('SyntheticSales', [a], 2), payload('SyntheticSales', [], 2)], 'INCOMPLETE'),
                               ([payload('SyntheticSales', [a], 2), payload('SyntheticSales', [b], 3)], 'INCOMPLETE'),
                               ([payload('SyntheticSales', [a], 2), payload('SyntheticSales', [a], 2)], 'DUPLICATE'),
                               ([payload('SyntheticSales', [row('sales', period='20261')], 1)], 'SCOPE_MISMATCH')):
            with self.assertRaisesRegex(SourceError, err):
                R.fetch_domain_period(ApiDouble(responses), 'sales', '20262', spec, 100, page_size=1)
        with self.assertRaisesRegex(SourceError, 'ROW_BUDGET'):
            R.fetch_domain_period(ApiDouble([payload('SyntheticSales', [a], 500)]), 'sales', '20262', spec, 100)

    def test_auth_failure_and_request_contract(self):
        p = {'RESULT': {'CODE': 'ERROR-290', 'MESSAGE': 'secret URL must never appear'}}
        with self.assertRaisesRegex(SourceError, '^SEOUL_API_ERROR-290$'): R.response(p, 'sales')
        with self.assertRaisesRegex(SourceError, 'MISSING_SEOUL_SECRET'): R.SeoulHistoryClient(key='')
        class Opener:
            urls = []
            def open(self, req, timeout):
                self.urls.append(req.full_url); return io.BytesIO(json.dumps({'RESULT': {'CODE': 'INFO-200'}}).encode())
        opener = Opener(); client = R.SeoulHistoryClient(key='synthetic-key', opener=opener, budget=3)
        client.call('sales', 1, 1, '20262', '3001492'); client.call('stores', 1, 1, '20262', '3001492'); client.call('sales', 1, 1, '20262', service='SyntheticSales')
        self.assertTrue(opener.urls[0].endswith('/VwsmTrdarSelngQq/1/1/20262/'))
        self.assertTrue(opener.urls[1].endswith('/20262/3001492/'))
        self.assertTrue(opener.urls[2].endswith('/SyntheticSales/1/1/20262/'))
        with self.assertRaisesRegex(SourceError, 'REQUEST_BUDGET'): client.call('sales', 1, 1, '20262')

    def test_v1_commercial_area_snapshot_still_validates(self):
        raw1, _ = R.load_raw(R.ROOT, '2026-10-09-55b80cb44604')
        R.validate_raw(raw1)
        broken = copy.deepcopy(raw1); broken['partitions'][0]['complete'] = False
        with self.assertRaises(SourceError): R.validate_raw(broken)

    def test_deterministic_no_score_no_profitability(self):
        x = raw(); a = derive(x)[0]; shuffled = raw(); shuffled['partitions'].reverse()
        self.assertEqual(a, derive(shuffled)[0])
        self.assertEqual(a['hypotheses'], []); self.assertFalse(a['activity_enabled'])
        self.assertFalse(any('score' in c or 'profit' in c or 'roi' in c for c in a['entity_columns']))

    def _workspace(self, folder):
        root = Path(folder)
        for p in ('config', 'data/opportunity-radar', 'docs/data/opportunity-radar-details'):
            (root / p).mkdir(parents=True, exist_ok=True)
        (root / R.CONFIG).write_bytes(json.dumps(config()).encode())
        return root

    def test_immutable_snapshot_exact_derivation_and_failure_preservation(self):
        with tempfile.TemporaryDirectory() as folder:
            root = self._workspace(folder); c = config()
            snaps = R.publish(root, c, {}, new_raw=('district', raw()))
            before = (root / R.INDEX).read_bytes(); sid = snaps['district']
            packed = (root / 'data/opportunity-radar' / sid / 'source.json.gz').read_bytes()
            R.check(root)
            R.publish(root, c, {}, new_raw=('district', raw()))
            self.assertEqual(before, (root / R.INDEX).read_bytes())
            invalid = raw(); invalid['partitions'][0]['complete'] = False
            with self.assertRaises(SourceError): R.publish(root, c, snaps, new_raw=('district', invalid))
            self.assertEqual(before, (root / R.INDEX).read_bytes())
            self.assertEqual(sorted(p.name for p in (root / 'data/opportunity-radar').iterdir()), [sid])
            altered = raw(sales=(100, 110, 120, 125, 151))
            with patch.object(R, 'check', side_effect=SourceError('SIMULATED_WRITE_CHECK_FAILURE')):
                with self.assertRaises(SourceError): R.publish(root, c, snaps, new_raw=('district', altered))
            self.assertEqual(before, (root / R.INDEX).read_bytes()); self.assertEqual(packed, (root / 'data/opportunity-radar' / sid / 'source.json.gz').read_bytes())
            self.assertEqual(sorted(p.name for p in (root / 'data/opportunity-radar').iterdir()), [sid])
            d = root / R.DETAILS / 'district-11110.json'; d.write_bytes(b'{}')
            with self.assertRaisesRegex(SourceError, 'DETAIL_DERIVATION'): R.check(root)

    def test_failed_refresh_reports_blocked_and_preserves_previous_bundle(self):
        with tempfile.TemporaryDirectory() as folder:
            root = self._workspace(folder)
            R.publish(root, config(), {}, new_raw=('district', raw())); before = (root / R.INDEX).read_bytes()
            with patch.object(R, 'collect_domain', side_effect=SourceError('SEOUL_API_ERROR-290')):
                self.assertEqual(R.run(root), 1)
            self.assertEqual(before, (root / R.INDEX).read_bytes())
            status = json.loads((root / R.STATUS).read_bytes())
            self.assertEqual(status['status'], 'BLOCKED'); self.assertEqual(status['reason'], 'SEOUL_API_ERROR-290'); self.assertTrue(status['previous_snapshot_preserved'])
            R.check(root)


if __name__ == '__main__': unittest.main()
