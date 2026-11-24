"""Institute-only two-week comparison of public calendar and official PDF.
Produces review snapshots, never modifies original PDF data or solver input."""
import argparse,json,re,time,hashlib
from datetime import datetime,date,timedelta,timezone
from pathlib import Path
from compare_calendar import extract,compare,normalized_text
from check_group_pages import read
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"data/calendar-11"
STARTS=(540,655,780,895,1010)
def minutes(s):
    h,m=map(int,s.split(":"))
    if not (0<=h<24 and 0<=m<60):raise ValueError("invalid clock")
    return h*60+m
def time_info(r):
    m=re.fullmatch(r"\s*(\d{2}:\d{2})\s*[-–—]\s*(\d{2}:\d{2})\s*",r["time"])
    if not m:return {"start":None,"end":None,"duration":None,"status":"unparsed"}
    a,b=map(minutes,m.groups())
    if b<=a:return {"start":a,"end":b,"duration":None,"status":"invalid"}
    return {"start":a,"end":b,"duration":b-a,"status":"standard" if a in STARTS and b-a==95 else "nonstandard"}
def enrich(comp,source):
    rows={x["id"]:x for x in source["records"]}
    for x in comp["comparisons"]:
        r=x["calendar"];x["timing"]=time_info(r)
        p=rows.get(x.get("pdfId"));s=p.get("suggestion") if p else None
        if not s:
            x["teacherCheck"]="not-evaluable"
            continue
        # Only compare one calendar name against an independently parsed single PDF name.
        parts=r["teachers"].split()
        if ";" in r["teachers"] or len(parts)!=3 or not all(parts):
            x["teacherCheck"]="not-evaluable";continue
        abbreviated=parts[0]+" "+parts[1][0]+"."+parts[2][0]+"."
        x["teacherCheck"]="initials-match" if normalized_text(abbreviated)==normalized_text(s["teacher"]) else "needs-review"
        # Exact token comparison for conventional single numbered room identifiers.
        if re.fullmatch(r"\d{2}[А-ЯA-Z]?-\d{1,4}[А-Яа-яЁёA-Za-z]?",r["rooms"]):
            x["numberedRoomCheck"]="exact" if normalized_text(r["rooms"])==normalized_text(s["room"]) else "needs-review"
        else:x["numberedRoomCheck"]="not-evaluable"
    return comp
def count(values):
    out={}
    for k in values:out[str(k)]=out.get(str(k),0)+1
    return out
def main():
    global OUT
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out",type=Path,default=OUT)
    parser.add_argument("--require-complete",action="store_true")
    args=parser.parse_args()
    OUT=args.out.resolve()
    mapping=json.loads((ROOT/"data/electronic-groups-09.json").read_text(encoding="utf-8"))
    sources={i:json.loads((ROOT/f"data/normalized/course-{i}.json").read_text(encoding="utf-8")) for i in range(1,6)}
    expected={g for d in sources.values() for g in d["groups"]}
    gs=mapping["groups"]
    if len(gs)!=83 or {g["group"] for g in gs}!=expected or len({g["group_id"] for g in gs})!=83 or any(g["department_id"]!=22 or g["study_form"]!="Очная" for g in gs):raise ValueError("institute catalog mismatch")
    OUT.mkdir(parents=True,exist_ok=True)
    checked=datetime.now(timezone.utc).isoformat()
    report={"version":"0.11","checked":checked,"scope":"83 full-time undergraduate/specialist groups, IEAIC only","status":"review-only","groups":[]}
    for g in gs:
        name=g["group"];course=next(i for i,d in sources.items() if name in d["groups"]);source=sources[course]
        row={"group":name,"course":course,"url":g["url"]};report["groups"].append(row)
        try:
            # Strictly use the public selector URL, not arbitrary stored addresses.
            expected_url="https://eg.timacad.ru/schedule/groups/?academic_year=2026&group="+str(g["group_id"])
            if g["url"]!=expected_url:raise ValueError("unexpected public URL")
            html=read(expected_url);records,sections=extract(html,g)
            if not records:raise ValueError("no lesson cards")
            comp=enrich(compare(records,source,g,sections),source)
            cards=comp["comparisons"]
            row.update(status="extracted",counts=count(c["status"] for c in cards),timing=count(c["timing"]["status"] for c in cards),teachers=count(c.get("teacherCheck","not-evaluable") for c in cards),rooms=count(c.get("numberedRoomCheck","not-evaluable") for c in cards),notSeen=len(comp["pdfNotSeen"]),weekEvidence=comp["weekEvidence"],cards=len(cards),file=str(g["group_id"])+".json")
            payload={"version":"0.11","checked":checked,"group":name,"course":course,"url":expected_url,"pdfSource":source["source"],"pdfHash":source["sourceHash"],"sections":sections,**comp}
            (OUT/row["file"]).write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
            print("GROUP",name,row["cards"],row["counts"],flush=True)
        except Exception as e:
            row.update(status="unavailable",error=str(e));print("ERROR",name,str(e),flush=True)
        time.sleep(1.5)
    success=[g for g in report["groups"] if g["status"]=="extracted"]
    totals={"groups":len(success),"failed":83-len(success),"cards":sum(g["cards"] for g in success),"notSeen":sum(g["notSeen"] for g in success)}
    for k in ("counts","timing","teachers","rooms"):
        totals[k]={}
        for g in success:
            for key,val in g[k].items():totals[k][key]=totals[k].get(key,0)+val
    report["totals"]=totals
    report["complete"]=len(success)==83
    (OUT/"manifest.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print("TOTALS",json.dumps(totals,ensure_ascii=False),flush=True)
    # Scheduled publication runs in a temporary output directory, never on the frozen research snapshot.
    if args.require_complete and not report["complete"]:raise SystemExit("Incomplete collection; publication blocked")
if __name__=="__main__":main()
