#!/usr/bin/env python3
import json, os, urllib.parse, urllib.request
from pathlib import Path

SERVICES = [
    "VwsmTrdarWrcPopltnQq",
    "VwsmTrdarFlpopQq",
    "VwsmTrdarFcltyQq",
    "VwsmTrdarStorQq",
    "VwsmTrdarSelngQq",
]

def call(key, service, start=1, end=20):
    url = "http://openapi.seoul.go.kr:8088/{}/json/{}/{}/{}/".format(
        urllib.parse.quote(key, safe=""), service, start, end
    )
    req=urllib.request.Request(url,headers={"User-Agent":"SideEconomyLab/1.0"})
    with urllib.request.urlopen(req,timeout=45) as r:
        return json.loads(r.read().decode("utf-8"))

def main():
    key=os.environ.get("SEOUL","").strip()
    if not key:
        raise SystemExit("SEOUL secret missing")
    out={}
    for svc in SERVICES:
        try:
            p=call(key,svc)
            root=p.get(svc)
            if not root:
                result=p.get("RESULT",{})
                out[svc]={"ok":False,"code":result.get("CODE"),"message":result.get("MESSAGE")}
                print(f"{svc}: FAIL {out[svc]}")
                continue
            rows=root.get("row") or []
            periods=sorted({str(x.get("STDR_YYQU_CD")) for x in rows if x.get("STDR_YYQU_CD")}, reverse=True)
            out[svc]={
                "ok":True,
                "total":root.get("list_total_count"),
                "result":root.get("RESULT"),
                "fields":sorted(rows[0].keys()) if rows else [],
                "periods_in_probe":periods,
                "sample":rows[:2],
            }
            print(f"{svc}: OK total={out[svc]['total']} periods={periods[:5]} fields={','.join(out[svc]['fields'])}")
        except Exception as e:
            out[svc]={"ok":False,"error":type(e).__name__}
            print(f"{svc}: ERROR {type(e).__name__}")
    Path("artifacts").mkdir(exist_ok=True)
    Path("artifacts/seoul-location-schema-probe.json").write_text(
        json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8"
    )
    if not all(v.get("ok") for v in out.values()):
        raise SystemExit(1)

if __name__=="__main__":
    main()
