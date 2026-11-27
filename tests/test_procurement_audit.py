import json
import unittest
from pipeline.procurement_audit import audit,verify,SOURCE,FIXTURE
class ProcurementAuditTest(unittest.TestCase):
    def setUp(self): self.f=json.loads(FIXTURE.read_text(encoding="utf-8"))
    def test_expected(self):
        self.assertEqual(audit(self.f),self.f["expected"])
        self.assertEqual(verify(json.loads(SOURCE.read_text(encoding="utf-8")))["executable_quotes"],0)
    def test_no_live(self):
        self.f["synthetic"]=False
        with self.assertRaises(ValueError): audit(self.f)
    def test_no_valid_quote(self):
        self.f["quotes"][0]["verified"]=False
        self.assertEqual(audit(self.f)[0]["status"],"BLOCKED_NO_MATCH")
    def test_nondivisible(self):
        self.f["invoices"][0]["qty"]=1
        self.f["invoices"][0]["pack"]=15
        self.assertEqual(audit(self.f)[0]["status"],"BLOCKED_NO_MATCH")
    def test_no_promotion(self):
        d=json.loads(SOURCE.read_text(encoding="utf-8"))
        d["offers"][0]["actionable"]=True
        with self.assertRaises(ValueError): verify(d)
