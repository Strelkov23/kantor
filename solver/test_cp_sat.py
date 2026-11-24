import unittest
from cp_sat import solve, audit, validate, resource_errors, PROFILES

def example():
    return {"institute":"Институт экономики и управления АПК","term":"2026/2027-1","scope":"pilot",
      "groupUnits":{"Д-Э 508":["a"],"Д-Э 509":["b"]},"routes":{"02|03":5,"03|02":5},
      "bufferMinutes":5,"maxGroupDay":5,"maxTeacherDay":5,"blocked":[],
      "lessons":[{"id":"L1","title":"Synthetic A","groups":["Д-Э 508"],"units":["a"],"teachers":["T"],"room":"02-101","building":"02","slot":0,"allowedSlots":[0,1,2]},
      {"id":"L2","title":"Synthetic B","groups":["Д-Э 508","Д-Э 509"],"units":["a","b"],"teachers":["T"],"room":"03-101","building":"03","slot":2,"allowedSlots":[0,1,2]}]}
def with_evidence():
    d=example()
    d["resourceEvidence"]={
      "units":{"a":{"size":20,"source":"Synthetic test"},"b":{"size":25,"source":"Synthetic test"}},
      "rooms":{r:{"building":r[:2],"capacity":50,"equipment":["projector"],"availableSlots":[0,1,2],"source":"Synthetic test"} for r in ("02-101","03-101")},
      "teachers":{"T":{"availableSlots":[0,1,2],"source":"Synthetic test"}}
    }
    for l in d["lessons"]: l["requiredEquipment"]=["projector"]
    return d

