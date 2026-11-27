"""Conservative, assumption-only used-asset economics and evidence gates."""
from fractions import Fraction
from math import floor
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/data/recommerce-research-v1.json"

def bounds(*, sale, purchase, fee_bps, transport, repair, storage, risk_reserve,
           owner_minutes, owner_hour_value, desired_economic_profit):
    values = [sale,purchase,fee_bps,transport,repair,storage,risk_reserve,
              owner_minutes,owner_hour_value,desired_economic_profit]
    if any(type(v) is not int or v < 0 for v in values) or fee_bps > 10000:
        raise ValueError("Nonnegative integer inputs and valid basis points required")
    fee = Fraction(sale*fee_bps,10000)
    labor = Fraction(owner_minutes*owner_hour_value,60)
    cash = sale-purchase-fee-transport-repair-storage-risk_reserve
    economic = cash-labor
    return dict(fee_krw=floor(fee),cash_contribution_krw=floor(cash),
                economic_contribution_krw=floor(economic),
                max_purchase_krw=floor(economic+purchase-desired_economic_profit))

def verify(d):
    if d["commercial_approval"] or d["forecast_eligible"] or d["matched_trade_count"] or d["paid_own_transactions"]:
        raise ValueError("Unsupported promotion")
    ids = {r["id"] for r in d["sources"]}
    if len(ids) != len(d["sources"]):
        raise ValueError("Duplicate evidence")
    for r in d["sources"]:
        if r["matched_trade"] or r["paid_verified"] or r["forecast_eligible"]:
            raise ValueError("Unsupported evidence promotion")
    for s in d["scenarios"]:
        if s["mode"] == "SERVICE_FEE" and s["inputs"]["purchase"] != 0:
            raise ValueError("Do not mix consignment service with inventory")
        if bounds(**s["inputs"]) != s["expected"]:
            raise ValueError("Scenario mismatch")
    return len(d["sources"])

if __name__ == "__main__":
    print("RECOMMERCE_RESEARCH_VERIFIED",verify(json.loads(SOURCE.read_text(encoding="utf-8"))))
