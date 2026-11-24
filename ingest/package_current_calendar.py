"""Package only a complete, date-checked public institute snapshot."""
import argparse,json
from datetime import date,datetime,timedelta,timezone
from pathlib import Path
from zoneinfo import ZoneInfo
ROOT=Path(__file__).resolve().parents[1]
SECTIONS=("groupScheduleCurrentWeekAccordion","groupScheduleNextWeekAccordion")
def require(ok,msg):
    if not ok:raise ValueError(msg)
def package(source,catalog,now=None):
    m=json.loads((source/"manifest.json").read_text(encoding="utf-8"))
    now=now or datetime.now(timezone.utc)
    checked=datetime.fromisoformat(m["checked"])
    require(checked.tzinfo is not None and timedelta(minutes=-5)<=now-checked<=timedelta(hours=12),"Invalid timestamp")
    today=checked.astimezone(ZoneInfo("Europe/Moscow")).date()
    require(date(2026,9,1)<=today<=date(2027,1,31),"Outside configured semester guard")
    monday=today-timedelta(days=today.weekday())
    expected={g["id"]:g["course"] for g in catalog["groups"]}
    gs=m["groups"]
    require(m["version"]=="0.11" and m["complete"] is True and len(gs)==len(expected)==83 and {g["group"] for g in gs}==set(expected),"Incomplete institute coverage")
    files=[];names=set();total=0;missing=0
    totals={k:{} for k in ("counts","timing","teachers","rooms")}
    for g in gs:
        fn=g["file"]
        require(fn.endswith(".json") and fn[:-5].isdigit() and fn not in names and g["status"]=="extracted" and g["course"]==expected[g["group"]],"Invalid group metadata")
        names.add(fn)
        f=json.loads((source/fn).read_text(encoding="utf-8"))
        require(f["checked"]==m["checked"] and f["group"]==g["group"] and f["course"]==g["course"] and f["url"]==g["url"]=="https://eg.timacad.ru/schedule/groups/?academic_year=2026&group="+fn[:-5],"Mismatched group payload")
        sections=f["sections"]
        require([s["id"] for s in sections]==list(SECTIONS),"Missing calendar sections")
        dates={}
        for i,s in enumerate(sections):
            ds=[date.fromisoformat(d) for d in s["dates"]];lo=monday+timedelta(days=7*i)
            require(bool(ds) and len(ds)==len(set(ds)) and all(lo<=d<lo+timedelta(days=7) for d in ds),"Stale, duplicate or empty section: "+g["group"])
            dates[s["id"]]=set(s["dates"])
        rows=f["comparisons"]
        require(len(rows)==g["cards"] and bool(rows) and len(f["pdfNotSeen"])==g["notSeen"],"Invalid lesson count")
        counts={k:{} for k in totals}
        for r in rows:
            c,t=r["calendar"],r["timing"]
            require(c["date"] in dates.get(c["section"],set()) and c["subject"].strip() and c["time"].strip(),"Invalid card")
            for k,v in (("counts",r["status"]),("timing",t["status"]),("teachers",r.get("teacherCheck","not-evaluable")),("rooms",r.get("numberedRoomCheck","not-evaluable"))):
                counts[k][v]=counts[k].get(v,0)+1
        for k in totals:
            require(counts[k]==g[k],"Group totals differ: "+g["group"]+" "+k)
            for v,n in counts[k].items():totals[k][v]=totals[k].get(v,0)+n
        total+=len(rows);missing+=len(f["pdfNotSeen"]);files.append(f)
    require(m["totals"]["groups"]==83 and m["totals"]["failed"]==0 and m["totals"]["cards"]==total and m["totals"]["notSeen"]==missing and all(m["totals"][k]==totals[k] for k in totals),"Manifest totals differ")
    return {"version":"0.27","manifest":m,"files":files,"period":{"start":monday.isoformat(),"end":(monday+timedelta(days=13)).isoformat()}}
def main():
    p=argparse.ArgumentParser();p.add_argument("source",type=Path);p.add_argument("output",type=Path);a=p.parse_args()
    cat=json.loads((ROOT/"institute-catalog.js").read_text(encoding="utf-8").split("=",1)[1].strip().rstrip(";"))
    b=package(a.source,cat);a.output.parent.mkdir(parents=True,exist_ok=True)
    temp=a.output.with_suffix(".tmp");temp.write_text(json.dumps(b,ensure_ascii=False,separators=(",",":")),encoding="utf-8");temp.replace(a.output)
    print("Validated",b["manifest"]["totals"]["cards"],"cards",b["period"])
if __name__=="__main__":main()
