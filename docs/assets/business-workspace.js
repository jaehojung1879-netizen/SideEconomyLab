/* Public POI interpretation + private, versioned local workspace. No network writes. */
(function(root,factory){const E=typeof module==='object'&&module.exports?require('./economics.js'):root.BusinessEconomics;const api=factory(E);if(typeof module==='object'&&module.exports)module.exports=api;else root.BusinessWorkspace=api;})(typeof window==='object'?window:globalThis,E=>{
  'use strict';
  const KEY='SideEconomyLab.business-workbench.v1';
  const SITE_NUMBERS=['area_sqm','deposit','rent','management','key_money','host_share','contract_months'];
  const SITE_TEXT=['name','address','floor','source','observed_at','notes','commercial_area_id'];
  const SITE_KINDS=['HYPOTHETICAL','USER_OBSERVED','SPECIFIC_LISTING','HOST_QUOTE'];
  const COMMERCIAL=['OWNED','RENTED','HOST_PLACEMENT','SUBCONTRACTED'];
  const empty=()=>({schema_version:1,sites:[],scenarios:[]});
  const copy=x=>JSON.parse(JSON.stringify(x));
  const id=()=>typeof crypto==='object'&&crypto.randomUUID?crypto.randomUUID():'local-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  function text(x,max=4000){if(typeof x!=='string'||x.length>max)throw new Error('Invalid text');return x;}
  function keys(o,allowed){if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!allowed.includes(k)))throw new Error('Invalid record fields');}
  function number(x,key){if(x!==null&&(typeof x!=='number'||!Number.isFinite(x)||x<0))throw new Error('Invalid number: '+key);return x;}
  function cell(x,key){keys(x,['value','kind','source']);if(!E.KINDS.includes(x.kind))throw new Error('Unknown evidence label');if(x.source!==null)text(x.source);E.value(x,key);return {value:x.value??null,kind:x.kind,source:x.source??null};}
  function site(seed={}){
    const s={site_id:id(),name:seed.name||'가상 사이트',lat:seed.lat??null,lng:seed.lng??null,address:'',floor:'',source:'',observed_at:'',notes:'',commercial_area_id:seed.commercial_area_id||'',evidence_status:'HYPOTHETICAL'};
    SITE_NUMBERS.forEach(k=>s[k]=E.input());return s;
  }
  function scenario(variant,siteId,configId=null,commercial=variant.commercial_models[0]){
    return {scenario_id:id(),name:variant.label,variant_id:variant.variant_id,site_id:siteId,configuration_id:configId,custom_configuration:'',commercial_model:commercial,inputs:Object.fromEntries(E.fields(variant.economic_model).map(k=>[k,E.input()])),judgment:{rating:'NEUTRAL',confidence:null,rationale:'',key_observation:'',change_evidence:''}};
  }
  function validate(raw,catalog){
    keys(raw,['schema_version','sites','scenarios']);if(raw.schema_version!==1||!Array.isArray(raw.sites)||!Array.isArray(raw.scenarios)||raw.sites.length>100||raw.scenarios.length>100)throw new Error('Unsupported workspace or too many records');
    const variants=new Map(catalog.variants.map(v=>[v.variant_id,v])),configs=new Map(catalog.configurations.map(c=>[c.configuration_id,c]));
    const ids=new Set();
    const sites=raw.sites.map(s=>{
      keys(s,['site_id','lat','lng','evidence_status',...SITE_TEXT,...SITE_NUMBERS]);text(s.site_id,200);if(!s.site_id||ids.has(s.site_id))throw new Error('Duplicate site');ids.add(s.site_id);
      const n={site_id:s.site_id,evidence_status:s.evidence_status};if(!SITE_KINDS.includes(s.evidence_status))throw new Error('Unknown site evidence');
      SITE_TEXT.forEach(k=>n[k]=text(s[k]));
      if(!n.name.trim())throw new Error('Site name required');
      if(n.observed_at&&(!/^\d{4}-\d{2}-\d{2}$/.test(n.observed_at)||!Number.isFinite(Date.parse(n.observed_at))||new Date(n.observed_at).toISOString().slice(0,10)!==n.observed_at))throw new Error('Invalid observation date');
      if(['SPECIFIC_LISTING','HOST_QUOTE'].includes(s.evidence_status)&&(!n.source.trim()||!n.observed_at))throw new Error('Specific evidence requires source and date');
      for(const [k,min,max] of [['lat',33,39],['lng',124,132]]){const x=s[k];if(x!==null&&(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max))throw new Error('Unsupported coordinates');n[k]=x;}
      if((n.lat===null)!==(n.lng===null))throw new Error('Coordinate pair required');
      SITE_NUMBERS.forEach(k=>{n[k]=cell(s[k],k);number(n[k].value,k);if(k==='host_share'&&n[k].value!==null&&n[k].value>1)throw new Error('Invalid share');if(['area_sqm','contract_months'].includes(k)&&n[k].value===0)throw new Error('Positive site value required');});return n;
    });
    ids.clear();
    const scenarios=raw.scenarios.map(s=>{
      keys(s,['scenario_id','name','variant_id','site_id','configuration_id','custom_configuration','commercial_model','inputs','judgment']);text(s.scenario_id,200);text(s.name);text(s.custom_configuration);if(!s.scenario_id||ids.has(s.scenario_id))throw new Error('Duplicate scenario');ids.add(s.scenario_id);
      const v=variants.get(s.variant_id);if(!v||!sites.some(t=>t.site_id===s.site_id)||!v.commercial_models.includes(s.commercial_model))throw new Error('Invalid scenario linkage');
      if(s.configuration_id!==null){const c=configs.get(s.configuration_id);if(!c||!c.variant_ids.includes(s.variant_id)||!compatible(c,s.commercial_model))throw new Error('Incompatible configuration');}
      keys(s.inputs,E.fields(v.economic_model));const inputs=Object.fromEntries(E.fields(v.economic_model).map(k=>[k,cell(s.inputs[k]||E.input(),k)]));
      keys(s.judgment,['rating','confidence','rationale','key_observation','change_evidence']);const j=s.judgment;if(!['STRONG','NEUTRAL','WEAK'].includes(j.rating)||j.confidence!==null&&(typeof j.confidence!=='number'||!Number.isFinite(j.confidence)||j.confidence<0||j.confidence>100))throw new Error('Invalid analyst judgment');
      ['rationale','key_observation','change_evidence'].forEach(k=>text(j[k]));const checked={...s,inputs,judgment:copy(j)};E.solve(v.economic_model,inputsFor(checked,sites.find(t=>t.site_id===s.site_id)));return checked;
    });return {schema_version:1,sites,scenarios};
  }
  function compatible(c,commercial){return commercial==='SUBCONTRACTED'?c.structure==='SERVICE':commercial==='OWNED'?c.structure==='BUY':!String(c.compatibility).includes('OWNERSHIP_NOT_AUTHORIZED');}
  function cloneScenario(s,{siteId=s.site_id}={}){return {...copy(s),scenario_id:id(),name:s.name+' · 복사',site_id:siteId};}
  function inputsFor(s,site){const inputs=copy(s.inputs);for(const k of ['deposit','rent','management','key_money','host_share'])inputs[k]=copy(site[k]);return inputs;}
  function save(storage,raw,catalog){const checked=validate(raw,catalog);storage.setItem(KEY,exportJSON(checked,catalog));return checked;}
  function load(storage,catalog){const s=storage.getItem(KEY);return s===null?empty():importJSON(s,catalog);}
  function importJSON(serialized,catalog){if(typeof serialized!=='string'||serialized.length>2000000||new TextEncoder().encode(serialized).byteLength>2000000)throw new Error('Import too large');return validate(JSON.parse(serialized),catalog);}
  function exportJSON(raw,catalog){const s=JSON.stringify(validate(raw,catalog),null,2);if(new TextEncoder().encode(s).byteLength>2000000)throw new Error('Workspace exceeds 2MB backup limit');return s;}
  function distance(a,b){const rad=x=>x*Math.PI/180,dlat=rad(b.lat-a.lat),dlng=rad(b.lng-a.lng);return 6371000*2*Math.asin(Math.min(1,Math.sqrt(Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlng/2)**2)));}
  function role(variant,poi){const t=[poi.name,poi.category].join(' ').toLowerCase();for(const r of ['direct','substitute'])if(variant.competition_rules[r].some(token=>t.includes(token.toLowerCase())))return r.toUpperCase();return 'CONTEXT';}
  function competition(variant,site,layer){
    const validPoint=p=>p&&typeof p.lat==='number'&&Number.isFinite(p.lat)&&typeof p.lng==='number'&&Number.isFinite(p.lng);
    if(!validPoint(site)||!layer?.candidates)return {status:'UNKNOWN',source:'Kakao cached POI',bands:[],nearest:[],limitations:['사이트 좌표 또는 POI 관측 없음; UNKNOWN ≠ 0']};
    // Union of public observations, deduplicated by provider ID; never reuse center distances for a private site.
    const rows=new Map(),circles=[];
    Object.values(layer.candidates).forEach(c=>(Array.isArray(c?.areas)?c.areas:[]).forEach(a=>{
      if(validPoint(a))circles.push({distance:distance(site,a),queries:Array.isArray(a.query_stats)?a.query_stats:[]});
      (Array.isArray(a.pois)?a.pois:[]).forEach(p=>{if(validPoint(p)&&typeof p.id==='string'&&typeof p.name==='string'&&!rows.has(p.id)){const d=distance(site,p);if(d<=800)rows.set(p.id,{...p,distance_m:d,role:role(variant,p)});}});
    }));
    const observed=[...rows.values()].sort((a,b)=>a.distance_m-b.distance_m);
    const bands=[200,400,800].map(radius=>{
      const nearby=circles.filter(c=>c.distance+radius<=Number(layer.radius_m));
      const coverage=nearby.length===0?'OUTSIDE_SAMPLED_CIRCLE':nearby.some(c=>c.queries.some(q=>q.error||q.truncated))?'PARTIAL_OR_CAPPED':'SEARCH_PROXY_ONLY';
      const within=observed.filter(p=>p.distance_m<=radius);
      return {radius,coverage,counts:rows.size===0&&nearby.length===0?{DIRECT:null,SUBSTITUTE:null,CONTEXT:null}:Object.fromEntries(['DIRECT','SUBSTITUTE','CONTEXT'].map(r=>[r,within.filter(p=>p.role===r).length])),nearest:Object.fromEntries(['DIRECT','SUBSTITUTE','CONTEXT'].map(r=>[r,within.find(p=>p.role===r)?.distance_m??null]))};
    });
    return {status:'OBSERVED_PROXY_ONLY',source:layer.generated_from||'Kakao Local REST API',observed_at:layer.collected_at||null,bands,nearest:['DIRECT','SUBSTITUTE','CONTEXT'].flatMap(r=>observed.filter(p=>p.role===r).slice(0,3)),limitations:['관측 수는 검색 표본의 하한; 직접/대체는 이름·분류 기반 프록시이며 실제 서비스 확인 전 확정 경쟁 아님.','200/400/800m는 사이트 WGS84 직선거리 재계산; 보행·건물내 접근 아님.','가까운 검색 15개·800m 상권 중심·후보별 검색 편향; 미관측/0은 공급 부재의 증거 아님.','편의점은 음료/커피 대체형; 모든 판매기의 직접 경쟁으로 분류하지 않음. 공유오피스는 통화부스 대체형.']};
  }
  function freshness(row,asOf=new Date().toISOString().slice(0,10),days=30){const age=(Date.parse(asOf)-Date.parse(row.observed_at))/86400000;return row.freshness==='STALE'||!Number.isFinite(age)||age<0||age>days?'STALE':'CURRENT_OBSERVATION';}
  return {KEY,SITE_NUMBERS,SITE_TEXT,SITE_KINDS,COMMERCIAL,empty,copy,site,scenario,validate,compatible,cloneScenario,inputsFor,save,load,importJSON,exportJSON,distance,role,competition,freshness};
});
