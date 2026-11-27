import json
import unittest
from pipeline.outsourcing_frontier import review,verify,SOURCE,FIXTURE
class OutsourcingFrontierTest(unittest.TestCase):
    def test_scenarios(self):
        self.assertEqual(verify(json.loads(SOURCE.read_text(encoding="utf-8")))["scenarios"],5)
    def test_fixture(self):
        d=json.loads(FIXTURE.read_text(encoding="utf-8"))
        self.assertEqual(review(d),d["expected"])
        d["synthetic"]=False
        with self.assertRaises(ValueError): review(d)
    def test_no_promotion(self):
        d=json.loads(SOURCE.read_text(encoding="utf-8"))
        d["candidates"][0]["actual_owner_hours"]=0
        with self.assertRaises(ValueError): verify(d)
