"""Bounded comparison of public calendar cards and institute PDF positions.
No accounts; no private student records; no automatic changes to semester model."""
import json,re,time,hashlib
from datetime import datetime,date,timezone,timedelta
from pathlib import Path
from bs4 import BeautifulSoup
from check_group_pages import read
ROOT=Path(__file__).resolve().parents[1]
SAMPLE=("ДЭ 10-26","ДЭ 23-24","Д-Э 508")
STARTS=("09:00","10:55","13:00","14:55","16:50")
def norm(s):return re.sub(r"[\s\-–—]+","",str(s)).upper()
def normalized_text(s):return re.sub(r"[\W_]+","",s.casefold().replace("ё","е"))
def extract(html,g):
    soup=BeautifulSoup(html,"html.parser")
    headings=[x.get_text(" ",strip=True) for x in soup.select("h1,h2,h3,h4")]
    if not any(norm(h)==norm("Группа "+g["group"]) for h in headings):raise ValueError("group heading mismatch")
    records=[];sections=[]
    for section in ("groupScheduleCurrentWeekAccordion","groupScheduleNextWeekAccordion"):
        node=soup.find(id=section)
        if node is None:raise ValueError("missing calendar section "+section)
        days=[]
        for day in node.select(".accordion-item"):
            heading=day.select_one(".group-schedule-head-date")
            if heading is None:raise ValueError("missing date")
            mt=re.search(r"\d{2}\.\d{2}\.\d{4}",heading.get_text(" ",strip=True))
            if not mt:raise ValueError("invalid day")
            dt=datetime.strptime(mt.group(),"%d.%m.%Y").date()
            days.append(dt.isoformat())
            for card in day.select(".group-schedule-lesson-item"):
                def txt(sel):
                    el=card.select_one(sel)
                    return el.get_text(" ",strip=True) if el else ""
                time_range=txt(".group-schedule-time-range")
                subject=txt(".group-schedule-subject")
                if not time_range or not subject:raise ValueError("incomplete calendar lesson")
                # UI number is ordinal within day, not the timetable slot.
                start=re.match(r"(\d{2}:\d{2})",time_range)
                period=STARTS.index(start.group(1)) if start and start.group(1) in STARTS else None
                meta={}
                for line in card.select(".group-schedule-meta-line"):
                    icon=line.find("i")
                    classes=icon.get("class",[]) if icon else []
                    val=line.get_text(" ",strip=True)
                    if "bi-person" in classes:meta["teachers"]=val
                    if "bi-geo-alt" in classes:meta["rooms"]=val
                records.append({"date":dt.isoformat(),"day":dt.weekday(),"period":period,"time":time_range,
                    "subject":subject,"teachers":meta.get("teachers",""),"rooms":meta.get("rooms",""),
                    "type":txt(".group-schedule-tag-lesson-type"),"weekLabel":txt(".group-schedule-week-badge"),
                    "tags":[x.get_text(" ",strip=True) for x in card.select(".group-schedule-tags .badge")],
                    "section":section})
        sections.append({"id":section,"dates":days})
    return records,sections
def compare(records,source,g,sections):
    # Infer only dates from explicit upper/lower tags, not an assumed ISO week parity.
    evidence={}
    for r in records:
        w=r["weekLabel"].casefold()
        if "верхняя" in w or "нижняя" in w:
            dt=date.fromisoformat(r["date"]);mon=(dt-timedelta(days=dt.weekday())).isoformat()
            evidence.setdefault(mon,set()).add(0 if "верхняя" in w else 1)
    result=[];seen=set();observed={}
    for r in records:
        dt=date.fromisoformat(r["date"]);mon=(dt-timedelta(days=dt.weekday())).isoformat()
        halves=evidence.get(mon,set())
        if len(halves)!=1 or r["period"] is None or r["day"]>=5:
            result.append({"calendar":r,"status":"unmapped-calendar-slot"});continue
        h=next(iter(halves));key=(h,r["day"],r["period"])
        observed.setdefault(mon,set()).add(key)
        matches=[x for x in source["records"] if g["group"] in x["groups"] and h in x["halves"] and x["day"]==r["day"] and x["period"]==r["period"]]
        seen.add((mon,*key))
        if len(matches)!=1:
            result.append({"calendar":r,"status":"calendar-only-or-ambiguous","pdfIds":[x["id"] for x in matches]});continue
        p=matches[0];s=p.get("suggestion")
        subject_match=normalized_text(r["subject"]) in normalized_text(p["raw"])
        room_values=[x.strip() for x in r["rooms"].split(";") if x.strip()]
        room_match=bool(room_values) and all(normalized_text(x) in normalized_text(p["raw"]) for x in room_values)
        # A text containment match is not a confirmed person/room mapping.
        status="text-and-room-match" if subject_match and room_match else "needs-review"
        result.append({"calendar":r,"status":status,"pdfId":p["id"],"pdfPage":p["page"],"pdfRaw":p["raw"],"subjectTextMatch":subject_match,"roomTextMatch":room_match})
    # Missing slots are review candidates, not cancellations; sections can omit non-teaching days.
    missing=[]
    for mon,halves in evidence.items():
        if len(halves)!=1:continue
        h=next(iter(halves))
        for p in source["records"]:
            if g["group"] in p["groups"] and h in p["halves"] and (mon,h,p["day"],p["period"]) not in seen:
                missing.append({"weekStart":mon,"id":p["id"],"page":p["page"],"day":p["day"],"period":p["period"],"raw":p["raw"],"status":"not-seen-in-calendar-snapshot"})
    return {"weekEvidence":{k:sorted(v) for k,v in evidence.items()},"comparisons":result,"pdfNotSeen":missing}
def main():
    mapping=json.loads((ROOT/"data/electronic-groups-09.json").read_text(encoding="utf-8"))
    report={"version":"0.10","checked":datetime.now(timezone.utc).isoformat(),"scope":"three institute groups; current and next week only","status":"review-only","groups":[]}
    for name in SAMPLE:
        g=next(x for x in mapping["groups"] if x["group"]==name)
        row={"group":name,"url":g["url"]};report["groups"].append(row)
        try:
            course=next(i for i in range(1,6) if name in json.loads((ROOT/f"data/normalized/course-{i}.json").read_text(encoding="utf-8"))["groups"])
            source=json.loads((ROOT/f"data/normalized/course-{course}.json").read_text(encoding="utf-8"))
            html=read(g["url"]);records,sections=extract(html,g)
            if not records:raise ValueError("no lesson cards")
            comp=compare(records,source,g,sections)
            counts={}
            for c in comp["comparisons"]:counts[c["status"]]=counts.get(c["status"],0)+1
            row.update(status="extracted",course=course,pdfSource=source["source"],pdfHash=source["sourceHash"],sections=sections,counts=counts,**comp)
            print("COMPARISON",name,json.dumps({"counts":counts,"weeks":comp["weekEvidence"],"notSeen":len(comp["pdfNotSeen"])},ensure_ascii=False))
        except Exception as e:row.update(status="unavailable",error=str(e));print("ERROR",name,str(e))
        time.sleep(2)
    if not all(x["status"]=="extracted" for x in report["groups"]):raise SystemExit("Incomplete pilot; no snapshot published")
    out=ROOT/"data/calendar-pilot-10.json";out.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
if __name__=="__main__":main()
