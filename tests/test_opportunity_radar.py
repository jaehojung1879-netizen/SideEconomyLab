"""API doubles are synthetic and isolated in temporary directories, never live artifacts."""
import copy
from datetime import datetime, timezone
import gzip
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'pipeline'))
import opportunity_radar as R
from public_api_client import SourceError


def row(kind, period='20262', area='3001492', industry='CS100001', amount=200, stores=10):
    x = {'STDR_YYQU_CD': period, 'TRDAR_CD': area, 'TRDAR_CD_NM': '합성 테스트 지역',
         'SVC_INDUTY_CD': industry, 'SVC_INDUTY_CD_NM': '합성 테스트 업종'}
    x.update({'THSMON_SELNG_AMT': amount, 'THSMON_SELNG_CO': 20} if kind == 'sales' else
             {'SIMILR_INDUTY_STOR_CO': stores, 'STOR_CO': stores - 1, 'FRC_STOR_CO': 1, 'OPBIZ_STOR_CO': 2, 'CLSBIZ_STOR_CO': 1})
    return x


def raw():
    x = {'schema_version': 1, 'evidence_origin': 'LIVE_OFFICIAL_API', 'retrieved_at': '2026-10-09T09:00:00+00:00',
         'time_unit': 'quarter', 'units': {k: v['unit'] for k, v in R.SERVICES.items()},
         'geography': {'domain': 'synthetic-test-only', 'version': 'synthetic-v1', 'comparability_verified': True,
                       'evidence_url': 'https://data.seoul.go.kr/test-only', 'crs': 'SYNTHETIC_TEST_ONLY', 'geometry_version': 'SYNTHETIC_TEST_ONLY'},
         'area_ids': ['3001492'], 'periods': ['20252', '20253', '20254', '20261', '20262'], 'freshness_days': 180, 'partitions': []}
    for k in R.SERVICES:
        for i, p in enumerate(x['periods']):
            x['partitions'].append({'kind': k, 'period': p, 'area_id': '3001492', 'total': 1, 'complete': True,
                                    'rows': [row(k, p, amount=100 + i * 25, stores=10 + i)]})
    return x


def payload(kind, rows, total=None):
    return {R.SERVICES[kind]['service']: {'RESULT': {'CODE': 'INFO-000'}, 'list_total_count': len(rows) if total is None else total, 'row': rows}}


class ApiDouble:
    def __init__(self, responses): self.responses = iter(responses)
    def call(self, *args): return next(self.responses)


