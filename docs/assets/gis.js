const DATA_URL='./data/seoul-opportunity-map.json';
const POI_URL='./data/kakao-poi-layer.json';
const SITE_URL='./data/site-observations.json';
const CONFIG_URL='./data/map-runtime.json';
const REGISTRY_URL='./data/candidate-registry.json';
const INTELLIGENCE_URL='./data/opportunity-intelligence.json';
const REAL_ESTATE_URL='./data/real-estate-context.json';
let FIELDS={},CANDIDATES={},registry=null;
const QUADRANTS={A:'고수요 · 낮은 관측공급',B:'고수요 · 높은 관측공급',C:'90점 미만 · 낮은 관측공급',D:'90점 미만 · 높은 관측공급',E:'미측정 / 판정 보류'};
const QUADRANT_COLORS={A:'#00856a',B:'#d24d67',C:'#36a99c',D:'#8b65ba',E:'#8894a2'};
proj4.defs('EPSG:5181','+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs');
const state={data:null,poiData:null,evidence:null,supplies:new Map(),mode:'demand',sort:'demand',district:'',supplyFilter:'all',quadrant:'all',sites:[],candidate:'booth',threshold:85,query:'',adapter:null,selectedArea:null,ranked:[],visible:[],limit:30,coordinates:new Map(),percentiles:new Map(),rankByCode:new Map()};
const $=id=>document.getElementById(id);
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmt(n){return n==null||!Number.isFinite(Number(n))?'—':Math.round(Number(n)).toLocaleString('ko-KR');}
function scoreColor(s){return s>=95?'#ef476f':s>=90?'#ff9f1c':s>=80?'#ffd166':'#3a86ff';}
function safePlaceUrl(value){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&u.hostname==='place.map.kakao.com'?u.href:'';}catch{return '';}}
function toLatLng(a){
  if(state.coordinates.has(a))return state.coordinates.get(a);
  const x=Number(a.x_epsg5181),y=Number(a.y_epsg5181);
  if(!Number.isFinite(x)||!Number.isFinite(y)||(!x&&!y))return null;
  const [lng,lat]=proj4('EPSG:5181','EPSG:4326',[x,y]);
  const result=Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=33&&lat<=39&&lng>=124&&lng<=132?[lat,lng]:null;
  state.coordinates.set(a,result);return result;
}
function currentScore(a){const value=a.scores?.[state.candidate];return typeof value==='number'&&Number.isFinite(value)?value:null;}
function poiAreaFor(code){
  const areas=state.poiData?.candidates?.[state.candidate]?.areas;
  if(!Array.isArray(areas))return null;
  const area=areas.find(x=>x&&String(x.trdar_cd)===String(code));
  return area?{...area,query_stats:Array.isArray(area.query_stats)?area.query_stats.filter(x=>x&&typeof x==='object'):[],pois:Array.isArray(area.pois)?area.pois.filter(x=>x&&typeof x==='object'):[]}:null;
}
function supplyFor(a){return state.supplies.get(String(a.trdar_cd))||{status:'UNMEASURED',relevant_count:null,nearest_m:null,within_m:{},quadrant:'E',classified_pois:[]};}
function evidenceCandidate(){return state.evidence?.candidates?.[state.candidate];}
function indexSupply(){state.supplies.clear();const rows=evidenceCandidate()?.areas;if(Array.isArray(rows))rows.forEach(r=>state.supplies.set(String(r.trdar_cd),r));}
function markerColor(a){const e=supplyFor(a);if(state.mode==='demand')return scoreColor(currentScore(a));if(state.mode==='quadrant')return QUADRANT_COLORS[e.quadrant]||QUADRANT_COLORS.E;return e.quadrant==='E'?QUADRANT_COLORS.E:['A','C'].includes(e.quadrant)?'#00856a':'#8b38b5';}
function renderCoverage(){
  const c=evidenceCandidate(),date=state.evidence?.collected_at||'수집일 미기록';
  $('coverage').textContent=c?`공급 조사 ${c.measured_count} / ${state.data.areas.length} · 불완전 ${c.partial_count} · ${state.evidence.radius_m}m · 오류 ${fmt(state.evidence.query_error_count)} · ${date}`:'공급 분석 미검증 · 미측정을 0으로 계산하지 않음';
  $('data-status').textContent=`서울 ${fmt(state.data.areas.length)} 상권 · 수요 ${state.data.periods?.flow||'—'} · 공급 ${c?c.measured_count:'—'}곳 · 실제 후보지 ${state.sites.length}개`;
  const legend=state.mode==='demand'?[[scoreColor(95),'95+'],[scoreColor(90),'90+'],[scoreColor(80),'80+'],[scoreColor(0),'80 미만']]:state.mode==='quadrant'?Object.entries(QUADRANTS).map(([k,v])=>[QUADRANT_COLORS[k],k+' '+v]):[['#00856a','낮은 관측공급'],['#8b38b5','높은 관측공급'],[QUADRANT_COLORS.E,'미측정 / 판정 보류']];
  $('map-legend').innerHTML=legend.map(([color,label])=>`<span><i style="background:${color}"></i>${label}</span>`).join('')+'<span><i style="background:#7c4dff"></i>선택 POI</span><span><i style="background:#0b8f72"></i>실제 후보지</span>';
}
function buildPercentiles(){
  const areas=state.data.areas;
  Object.keys(FIELDS).forEach(field=>{
    const ordered=areas.map((a,i)=>({i,value:Number(a[field]||0)})).sort((a,b)=>a.value-b.value);
    let start=0;
    while(start<ordered.length){let end=start;while(end+1<ordered.length&&ordered[end+1].value===ordered[start].value)end++;
      const percentile=areas.length>1?(start+end)/2/(areas.length-1):0;
      for(let k=start;k<=end;k++){const a=areas[ordered[k].i];if(!state.percentiles.has(a))state.percentiles.set(a,{});state.percentiles.get(a)[field]=percentile;}
      start=end+1;
    }
  });
}
function signals(a){return Object.entries(CANDIDATES[state.candidate].weights).map(([field,weight])=>({field,weight,percentile:state.percentiles.get(a)?.[field]||0})).sort((x,y)=>y.weight*y.percentile-x.weight*x.percentile);}
function reasonTag(a){const s=signals(a)[0];return s?`${FIELDS[s.field]} 백분위 ${Math.round(s.percentile*100)}`:'';}
function usableSites(data){
  if(data?.schema_version!==1||!Array.isArray(data.sites))return [];
  const ids=new Set();return data.sites.filter(s=>{
    const valid=s&&typeof s.site_id==='string'&&s.site_id&&!ids.has(s.site_id)&&Object.values(CANDIDATES).some(c=>c.id===s.candidate_id)&&typeof s.lat==='number'&&typeof s.lng==='number'&&Number.isFinite(s.lat)&&Number.isFinite(s.lng)&&s.lat>=33&&s.lat<=39&&s.lng>=124&&s.lng<=132;
    if(valid)ids.add(s.site_id);return valid;
  });
}
function renderSelected(){
  const host=$('selected-card'),a=state.selectedArea;
  if(!a){host.innerHTML='<p class="empty-state">지도나 입지 목록에서 상권을 선택하세요.</p>';return;}
  const candidate=CANDIDATES[state.candidate],supply=poiAreaFor(a.trdar_cd),rank=state.rankByCode.get(String(a.trdar_cd));
  const failed=(supply?.query_stats||[]).filter(q=>q.error).length;
  const tags=(supply?.query_stats||[]).filter(q=>!q.error).map(q=>`<span class="poi-chip">${esc(q.query)} · 검색 ${fmt(q.total_count)}건</span>`).join('');
  const evidence=supplyFor(a),cohort=evidenceCandidate();
  const roles=new Map((evidence.classified_pois||[]).map(p=>[String(p.id),p.role]));
  const links=(supply?.pois||[]).filter(p=>!state.evidence||['direct_proxy','substitute_proxy'].includes(roles.get(String(p.id)))).slice(0,5).map(p=>{const url=safePlaceUrl(p.place_url);return url?`<a href="${esc(url)}" target="_blank" rel="noopener">${esc(p.name)} · ${roles.get(String(p.id))==='direct_proxy'?'직접 경쟁형':roles.get(String(p.id))==='substitute_proxy'?'대체형':'문맥/미확인'} · ${p.distance_m==null?'거리 미상':fmt(p.distance_m)+'m'} ↗</a>`:'';}).join('');
  const signalRows=signals(a).slice(0,3).map(s=>`<li>${FIELDS[s.field]} · 서울 백분위 <b>${Math.round(s.percentile*100)}</b><div class="signal-detail">기존 점수 비중 ${Math.round(s.weight*100)}% · 공개 집계 ${fmt(a[s.field])}</div></li>`).join('');
  const metricFields=candidate.metric_fields;
  const localSites=state.sites.filter(s=>s.candidate_id===candidate.id&&String(s.commercial_area_id)===String(a.trdar_cd));
  host.innerHTML=`<button class="wb-map-create" onclick="window.dispatchEvent(new Event('sideeconomy:create-scenario'))">이 지도 위치로 PRIVATE 시나리오 구성</button><div class="selected-title">${esc(a.trdar_name)}</div><div class="selected-sub">${esc(a.district)} ${esc(a.dong)} · ${esc(a.trdar_cd)}<br>${candidate.id} · ${candidate.label}</div>
    <div class="score-card"><div><span>수요 적합도</span><b>${currentScore(a).toFixed(1)}</b><small>100점 기준</small></div><div><span>서울 내 수요 순위</span><b>#${rank}</b><small>/ ${fmt(state.data.areas.length)} · 동점 동일 순위</small></div></div>
    <section class="decision-section supply-section"><h3><span class="kind">DATA / DERIVED</span>OBSERVED SUPPLY · 관측공급</h3>${!state.poiData?'<p>POI 데이터를 불러오지 못했습니다. 수요 지도는 이용할 수 있습니다.</p>':''}<p>${evidence.status==='MEASURED'?'조사됨':evidence.status==='PARTIAL'?'불완전 조사 · 비교 제외':'미측정 / 분석 미검증'}</p><div class="metrics"><div><span>관련 POI (직접형 + 대체형)</span><b>${fmt(evidence.relevant_count)}</b></div><div><span>가장 가까운 관련 POI</span><b>${evidence.nearest_m==null?'관측 없음/미상':fmt(evidence.nearest_m)+'m'}</b></div><div><span>200m / 400m / 800m</span><b>${[200,400,800].map(m=>fmt(evidence.within_m?.[m])).join(' / ')}</b></div><div><span>직접형 / 대체형</span><b>${fmt(evidence.direct_proxy_count)} / ${fmt(evidence.substitute_proxy_count)}</b></div></div><p>원시 ${fmt(evidence.raw_poi_count)} · 문맥/미확인 ${fmt(evidence.context_count)} · 검색 실패 ${fmt(evidence.query_errors)}건</p>${evidence.truncated?'<p class="caution">검색 결과 제한 있음 · 낮은 공급 판정은 보류합니다.</p>':''}<details class="poi-details"><summary>검색별 건수·가까운 관련 POI</summary><div class="poi-chips">${tags}</div><div class="poi-list">${links||'<p>0개 관측과 미측정은 다릅니다. 경쟁 부재를 증명하지 않습니다.</p>'}</div></details></section>
    <section class="decision-section"><h3><span class="kind">DERIVED SIGNAL</span>RESEARCH QUADRANT</h3><b class="quadrant-label" style="border-color:${QUADRANT_COLORS[evidence.quadrant]}">${evidence.quadrant} · ${QUADRANTS[evidence.quadrant]}</b><p>고수요 ≥ ${state.evidence?.high_demand_min??90}점 · 낮은 관측공급 ≤ 후보별 조사 표본 중앙값 ${esc(cohort?.reference_median??'—')}개 (${fmt(cohort?.reference_count)}곳). 서울 전체 공급 기준이 아닙니다.</p><p>${evidence.quadrant==='E'?esc({'incomplete collection':'검색 실패·정의 불일치 또는 유효하지 않은 관측입니다.','insufficient or invariant reference':'10곳 미만이거나 관측 개수가 같아 비교 기준이 없습니다.','capped results cannot establish lower observed supply':'검색 결과가 제한되어 낮은 공급 판정을 보류합니다.'}[evidence.quadrant_reason]||'공급 미측정 또는 원본과 일치하는 분석이 없습니다.'):['A','C'].includes(evidence.quadrant)?'상대적으로 적은 관측공급: 공백 가능성을 현장에서 검증할 연구 목록입니다.':'많은 관측공급: 직접 경쟁인지, 수요 집적/보완 서비스인지 현장에서 구분하세요.'}</p><p class="caution">Kakao 검색 프록시 · 전수조사 아님. ${esc(candidate.competition.risk)}</p></section>
    <section class="decision-section"><h3><span class="kind">DERIVED SIGNAL</span>왜 살펴볼 만한가</h3><ul>${signalRows}</ul><p>가중 수요 신호입니다. 경쟁·비용을 반영한 사업성 판단은 아직 아닙니다.</p></section>
    <section class="decision-section"><h3><span class="kind">DATA</span>수요 원자료</h3><div class="metrics">${metricFields.map(f=>`<div><span>${FIELDS[f]}</span><b>${fmt(a[f])}</b></div>`).join('')}</div><p>서울 공개 상권 집계 · 분기와 원자료 정의는 데이터·방법 참조.</p></section>
    ${RealEstateContext.render(a,state.realEstate)}
    <section class="decision-section"><h3><span class="kind">UNKNOWN / DATA</span>SITE ECONOMICS · 실제 조건</h3><p>${localSites.length?'아래 후보지에 관측된 조건만 표시합니다. 누락은 UNKNOWN입니다.':'UNKNOWN · 임대료·보증금·관리비·호스트 수익배분·실제 가용 공간 미확인'}</p><p>전환율·이용률·운영 비용 미확인 · 종합 기회점수 없음</p></section>
    <section class="decision-section"><h3><span class="kind">UNKNOWN / FIELD CHECK</span>OPERABILITY · 운영 가능성</h3><p>전력·환기·접근·보충 동선·설치 허용·호스트 책임·법적 제약은 현장에서 확인해야 합니다.</p></section>
    <section class="decision-section"><h3><span class="kind">DATA / UNKNOWN</span>VALIDATION · 검증 증거</h3><p>후보 설계 단계: ${esc(candidate.research_status)}. 현장 인터뷰·견적·유료거래·파일럿 증거는 별도 기록으로 확인해야 합니다.</p></section>
    <section class="decision-section"><h3><span class="kind">FIELD CHECK</span>다음 현장 확인</h3><ol>${[...candidate.next_actions,...candidate.checks].map(c=>`<li>${c}</li>`).join('')}</ol><a class="area-link" href="https://map.kakao.com/link/map/${encodeURIComponent(a.trdar_name)},${toLatLng(a).join(',')}" target="_blank" rel="noopener">카카오맵에서 주변 살펴보기 ↗</a></section>
    <section class="decision-section"><h3>실제 후보지 관찰</h3>${localSites.length?localSites.map(s=>`<div class="site-info">${esc(s.name||s.site_id)} · ${esc(s.status||'상태 미기록')}<br>${esc(s.address||'주소 미기록')}<br>임대료 ${s.rent==null?'미확인':fmt(s.rent)+'원'} · 보증금 ${s.deposit==null?'미확인':fmt(s.deposit)+'원'}<br>호스트 ${esc(s.host_type||'UNKNOWN')} · 수익배분 ${s.revenue_share==null?'UNKNOWN':esc(s.revenue_share*100)+'%'} · 면적 ${s.area_sqm==null?'UNKNOWN':esc(s.area_sqm)+'㎡'}<br>관측 ${esc(s.observed_at||'미기록')} · 출처 ${esc(s.source||'미기록')}<br>${esc(s.field_note||'현장 메모 미기록')}</div>`).join(''):'<p>등록된 후보지가 없습니다. 확인한 건물·호스트·현장 조건을 별도 관찰 기록으로 연결할 수 있습니다.</p>'}</section>`;
}
function renderPoi(){
  const rows=[];let radius=null;
  const supply=state.selectedArea&&poiAreaFor(state.selectedArea.trdar_cd);
  const roles=new Map((state.selectedArea?supplyFor(state.selectedArea).classified_pois:[]).map(p=>[String(p.id),p.role]));
  if($('show-poi').checked&&supply){
    (supply.pois||[]).forEach(p=>{if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng))return;const url=safePlaceUrl(p.place_url);const role=roles.get(String(p.id))||'context';rows.push({role,position:[p.lat,p.lng],name:p.name,html:`<div class="map-popup"><h3>${esc(p.name)}</h3><p>${role==='direct_proxy'?'직접 경쟁형 프록시':role==='substitute_proxy'?'대체형 프록시':'문맥/미확인'}</p><p>${esc(p.category)} · ${p.distance_m==null?'거리 미상':fmt(p.distance_m)+'m'}</p><p>${esc(p.address)}</p>${url?`<a href="${esc(url)}" target="_blank" rel="noopener">카카오 장소 보기 ↗</a>`:''}</div>`});});
    if(Number.isFinite(supply.lat)&&Number.isFinite(supply.lng))radius={position:[supply.lat,supply.lng],meters:Number(state.poiData.radius_m||800)};
  }
  state.adapter.pois(rows,radius);
}
function renderSites(){
  const sites=state.sites.filter(s=>s.candidate_id===CANDIDATES[state.candidate].id);
  $('site-count').textContent=sites.length;
  state.adapter.sites($('show-sites').checked?sites.map(s=>({position:[s.lat,s.lng],name:s.name||s.site_id,html:`<div class="map-popup"><h3>${esc(s.name||s.site_id)}</h3><p>${esc(s.address||'')}</p><p>임대료 ${s.rent==null?'미확인':fmt(s.rent)+'원'} · 보증금 ${s.deposit==null?'미확인':fmt(s.deposit)+'원'}</p><p>${esc(s.field_note||'현장 메모 미기록')}</p></div>`})):[]);
}
function selectArea(a,{pan=true,openSheet=true}={}){
  state.selectedArea=a;if(a&&pan)state.adapter.focus(toLatLng(a));
  renderSelected();renderPoi();state.adapter.selected(a?toLatLng(a):null);
  window.dispatchEvent(new CustomEvent('sideeconomy:area-selected',{detail:{area:a,position:a?toLatLng(a):null,candidate_id:CANDIDATES[state.candidate].id,poiLayer:state.poiData}}));
  document.querySelectorAll('.top-item').forEach(b=>b.classList.toggle('active',a&&b.dataset.code===String(a.trdar_cd)));
  if(openSheet&&matchMedia('(max-width:800px)').matches&&document.body.dataset.sheet!=='decision')setSheet('decision');
}
function matchesQuery(a){const q=state.query.trim().toLowerCase();return !q||[a.trdar_name,a.district,a.dong,a.trdar_cd].some(v=>String(v||'').toLowerCase().includes(q));}
function render(){
  if(!state.data||!state.adapter)return;
  indexSupply();renderCoverage();
  state.ranked=state.data.areas.map(a=>({a,score:currentScore(a),position:toLatLng(a)})).filter(x=>x.score!==null).sort((x,y)=>y.score-x.score||String(x.a.trdar_cd).localeCompare(String(y.a.trdar_cd)));
  state.rankByCode.clear();let rank=1;
  state.ranked.forEach((x,i)=>{if(i&&x.score!==state.ranked[i-1].score)rank=i+1;state.rankByCode.set(String(x.a.trdar_cd),rank);});
  state.visible=state.ranked.filter(x=>{
    const e=supplyFor(x.a);
    return x.position&&x.score>=state.threshold&&matchesQuery(x.a)&&(!state.district||x.a.district===state.district)&&(state.supplyFilter==='all'||e.status===state.supplyFilter)&&(state.quadrant==='all'||e.quadrant===state.quadrant)&&(state.sort!=='whitespace'||['A','C'].includes(e.quadrant));
  });
  if(state.sort!=='demand')state.visible.sort((x,y)=>{
    const a=supplyFor(x.a),b=supplyFor(y.a);
    return (a.status!=='MEASURED')-(b.status!=='MEASURED')||(a.relevant_count??Infinity)-(b.relevant_count??Infinity)||y.score-x.score||String(x.a.trdar_cd).localeCompare(String(y.a.trdar_cd));
  });
  $('navigator-note').textContent='왼쪽 숫자는 서울 내 수요 순위 · 공급 정렬/연구 목록은 종합 사업성 순위가 아닙니다.';
  $('ranking-title').textContent=state.sort==='whitespace'?'공백 가능성 연구 목록':state.sort==='supply'?'낮은 관측공급 탐색':'수요 순위 탐색';
  if(state.selectedArea&&!state.visible.some(x=>x.a===state.selectedArea))state.selectedArea=null;
  state.adapter.demand($('show-demand').checked?state.visible.map(x=>({area:x.a,position:x.position,score:x.score,color:markerColor(x.a)})):[],a=>selectArea(a));
  $('visible-count').textContent=fmt(state.visible.length);$('area-count').textContent=fmt(state.data.areas.length);
  const top=state.visible.slice(0,state.limit);
  $('top-list').innerHTML=top.map(x=>{const e=supplyFor(x.a);return `<button class="top-item" data-code="${esc(x.a.trdar_cd)}"><span class="rank">${state.rankByCode.get(String(x.a.trdar_cd))}</span><span class="name">${esc(x.a.trdar_name)}</span><span class="score">${x.score.toFixed(1)}</span><span class="sub">${esc(x.a.district)} ${esc(x.a.dong)} · ${e.status==='MEASURED'?'관련 '+fmt(e.relevant_count)+'개':e.status==='PARTIAL'?'불완전 조사':'공급 미측정'}</span><span class="quadrant-tag" data-quadrant="${e.quadrant}">${e.quadrant} · ${QUADRANTS[e.quadrant]}${e.truncated?' · 결과 제한':''}</span><span class="reason-tag">${reasonTag(x.a)}</span></button>`;}).join('')||'<p class="empty-state">조건에 맞는 상권이 없습니다. 검색·점수·사분면 조건을 조정하세요.</p>';
  $('load-more').hidden=state.visible.length<=state.limit;
  document.querySelectorAll('.top-item').forEach(b=>b.onclick=()=>selectArea(top.find(x=>String(x.a.trdar_cd)===b.dataset.code).a));
  selectArea(state.selectedArea||top[0]?.a||null,{pan:false,openSheet:false});renderSites();
}
function setSheet(sheet){const current=document.body.dataset.sheet;const next=sheet==='close'||current===sheet?'':sheet;document.body.dataset.sheet=next;if(next==='filters')$('filter-panel').open=true;document.querySelectorAll('.mobile-tabs button').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.sheet===next)));}
async function fetchJson(url,required=false){try{
  const r=await fetch(url,{cache:'no-cache'});if(!r.ok){if(url===REAL_ESTATE_URL&&[404,410].includes(r.status))return null;throw new Error('Dataset unavailable');}const bytes=await r.arrayBuffer();const value=JSON.parse(new TextDecoder().decode(bytes));
  if([DATA_URL,POI_URL,REGISTRY_URL].includes(url)&&value&&typeof value==='object'){
    const digest=await crypto.subtle.digest('SHA-256',bytes);Object.defineProperty(value,'_contentHash',{value:Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('')});
  }return value;
}catch{if(required)throw new Error('Demand dataset unavailable');return url===REAL_ESTATE_URL?{source_error:true}:null;}}
function bindControls(){
  $('candidate').onchange=e=>{state.candidate=e.target.value;state.selectedArea=null;state.limit=30;render();};
  $('area-search').oninput=e=>{state.query=e.target.value;state.limit=30;render();};
  $('search-clear').onclick=()=>{$('area-search').value='';state.query='';state.limit=30;render();};
  const threshold=value=>{state.threshold=Number(value);$('threshold').value=value;$('threshold-value').textContent=value;state.limit=30;render();};
  $('threshold').oninput=e=>threshold(e.target.value);document.querySelectorAll('[data-threshold]').forEach(b=>b.onclick=()=>threshold(b.dataset.threshold));
  ['map-mode','sort-order','district-filter','supply-filter','quadrant-filter'].forEach(id=>$(id).onchange=e=>{
    const field={'map-mode':'mode','sort-order':'sort','district-filter':'district','supply-filter':'supplyFilter','quadrant-filter':'quadrant'}[id];state[field]=e.target.value;state.limit=30;
    if(field==='quadrant'&&['C','D'].includes(state.quadrant)||field==='sort'&&state.sort==='whitespace'){state.threshold=0;$('threshold').value=0;$('threshold-value').textContent='0';}
    render();
  });
  $('show-demand').onchange=render;$('show-poi').onchange=()=>state.adapter&&renderPoi();$('show-sites').onchange=()=>state.adapter&&renderSites();
  $('load-more').onclick=()=>{state.limit+=30;render();};$('seoul-view').onclick=()=>state.adapter?.overview();
  document.querySelectorAll('[data-sheet]').forEach(b=>b.onclick=()=>setSheet(b.dataset.sheet));
  document.querySelectorAll('[data-dialog]').forEach(b=>b.onclick=()=>$(b.dataset.dialog).showModal());
  document.querySelectorAll('[data-close-dialog]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
  document.addEventListener('keydown',e=>{if(e.key==='Escape')setSheet('close');});
}
async function init(){
  bindControls();

  const configPromise=fetchJson(CONFIG_URL);
  const mapPromise=configPromise.then(config=>OpportunityMap.create($('map'),config));
  try{
    const [data,poi,sites,adapter,config,evidence,realEstate]=await Promise.all([fetchJson(DATA_URL,true),fetchJson(POI_URL),fetchJson(SITE_URL),mapPromise,fetchJson(REGISTRY_URL,true),fetchJson(INTELLIGENCE_URL),fetchJson(REAL_ESTATE_URL)]);
    if(!Array.isArray(data?.areas)||!data.areas.length)throw new Error('Invalid dataset');
    if(config?.schema_version!==1||!Array.isArray(config.candidates))throw new Error('Invalid registry');
    registry=config;FIELDS=config.fields;CANDIDATES=Object.fromEntries(config.candidates.filter(c=>c.lane==='LOCATION').map(c=>[c.key,c]));
    if(!Object.keys(CANDIDATES).length)throw new Error('Empty registry');
    state.candidate=Object.keys(CANDIDATES)[0];
    $('candidate').innerHTML=Object.values(CANDIDATES).map(c=>`<option value="${esc(c.key)}">${esc(c.id)} · ${esc(c.label)}</option>`).join('');
    $('method-weights').innerHTML=Object.values(CANDIDATES).map(c=>`<p><b>${esc(c.id)} ${esc(c.label)}</b><br>${Object.entries(c.weights).map(([f,w])=>`${FIELDS[f]} ${Math.round(w*100)}%`).join(' · ')}<br>검색: ${c.competition.queries.map(q=>esc(q.label||q.value)).join(' / ')}<br>${esc(c.competition.risk)}</p>`).join('');
    $('candidate-overview').innerHTML=config.candidates.map(c=>`<article><b>${esc(c.id)} · ${esc(c.label)} · ${c.lane}</b><p>설계 단계: ${esc(c.research_status)} · ${esc(c.status_note)}</p></article>`).join('');
    $('stage-flow').textContent=config.stages.join(' → ');
    $('district-filter').innerHTML='<option value="">모든 구</option>'+[...new Set(data.areas.map(a=>a.district))].sort().map(d=>`<option>${esc(d)}</option>`).join('');
    state.evidence=evidence?.schema_version===1&&evidence.source_hash===poi?._contentHash&&evidence.demand_hash===data._contentHash&&evidence.registry_hash===config._contentHash?evidence:null;
    state.data=data;state.poiData=poi;state.sites=usableSites(sites);state.adapter=adapter;
    state.realEstate=RealEstateContext.prepare(realEstate,data);
    buildPercentiles();
    $('map-badge').textContent=adapter.provider==='kakao'?'Kakao 지도':'기본 지도 사용 중';
    const periods=data.periods||{};
    $('source-periods').textContent=`서울 Open Data · 직장 ${periods.worker||'—'} / 유동 ${periods.flow||'—'} / 집객 ${periods.facility||'—'}`;
    $('data-status').textContent=`서울 ${fmt(data.areas.length)} 상권 · 유동 ${periods.flow||'—'} · ${poi?'Kakao POI '+(poi.query_error_count?'일부 검색 실패':'표본'):'POI 데이터 이용 불가'} · 실제 후보지 ${state.sites.length}개`;
    render();new ResizeObserver(()=>adapter.resize()).observe($('map'));
  }catch{state.adapter=await mapPromise.catch(()=>null);$('data-status').textContent='수요 데이터를 불러오지 못했습니다.';$('top-list').innerHTML='<p class="empty-state">데이터를 준비하지 못했습니다. 잠시 후 다시 열어 주세요.</p>';}
}
window.addEventListener('sideeconomy:choose-family',e=>{if(CANDIDATES[e.detail]&&state.data&&state.adapter){state.candidate=e.detail;$('candidate').value=e.detail;state.selectedArea=null;render();}});
init();
