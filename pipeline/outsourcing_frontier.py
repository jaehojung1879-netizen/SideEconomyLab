"""Read-only product master change detection. Synthetic-only; no inferred equivalence."""
import json
from pathlib import Path
from collections import defaultdict
from pipeline.owner_capacity import bounds
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"docs/data/outsourcing-frontier-v1.json"
FIXTURE=ROOT/"research/catalog-review-synthetic-v1.json"

def review(d):
    if d.get("synthetic") is not True: raise ValueError("Synthetic only")
    def group(rows):
        out=defaultdict(list)
        for row in rows:
            if not isinstance(row["id"],str) or not row["id"].strip(): raise ValueError("Missing explicit ID")
            out[row["id"]].append(row)
        return out
    old,new=group(d["old"]),group(d["new"])
    out=[]
    for ident in sorted(old.keys()|new.keys()):
        a,b=old[ident],new[ident]
        flags=[]
        if len(a)>1 or len(b)>1: flags=["DUPLICATE_ID_BLOCKED"]
        elif not b: flags=["MISSING_FROM_NEW_NOT_DISCONTINUED"]
        else:
            if any(type(b[0][k]) is not int or b[0][k]<=0 for k in ("width_mm","pack")) or b[0]["status"] not in ("ACTIVE","DISCONTINUED"):
                flags.append("MISSING_SPEC")
            if not a: flags.append("NEW_ID_REVIEW")
            else:
                for key,label in (("width_mm","WIDTH_CHANGED"),("pack","PACK_CHANGED"),("status","STATUS_CHANGED")):
                    if a[0][key]!=b[0][key]: flags.append(label)
        if flags: out.append(dict(id=ident,flags=flags))
    return out

def verify(d):
    if d["commercial_approval"] or d["forecast_eligible"] or d["paid_own_transactions"] or any(s["own_paid_verified"] for s in d["sources"]): raise ValueError("Unsupported promotion")
    ids={s["id"] for s in d["sources"]}
    if len(ids)!=len(d["sources"]): raise ValueError("Duplicate source")
    for c in d["candidates"]:
        if not set(c["refs"])<=ids or c["paid_own_verified"] or c["actual_repeat_demand"] is not None or c["actual_owner_hours"] is not None: raise ValueError("Unsupported candidate evidence")
    for s in d["scenarios"]:
        i=s["inputs"]
        if bounds(**i)!=s["expected"]: raise ValueError("Scenario mismatch")
        profit=s["expected"]["max_units"]*(i["price"]-i["var_cost"]-i["unit_hours"]*i["hour_value"])-i["fixed_cash"]-i["fixed_hours"]*i["hour_value"]
        if profit!=s["max_economic_profit"]: raise ValueError("Profit mismatch")
    f=json.loads(FIXTURE.read_text(encoding="utf-8"))
    if review(f)!=f["expected"]: raise ValueError("Fixture mismatch")
    return {"scenarios":len(d["scenarios"]),"flags":review(f)}
if __name__=="__main__":
    print(json.dumps(verify(json.loads(SOURCE.read_text(encoding="utf-8"))),ensure_ascii=False,indent=2))
