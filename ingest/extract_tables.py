"""Extract the physical table grid of official institute schedules.
All output is review-only; no cell is silently converted to a verified appointment.
"""
import hashlib, json, re
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urlsplit, urlunsplit
import pymupdf
from extract_sources import get_pdf, ROOT

OUT=ROOT/"data"/"source-tables"
def rect_list(r): return [round(float(x),2) for x in r]
def extract_page(page):
    words=page.get_text("words")
    # Preserve every source word and its original bbox, regardless of table detection.
    result={"page":page.number+1,"width":page.rect.width,"height":page.rect.height,
            "rotation":page.rotation,"words":[{"box":rect_list(w[:4]),"text":w[4],"block":w[5],"line":w[6],"word":w[7]} for w in words],"tables":[]}
    try:
        tables=page.find_tables(strategy="lines",snap_tolerance=2,join_tolerance=2,intersection_tolerance=3)
        for table in tables.tables:
            rows=[]
            values=table.extract()
            for j,row in enumerate(table.rows):
                rows.append([None if cell is None else {"box":rect_list(cell),"text":values[j][i] or ""} for i,cell in enumerate(row.cells)])
            result["tables"].append({"box":rect_list(table.bbox),"rowCount":table.row_count,"columnCount":table.col_count,"rows":rows})
    except Exception as e:
        result["tableError"]=str(e)
    return result
def main():
    OUT.mkdir(parents=True,exist_ok=True)
    manifest=json.loads((ROOT/"sources-2026.json").read_text(encoding="utf-8"))
    report={"status":"review_only","checked":datetime.now(timezone.utc).isoformat(),"courses":[]}
    for src in manifest["sources"]:
        c=src["course"]; record={"course":c,"url":src["url"],"expectedPages":src["pages"]};report["courses"].append(record)
        try:
            content=None; errors=[]
            u=urlsplit(src["url"])
            for host in dict.fromkeys([u.netloc,"rgau-msha.ru"]):
                try:
                    content,actual=get_pdf(urlunsplit(("https",host,u.path,u.query,"")));break
                except Exception as e:errors.append(str(e))
            if content is None:raise RuntimeError("; ".join(errors))
            with pymupdf.open(stream=content,filetype="pdf") as doc:
                pages=[extract_page(p) for p in doc]
            record.update(status="extracted_unverified",sha256=hashlib.sha256(content).hexdigest(),actualPages=len(pages),
                          words=sum(len(p["words"]) for p in pages),
                          tables=sum(len(p["tables"]) for p in pages),
                          pageDetails=[{"page":p["page"],"dimensions":[p["width"],p["height"]],"grids":[[t["rowCount"],t["columnCount"]] for t in p["tables"]]} for p in pages])
            payload={"course":c,"source":actual,"sha256":record["sha256"],"status":"physical source grids, not verified appointments","pages":pages}
            (OUT/f"course-{c}.json").write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
            print("COURSE",c,json.dumps(record,ensure_ascii=False))
            if c in (1,5):
                p=pages[0]
                print("SAMPLE",c,json.dumps({"firstWords":p["words"][:28],"firstTables":[{"box":t["box"],"firstRows":t["rows"][:4]} for t in p["tables"][:2]]},ensure_ascii=False))
        except Exception as e:
            record.update(status="unavailable",error=str(e));print("ERROR",c,str(e))
    (OUT/"manifest.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    if not all(r["status"]=="extracted_unverified" and r["actualPages"]==r["expectedPages"] for r in report["courses"]):
        raise SystemExit("Incomplete sources; do not publish partial snapshot")
if __name__=="__main__":main()
