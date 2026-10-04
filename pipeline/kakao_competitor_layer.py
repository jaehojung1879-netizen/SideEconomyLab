#!/usr/bin/env python3
"""Build a sanitized Kakao Local competition/substitute POI layer for GIS.

The Kakao REST key is read only from the Action environment and is never
written to output. The output contains public place-search results only.

Scope is deliberately limited to the top demand-fit commercial areas for
the four LOCATION-lane candidates to control API usage and avoid implying
that every Seoul area has supply-side coverage.
"""

import json
import math
import os
import time
import urllib.parse
import urllib.request
from pathlib import Path

try:
    from pyproj import Transformer
except ImportError as exc:
    raise SystemExit("pyproj is required: pip install pyproj") from exc

REST_KEY=(os.environ.get("KAKAO_REST_API_KEY") or "").strip()
if not REST_KEY:
    raise SystemExit("KAKAO_REST_API_KEY secret missing")

IN_PATH=Path("docs/data/seoul-opportunity-map.json")
OUT_PATH=Path("docs/data/kakao-poi-layer.json")
TOP_N=int(os.environ.get("KAKAO_POI_TOP_N","15"))
RADIUS=int(os.environ.get("KAKAO_POI_RADIUS_M","800"))

CANDIDATES={
    "booth":{
        "candidate_id":"OC-001",
        "label":"Public / office private booth",
        "queries":[
            {"kind":"keyword","value":"공유오피스"},
            {"kind":"keyword","value":"스터디카페"},
            {"kind":"keyword","value":"회의실대여"},
        ],
    },
    "photo":{
        "candidate_id":"OC-013",
        "label":"Photo / document kiosk",
        "queries":[
            {"kind":"keyword","value":"포토부스"},
            {"kind":"keyword","value":"사진관"},
            {"kind":"keyword","value":"인쇄소"},
        ],
    },
    "vending":{
        "candidate_id":"OC-020",
        "label":"Specialty vending route",
        "queries":[
            {"kind":"category","value":"CS2","label":"편의점"},
            {"kind":"keyword","value":"무인매장"},
            {"kind":"keyword","value":"자판기"},
        ],
    },
    "luggage":{
        "candidate_id":"OC-008",
        "label":"Host-based luggage storage",
        "queries":[
            {"kind":"keyword","value":"짐보관"},
            {"kind":"keyword","value":"물품보관함"},
            {"kind":"keyword","value":"셀프보관"},
        ],
    },
}

TRANSFORMER=Transformer.from_crs("EPSG:5181","EPSG:4326",always_xy=True)

def request_json(url):
    req=urllib.request.Request(
        url,
        headers={
            "Authorization":f"KakaoAK {REST_KEY}",
            "User-Agent":"SideEconomyLab/1.0",
        },
    )
    with urllib.request.urlopen(req,timeout=30) as res:
        return json.loads(res.read().decode("utf-8"))

def query_poi(q, lon, lat):
    params={
        "x":f"{lon:.7f}",
        "y":f"{lat:.7f}",
        "radius":str(RADIUS),
        "sort":"distance",
        "page":"1",
        "size":"15",
    }
    if q["kind"]=="category":
        params["category_group_code"]=q["value"]
        endpoint="https://dapi.kakao.com/v2/local/search/category.json"
    else:
        params["query"]=q["value"]
        endpoint="https://dapi.kakao.com/v2/local/search/keyword.json"
    url=endpoint+"?"+urllib.parse.urlencode(params)
    return request_json(url)

def clean_doc(d, source_label):
    return {
        "id":str(d.get("id") or ""),
        "name":d.get("place_name") or "",
        "category":d.get("category_name") or "",
        "category_group_code":d.get("category_group_code") or "",
        "address":d.get("road_address_name") or d.get("address_name") or "",
        "lat":float(d["y"]) if d.get("y") else None,
        "lng":float(d["x"]) if d.get("x") else None,
        "distance_m":int(d["distance"]) if str(d.get("distance") or "").isdigit() else None,
        "place_url":d.get("place_url") or "",
        "matched_by":source_label,
    }

def main():
    payload=json.loads(IN_PATH.read_text(encoding="utf-8"))
    areas=payload.get("areas") or []
    result={
        "generated_from":"Kakao Local REST API",
        "radius_m":RADIUS,
        "top_n_areas_per_candidate":TOP_N,
        "note":"Exploratory competitor/substitute proxy for research prioritization; keyword/category coverage is imperfect.",
        "candidates":{},
    }

    for key,spec in CANDIDATES.items():
        ranked=sorted(
            areas,
            key=lambda a:float((a.get("scores") or {}).get(key) or 0),
            reverse=True,
        )[:TOP_N]
        area_rows=[]
        for rank,a in enumerate(ranked,1):
            x=float(a.get("x_epsg5181") or 0)
            y=float(a.get("y_epsg5181") or 0)
            if not x or not y:
                continue
            lon,lat=TRANSFORMER.transform(x,y)
            seen={}
            query_stats=[]
            for q in spec["queries"]:
                label=q.get("label") or q["value"]
                try:
                    data=query_poi(q,lon,lat)
                    meta=data.get("meta") or {}
                    docs=data.get("documents") or []
                    query_stats.append({
                        "query":label,
                        "kind":q["kind"],
                        "total_count":int(meta.get("total_count") or 0),
                        "pageable_count":int(meta.get("pageable_count") or 0),
                    })
                    for d in docs:
                        item=clean_doc(d,label)
                        dedup=item["id"] or f'{item["name"]}|{item["lat"]}|{item["lng"]}'
                        if dedup not in seen:
                            seen[dedup]=item
                        else:
                            prev=seen[dedup]
                            labels=set((prev.get("matched_by") or "").split(" / "))
                            labels.add(label)
                            prev["matched_by"]=" / ".join(sorted(x for x in labels if x))
                except Exception as exc:
                    query_stats.append({
                        "query":label,
                        "kind":q["kind"],
                        "error":type(exc).__name__,
                    })
                time.sleep(0.08)
            pois=list(seen.values())
            pois.sort(key=lambda z:(z["distance_m"] is None,z["distance_m"] or 999999,z["name"]))
            area_rows.append({
                "rank":rank,
                "trdar_cd":a.get("trdar_cd"),
                "trdar_name":a.get("trdar_name"),
                "district":a.get("district"),
                "dong":a.get("dong"),
                "lat":round(lat,7),
                "lng":round(lon,7),
                "demand_fit_score":round(float((a.get("scores") or {}).get(key) or 0),2),
                "unique_poi_count":len(pois),
                "query_stats":query_stats,
                "pois":pois,
            })
        result["candidates"][key]={
            "candidate_id":spec["candidate_id"],
            "label":spec["label"],
            "queries":spec["queries"],
            "areas":area_rows,
        }

    OUT_PATH.parent.mkdir(parents=True,exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(result,ensure_ascii=False,separators=(",",":")),
        encoding="utf-8",
    )
    print(f"KAKAO_POI_EXPORT {OUT_PATH} candidates={len(result['candidates'])} top_n={TOP_N} radius={RADIUS}")

if __name__=="__main__":
    main()
