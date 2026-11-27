import json
import unittest
from pathlib import Path
from pipeline.owner_capacity import bounds

class OwnerCapacityTest(unittest.TestCase):
    def test_scenarios(self):
        data = json.loads((Path(__file__).resolve().parents[1]/"research/owner-capacity-scenarios-v1.json").read_text(encoding="utf-8"))
        for scenario in data:
            result = bounds(**scenario["inputs"])
            for k,v in scenario["expected"].items():
                self.assertEqual(result[k],v)
    def test_no_missing_or_negative(self):
        x = dict(price=100,var_cost=20,fixed_cash=0,fixed_hours=0,unit_hours=1,hour_value=20,hour_cap=20,target=100,capital=0,recovery_months=1)
        for k,v in [("price",None),("var_cost",-1),("unit_hours",0),("price",float("nan")),("capital",True),("recovery_months",0)]:
            with self.assertRaises(ValueError):
                bounds(**dict(x,**{k:v}))
        self.assertFalse(bounds(**dict(x,fixed_hours=21))["cash_time_feasible"])
        self.assertIsNone(bounds(**dict(x,price=20))["cash_units"])
    def test_ledger_boundaries(self):
        data = json.loads((Path(__file__).resolve().parents[1]/"docs/data/demand-spend-sample-v1.json").read_text(encoding="utf-8"))
        self.assertFalse(data["eligible_for_market_total"])
        self.assertFalse(data["eligible_for_forecast"])
        rows=data["contracts"]+data["offers"]
        self.assertEqual(len(rows),len({r["id"] for r in rows}))
        for r in rows:
            self.assertFalse(r["paid_verified"])
        for r in data["offers"]:
            self.assertIsNone(r["transaction_price"])

    def test_public_navigation_metadata(self):
        data = json.loads((Path(__file__).resolve().parents[1]/"docs/data/demand-spend-sample-v1.json").read_text(encoding="utf-8"))
        self.assertIsInstance(data["notes"], list)
        self.assertEqual(len(data["contracts"]), 14)
        rows = [r for r in data["contracts"] if "source_navigation" in r]
        self.assertEqual(len(rows), 4)
        for row in rows:
            self.assertNotIn("?", row["url"])
            nav = row["source_navigation"]
            self.assertEqual(nav["link_status"], "OFFICIAL_ORIGIN_ONLY_DETAIL_RECHECK_REQUIRED")
            self.assertTrue(nav["path"].startswith(row["url"]))
            self.assertIn("key", {p["name"] for p in nav["query_parameters_encoded"]})
            self.assertFalse(row["paid_verified"])
