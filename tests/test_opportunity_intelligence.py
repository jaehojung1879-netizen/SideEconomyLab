"""Outcome-free supply evidence and unchanged demand contract tests."""
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
import sys
sys.path.insert(0,str(ROOT/'pipeline'))
from candidate_registry import load_registry, location_candidates
from opportunity_intelligence import classify, derive


class IntelligenceTests(unittest.TestCase):
    def setUp(self):
        self.registry=load_registry();self.spec=location_candidates(self.registry)['booth']

    def fixture(self):
        areas=[];records=[]
        for i in range(10):
            code=str(i);score=95 if i%2==0 else 80
            areas.append({'trdar_cd':code,'scores':{'booth':score}})
            pois=[{'id':str(j),'name':'스터디카페','category':'공간대여','distance_m':j*80+10,'matched_by':'스터디카페'} for j in range(i)]
            stats=[{'query':q.get('label') or q['value'],'kind':q['kind'],'total_count':i if q['value']=='스터디카페' else 0,'returned_count':i if q['value']=='스터디카페' else 0} for q in self.spec['competition']['queries']]
            records.append({'trdar_cd':code,'unique_poi_count':len(pois),'pois':pois,'query_stats':stats})
        source={'radius_m':800,'candidates':{'booth':{'queries':self.spec['competition']['queries'],'areas':records}}}
        return {'areas':areas},source

    def test_quadrants_determinism_and_zero_vs_missing(self):
        demand,source=self.fixture();demand['areas'].append({'trdar_cd':'not-collected','scores':{'booth':98}})
        result=derive(demand,source,self.registry)
        self.assertEqual(result,derive(demand,source,self.registry))
        c=result['candidates']['booth'];rows=c['areas']
        self.assertEqual(c['reference_median'],4.5)
        self.assertEqual(c['unmeasured_count'],1)
        self.assertEqual({r['quadrant'] for r in rows},{'A','B','C','D'})
        zero=next(r for r in rows if r['trdar_cd']=='0')
        self.assertEqual(zero['status'],'MEASURED');self.assertEqual(zero['relevant_count'],0);self.assertIsNone(zero['nearest_m'])
        self.assertNotIn('not-collected',{r['trdar_cd'] for r in rows})
        self.assertNotIn('opportunity_score',json.dumps(result))

    def test_partial_capped_and_invariant_reference_are_not_whitespace(self):
        demand,source=self.fixture()
        source['candidates']['booth']['areas'][0]['query_stats'][0]['error']='HTTP_429'
        r=derive(demand,source,self.registry)['candidates']['booth']['areas'][0]
        self.assertEqual(r['status'],'PARTIAL');self.assertIsNone(r['relevant_count']);self.assertEqual(r['quadrant'],'E')
        demand,source=self.fixture();source['candidates']['booth']['areas'][0]['query_stats'][0].update(total_count=50,truncated=True)
        self.assertEqual(derive(demand,source,self.registry)['candidates']['booth']['areas'][0]['quadrant'],'E')
        for row in source['candidates']['booth']['areas']:
            row.update(pois=[],unique_poi_count=0)
            for q in row['query_stats']:q.update(total_count=0,returned_count=0,truncated=False)
        self.assertIsNone(derive(demand,source,self.registry)['candidates']['booth']['reference_median'])

    def test_relevance_not_keyword_hit_and_distance_bands(self):
        self.assertEqual(classify({'name':'샐러디','category':'음식점 > 샐러드','matched_by':'스터디카페'},self.spec)[0],'context')
        self.assertEqual(classify({'name':'통화부스','category':''},self.spec)[0],'direct_proxy')
        self.assertEqual(classify({'name':'공유오피스','category':''},self.spec)[0],'substitute_proxy')
        demand,source=self.fixture();row=derive(demand,source,self.registry)['candidates']['booth']['areas'][5]
        self.assertEqual(row['nearest_m'],10);self.assertEqual(row['within_m'],{'200':3,'400':5,'800':5})
        source['candidates']['booth']['areas'][5]['pois'][0]['distance_m']=None
        self.assertIsNone(derive(demand,source,self.registry)['candidates']['booth']['areas'][5]['relevant_count'])

    def test_queries_or_radius_mismatch_fail_closed(self):
        demand,source=self.fixture();source['radius_m']=400
        self.assertTrue(all(r['status']=='PARTIAL' for r in derive(demand,source,self.registry)['candidates']['booth']['areas']))

    def test_existing_weights_frozen_and_demand_snapshot(self):
        expected={'booth':{'worker':.4,'weekday_flow':.2,'day_flow':.15,'subway':.1,'bank':.05,'public_office':.05,'attractors':.05},'photo':{'flow':.35,'young_flow':.25,'subway':.15,'attractors':.15,'afterwork_flow':.1},'vending':{'worker':.3,'flow':.25,'day_flow':.2,'attractors':.15,'subway':.1},'luggage':{'lodging':.3,'subway':.2,'rail':.15,'flow':.25,'attractors':.1}}
        self.assertEqual({k:location_candidates(self.registry)[k]['weights'] for k in expected},expected)
        data=json.loads((ROOT/'docs/data/seoul-opportunity-map.json').read_text())
        self.assertEqual(data['area_count'],len(data['areas']))

    def test_committed_derived_layer_matches_sources(self):
        source=ROOT/'docs/data/kakao-poi-layer.json';demand=ROOT/'docs/data/seoul-opportunity-map.json'
        stored=json.loads((ROOT/'docs/data/opportunity-intelligence.json').read_text())
        actual=derive(json.loads(demand.read_text()),json.loads(source.read_text()),self.registry)
        for k,v in actual.items():self.assertEqual(stored[k],v)
        for key,path in [('source_hash',source),('demand_hash',demand),('registry_hash',ROOT/'docs/data/candidate-registry.json')]:self.assertEqual(stored[key],hashlib.sha256(path.read_bytes()).hexdigest())

    def test_sampling_budget_and_stability(self):
        spec=importlib.util.spec_from_file_location('collector',ROOT/'pipeline/kakao_competitor_layer.py');m=importlib.util.module_from_spec(spec)
        with patch.dict(os.environ,{'KAKAO_REST_API_KEY':'offline-test'}):spec.loader.exec_module(m)
        areas=json.loads((ROOT/'docs/data/seoul-opportunity-map.json').read_text())['areas']
        samples=[]
        for key in m.CANDIDATES:
            selected=m.selected_areas(areas,key);self.assertEqual(selected,m.selected_areas(list(reversed(areas)),key))
            self.assertEqual(len(selected),60);self.assertEqual(len({a['trdar_cd'] for a in selected}),60)
            self.assertTrue(all(65<=a['scores'][key]<85 for a in selected[40:]))
            samples.append(len(selected)*len(m.CANDIDATES[key]['queries']))
        self.assertEqual(sum(samples),720);self.assertLessEqual(sum(samples)*3,m.REQUEST_BUDGET)

    def test_collection_order_is_not_demand_rank(self):
        spec=importlib.util.spec_from_file_location('rank_collector',ROOT/'pipeline/kakao_competitor_layer.py');m=importlib.util.module_from_spec(spec)
        with patch.dict(os.environ,{'KAKAO_REST_API_KEY':'offline-test'}):spec.loader.exec_module(m)
        with tempfile.TemporaryDirectory() as tmp:
            out=Path(tmp)/'snapshot.json'
            with patch.object(m,'OUT_PATH',out),patch.object(m,'query_poi',return_value={'meta':{'total_count':0,'pageable_count':0},'documents':[]}):m.main()
            result=json.loads(out.read_text())
            for c in result['candidates'].values():
                a=c['areas'][40]
                self.assertEqual(a['collection_order'],41)
                self.assertEqual(a['sampling_band'],'moderate_sample')
                self.assertGreater(a['rank'],40)


if __name__=='__main__':unittest.main()