class TestSolver(unittest.TestCase):
    def test_resource_contract(self):
        d=with_evidence()
        self.assertFalse(resource_errors(d))
        self.assertEqual(solve(d,seconds=20)["status"],"OPTIMAL")
    def test_capacity_flow(self):
        d=with_evidence();d["resourceEvidence"]["rooms"]["03-101"]["capacity"]=44
        with self.assertRaisesRegex(ValueError,"room too small"): validate(d)
        d["resourceEvidence"]["rooms"]["03-101"]["capacity"]=45
        self.assertFalse(resource_errors(d))
    def test_equipment_and_resource_availability(self):
        d=with_evidence();d["resourceEvidence"]["rooms"]["03-101"]["equipment"]=[]
        with self.assertRaisesRegex(ValueError,"required equipment"): validate(d)
        d=with_evidence();d["resourceEvidence"]["teachers"]["T"]["availableSlots"]=[0,2]
        with self.assertRaisesRegex(ValueError,"teacher unavailable"): validate(d)
        d=with_evidence();d["resourceEvidence"]["rooms"]["02-101"]["availableSlots"]=[0,2]
        with self.assertRaisesRegex(ValueError,"room unavailable"): validate(d)
    def test_evidence_missing(self):
        d=with_evidence();del d["resourceEvidence"]["units"]["b"]
        with self.assertRaisesRegex(ValueError,"unit size"): validate(d)
        d=with_evidence();d["resourceEvidence"]["rooms"]["02-101"]["source"]=" "
        with self.assertRaisesRegex(ValueError,"room capacity"): validate(d)
        d=example();d["scope"]="institute-day"
        self.assertTrue(resource_errors(d))
    def test_joint_room_choice(self):
        d=with_evidence()
        a,b=d["lessons"]
        a["allowedSlots"]=[0]; b["slot"]=1; b["allowedSlots"]=[1]
        b["allowedRooms"]=["03-101","02-101"]
        d["routes"]={}
        r=solve(d,seconds=20)
        self.assertEqual(r["status"],"OPTIMAL")
        self.assertEqual(r["lessons"][1]["room"],"02-101")
        self.assertEqual(r["lessons"][1]["building"],"02")
        self.assertEqual(r["audit"]["room_changes"],1)
        self.assertFalse(r["audit"]["errors"])
        # Enumerate both room choices with the independent audit.
        scores=[]
        for rid in b["allowedRooms"]:
            q=audit(d,{"L1":(0,"02-101"),"L2":(1,rid)},PROFILES["balanced"])
            if not q["errors"]: scores.append(q["score"])
        self.assertEqual(r["objective"],min(scores))
    def test_room_choice_respects_external_booking(self):
        d=with_evidence();a,b=d["lessons"]
        a["allowedSlots"]=[0]; b["slot"]=1; b["allowedSlots"]=[1]
        b["allowedRooms"]=["03-101","02-101"]
        d["blocked"]=[{"slot":1,"resources":["r:02-101"],"room":"02-101","building":"02"}]
        r=solve(d,seconds=20)
        self.assertEqual(r["status"],"OPTIMAL")
        self.assertEqual(r["lessons"][1]["room"],"03-101")
    def test_room_choice_availability(self):
        d=with_evidence();a,b=d["lessons"]
        a["allowedSlots"]=[0]; b["slot"]=1; b["allowedSlots"]=[1]
        b["allowedRooms"]=["03-101","02-101"]
        d["resourceEvidence"]["rooms"]["03-101"]["availableSlots"]=[2]
        r=solve(d,seconds=20)
        self.assertEqual(r["status"],"OPTIMAL")
        self.assertEqual(r["lessons"][1]["room"],"02-101")
        self.assertTrue(r["baseline"]["errors"])
    def test_room_choice_rejects_unapproved_resources(self):
        d=with_evidence();d["lessons"][1]["allowedRooms"]=["03-101","02-101"]
        d["resourceEvidence"]["rooms"]["02-101"]["capacity"]=44
        with self.assertRaisesRegex(ValueError,"room too small"): validate(d)
        d=with_evidence();d["lessons"][1]["allowedRooms"]=["03-101","unknown"]
        with self.assertRaisesRegex(ValueError,"missing/invalid room"): validate(d)
        d=example();d["lessons"][1]["allowedRooms"]=["03-101","02-101"]
        with self.assertRaisesRegex(ValueError,"resourceEvidence"): validate(d)
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
    def test_short_duration_opens_route(self):
        d=example()
        a,b=d["lessons"]
        a["allowedSlots"]=[0]
        b["slot"]=1; b["allowedSlots"]=[1]
        d["routes"]["02|03"]=17
        self.assertEqual(solve(d,seconds=20)["status"],"INFEASIBLE")
        a["durationMinutes"]=90
        r=solve(d,seconds=20)
        self.assertEqual(r["status"],"OPTIMAL")
        self.assertFalse(r["audit"]["errors"])
        self.assertEqual(r["lessons"][0]["durationMinutes"],90)
    def test_long_room_overlap_across_slots(self):
        d=example()
        a,b=d["lessons"]
        a["allowedSlots"]=[0]; a["durationMinutes"]=120
        b.update(slot=1,allowedSlots=[1],groups=["Д-Э 509"],units=["b"],
                 teachers=["U"],room=a["room"],building=a["building"])
        self.assertTrue(audit(d,{"L1":0,"L2":1},PROFILES["balanced"])["errors"])
        self.assertEqual(solve(d,seconds=20)["status"],"INFEASIBLE")
        a["durationMinutes"]=115
        self.assertEqual(solve(d,seconds=20)["status"],"OPTIMAL")
    def test_external_duration_room_overlap(self):
        d=example()
        d["lessons"][0]["slot"]=1
        d["lessons"][0]["allowedSlots"]=[1]
        d["blocked"]=[{"slot":0,"resources":["r:02-101"],"room":"02-101",
                       "building":"02","durationMinutes":120}]
        self.assertEqual(solve(d,seconds=20)["status"],"INFEASIBLE")
        d["blocked"][0]["durationMinutes"]=115
        self.assertEqual(solve(d,seconds=20)["status"],"OPTIMAL")
    def test_invalid_duration(self):
        for value in (0,241,90.5,True,None,"90"):
            d=example();d["lessons"][0]["durationMinutes"]=value
            with self.assertRaises(ValueError): solve(d)
    def test_institute_pilot(self):
        import json
        from pathlib import Path
        p=Path(__file__).resolve().parents[1]/"pilot-fifth.js"
        src=json.loads(p.read_text(encoding="utf-8").split("=",1)[1].strip().rstrip(";"))
        groups=sorted({g for x in src["records"] for g in x["groups"]})
        d={"institute":"Институт экономики и управления АПК","term":"2026/2027-1","scope":"pilot",
           "groupUnits":{g:[g] for g in groups},"routes":{"02|03":5,"03|02":5},
           "bufferMinutes":5,"maxGroupDay":5,"maxTeacherDay":5,"blocked":[],"lessons":[]}
        for x in src["records"]:
            d["lessons"].append({"id":x["id"],"title":x["title"],"groups":x["groups"],"units":x["groups"],
              "teachers":[x["teacher"]],"room":x["room"],"building":x["room"][:2],
              "slot":x["week"]*25+x["day"]*5+x["period"],"allowedSlots":list(range(x["week"]*25,x["week"]*25+25))})
        result=solve(d,seconds=15)
        self.assertIn(result["status"],("FEASIBLE","OPTIMAL"))
        self.assertFalse(result["audit"]["errors"])
        self.assertEqual(len(result["lessons"]),len(src["records"]))
        print("PILOT (hypothetical routes):",json.dumps({k:result[k] for k in ("status","objective","best_bound","relative_gap","audit","baseline")},ensure_ascii=False))
if __name__=="__main__":unittest.main()
