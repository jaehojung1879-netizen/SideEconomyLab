import json
import unittest
from pipeline.sidejob_sector_slice import derive, SOURCE, OUTPUT

class SectorSliceTest(unittest.TestCase):
    def test_exact_reproduction(self):
        source = json.loads(SOURCE.read_text(encoding="utf-8"))
        expected = json.loads(OUTPUT.read_text(encoding="utf-8"))
        self.assertFalse(expected["forecast_eligible"])
        ids = [s["industry_id"] for s in expected["sectors"]]
        self.assertEqual(derive(source,ids),expected["sectors"])
    def test_missing_sales_and_blocked_gate(self):
        source = json.loads(SOURCE.read_text(encoding="utf-8"))
        self.assertIsNone(derive(source,["CS200043"])[0]["sales"]["current"])
        next(d for d in source["domains"] if d["id"]=="district")["gates"]["temporal"]["status"]="BLOCKED"
        with self.assertRaises(ValueError):
            derive(source,["CS100010"])
