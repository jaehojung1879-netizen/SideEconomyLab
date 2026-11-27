"""Research-only stock replenishment. No external actions, no demand prediction on missing exposure."""
from fractions import Fraction
from math import ceil
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"docs/data/hardware24-v1.json"

def replenish(*,paid_units,in_stock_nights,observed_nights,on_hand,on_order,slot_capacity,unit_cost,budget,lead_nights,review_nights=7,minimum_nights=14):
    values=(paid_units,in_stock_nights,observed_nights,on_hand,on_order,slot_capacity,unit_cost,budget,lead_nights,review_nights,minimum_nights)
    if any(type(x) is not int or x<0 for x in values) or unit_cost<=0 or review_nights<=0 or minimum_nights<=0 or in_stock_nights>observed_nights or on_hand+on_order>slot_capacity or (in_stock_nights==0 and paid_units>0):
        raise ValueError("Invalid explicit counts or capacity")
    if in_stock_nights<minimum_nights:
        return dict(status="INSUFFICIENT_EXPOSURE",order=None,target=None,auto_purchase=False)
    # Paid units restricted to fully in-stock observation nights; censored nights excluded.
    rate=Fraction(paid_units,in_stock_nights)
    target=min(slot_capacity,ceil(rate*(lead_nights+review_nights))+(1 if paid_units else 0))
    order=min(max(0,target-on_hand-on_order),budget//unit_cost)
    return dict(status="REVIEW_ONLY",order=order,target=target,auto_purchase=False)

def economics(*,basket,goods_cost,fee_bps,host_bps,fixed,capital,recovery_months,labor_hours,hour_value,target,days=30):
    vals=(basket,goods_cost,fee_bps,host_bps,fixed,capital,recovery_months,labor_hours,hour_value,target,days)
    if any(type(x) is not int or x<0 for x in vals) or min(basket,recovery_months,days)<=0 or fee_bps+host_bps>10000:
        raise ValueError("Invalid economics")
    unit=Fraction(basket)-goods_cost-Fraction(basket*(fee_bps+host_bps),10000)
    requirement=fixed+Fraction(capital,recovery_months)+labor_hours*hour_value+target
    return dict(unit_contribution=float(unit),orders_month=None if unit<=0 else ceil(requirement/unit),orders_day=None if unit<=0 else ceil(requirement/(unit*days)),status="ASSUMPTION_ONLY")
def verify(d):
    if d["commercial_approval"] or d["forecast_eligible"] or d["paid_own_transactions"]: raise ValueError("Unsupported promotion")
    if len({x["id"] for x in d["skus"]})!=20 or any(x["actual_demand"] is not None or x["actual_quote"] is not None for x in d["skus"]): raise ValueError("SKU scope changed")
    if any(x["confirmed_host"] for x in d["sites"]) or any(x["verified_fit"] for x in d["machines"]): raise ValueError("Unverified promotion")
    return len(d["skus"])
if __name__=="__main__":
    print("HARDWARE24_VERIFIED",verify(json.loads(SOURCE.read_text(encoding="utf-8"))))
