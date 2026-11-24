import unittest
from cp_sat import solve, audit, PROFILES

def example():
    return {"institute":"Институт экономики и управления АПК","term":"2026/2027-1","scope":"pilot",
      "groupUnits":{"Д-Э 508":["a"],"Д-Э 509":["b"]},"routes":{"02|03":5,"03|02":5},
      "bufferMinutes":5,"maxGroupDay":5,"maxTeacherDay":5,"blocked":[],
      "lessons":[{"id":"L1","title":"Synthetic A","groups":["Д-Э 508"],"units":["a"],"teachers":["T"],"room":"02-101","building":"02","slot":0,"allowedSlots":[0,1,2]},
      {"id":"L2","title":"Synthetic B","groups":["Д-Э 508","Д-Э 509"],"units":["a","b"],"teachers":["T"],"room":"03-101","building":"03","slot":2,"allowedSlots":[0,1,2]}]}
class TestSolver(unittest.TestCase):
    def test_optimum(self):
        d=example();r=solve(d,seconds=20)
        self.assertEqual(r["status"],"OPTIMAL");self.assertEqual(len(r["lessons"]),2)
        self.assertFalse(r["audit"]["errors"]);self.assertAlmostEqual(r["objective"],r["best_bound"])
        # Exhaustively enumerate this tiny instance as an independent optimum check.
        scores=[]
        for a in range(3):
            for b in range(3):
                q=audit(d,{"L1":a,"L2":b},PROFILES["balanced"])
                if not q["errors"]: scores.append(q["score"])
        self.assertEqual(r["objective"],min(scores))
    def test_unknown_route(self):
        d=example();d["routes"]={}
        self.assertEqual(solve(d,seconds=20)["status"],"INFEASIBLE")
    def test_external_collision(self):
        d=example();d["lessons"][0]["allowedSlots"]=[0]
        d["blocked"]=[{"slot":0,"resources":["r:02-101"],"room":"02-101","building":"02"}]
        self.assertEqual(solve(d,seconds=20)["status"],"INFEASIBLE")
    def test_incomplete_scope(self):
        d=example();d["scope"]="institute-day"
        with self.assertRaises(ValueError): solve(d)
    def test_audit_missing(self):
        self.assertTrue(audit(example(),{"L1":0},PROFILES["balanced"])["errors"])
if __name__=="__main__":unittest.main()
