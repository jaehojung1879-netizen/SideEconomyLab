/* Explicit decision gates and conditional economics; no scores or demand forecasts. */
(function(root,factory){const node=typeof module==='object'&&module.exports;const api=factory(node?require('./economics.js'):root.BusinessEconomics,node?require('./business-workspace.js'):root.BusinessWorkspace);if(node)module.exports=api;else root.DecisionIntelligence=api;})(typeof window==='object'?window:globalThis,(E,W)=>{
  'use strict';
  const CLASSES=['VERIFIED','PUBLIC_SOURCE','MARKET_ESTIMATE','PLANNING_ASSUMPTION','USER_INPUT','DERIVED','UNKNOWN'];
  const sum=xs=>xs.some(x=>x===null)?null:xs.reduce((a,b)=>a+b,0);
  const range=(low,base=low,high=base)=>({low,base,high});
  function cell(values,evidence='PLANNING_ASSUMPTION',source='견적 전 예산 자리표시자',reason='공급자·호스트 견적으로 교체하세요.',confidence='LOW'){
    if(!CLASSES.includes(evidence))throw Error('Invalid evidence');
    if(source!==null&&(typeof source!=='string'||source.length>4000)||typeof reason!=='string'||reason.length>4000||!['LOW','MEDIUM','HIGH'].includes(confidence))throw Error('Invalid provenance');
    for(const k of ['low','base','high'])if(values[k]!==null&&(!Number.isFinite(values[k])||values[k]<0))throw Error('Invalid envelope');
    if(values.low!==null&&values.base!==null&&values.high!==null&&!(values.low<=values.base&&values.base<=values.high))throw Error('Unordered envelope');
    return {...values,evidence,source,reason,confidence};
  }
  const A=(l,b,h,reason)=>cell(range(l,b,h),'PLANNING_ASSUMPTION','소유자 검토용 예산 가정',reason);
  const UNKNOWN=()=>cell(range(null),'UNKNOWN',null,'조회·견적 필요');
  const DEFAULTS={
    'BOOTH-CALL':{area:8,price:[150,200,250],cost:[10,20,30],config:'C-BOOTH-CUSTOM',capex:[8000000,10000000,12000000],flow:'weekday_flow',session:20},
    'BOOTH-FOCUS':{area:8,price:[100,150,200],cost:[10,20,30],config:'C-KZONE',flow:'young_flow',session:30},
    'BOOTH-SING':{area:8,price:[100,150,200],cost:[15,25,35],config:'C-SING-STD',flow:'afterwork_flow',session:15},
    'PHOTO-PRINT':{area:4,price:[3000,4000,5000],cost:[1000,1400,1800],config:'C-SM06-STATION',flow:'young_flow'},
    'PHOTO-ID-OUTPUT':{area:4,price:[5000,6000,7000],cost:[1500,2000,2500],config:'C-SM06-STATION',flow:'weekday_flow'},
    'DOCUMENT-PRINT':{area:4,price:[1000,2000,3000],cost:[500,800,1200],capex:[3000000,5000000,7000000],flow:'weekday_flow'},
    'VEND-BEVERAGE':{area:4,price:[1500,2000,2500],cost:[800,1000,1300],config:'C-VEND-USED',flow:'day_flow'},
    'VEND-SNACK':{area:4,price:[1500,2000,3000],cost:[900,1200,1800],config:'C-MULTI-790',flow:'day_flow'},
    'VEND-AMENITY':{area:4,price:[3000,5000,7000],cost:[1500,2500,4000],config:'C-MULTI-790',flow:'flow'},
    'VEND-COFFEE':{area:6,price:[2000,2500,3000],cost:[600,800,1000],config:'C-COFFEE-X500',flow:'weekday_flow'},
    'LUGGAGE-HOST':{area:15,price:[5000,6000,8000],cost:[1500,2000,2500],capex:[500000,1000000,2000000],flow:'flow'},
    'LUGGAGE-LOCKER':{area:12,price:[5000,6000,8000],cost:[300,500,800],capex:[8000000,12000000,18000000],flow:'flow'},
    'LUGGAGE-OVERFLOW':{area:20,price:[7000,10000,12000],cost:[2500,3500,4500],capex:[1000000,2000000,3000000],flow:'flow'},
    'MRO-BASKET':{area:0,price:[150000,200000,250000],cost:[130000,160000,220000],capex:[100000,300000,500000],flow:null},
    'EVENT-PHOTO':{area:0,price:[700000,1000000,1500000],cost:[500000,650000,900000],capex:[100000,300000,500000],flow:null}
  };
  const LOCATION_FAMILIES=['OC-001','OC-008','OC-013','OC-020'];
  const SITE_MODELS={FULL_LEASE:'독립 공간 임대',MICRO_SPACE_LICENSE:'부분 공간 사용료',HOST_REVENUE_SHARE:'호스트 매출 배분',HOST_FIXED_FEE:'호스트 고정 배치비',CONCESSION:'사용권/최소 보장',NO_STANDALONE_SITE:'독립 공간 없음'};
  const SITE_POLICY={
    'BOOTH-CALL':{default_model:'MICRO_SPACE_LICENSE',models:['MICRO_SPACE_LICENSE','HOST_FIXED_FEE','FULL_LEASE']},
    'BOOTH-FOCUS':{default_model:'MICRO_SPACE_LICENSE',models:['MICRO_SPACE_LICENSE','HOST_FIXED_FEE','FULL_LEASE']},
    'BOOTH-SING':{default_model:'FULL_LEASE',models:['FULL_LEASE','MICRO_SPACE_LICENSE','CONCESSION']},
    'PHOTO-PRINT':{default_model:'HOST_FIXED_FEE',models:['HOST_FIXED_FEE','MICRO_SPACE_LICENSE','HOST_REVENUE_SHARE','FULL_LEASE']},
    'PHOTO-ID-OUTPUT':{default_model:'HOST_FIXED_FEE',models:['HOST_FIXED_FEE','MICRO_SPACE_LICENSE','FULL_LEASE']},
    'DOCUMENT-PRINT':{default_model:'MICRO_SPACE_LICENSE',models:['MICRO_SPACE_LICENSE','HOST_FIXED_FEE','FULL_LEASE']},
    'VEND-BEVERAGE':{default_model:'HOST_FIXED_FEE',models:['HOST_FIXED_FEE','HOST_REVENUE_SHARE','MICRO_SPACE_LICENSE','CONCESSION','FULL_LEASE']},
    'VEND-COFFEE':{default_model:'HOST_FIXED_FEE',models:['HOST_FIXED_FEE','HOST_REVENUE_SHARE','MICRO_SPACE_LICENSE','CONCESSION','FULL_LEASE']},
    'VEND-SNACK':{default_model:'HOST_FIXED_FEE',models:['HOST_FIXED_FEE','HOST_REVENUE_SHARE','MICRO_SPACE_LICENSE','CONCESSION','FULL_LEASE']},
    'VEND-AMENITY':{default_model:'HOST_FIXED_FEE',models:['HOST_FIXED_FEE','HOST_REVENUE_SHARE','MICRO_SPACE_LICENSE','CONCESSION','FULL_LEASE']},
    'LUGGAGE-HOST':{default_model:'HOST_REVENUE_SHARE',models:['HOST_REVENUE_SHARE','HOST_FIXED_FEE','CONCESSION']},
    'LUGGAGE-LOCKER':{default_model:'MICRO_SPACE_LICENSE',models:['MICRO_SPACE_LICENSE','HOST_FIXED_FEE','CONCESSION','FULL_LEASE']},
    'LUGGAGE-OVERFLOW':{default_model:'MICRO_SPACE_LICENSE',models:['MICRO_SPACE_LICENSE','HOST_FIXED_FEE','HOST_REVENUE_SHARE','FULL_LEASE']},
    'MRO-BASKET':{default_model:'NO_STANDALONE_SITE',models:['NO_STANDALONE_SITE']},
    'EVENT-PHOTO':{default_model:'NO_STANDALONE_SITE',models:['NO_STANDALONE_SITE']}
  };
  // Capability is about what is listed, not whether a request completed.
  const OBSERVABILITY_POLICY={
    'BOOTH-CALL':{capability:'POOR',target:'EMBEDDED_EQUIPMENT',reason:'사무실 내부 통화 부스는 점포/장소 검색에 독립 등록되지 않을 수 있음'},
    'BOOTH-FOCUS':{capability:'PARTIAL',target:'HOST_BASED_SERVICE',reason:'이름 있는 개인 연습실은 관측 가능하지만 시설 내부 부스는 누락 가능'},
    'BOOTH-SING':{capability:'PARTIAL',target:'STOREFRONT_ESTABLISHMENT',reason:'노래방 업소는 관측 가능; 코인/짧은 세션과 시설 내부 부스까지 확인하지 못함'},
    'PHOTO-PRINT':{capability:'POOR',target:'EMBEDDED_EQUIPMENT',reason:'사진관은 인화 기기의 배치/설치 수를 나타내지 않음'},
    'PHOTO-ID-OUTPUT':{capability:'POOR',target:'EMBEDDED_EQUIPMENT',reason:'증명사진 업소 검색은 시설 내부 자동 출력 기기를 전부 관측하지 못함'},
    'DOCUMENT-PRINT':{capability:'GOOD',target:'STOREFRONT_ESTABLISHMENT',reason:'공식 복사/인쇄 업종과 Kakao 인쇄소 검색이 독립 점포 경쟁을 관측할 수 있음; 시설 내부 프린터는 별개'},
    'VEND-BEVERAGE':{capability:'POOR',target:'EMBEDDED_EQUIPMENT',reason:'공식 점포·Kakao 장소는 시설 내부 개별 음료 자판기를 전부 관측하지 못함'},
    'VEND-COFFEE':{capability:'POOR',target:'EMBEDDED_EQUIPMENT',reason:'무인카페는 보이지만 시설 내부 커피 자판기는 독립 장소로 등록되지 않을 수 있음'},
    'VEND-SNACK':{capability:'POOR',target:'EMBEDDED_EQUIPMENT',reason:'점포 업종은 시설 내부 간식 자판기의 설치 수를 나타내지 않음'},
    'VEND-AMENITY':{capability:'POOR',target:'EMBEDDED_EQUIPMENT',reason:'점포 업종은 시설 내부 편의용품 자판기의 설치 수를 나타내지 않음'},
    'LUGGAGE-HOST':{capability:'PARTIAL',target:'HOST_BASED_SERVICE',reason:'이름 있는 짐보관 서비스는 검색 가능; 숙박/시설의 비공개 호스트 서비스는 누락 가능'},
    'LUGGAGE-LOCKER':{capability:'POOR',target:'EMBEDDED_EQUIPMENT',reason:'일부 물품보관함 장소는 검색되지만 시설 내부 개별 칸/설치를 전부 관측하지 못함'},
    'LUGGAGE-OVERFLOW':{capability:'PARTIAL',target:'HOST_BASED_SERVICE',reason:'보관 운영자는 검색 가능; 대형/단체 짐 취급 여부와 잔여 용량은 미확인'}
  };
  const SITE_BASIS_LABELS={ACTUAL_SITE_TERMS:'대상 사이트 실제 입력 조건',PRIVATE_COMPARABLES:'검증된 개인 비교 호가',HOST_MODEL_ESTIMATE:'계약 모델의 기획 공간비',MARKET_RENT_BASELINE:'시장 임대료 기준선 · 실제 공간비 아님',UNKNOWN:'공간비 근거 미확인'};
  function commercialModel(variant,settings={}){
    const policy=SITE_POLICY[variant.variant_id],model=settings.site_commercial_model||policy?.default_model;
    if(!policy?.models.includes(model))throw Error('Unsupported site commercial model');
    return model;
  }
  function siteEnvelope({model,lease_estimate,actual}){
    if(actual!==null)return {...lease_estimate,basis:'ACTUAL_SITE_TERMS',commercial_model:model};
    if(model==='FULL_LEASE')return {...lease_estimate,basis:lease_estimate.basis,commercial_model:model};
    if(model==='NO_STANDALONE_SITE')return {...cell(range(0),'PLANNING_ASSUMPTION','비입지 계약형','독립 공간을 사용하지 않는 직송/외주 기획'),basis:'HOST_MODEL_ESTIMATE',method:model,commercial_model:model,actual_quoted_rent:null};
    const budgets={HOST_FIXED_FEE:[100000,300000,700000],MICRO_SPACE_LICENSE:[200000,500000,1000000],CONCESSION:[200000,500000,1000000],HOST_REVENUE_SHARE:[0,0,0]};
    return {...A(...budgets[model],'실제 호스트 호가가 없는 둥근 기획 예산; 계약 모델별 비용을 직접 편집하세요. R-ONE에서 도출하지 않음'),basis:'HOST_MODEL_ESTIMATE',method:'EXPLICIT_HOST_PLANNING_MODEL',commercial_model:model,actual_quoted_rent:null,limitations:['실제 대상 호스트 조건 미확인','매출배분·최소 보장·관리비는 별도 비용 행에서 확인']};
  }
  function competitionObservability(variant,competitors){
    const policy=OBSERVABILITY_POLICY[variant.variant_id]||{capability:'UNKNOWN',target:'NON_LOCATION',reason:'입지 경쟁으로 평가하지 않는 계약형 사업'};
    if(!competitors)return {...policy,level:'UNKNOWN',reason:policy.reason+' · 대상 위치/관측 없음'};
    const observed=competitors.bands[2].roles.DIRECT.unique_observed!==null;
    const reliable=competitors.official_observed&&competitors.freshness==='CURRENT' || competitors.kakao_observed&&competitors.kakao_freshness==='CURRENT';
    const complete=competitors.official_coverage==='COMPLETE_TARGET_CIRCLE';
    const level=!observed||!reliable?'UNKNOWN':policy.capability==='GOOD'?(complete?'GOOD':'PARTIAL'):policy.capability;
    return {...policy,level,reliable,reason:policy.reason+(complete?' · 공식 800m 범위 완전/최근':' · 표본 또는 범위 불완전')+(!reliable?' · 관측 시점 미확인/오래됨':'')};
  }
  function freshness(period,asOf=new Date().toISOString().slice(0,10),maxDays=180){
    const m=/^(20\d{2})([1-4])$/.exec(String(period));if(!m)return {status:'UNKNOWN',age_days:null};
    const end=new Date(Date.UTC(+m[1],+m[2]*3,0));const age=Math.floor((Date.parse(asOf)-end)/86400000);
    return {status:age<0?'FUTURE':age>maxDays?'STALE':'CURRENT',age_days:age};
  }
  function resolveMarket(area,markets,crosswalk=[],assetClass='SMALL_RETAIL'){
    markets=markets.filter(m=>(m.asset_class||'SMALL_RETAIL')===assetClass);
    const link=crosswalk.find(x=>String(x.trdar_cd)===String(area.trdar_cd)&&x.method==='EXPLICIT_PUBLISHED_CROSSWALK');
    if(link){const market=markets.find(m=>m.geography_id===link.geography_id&&m.unit==='THOUSAND_KRW_SQM_MONTH');if(market)return {...market,mapping:link.method};}
    return markets.find(m=>m.geography_type==='city'&&m.geography_id==='11'&&m.unit==='THOUSAND_KRW_SQM_MONTH')||null;
  }
  function rentEnvelope({market,area_sqm,floor='1',comparables=[],scope='',asOf,actual=null,floor_evidence=[]}){
    if(actual!==null){const c=cell(range(actual),'USER_INPUT','PRIVATE 대상 월 고정 공간비 입력','서명 견적 여부는 사용자가 확인', 'MEDIUM');return {...c,basis:'ACTUAL_SITE_TERMS',method:'PRIVATE_TERMS',geography:'PRIVATE site',actual_quoted_rent:actual,area_sqm,floor_basis:floor,limitations:['보증금 환산액은 월 현금 월세와 구별']};}
    const comps=comparableStats(comparables,{scope,floor,area_sqm,asOf});
    if(comps.count>=5){return {...cell(range(comps.rent_per_sqm.q1*area_sqm,comps.rent_per_sqm.median*area_sqm,comps.rent_per_sqm.q3*area_sqm),'MARKET_ESTIMATE','PRIVATE 공개 호가 입력','비교 가능한 5건 이상 호가의 단위면적 IQR; 신뢰구간 아님','LOW'),basis:'PRIVATE_COMPARABLES',method:'PRIVATE_COMPARABLE_IQR',geography:scope,area_sqm,floor_basis:floor,observation_period:comps.observation_dates,comparables:comps,actual_quoted_rent:null,limitations:['호가는 계약가격이 아님; 관리비·보증금 환산 별도; 선택 편향 가능']};}
    if(!market||!Number.isFinite(area_sqm)||area_sqm<=0)return {...UNKNOWN(),basis:'UNKNOWN',method:'NO_DEFENSIBLE_RENT',actual_quoted_rent:null,limitations:['공간 면적과 단위가 검증된 시장 통계 필요']};
    const floorName=canonicalFloor(floor);
    const floorRow=floor_evidence.find(r=>r.name===market.name&&r.asset_class===(market.asset_class||'SMALL_RETAIL')&&r.period===market.period&&canonicalFloor(r.floor)===floorName&&r.item==='임대료'&&r.unit_label==='천원/㎡'&&Number.isFinite(r.value));
    const basisKnown=(market.asset_class||'SMALL_RETAIL')==='SMALL_RETAIL';
    const floorFactor=floorRow||!basisKnown?range(.75,1,1.5):floorClass(floor)==='GROUND'?range(.75,1,1.5):range(.4,.65,1);
    const monthly=(floorRow?floorRow.value:market.rent_thousand_krw_per_sqm)*1000*area_sqm;
    return {...cell(range(monthly*floorFactor.low,monthly*floorFactor.base,monthly*floorFactor.high),'MARKET_ESTIMATE',market.source_id,'공개 시장/층 임대료 × 면적 × 명시적 예산 편차 가정; 통계적 신뢰구간 아님'),basis:'MARKET_RENT_BASELINE',method:floorRow?'FLOOR_STATISTIC_TIMES_AREA_PLANNING_BAND':'STATISTIC_TIMES_AREA_PLANNING_FACTOR',geography:market.name,geography_type:market.geography_type,asset_class:market.asset_class||'small retail',floor_basis:{requested_floor:floor,statistic:floorRow?floorRow.floor+' published floor rent':basisKnown?'1F converted market rent':'SOURCE FLOOR BASIS NOT VERIFIED',source:floorRow?.source_id||market.source_id,factor:{...floorFactor,evidence:'PLANNING_ASSUMPTION'}},area_sqm,observation_period:market.period,freshness:freshness(market.period,asOf),sources:floorRow?[market.source_id,floorRow.source_id]:[market.source_id],actual_quoted_rent:null,limitations:['서울 도시 통계는 개별 점포 호가가 아님','보증금 환산 임대료 포함; 월 현금 월세를 직접 관측하지 않음','VAT·관리비 제외; 부분 임차·호스트 배분 가격 미확인','하위 시장 연결·층 효용/RSE가 검증되지 않으면 도시 근거와 가정만 사용']};
  }
  function classify(variant,poi){
    const text=[poi.name,poi.category,poi.indsSclsNm,poi.ksicNm].join(' ').normalize('NFKC').toLowerCase();
    for(const role of ['direct','substitute'])if(variant.competition_rules[role].some(t=>text.includes(t.toLowerCase())))return role.toUpperCase();
    const complementary={ 'VEND-BEVERAGE':['체육','헬스','사무'], 'VEND-COFFEE':['사무','학원'], 'PHOTO-PRINT':['관광','여행'], 'DOCUMENT-PRINT':['학교','대학','사무'], 'LUGGAGE-HOST':['호텔','숙박','여행'] };
    if((complementary[variant.variant_id]||[]).some(t=>text.includes(t)))return 'COMPLEMENTARY';
    return 'CONTEXT';
  }
  const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
  function crossMatch(kakao,official){
    const ks=[...new Map(kakao.map(p=>[String(p.id),p])).values()],os=[...new Map(official.map(p=>[String(p.bizesId),{...p,name:p.bizesNm,lng:Number(p.lon),lat:Number(p.lat)}])).values()];
    const pairs=[],nameIndex=new Map(),grid=new Map(),bucket=(lat,lng)=>[Math.floor(lat/.0004),Math.floor(lng/.0004)];
    os.forEach((o,j)=>{o.normalized_name=normalize(o.name);if(!nameIndex.has(o.normalized_name))nameIndex.set(o.normalized_name,[]);nameIndex.get(o.normalized_name).push(j);if([o.lat,o.lng].every(Number.isFinite)){const k=bucket(o.lat,o.lng).join(':');if(!grid.has(k))grid.set(k,[]);grid.get(k).push(j);}});
    ks.forEach((k,i)=>{if(![k.lat,k.lng].every(Number.isFinite))return;const a=normalize(k.name),[x,y]=bucket(k.lat,k.lng),candidates=new Set(nameIndex.get(a)||[]);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const j of grid.get([x+dx,y+dy].join(':'))||[])candidates.add(j);for(const j of candidates){const o=os[j],b=o.normalized_name;if(![o.lat,o.lng].every(Number.isFinite))continue;const distance=W.distance(k,o);if(a.length>=2&&a===b&&distance<=35||Math.min(a.length,b.length)>=4&&(a.includes(b)||b.includes(a))&&distance<=15)pairs.push({i,j,distance,exact:a===b});}});
    // Reject ambiguous identities rather than pairing chain branches by proximity alone.
    const selected=pairs.filter(p=>pairs.filter(x=>x.i===p.i).length===1&&pairs.filter(x=>x.j===p.j).length===1),ki=new Set(selected.map(p=>p.i)),oi=new Set(selected.map(p=>p.j));
    return [...selected.map(p=>({status:'MATCHED',kakao:ks[p.i],official:os[p.j],distance:p.distance})),...ks.filter((_,i)=>!ki.has(i)).map(k=>({status:'KAKAO_ONLY',kakao:k})),...os.filter((_,i)=>!oi.has(i)).map(o=>({status:'DATA_GO_ONLY',official:o}))];
  }
  function competition(variant,point,kakao,cache,asOf,kakao_retrieved_at){
    const records=(cache?.stores||[]).filter(p=>[Number(p.lat),Number(p.lon)].every(Number.isFinite)&&W.distance(point,{lat:Number(p.lat),lng:Number(p.lon)})<=835);
    kakao=kakao.filter(p=>[p.lat,p.lng].every(Number.isFinite)&&W.distance(point,p)<=835);
    const matched=crossMatch(kakao,records).map(p=>{const source=p.kakao||p.official;return {...p,role:classify(variant,{...p.official,...source}),distance_m:W.distance(point,source)};}).filter(p=>p.distance_m<=800);
    const covers=(cache?.coverage||[]).filter(c=>W.distance(point,c.center)+800<=c.radius_m+1);
    const sourceObserved=records.length>0||covers.length>0,kakaoObserved=kakao.length>0;
    const age=freshnessAge(cache?.retrieved_at,asOf),kakaoAge=freshnessAge(kakao_retrieved_at,asOf),officialFresh=age>=0&&age<=30,kakaoFresh=kakaoAge>=0&&kakaoAge<=30;const complete=covers.some(c=>c.complete)&&officialFresh;
    const reliable_direct_count=matched.filter(p=>p.role==='DIRECT'&&(p.official&&officialFresh||p.kakao&&kakaoFresh)).length;
    return {bands:[200,400,800].map(radius=>{const rows=matched.filter(p=>p.distance_m<=radius);const roles=Object.fromEntries(['DIRECT','SUBSTITUTE','COMPLEMENTARY','CONTEXT'].map(role=>{const r=rows.filter(p=>p.role===role);return [role,{kakao:kakaoObserved?r.filter(p=>p.kakao).length:null,official:sourceObserved?r.filter(p=>p.official).length:null,matched:r.filter(p=>p.status==='MATCHED').length,unique_observed:sourceObserved||kakaoObserved?r.length:null}];}));return {radius_m:radius,roles};}),records:matched,official_observed:sourceObserved,kakao_observed:kakaoObserved,reliable_direct_count,official_coverage:complete?'COMPLETE_TARGET_CIRCLE':'PARTIAL_OR_UNMEASURED',freshness: Number.isFinite(age)&&age>=0&&age<=30?'CURRENT':'STALE_OR_UNKNOWN',kakao_freshness: freshnessAge(kakao_retrieved_at,asOf)>=0&&freshnessAge(kakao_retrieved_at,asOf)<=30?'CURRENT':'STALE_OR_UNKNOWN',limitations:['공식 업종·이름 분류는 실제 기기/SKU 확인이 아님','Kakao 검색은 제한된 소비자 장소 신호; 관측 개수는 전수 경쟁 밀도가 아님','동명이점·불명확한 지점은 MATCHED로 강제 결합하지 않음']};
  }
  function freshnessAge(date,asOf=new Date().toISOString().slice(0,10)){return (Date.parse(asOf)-Date.parse(String(date).slice(0,10)))/86400000;}
  function costStack(variant,catalog,rent,overrides={},site_model=SITE_POLICY[variant.variant_id].default_model){
    const d=DEFAULTS[variant.variant_id];if(!d)throw Error('Unprofiled variant');
    const config=catalog.configurations.find(c=>c.configuration_id===d.config);
    const quote=config?.asking_price_krw;
    const equipment=quote!=null?cell(range(quote),'PUBLIC_SOURCE',config.source_ids.join(', '),'공개 장비 호가만; 설치·VAT 미확인 항목 별도',W.freshness(config)==='STALE'?'LOW':'MEDIUM'):A(...(d.capex||[3000000,5000000,8000000]),'정확한 사양/견적 전 자본 예산 가정');
    const row=(group,key,label,value)=>({group,key,label,...value});
    const rows=[row('INITIAL','equipment','장비/서비스 준비 자본',equipment),row('INITIAL','vat_reserve','미확인 VAT 예비금',A(0,config?.vat_treatment==='INCLUDED'?0:equipment.base*.1,config?.vat_treatment==='INCLUDED'?0:equipment.high*.1,'VAT 포함 호가면 0; 미확인 호가는 10% 준비. 세무 정산액 아님')),
      row('INITIAL','installation','설치',A(300000,700000,1500000,'임시 설치 예산; 공급자 견적 필요')),row('INITIAL','delivery','반입·배송',A(100000,200000,500000,'현장 접근·중량 미확인 배송 준비금')),
      row('INITIAL','utility_work','전기·배관·통신 공사',A(0,500000,1500000,'기존 시설 사용 가능 여부에 따라 공사 견적')),
      row('INITIAL','deposit','회수 가능한 보증금',site_model==='FULL_LEASE'?A(rent.low===null?null:rent.low*6,rent.base===null?null:rent.base*10,rent.high===null?null:rent.high*12,'임대 기획 공간비의 6/10/12배 현금 준비 가정; 반환 보장 아님'):A(0,site_model==='NO_STANDALONE_SITE'?0:500000,site_model==='NO_STANDALONE_SITE'?0:2000000,'호스트/사용권의 별도 보증 예산 가정; 실제 계약/반환 보장 아님')),
      row('INITIAL','key_money','권리금',A(0,0,3000000,'무권리 장소 우선 검토; 고가 권리금은 실제 입력')),
      row('INITIAL','inventory','초기 재고·소모품 / 운전자금',A(200000,500000,1000000,'물량 예측이 아닌 첫 주문/보충 준비금')),
      row('INITIAL','setup','설정·소프트웨어 초기',A(0,200000,500000,'계약/결제 설정 견적 전 준비금')),
      row('INITIAL','contingency','예비비',A(300000,700000,1500000,'미확인 설치/AS 범위에 대한 둥근 예산')),
      row('FIXED','rent','월 고정 공간비 / 사용료',rent),row('FIXED','management','관리비',site_model==='FULL_LEASE'?A(50000,100000,200000,'면적/호스트에 따라 견적 교체'):A(0,0,site_model==='NO_STANDALONE_SITE'?0:100000,'배치/사용료에 관리비 포함 기획; 추가 비용은 계약 확인')),
      ...[['software','소프트웨어/라이선스',30000,50000,100000],['minimum_host','추가 최소 호스트 보장',0,0,site_model==='HOST_REVENUE_SHARE'?100000:0],['insurance','보험',10000,30000,50000],['maintenance','정기 유지·청소',50000,100000,200000],['communications','통신',20000,30000,50000],['utilities','고정 전력·기타',30000,50000,100000]].map(([k,t,l,b,h])=>row('FIXED',k,t,A(l,b,h,'계약·사용량 전 월 예산 가정'))),
      row('VARIABLE','price','판매 단위 가격',A(...d.price,'판매가격 시험 전 기획 가정; 시장 관측 가격 아님')),
      row('VARIABLE','cogs','매입/소모품/공급자 단위비용',A(...d.cost,'정산·원가 견적 전 기획 가정')),
      row('VARIABLE','consumables','추가 소모품',A(0,0,d.price[1]*.02,'기본 원가 포함 가정; 추가분 상단 준비')),
      row('VARIABLE','payment_rate','결제 수수료 비율',A(.015,.025,.04,'결제 계약 견적 전 요율 가정')),
      row('VARIABLE','host_share','호스트 매출배분 비율',site_model==='HOST_REVENUE_SHARE'?A(.1,.2,.3,'매출배분 기획 10/20/30%; 실제 계약 요율 아님'):A(0,0,0,'고정 비용형 기본 배분 0; 병과하는 실제 계약이면 입력')),
      row('VARIABLE','platform_rate','플랫폼 비율',A(0,0,.05,'판매 채널 계약 미확인')),
      row('VARIABLE','fulfillment','배송·이행/거래지원 단위비용',A(0,0,d.price[1]*.03,'기본 원가 포함 가정; 장애/운송 추가분')),
      row('VARIABLE','shrinkage_rate','폐기·분실 비율',A(0,.02,.05,'보충/반품 기록 전 준비 가정'))];
    for(const [key,c] of Object.entries(overrides)){const r=rows.find(r=>r.key===key);if(!r)throw Error('Unknown cost key');Object.assign(r,cell(c,c.evidence,c.source,c.reason,c.confidence));}
    return {rows,configuration:config||{model:'사양 특정 견적 전 자본 예산',configuration_id:null},unknowns:['재판매 회수','실제 세금/금융비용','장비 전력·환기·공사','서명 임대차·실제 월세','규제·호스트 허가'],model:variant.economic_model};
  }
  function solveStack(stack,bound,settings={},adverse=false){
    const vals=Object.fromEntries(stack.rows.map(r=>[r.key,r[adverse&&['price'].includes(r.key)?bound==='low'?'high':bound==='high'?'low':bound:bound]]));
    const inp=Object.fromEntries(E.fields(stack.model).map(k=>[k,E.input(null,'ASSUMPTION')]));
    const put=(k,v)=>inp[k]=E.input(v,'ASSUMPTION','명시적 비용 스택에서 DERIVED');
    const model=E.MODELS[stack.model];put(model.price,vals.price);put(model.costs[0],sum([vals.cogs,vals.consumables,vals.fulfillment]));if(model.costs[1])put(model.costs[1],0);
    put('payment_rate',sum([vals.payment_rate,vals.platform_rate,vals.shrinkage_rate]));put('host_share',vals.host_share);
    put('non_site_fixed',sum(stack.rows.filter(r=>r.group==='FIXED'&&!['rent','management'].includes(r.key)).map(r=>r[bound])));put('rent',vals.rent);put('management',vals.management);
    put('acquisition',vals.equipment);put('installation',sum(['installation','delivery','utility_work','setup','contingency','vat_reserve'].map(k=>vals[k])));put('initial_stock',vals.inventory);put('key_money',vals.key_money);put('deposit',vals.deposit);
    put('operating_days',settings.operating_days??30);put('recovery_months',settings.recovery_months??24);put('owner_hours_month',settings.owner_hours_month??8);put('expected_monthly_units',settings.volume??null);
    if(stack.model==='TIME'){put('session_minutes',settings.session_minutes??20);put('operating_minutes_per_day',settings.operating_minutes??720);put('capacity',settings.capacity??1);}
    if(stack.model==='STORAGE')put('storage_capacity',settings.capacity??20);
    return E.solve(stack.model,inp);
  }
  function capture(variant,area,economics,{daily_flow=null,quarter_days=91,period,operating_days=30,verified_daily_flow=null}={}){
    const field=DEFAULTS[variant.variant_id]?.flow,storage=variant.economic_model==='STORAGE';
    if(!field||['ORDER','EVENT'].includes(variant.economic_model))return {rate:null,gate_eligible:false,reason:'입지 유동으로 계약/행사 수요를 입증하지 않음',evidence:'UNKNOWN'};
    // Future daily metadata is trusted source context, never a private "verified" checkbox.
    const proof=verified_daily_flow,verified=proof&&['VERIFIED','PUBLIC_SOURCE'].includes(proof.evidence)&&proof.temporal_grain==='DAILY'&&proof.geography_id===String(area.trdar_cd)&&typeof proof.source_id==='string'&&proof.source_id.trim()&&proof.opportunity_unit===(storage?'BAG_DAY':'TRANSACTION')&&Number.isFinite(proof.value)&&proof.value>0;
    if(storage&&!verified)return {rate:null,gate_eligible:false,reason:'보관 bag-day와 일 유동의 유료 기회 대응 미검증',evidence:'UNKNOWN'};
    const user=daily_flow!==null&&!storage,flow=user?daily_flow:verified?proof.value:Number(area[field])/quarter_days;
    const denominator_evidence=user?'USER_INPUT':verified?proof.evidence:'PLANNING_ASSUMPTION_TEMPORAL_GRAIN';
    if(!Number.isFinite(flow)||flow<=0||economics.break_even_transactions_month===null)return {rate:null,gate_eligible:false,evidence:'UNKNOWN',denominator_evidence,field};
    return {rate:economics.break_even_transactions_month/operating_days/flow,required_transactions_day:economics.break_even_transactions_month/operating_days,relevant_daily_flow:flow,field,evidence:'DERIVED',denominator_evidence,gate_eligible:user||!!verified,source_id:verified?proof.source_id:null,observation_period:period,normalization:user?'사용자 현장 일 관련/전면 유동 입력':verified?'일 단위·유료 기회 단위가 검증된 소스':`계획용 환산 — 원자료 시간단위 미검증 (공개 ${field} ÷ ${quarter_days}일)`,limitations:['상권 유동은 점포 전면 통행/고유 고객이 아님','계획 환산은 추천 상태에 사용하지 않음','필요 포획률은 매출 예측 또는 전환 관측치가 아님']};
  }
  function evaluate({variant,catalog,area,market,point,kakao=[],cache,kakao_retrieved_at,settings={},overrides={},comparables=[],floor_evidence=[],asOf,blockers=[],verified_daily_flow=null}){
    const d=DEFAULTS[variant.variant_id],areaSize=settings.area_sqm??d.area,site_model=commercialModel(variant,settings);
    const rentArgs={market,area_sqm:areaSize,floor:settings.floor??'1',scope:String(area.trdar_cd),asOf,floor_evidence};
    const market_rent_baseline=rentEnvelope(rentArgs),actual=settings.actual_rent??null;
    const lease_estimate=rentEnvelope({...rentArgs,comparables,actual});
    let rent=siteEnvelope({model:site_model,lease_estimate,actual});
    const effectiveOverrides={...overrides};if(actual!==null)delete effectiveOverrides.rent;
    const stack=costStack(variant,catalog,rent,effectiveOverrides,site_model);
    if(effectiveOverrides.rent)rent={...rent,...stack.rows.find(r=>r.key==='rent'),basis:effectiveOverrides.rent.base===null?'UNKNOWN':'HOST_MODEL_ESTIMATE',method:'PRIVATE_COST_OVERRIDE',actual_quoted_rent:null};
    if(site_model==='HOST_REVENUE_SHARE'&&rent.basis==='ACTUAL_SITE_TERMS'&&!['host_share','minimum_host'].every(k=>['USER_INPUT','PUBLIC_SOURCE','VERIFIED'].includes(stack.rows.find(r=>r.key===k).evidence)))rent={...rent,basis:'HOST_MODEL_ESTIMATE',reason:'고정 조건은 입력됐지만 호스트 배분/최소 보장이 아직 기획 가정'};
    const common={...settings,session_minutes:settings.session_minutes??d.session};
    const results=Object.fromEntries(['low','base','high'].map(k=>[k,solveStack(stack,k,common,true)])),base=results.base;
    const cap=capture(variant,area,base,{...settings,period:settings.flow_period,verified_daily_flow});
    const competitors=point?competition(variant,point,kakao,cache,asOf,kakao_retrieved_at):null,observability=competitionObservability(variant,competitors);
    const sensitivity=[.75,1,1.5,2].map(multiplier=>{const volume=base.break_even_units_month===null?null:base.break_even_units_month*multiplier;return {multiplier,volume,evidence:'PLANNING_ASSUMPTION',label:'SENSITIVITY — NOT DEMAND FORECAST',...solveStack(stack,'base',{...common,volume})};});
    const recovery=[12,24,36].map(months=>({months,...solveStack(stack,'base',{...common,recovery_months:months})}));
    const cash=Object.fromEntries(['low','base','high'].map(k=>{const r=Object.fromEntries(stack.rows.map(r=>[r.key,r[k]]));return [k,{equipment:r.equipment,working_capital:r.inventory,recoverable_deposit:r.deposit,nonrecoverable_setup:sum(['installation','delivery','utility_work','setup','contingency','vat_reserve','key_money'].map(key=>r[key])),total:results[k].cash_required,cash_at_risk:results[k].capital_at_risk}];}));
    const siteCeiling=base.max_site_cost===null?null:base.max_site_cost-base.capital_at_risk/(settings.recovery_months??24);
    const count=competitors?.bands[2]?.roles.DIRECT.unique_observed,limit=settings.competition_limit??10;
    const competitionPass=count==null||!observability.reliable?null:competitors.reliable_direct_count>=limit?false:['POOR','UNKNOWN'].includes(observability.level)?null:true;
    const strongSite=['ACTUAL_SITE_TERMS','PRIVATE_COMPARABLES'].includes(rent.basis),management=stack.rows.find(r=>r.key==='management').base;
    const affordable=siteCeiling===null||rent.base===null||management===null||rent.basis==='MARKET_RENT_BASELINE'?null:rent.base+management<=siteCeiling;
    const capacityApplicable=['TIME','STORAGE'].includes(variant.economic_model);
    const gates=[
      {id:'definition',pass:!!(variant.customer_job&&variant.revenue_unit&&variant.competition_rules),reason:variant.customer_job},
      {id:'cost',pass:base.cash_required!==null&&base.monthly_fixed!==null,reason:'공개 호가와 편집 가능한 예산 스택'},
      {id:'site',pass:rent.base===null?null:true,reason:SITE_BASIS_LABELS[rent.basis]},
      {id:'site_terms',pass:strongSite?true:null,reason:strongSite?'대상 입력 조건/검증된 임대 비교 호가':'실제 계약 조건 미확인; 시장 기준선/호스트 기획만으로 PROMISING 불가'},
      {id:'contribution',pass:base.contribution_per_unit===null?null:base.contribution_per_unit>0,reason:'판매가격 − 단위 원가 − 비율 비용'},
      {id:'capacity',pass:capacityApplicable?(base.required_utilization===null?null:base.required_utilization<=1):true,reason:capacityApplicable?'사용 가능 분/칸 용량과 비교':'분/칸 용량 모델 아님; 실제 판매 상한은 별도 확인'},
      {id:'capture',pass:cap.rate===null||!cap.gate_eligible?null:cap.rate<=(settings.capture_ceiling??.01),reason:cap.gate_eligible?`계수/검증된 분모; ${(settings.capture_ceiling??.01)*100}% 조사 문턱`:'계획용 환산 — 원자료 시간단위 미검증 또는 유료 기회 미확인; 상태 gate 미사용'},
      {id:'competition',pass:competitionPass,reason:`직접형 관측 ${count??'미확인'}개 · 관측성 ${observability.level}; ${count===0&&['POOR','UNKNOWN'].includes(observability.level)?'경쟁 부재를 의미하지 않음':limit+'개 이상 최근 직접 관측이면 조건부 WEAK'}; 전수/시장점유율 아님`},
      {id:'affordability',pass:affordable,reason:rent.basis==='MARKET_RENT_BASELINE'?'시장 기준 비용의 상한 비교는 정보용; 실제 공간비 아님':'입력 물량과 회수 목표에서 선택 계약 모델의 공간비 상한 비교'},
      {id:'owner',pass:settings.owner_available===true?true:settings.owner_available===false?false:null,reason:variant.operational_constraints.join(' · ')},
      {id:'legal',pass:blockers.length?false:null,reason:blockers.join(' · ')||variant.legal_regulatory_unknowns.join(' · ')},
      {id:'quality',pass:null,reason:'가격/운영 비용 가정과 설치/법률 확인이 남아 있음; 매력도와 신뢰도 분리'}];
    const gate=id=>gates.find(g=>g.id===id),negative=['contribution','capacity','capture','competition','affordability','owner'].filter(id=>gate(id).pass===false);
    const promotable=['definition','cost','site_terms','contribution','capacity','capture','competition','owner'].every(id=>gate(id).pass===true)&&['GOOD','PARTIAL'].includes(observability.level);
    const status=blockers.length?'BLOCKED':negative.length?'WEAK':promotable?'PROMISING':'CHECK',confidence='LOW';
    const reasons=[];
    if(rent.basis==='MARKET_RENT_BASELINE')reasons.push('시장 임대료 기준 경제성 검토 · 실제 설치비/호스트 조건 확인 전');
    else if(rent.basis==='HOST_MODEL_ESTIMATE')reasons.push('계약 모델의 기획 공간비 · 실제 호스트 조건 확인 필요');
    else if(rent.basis==='PRIVATE_COMPARABLES')reasons.push('비교 호가는 계약 가격/대상 사이트 견적과 구별');
    if(!cap.gate_eligible)reasons.push(cap.normalization||cap.reason);
    if(['POOR','UNKNOWN'].includes(observability.level))reasons.push('관측성 낮음 — 경쟁 부재를 의미하지 않음');
    const next=status==='BLOCKED'?blockers[0]:negative.length?gate(negative[0]).reason:!strongSite?'선택한 계약 모델의 대상 호스트/임대 서면 조건':!cap.gate_eligible?'관련 전면 일 유동·유료 기회를 직접 계수':['POOR','UNKNOWN'].includes(observability.level)?'시설 내부 기기/호스트 경쟁을 현장 확인':'공급자 견적·설치/법률 조건 검증';
    return {variant_id:variant.variant_id,parent_candidate_id:variant.parent_candidate_id,economic_model:variant.economic_model,label:variant.label,status,confidence,gates,rent,market_rent_baseline,site_cost_basis:rent.basis,site_commercial_model:site_model,competition_observability:observability.level,observability,decision_reasons:reasons,status_label:{CHECK:'검토 가치 있음 · 실제 설치 조건 확인 필요',PROMISING:'조건부 유망 · 입력/비교 조건 기준',WEAK:'현재 조건에서 경제성/실행 부담 큼',BLOCKED:'확인된 차단 조건 있음'}[status],stack,cash,results,capture:cap,competition:competitors,sensitivity,recovery,max_site_with_recovery:siteCeiling,max_rent_with_recovery:siteCeiling===null||management===null?null:siteCeiling-management,next_verification:next,main_risk:variant.operational_constraints[0],why:d.flow?`${({weekday_flow:'평일 유동',young_flow:'20–40대 유동',day_flow:'주간 유동',afterwork_flow:'퇴근 시간 유동',flow:'전체 유동'})[d.flow]} 신호 검토 · ${variant.customer_job}`:'계약형 수요 검증은 지도 밖에서 진행',owner_override:settings.owner_override||null};
  }
  function locationPlays(evaluations,exclude=null){
    const status={PROMISING:0,CHECK:1,WEAK:2,BLOCKED:3},basis={ACTUAL_SITE_TERMS:0,PRIVATE_COMPARABLES:1,HOST_MODEL_ESTIMATE:2,MARKET_RENT_BASELINE:3,UNKNOWN:4},obs={GOOD:0,PARTIAL:1,POOR:2,UNKNOWN:3};
    const missing=p=>['site_terms','capture','competition','owner'].filter(id=>p.gates.find(g=>g.id===id)?.pass==null).length;
    const stable=(a,b)=>a===b?0:a<b?-1:1,number=(a,b)=>a===b?0:(a??Infinity)<(b??Infinity)?-1:1;
    return evaluations.filter(p=>LOCATION_FAMILIES.includes(p.parent_candidate_id)&&p.variant_id!==exclude).sort((a,b)=>status[a.status]-status[b.status]||basis[a.site_cost_basis]-basis[b.site_cost_basis]||obs[a.competition_observability]-obs[b.competition_observability]||missing(a)-missing(b)||number(a.cash.base.cash_at_risk,b.cash.base.cash_at_risk)||stable(a.economic_model,b.economic_model)||(['TIME','STORAGE'].includes(a.economic_model)?number(a.results.base.required_utilization,b.results.base.required_utilization):0)||stable(a.variant_id,b.variant_id)).slice(0,3);
  }
  function topPlays(evaluations,selected){const own=evaluations.find(p=>p.variant_id===selected);return [...(own?[own]:[]),...locationPlays(evaluations,selected)];}
  function canonicalFloor(floor){const text=String(floor).trim();let m=/^(?:B|지하\s*|-)(\d+)\s*층?$/i.exec(text);if(m)return '지하'+Number(m[1])+'층';m=/^(?:지상\s*)?(\d+)\s*층?$/.exec(text);return m?Number(m[1])+'층':text;}
  function floorClass(floor){const normalized=canonicalFloor(floor);return normalized.startsWith('지하')?'BASEMENT':normalized==='1층'?'GROUND':'UPPER';}
  function validateComparable(r){
    const allowed=['id','scope','address','area_sqm','floor','deposit','rent','management','observed_at','source_url'];
    if(!r||Object.keys(r).some(k=>!allowed.includes(k)))throw Error('Invalid comparable fields');
    for(const k of ['id','scope','address','floor','observed_at','source_url'])if(typeof r[k]!=='string'||r[k].length>1000)throw Error('Invalid comparable text');
    if(!r.id||!r.scope||!r.floor)throw Error('Comparable identity/scope/floor required');
    for(const k of ['area_sqm','deposit','rent','management'])if(r[k]!==null&&(!Number.isFinite(r[k])||r[k]<0))throw Error('Invalid comparable number');
    if(!(r.area_sqm>0)||r.rent===null)throw Error('Comparable area/rent required');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(r.observed_at)||new Date(r.observed_at).toISOString().slice(0,10)!==r.observed_at)throw Error('Invalid comparable date');
    const u=new URL(r.source_url);if(!['https:','http:'].includes(u.protocol)||u.username||u.password||/(?:[?&])(?:serviceKey|KEY|apiKey|authKey)=/i.test(r.source_url))throw Error('Unsafe source URL');
    return {...r};
  }
  function importComparables(text){
    if(typeof text!=='string'||new TextEncoder().encode(text).byteLength>1000000)throw Error('Comparable import exceeds 1MB');
    let rows;
    if(text.trim().startsWith('['))rows=JSON.parse(text);
    else {const records=[];let record=[],value='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===','||c==='\n')){record.push(value.replace(/\r$/,''));value='';if(c==='\n'){if(record.some(Boolean))records.push(record);record=[];}}else value+=c;}if(quoted)throw Error('Unclosed CSV quote');record.push(value.replace(/\r$/,''));if(record.some(Boolean))records.push(record);const header=records.shift();if(!header||new Set(header).size!==header.length)throw Error('Invalid CSV header');rows=records.map(values=>{if(values.length!==header.length)throw Error('CSV row width');return Object.fromEntries(header.map((k,i)=>[k,['area_sqm','deposit','rent','management'].includes(k)?values[i]===''?null:Number(values[i]):values[i]]));});}
    if(!Array.isArray(rows)||rows.length>200)throw Error('Too many comparables');const checked=rows.map(validateComparable);if(new Set(checked.map(r=>r.id)).size!==checked.length)throw Error('Duplicate comparable ID');return checked;
  }
  function quantiles(xs){if(!xs.length)return {min:null,q1:null,median:null,q3:null,max:null};const x=[...xs].sort((a,b)=>a-b),q=p=>{const i=(x.length-1)*p,a=Math.floor(i);return x[a]+(x[Math.ceil(i)]-x[a])*(i-a);};return {min:x[0],q1:q(.25),median:q(.5),q3:q(.75),max:x[x.length-1]};}
  function comparableStats(rows,{scope,floor,area_sqm,asOf}={}){
    const selected=rows.map(validateComparable).filter(r=>(!scope||r.scope===scope)&&(!floor||floorClass(r.floor)===floorClass(floor))&&(!area_sqm||r.area_sqm>=area_sqm*.5&&r.area_sqm<=area_sqm*2)&&freshnessAge(r.observed_at,asOf)>=0&&freshnessAge(r.observed_at,asOf)<=90);
    const unit=quantiles(selected.map(r=>r.rent/r.area_sqm)),iqr=unit.q3-unit.q1;
    return {count:selected.length,excluded_count:rows.length-selected.length,rent:quantiles(selected.map(r=>r.rent)),deposit:quantiles(selected.filter(r=>r.deposit!==null).map(r=>r.deposit)),management:quantiles(selected.filter(r=>r.management!==null).map(r=>r.management)),rent_per_sqm:unit,rent_per_pyeong:quantiles(selected.map(r=>r.rent/r.area_sqm*3.305785)),outliers:iqr>0?selected.filter(r=>r.rent/r.area_sqm<unit.q1-1.5*iqr||r.rent/r.area_sqm>unit.q3+1.5*iqr).map(r=>r.id):[],observation_dates:selected.map(r=>r.observed_at),sources:selected.map(r=>r.source_url),method:'동일 scope·층 그룹·0.5–2배 면적·90일 이내 호가; 이상값 표시하며 삭제하지 않음'};
  }
  function buildingCompatibility(variant,building=null){
    const use=building?.mainPurpsCdNm||'',commercial=/근린생활|판매|업무|숙박/.test(use);
    return {physical_fit:commercial?'PLAUSIBLE':'UNKNOWN',legal_fit:'NOT_VERIFIED',checks:[{item:'공식 주용도',status:building?'PUBLIC_SOURCE':'UNKNOWN',value:use||null},{item:'해당 층 용도',status:building?.floor_use?'PUBLIC_SOURCE':'UNKNOWN',value:building?.floor_use||null},...['전력','환기','소방','차음','호스트 허용','영업 신고'].map(item=>({item,status:'UNKNOWN',value:null}))],requirements:variant.required_site_attributes,source:building?.source||null,limitations:['건축물 주용도는 해당 층/호실의 법적 허용 또는 설치 승인이 아님']};
  }
  return {CLASSES,DEFAULTS,LOCATION_FAMILIES,SITE_MODELS,SITE_POLICY,SITE_BASIS_LABELS,OBSERVABILITY_POLICY,commercialModel,competitionObservability,range,cell,freshness,resolveMarket,rentEnvelope,classify,crossMatch,competition,costStack,solveStack,capture,evaluate,topPlays,locationPlays,importComparables,comparableStats,buildingCompatibility};
});
