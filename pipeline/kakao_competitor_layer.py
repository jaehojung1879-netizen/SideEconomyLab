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
from datetime import datetime, timezone
import sys
import threading
sys.path.insert(0, str(Path(__file__).resolve().parent))
from candidate_registry import load_registry, location_candidates, definition_hash

try:
    from pyproj import Transformer
except ImportError as exc:
    raise SystemExit("pyproj is required: pip install pyproj") from exc

REST_KEY=(os.environ.get("KAKAO_REST_API_KEY") or "").strip()
if not REST_KEY:
    raise SystemExit("KAKAO_REST_API_KEY secret missing")

IN_PATH=Path("docs/data/seoul-opportunity-map.json")
OUT_PATH=Path("docs/data/kakao-poi-layer.json")
REGISTRY=load_registry()
POLICY=REGISTRY['research_policy']
TOP_N=max(1,min(int(os.environ.get("KAKAO_POI_TOP_N",str(POLICY['top_demand_areas']))),100))
MODERATE_N=max(0,min(int(os.environ.get("KAKAO_POI_MODERATE_N",str(POLICY['moderate_sample_areas']))),40))
RADIUS=POLICY['radius_m']
WORKERS=max(1,min(int(os.environ.get("KAKAO_POI_WORKERS","4")),8))
REQUEST_BUDGET=min(int(os.environ.get('KAKAO_REQUEST_BUDGET',str(POLICY['max_http_attempts']))),POLICY['max_http_attempts'])
CANDIDATES={key:{'candidate_id':c['id'],'label':c['label'],'queries':c['competition']['queries']} for key,c in location_candidates(REGISTRY).items()}
REQUEST_COUNT=0
REQUEST_LOCK=threading.Lock()


def selected_areas(areas, key):
    ranked=sorted(areas,key=lambda a:(-float(a.get('scores',{}).get(key,0)),str(a['trdar_cd'])))
    selected=ranked[:TOP_N]
    used={a['trdar_cd'] for a in selected}
    groups={}
    for a in ranked:
        score=float(a.get('scores',{}).get(key,0))
        if a['trdar_cd'] not in used and POLICY['moderate_min']<=score<POLICY['moderate_max_exclusive']:
            groups.setdefault(a.get('district') or '',[]).append(a)
    for i in range(MODERATE_N):
        districts=sorted(d for d,v in groups.items() if v)
        if not districts:break
        # Round-robin districts; within each district highest remaining demand.
        district=districts[i % len(districts)]
        selected.append(groups[district].pop(0))
    return selected

TRANSFORMER=Transformer.from_crs("EPSG:5181","EPSG:4326",always_xy=True)

def request_json(url):
    global REQUEST_COUNT
    last=None
    for attempt in range(3):
        try:
            with REQUEST_LOCK:
                if REQUEST_COUNT >= REQUEST_BUDGET:
                    raise RuntimeError('Request budget exhausted')
                REQUEST_COUNT += 1
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
        for field in ('total_count','pageable_count'):
            if type(meta.get(field)) is not int or meta[field]<0:
                raise ValueError('Malformed count')
        if len(data['documents'])>15 or meta['total_count']<len(data['documents']):
            raise ValueError('Inconsistent response')
        return {
            "key":key,
            "rank":rank,
            "query":label,
            "kind":q["kind"],
            "total_count":int(meta.get("total_count") or 0),
            "pageable_count":int(meta.get("pageable_count") or 0),
            "docs":[clean_doc(d,label) for d in data['documents']],
            "returned_count":len(data['documents']),
            "truncated":meta['total_count']>len(data['documents']) or meta.get('is_end') is False,
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
    global REQUEST_COUNT
    REQUEST_COUNT=0
    payload=json.loads(IN_PATH.read_text(encoding="utf-8"))
    areas=payload.get("areas") or []

    ranked_by_candidate={}
    demand_ranks={}
    tasks=[]
    coords={}
    for key,spec in CANDIDATES.items():
        ordered=sorted(areas,key=lambda a:(-float(a.get('scores',{}).get(key,0)),str(a['trdar_cd'])))
        ranks={};position=1;previous=None
        for i,a in enumerate(ordered):
            score=a.get('scores',{}).get(key,0)
            if i and score!=previous:position=i+1
            ranks[str(a['trdar_cd'])]=position;previous=score
        demand_ranks[key]=ranks
        ranked=selected_areas(areas,key)
        ranked_by_candidate[key]=ranked
        for rank,a in enumerate(ranked,1):
            x=float(a.get("x_epsg5181") or 0)
            y=float(a.get("y_epsg5181") or 0)
            if not x or not y:
                raise SystemExit("Invalid source center; previous snapshot preserved")
            lon,lat=TRANSFORMER.transform(x,y)
            if not (math.isfinite(lat) and math.isfinite(lon) and 33<=lat<=39 and 124<=lon<=132):
                raise SystemExit("Invalid source center; previous snapshot preserved")
            coords[(key,rank)]=(lon,lat)
            for q in spec["queries"]:
                tasks.append((key,rank,a,q,lon,lat))

    if not tasks or len(tasks)*3>REQUEST_BUDGET:
        raise SystemExit('Collection exceeds retry-inclusive request budget; previous snapshot preserved')
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
        "schema_version":2,
        "collected_at":datetime.now(timezone.utc).date().isoformat(),
        "sampling":{"top_demand":TOP_N,"moderate_per_candidate":MODERATE_N,"moderate_min":POLICY['moderate_min'],"moderate_max_exclusive":POLICY['moderate_max_exclusive'],"district_round_robin":True},
        "http_attempt_count":REQUEST_COUNT,
        "http_attempt_budget":REQUEST_BUDGET,
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
                    "returned_count":res.get('returned_count',0),
                    "truncated":res.get('truncated',False),
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
                "rank":demand_ranks[key][str(a['trdar_cd'])],
                "collection_order":rank,
                "sampling_band":"demand_top" if rank<=TOP_N else "moderate_sample",
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
            "definition_hash":definition_hash(location_candidates(REGISTRY)[key],RADIUS),
            "areas":area_rows,
        }

    if error_count:
        raise SystemExit(f'Incomplete Kakao replacement ({error_count} query errors); previous snapshot preserved')
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
