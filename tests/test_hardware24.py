import json
import unittest
from pipeline.hardware24 import replenish,economics,verify,SOURCE
class Hardware24Test(unittest.TestCase):
    def test_ledger(self):
        self.assertEqual(verify(json.loads(SOURCE.read_text(encoding="utf-8"))),20)
    def test_censoring_budget_and_no_auto(self):
        x=dict(paid_units=7,in_stock_nights=14,observed_nights=21,on_hand=1,on_order=1,slot_capacity=8,unit_cost=1000,budget=2000,lead_nights=2)
        self.assertEqual(replenish(**x),dict(status="REVIEW_ONLY",order=2,target=6,auto_purchase=False))
        self.assertIsNone(replenish(**dict(x,in_stock_nights=7))["order"])
        self.assertEqual(replenish(**dict(x,paid_units=0))["order"],0)
        with self.assertRaises(ValueError): replenish(**dict(x,on_hand=10))
    def test_economics(self):
        x=dict(basket=8000,goods_cost=4800,fee_bps=500,host_bps=1000,fixed=100000,capital=3500000,recovery_months=24,labor_hours=8,hour_value=40000,target=1000000)
        self.assertEqual(economics(**x)["orders_day"],27)
        self.assertIsNone(economics(**dict(x,goods_cost=8000))["orders_day"])
