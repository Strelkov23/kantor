"""One-time small public OSM lookup for four exact official campus addresses.
No generic geocoder; no repeated scheduled requests. External candidate points, not entrances.
"""
import json,urllib.parse,urllib.request,datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
URL="https://overpass-api.de/api/interpreter"
QUERY='[out:json][timeout:25];(nwr["addr:street"="Лиственничная аллея"]["addr:housenumber"~"^(2|3|4|4[АаAa])$"](55.829,37.548,55.839,37.562););out tags center;'
def main():
    req=urllib.request.Request(URL,data=urllib.parse.urlencode({"data":QUERY}).encode(),headers={"User-Agent":"KANTOR-campus-research/0.15 (https://github.com/Strelkov23/kantor)","Accept":"application/json"})
    with urllib.request.urlopen(req,timeout=50) as r:
        if urllib.parse.urlsplit(r.geturl()).hostname!="overpass-api.de":raise ValueError("unexpected host")
        raw=r.read(500001)
        if len(raw)>500000:raise ValueError("too large")
    data=json.loads(raw)
    if data.get("remark"):raise ValueError(data["remark"])
    candidates=[]
    for e in data["elements"]:
        t=e.get("tags",{});p=e.get("center",e)
        if "lat" not in p or "lon" not in p:continue
        candidates.append({"type":e["type"],"id":e["id"],"address":t.get("addr:housenumber"),"street":t.get("addr:street"),"name":t.get("name"),"building":t.get("building"),"lat":p["lat"],"lon":p["lon"],"kind":"mapped node" if e["type"]=="node" else "object bounding-box center (not entrance)","source":"https://www.openstreetmap.org/"+e["type"]+"/"+str(e["id"])})
    report={"checked":datetime.datetime.now(datetime.timezone.utc).isoformat(),"status":"external candidate points, not verified entrances","officialAddressSource":"https://www.timacad.ru/sveden/common/","license":"OpenStreetMap contributors, ODbL; https://www.openstreetmap.org/copyright","candidates":candidates}
    print("OSM_CANDIDATES",json.dumps(report,ensure_ascii=False))
    (ROOT/"osm-campus-pilot.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
if __name__=="__main__":main()
