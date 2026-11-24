"""Inspect only the publicly accessible timetable page and its declared form/JS.
No login, no guessing private API routes, no scraping student account data.
"""
import json, re
from html.parser import HTMLParser
from urllib.request import Request,urlopen
from urllib.parse import urljoin,urlsplit
from pathlib import Path
BASE="https://eg.timacad.ru/schedule/groups/"
class Page(HTMLParser):
    def __init__(self):super().__init__();self.forms=[];self.fields=[];self.scripts=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=="form":self.forms.append({k:a.get(k) for k in ("action","method","id")})
        if tag in ("input","select"):self.fields.append({"tag":tag,**{k:a.get(k) for k in ("name","id","type","placeholder")}})
        if tag=="script" and a.get("src"):self.scripts.append(a["src"])
def read(url):
    with urlopen(Request(url,headers={"User-Agent":"KANTOR public timetable research/0.9"}),timeout=20) as r:
        if urlsplit(r.geturl()).hostname!="eg.timacad.ru":raise ValueError("unexpected host")
        data=r.read(2_000_001)
        if len(data)>2_000_000:raise ValueError("response too large")
        return data.decode("utf-8",errors="replace")
def main():
    report={"source":BASE}
    try:
        html=read(BASE);p=Page();p.feed(html)
        report.update(status="public page fetched",forms=p.forms,fields=p.fields,scripts=p.scripts)
        # Collect URL literals from explicitly linked same-origin JS, excluding account/grade paths.
        candidates=[]
        for path in p.scripts[:12]:
            url=urljoin(BASE,path)
            if urlsplit(url).hostname!="eg.timacad.ru":continue
            try:
                js=read(url)
                urls=sorted(set(re.findall(r"""['"](/(?:api/|schedule/)[A-Za-z0-9_/?=&.-]+)['"]""",js)))
                candidates.extend({"script":path,"path":x} for x in urls if "group" in x.lower() or "schedule" in x.lower())
            except Exception as e:report.setdefault("scriptErrors",[]).append(str(e))
        # Inspect inline script declarations for the public group selector only.
        inline=re.findall(r"<script\b[^>]*>(.*?)</script>",html,re.I|re.S)
        report["inlineLengths"]=[len(s) for s in inline]
        snippets=[]
        for s in inline:
            for line in s.splitlines():
                if re.search(r"fetch\(|groupInput|groupData|groupsData|groupList|groupOptions|autocomplete|academicYear|URLSearchParams",line,re.I):
                    if len(line)<700:snippets.append(line.strip())
                    else:snippets.append(line[:180]+" [long line omitted]")
        report["publicSelectorSnippets"]=snippets[:80]
        report["declaredSchedulePaths"]=candidates
    except Exception as e:report.update(status="unavailable",error=str(e))
    print(json.dumps(report,ensure_ascii=False))
if __name__=="__main__":main()
