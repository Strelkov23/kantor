"""Download public official PDFs; extract positioned source words for human verification.
No automatic promotion to verified appointments. Local files can be supplied instead.
"""
import argparse, hashlib, json, time
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlsplit, urlunsplit
import pymupdf
ROOT=Path(__file__).resolve().parents[1]
MAX_BYTES=30*1024*1024
def get_pdf(url):
    request=Request(url,headers={"User-Agent":"KANTOR research source verification/0.6", "Accept":"application/pdf"})
    with urlopen(request,timeout=15) as response:
        final=urlsplit(response.geturl())
        if final.scheme!="https" or final.hostname not in ("www.timacad.ru","timacad.ru","rgau-msha.ru","www.rgau-msha.ru"):
            raise ValueError("Unexpected redirect host")
        content=response.read(MAX_BYTES+1)
        if len(content)>MAX_BYTES or not content.startswith(b"%PDF-"):
            raise ValueError("Not a supported PDF")
        return content,response.geturl()
def extract(content,source):
    with pymupdf.open(stream=content,filetype="pdf") as doc:
        pages=[]
        for i,p in enumerate(doc):
            words=[{"box":[round(x,2) for x in w[:4]],"text":w[4],"block":w[5],"line":w[6],"word":w[7]} for w in p.get_text("words")]
            pages.append({"page":i+1,"width":p.rect.width,"height":p.rect.height,"rotation":p.rotation,"words":words,
                          "needs_manual_review":True,"empty_text":not bool(words)})
        return pages
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--local-dir",type=Path,help="Directory of original PDFs, named 1.pdf to 5.pdf")
    parser.add_argument("--output",type=Path,default=Path("source-review"))
    args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
    manifest=json.loads((ROOT/"sources-2026.json").read_text(encoding="utf-8"))
    report={"scope":manifest["scope"],"checked":datetime.now(timezone.utc).isoformat(),"records":[]}
    for item in manifest["sources"]:
        course=item["course"];entry={"course":course,"expected_pages":item["pages"],"official_url":item["url"],"attempts":[]}
        report["records"].append(entry)
        content=None;source=None
        if args.local_dir:
            try:
                content=(args.local_dir/f"{course}.pdf").read_bytes()
                if len(content)>MAX_BYTES or not content.startswith(b"%PDF-"):raise ValueError("Not a supported PDF")
                source="local file supplied by researcher; provenance must be checked"
            except Exception as e:
                entry["attempts"].append({"source":"local file","error":str(e)});content=None
        else:
            u=urlsplit(item["url"])
            for host in dict.fromkeys([u.netloc,"rgau-msha.ru"]):
                url=urlunsplit(("https",host,u.path,u.query,""))
                try:
                    content,source=get_pdf(url)
                    entry["attempts"].append({"source":url,"status":"downloaded"});break
                except Exception as e:
                    entry["attempts"].append({"source":url,"error":str(e)})
                time.sleep(1)
        if content is None:
            entry["status"]="unavailable";continue
        try:
            pages=extract(content,source);entry.update(status="extracted_unverified",source=source,sha256=hashlib.sha256(content).hexdigest(),actual_pages=len(pages),word_count=sum(len(p["words"]) for p in pages),page_count_matches=len(pages)==item["pages"])
            target=args.output/f"course-{course}-words.json"
            target.write_text(json.dumps({"course":course,"source":source,"sha256":entry["sha256"],"status":"unverified source words, not a timetable","pages":pages},ensure_ascii=False,indent=2),encoding="utf-8")
        except Exception as e:entry.update(status="extraction_failed",error=str(e))
    (args.output/"report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False))
if __name__=="__main__":main()
