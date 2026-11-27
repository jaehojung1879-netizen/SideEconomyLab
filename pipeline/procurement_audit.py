"""Synthetic quote eligibility / exact-pack normalization baseline, not a live buying tool."""
import json
from datetime import date
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"docs/data/procurement-audit-v1.json"
FIXTURE=ROOT/"research/procurement-audit-synthetic-v1.json"

def nonnegative(x):
    return type(x) is int and x>=0

def audit(d):
    if d.get("synthetic") is not True:
        raise ValueError("Synthetic-only prototype")
    now=date.fromisoformat(d["as_of"])
    quotes=d["quotes"]
    if len({q["id"] for q in quotes})!=len(quotes) or len({i["id"] for i in d["invoices"]})!=len(d["invoices"]):
        raise ValueError("Duplicate record")
    result=[]
    for i in d["invoices"]:
        if not all(nonnegative(i[k]) for k in ("pack","qty","amount","shipping")) or not i["pack"] or not i["qty"]:
            result.append(dict(id=i["id"],status="BLOCKED_MISSING_COST")); continue
        units=i["pack"]*i["qty"]
        candidates=[]
        for q in quotes:
            if q["available"] is not True or q["verified"] is not True or date.fromisoformat(q["expires"])<now:
                continue
            if any(q[k]!=i[k] for k in ("sku","tax","region","terms")) or i["tax"] not in ("EX","IN"):
                continue
            if not all(nonnegative(q[k]) for k in ("pack","price","shipping","min_packs","max_packs")) or not q["pack"] or units%q["pack"]:
                continue
            packs=units//q["pack"]
            if not q["min_packs"]<=packs<=q["max_packs"]: continue
            candidates.append((packs*q["price"]+q["shipping"],q["id"]))
        if not candidates:
            result.append(dict(id=i["id"],status="BLOCKED_NO_MATCH")); continue
        cost,ident=min(candidates)
        result.append(dict(id=i["id"],status="SYNTHETIC_REVIEW",quote=ident,difference=max(0,i["amount"]+i["shipping"]-cost)))
    # Quotes are independently reviewed per invoice; no aggregate capacity or realized savings claimed.
    return result

def verify(d):
    if d["commercial_approval"] or d["forecast_eligible"] or d["paid_own_transactions"] or d["actual_customer_invoices"]: raise ValueError("Unverified promotion")
    if any(x["actionable"] or x["paid_verified"] or x["quote_verified"] for x in d["offers"]): raise ValueError("Public listings not executable quotes")
    for x in d["offers"]:
        if x["shipping"] is not None and x["displayed_total"]!=x["price"]+x["shipping"]: raise ValueError("Total mismatch")
    f=json.loads(FIXTURE.read_text(encoding="utf-8"))
    if audit(f)!=f["expected"]: raise ValueError("Fixture mismatch")
    return {"public_observations":len(d["offers"]),"executable_quotes":0,"synthetic_results":audit(f)}
if __name__=="__main__":
    print(json.dumps(verify(json.loads(SOURCE.read_text(encoding="utf-8"))),ensure_ascii=False,indent=2))
