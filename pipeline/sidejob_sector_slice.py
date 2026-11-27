"""Reproduce the research-only sector slice from immutable Radar v2 source."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/data/opportunity-radar.json"
OUTPUT = ROOT / "docs/data/sidejob-sector-slice-v1.json"

def derive(source, industry_ids):
    domain = next(d for d in source["domains"] if d["id"] == "district")
    if domain["gates"]["temporal"]["status"] != "VERIFIED":
        raise ValueError("Temporal comparison blocked")
    if source["comparisons"]["yoy"] != ["20252","20262"]:
        raise ValueError("Different source periods")
    area_ids = {a[0] for a in domain["areas"]}
    if len(area_ids) != 25:
        raise ValueError("Unexpected geography")
    names = dict(source["industries"])
    rows = [dict(zip(source["entity_columns"], e, strict=True)) for e in source["entities"]]
    rows = [r for r in rows if r["domain"] == "district"]
    result = []
    for id_ in industry_ids:
        a = [r for r in rows if r["industry_id"] == id_]
        if len({r["area_id"] for r in a}) != len(a) or not {r["area_id"] for r in a} <= area_ids:
            raise ValueError("Duplicate or unexpected district")
        def totals(kind):
            ok = [r for r in a if r[kind+"_yoy_status"] == "OK" and type(r[kind][0]) is int and r[kind][0] > 0 and type(r[kind][2]) is int and r[kind][2] >= 0]
            complete = {r["area_id"] for r in ok} == area_ids
            return dict(coverage=len(ok), baseline=sum(r[kind][0] for r in ok) if complete else None, current=sum(r[kind][2] for r in ok) if complete else None)
        gd = next((r for r in a if r["area_id"] == "11740"), None)
        result.append(dict(industry_id=id_,name=names[id_],sales=totals("sales"),stores=totals("stores"),
                           extreme_areas=sum(r["extreme"] is True for r in a),
                           findings=sum(r["finding"] is True and r["material"] is True and r["extreme"] is False for r in a),
                           gangdong=dict(sales_yoy_pct=gd["sales_yoy_pct"],stores_yoy_pct=gd["stores_yoy_pct"],stores=gd["stores"][2],opened=gd["opened"],closed=gd["closed"]) if gd else None))
    return result

if __name__ == "__main__":
    stored = json.loads(OUTPUT.read_text(encoding="utf-8"))
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    result = derive(source,[s["industry_id"] for s in stored["sectors"]])
    if result != stored["sectors"]:
        raise SystemExit("Sector slice mismatch")
    print("SECTOR_SLICE_REPRODUCED",len(result))
