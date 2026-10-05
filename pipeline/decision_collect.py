"""Bounded targeted collection. No browser credentials; no citywide building crawl."""
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import re
import urllib.parse
import urllib.request
from public_api_client import Client, SourceError
from decision_sources import portal_store_rows, response_rows, public_fields, RENT_TABLE, VACANCY_TABLE
from decision_bundle import ROOT, publish

TARGETS=[{'area_id':'3001492','name':'명동 남대문 관광특구','lat':37.564058680496096,'lng':126.98185622262775},
         {'area_id':'3120189','name':'강남역','lat':37.497571920870165,'lng':127.02775129423334}]
STORE_FIELDS=('bizesId','bizesNm','brchNm','indsLclsCd','indsLclsNm','indsMclsCd','indsMclsNm','indsSclsCd','indsSclsNm','ksicCd','ksicNm','rdnmAdr','lnoAdr','lon','lat','bldMngNo','flrNo')
BUILD_FIELDS=('mgmBldrgstPk','platPlc','newPlatPlc','mainPurpsCd','mainPurpsCdNm','etcPurps','totArea','archArea','grndFlrCnt','ugrndFlrCnt','useAprDay','strctCdNm','regstrKindCdNm','flrGbCdNm','flrNo','area')

def public_get(url, data=None):
    # Public metadata/vendor documents only. Never receives a credential or authenticated request URL.
    with urllib.request.urlopen(urllib.request.Request(url,data=data,headers={'User-Agent':'SideEconomyLab-source-audit/1.0'}),timeout=25) as response:
        body=response.read(2000001)
    if len(body)>2000000:raise SourceError('PUBLIC_DOCUMENT_TOO_LARGE')
    return body

def collect(client=None, root=ROOT):
    client=client or Client(budget=100)
    raw={'schema_version':1,'retrieved_at':datetime.now(timezone.utc).isoformat(),'secret_contract':['DATA_GO','R_ONE'],'store_caches':[],'r_one':[],'buildings':[],'public_research':[]}
    def store_request(params):
        for attempt in range(3):
            try:return client.data_go('B553077/api/open/sdsc2/storeListInRadius',params)
            except SourceError as exc:
                if not str(exc).startswith(('TRANSPORT_OR_PARSE_ERROR','HTTP_5')) or attempt==2:raise
    for target in TARGETS:
        rows=[];total=None
        for page in range(1,31):
            p=store_request({'radius':800,'cx':target['lng'],'cy':target['lat'],'pageNo':page,'numOfRows':1000,'type':'json'})
            batch,n,code=portal_store_rows(p)
            if str(code)!='00' or n is None:raise SourceError('STORE_COLLECTION_FAILED')
            if total is None:total=int(n)
            if int(n)!=total or not batch and len(rows)<total:raise SourceError('STORE_PAGINATION_CHANGED')
            rows += [{k:r.get(k) for k in STORE_FIELDS} for r in batch]
            print('STORE_CACHE_PROGRESS target='+target['area_id']+' page='+str(page)+' rows='+str(len(rows)),flush=True)
            if len(rows)>=total:break
        if len(rows)!=total:raise SourceError('STORE_CACHE_INCOMPLETE')
        raw['store_caches'].append({'area_id':target['area_id'],'name':target['name'],'center':{'lat':target['lat'],'lng':target['lng']},'radius_m':800,'operation':'storeListInRadius','total':total,'row_count':len(rows),'pages':page,'complete':True,'rows':rows})
        # A single public store-derived hypothetical parcel per target. Private addresses never sent here.
        nearest=sorted(rows,key=lambda r:(float(r['lat'])-target['lat'])**2+(float(r['lon'])-target['lng'])**2)
        b=next((r for r in nearest if re.fullmatch(r'\d{25}',str(r.get('bldMngNo','')))),None)
        if b:
            code=b['bldMngNo'];parcel={'sigunguCd':code[:5],'bjdongCd':code[5:10],'platGbCd':'1' if code[10]=='2' else '0','bun':code[11:15],'ji':code[15:19]}
            for operation in ['getBrTitleInfo','getBrFlrOulnInfo']:
                try:
                    p=client.data_go('1613000/BldRgstHubService/'+operation,{**parcel,'numOfRows':100,'pageNo':1,'_type':'json'})
                    batch,n,status=portal_store_rows(p)
                    raw['buildings'].append({'area_id':target['area_id'],'site_basis':'PUBLIC_HYPOTHETICAL_NEAREST_REGISTERED_STORE_PARCEL','parcel':parcel,'operation':operation,'code':str(status),'total':n,'rows':[{k:r.get(k) for k in BUILD_FIELDS} for r in batch]})
                except SourceError as exc:raw['buildings'].append({'area_id':target['area_id'],'operation':operation,'status':str(exc)})
    audit(client,raw)
    client.sanitize(raw)
    snapshot=publish(raw,root)
    print('DECISION_COLLECTION_VALIDATED snapshot='+snapshot+'; stores='+str(sum(c['total'] for c in raw['store_caches']))+'; requests='+str(client.calls))
    return raw

