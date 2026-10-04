#!/usr/bin/env python3
"""Build a sanitized Kakao Local competition/substitute POI layer for GIS.

The Kakao REST key is read only from the Action environment and is never
written to output. The output contains public place-search results only.

Coverage is deliberately limited to top demand-fit commercial areas for the
four LOCATION-lane candidates. This is a research proxy, not a complete census.
"""

import concurrent.futures
import json
import math
import os
import time
import urllib.error
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
WORKERS=max(1,min(int(os.environ.get("KAKAO_POI_WORKERS","4")),8))

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
    last=None
    for attempt in range(3):
        try:
            req=urllib.request.Request(
                url,
                headers={
                    "Authorization":f"KakaoAK {REST_KEY}",
                    "User-Agent":"SideEconomyLab/1.0",
                },
            )
            with urllib.request.urlopen(req,timeout=15) as res:
                return json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            last=exc
            if exc.code not in (429,500,502,503,504):
                raise
        except Exception as exc:
            last=exc
        if attempt < 2:
            time.sleep(0.5*(2**attempt))
    raise last

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
    return request_json(endpoint+"?"+urllib.parse.urlencode(params))

def clean_doc(d, source_label):
    lat, lng = float(d["y"]), float(d["x"])
    if not (math.isfinite(lat) and math.isfinite(lng) and 33 <= lat <= 39 and 124 <= lng <= 132):
        raise ValueError("Invalid POI coordinates")
    place_url = str(d.get("place_url") or "")
    parsed = urllib.parse.urlparse(place_url)
    if parsed.scheme not in ("http", "https") or parsed.netloc != "place.map.kakao.com":
        place_url = ""
    return {
        "id":str(d.get("id") or ""),
        "name":d.get("place_name") or "",
        "category":d.get("category_name") or "",
        "category_group_code":d.get("category_group_code") or "",
        "address":d.get("road_address_name") or d.get("address_name") or "",
        "lat":lat,
        "lng":lng,
        "distance_m":int(d["distance"]) if str(d.get("distance") or "").isdigit() else None,
        "place_url":place_url,
        "matched_by":source_label,
    }

def fetch_one(task):
    key, rank, area, q, lon, lat = task
    label=q.get("label") or q["value"]
    try:
        data=query_poi(q,lon,lat)
        if not isinstance(data, dict) or not isinstance(data.get("meta"), dict) or not isinstance(data.get("documents"), list):
            raise ValueError("Malformed Kakao response")
        meta=data["meta"]
        return {
            "key":key,
            "rank":rank,
            "query":label,
            "kind":q["kind"],
            "total_count":int(meta.get("total_count") or 0),
            "pageable_count":int(meta.get("pageable_count") or 0),
            "docs":[clean_doc(d,label) for d in (data.get("documents") or [])],
            "error":None,
        }
    except Exception as exc:
        return {
            "key":key,
            "rank":rank,
            "query":label,
            "kind":q["kind"],
            "total_count":0,
            "pageable_count":0,
            "docs":[],
            "error":f"HTTP_{exc.code}" if isinstance(exc, urllib.error.HTTPError) else type(exc).__name__,
        }

def main():
    payload=json.loads(IN_PATH.read_text(encoding="utf-8"))
    areas=payload.get("areas") or []

    ranked_by_candidate={}
    tasks=[]
    coords={}
    for key,spec in CANDIDATES.items():
        ranked=sorted(
            areas,
            key=lambda a:float((a.get("scores") or {}).get(key) or 0),
            reverse=True,
        )[:TOP_N]
        ranked_by_candidate[key]=ranked
        for rank,a in enumerate(ranked,1):
            x=float(a.get("x_epsg5181") or 0)
            y=float(a.get("y_epsg5181") or 0)
            if not x or not y:
                continue
            lon,lat=TRANSFORMER.transform(x,y)
            coords[(key,rank)]=(lon,lat)
            for q in spec["queries"]:
                tasks.append((key,rank,a,q,lon,lat))

    grouped={}
    error_count=0
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
        for res in pool.map(fetch_one,tasks):
            grouped.setdefault((res["key"],res["rank"]),[]).append(res)
            if res["error"]:
                error_count+=1

    result={
        "generated_from":"Kakao Local REST API",
        "radius_m":RADIUS,
        "top_n_areas_per_candidate":TOP_N,
        "worker_count":WORKERS,
        "query_count":len(tasks),
        "query_error_count":error_count,
        "note":"Exploratory competitor/substitute proxy for research prioritization; keyword/category coverage is imperfect.",
        "candidates":{},
    }

    for key,spec in CANDIDATES.items():
        area_rows=[]
        for rank,a in enumerate(ranked_by_candidate[key],1):
            coord=coords.get((key,rank))
            if not coord:
                continue
            lon,lat=coord
            seen={}
            query_stats=[]
            for res in sorted(grouped.get((key,rank),[]),key=lambda z:z["query"]):
                stat={
                    "query":res["query"],
                    "kind":res["kind"],
                    "total_count":res["total_count"],
                    "pageable_count":res["pageable_count"],
                }
                if res["error"]:
                    stat["error"]=res["error"]
                query_stats.append(stat)
                for item in res["docs"]:
                    dedup=item["id"] or f'{item["name"]}|{item["lat"]}|{item["lng"]}'
                    if dedup not in seen:
                        seen[dedup]=item
                    else:
                        prev=seen[dedup]
                        labels=set((prev.get("matched_by") or "").split(" / "))
                        labels.add(item["matched_by"])
                        prev["matched_by"]=" / ".join(sorted(x for x in labels if x))

            pois=list(seen.values())
            pois.sort(key=lambda z:(z["distance_m"] is None,z["distance_m"] if z["distance_m"] is not None else 999999,z["name"]))
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

    if not tasks or error_count == len(tasks):
        raise SystemExit("No successful Kakao POI queries; previous snapshot preserved")
    OUT_PATH.parent.mkdir(parents=True,exist_ok=True)
    temporary = OUT_PATH.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(result,ensure_ascii=False,separators=(",",":"),allow_nan=False),
        encoding="utf-8",
    )
    temporary.replace(OUT_PATH)
    print(
        f"KAKAO_POI_EXPORT {OUT_PATH} candidates={len(result['candidates'])} "
        f"top_n={TOP_N} radius={RADIUS} queries={len(tasks)} errors={error_count} workers={WORKERS}"
    )

if __name__=="__main__":
    main()
