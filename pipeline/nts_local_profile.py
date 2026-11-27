"""Reproduce NTS research profile from the exact immutable official CSV; no rates."""
import argparse
import json
from pathlib import Path
from pipeline.nts_snapshot_audit import audit

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = ROOT / "docs/data/nts-local-profile-v1.json"

def profile(parsed, regions, industries):
    rows = parsed["rows"]
    by_key = {(r["province"],r["district"],r["industry"]):r for r in rows}
    if len(by_key) != len(rows):
        raise ValueError("Duplicate geography/industry")
    industry_labels = {r["industry"] for r in rows}
    region_labels = {(r["province"],r["district"]) for r in rows}
    province_labels = {r["province"] for r in rows}
    periods = ("current","previous","year_ago")
    p = dict(rows=len(rows),industry_labels=len(industry_labels),
             province_labels=len(province_labels),region_labels=len(region_labels),
             absent_grid_cells=len(region_labels)*len(industry_labels)-len(rows),
             rows_with_any_zero=sum(any(r[k]==0 for k in periods) for r in rows),
             zeros_by_period={k:sum(r[k]==0 for r in rows) for k in periods})
    # Null means absent, not a zero or evidence of no businesses.
    matrix = [[n]+[by_key.get((prov,dist,n),{}).get("current") for prov,dist in regions] for n in industries]
    return p,matrix

def verify(raw, expected):
    parsed = audit(raw,expected["period"])
    if parsed["sha256"] != expected["sha256"] or len(raw) != expected["bytes"]:
        raise ValueError("Snapshot identity mismatch")
    if parsed["comparison_eligible"] != 0 or parsed["coverage_verified"]:
        raise ValueError("Unexpected comparison state")
    result = profile(parsed,expected["regions"],[row[0] for row in expected["matrix"]])
    if result != (expected["profile"],expected["matrix"]):
        raise ValueError("Profile or matrix differs")
    return result

if __name__ == "__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("csv",type=Path)
    a=p.parse_args()
    expected=json.loads(EXPECTED.read_text(encoding="utf-8"))
    result=verify(a.csv.read_bytes(),expected)
    print("NTS_LOCAL_PROFILE_REPRODUCED",result[0]["rows"])
