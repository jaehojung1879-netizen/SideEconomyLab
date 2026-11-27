"""Research-only dual-track economics and synthetic facilities expense exceptions."""
import json
from pathlib import Path
from pipeline.owner_capacity import bounds
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"docs/data/facility-dual-track-v1.json"

def exposure(*,setup,monthly,min_months,inventory,exit_cost,refundable_deposit,documented_recovery):
    inputs=(setup,monthly,min_months,inventory,exit_cost,refundable_deposit,documented_recovery)
    if any(type(x) is not int or x<0 for x in inputs):
        raise ValueError("Nonnegative integer assumptions only")
    committed=setup+monthly*min_months+inventory+exit_cost
    if documented_recovery>committed: raise ValueError("Recovery above outlay")
    return dict(upfront_cash_krw=setup+inventory+refundable_deposit,committed_outlay_krw=committed,loss_bound_krw=committed-documented_recovery)

def exceptions(rows):
    """Synthetic demonstration. Amounts ex VAT, identical approved SKU/unit, no fraud claim."""
    seen=set()
    out=[]
    for r in rows:
        for k in ("site","vendor","invoice","sku","unit"):
            if not isinstance(r[k],str) or not r[k].strip(): raise ValueError("Missing identity")
        for k in ("amount","quantity","approved_unit_price"):
            if type(r[k]) is not int or r[k]<0: raise ValueError("Invalid numeric value")
        if r["quantity"]==0: raise ValueError("Zero quantity")
        if r["comparable"] is not True and r["comparable"] is not False: raise ValueError("Explicit comparison state required")
        key=(r["vendor"],r["invoice"],r["sku"],r["unit"])
        flags=[]
        if key in seen: flags.append("DUPLICATE_KEY_REVIEW")
        seen.add(key)
        if r["comparable"] is not True:
            flags.append("PRICE_COMPARISON_BLOCKED")
        elif r["amount"]>r["quantity"]*r["approved_unit_price"]:
            flags.append("ABOVE_APPROVED_PRICE_REVIEW")
        if flags: out.append({"site":r["site"],"invoice":r["invoice"],"flags":flags})
    return out

def verify(d):
    if d["commercial_approval"] or d["forecast_eligible"] or d["paid_own_transactions"]: raise ValueError("Unexpected promotion")
    if any(s["own_paid_verified"] for s in d["observations"]): raise ValueError("Paid evidence not established")
    for s in d["hardware"]["scenarios"]:
        if exposure(**s["inputs"])!=s["expected"]: raise ValueError("Exposure mismatch")
    if bounds(**d["saas"]["assumption"])!=d["saas"]["expected"]: raise ValueError("SaaS mismatch")
    return len(d["hardware"]["scenarios"])

if __name__=="__main__":
    d=json.loads(SOURCE.read_text(encoding="utf-8"))
    print("FACILITY_DUAL_TRACK_VERIFIED",verify(d))
    demo=json.loads((ROOT/"research/facility-expense-synthetic-v1.json").read_text(encoding="utf-8"))
    result=exceptions(demo["rows"])
    if result!=demo["expected"]: raise SystemExit("Synthetic output mismatch")
    print(json.dumps(result,ensure_ascii=False,indent=2))
