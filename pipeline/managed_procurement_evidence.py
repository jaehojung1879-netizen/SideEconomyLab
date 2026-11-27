"""Inspect public demand observations without converting plans to actual spend."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"docs/data/managed-procurement-evidence-v2.json"

def verify(d):
    if d["commercial_approval"] or d["forecast_eligible"] or d["paid_own_transactions"]:
        raise ValueError("Unsupported promotion")
    plans=d["port_plans"]
    if len(plans)!=3 or len({x["year"] for x in plans})!=3:
        raise ValueError("Duplicate annual plan")
    for p in plans:
        if p["paid_verified"] or p["actual_quantity"] is not None or p["award_amount"] is not None:
            raise ValueError("Plan is not actual spend")
    for s in d["school_contracts"]:
        if s["paid_verified"] or s["private_demand_eligible"] or s["quantity"] is not None:
            raise ValueError("Contract list is not private demand")
    loc=d["port_2024_location_estimates"]
    return dict(jumbo_subtotal=sum(r["jumbo"] for r in loc),towel_known_subtotal=sum(r["towel"] for r in loc if r["towel"] is not None),towel_unknown=sum(r["towel"] is None for r in loc),destinations=len(loc))
if __name__=="__main__":
    print(json.dumps(verify(json.loads(SOURCE.read_text(encoding="utf-8"))),ensure_ascii=False))
