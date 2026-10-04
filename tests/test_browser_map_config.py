import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('browser_config', ROOT / 'pipeline/browser_map_config.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class BrowserConfigTests(unittest.TestCase):
    def test_only_intended_browser_key_is_public(self):
        # These are synthetic values, never real credentials.
        env = {'KAKAO_JAVASCRIPT_KEY': 'a' * 32, 'KAKAO_REST_API_KEY': 'b' * 32,
               'KAKAO_DEFAULT_ADMIN_KEY': 'c' * 32, 'KAKAO_DEFAULT_NATIVE_KEY': 'd' * 32,
               'SEOUL': 'offline-source', 'UNRELATED_SECRET': 'private-value'}
        config = module.build_config(env)
        self.assertEqual(set(config), {'schema_version', 'preferred_basemap', 'browser_app_key', 'allowed_origins'})
        self.assertEqual(config['browser_app_key'], env['KAKAO_JAVASCRIPT_KEY'])
        text = json.dumps(config)
        for name, value in env.items():
            if name != 'KAKAO_JAVASCRIPT_KEY':
                self.assertNotIn(value, text)
        self.assertEqual(config, module.build_config(env))

    def test_server_key_substitution_and_invalid_key_fail_closed(self):
        for name in ('KAKAO_REST_API_KEY', 'KAKAO_DEFAULT_ADMIN_KEY', 'KAKAO_DEFAULT_NATIVE_KEY', 'SEOUL'):
            with self.assertRaises(ValueError) as cm:
                module.build_config({'KAKAO_JAVASCRIPT_KEY': 'b' * 32, name: 'b' * 32})
            self.assertNotIn('b' * 32, str(cm.exception))
        with self.assertRaises(ValueError):
            module.build_config({'KAKAO_JAVASCRIPT_KEY': 'invalid'})

    def test_missing_key_and_empty_real_sites(self):
        self.assertIsNone(module.build_config({})['browser_app_key'])
        self.assertIsNone(json.loads((ROOT / 'docs/data/map-runtime.json').read_text())['browser_app_key'])
        sites = json.loads((ROOT / 'docs/data/site-observations.json').read_text())
        self.assertEqual(sites, {'schema_version': 1, 'sites': []})
        schema = json.loads((ROOT / 'docs/data/site-observations.schema.json').read_text())
        self.assertEqual(set(schema['properties']['sites']['items']['required']), {'site_id', 'candidate_id', 'lat', 'lng'})


if __name__ == '__main__':
    unittest.main()
