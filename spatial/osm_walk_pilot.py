"""Small one-off external pedestrian routing pilot. Address centers, not verified entrances.
Public FOSSGIS routing service: one request/sec max, no heavy use, attribution retained.
https://routing.openstreetmap.de/about.html
"""
import json,datetime,time,urllib.request,urllib.parse,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
POINTS=ROOT/"data/osm-address-pilot-15.json"
REPORT=ROOT/"osm-walk-pilot.json"
def main():
    d=json.loads(POINTS.read_text(encoding="utf-8"));pts={x["buildingCode"]:x for x in d["candidates"]}
    baseline=json.loads((ROOT/"data/calendar-spatial-14.json").read_text(encoding="utf-8"))
    # Only six high-demand directions, using exact externally mapped centers; no batch geocoding.
    chosen=[r for r in baseline["strict"]["routes"] if r["from"] in pts and r["to"] in pts][:6]
    results=[]
    for r in chosen:
        a,b=pts[r["from"]],pts[r["to"]]
        coords=f'{a["lon"]},{a["lat"]};{b["lon"]},{b["lat"]}'
        url="https://routing.openstreetmap.de/routed-foot/route/v1/driving/"+coords+"?overview=full&geometries=geojson&steps=false&alternatives=false"
        row={"from":r["from"],"to":r["to"],"calendarCount":r["count"],"minimumGap":r["minimum"],"source":url}
        try:
            req=urllib.request.Request(url,headers={"User-Agent":"KANTOR-campus-research/0.15 (https://github.com/Strelkov23/kantor)","Accept":"application/json"})
            with urllib.request.urlopen(req,timeout=25) as response:
                if urllib.parse.urlsplit(response.geturl()).hostname!="routing.openstreetmap.de":raise ValueError("unexpected host")
                raw=response.read(250001)
                if len(raw)>250000:raise ValueError("response too large")
            x=json.loads(raw)
            if x.get("code")!="Ok" or not x.get("routes") or len(x.get("waypoints",[]))!=2:raise ValueError("no route")
            z=x["routes"][0];dist=z["distance"];sec=z["duration"]
            snap=[w.get("distance") for w in x["waypoints"]]
            line=z["geometry"]["coordinates"]
            if not isinstance(dist,(int,float)) or not math.isfinite(dist) or dist<=0 or not isinstance(sec,(int,float)) or not math.isfinite(sec) or sec<=0 or len(line)<2 or any(v is None or not isinstance(v,(int,float)) or not math.isfinite(v) or v<0 for v in snap):raise ValueError("invalid route")
            row.update(status="estimated",meters=dist,seconds=sec,snapMeters=snap,geometry=line,warning="Address-center route; snapping and access are not verified; not a field measurement.")
        except Exception as e:row.update(status="unavailable",error=str(e))
        results.append(row);print("ROUTE",json.dumps({k:v for k,v in row.items() if k!="geometry"},ensure_ascii=False),flush=True)
        time.sleep(2)
    report={"version":"0.15","checked":datetime.datetime.now(datetime.timezone.utc).isoformat(),"status":"external pilot estimates only","sourcePoints":"data/osm-address-pilot-15.json","officialAddressSource":d["officialAddressSource"],"provider":"OSRM / FOSSGIS, OpenStreetMap contributors","license":"https://www.openstreetmap.org/copyright","policy":"https://routing.openstreetmap.de/about.html","routes":results}
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print("PILOT_RESULT",json.dumps(report,ensure_ascii=False),flush=True)
if __name__=="__main__":main()
