#!/usr/bin/env python3
import csv, json, math, os, urllib.parse, urllib.request
from collections import defaultdict
from pathlib import Path

KEY=os.environ.get("SEOUL","").strip()
if not KEY:
    raise SystemExit("SEOUL secret missing")

SERVICES={
 "worker":"VwsmTrdarWrcPopltnQq",
 "flow":"VwsmTrdarFlpopQq",
 "facility":"VwsmTrdarFcltyQq",
}
MASTER="TbgisTrdarRelm"

def call(service,start,end,period=None):
    parts=["http://openapi.seoul.go.kr:8088",urllib.parse.quote(KEY,safe=""),"json",service,str(start),str(end)]
    if period: parts.append(str(period))
    url="/".join(parts)+"/"
    req=urllib.request.Request(url,headers={"User-Agent":"SideEconomyLab/1.0"})
    with urllib.request.urlopen(req,timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))

def root(payload,service):
    x=payload.get(service)
    if not x: return None
    if (x.get("RESULT") or {}).get("CODE")!="INFO-000": return None
    return x

def quarter_candidates():
    out=[]
    for y in range(2026,2020,-1):
        for q in (4,3,2,1):
            out.append(f"{y}{q}")
    return out

def latest_period(service):
    for p in quarter_candidates():
        try:
            r=root(call(service,1,1,p),service)
            if r and r.get("row"): return p
        except Exception:
            pass
    raise RuntimeError(f"no period found for {service}")

def fetch_all(service,period=None):
    first=root(call(service,1,1000,period),service)
    if not first: raise RuntimeError(f"{service} failed")
    rows=list(first.get("row") or [])
    total=int(first.get("list_total_count") or 0)
    for start in range(1001,total+1,1000):
        end=min(start+999,total)
        r=root(call(service,start,end,period),service)
        if not r: raise RuntimeError(f"{service} failed at {start}")
        rows.extend(r.get("row") or [])
    return rows,total

def num(x):
    try: return float(x or 0)
    except (TypeError,ValueError): return 0.0

def rank01(values):
    ordered=sorted((v,i) for i,v in enumerate(values))
    n=len(values)
    out=[0.0]*n
    if n<=1: return out
    pos=0
    while pos<n:
        end=pos
        while end+1<n and ordered[end+1][0]==ordered[pos][0]: end+=1
        pct=((pos+end)/2)/(n-1)
        for k in range(pos,end+1): out[ordered[k][1]]=pct
        pos=end+1
    return out

def aggregate(rows,fields):
    d=defaultdict(lambda:defaultdict(float))
    names={}
    for r in rows:
        c=str(r.get("TRDAR_CD",""))
        if not c: continue
        names[c]=r.get("TRDAR_CD_NM") or names.get(c)
        for f in fields: d[c][f]+=num(r.get(f))
    return d,names

