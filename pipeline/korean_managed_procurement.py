"""Research-only Korean managed procurement hurdles; no orders or payment actions."""
from fractions import Fraction
from math import ceil
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"docs/data/korean-managed-procurement-v1.json"

def evaluate(*,accounts,spend,fixed_cash,fixed_hours,minutes_per_account,hour_value,capital,recovery_months,target,hour_cap,days,margin_bps,fee,fee_cost,cash_gap_days,goods_cash_cost_bps):
    vals=locals().copy()
    if any(type(v) is not int or v<0 for v in vals.values()) or min(accounts,recovery_months,days)<=0 or max(margin_bps,goods_cash_cost_bps)>10000:
        raise ValueError("Invalid assumptions")
    hours=Fraction(fixed_hours)+Fraction(accounts*minutes_per_account,60)
    fixed=Fraction(fixed_cash)+Fraction(capital,recovery_months)+hours*hour_value
    economic=Fraction(accounts*spend*margin_bps,10000)+accounts*(fee-fee_cost)-fixed
    need=target+fixed-accounts*(fee-fee_cost)
    required=0 if need<=0 else (None if margin_bps==0 else ceil(need*10000/(accounts*margin_bps)))
    funding=ceil(Fraction(accounts*spend*goods_cash_cost_bps*cash_gap_days,10000*days))
    return dict(economic_profit_krw=economic.numerator//economic.denominator,
                spend_per_account_for_target=required,owner_hours=float(hours),
                time_feasible=hours<=hour_cap,cash_gap_proxy_krw=funding,status="ASSUMPTION_ONLY")

def verify(d):
    if d["commercial_approval"] or d["forecast_eligible"] or d["paid_own_transactions"] or any(s["own_paid_verified"] for s in d["sources"]):
        raise ValueError("Unverified promotion")
    ids={s["id"] for s in d["sources"]}
    if len(ids)!=len(d["sources"]): raise ValueError("Duplicate source")
    for s in d["segments"]:
        if not set(s["evidence"])<=ids or any(s[k] is not None for k in ("actual_monthly_spend","actual_contribution","actual_support_minutes")):
            raise ValueError("Unsupported evidence")
    return {m["id"]:evaluate(**m["inputs"]) for m in d["models"]}

if __name__=="__main__":
    print(json.dumps(verify(json.loads(SOURCE.read_text(encoding="utf-8"))),ensure_ascii=False,indent=2))
