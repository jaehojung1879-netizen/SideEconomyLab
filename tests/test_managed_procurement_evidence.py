import json
import unittest
from pipeline.managed_procurement_evidence import verify,SOURCE
class ManagedProcurementEvidenceTest(unittest.TestCase):
    def setUp(self): self.d=json.loads(SOURCE.read_text(encoding="utf-8"))
    def test_known_subtotals(self):
        self.assertEqual(verify(self.d),dict(jumbo_subtotal=1207,towel_known_subtotal=715,towel_unknown=1,destinations=16))
    def test_no_reissue_double_count(self):
        self.d["port_plans"].append(self.d["port_plans"][0])
        with self.assertRaises(ValueError): verify(self.d)
    def test_not_actual(self):
        self.d["port_plans"][0]["award_amount"]=0
        with self.assertRaises(ValueError): verify(self.d)
