"""Refuse to publish a calendar snapshot older than or conflicting with the active one."""
import datetime as dt
import json
import pathlib
import sys

def checked(bundle):
    value = dt.datetime.fromisoformat(bundle["manifest"]["checked"].replace("Z", "+00:00"))
    if value.tzinfo is None:
        raise ValueError("Snapshot timestamp must include an offset")
    return value

def verify(new, old):
    a, b = checked(new), checked(old)
    if a < b:
        raise ValueError("Refusing to replace a newer published snapshot")
    if a == b and new != old:
        raise ValueError("Different contents with the same snapshot timestamp")

def self_test():
    def sample(stamp, payload=1):
        return {"manifest": {"checked": stamp}, "payload": payload}
    a = sample("2026-11-24T10:00:00+00:00")
    b = sample("2026-11-24T11:00:00+00:00")
    verify(b, a)
    verify(a, a)
    for new, old in [(a, b), (sample("2026-11-24T10:00:00+00:00", 2), a)]:
        try:
            verify(new, old)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid snapshot accepted")

if __name__ == "__main__":
    self_test()
    if len(sys.argv) != 3:
        raise SystemExit("Usage: check_snapshot_order.py NEW OLD")
    new, old = map(pathlib.Path, sys.argv[1:])
    bundle = json.loads(new.read_text(encoding="utf-8"))
    checked(bundle)
    if old.exists():
        verify(bundle, json.loads(old.read_text(encoding="utf-8")))
    print("Snapshot ordering verified")
