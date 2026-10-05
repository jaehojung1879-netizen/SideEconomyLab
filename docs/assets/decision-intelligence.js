/* Explicit decision gates and conditional economics; no scores or demand forecasts. */
(function(root,factory){const node=typeof module==='object'&&module.exports;const api=factory(node?require('./economics.js'):root.BusinessEconomics,node?require('./business-workspace.js'):root.BusinessWorkspace);if(node)module.exports=api;else root.DecisionIntelligence=api;})(typeof window==='object'?window:globalThis,(E,W)=>{
  'use strict';
  const CLASSES=['VERIFIED','PUBLIC_SOURCE','MARKET_ESTIMATE','PLANNING_ASSUMPTION','USER_INPUT','DERIVED','UNKNOWN'];
  const sum=xs=>xs.some(x=>x===null)?null:xs.reduce((a,b)=>a+b,0);
  const range=(low,base=low,high=base)=>({low,base,high});
  function cell(values,evidence='PLANNING_ASSUMPTION',source='견적 전 예산 자리표시자',reason='공급자·호스트 견적으로 교체하세요.',confidence='LOW'){
    if(!CLASSES.includes(evidence))throw Error('Invalid evidence');
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
    'VEND-COFFEE':{area:6,price:[2000,2500,3000],cost:[600,800,1000],capex:[19000000,23000000,27000000],flow:'weekday_flow'},
    'LUGGAGE-HOST':{area:15,price:[5000,6000,8000],cost:[1500,2000,2500],capex:[500000,1000000,2000000],flow:'flow'},
    'LUGGAGE-LOCKER':{area:12,price:[5000,6000,8000],cost:[300,500,800],capex:[8000000,12000000,18000000],flow:'flow'},
    'LUGGAGE-OVERFLOW':{area:20,price:[7000,10000,12000],cost:[2500,3500,4500],capex:[1000000,2000000,3000000],flow:'flow'},
    'MRO-BASKET':{area:0,price:[150000,200000,250000],cost:[130000,160000,220000],capex:[100000,300000,500000],flow:null},
    'EVENT-PHOTO':{area:0,price:[700000,1000000,1500000],cost:[500000,650000,900000],capex:[100000,300000,500000],flow:null}
  };
  function freshness(period,asOf=new Date().toISOString().slice(0,10),maxDays=180){
    const m=/^(20\d{2})([1-4])$/.exec(String(period));if(!m)return {status:'UNKNOWN',age_days:null};
    const end=new Date(Date.UTC(+m[1],+m[2]*3,0));const age=Math.floor((Date.parse(asOf)-end)/86400000);
    return {status:age<0?'FUTURE':age>maxDays?'STALE':'CURRENT',age_days:age};
  }
  function resolveMarket(area,markets,crosswalk=[]){
    const link=crosswalk.find(x=>String(x.trdar_cd)===String(area.trdar_cd)&&x.method==='EXPLICIT_PUBLISHED_CROSSWALK');
    if(link){const market=markets.find(m=>m.geography_id===link.geography_id&&m.unit==='THOUSAND_KRW_SQM_MONTH');if(market)return {...market,mapping:link.method};}
    return markets.find(m=>m.geography_type==='city'&&m.geography_id==='11'&&m.unit==='THOUSAND_KRW_SQM_MONTH')||null;
  }
  function rentEnvelope({market,area_sqm,floor='1',comparables=[],scope='',asOf,actual=null}){
    if(actual!==null){const c=cell(range(actual),'USER_INPUT','PRIVATE 실제 월세 입력','서명 견적 여부는 사용자가 확인', 'MEDIUM');return {...c,method:'PRIVATE_TERMS',geography:'PRIVATE site',actual_quoted_rent:actual,area_sqm,floor_basis:floor,limitations:['보증금 환산액은 월 현금 월세와 구별']};}
    const comps=comparableStats(comparables,{scope,floor,area_sqm,asOf});
    if(comps.count>=5){return {...cell(range(comps.rent_per_sqm.q1*area_sqm,comps.rent_per_sqm.median*area_sqm,comps.rent_per_sqm.q3*area_sqm),'MARKET_ESTIMATE','PRIVATE 공개 호가 입력','비교 가능한 5건 이상 호가의 단위면적 IQR; 신뢰구간 아님','LOW'),method:'PRIVATE_COMPARABLE_IQR',geography:scope,area_sqm,floor_basis:floor,observation_period:comps.observation_dates,comparables:comps,actual_quoted_rent:null,limitations:['호가는 계약가격이 아님; 관리비·보증금 환산 별도; 선택 편향 가능']};}
    if(!market||!Number.isFinite(area_sqm)||area_sqm<=0)return {...UNKNOWN(),method:'NO_DEFENSIBLE_RENT',actual_quoted_rent:null,limitations:['공간 면적과 단위가 검증된 시장 통계 필요']};
    const floorFactor=floor==='1'?range(.75,1,1.5):range(.4,.65,1);
    const monthly=market.rent_thousand_krw_per_sqm*1000*area_sqm;
    return {...cell(range(monthly*floorFactor.low,monthly*floorFactor.base,monthly*floorFactor.high),'MARKET_ESTIMATE',market.source_id,'1층 환산 시장 통계 × 면적 × 명시적 층/시장 편차 가정; 통계적 신뢰구간 아님'),method:'STATISTIC_TIMES_AREA_PLANNING_FACTOR',geography:market.name,geography_type:market.geography_type,asset_class:market.asset_class||'small retail',floor_basis:{requested_floor:floor,statistic:'1F converted market rent',factor:{...floorFactor,evidence:'PLANNING_ASSUMPTION'}},area_sqm,observation_period:market.period,freshness:freshness(market.period,asOf),sources:[market.source_id],actual_quoted_rent:null,limitations:['서울 도시 통계는 개별 점포 호가가 아님','보증금 환산 임대료 포함; 월 현금 월세를 직접 관측하지 않음','VAT·관리비 제외; 부분 임차·호스트 배분 가격 미확인','하위 시장 연결·층 효용/RSE가 검증되지 않으면 도시 근거와 가정만 사용']};
  }
  function classify(variant,poi){
    const text=[poi.name,poi.category,poi.indsSclsNm,poi.ksicNm].join(' ').normalize('NFKC').toLowerCase();
    for(const role of ['direct','substitute'])if(variant.competition_rules[role].some(t=>text.includes(t.toLowerCase())))return role.toUpperCase();
    const complementary={ 'VEND-BEVERAGE':['체육','헬스','사무'], 'VEND-COFFEE':['사무','학원'], 'PHOTO-PRINT':['관광','여행'], 'DOCUMENT-PRINT':['학교','대학','사무'], 'BOOTH-SING':['오락','게임'], 'LUGGAGE-HOST':['호텔','숙박','여행'] };
    if((complementary[variant.variant_id]||[]).some(t=>text.includes(t)))return 'COMPLEMENTARY';
    return 'CONTEXT';
  }
  const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
  function crossMatch(kakao,official){
    const ks=[...new Map(kakao.map(p=>[String(p.id),p])).values()],os=[...new Map(official.map(p=>[String(p.bizesId),{...p,name:p.bizesNm,lng:Number(p.lon),lat:Number(p.lat)}])).values()];
    const pairs=[];
    ks.forEach((k,i)=>os.forEach((o,j)=>{if(![k.lat,k.lng,o.lat,o.lng].every(Number.isFinite))return;const a=normalize(k.name),b=normalize(o.name),distance=W.distance(k,o);if(a.length>=2&&a===b&&distance<=35||Math.min(a.length,b.length)>=4&&(a.includes(b)||b.includes(a))&&distance<=15)pairs.push({i,j,distance,exact:a===b});}));
    // Reject ambiguous identities rather than pairing chain branches by proximity alone.
    const selected=pairs.filter(p=>pairs.filter(x=>x.i===p.i).length===1&&pairs.filter(x=>x.j===p.j).length===1),ki=new Set(selected.map(p=>p.i)),oi=new Set(selected.map(p=>p.j));
    return [...selected.map(p=>({status:'MATCHED',kakao:ks[p.i],official:os[p.j],distance:p.distance})),...ks.filter((_,i)=>!ki.has(i)).map(k=>({status:'KAKAO_ONLY',kakao:k})),...os.filter((_,i)=>!oi.has(i)).map(o=>({status:'DATA_GO_ONLY',official:o}))];
  }
  function competition(variant,point,kakao,cache,asOf){
    const records=(cache?.stores||[]).filter(p=>[Number(p.lat),Number(p.lon)].every(Number.isFinite));
    const matched=crossMatch(kakao,records).map(p=>{const source=p.kakao||p.official;return {...p,role:classify(variant,{...p.official,...source}),distance_m:W.distance(point,source)};}).filter(p=>p.distance_m<=800);
    const covers=(cache?.coverage||[]).filter(c=>W.distance(point,c.center)+800<=c.radius_m+1);
    const complete=covers.some(c=>c.complete)&&freshnessAge(cache?.retrieved_at,asOf)<=30;
    return {bands:[200,400,800].map(radius=>{const rows=matched.filter(p=>p.distance_m<=radius);const roles=Object.fromEntries(['DIRECT','SUBSTITUTE','COMPLEMENTARY','CONTEXT'].map(role=>{const r=rows.filter(p=>p.role===role);return [role,{kakao:r.filter(p=>p.kakao).length,official:records.length?r.filter(p=>p.official).length:null,matched:r.filter(p=>p.status==='MATCHED').length,unique_observed:r.length}];}));return {radius_m:radius,roles};}),records:matched,official_coverage:complete?'COMPLETE_TARGET_CIRCLE':'PARTIAL_OR_UNMEASURED',freshness: Number.isFinite(freshnessAge(cache?.retrieved_at,asOf))&&freshnessAge(cache?.retrieved_at,asOf)<=30?'CURRENT':'STALE_OR_UNKNOWN',limitations:['공식 업종·이름 분류는 실제 기기/SKU 확인이 아님','Kakao 검색은 제한된 소비자 장소 신호; 관측 개수는 전수 경쟁 밀도가 아님','동명이점·불명확한 지점은 MATCHED로 강제 결합하지 않음']};
  }
  function freshnessAge(date,asOf=new Date().toISOString().slice(0,10)){return (Date.parse(asOf)-Date.parse(date))/86400000;}
  function costStack(variant,catalog,rent,overrides={}){
    const d=DEFAULTS[variant.variant_id];if(!d)throw Error('Unprofiled variant');
    const config=catalog.configurations.find(c=>c.configuration_id===d.config);
    const quote=config?.asking_price_krw;
    const equipment=quote!=null?cell(range(quote),'PUBLIC_SOURCE',config.source_ids.join(', '),'공개 장비 호가만; 설치·VAT 미확인 항목 별도',W.freshness(config)==='STALE'?'LOW':'MEDIUM'):A(...(d.capex||[3000000,5000000,8000000]),'정확한 사양/견적 전 자본 예산 가정');
    const row=(group,key,label,value)=>({group,key,label,...value});
    const rows=[row('INITIAL','equipment','장비/서비스 준비 자본',equipment),row('INITIAL','vat_reserve','미확인 VAT 예비금',A(0,config?.vat_treatment==='INCLUDED'?0:equipment.base*.1,config?.vat_treatment==='INCLUDED'?0:equipment.high*.1,'VAT 포함 호가면 0; 미확인 호가는 10% 준비. 세무 정산액 아님')),
      row('INITIAL','installation','설치',A(300000,700000,1500000,'임시 설치 예산; 공급자 견적 필요')),row('INITIAL','delivery','반입·배송',A(100000,200000,500000,'현장 접근·중량 미확인 배송 준비금')),
      row('INITIAL','utility_work','전기·배관·통신 공사',A(0,500000,1500000,'기존 시설 사용 가능 여부에 따라 공사 견적')),
      row('INITIAL','deposit','회수 가능한 보증금',A(rent.low===null?null:rent.low*6,rent.base===null?null:rent.base*10,rent.high===null?null:rent.high*12,'월 공간비의 6/10/12배 현금 준비 가정; 반환 보장 아님')),
      row('INITIAL','key_money','권리금',A(0,0,3000000,'무권리 장소 우선 검토; 고가 권리금은 실제 입력')),
      row('INITIAL','inventory','초기 재고·소모품 / 운전자금',A(200000,500000,1000000,'물량 예측이 아닌 첫 주문/보충 준비금')),
      row('INITIAL','setup','설정·소프트웨어 초기',A(0,200000,500000,'계약/결제 설정 견적 전 준비금')),
      row('INITIAL','contingency','예비비',A(300000,700000,1500000,'미확인 설치/AS 범위에 대한 둥근 예산')),
      row('FIXED','rent','월 공간 임대료',rent),row('FIXED','management','관리비',A(50000,100000,200000,'면적/호스트에 따라 견적 교체')),
      ...[['software','소프트웨어/라이선스',30000,50000,100000],['minimum_host','최소 호스트 비용',0,0,100000],['insurance','보험',10000,30000,50000],['maintenance','정기 유지·청소',50000,100000,200000],['communications','통신',20000,30000,50000],['utilities','고정 전력·기타',30000,50000,100000]].map(([k,t,l,b,h])=>row('FIXED',k,t,A(l,b,h,'계약·사용량 전 월 예산 가정'))),
      row('VARIABLE','price','판매 단위 가격',A(...d.price,'판매가격 시험 전 기획 가정; 시장 관측 가격 아님')),
      row('VARIABLE','cogs','매입/소모품/공급자 단위비용',A(...d.cost,'정산·원가 견적 전 기획 가정')),
      row('VARIABLE','consumables','추가 소모품',A(0,0,d.price[1]*.02,'기본 원가 포함 가정; 추가분 상단 준비')),
      row('VARIABLE','payment_rate','결제 수수료 비율',A(.015,.025,.04,'결제 계약 견적 전 요율 가정')),
      row('VARIABLE','host_share','호스트 매출배분 비율',A(0,0,.1,'임대형 기본은 배분 0; 실제 계약이 임대와 배분을 병과하면 입력')),
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
  function capture(variant,area,economics,{daily_flow=null,quarter_days=91,period}={}){
    const field=DEFAULTS[variant.variant_id]?.flow;
    if(!field||['STORAGE','ORDER','EVENT'].includes(variant.economic_model))return {rate:null,reason:'여행객/계약 수요의 일일 유료 기회가 공개 유동 집계로 입증되지 않음',evidence:'UNKNOWN'};
    const flow=daily_flow??(Number(area[field])/quarter_days),transactions=economics.break_even_transactions_month/30;
    if(!Number.isFinite(flow)||flow<=0||economics.break_even_transactions_month===null)return {rate:null,evidence:'UNKNOWN',field};
    return {rate:transactions/flow,required_transactions_day:transactions,relevant_daily_flow:flow,field,evidence:'DERIVED',denominator_evidence:daily_flow!==null?'USER_INPUT':'PLANNING_ASSUMPTION',observation_period:period,normalization:daily_flow!==null?'사용자 현장 일 유동 입력':`공개 ${field} 집계 ÷ ${quarter_days}일: 분기합 해석을 선택한 검토 가정`,limitations:['원자료 시간 집계가 일 평균인지 분기 합인지 미검증; 기본 분모는 가정','상권 유동은 점포 전면 통행/고유 고객이 아님','필요 포획률은 매출 예측 또는 전환 관측치가 아님']};
  }
  function evaluate({variant,catalog,area,market,point,kakao=[],cache,settings={},overrides={},comparables=[],asOf,blockers=[]}){
    const d=DEFAULTS[variant.variant_id],areaSize=settings.area_sqm??d.area,rent=areaSize===0?{...cell(range(0),'PLANNING_ASSUMPTION','비입지 계약형','독립 임대 공간 없는 직송/외주 가정'),method:'NO_STANDALONE_SITE'}:rentEnvelope({market,area_sqm:areaSize,floor:settings.floor??'1',comparables,scope:String(area.trdar_cd),asOf,actual:settings.actual_rent??null});
    const stack=costStack(variant,catalog,rent,overrides),common={...settings,session_minutes:settings.session_minutes??d.session};
    const results=Object.fromEntries(['low','base','high'].map(k=>[k,solveStack(stack,k,common,true)])),base=results.base;
    const cap=capture(variant,area,base,{...settings,period:settings.flow_period});
    const competitors=point?competition(variant,point,kakao,cache,asOf):null;
    const sensitivity=[.75,1,1.5,2].map(multiplier=>{const volume=base.break_even_units_month===null?null:base.break_even_units_month*multiplier;return {multiplier,volume,evidence:'PLANNING_ASSUMPTION',label:'SENSITIVITY — NOT DEMAND FORECAST',...solveStack(stack,'base',{...common,volume})};});
    const recovery=[12,24,36].map(months=>({months,...solveStack(stack,'base',{...common,recovery_months:months})}));
    const cash=Object.fromEntries(['low','base','high'].map(k=>{const r=Object.fromEntries(stack.rows.map(r=>[r.key,r[k]]));return [k,{equipment:r.equipment,working_capital:r.inventory,recoverable_deposit:r.deposit,nonrecoverable_setup:sum(['installation','delivery','utility_work','setup','contingency','vat_reserve','key_money'].map(key=>r[key])),total:results[k].cash_required,cash_at_risk:results[k].capital_at_risk}];}));
    const siteCeiling=base.max_site_cost===null?null:base.max_site_cost-base.capital_at_risk/(settings.recovery_months??24);
    const count=competitors?.bands[2]?.roles.DIRECT.unique_observed;
    const gates=[
      {id:'definition',pass:!!(variant.customer_job&&variant.revenue_unit&&variant.competition_rules),reason:variant.customer_job},
      {id:'cost',pass:base.cash_required!==null&&base.monthly_fixed!==null,reason:'호가와 편집 가능한 예산 스택'},
      {id:'site',pass:rent.base!==null,reason:rent.method},
      {id:'contribution',pass:base.contribution_per_unit!==null&&base.contribution_per_unit>0,reason:'판매가격 − 단위 원가 − 비율 비용'},
      {id:'capacity',pass:base.required_utilization===null?null:base.required_utilization<=1,reason:base.required_utilization===null?'물리적 판매량 상한 현장 확인':'사용 가능 분/칸 용량과 비교'},
      {id:'capture',pass:cap.rate===null?null:cap.rate<=.01,reason:'1%는 소유자가 바꿀 수 있는 조사 문턱 가정; 성공 확률 아님'},
      {id:'competition',pass:count==null?null:count<10,reason:'800m 직접형 관측 10개 이상이면 WEAK 검토 가정; 전수/시장점유율 아님'},
      {id:'owner',pass:settings.owner_available===true?true:settings.owner_available===false?false:null,reason:variant.operational_constraints.join(' · ')},
      {id:'legal',pass:blockers.length?false:null,reason:blockers.join(' · ')||variant.legal_regulatory_unknowns.join(' · ')},
      {id:'quality',pass:null,reason:'실제 견적/현장 전환 검증 전; 추정 매력도와 신뢰도 분리'}];
    let status=blockers.length?'BLOCKED':gates.filter(g=>['contribution','capacity','capture','competition','owner'].includes(g.id)).some(g=>g.pass===false)||siteCeiling!==null&&siteCeiling<rent.base+stack.rows.find(r=>r.key==='management').base?'WEAK':gates.filter(g=>['definition','cost','site','contribution'].includes(g.id)).every(g=>g.pass===true)&&cap.rate!==null&&cap.rate<.001&&settings.owner_available===true?'PROMISING':'CHECK';
    if(!gates.filter(g=>['cost','site'].includes(g.id)).every(g=>g.pass===true)&&status!=='BLOCKED')status='CHECK';
    const confidence='LOW'; // Planning prices/costs and unverified flow grain cap v1 confidence.
    return {variant_id:variant.variant_id,label:variant.label,status,confidence,gates,rent,stack,cash,results,capture:cap,competition:competitors,sensitivity,recovery,max_site_with_recovery:siteCeiling,max_rent_with_recovery:siteCeiling===null?null:siteCeiling-stack.rows.find(r=>r.key==='management').base,next_verification:status==='BLOCKED'?blockers[0]:base.status==='CAPACITY_EXCEEDED'?'가격·사용 가능 용량을 먼저 확인':settings.volume!=null&&status==='WEAK'?'호스트 공간비를 회수 목표 이하로 협상':cap.denominator_evidence==='PLANNING_ASSUMPTION'?'출입 전면 일 유동·결제 의향을 직접 계수':'사양 특정 공급자·호스트 서면 견적',main_risk:variant.operational_constraints[0],why:DEFAULTS[variant.variant_id].flow?`${DEFAULTS[variant.variant_id].flow} 고객 신호를 사용; ${variant.customer_job}`:'계약형 수요 검증은 지도 밖에서 진행',owner_override:settings.owner_override||null};
  }
  function topPlays(evaluations,selected){const order={PROMISING:0,CHECK:1,WEAK:2,BLOCKED:3};const sorted=[...evaluations].sort((a,b)=>order[a.status]-order[b.status]||(a.results.base.required_utilization??0)-(b.results.base.required_utilization??0)||a.cash.base.cash_at_risk-b.cash.base.cash_at_risk||a.variant_id.localeCompare(b.variant_id));const preferred=sorted.find(r=>r.variant_id===selected);return [...(preferred?[preferred]:[]),...sorted.filter(r=>r!==preferred)].slice(0,3);}
  function floorClass(floor){return String(floor).startsWith('-')||/B|지하/i.test(String(floor))?'BASEMENT':String(floor)==='1'?'GROUND':'UPPER';}
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
  return {CLASSES,DEFAULTS,range,cell,freshness,resolveMarket,rentEnvelope,classify,crossMatch,competition,costStack,solveStack,capture,evaluate,topPlays,importComparables,comparableStats,buildingCompatibility};
});
