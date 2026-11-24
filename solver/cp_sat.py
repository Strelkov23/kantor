"""KANTOR 0.20. CP-SAT for fixed rooms and per-event duration, two-week institute model.
Run locally: python solver/cp_sat.py input.json output.json --seconds 120
No network or personal-data upload. Integer-weight objective distinct from UI heuristic.
"""
import argparse
import json
import math
from collections import defaultdict
from pathlib import Path

STARTS = (540, 655, 780, 895, 1010)
DURATION = 95

def duration(l): return l.get("durationMinutes", DURATION)
def valid_duration(l): return type(duration(l)) is int and 1 <= duration(l) <= 240

def gap_minutes(a, s, t): return STARTS[period(t)] - STARTS[period(s)] - duration(a)
INSTITUTE = "Институт экономики и управления АПК"
PROFILES = {
    "balanced": (8, 5, 1, 1, 3, 1, 2, 1),
    "student": (15, 3, 2, 1, 4, 1, 3, 1),
    "teacher": (3, 15, 1, 2, 1, 1, 1, 1),
    "spatial": (4, 4, 4, 4, 1, 1, 8, 1),
    "stable": (6, 4, 1, 1, 2, 8, 2, 4),
}
METRICS = ("student_gaps", "teacher_gaps", "student_travel", "teacher_travel",
           "student_concentration", "moves", "tight_transitions", "day_changes")
def day(s): return s // 5
def period(s): return s % 5
def week(s): return s // 25
def slot_ok(s): return type(s) is int and 0 <= s < 50
def resources(l):
    return ["g:"+u for u in l["units"]] + ["t:"+t for t in l["teachers"]] + ["r:"+l["room"]]
def journey(a, b, data):
    if a["room"] == b["room"]: return 0
    buf = data["bufferMinutes"]
    if a["building"] == b["building"]: return math.ceil(buf)
    x = data["routes"].get(a["building"]+"|"+b["building"])
    return None if x is None else math.ceil(x + buf)

def resource_errors(data):
    """Optional documented resource contract in pilot; mandatory in institute-day.
    Available slots certify the complete relevant interval, not merely its start.
    """
    ev=data.get("resourceEvidence")
    if ev is None:
        return ["Full scope requires resourceEvidence"] if data.get("scope")=="institute-day" else []
    if not isinstance(ev,dict): return ["resourceEvidence must be an object"]
    units,rooms,teachers=(ev.get(k) for k in ("units","rooms","teachers"))
    if not all(isinstance(x,dict) for x in (units,rooms,teachers)):
        return ["resourceEvidence requires units, rooms, teachers objects"]
    errors=[]
    def evidence(x):
        return isinstance(x,dict) and isinstance(x.get("source"),str) and bool(x["source"].strip())
    def slots(x):
        a=x.get("availableSlots")
        return isinstance(a,list) and bool(a) and all(slot_ok(v) for v in a) and len(a)==len(set(a))
    def tags(x):
        return isinstance(x,list) and all(isinstance(v,str) and v.strip() for v in x) and len(x)==len(set(x))
    for u in {u for us in data["groupUnits"].values() for u in us}:
        x=units.get(u)
        if not evidence(x) or type(x.get("size")) is not int or not 1<=x["size"]<=10000:
            errors.append("Missing/invalid unit size and source: "+u)
    for l in data["lessons"]:
        lid=l["id"]; x=rooms.get(l["room"])
        sizes=[units.get(u) for u in l["units"]]
        known=all(evidence(v) and type(v.get("size")) is int and 1<=v["size"]<=10000 for v in sizes)
        req=l.get("requiredEquipment")
        if not tags(req): errors.append(lid+": explicit requiredEquipment list required")
        if not evidence(x) or x.get("building")!=l["building"] or type(x.get("capacity")) is not int or not 1<=x["capacity"]<=10000 or not tags(x.get("equipment")) or not slots(x):
            errors.append(lid+": missing/invalid room capacity, equipment, availability or source")
        else:
            if known and sum(v["size"] for v in sizes)>x["capacity"]: errors.append(lid+": room too small")
            if tags(req) and not set(req)<=set(x["equipment"]): errors.append(lid+": required equipment missing")
            if not set(l["allowedSlots"])<=set(x["availableSlots"]): errors.append(lid+": room unavailable in allowedSlots")
        for t in l["teachers"]:
            y=teachers.get(t)
            if not evidence(y) or not slots(y): errors.append(lid+": missing/invalid teacher availability/source: "+t)
            elif not set(l["allowedSlots"])<=set(y["availableSlots"]): errors.append(lid+": teacher unavailable in allowedSlots: "+t)
    return errors

