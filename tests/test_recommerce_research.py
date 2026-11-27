import json
import unittest
from pipeline.recommerce_research import bounds, verify, SOURCE

class RecommerceTest(unittest.TestCase):
    def test_reproduce(self):
        self.assertEqual(verify(json.loads(SOURCE.read_text(encoding="utf-8"))),14)
    def test_no_promotion(self):
        d=json.loads(SOURCE.read_text(encoding="utf-8"))
        d["sources"][0]["matched_trade"]=True
        with self.assertRaises(ValueError): verify(d)
    def test_negative_bounds_and_invalid(self):
        d=json.loads(SOURCE.read_text(encoding="utf-8"))
        x=d["scenarios"][1]["inputs"]
        self.assertLess(bounds(**x)["economic_contribution_krw"],0)
        with self.assertRaises(ValueError): bounds(**dict(x,fee_bps=10001))
        with self.assertRaises(ValueError): bounds(**dict(x,repair=None))
    def test_consignment_not_inventory(self):
        d=json.loads(SOURCE.read_text(encoding="utf-8"))
        d["scenarios"][2]["inputs"]["purchase"]=1
        with self.assertRaises(ValueError): verify(d)
