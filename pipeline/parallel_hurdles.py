"""Cross-model hurdle comparison; assumptions only, no commercial execution."""
from fractions import Fraction
from math import ceil
from pathlib import Path
import json
from pipeline.hardware24 import economics
from pipeline.owner_capacity import bounds
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"docs/data/parallel-hurdles-v1.json"

def consumer_hurdles(c):
    if type(c["households"]) is not int or c["households"]<=0 or type(c["capture_bps"]) is not int or not 0<c["capture_bps"]<=10000:
        raise ValueError("Positive catchment and valid capture required")
    base={k:c[k] for k in ("basket","goods_cost","fee_bps","host_bps","recovery_months","hour_value","days")}
    out=[]
    for s in c["scenarios"]:
        for target in (0,1000000):
            b=economics(**base,**{k:s[k] for k in ("capital","fixed","labor_hours")},target=target)
            n=b["orders_month"]
            events=None if n is None else float(Fraction(n*12*10000,c["households"]*c["capture_bps"]))
            out.append(dict(id=s["id"],target=target,orders_month=n,orders_day=b["orders_day"],events_per_household_year=events))
    return out

def b2b_hurdles(c):
    if any(type(v) is not int or v<0 for k,v in c.items() if k!="targets") or c["accounts"]<=0 or not 0<c["net_margin_bps"]<=10000 or c["recovery_months"]<=0:
        raise ValueError("Explicit valid inputs required")
    hours=c["fixed_hours"]+c["accounts"]*c["hours_per_account"]
    out=[]
    for target in c["targets"]:
        if type(target) is not int or target<0: raise ValueError("Invalid target")
        required=(target+c["fixed_cash"]+Fraction(c["capital"],c["recovery_months"])+hours*c["hour_value"])*10000/c["net_margin_bps"]
        out.append(dict(target=target,monthly_sales=ceil(required),sales_per_account=ceil(required/c["accounts"]),hours=hours,time_feasible=hours<=c["hour_cap"]))
    return out

def verify(d):
    if d["commercial_approval"] or d["forecast_eligible"] or d["paid_own_transactions"] or any(s["own_paid_verified"] for s in d["sources"]): raise ValueError("Unsupported promotion")
    return dict(consumer=consumer_hurdles(d["consumer"]),b2b=b2b_hurdles(d["b2b"]),saas=bounds(**d["saas"]))
if __name__=="__main__":
    print(json.dumps(verify(json.loads(SOURCE.read_text(encoding="utf-8"))),ensure_ascii=False,indent=2))
