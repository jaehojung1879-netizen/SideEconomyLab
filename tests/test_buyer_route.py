import json
import unittest
from pipeline.buyer_route import verify,SOURCE
class BuyerRouteTest(unittest.TestCase):
    def test_reproduce(self):
        self.assertEqual(verify(json.loads(SOURCE.read_text(encoding="utf-8"))),4)
    def test_no_promotion(self):
        d=json.loads(SOURCE.read_text(encoding="utf-8"))
        d["forecast_eligible"]=True
        with self.assertRaises(ValueError): verify(d)
    def test_no_mislinked_evidence(self):
        d=json.loads(SOURCE.read_text(encoding="utf-8"))
        d["hypotheses"][0]["evidence"].append("UNOBSERVED")
        with self.assertRaises(ValueError): verify(d)
