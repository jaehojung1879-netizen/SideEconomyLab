import json
import unittest
from pathlib import Path
from pipeline.nts_local_profile import profile, verify, EXPECTED

class NTSLocalProfileTest(unittest.TestCase):
    def test_missing_is_not_zero(self):
        rows=[dict(province="P",district="A",industry="X",current=0,previous=4,year_ago=5),
              dict(province="P",district="B",industry="Y",current=9,previous=8,year_ago=7)]
        p,m=profile({"rows":rows},[["P","A"],["P","B"]],["X","Y"])
        self.assertEqual(m,[["X",0,None],["Y",None,9]])
        self.assertEqual(p["absent_grid_cells"],2)
        self.assertEqual(p["rows_with_any_zero"],1)
    def test_committed_shape(self):
        d=json.loads(EXPECTED.read_text(encoding="utf-8"))
        self.assertFalse(d["coverage_verified"])
        self.assertFalse(d["forecast_eligible"])
        self.assertEqual(d["comparison_eligible"],0)
        self.assertEqual(d["profile"]["region_labels"]*d["profile"]["industry_labels"]-d["profile"]["rows"],d["profile"]["absent_grid_cells"])
        self.assertEqual(len(d["matrix"]),17)
        self.assertTrue(all(len(row)==len(d["regions"])+1 for row in d["matrix"]))
    def test_wrong_identity(self):
        d=json.loads(EXPECTED.read_text(encoding="utf-8"))
        raw="업종,시도,시군구,당월,전월,전년동월\nX,P,A,9,8,7\n".encode()
        with self.assertRaisesRegex(ValueError,"identity"):
            verify(raw,d)
