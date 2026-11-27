import json
import unittest
from pipeline.facility_dual_track import exposure,exceptions,verify,SOURCE,ROOT
class DualTrackTest(unittest.TestCase):
    def test_economics(self):
        self.assertEqual(verify(json.loads(SOURCE.read_text(encoding="utf-8"))),5)
    def test_synthetic(self):
        d=json.loads((ROOT/"research/facility-expense-synthetic-v1.json").read_text(encoding="utf-8"))
        self.assertTrue(d["synthetic"])
        self.assertEqual(exceptions(d["rows"]),d["expected"])
        self.assertEqual(exceptions(d["rows"][:1]),[])
        with self.assertRaises(ValueError): exceptions([dict(d["rows"][0],quantity=0)])
    def test_recovery_and_no_promotion(self):
        d=json.loads(SOURCE.read_text(encoding="utf-8"))
        with self.assertRaises(ValueError): exposure(**dict(d["hardware"]["scenarios"][0]["inputs"],documented_recovery=1000000))
        d["forecast_eligible"]=True
        with self.assertRaises(ValueError): verify(d)
