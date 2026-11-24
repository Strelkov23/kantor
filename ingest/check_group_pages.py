"""Read public group timetable pages for a small, institute-only pilot.
No accounts or private APIs. Do not publish full HTML or embedded university-wide selector data."""
import json,re,time
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlencode
from inspect_public_schedule import BASE
from urllib.request import Request,urlopen
from urllib.parse import urlsplit
from datetime import datetime,timezone

def read(url):
    with urlopen(Request(url,headers={'User-Agent':'KANTOR public timetable research/0.10'}),timeout=25) as r:
        if urlsplit(r.geturl()).hostname!='eg.timacad.ru':raise ValueError('unexpected host')
        raw=r.read(12_000_001)
        if len(raw)>12_000_000:raise ValueError('response too large')
        return raw.decode('utf-8',errors='replace')
ROOT=Path(__file__).resolve().parents[1]
class Tables(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True);self.tables=[];self.table=None;self.row=None;self.cell=None;self.skip=0;self.headings=[];self.heading=None
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag in ("script","style"):self.skip+=1
        if self.skip:return
        if tag=="table" and self.table is None:self.table={"id":a.get("id"),"class":a.get("class"),"rows":[]}
        if tag=="tr" and self.table is not None:self.row=[]
        if tag in ("td","th") and self.row is not None:self.cell={"type":tag,"span":a.get("rowspan","1"),"colspan":a.get("colspan","1"),"text":""}
        if tag=="br" and self.cell is not None:self.cell["text"]+="\n"
        if tag in ("h1","h2","h3","h4"):self.heading=""
    def handle_endtag(self,tag):
        if tag in ("script","style"):self.skip=max(0,self.skip-1);return
        if self.skip:return
        if tag in ("td","th") and self.cell is not None:
            self.cell["text"]=re.sub(r"[ \t\r\f]+"," ",self.cell["text"]).strip();self.row.append(self.cell);self.cell=None
        if tag=="tr" and self.row is not None:self.table["rows"].append(self.row);self.row=None
        if tag=="table" and self.table is not None:self.tables.append(self.table);self.table=None
        if tag in ("h1","h2","h3","h4") and self.heading is not None:self.headings.append(self.heading.strip());self.heading=None
    def handle_data(self,data):
        if self.skip:return
        if self.cell is not None:self.cell["text"]+=data
        if self.heading is not None:self.heading+=data
def main():
    mapping=json.loads((ROOT/"data/electronic-groups-09.json").read_text(encoding="utf-8"))
    for name in ("ДЭ 10-26","ДЭ 23-24","Д-Э 508"):
        g=next(x for x in mapping["groups"] if x["group"]==name)
        url=BASE+"?"+urlencode({"academic_year":2026,"group":g["group_id"]})
        try:
            html=read(url);p=Tables();p.feed(html)
            sections={}
            for sid in ("groupScheduleCurrentWeekAccordion","groupScheduleNextWeekAccordion"):
                pos=html.find('id="'+sid+'"')
                if pos>=0:
                    # Only bounded snippets of public lesson markup, not embedded selector data.
                    sections[sid]=html[max(0,pos-100):pos+18000]
            print("MARKUP",json.dumps({"group":name,"sections":sections},ensure_ascii=False))
            print("GROUP",json.dumps({"group":name,"url":url,"headings":p.headings[:12],"tables":[{"id":t["id"],"class":t["class"],"count":len(t["rows"]),"sample":t["rows"][:8]} for t in p.tables[:6]],"scheduleNodes":re.findall(r'<(?:div|section|script)[^>]*id="([^"]*(?:schedule|timetable)[^"]*)"',html,re.I)[:20]},ensure_ascii=False))
        except Exception as e:print("ERROR",name,str(e))
        time.sleep(2)
if __name__=="__main__":main()
