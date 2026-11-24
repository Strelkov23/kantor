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
    def __init__(self):super().__init__();self.forms=[];self.fields=[];self.scripts=[];self.in_datalist=False;self.options=[];self.current_select=None;self.select_options=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=="form":self.forms.append({k:a.get(k) for k in ("action","method","id")})
        if tag in ("input","select"):self.fields.append({"tag":tag,**{k:a.get(k) for k in ("name","id","type","placeholder")}})
        if tag=="script" and a.get("src"):self.scripts.append(a["src"])
        if tag=="datalist":self.in_datalist=a.get("id")=="groupOptions"
        if tag=="select":self.current_select=a.get("name")
        if tag=="option" and self.in_datalist:self.options.append({k:v for k,v in a.items() if k in ("value","label","data-id","data-group-id","data-name")})
        if tag=="option" and self.current_select=="academic_year":self.select_options.append({k:v for k,v in a.items() if k in ("value","selected")})
    def handle_endtag(self,tag):
        if tag=="datalist":self.in_datalist=False
        if tag=="select":self.current_select=None
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
        cat=json.loads((Path(__file__).resolve().parents[1]/"institute-catalog.js").read_text(encoding="utf-8").split("=",1)[1].strip().rstrip(";"))
        wanted={g["id"] for g in cat["groups"]}
        report["targetOptions"]=[o for o in p.options if any(str(v).strip() in wanted for v in o.values())]
        report["datalistCount"]=len(p.options)
        def norm(value):return re.sub(r"[\s\-–—]+","",str(value)).upper()
        target={norm(g):g for g in wanted}
        data_match=re.search(r'<script[^>]*id=["\']group-filter-data["\'][^>]*>(.*?)</script>',html,re.I|re.S)
        if data_match:
            rows=json.loads(data_match.group(1))
            report["groupRowKeys"]=list(rows[0]) if rows else []
            matched=[]
            for row in rows:
                # Only use fields that identify group names, not any student data.
                values=[str(v) for k,v in row.items() if k.startswith("group") and isinstance(v,(str,int))]
                found={target[norm(v)] for v in values if norm(v) in target}
                for g in found:
                    matched.append({"group":g,**{k:v for k,v in row.items() if k in ("group_id","group_name","group_label","department_id","department_label","department_name","course_label","study_form","education_level","specialty_label","specialty_name","specialization_label","specialization_name")}})
            report["matchedGroups"]=matched
            report["matchedGroupCount"]=len({r["group"] for r in matched})
        report["sampleTargetOptions"]=[o for o in p.options if any(any(norm(v).startswith(k) for k in target) for v in o.values())][:5]
        report["yearOptions"]=p.select_options
        # Show only public selector logic, not the embedded institution-wide group dataset.
        report["selectorLogic"]=[s[:12000] for s in inline if "function syncGroupHidden" in s and len(s)<20000]
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