def audit(client,raw):
    raw['audit_retrieved_at']=datetime.now(timezone.utc).isoformat()
    raw['r_one']=[]
    raw['public_research']=[]
    for op,params in [('SttsApiTbl',{}),('SttsApiTblItm',{'STATBL_ID':RENT_TABLE}),('SttsApiTblData',{'STATBL_ID':RENT_TABLE,'DTACYCLE_CD':'QY','START_WRTTIME':'202602','END_WRTTIME':'202602'}),('SttsApiTblData',{'STATBL_ID':VACANCY_TABLE,'DTACYCLE_CD':'QY','START_WRTTIME':'202602','END_WRTTIME':'202602'})]:
        try:
            payload=client.r_one(op,params);rows,n,code=response_rows(payload,op)
            raw['r_one'].append({'operation':op,'params':params,'code':code,'total':n,'result':payload.get('RESULT'),'rows':[public_fields(r) for r in rows]})
        except SourceError as exc:raw['r_one'].append({'operation':op,'params':params,'status':str(exc)})
    # Public classification metadata remains useful when authenticated statistics are rejected.
    url='https://www.reb.or.kr/r-one/portal/openapi/selectOpenApiItmCd.do'
    try:
        payload=json.loads(public_get(url,urllib.parse.urlencode({'statblId':RENT_TABLE}).encode()))
        raw['public_research'].append({'name':'R-ONE public small-retail classifications','url':url,'payload':payload})
    except Exception:raw['public_research'].append({'name':'R-ONE public classifications','url':url,'status':'UNAVAILABLE'})
    for url in ['https://www.reb.or.kr/r-one/portal/openapi/openApiIntroPage.do','https://www.reb.or.kr/r-one/portal/stat/easyStatPage.do','https://www.data.go.kr/data/15126480/openapi.do','https://www.data.go.kr/tcs/dss/selectDataSetList.do?keyword='+urllib.parse.quote('국토교통부 토지이용규제정보서비스'),'https://www.bandainamco.co.kr/','https://gashapon.jp/shop/location.php?lang=ko','https://www.shinsunginc.kr/m/product_list.html?xcode=005&type=X&page=2','https://new.land.naver.com/robots.txt','https://www.r114.com/robots.txt']:
        try:
            body=public_get(url);text=body.decode('utf-8',errors='replace');text=re.sub(r'<(?:script|style)\b[^>]*>.*?</(?:script|style)>',' ',text,flags=re.S|re.I);plain=re.sub(r'<[^>]+>',' ',text);plain=re.sub(r'\s+',' ',plain)
            raw['public_research'].append({'url':url,'status':'HTTP_200_PUBLIC_DOCUMENT','document_hash':__import__('hashlib').sha256(body).hexdigest(),'excerpt':re.sub(r'(?i)(?:[?&])(?:serviceKey|KEY|apiKey|authKey)=[^\s<]+','[credential parameter omitted]',re.sub(r'(?i);jsessionid=[a-z0-9]+','',plain))[:12000], 'public_table_ids':sorted(set(re.findall(r'T\d{15}',text)))[:150]})
        except Exception:raw['public_research'].append({'url':url,'status':'UNAVAILABLE_NO_CIRCUMVENTION'})
    tables=[r for r in raw['r_one'] if r['operation']=='SttsApiTbl' and r.get('code')=='INFO-000']
    for table in [r for t in tables for r in t['rows'] if re.search('임대료|공실|전환|층별|효용|상대표준오차',str(r))][:24]:
        identifier=table.get('STATBL_ID')
        if not identifier:continue
        for op in ['SttsApiTblItm','SttsApiTblData']:
            params={'STATBL_ID':identifier}
            if op.endswith('Data'):params.update(DTACYCLE_CD='QY',START_WRTTIME='202602',END_WRTTIME='202602')
            try:
                p=client.r_one(op,params);rows,n,code=response_rows(p,op)
                raw['r_one'].append({'operation':op,'params':params,'code':code,'total':n,'table_metadata':table,'rows':[public_fields(r) for r in rows],'complete':n is not None and len(rows)==int(n)})
            except SourceError as exc:raw['r_one'].append({'operation':op,'params':params,'status':str(exc)})
    # One bounded authorization probe; sale prices remain market-asset context only.
    try:
        p=client.data_go('1613000/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade',{'LAWD_CD':'11140','DEAL_YMD':'202609','pageNo':1,'numOfRows':1})
        rows,n,code=portal_store_rows(p)
        raw['additional_api_audit']=[{'dataset':'국토교통부_상업업무용 부동산 매매 실거래가 자료','operation':'getRTMSDataSvcNrgTrade','code':str(code),'total':n,'authorization':'YES' if str(code)=='00' else 'UNKNOWN','used_in_rent_estimate':False}]
    except SourceError as exc:raw['additional_api_audit']=[{'operation':'getRTMSDataSvcNrgTrade','status':str(exc),'authorization':'UNKNOWN','used_in_rent_estimate':False}]


def audit_only(root=ROOT):
    import gzip
    root=Path(root);public=json.loads((root/'docs/data/decision-evidence.json').read_bytes())
    raw=json.loads(gzip.decompress((root/'data/decision-intelligence'/public['snapshot_id']/'source.json.gz').read_bytes()))
    client=Client(budget=65);audit(client,raw);client.sanitize(raw);publish(raw,root)
    print('DECISION_AUDIT_VALIDATED; preserved store retrieval dates; requests='+str(client.calls))

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--audit-only',action='store_true');args=parser.parse_args()
    try:audit_only() if args.audit_only else collect()
    except SourceError as exc:raise SystemExit(str(exc)) from None
    except Exception:raise SystemExit('DECISION_REFRESH_FAILED; previous bundle preserved') from None
