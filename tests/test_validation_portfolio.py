"""Evidence, authorization and provenance failures must not silently rank candidates."""
import copy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'pipeline'))
from validation_portfolio import STATE, encoded, validate


class PortfolioTests(unittest.TestCase):
    def setUp(self):
        self.state = json.loads(STATE.read_bytes())

    def test_current_artifact_and_repeatable_encoding(self):
        self.assertEqual(validate(self.state), (7, 18))
        self.assertEqual(encoded(self.state), STATE.read_bytes())
        self.assertEqual(encoded(json.loads(encoded(self.state))), encoded(self.state))

    def test_numeric_unknown_and_fake_evidence_rejected(self):
        for key, value in [('overall_score', 78.4), ('contribution_krw', 0), ('resale_recovery_krw', 0)]:
            with self.subTest(key=key):
                bad = copy.deepcopy(self.state)
                bad['candidates'][0]['economics'][key] = value
                with self.assertRaisesRegex(ValueError, 'unknown converted'):
                    validate(bad)
        bad = copy.deepcopy(self.state)
        bad['candidates'][0]['evidence_level'] = 'C3'
        with self.assertRaisesRegex(ValueError, 'unsupported field'):
            validate(bad)
        bad = copy.deepcopy(self.state)
        bad['sources'][0]['fresh_public_content_collected'] = True
        with self.assertRaisesRegex(ValueError, 'fresh source'):
            validate(bad)

    def test_canonical_ids_lanes_sources_and_dependencies(self):
        bad = copy.deepcopy(self.state)
        bad['candidates'][0]['lane'] = 'TRANSACTION'
        with self.assertRaisesRegex(ValueError, 'lane mismatch'):
            validate(bad)
        bad = copy.deepcopy(self.state)
        bad['candidates'][-1]['candidate_id'] = 'OC-001'
        with self.assertRaisesRegex(ValueError, 'candidate set'):
            validate(bad)
        bad = copy.deepcopy(self.state)
        bad['candidates'][0]['inventory']['sourced_facts'][0]['source_ids'] = ['S-EVENT']
        with self.assertRaisesRegex(ValueError, 'unattributed'):
            validate(bad)
        bad = copy.deepcopy(self.state)
        next(c for c in bad['candidates'] if c['candidate_id'] == 'OC-021')['dependencies'] = []
        with self.assertRaisesRegex(ValueError, 'follow procurement'):
            validate(bad)

    def test_unsupported_gate_completion_and_unsafe_links(self):
        bad = copy.deepcopy(self.state)
        bad['candidates'][0]['hard_gates']['checks']['legal_permission']['status'] = 'PASS'
        with self.assertRaisesRegex(ValueError, 'hard gate ungrounded'):
            validate(bad)
        bad = copy.deepcopy(self.state)
        bad['candidates'][0]['next_experiment']['status'] = 'COMPLETED'
        with self.assertRaisesRegex(ValueError, 'fabricated'):
            validate(bad)
        bad = copy.deepcopy(self.state)
        bad['sources'][0]['url'] = 'https://user:private@example.com/'
        with self.assertRaisesRegex(ValueError, 'unsafe source URL'):
            validate(bad)
        bad = copy.deepcopy(self.state)
        bad['sources'][0]['repository_reference'] = '../outside.json'
        with self.assertRaisesRegex(ValueError, 'missing/unsafe'):
            validate(bad)

    def test_budget_and_original_gis_protected(self):
        bad = copy.deepcopy(self.state)
        bad['execution_queue'][0]['owner_hours_ceiling'] = 5
        with self.assertRaisesRegex(ValueError, 'week hours'):
            validate(bad)
        bad = copy.deepcopy(self.state)
        bad['integrity_baseline']['docs/data/real-estate-context.json'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'protected GIS changed'):
            validate(bad)
        bad = copy.deepcopy(self.state)
        bad['pilot_authorized'] = True
        with self.assertRaisesRegex(ValueError, 'authorization'):
            validate(bad)


if __name__ == '__main__':
    unittest.main()