def validate(data):
    def require(ok, msg):
        if not ok: raise ValueError(msg)
    require(data.get("institute")==INSTITUTE and data.get("term")=="2026/2027-1", "Wrong institute or term")
    require(data.get("scope") in ("pilot", "institute-day"), "Unknown scope")
    gu=data["groupUnits"]
    require(isinstance(gu, dict) and bool(gu), "groupUnits required")
    catalog_path=Path(__file__).resolve().parents[1]/"institute-catalog.js"
    if catalog_path.exists():
        cat=json.loads(catalog_path.read_text(encoding="utf-8").split("=",1)[1].strip().rstrip(";"))
        approved={g["id"] for g in cat["groups"]}
        require(set(gu)<=approved,"Group outside daytime undergraduate/specialist catalog")
        if data["scope"]=="institute-day":
            require(set(gu)==approved,"Full scope must include all 83 groups")
    if data["scope"]=="institute-day":
        require(data.get("coverageConfirmed") is True and data.get("availabilityConfirmed") is True,"Full scope needs explicit coverage and availability confirmation")
    atoms=[]
    for g, us in gu.items():
        require(isinstance(us,list) and bool(us) and all(isinstance(u,str) and u for u in us),"Invalid atoms: "+g)
        atoms.extend(us)
    require(len(atoms)==len(set(atoms)),"Atoms must be disjoint")
    for key in ("maxGroupDay","maxTeacherDay"):
        require(type(data[key]) is int and 1<=data[key]<=5,key)
    require(type(data["bufferMinutes"]) in (int,float) and math.isfinite(data["bufferMinutes"]) and 0<=data["bufferMinutes"]<=30,"Invalid buffer")
    require(isinstance(data["routes"],dict),"Routes required")
    for k,v in data["routes"].items():
        require(len(k.split("|"))==2 and type(v) in (int,float) and math.isfinite(v) and 0<=v<=180,"Invalid route: "+k)
    ids=set(); seen=set()
    require(isinstance(data["lessons"],list) and 0<len(data["lessons"])<=12000,"Invalid lessons")
    for l in data["lessons"]:
        lid=l["id"]
        require(isinstance(lid,str) and lid and lid not in ids,"Duplicate/missing lesson id")
        ids.add(lid)
        require(isinstance(l["title"],str) and bool(l["title"].strip()),lid+": title")
        gs=l["groups"]; us=l["units"]; ts=l["teachers"]
        require(isinstance(gs,list) and bool(gs) and len(set(gs))==len(gs) and all(g in gu for g in gs),lid+": groups")
        seen.update(gs)
        require(isinstance(us,list) and bool(us) and len(set(us))==len(us) and set(us)<={u for g in gs for u in gu[g]} and all(set(us)&set(gu[g]) for g in gs),lid+": units")
        require(isinstance(ts,list) and bool(ts) and len(set(ts))==len(ts) and all(isinstance(t,str) and t.strip() for t in ts),lid+": teachers")
        require(all(isinstance(l[k],str) and l[k].strip() for k in ("room","building")),lid+": room/building")
        require(slot_ok(l["slot"]) and isinstance(l["allowedSlots"],list) and l["slot"] in l["allowedSlots"] and all(slot_ok(s) and week(s)==week(l["slot"]) for s in l["allowedSlots"]),lid+": slots")
        require(valid_duration(l),lid+": durationMinutes must be integer 1..240")
    if data["scope"]=="institute-day": require(seen==set(gu),"Some groups have no lessons")
    require(isinstance(data["blocked"],list),"Blocked list required")
    block_keys=set()
    for b in data["blocked"]:
        require(slot_ok(b["slot"]) and isinstance(b["resources"],list) and bool(b["resources"]) and len(set(b["resources"]))==len(b["resources"]) and all(isinstance(r,str) and len(r)>2 and r[:2] in ("g:","t:","r:") for r in b["resources"]),"Invalid external block")
        require(all(isinstance(b[k],str) and b[k] for k in ("room","building")),"External block needs actual location")
        require(valid_duration(b),"External durationMinutes must be integer 1..240")
        for resource in b["resources"]:
            key=(resource,b["slot"])
            require(key not in block_keys,"Duplicate/conflicting external resource block")
            block_keys.add(key)
    errors=resource_errors(data)
    require(not errors,"; ".join(errors[:20]))
    return data

