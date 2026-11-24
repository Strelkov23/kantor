"""Calendar-based spatial diagnostics, not a route measurement or individual attendance.
Input: complete public snapshot data/calendar-11. Output: review-only aggregate data.
"""
import json,re
from collections import defaultdict,Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/"data/calendar-11"
def building(room,known):
    # Only one conventional room code; named locations, sports and alternatives remain unknown.
    m=re.fullmatch(r"\s*(\d{2}[А-ЯA-Z]?)-\d{1,4}[А-Яа-яЁёA-Za-z]?\s*",room)
    if not m or m[1] not in known or m[1]=="29":return None
    return m[1]
def summarize_group(d,known):
    dates=defaultdict(list)
    for x in d["comparisons"]:
        c=x["calendar"];t=x["timing"]
        dates[c["date"]].append({"start":t["start"],"end":t["end"],"building":building(c["rooms"],known),"room":c["rooms"]})
    counts=Counter();routes=defaultdict(list);heat=Counter();unknown_rooms=Counter()
    for dt,events in dates.items():
        counts["cards"]+=len(events)
        counts["days"]+=1
        for x in events:
            if x["building"]:heat[x["building"]]+=1
            else:unknown_rooms[x["room"] or "(не указано)"]+=1
        if any(x["start"] is None or x["end"] is None or x["end"]<=x["start"] for x in events):
            counts["unusableDays"]+=1;continue
        # Merge overlapping appointments into a time block. If multiple possible buildings,
        # do not pretend every student follows one path.
        blocks=[]
        for x in sorted(events,key=lambda a:(a["start"],a["end"])):
            if blocks and x["start"]<blocks[-1]["end"]:
                b=blocks[-1];b["end"]=max(b["end"],x["end"]);b["buildings"].add(x["building"]);b["cards"]+=1
            else:blocks.append({"start":x["start"],"end":x["end"],"buildings":{x["building"]},"cards":1})
        counts["blocks"]+=len(blocks)
        counts["multiCardBlocks"]+=sum(b["cards"]>1 for b in blocks)
        for a,b in zip(blocks,blocks[1:]):
            counts["transitions"]+=1
            gap=b["start"]-a["end"]
            if len(a["buildings"])!=1 or len(b["buildings"])!=1 or None in a["buildings"] or None in b["buildings"]:
                counts["unknown"]+=1;continue
            f,t=next(iter(a["buildings"])),next(iter(b["buildings"]))
            if f==t:counts["same"]+=1;continue
            counts["cross"]+=1
            routes[f,t].append(gap)
    return counts,routes,heat,unknown_rooms
def main():
    m=json.loads((SRC/"manifest.json").read_text(encoding="utf-8"))
    catalog=json.loads((ROOT/"institute-catalog.js").read_text(encoding="utf-8").split("=",1)[1].strip().rstrip(";"))
    if m["complete"] is not True or len(m["groups"])!=83:raise ValueError("incomplete calendar")
    if {g["group"] for g in m["groups"]}!={g["id"] for g in catalog["groups"]}:raise ValueError("wrong group scope")
    totals=Counter();routes=defaultdict(list);heat=Counter();unknown=Counter();groups=[]
    for g in m["groups"]:
        if not re.fullmatch(r"\d+\.json",g["file"]):raise ValueError("bad path")
        d=json.loads((SRC/g["file"]).read_text(encoding="utf-8"))
        if d["checked"]!=m["checked"] or d["group"]!=g["group"] or len(d["comparisons"])!=g["cards"]:raise ValueError("snapshot mismatch")
        c,r,h,u=summarize_group(d,catalog["buildings"])
        totals.update(c);heat.update(h);unknown.update(u)
        for k,v in r.items():routes[k].extend(v)
        groups.append({"group":g["group"],"course":g["course"],**dict(c)})
    assert totals["cards"]==m["totals"]["cards"]
    assert totals["transitions"]==totals["same"]+totals["cross"]+totals["unknown"]
    assert totals["cross"]==sum(map(len,routes.values()))
    assert totals["cards"]==sum(heat.values())+sum(unknown.values())
    out={"version":"0.13","checked":m["checked"],"scope":"83 очные группы, календарный снимок","source":"data/calendar-11/manifest.json","method":"Соседние непересекающиеся временные блоки одного дня группы. Перерыв = начало следующего блока минус конец предыдущего. Перекрывающиеся карточки объединены; неоднозначная локация, именованные помещения и корпус 29 без конкретного строения не считаются установленным маршрутом. Не измерены пешие расстояния; не индивидуальные траектории.", "totals":dict(totals),"groups":groups,"buildingCards":[{"building":k,"cards":v} for k,v in heat.most_common()],"unknownLocations":[{"room":k,"cards":v} for k,v in unknown.most_common()],"routes":[{"from":a,"to":b,"count":len(v),"minimum":min(v),"gaps":dict(sorted(Counter(v).items()))} for (a,b),v in sorted(routes.items(),key=lambda x:(-len(x[1]),min(x[1]),x[0]))]}
    (ROOT/"data/calendar-spatial-13.json").write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
    print("SPATIAL",json.dumps({"totals":out["totals"],"routes":len(out["routes"]),"buildingCards":out["buildingCards"],"topRoutes":out["routes"][:5]},ensure_ascii=False))
if __name__=="__main__":main()