def main():
    out=Path("artifacts/seoul-location-screen")
    out.mkdir(parents=True,exist_ok=True)

    # Fetch complete histories because server-side optional quarter filtering is
    # not reliable across these services. Select the latest quarter client-side.
    master,_=fetch_all(MASTER)
    master_by={str(r.get("TRDAR_CD")):r for r in master if r.get("TRDAR_CD")}

    worker_all,_=fetch_all(SERVICES["worker"])
    flow_all,_=fetch_all(SERVICES["flow"])
    facility_all,_=fetch_all(SERVICES["facility"])

    periods={
      "worker":max(str(r.get("STDR_YYQU_CD")) for r in worker_all if r.get("STDR_YYQU_CD")),
      "flow":max(str(r.get("STDR_YYQU_CD")) for r in flow_all if r.get("STDR_YYQU_CD")),
      "facility":max(str(r.get("STDR_YYQU_CD")) for r in facility_all if r.get("STDR_YYQU_CD")),
    }
    print("LATEST_PERIODS "+json.dumps(periods,ensure_ascii=False,sort_keys=True))

    worker=[r for r in worker_all if str(r.get("STDR_YYQU_CD"))==periods["worker"]]
    flow=[r for r in flow_all if str(r.get("STDR_YYQU_CD"))==periods["flow"]]
    facility=[r for r in facility_all if str(r.get("STDR_YYQU_CD"))==periods["facility"]]
    print("LATEST_ROW_COUNTS "+json.dumps({"worker":len(worker),"flow":len(flow),"facility":len(facility)},sort_keys=True))

    w,_=aggregate(worker,["TOT_WRC_POPLTN_CO"])
    f,_=aggregate(flow,[
      "TOT_FLPOP_CO","AGRDE_20_FLPOP_CO","AGRDE_30_FLPOP_CO","AGRDE_40_FLPOP_CO",
      "TMZON_11_14_FLPOP_CO","TMZON_14_17_FLPOP_CO","TMZON_17_21_FLPOP_CO",
      "MON_FLPOP_CO","TUES_FLPOP_CO","WED_FLPOP_CO","THUR_FLPOP_CO","FRI_FLPOP_CO"
    ])
    a,_=aggregate(facility,[
      "VIATR_FCLTY_CO","STAYNG_FCLTY_CO","SUBWAY_STATN_CO","RLROAD_STATN_CO",
      "BUS_TRMINL_CO","BUS_STTN_CO","BANK_CO","PBLOFC_CO","UNIV_CO","THEAT_CO","DRTS_CO"
    ])

    codes=sorted(set(master_by)&(set(w)|set(f)|set(a)))
    rows=[]
    for c in codes:
        m=master_by[c]
        x={
          "trdar_cd":c,"trdar_name":m.get("TRDAR_CD_NM",""),
          "district":m.get("SIGNGU_CD_NM",""),"dong":m.get("ADSTRD_CD_NM",""),
          "x_epsg5181":m.get("XCNTS_VALUE"),"y_epsg5181":m.get("YDNTS_VALUE"),
          "worker":w[c]["TOT_WRC_POPLTN_CO"],
          "flow":f[c]["TOT_FLPOP_CO"],
          "young_flow":f[c]["AGRDE_20_FLPOP_CO"]+f[c]["AGRDE_30_FLPOP_CO"]+f[c]["AGRDE_40_FLPOP_CO"],
          "day_flow":f[c]["TMZON_11_14_FLPOP_CO"]+f[c]["TMZON_14_17_FLPOP_CO"],
          "afterwork_flow":f[c]["TMZON_17_21_FLPOP_CO"],
          "weekday_flow":sum(f[c][k] for k in ["MON_FLPOP_CO","TUES_FLPOP_CO","WED_FLPOP_CO","THUR_FLPOP_CO","FRI_FLPOP_CO"]),
          "attractors":a[c]["VIATR_FCLTY_CO"],"lodging":a[c]["STAYNG_FCLTY_CO"],
          "subway":a[c]["SUBWAY_STATN_CO"],"rail":a[c]["RLROAD_STATN_CO"],
          "bus_terminal":a[c]["BUS_TRMINL_CO"],"bus_stop":a[c]["BUS_STTN_CO"],
          "bank":a[c]["BANK_CO"],"public_office":a[c]["PBLOFC_CO"],
          "university":a[c]["UNIV_CO"],"theater":a[c]["THEAT_CO"],"department_store":a[c]["DRTS_CO"],
        }
        rows.append(x)

    rank_fields=["worker","flow","young_flow","day_flow","afterwork_flow","weekday_flow","attractors","lodging","subway","rail","bus_terminal","bus_stop","bank","public_office","university","theater","department_store"]
    for field in rank_fields:
        rr=rank01([num(x[field]) for x in rows])
        for i,v in enumerate(rr): rows[i]["r_"+field]=v

    for x in rows:
        # Demand-fit only. No direct incumbent-supply penalty yet.
        x["score_photo"]=100*(.35*x["r_flow"]+.25*x["r_young_flow"]+.15*x["r_subway"]+.15*x["r_attractors"]+.10*x["r_afterwork_flow"])
        x["score_vending"]=100*(.30*x["r_worker"]+.25*x["r_flow"]+.20*x["r_day_flow"]+.15*x["r_attractors"]+.10*x["r_subway"])
        x["score_luggage"]=100*(.30*x["r_lodging"]+.20*x["r_subway"]+.15*x["r_rail"]+.25*x["r_flow"]+.10*x["r_attractors"])
        x["score_booth"]=100*(.40*x["r_worker"]+.20*x["r_weekday_flow"]+.15*x["r_day_flow"]+.10*x["r_subway"]+.05*x["r_bank"]+.05*x["r_public_office"]+.05*x["r_attractors"])

    base_fields=["trdar_cd","trdar_name","district","dong","worker","flow","young_flow","day_flow","afterwork_flow","attractors","lodging","subway","rail","bus_terminal"]
    specs=[
      ("OC-013","photo","score_photo"),
      ("OC-020","vending","score_vending"),
      ("OC-008","luggage","score_luggage"),
      ("OC-001","booth","score_booth"),
    ]
    summary=[]
    for cid,label,sf in specs:
        top=sorted(rows,key=lambda x:x[sf],reverse=True)[:30]
        path=out/f"{cid}-{label}-top30.csv"
        with path.open("w",newline="",encoding="utf-8-sig") as fh:
            wr=csv.DictWriter(fh,fieldnames=["rank","demand_fit_score"]+base_fields)
            wr.writeheader()
            for i,x in enumerate(top,1):
                rec={"rank":i,"demand_fit_score":round(x[sf],2)}
                rec.update({k:x[k] for k in base_fields})
                wr.writerow(rec)
                if i<=10:
                    summary.append({"candidate_id":cid,"candidate":label,"rank":i,"score":round(x[sf],2),"trdar_cd":x["trdar_cd"],"trdar_name":x["trdar_name"],"district":x["district"],"dong":x["dong"]})
        print("TOP10",cid," | ".join(f"{z['district']} {z['trdar_name']}={z['score']}" for z in summary if z["candidate_id"]==cid))

    (out/"summary.json").write_text(json.dumps({
      "periods":periods,
      "area_count":len(rows),
      "top10":summary,
      "method":"stage-1 percentile-weighted demand-fit screen using worker, flow and attractor datasets only; no direct incumbent-supply penalty",
      "warning":"research prioritization only; not revenue/ROI prediction"
    },ensure_ascii=False,indent=2),encoding="utf-8")

    # Optional static-site export for the GIS dashboard. This contains only
    # public Seoul commercial-area aggregates and derived research scores.
    gis_output=(os.environ.get("GIS_OUTPUT") or "").strip()
    if gis_output:
        gis_path=Path(gis_output)
        gis_path.parent.mkdir(parents=True,exist_ok=True)
        gis_rows=[]
        for x in rows:
            gis_rows.append({
              "trdar_cd":x["trdar_cd"],
              "trdar_name":x["trdar_name"],
              "district":x["district"],
              "dong":x["dong"],
              "x_epsg5181":num(x["x_epsg5181"]),
              "y_epsg5181":num(x["y_epsg5181"]),
              "worker":round(num(x["worker"])),
              "flow":round(num(x["flow"])),
              "young_flow":round(num(x["young_flow"])),
              "day_flow":round(num(x["day_flow"])),
              "afterwork_flow":round(num(x["afterwork_flow"])),
              "weekday_flow":round(num(x["weekday_flow"])),
              "attractors":round(num(x["attractors"])),
              "lodging":round(num(x["lodging"])),
              "subway":round(num(x["subway"])),
              "rail":round(num(x["rail"])),
              "bus_terminal":round(num(x["bus_terminal"])),
              "bus_stop":round(num(x["bus_stop"])),
              "bank":round(num(x["bank"])),
              "public_office":round(num(x["public_office"])),
              "university":round(num(x["university"])),
              "theater":round(num(x["theater"])),
              "department_store":round(num(x["department_store"])),
              "scores":{
                "photo":round(x["score_photo"],2),
                "vending":round(x["score_vending"],2),
                "luggage":round(x["score_luggage"],2),
                "booth":round(x["score_booth"],2),
              }
            })
        gis_path.write_text(json.dumps({
          "periods":periods,
          "area_count":len(gis_rows),
          "coordinate_system":"EPSG:5181",
          "method":"stage-1 percentile-weighted demand-fit screen; no direct incumbent-supply or rent penalty",
          "warning":"research prioritization only; not revenue/ROI prediction",
          "areas":gis_rows,
        },ensure_ascii=False,separators=(",",":")),encoding="utf-8")
        print(f"GIS_EXPORT {gis_path} rows={len(gis_rows)}")

if __name__=="__main__":
    main()
