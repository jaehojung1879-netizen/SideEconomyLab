import copy
import csv
import io
import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'pipeline'))
import real_estate_context as context


def store_zip(rows):
    text = io.StringIO()
    writer = csv.DictWriter(text, fieldnames=rows[0])
    writer.writeheader()
    writer.writerows(rows)
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w') as archive:
        archive.writestr('fixture.csv', text.getvalue().encode('utf-8-sig'))
    return output.getvalue()


class RealEstateContextTests(unittest.TestCase):
    def setUp(self):
        self.snapshot = context.DEFAULT_SNAPSHOT
        self.row = {'stdr_yyqu_cd': '20254', 'trdar_cd': 'fixture', 'trdar_cd_nm': 'test area',
                    'svc_induty_cd': 'CS1', 'stor_co': '2', 'frc_stor_co': '1',
                    'similr_induty_stor_co': '3', 'opbiz_stor_co': '0', 'clsbiz_stor_co': '1'}

    def test_store_count_definition_and_missingness(self):
        rows, meta = context.parse_stores(store_zip([self.row]))
        self.assertEqual(rows['fixture']['store_count'], 3)  # TOTAL, not ordinary stores2
        self.assertEqual(rows['fixture']['opened_count'], 0)  # observed zero
        self.assertEqual(meta['period'], '20254')
        for field, value in [('opbiz_stor_co', ''), ('stor_co', '-1'), ('clsbiz_stor_co', 'NaN'), ('similr_induty_stor_co', '4')]:
            bad = dict(self.row, **{field: value})
            with self.assertRaises(ValueError):
                context.parse_stores(store_zip([bad]))
        with self.assertRaises(ValueError):
            context.parse_stores(store_zip([self.row, self.row]))

    def test_latest_quarter_and_no_rate_averaging(self):
        older = dict(self.row, stdr_yyqu_cd='20253', similr_induty_stor_co='90', stor_co='89')
        second = dict(self.row, svc_induty_cd='CS2', opbiz_stor_co='2')
        rows, meta = context.parse_stores(store_zip([second, older, self.row]))
        self.assertEqual(rows['fixture']['store_count'], 6)
        self.assertEqual(rows['fixture']['opened_count'], 2)
        self.assertEqual(rows['fixture']['closed_count'], 2)
        self.assertEqual(meta['latest_rows'], 2)
        reordered, _ = context.parse_stores(store_zip([self.row, older, second]))
        self.assertEqual(rows, reordered)

    def test_reb_exact_cell_gate(self):
        raw = (self.snapshot / 'reb-vacancy.json').read_bytes()
        codes = (self.snapshot / 'reb-vacancy-codes.json').read_bytes()
        value = context.parse_reb(raw, codes, 'vacancy', '202602')
        self.assertAlmostEqual(value, 6.37793361121874)
        original = json.loads(raw)
        for field, wrong in [('CLS_ID', 500001), ('CLS_FULLNM', '서울>강남'), ('WRTTIME_IDTFR_ID', '202601'), ('UI_NM', '원'), ('DTA_VAL', None), ('DTA_VAL', 101)]:
            bad = copy.deepcopy(original)
            bad['SttsApiTblData'][1]['row'][0][field] = wrong
            with self.assertRaises(ValueError):
                context.parse_reb(context.encoded(bad), codes, 'vacancy', '202602')
        bad = copy.deepcopy(original)
        bad['SttsApiTblData'][0]['head'][0]['list_total_count'] = 2
        with self.assertRaises(ValueError):
            context.parse_reb(context.encoded(bad), codes, 'vacancy', '202602')
        with self.assertRaises(ValueError):
            context.parse_reb(raw, b'{"data":[]}', 'vacancy', '202602')

    def test_observation_freshness_not_retrieval_date(self):
        self.assertEqual(context.freshness('20262', '2026-10-04')['status'], 'AVAILABLE')
        self.assertEqual(context.freshness('20254', '2026-10-04')['status'], 'STALE')
        self.assertEqual(context.freshness('20262', '2027-01-01')['status'], 'STALE')
        for period in ['202605', '20260', '20265', 'bad']:
            with self.assertRaises(ValueError):
                context.period_end(period)
        with self.assertRaises(ValueError):
            context.freshness('20264', '2026-10-04')

    def test_committed_transform_and_geography(self):
        result = context.build()
        committed = json.loads(context.OUTPUT.read_bytes())
        self.assertEqual(result, committed)
        self.assertEqual(context.encoded(context.build()), context.encoded(result))
        self.assertEqual(result['coverage']['matched_area_count'], 1649)
        rejected = [a for a in result['areas'] if a['status'] == 'INCOMPATIBLE_GEOGRAPHY']
        self.assertEqual([a['trdar_cd'] for a in rejected], ['3110379'])
        self.assertIsNone(rejected[0]['store_count'])
        self.assertEqual(result['markets'][0]['geography_type'], 'city')
        self.assertEqual(result['markets'][0]['exactness'], 'contextual_only')
        self.assertTrue(all('rent' not in a and 'vacancy_pct' not in a for a in result['areas']))
        self.assertEqual(result['not_collected']['building_context'], 'NOT_COLLECTED')

    def test_identity_error_and_failed_refresh_preserve_output(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / 'context.json'
            output.write_bytes(b'previous valid snapshot')
            with patch.object(context.urllib.request, 'urlopen', side_effect=RuntimeError('fixture network failure')):
                with self.assertRaises(RuntimeError):
                    context.refresh(output=output)
            self.assertEqual(output.read_bytes(), b'previous valid snapshot')
            with patch.object(context, 'build', side_effect=ValueError('fixture schema mismatch')):
                with self.assertRaises(ValueError):
                    context.publish(self.snapshot, output)
            self.assertEqual(output.read_bytes(), b'previous valid snapshot')
            manifest = json.loads((self.snapshot / 'manifest.json').read_bytes())
            manifest['files']['reb-rent.json'] = '0' * 64
            bad = Path(folder) / 'bad'; bad.mkdir()
            (bad / 'manifest.json').write_bytes(context.encoded(manifest))
            for f in self.snapshot.iterdir():
                if f.name != 'manifest.json':
                    (bad / f.name).write_bytes(f.read_bytes())
            with self.assertRaises(ValueError):
                context.publish(bad, output)
            self.assertEqual(output.read_bytes(), b'previous valid snapshot')

    def test_source_audit_contract(self):
        audit = json.loads((ROOT / 'docs/data/real-estate-source-audit.json').read_text())
        required = {'source_id', 'source', 'dataset', 'provider', 'variable', 'geography',
                    'smallest_usable_spatial_unit', 'time_grain', 'latest_available_period',
                    'latest_period_evidence', 'update_frequency', 'access_method', 'authentication',
                    'license', 'expected_coverage', 'join_method', 'freshness_risk',
                    'methodology_limitation', 'relevance', 'decision', 'decision_reason'}
        self.assertEqual(len({s['source_id'] for s in audit['sources']}), len(audit['sources']))
        for source in audit['sources']:
            self.assertTrue(required.issubset(source))
            self.assertIn(source['decision'], audit['decision_definitions'])
            self.assertTrue(source['decision_reason'])
            self.assertTrue(source['latest_period_evidence'])  # null period must have explanation


if __name__ == '__main__':
    unittest.main()
