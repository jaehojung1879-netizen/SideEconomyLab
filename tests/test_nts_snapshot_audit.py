import csv
import io
import json
import unittest
from pathlib import Path
from pipeline.nts_snapshot_audit import audit, FIELDS

def fixture(rows, encoding="utf-8-sig"):
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(FIELDS)
    writer.writerows(rows)
    return buffer.getvalue().encode(encoding)

class NTSAuditTest(unittest.TestCase):
    def test_suppression_and_comparison_block(self):
        for encoding in ("utf-8-sig", "cp949"):
            result = audit(fixture([["카페","서울","강동구",100,0,90]], encoding), "2026-09")
            self.assertEqual(result["row_count"], 1)
            self.assertTrue(result["rows"][0]["suppressed_or_zero"])
            self.assertIsNone(result["rows"][0]["yoy"])
            self.assertEqual(result["comparison_eligible"], 0)
    def test_reject_duplicate(self):
        row = ["카페","서울","강동구",100,90,80]
        with self.assertRaises(ValueError):
            audit(fixture([row,row]), "2026-09")
    def test_invalid(self):
        for v in ("", "-3", "1", "2", "3.5", "1,2"):
            with self.assertRaises(ValueError):
                audit(fixture([["카페","서울","강동구",v,90,80]]), "2026-09")
        with self.assertRaises(ValueError):
            audit(b"garbage", "2026-09")
        with self.assertRaises(ValueError):
            audit(fixture([]), "2026-09")
    def test_registry(self):
        data = json.loads((Path(__file__).resolve().parents[1]/"docs/data/demand-first-research-v1.json").read_text(encoding="utf-8"))
        source_ids = {s["id"] for s in data["sources"]}
        self.assertEqual(len(source_ids),len(data["sources"]))
        ids = {e["id"] for e in data["entries"]}
        self.assertEqual(len(ids),len(data["entries"]))
        for e in data["entries"]:
            self.assertTrue(set(e["source_ids"]) <= source_ids)
            self.assertFalse(e["approved"])
            self.assertIsNone(e["forecast"])
            self.assertEqual(e["paid_transactions"],0)