def audit(data, chosen, weights):
    """Independent direct calculation, using actual consecutive appointments."""
    by=defaultdict(list); errors=[]; m=[0]*8
    for l in data["lessons"]:
        s=chosen.get(l["id"])
        if s not in l["allowedSlots"]: errors.append("Invalid/missing slot: "+l["id"]); continue
        m[5]+=s!=l["slot"]; m[7]+=day(s)!=day(l["slot"])
        for r in resources(l): by[r,day(s)].append((s,l,False))
    if set(chosen)!={l["id"] for l in data["lessons"]}: errors.append("Assignment IDs differ")
    for b in data["blocked"]:
        for r in b["resources"]: by[r,day(b["slot"])].append((b["slot"],b,True))
    for (r,d), events in by.items():
        events.sort(key=lambda x:x[0]); own=[e for e in events if not e[2]]
        if not own: continue
        if len({e[0] for e in events})!=len(events): errors.append("Overlap: "+r+" day "+str(d))
        for (s,a,_),(t,b,_) in zip(events,events[1:]):
            if gap_minutes(a,s,t)<0: errors.append("Time overlap: "+r+" day "+str(d))
        if r.startswith("r:"): continue
        g=r.startswith("g:"); n=len(events)
        if n>data["maxGroupDay" if g else "maxTeacherDay"]: errors.append("Daily limit: "+r)
        if g: m[4]+=n*(n-1)//2
        for (s,a,ae),(t,b,be) in zip(events,events[1:]):
            gap=gap_minutes(a,s,t)
            tr=journey(a,b,data)
            if tr is None or tr>gap: errors.append("Unknown/impossible route: "+r+" "+str(s)+"→"+str(t))
            if tr is not None:
                m[2 if g else 3]+=tr; m[6]+=gap-tr<10
            m[0 if g else 1]+=max(0,period(t)-period(s)-1)
    return {"errors":errors,"metrics":dict(zip(METRICS,m)),"score":sum(x*w for x,w in zip(m,weights))}

