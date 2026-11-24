"""Refine calendar building-level mapping; retain original report and all ambiguity.
No walking times or coordinates inferred. Output compares strict and expanded alias scenarios.
"""
import json,re
from pathlib import Path
from collections import Counter,defaultdict
import calendar_spatial as prev
ROOT=prev.ROOT
def load():
    cat=json.loads((ROOT/"institute-catalog.js").read_text(encoding="utf-8").split("=",1)[1].strip().rstrip(";"))
    m=json.loads((prev.SRC/"manifest.json").read_text(encoding="utf-8"))
    aliases=json.loads((ROOT/"data/location-aliases-14.json").read_text(encoding="utf-8"))
    return cat,m,aliases
def classify(room,known,aliases,expanded=False):
    parts=[re.sub(r"\s+"," ",s.strip()) for s in re.split(r";| / ",room) if s.strip()]
    if not parts:return None,"missing"
    buildings=[];reasons=[]
    for part in parts:
        matches=[a for a in aliases if a["label"].casefold()==part.casefold()]
        if matches:
            a=matches[0]
            if a["label"]=="17-ФОС" and not expanded:return None,"alias-unconfirmed"
            # Named centre mapping is source-backed but not an entrance measurement.
            buildings.append(a["building"]);reasons.append("named");continue
        b=prev_building(part,known)
        if b is None:return None,"unresolved"
        buildings.append(b);reasons.append("numbered")
    if len(set(buildings))!=1:return None,"multiple-buildings"
    return buildings[0],("same-building-list" if len(parts)>1 else reasons[0])
prev_building=prev.building
def calculate(cat,m,aliases,expanded):
    known=cat["buildings"]; a=aliases["aliases"]
    totals=Counter();routes=defaultdict(list);heat=Counter();unknown=Counter();class_counts=Counter(); groups=[]
    if not m["complete"] or {g["group"] for g in m["groups"]}!={g["id"] for g in cat["groups"]}:raise ValueError("invalid scope")
    prev.building=lambda room,k:classify(room,k,a,expanded)[0]
    try:
        for g in m["groups"]:
            if not re.fullmatch(r"\d+\.json",g["file"]):raise ValueError("bad filename")
            d=json.loads((prev.SRC/g["file"]).read_text(encoding="utf-8"))
            if d["checked"]!=m["checked"] or d["group"]!=g["group"] or len(d["comparisons"])!=g["cards"]:raise ValueError("snapshot mismatch")
            for x in d["comparisons"]:
                b,reason=classify(x["calendar"]["rooms"],known,a,expanded);class_counts[reason]+=1
            c,r,h,u=prev.summarize_group(d,known);totals.update(c);heat.update(h);unknown.update(u)
            for k,v in r.items():routes[k].extend(v)
            groups.append({"group":g["group"],"course":g["course"],**dict(c)})
    finally:prev.building=prev_building
    assert totals["cards"]==m["totals"]["cards"]==sum(class_counts.values())
    assert totals["transitions"]==totals["same"]+totals["cross"]+totals["unknown"]
    assert totals["cards"]==sum(heat.values())+sum(unknown.values())
    assert totals["cross"]==sum(map(len,routes.values()))
    return {"totals":dict(totals),"classification":dict(class_counts),"groups":groups,"buildingCards":[{"building":k,"cards":v} for k,v in heat.most_common()],"unknownLocations":[{"room":k,"cards":v} for k,v in unknown.most_common()],"routes":[{"from":a,"to":b,"count":len(v),"minimum":min(v),"gaps":dict(sorted(Counter(v).items()))} for (a,b),v in sorted(routes.items(),key=lambda x:(-len(x[1]),min(x[1]),x[0]))]}
def test():
    c={"01":"a","12":"b","17":"c","17А":"d","29":"e"}
    a=[{"label":"17-ПРОДИМЕКС","building":"17А"},{"label":"17-ФОС","building":"17А"}]
    assert classify("01-213; \n01-213",c,a)==("01","same-building-list")
    assert classify("01-213; 01-214",c,a)==("01","same-building-list")
    assert classify("01-213; 12-214",c,a)[0] is None
    assert classify("29-218",c,a)[0] is None
    assert classify("17-ПРОДИМЕКС",c,a)[0]=="17А"
    assert classify("17-ФОС",c,a)[0] is None
    assert classify("17-ФОС",c,a,True)[0]=="17А"
    assert classify("01-213; СК",c,a)[0] is None
def main():
    test();cat,m,a=load();strict=calculate(cat,m,a,False);expanded=calculate(cat,m,a,True)
    old=json.loads((ROOT/"data/calendar-spatial-13.json").read_text(encoding="utf-8"))
    assert old["checked"]==m["checked"] and strict["totals"]["transitions"]==old["totals"]["transitions"]
    assert strict["totals"]["unknown"]<=old["totals"]["unknown"] and expanded["totals"]["unknown"]<=strict["totals"]["unknown"]
    out={"version":"0.14","checked":m["checked"],"scope":"83 очные группы","previous":old["totals"],"strict":strict,"expanded":expanded,"notes":"Уровень корпуса, не входа. Строгий режим допускает перечни аудиторий только одного корпуса и документированные именованные помещения. Расширенный дополнительно принимает сокращение 17-ФОС как гипотезу. Не подтверждает подгруппы, индивидуальные маршруты, расстояния или время ходьбы."}
    (ROOT/"data/calendar-spatial-14.json").write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
    print("RESULT",json.dumps({"strict":strict["totals"],"expanded":expanded["totals"],"classification":strict["classification"],"routes":len(strict["routes"]),"shortRoutes":sum(r["minimum"]<=20 for r in strict["routes"])},ensure_ascii=False))
if __name__=="__main__":main()
