import json
import unittest
from pipeline.parallel_hurdles import verify,consumer_hurdles,b2b_hurdles,SOURCE
class ParallelHurdlesTest(unittest.TestCase):
    def setUp(self): self.d=json.loads(SOURCE.read_text(encoding="utf-8"))
    def test_hurdles(self):
        x=verify(self.d)
        self.assertEqual([v["orders_month"] for v in x["consumer"]],[100,600,283,783])
        self.assertEqual([v["orders_day"] for v in x["consumer"]],[4,20,10,27])
        self.assertAlmostEqual(x["consumer"][-1]["events_per_household_year"],15.66)
        self.assertEqual(x["b2b"][-1]["monthly_sales"],7962500)
        self.assertEqual(x["b2b"][-1]["sales_per_account"],995313)
        self.assertEqual(x["saas"]["economic_units"],20)
    def test_gates(self):
        with self.assertRaises(ValueError): consumer_hurdles(dict(self.d["consumer"],capture_bps=0))
        with self.assertRaises(ValueError): b2b_hurdles(dict(self.d["b2b"],net_margin_bps=0))
        self.d["forecast_eligible"]=True
        with self.assertRaises(ValueError): verify(self.d)
