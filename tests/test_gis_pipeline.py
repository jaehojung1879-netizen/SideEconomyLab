"""Offline pipeline regressions; no real credentials or API calls."""
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'pipeline' / f'{name}.py')
    module = importlib.util.module_from_spec(spec)
    with patch.dict(os.environ, {'SEOUL': 'offline-test', 'KAKAO_REST_API_KEY': 'offline-test'}):
        spec.loader.exec_module(module)
    return module


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.kakao = load('kakao_competitor_layer')
        self.seoul = load('seoul_location_screen')

    def test_committed_schema(self):
        demand = json.loads((ROOT / 'docs/data/seoul-opportunity-map.json').read_text())
        poi = json.loads((ROOT / 'docs/data/kakao-poi-layer.json').read_text())
        self.assertEqual(demand['area_count'], len(demand['areas']))
        codes = {a['trdar_cd'] for a in demand['areas']}
        self.assertEqual(len(codes), len(demand['areas']))
        for area in demand['areas']:
            self.assertEqual(set(area['scores']), set(self.kakao.CANDIDATES))
            self.assertTrue(all(0 <= v <= 100 for v in area['scores'].values()))
        for candidate in poi['candidates'].values():
            for area in candidate['areas']:
                self.assertIn(area['trdar_cd'], codes)
                self.assertEqual(area['unique_poi_count'], len(area['pois']))
                self.assertEqual(len(area['query_stats']), 3)
                for p in area['pois']:
                    self.assertTrue(33 <= p['lat'] <= 39 and 124 <= p['lng'] <= 132)
                    self.assertTrue(p['place_url'].startswith(('http://place.map.kakao.com/', 'https://place.map.kakao.com/')))
        self.assertEqual(poi['query_count'], sum(len(a['query_stats']) for c in poi['candidates'].values() for a in c['areas']))

    def test_errors_do_not_include_exception_message(self):
        task = ('booth', 1, {}, {'kind': 'keyword', 'value': 'test'}, 127, 37.5)
        for response in [{}, {'meta': {}, 'documents': [{'x': 'bad', 'y': 'bad'}]}]:
            with patch.object(self.kakao, 'query_poi', return_value=response):
                self.assertTrue(self.kakao.fetch_one(task)['error'])
        with patch.object(self.kakao, 'query_poi', side_effect=RuntimeError('private-test-value')):
            result = self.kakao.fetch_one(task)
        self.assertEqual(result['error'], 'RuntimeError')
        self.assertNotIn('private-test-value', json.dumps(result))
        with patch.object(self.seoul.urllib.request, 'urlopen', side_effect=RuntimeError('private-test-value')):
            with self.assertRaises(RuntimeError) as cm:
                self.seoul.call('fixture', 1, 5)
        self.assertNotIn('private-test-value', str(cm.exception))
        self.assertTrue(cm.exception.__suppress_context__)

    def test_bad_place_coordinates_and_urls(self):
        doc = {'id': '1', 'x': '127', 'y': '37.5', 'distance': '0', 'place_url': 'javascript:alert(1)'}
        cleaned = self.kakao.clean_doc(doc, 'test')
        self.assertEqual(cleaned['place_url'], '')
        self.assertEqual(cleaned['distance_m'], 0)
        with self.assertRaises(ValueError):
            self.kakao.clean_doc({**doc, 'x': 'nan'}, 'test')

    def test_kakao_determinism_partial_and_total_failure(self):
        source = json.loads((ROOT / 'docs/data/seoul-opportunity-map.json').read_text())
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'poi.json'
            with patch.object(self.kakao, 'OUT_PATH', output), patch.object(self.kakao, 'TOP_N', 1), patch.object(self.kakao, 'MODERATE_N', 0):
                good = {'meta': {'total_count': 0, 'pageable_count': 0}, 'documents': []}
                with patch.object(self.kakao, 'query_poi', return_value=good):
                    self.kakao.main()
                    first = output.read_bytes()
                    self.kakao.main()
                    self.assertEqual(first, output.read_bytes())
                with patch.object(self.kakao, 'query_poi', side_effect=RuntimeError('private-test-value')):
                    with self.assertRaises(SystemExit):
                        self.kakao.main()
                    self.assertEqual(first, output.read_bytes())
                def partial(q, lon, lat):
                    if q['kind'] == 'category':
                        raise RuntimeError('private-test-value')
                    return good
                with patch.object(self.kakao, 'query_poi', side_effect=partial):
                    with self.assertRaises(SystemExit):
                        self.kakao.main()
                self.assertEqual(first, output.read_bytes())
                self.assertNotIn('private-test-value', output.read_text())

    def test_seoul_latest_quarter_and_stable_export(self):
        master = [{'TRDAR_CD': str(i), 'TRDAR_CD_NM': 'fixture', 'XCNTS_VALUE': 200000, 'YDNTS_VALUE': 450000} for i in range(2)]
        history = [{'TRDAR_CD': str(i), 'STDR_YYQU_CD': quarter, 'TOT_WRC_POPLTN_CO': value, 'TOT_FLPOP_CO': value} for i in range(2) for quarter, value in [('20261', 9999), ('20262', 20+i)]]
        def fetch(service, period=None):
            rows = master if service == self.seoul.MASTER else history
            return rows, len(rows)
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'demand.json'
            old = Path.cwd()
            try:
                os.chdir(directory)
                with patch.object(self.seoul, 'fetch_all', side_effect=fetch), patch.dict(os.environ, {'GIS_OUTPUT': str(output)}):
                    self.seoul.main()
                    first = output.read_bytes()
                    self.seoul.main()
                    self.assertEqual(first, output.read_bytes())
                result = json.loads(first)
                self.assertEqual(result['periods']['worker'], '20262')
                self.assertEqual(result['areas'][0]['worker'], 20)
            finally:
                os.chdir(old)

    def test_seoul_incomplete_response_rejected(self):
        response = {self.seoul.MASTER: {'RESULT': {'CODE': 'INFO-000'}, 'list_total_count': 2, 'row': [{}]}}
        with patch.object(self.seoul, 'call', return_value=response):
            with self.assertRaises(RuntimeError):
                self.seoul.fetch_all(self.seoul.MASTER)


if __name__ == '__main__':
    unittest.main()
