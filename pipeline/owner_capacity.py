"""Necessary arithmetic bounds, not revenue forecasts. All inputs explicit."""
from fractions import Fraction
from math import ceil, floor

def bounds(*, price, var_cost, fixed_cash, fixed_hours, unit_hours, hour_value,
           hour_cap, target, capital, recovery_months):
    values = [price, var_cost, fixed_cash, fixed_hours, unit_hours, hour_value,
              hour_cap, target, capital, recovery_months]
    if any(isinstance(x, bool) for x in values):
        raise ValueError("numeric inputs required")
    try:
        p,v,f,fh,uh,w,h,t,k,m = map(lambda x: Fraction(str(x)), values)
    except (ValueError, ZeroDivisionError, TypeError) as e:
        raise ValueError("finite explicit inputs required") from e
    if min(p,v,f,fh,uh,w,h,t,k,m) < 0 or m <= 0 or uh <= 0:
        raise ValueError("nonnegative inputs; positive unit hours and recovery months")
    cap = max(0, floor((h-fh)/uh))
    required_cash = t+f+k/m
    required_economic = required_cash+fh*w
    cash_margin = p-v
    econ_margin = cash_margin-uh*w
    def need(required, margin):
        return ceil(required/margin) if margin > 0 else None
    cash = need(required_cash, cash_margin)
    economic = need(required_economic, econ_margin)
    return dict(cash_units=cash,economic_units=economic,max_units=cap,
                cash_time_feasible=fh<=h and cash is not None and cash<=cap,
                economic_time_feasible=fh<=h and economic is not None and economic<=cap,
                status="ASSUMPTION_ONLY")