def solve(data, profile="balanced", seconds=120, seed=2026):
    from ortools.sat.python import cp_model
    validate(data)
    weights=PROFILES[profile]
    model=cp_model.CpModel()
    choices={}; at=defaultdict(list); objective=[]; one=model.new_constant(1)
    for i,l in enumerate(data["lessons"]):
        vs=[]
        for s in sorted(set(l["allowedSlots"])):
            x=model.new_bool_var(f"x_{i}_{s}"); choices[l["id"],s]=x; vs.append(x)
            objective.append((weights[5]*(s!=l["slot"])+weights[7]*(day(s)!=day(l["slot"])))*x)
            for r in resources(l): at[r,day(s),period(s)].append((x,l,False))
        model.add_exactly_one(vs)
    for b in data["blocked"]:
        for r in b["resources"]: at[r,day(b["slot"]),period(b["slot"])].append((one,b,True))
    rd=sorted({(r,d) for r,d,p in at})
    for i,(r,d) in enumerate(rd):
        lists=[at[r,d,p] for p in range(5)]
        if not any(not e[2] for a in lists for e in a): continue
        occ=[]
        for p,a in enumerate(lists):
            z=model.new_bool_var(f"occ_{i}_{p}")
            model.add(z==sum(e[0] for e in a)); occ.append(z)
        if r.startswith("r:"):
            # Different slot numbers do not guarantee non-overlapping actual times.
            for p in range(5):
                for q in range(p+1,5):
                    for x,a,_ in lists[p]:
                        if STARTS[q]-STARTS[p]<duration(a):
                            for y,b,_ in lists[q]:
                                model.add_bool_or([x.negated(),y.negated()])
            continue
        g=r.startswith("g:")
        own_vars=[x for a in lists for x,l,external in a if not external]
        active=model.new_bool_var(f"active_{i}")
        model.add(sum(own_vars)>=1).only_enforce_if(active)
        model.add(sum(own_vars)==0).only_enforce_if(active.negated())
        n=model.new_int_var(0,5,f"count_{i}")
        model.add(n==sum(occ))
        model.add(n<=data["maxGroupDay" if g else "maxTeacherDay"]).only_enforce_if(active)
        if g:
            conc=model.new_int_var(0,10,f"conc_{i}")
            model.add_element(n,[0,0,1,3,6,10],conc)
            cost=model.new_int_var(0,10,f"active_conc_{i}")
            model.add(cost==conc).only_enforce_if(active)
            model.add(cost==0).only_enforce_if(active.negated())
            objective.append(weights[4]*cost)
        for p in range(5):
            for q in range(p+1,5):
                for ai,(x,a,ae) in enumerate(lists[p]):
                    gap=STARTS[q]-STARTS[p]-duration(a)
                    for bi,(y,b,be) in enumerate(lists[q]):
                        # Consecutiveness is exact: selected endpoints, no occupied intervening slot, active day.
                        conditions=[x,y,active]+[z.negated() for z in occ[p+1:q]]
                        tr=journey(a,b,data)
                        if tr is None or tr>gap:
                            model.add_bool_or([z.negated() for z in conditions])
                            continue
                        coeff=weights[0 if g else 1]*(q-p-1)+weights[2 if g else 3]*tr+weights[6]*(gap-tr<10)
                        if not coeff: continue
                        z=model.new_bool_var(f"arc_{i}_{p}_{q}_{ai}_{bi}")
                        model.add_bool_and(conditions).only_enforce_if(z)
                        model.add_bool_or([t.negated() for t in conditions]+[z])
                        objective.append(coeff*z)
    # An independently verified existing timetable supplies a feasible warm start
    # and a safe upper bound: never return a worse score on this objective.
    baseline_assignment={l["id"]:l["slot"] for l in data["lessons"]}
    baseline_check=audit(data,baseline_assignment,weights)
    if not baseline_check["errors"]:
        for (lid,s),x in choices.items():
            model.add_hint(x,int(s==baseline_assignment[lid]))
        model.add(sum(objective)<=baseline_check["score"])
    model.minimize(sum(objective))
    solver=cp_model.CpSolver()
    solver.parameters.max_time_in_seconds=seconds
    solver.parameters.random_seed=seed
    solver.parameters.num_search_workers=1
    status=solver.solve(model)
    result={"status":solver.status_name(status),"profile":profile,"weights":dict(zip(METRICS,weights)),"seed":seed,"seconds_limit":seconds,"wall_seconds":solver.wall_time,
            "warnings":["Fixed rooms and standard start times; per-event durationMinutes defaults to 95 when omitted. Full scope depends on validated input and external constraints.","Travel rounded up to whole minutes. Metrics include known external appointments on active days. Distinct objective from browser heuristic."]}
    if status not in (cp_model.OPTIMAL,cp_model.FEASIBLE):
        return result
    chosen={lid:s for (lid,s),x in choices.items() if solver.boolean_value(x)}
    check=audit(data,chosen,weights)
    if check["errors"] or abs(check["score"]-solver.objective_value)>1e-6:
        raise RuntimeError("Independent audit failed: "+repr(check))
    result.update(objective=solver.objective_value,best_bound=solver.best_objective_bound,relative_gap=max(0,solver.objective_value-solver.best_objective_bound)/max(1,abs(solver.objective_value)),
                  baseline=baseline_check,audit=check,
                  lessons=[{**l,"slot":chosen[l["id"]]} for l in data["lessons"]])
    return result

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("input"); p.add_argument("output"); p.add_argument("--profile",choices=PROFILES,default="balanced")
    p.add_argument("--seconds",type=float,default=120); p.add_argument("--seed",type=int,default=2026)
    args=p.parse_args()
    if not math.isfinite(args.seconds) or args.seconds<=0: p.error("seconds must be positive")
    data=json.loads(Path(args.input).read_text(encoding="utf-8"))
    r=solve(data,args.profile,args.seconds,args.seed)
    Path(args.output).write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding="utf-8")
    print(r["status"])
if __name__=="__main__": main()