class RadarTests(unittest.TestCase):
    def test_live_committed_bundle_reproduces_and_contains_no_fixture(self):
        index = R.check()
        self.assertEqual(index['coverage']['eligible_signals'], 0)
        self.assertEqual(index['coverage']['source_areas'], 2)
        self.assertEqual(index['periods'], ['20252', '20253', '20254', '20261', '20262'])
        self.assertTrue(all(e['map_area_id'] is None for e in index['entities']))
        packed = (R.ROOT / 'data/opportunity-radar' / index['snapshot_id'] / 'source.json.gz').read_bytes()
        x = json.loads(gzip.decompress(packed))
        self.assertEqual(x['evidence_origin'], 'LIVE_OFFICIAL_API')
        self.assertLess(len(packed), 5000000)
        self.assertLess((R.ROOT / R.INDEX).stat().st_size, 250000)

    def test_schema_change_and_missing_values_are_distinct(self):
        r = row('sales'); del r['THSMON_SELNG_AMT']
        with self.assertRaisesRegex(SourceError, 'SCHEMA_CHANGED'): R.normalize(r, 'sales', '20262', '3001492')
        r = row('sales'); r['THSMON_SELNG_AMT'] = ''
        self.assertIsNone(R.normalize(r, 'sales', '20262', '3001492')['THSMON_SELNG_AMT'])
        self.assertEqual(R.number(0), 0)
        for value in (True, False, -1, 'bad', float('nan'), 1.5):
            with self.assertRaises(SourceError): R.number(value)

    def test_auth_failure_does_not_echo_message(self):
        p = {'RESULT': {'CODE': 'ERROR-290', 'MESSAGE': 'secret URL must never appear'}}
        with self.assertRaisesRegex(SourceError, '^SEOUL_API_ERROR-290$'): R.response(p, 'sales')
        with self.assertRaisesRegex(SourceError, 'MISSING_SEOUL_SECRET'): R.SeoulHistoryClient(key='')

    def test_request_contract_sales_has_no_undocumented_area(self):
        class Opener:
            urls = []
            def open(self, req, timeout):
                self.urls.append(req.full_url)
                return io.BytesIO(json.dumps({'RESULT': {'CODE': 'INFO-200'}}).encode())
        opener = Opener(); client = R.SeoulHistoryClient(key='synthetic-key', opener=opener, budget=2)
        client.call('sales', 1, 1, '20262', '3001492'); client.call('stores', 1, 1, '20262', '3001492')
        self.assertTrue(opener.urls[0].endswith('/20262/'))
        self.assertTrue(opener.urls[1].endswith('/20262/3001492/'))
        with self.assertRaisesRegex(SourceError, 'REQUEST_BUDGET'): client.call('sales', 1, 1, '20262', '3001492')

    def test_pagination_complete_counts_duplicates_scope(self):
        a, b = row('stores'), row('stores', industry='CS100002')
        out = R.fetch_partition(ApiDouble([payload('stores', [a], 2), payload('stores', [b], 2)]), 'stores', '20262', '3001492', page_size=1)
        self.assertEqual(out['total'], 2)
        for responses in ([payload('stores', [a], 2), payload('stores', [], 2)],
                          [payload('stores', [a], 2), payload('stores', [b], 3)],
                          [payload('stores', [a], 2), payload('stores', [a], 2)]):
            with self.assertRaises(SourceError): R.fetch_partition(ApiDouble(responses), 'stores', '20262', '3001492', page_size=1)
        with self.assertRaisesRegex(SourceError, 'SCOPE_MISMATCH'): R.normalize(a, 'stores', '20261', '3001492')

    def test_sales_city_pagination_retains_only_official_id_selection(self):
        a, b = row('sales'), row('sales', area='3120189')
        out = R.fetch_sales_period(ApiDouble([payload('sales', [a], 2), payload('sales', [b], 2)]), '20262', ['3001492'], page_size=1)
        self.assertEqual(out[0]['total'], 1); self.assertEqual(out[0]['inspected_rows'], 2)
        self.assertEqual(len(out[0]['page_receipts']), 2)
        with self.assertRaisesRegex(SourceError, 'INCOMPLETE_PAGINATION'):
            R.fetch_sales_period(ApiDouble([payload('sales', [a], 2), payload('sales', [], 2)]), '20262', ['3001492'], page_size=1)

    def test_store_units_and_total_identity(self):
        r = row('stores'); r['SIMILR_INDUTY_STOR_CO'] = 99
        with self.assertRaisesRegex(SourceError, 'STORE_TOTAL_IDENTITY'): R.normalize(r, 'stores', '20262', '3001492')
        x = raw(); x['units']['sales'] = 'KRW/month'
        with self.assertRaisesRegex(SourceError, 'INCOMPATIBLE_TIME_OR_UNITS'): R.derive(x)
        x = raw(); x['time_unit'] = 'day'
        with self.assertRaises(SourceError): R.derive(x)

    def test_missing_and_future_periods_never_invent_history(self):
        x = raw(); x['partitions'].pop()
        with self.assertRaisesRegex(SourceError, 'MISSING_HISTORY_PERIOD'): R.derive(x)
        x = raw(); x['periods'][1] = '20251'
        with self.assertRaisesRegex(SourceError, 'MISSING_HISTORY_PERIOD'): R.derive(x)
        x = raw(); x['retrieved_at'] = '2026-04-01T00:00:00+00:00'
        with self.assertRaisesRegex(SourceError, 'FUTURE_OBSERVATION'): R.derive(x)

    def test_unknown_geography_revision_disables_all_signals_and_mapping(self):
        for version, verified in ((None, True), ('v1', False)):
            x = raw(); x['geography'].update(version=version, comparability_verified=verified)
            index, details = R.derive(x)
            self.assertEqual(index['signals'], []); self.assertIsNone(index['entities'][0]['map_area_id'])
            self.assertFalse(next(iter(details.values()))['comparable'])
        for key in ('crs', 'geometry_version', 'evidence_url'):
            x = raw(); x['geography'][key] = None
            self.assertEqual(R.derive(x)[0]['signals'], [])
        x = raw(); x['geography']['evidence_url'] = 'https://unverified.example/boundaries'
        self.assertEqual(R.derive(x)[0]['signals'], [])

    def test_source_identity_changes_disable_signals(self):
        x = raw(); x['partitions'][0]['rows'][0]['TRDAR_CD_NM'] = '합성 다른 이름'
        self.assertEqual(R.derive(x)[0]['signals'], [])

    def test_null_not_zero_and_zero_baseline_no_growth_rate(self):
        x = raw(); x['partitions'][0]['rows'][0]['THSMON_SELNG_AMT'] = None
        i, d = R.derive(x); self.assertEqual(i['signals'], []); self.assertIsNone(next(iter(d.values()))['history'][0]['sales'])
        x = raw(); x['partitions'][0]['rows'][0]['THSMON_SELNG_AMT'] = 0
        self.assertFalse(any(s['type'] == 'spending' for s in R.derive(x)[0]['signals']))

    def test_stale_observation_disables_signals_collection_date_not_freshness(self):
        x = raw(); x['retrieved_at'] = '2027-10-09T00:00:00+00:00'
        self.assertEqual(R.derive(x)[0]['signals'], [])

    def test_deterministic_derivation_inspectable_metrics_no_profitability(self):
        x = raw(); i, d = R.derive(x)
        self.assertEqual(i, R.derive(copy.deepcopy(x))[0])
        spending = next(s for s in i['signals'] if s['type'] == 'spending')
        self.assertEqual(spending['sales_change_pct'], 100); self.assertEqual(spending['store_change_pct'], 40)
        self.assertEqual(spending['periods'], ['20252', '20262'])
        self.assertEqual(i['hypotheses'], []); self.assertFalse(i['activity_enabled'])
        for s in i['signals']:
            for key in ('alternative', 'next_action', 'source_ids', 'baseline', 'current', 'evidence_status', 'evidence_completeness'): self.assertIn(key, s)
            self.assertNotIn('score', s)
        shuffled = raw(); shuffled['partitions'].reverse()
        self.assertEqual(i, R.derive(shuffled)[0])

    def test_business_churn_three_quarters_expansion_contraction_turnover(self):
        for counts, kind in (((2, 1), 'expansion'), ((1, 2), 'contraction')):
            x = raw()
            for p in x['partitions']:
                if p['kind'] == 'stores': p['rows'][0].update(OPBIZ_STOR_CO=counts[0], CLSBIZ_STOR_CO=counts[1])
            self.assertEqual(next(s for s in R.derive(x)[0]['signals'] if s['type'] == 'churn')['churn_kind'], kind)
        x = raw(); x['partitions'][-1]['rows'][0]['OPBIZ_STOR_CO'] = 0
        self.assertEqual(next(s for s in R.derive(x)[0]['signals'] if s['type'] == 'churn')['churn_kind'], 'turnover')

    def test_immutable_snapshots_exact_derivation_and_failure_preservation(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); identity = R.publish(raw(), root); before = (root / R.INDEX).read_bytes()
            source = root / 'data/opportunity-radar' / identity / 'source.json.gz'; packed = source.read_bytes()
            R.publish(raw(), root); self.assertEqual(before, (root / R.INDEX).read_bytes()); self.assertEqual(packed, source.read_bytes())
            invalid = raw(); invalid['partitions'][0]['complete'] = False
            with self.assertRaises(SourceError): R.publish(invalid, root)
            self.assertEqual(before, (root / R.INDEX).read_bytes())
            altered = raw(); altered['partitions'][0]['rows'][0]['THSMON_SELNG_AMT'] = 101
            with patch.object(R, 'check', side_effect=SourceError('SIMULATED_WRITE_CHECK_FAILURE')):
                with self.assertRaises(SourceError): R.publish(altered, root)
            self.assertEqual(before, (root / R.INDEX).read_bytes()); self.assertEqual(packed, source.read_bytes())
            d = root / 'docs/data/opportunity-radar-details/3001492-CS100001.json'; d.write_bytes(b'{}')
            with self.assertRaisesRegex(SourceError, 'DETAIL_DERIVATION'): R.check(root)

    def test_fixture_never_publishable_and_source_links_present(self):
        x = raw(); x['evidence_origin'] = 'TEST_FIXTURE'
        with self.assertRaisesRegex(SourceError, 'NOT_LIVE'): R.derive(x)
        for s in R.derive(raw())[0]['sources']:
            self.assertIn(s['id'], s['url']); self.assertIsNone(s['publication_date']); self.assertEqual(s['time_unit'], 'quarter')

    def test_failed_refresh_reports_blocked_preserves_previous_snapshot(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); R.publish(raw(), root); before = (root / R.INDEX).read_bytes()
            with patch.object(R, 'collect', side_effect=SourceError('SEOUL_API_ERROR-290')): self.assertEqual(R.run(root), 1)
            self.assertEqual(before, (root / R.INDEX).read_bytes())
            self.assertEqual(json.loads((root / R.STATUS).read_bytes())['reason'], 'SEOUL_API_ERROR-290')


if __name__ == '__main__': unittest.main()
