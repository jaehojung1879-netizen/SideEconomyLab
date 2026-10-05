"""Unit/period-qualified R-ONE market contexts; never infer survey polygons from names."""
import re
ASSETS={'소규모 상가':'SMALL_RETAIL','중대형 상가':'MEDIUM_LARGE_RETAIL','집합 상가':'COLLECTIVE_RETAIL','오피스':'OFFICE'}

def derive_rent(raw):
    tables={r.get('STATBL_ID'):r for record in raw['r_one'] if record['operation']=='SttsApiTbl' for r in record.get('rows',[])}
    markets=[];floor_context=[];ancillary=[];seen=set()
    for record in raw['r_one']:
        if record['operation']!='SttsApiTblData' or record.get('code')!='INFO-000':continue
        rows=record.get('rows',[])
        if record.get('total') is None or len(rows)!=int(record['total']):continue
        for r in rows:
            table=tables.get(r.get('STATBL_ID'),record.get('table_metadata',{}));name=table.get('STATBL_NM','')
            # Known approved table still has a defensible identity if the catalog request fails.
            if not name and r.get('STATBL_ID')=='T248223134698125':name='임대동향 지역별 임대료(2024년3분기~)_소규모 상가'
            asset=next((a for text,a in ASSETS.items() if '_'+text in name),None)
            if not asset:continue
            geography=(r.get('GRP_FULLNM') or r.get('GRP_NM')) if '층별' in name else (r.get('CLS_FULLNM') or r.get('CLS_NM'));value=r.get('DTA_VAL');period=str(r.get('WRTTIME_IDTFR_ID',''))
            if not geography or not geography.startswith('서울') or not isinstance(value,(int,float)) or not re.fullmatch(r'20\d{2}0[1-4]',period):continue
            base={'source_id':'R_ONE:'+r['STATBL_ID'],'table_id':r['STATBL_ID'],'table_name':name,'geography_code':str(r.get('GRP_ID') if '층별' in name else r['CLS_ID']),'name':geography,'asset_class':asset,'period':period[:4]+period[-1],'api_period':period,'unit_label':r.get('UI_NM'),'item':r.get('ITM_FULLNM') or r.get('ITM_NM'),'value':value,'retrieved_at':raw.get('audit_retrieved_at',raw['retrieved_at']),'url':'https://www.reb.or.kr/r-one/portal/stat/easyStatPage/'+r['STATBL_ID']+'.do'}
            if '지역별 임대료' in name and r.get('ITM_NM')=='임대료' and r.get('UI_NM')=='천원/㎡' and r.get('GRP_ID') is None and value>=0:
                identity=(r['STATBL_ID'],str(r['CLS_ID']),period)
                if identity in seen:continue
                seen.add(identity);parts=geography.split('>')
                markets.append({**base,'geography_id':'11' if len(parts)==1 else str(r['CLS_ID']),'geography_type':'city' if len(parts)==1 else 'market' if len(parts)==2 else 'submarket','unit':'THOUSAND_KRW_SQM_MONTH','rent_thousand_krw_per_sqm':value,'mapping':'Published survey classification; no GIS polygon crosswalk','statistic_basis':'First-floor-equivalent deposit-converted market rent; excludes management/VAT' if asset=='SMALL_RETAIL' else 'Survey market rent; floor conversion basis requires metadata verification; management/VAT excluded'})
            elif '층별' in name:
                floor_context.append({**base,'group':r.get('GRP_FULLNM') or r.get('GRP_NM'),'classification':r.get('CLS_FULLNM'), 'floor':r.get('CLS_FULLNM') or r.get('CLS_NM'),'status':'SOURCE_CONTEXT_ONLY; require exact floor/item/asset/geo match before adjustment'})
            elif any(t in name for t in ['공실','전환','임대가격지수']):ancillary.append(base)
    # A qualified published 1F cell supplies the same asset/geography's site basis
    # when the regional table fails, retaining the floor table's identity and period.
    existing={(m['asset_class'],m['name'],m['period']) for m in markets}
    for f in floor_context:
        key=(f['asset_class'],f['name'],f['period'])
        if key in existing or f['floor']!='1층' or f['item']!='임대료' or f['unit_label']!='천원/㎡' or f['value']<0:continue
        parts=f['name'].split('>')
        markets.append({**f,'geography_id':'11' if len(parts)==1 else f['geography_code'],'geography_type':'city' if len(parts)==1 else 'market' if len(parts)==2 else 'submarket','unit':'THOUSAND_KRW_SQM_MONTH','rent_thousand_krw_per_sqm':f['value'],'mapping':'Published survey classification; no GIS polygon crosswalk','statistic_basis':'Published first-floor rent; FLOOR_TABLE_FALLBACK, not a regional aggregate','method':'QUALIFIED_FIRST_FLOOR_TABLE_FALLBACK'})
        existing.add(key)
    return {'rent_markets':markets,'floor_context':floor_context,'commercial_context':ancillary,'crosswalk':[], 'geography_resolution':{'finest_available':'submarket' if any(m['geography_type']=='submarket' for m in markets) else 'city','finest_linked_to_gis':'city','reason':'No published survey-boundary/GIS-area crosswalk verified; geographic membership in Seoul is proven'}}
