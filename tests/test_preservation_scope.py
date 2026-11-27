import unittest
from pipeline.radar_preservation import select_scope, demand_first_outside, PORTFOLIO


class ScopeTest(unittest.TestCase):
    def test_default_radar_unchanged(self):
        self.assertEqual(select_scope(['docs/index.html'], 'auto'), 'radar')
        self.assertEqual(select_scope(['docs/demand-first.html'], 'radar'), 'radar')

    def test_exact_independent_scope(self):
        p = 'docs/demand-first.html'
        self.assertEqual(select_scope([p], 'auto'), 'demand-first')
        self.assertEqual(demand_first_outside({p: 'A', 'README.md': 'M'}), [])
        for path in ('docs/index.html', PORTFOLIO, 'docs/data/candidate-registry.json', 'docs/data/demand-spend-sample-v2.json'):
            self.assertEqual(demand_first_outside({p: 'A', path: 'M'}), [path])
        self.assertEqual(demand_first_outside({p: 'D'}), [p])
