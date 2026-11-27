import json
import unittest
from pathlib import Path

class MarketFalsificationTest(unittest.TestCase):
    def test_observation_boundaries(self):
        p=Path(__file__).resolve().parents[1]/"docs/data/market-falsification-v3.json"
        d=json.loads(p.read_text(encoding="utf-8"))
        self.assertFalse(d["commercial_approval"])
        self.assertFalse(d["eligible_for_forecast"])
        rows=d["observations"]
        self.assertEqual(len(rows),len({r["id"] for r in rows}))
        for r in rows:
            self.assertFalse(r["paid_verified"])
            self.assertFalse(r["forecast_eligible"])
            self.assertTrue(r["url"].startswith("https://"))
            if r["kind"]=="TENDER_REQUIREMENT":
                self.assertEqual(r["direction"],"SUPPLIER_PAYS_HOST")
                self.assertNotIn("amount_krw",r)
        for api in d["api_catalog"]:
            self.assertIsNone(api["raw_rows"])
            self.assertEqual(api["access"],"METADATA_ONLY_AUTH_REQUIRED")
