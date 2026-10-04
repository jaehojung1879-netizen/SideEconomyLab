#!/usr/bin/env python3
"""Deterministic evidence dimensions, never a composite opportunity/ROI score."""
import hashlib
import json
import math
from pathlib import Path
import statistics
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from candidate_registry import load_registry, location_candidates, definition_hash, REGISTRY_PATH

ROOT = Path(__file__).resolve().parents[1]


def classify(poi, spec):
    text = (str(poi.get('name') or '') + ' ' + str(poi.get('category') or '')).casefold()
    for role in ('direct', 'substitute'):
        for term in spec['competition'][role + '_patterns']:
            if term.casefold() in text:
                return role + '_proxy', term
    return 'context', None


def measure(area, source, spec, policy):
    stats, pois = area.get('query_stats'), area.get('pois')
    expected = {(q.get('label') or q['value'], q['kind']) for q in spec['competition']['queries']}
    good = isinstance(stats, list) and isinstance(pois, list)
    stats = stats if isinstance(stats, list) else []
    pois = pois if isinstance(pois, list) else []
    errors = sum(bool(q.get('error')) for q in stats if isinstance(q, dict))
    actual = {(q.get('query'), q.get('kind')) for q in stats if isinstance(q, dict)}
    good = good and len(stats) == len(expected) and actual == expected and not errors
    expected_def = definition_hash(spec, policy['radius_m'])
    candidate = source.get('candidates', {}).get(spec['key'], {})
    declared = candidate.get('definition_hash')
    definitions = [(q.get('kind'), q.get('value'), q.get('label')) for q in candidate.get('queries', [])]
    wanted = [(q.get('kind'), q.get('value'), q.get('label')) for q in spec['competition']['queries']]
    good = good and source.get('radius_m') == policy['radius_m'] and definitions == wanted and declared in (None, expected_def)
    roles, relevant, seen, invalid = [], [], set(), 0
    for p in pois:
        if not isinstance(p, dict): invalid += 1; continue
        identity = p.get('id') or (p.get('name'), p.get('lat'), p.get('lng'))
        if identity in seen: invalid += 1; continue
        seen.add(identity)
        role, term = classify(p, spec)
        roles.append({'id':p.get('id'), 'role':role, 'matched_rule':term})
        if role != 'context':
            distance = p.get('distance_m')
            if type(distance) not in (int, float) or not math.isfinite(distance) or not 0 <= distance <= policy['radius_m']:
                invalid += 1
            else: relevant.append((p, role))
    good = good and not invalid and area.get('unique_poi_count') == len(pois)
    for q in stats:
        if not isinstance(q, dict) or type(q.get('total_count')) is not int or q['total_count'] < 0:
            good = False
    truncated = any(q.get('truncated') or (type(q.get('total_count')) is int and q.get('total_count',0) > q.get('returned_count',sum(q.get('query') in str(p.get('matched_by','')).split(' / ') for p in pois if isinstance(p,dict)))) for q in stats if isinstance(q,dict))
    count = len(relevant) if good else None
    distances = [p['distance_m'] for p, _ in relevant]
    return {'trdar_cd':str(area['trdar_cd']), 'status':'MEASURED' if good else 'PARTIAL',
            'query_errors':errors, 'invalid_observations':invalid, 'query_count':len(stats),
            'raw_poi_count':len(pois), 'relevant_count':count,
            'direct_proxy_count':sum(r == 'direct_proxy' for _, r in relevant) if good else None,
            'substitute_proxy_count':sum(r == 'substitute_proxy' for _, r in relevant) if good else None,
            'context_count':sum(r['role'] == 'context' for r in roles),
            'nearest_m':min(distances) if good and distances else None,
            'within_m':{str(m):sum(d <= m for d in distances) if good else None for m in (200,400,800)},
            'truncated':bool(truncated), 'classified_pois':roles,
            'quadrant':'E', 'quadrant_reason':'incomplete collection' if not good else 'reference pending'}


def derive(demand, source, registry):
    policy = registry['research_policy']
    demand_by = {str(a['trdar_cd']):a for a in demand['areas']}
    result = {'schema_version':1, 'method_version':policy['version'], 'collected_at':source.get('collected_at'),
              'radius_m':source.get('radius_m'), 'query_error_count':source.get('query_error_count'),
              'high_demand_min':policy['high_demand_min'], 'candidates':{}}
    for key, spec in location_candidates(registry).items():
        records = source.get('candidates', {}).get(key, {}).get('areas', [])
        records = sorted(records,key=lambda a:str(a['trdar_cd']))
        rows = [measure(a,source,spec,policy) for a in records if str(a['trdar_cd']) in demand_by]
        counts = [a['relevant_count'] for a in rows if a['status']=='MEASURED']
        median = statistics.median(counts) if len(counts)>=policy['reference_min_areas'] and len(set(counts))>1 else None
        for row in rows:
            if row['status']!='MEASURED':continue
            score = demand_by[row['trdar_cd']]['scores'].get(key)
            if median is None or score is None:
                row['quadrant_reason']='insufficient or invariant reference';continue
            high = score >= policy['high_demand_min']
            lower = row['relevant_count'] <= median
            if lower and row['truncated']:
                row['quadrant_reason']='capped results cannot establish lower observed supply';continue
            row['quadrant'] = ('A' if lower else 'B') if high else ('C' if lower else 'D')
            row['quadrant_reason']='demand threshold and measured-sample median'
        result['candidates'][key] = {'candidate_id':spec['id'], 'collected_count':len(rows),
            'measured_count':len(counts), 'partial_count':sum(a['status']=='PARTIAL' for a in rows),
            'unmeasured_count':len(demand_by)-len(rows), 'reference_median':median,
            'reference_count':len(counts), 'quadrant_count':sum(a['quadrant']!='E' for a in rows),
            'queries':spec['competition']['queries'], 'areas':rows}
    return result


def main():
    demand_path=ROOT/'docs/data/seoul-opportunity-map.json'
    source_path=ROOT/'docs/data/kakao-poi-layer.json'
    result=derive(json.loads(demand_path.read_text()),json.loads(source_path.read_text()),load_registry())
    result.update({name:hashlib.sha256(p.read_bytes()).hexdigest() for name,p in [('demand_hash',demand_path),('source_hash',source_path),('registry_hash',REGISTRY_PATH)]})
    out=ROOT/'docs/data/opportunity-intelligence.json'
    temp=out.with_suffix('.json.tmp');temp.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n');temp.replace(out)
    print('SUPPLY_EVIDENCE_EXPORT '+str(out)+' '+str({k:v['measured_count'] for k,v in result['candidates'].items()}))


if __name__=='__main__':main()
