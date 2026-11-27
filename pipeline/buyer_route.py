"""Verify research-only buyer/offer ledger and repeat existing owner-capacity arithmetic."""
import json
from pathlib import Path
from pipeline.owner_capacity import bounds
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"docs/data/buyer-route-v1.json"
def verify(d):
    if d["commercial_approval"] or d["forecast_eligible"] or d["paid_own_transactions"] != 0:
        raise ValueError("Unexpected approval or forecast")
    ids={s["id"] for s in d["sources"]}
    if len(ids)!=len(d["sources"]): raise ValueError("Duplicate evidence")
    for s in d["sources"]:
        if s["paid_verified"] or s["forecast_eligible"]: raise ValueError("Evidence promoted")
    for h in d["hypotheses"]:
        if not set(h["evidence"])<=ids: raise ValueError("Unlinked evidence")
    for s in d["scenarios"]:
        if bounds(**s["inputs"])!=s["expected"]: raise ValueError("Scenario mismatch")
    return len(d["hypotheses"])
if __name__=="__main__":
    print("BUYER_ROUTE_VERIFIED",verify(json.loads(SOURCE.read_text(encoding="utf-8"))))
