import json
import unittest
from pipeline.korean_managed_procurement import evaluate,verify,SOURCE
class KoreanManagedProcurementTest(unittest.TestCase):
    def setUp(self): self.d=json.loads(SOURCE.read_text(encoding="utf-8"))
    def test_scenarios(self):
        x=verify(self.d)
        self.assertEqual(x["direct20"]["economic_profit_krw"],1007500)
        self.assertEqual(x["direct20"]["cash_gap_proxy_krw"],6400000)
        self.assertEqual(x["direct10"]["economic_profit_krw"],207500)
        self.assertEqual(x["agent5"]["economic_profit_krw"],-192500)
        self.assertEqual(x["hybrid5"]["economic_profit_krw"],479500)
        self.assertEqual(x["hybrid5"]["spend_per_account_for_target"],2301250)
        self.assertEqual(x["hybrid5"]["cash_gap_proxy_krw"],0)
    def test_no_promotion(self):
        self.d["segments"][0]["actual_monthly_spend"]=0
        with self.assertRaises(ValueError): verify(self.d)
    def test_invalid(self):
        with self.assertRaises(ValueError): evaluate(**dict(self.d["models"][0]["inputs"],accounts=0))
