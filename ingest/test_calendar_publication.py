"""Offline checks of the publication gate against the frozen research fixture."""
import copy,json,shutil,tempfile,unittest
from datetime import datetime,timedelta
from pathlib import Path
from package_current_calendar import package,ROOT
class CalendarPublicationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source=ROOT/"data/calendar-11"
        cls.manifest=json.loads((cls.source/"manifest.json").read_text(encoding="utf-8"))
        cls.catalog=json.loads((ROOT/"institute-catalog.js").read_text(encoding="utf-8").split("=",1)[1].strip().rstrip(";"))
        cls.now=datetime.fromisoformat(cls.manifest["checked"])+timedelta(minutes=10)
    def test_complete_frozen_fixture(self):
        b=package(self.source,self.catalog,self.now)
        self.assertEqual(len(b["files"]),83)
        self.assertEqual(b["manifest"]["totals"]["cards"],2599)
        self.assertEqual(b["period"]["start"],"2026-11-23")
    def test_old_collection_rejected(self):
        with self.assertRaises(ValueError):
            package(self.source,self.catalog,self.now+timedelta(days=2))
    def test_incomplete_and_corrupt(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/"calendar"
            shutil.copytree(self.source,p)
            m=copy.deepcopy(self.manifest);m["complete"]=False
            (p/"manifest.json").write_text(json.dumps(m,ensure_ascii=False),encoding="utf-8")
            with self.assertRaises(ValueError):package(p,self.catalog,self.now)
            (p/"manifest.json").write_text(json.dumps(self.manifest,ensure_ascii=False),encoding="utf-8")
            fn=p/self.manifest["groups"][0]["file"]
            f=json.loads(fn.read_text(encoding="utf-8"))
            f["sections"][0]["dates"]=["2026-01-01"]
            fn.write_text(json.dumps(f,ensure_ascii=False),encoding="utf-8")
            with self.assertRaises(ValueError):package(p,self.catalog,self.now)
from urllib.error import HTTPError, URLError
from unittest.mock import Mock
from compare_institute_calendar import read_with_retry

class CalendarTransportTest(unittest.TestCase):
    def test_transient_then_success(self):
        reader=Mock(side_effect=[URLError("network"),TimeoutError("timeout"),"complete"])
        pause=Mock()
        self.assertEqual(read_with_retry("https://example.invalid",reader,pause),"complete")
        self.assertEqual(reader.call_count,3)
        self.assertEqual([c.args[0] for c in pause.call_args_list],[2,4])
    def test_rate_limit(self):
        error=HTTPError("https://example.invalid",429,"limited",{"Retry-After":"12"},None)
        reader=Mock(side_effect=[error,"complete"]);pause=Mock()
        self.assertEqual(read_with_retry("https://example.invalid",reader,pause),"complete")
        pause.assert_called_once_with(12)
    def test_permanent_or_long_cooldown(self):
        for error in [HTTPError("https://example.invalid",404,"missing",{},None),
                      HTTPError("https://example.invalid",429,"limited",{"Retry-After":"120"},None),
                      ValueError("invalid response")]:
            reader=Mock(side_effect=error);pause=Mock()
            with self.assertRaises(type(error)):read_with_retry("https://example.invalid",reader,pause)
            self.assertEqual(reader.call_count,1);pause.assert_not_called()
    def test_exhausted(self):
        reader=Mock(side_effect=URLError("offline"));pause=Mock()
        with self.assertRaises(URLError):read_with_retry("https://example.invalid",reader,pause)
        self.assertEqual(reader.call_count,3);self.assertEqual(pause.call_count,2)

if __name__=="__main__":unittest.main()
