import gzip
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from urllib.parse import parse_qs, urlsplit
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'pipeline'))
from public_api_client import Client, SourceError, assert_sanitized, require_secrets
from decision_sources import portal_store_rows, response_rows
from decision_bundle import check, publish, encode
from decision_rent import derive_rent

class Response:
    def __init__(self,body=b'{"ok":true}'):self.body=body
    def __enter__(self):return self
    def __exit__(self,*args):pass
    def read(self,size):return self.body

class Opener:
    def __init__(self,body=b'{"ok":true}'):self.body=body;self.urls=[]
    def open(self,request,timeout):self.urls.append(request.full_url);return Response(self.body)

class DecisionSourceTests(unittest.TestCase):
    def test_exact_secret_names_and_missing_before_network(self):
        with self.assertRaisesRegex(SourceError,'MISSING_REQUIRED_SECRET_R_ONE'):require_secrets({'DATA_GO':'dummy','RONE':'alternate'})
        with self.assertRaises(SourceError):Client(secrets={'DATA_GO':' ','R_ONE':'dummy'})
        workflow=(Path(__file__).resolve().parents[1]/'.github/workflows/decision-source-refresh.yml').read_text()
        self.assertIn('DATA_GO: ${{ secrets.DATA_GO }}',workflow);self.assertIn('R_ONE: ${{ secrets.R_ONE }}',workflow)
        self.assertNotIn('secrets.RONE',workflow);self.assertNotIn('secrets.R_ONE_KEY',workflow)

    def test_raw_and_encoded_dummy_keys_once_and_plus_preservation(self):
        for key in ['test+value/==','test%2Bvalue%2F%3D%3D']:
            opener=Opener();client=Client({'DATA_GO':key,'R_ONE':'dummy-rone'},opener)
            client.data_go('B553077/api/open/sdsc2/storeListInRadius',{'type':'json'})
            self.assertEqual(parse_qs(urlsplit(opener.urls[0]).query)['serviceKey'],['test+value/=='])
            self.assertNotIn('%252B',opener.urls[0])
        client.r_one('SttsApiTbl');self.assertEqual(parse_qs(urlsplit(opener.urls[-1]).query)['KEY'],['dummy-rone'])

    def test_no_leaks_and_transport_exception_redaction(self):
        for value in ['test+value/==','test%2Bvalue%2F%3D%3D','https://example.com/?serviceKey=anything']:
            with self.assertRaises(SourceError):assert_sanitized(value,['test+value/=='])
        class Failure:
            def open(self,*args,**kwargs):raise ValueError('https://example.com/?serviceKey=very-private')
        client=Client({'DATA_GO':'dummy-key','R_ONE':'dummy-rone'},Failure())
        with self.assertRaises(SourceError) as raised:client.data_go('B553077/api/open/sdsc2/storeListInRadius',{})
        self.assertNotIn('very-private',str(raised.exception));self.assertNotIn('https',str(raised.exception))
        with self.assertRaises(SourceError):client.request('https://example.com',{},'DATA_GO','serviceKey')
        with self.assertRaises(SourceError):Client({'DATA_GO':'dummy','R_ONE':'dummy'},Opener(),budget=0).r_one('SttsApiTbl')

    def test_official_json_xml_and_rone_parsers(self):
        payload={'header':{'resultCode':'00'},'body':{'items':[{'bizesId':'one'}],'totalCount':1}}
        self.assertEqual(portal_store_rows(payload),([{'bizesId':'one'}],1,'00'))
        wrapped={'response':{'header':{'resultCode':'00'},'body':{'items':{'item':{'mainPurpsCdNm':'근린생활시설'}},'totalCount':1}}}
        self.assertEqual(portal_store_rows(wrapped)[0][0]['mainPurpsCdNm'],'근린생활시설')
        xml=b'<response><header><resultCode>00</resultCode></header><body><items><item><bizesId>one</bizesId></item><item><bizesId>two</bizesId></item></items><totalCount>2</totalCount></body></response>'
        result=Client({'DATA_GO':'dummy','R_ONE':'dummy'},Opener(xml)).data_go('B553077/api/open/sdsc2/storeListInRadius',{})
        self.assertEqual(len(portal_store_rows(result)[0]),2)
        payload={'SttsApiTblData':[{'head':[{'list_total_count':1},{'RESULT':{'CODE':'INFO-000'}}]},{'row':[{'CLS_ID':'500002','DTA_VAL':52.8}]}]}
        self.assertEqual(response_rows(payload,'SttsApiTblData'),([{'CLS_ID':'500002','DTA_VAL':52.8}],1,'INFO-000'))
        self.assertEqual(response_rows({'RESULT':{'CODE':'ERROR-290'}},'SttsApiTblData')[2],'ERROR-290')

    def test_authenticated_rent_unit_period_geography_and_preserved_workbench_entries(self):
        raw={'retrieved_at':'2026-10-05','r_one':[{'operation':'SttsApiTbl','rows':[{'STATBL_ID':'T248223134698125','STATBL_NM':'임대동향 지역별 임대료(2024년3분기~)_소규모 상가'}]}, {'operation':'SttsApiTblData','code':'INFO-000','total':2,'rows':[
            {'STATBL_ID':'T248223134698125','CLS_ID':500002,'CLS_FULLNM':'서울','ITM_NM':'임대료','UI_NM':'천원/㎡','GRP_ID':None,'DTA_VAL':52.8,'WRTTIME_IDTFR_ID':'202602'},
            {'STATBL_ID':'T248223134698125','CLS_ID':520007,'CLS_FULLNM':'서울>도심>명동','ITM_NM':'임대료','UI_NM':'천원/㎡','GRP_ID':None,'DTA_VAL':120,'WRTTIME_IDTFR_ID':'202602'}]}]}
        derived=derive_rent(raw);self.assertEqual(derived['rent_markets'][0]['geography_id'],'11');self.assertEqual(derived['rent_markets'][1]['geography_type'],'submarket');self.assertEqual(derived['geography_resolution']['finest_linked_to_gis'],'city')
        raw['r_one'][1]['rows'][1]['UI_NM']='원';self.assertEqual(len(derive_rent(raw)['rent_markets']),1)
        raw['r_one'][1]['total']=3;self.assertEqual(derive_rent(raw)['rent_markets'],[])
        import hashlib
        root=Path(__file__).resolve().parents[1]
        pins=json.loads((root/'research/decision-preservation-v1.json').read_bytes());catalog=json.loads((root/'docs/data/business-workbench.json').read_bytes())
        for key,idkey in [('variants','variant_id'),('configurations','configuration_id'),('sources','source_id')]:
            current={r[idkey]:r for r in catalog[key]}
            for identifier,expected in pins['workbench_original_entries'][key].items():
                self.assertEqual(hashlib.sha256(json.dumps(current[identifier],sort_keys=True,ensure_ascii=False).encode()).hexdigest(),expected)

    def raw(self):
        return {'schema_version':1,'retrieved_at':'2026-10-05T00:00:00+00:00','secret_contract':['DATA_GO','R_ONE'],'r_one':[],'buildings':[],'store_caches':[{'area_id':'3001492','name':'target','center':{'lat':37.56,'lng':126.98},'radius_m':800,'operation':'storeListInRadius','total':1,'row_count':1,'pages':1,'complete':True,'rows':[{'bizesId':'test-only','bizesNm':'fixture','lat':37.56,'lon':126.98}]}]}

    def test_staged_bundle_hash_validation_and_failed_preservation(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);(root/'docs/data').mkdir(parents=True)
            raw=self.raw();snapshot=publish(raw,root);before=(root/'docs/data/decision-evidence.json').read_bytes();source=(root/'data/decision-intelligence'/snapshot/'source.json.gz').read_bytes()
            self.assertEqual(check(root)['stores'][0]['bizesId'],'test-only')
            invalid=self.raw();invalid['store_caches'][0]['total']=2
            with self.assertRaises(ValueError):publish(invalid,root)
            self.assertEqual((root/'docs/data/decision-evidence.json').read_bytes(),before)
            self.assertEqual((root/'data/decision-intelligence'/snapshot/'source.json.gz').read_bytes(),source)
            with patch('decision_bundle.check',side_effect=ValueError('validation fail')):
                new=self.raw();new['retrieved_at']='2026-10-06T00:00:00+00:00'
                with self.assertRaises(ValueError):publish(new,root)
            self.assertEqual((root/'docs/data/decision-evidence.json').read_bytes(),before)
            modified=json.loads(before);modified['stores'][0]['bizesNm']='drift';(root/'docs/data/decision-evidence.json').write_bytes(encode(modified))
            with self.assertRaises(ValueError):check(root)

    def test_public_outputs_have_no_authentication_query(self):
        root=Path(__file__).resolve().parents[1]
        for p in (root/'docs').rglob('*'):
            if p.is_file() and p.suffix in ('.js','.json','.html','.md'):assert_sanitized(p.read_text())
        if (root/'docs/data/decision-evidence.json').exists():check(root)

if __name__=='__main__':unittest.main()
