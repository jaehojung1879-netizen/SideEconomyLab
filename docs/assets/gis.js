const DATA_URL='./data/seoul-opportunity-map.json';
const POI_URL='./data/kakao-poi-layer.json';
const SITE_URL='./data/site-observations.json';
const CONFIG_URL='./data/map-runtime.json';
const FIELDS={worker:'직장인구',flow:'유동인구',young_flow:'20–40대 유동',day_flow:'11–17시 유동',afterwork_flow:'17–21시 유동',weekday_flow:'평일 유동',attractors:'집객시설',subway:'지하철',lodging:'숙박시설',rail:'철도',bank:'은행',public_office:'공공기관'};
// These weights mirror pipeline/seoul_location_screen.py; UI never replaces scores.
const CANDIDATES={
  booth:{id:'OC-001',label:'업무·통화용 독립 부스',weights:{worker:.40,weekday_flow:.20,day_flow:.15,subway:.10,bank:.05,public_office:.05,attractors:.05},checks:['오피스·공유공간 담당자에게 부스 설치 가능 면적과 전력·환기를 확인','점심·오후 시간대 통화·집중 공간 부족과 기존 부스 이용 상황 확인','방음·소방·접근성, 관리 책임과 임대료·수익배분 조건 확인']},
  photo:{id:'OC-013',label:'사진·문서 출력 키오스크',weights:{flow:.35,young_flow:.25,subway:.15,attractors:.15,afterwork_flow:.10},checks:['사진·증명·출력 중 실제 필요한 서비스와 시간대를 먼저 구분','사진관·포토부스·인쇄소의 가격·대기시간·영업시간을 현장 확인','보행 동선·시야·전력·소모품 보충 및 개인정보 처리 조건 확인']},
  vending:{id:'OC-020',label:'특화 자판기',weights:{worker:.30,flow:.25,day_flow:.20,attractors:.15,subway:.10},checks:['편의점으로 대체하기 어려운 구체적 상품과 반복 구매 상황 확인','호스트의 설치 허용·전력·관리 동선과 수익배분 조건 확인','보충·고장 대응 주기, 품목별 판매 요건과 폐기 비용 확인']},
  luggage:{id:'OC-008',label:'제휴형 짐 보관',weights:{lodging:.30,subway:.20,rail:.15,flow:.25,attractors:.10},checks:['역 보관함·T-Locker·T-Luggage의 실제 가격·크기·운영시간 확인','대형 짐·단체·야간 등 기존 공급이 못 받는 수요가 있는지 확인','제휴 호스트의 잉여 공간·보관 책임·보험·수익배분 조건 확인']},
};
proj4.defs('EPSG:5181','+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs');
const state={data:null,poiData:null,sites:[],candidate:'booth',threshold:85,query:'',adapter:null,selectedArea:null,ranked:[],visible:[],limit:30,coordinates:new Map(),percentiles:new Map(),rankByCode:new Map()};
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
function currentScore(a){return Number(a.scores?.[state.candidate]||0);}
function poiAreaFor(code){
  const areas=state.poiData?.candidates?.[state.candidate]?.areas;
  if(!Array.isArray(areas))return null;
  const area=areas.find(x=>x&&String(x.trdar_cd)===String(code));
  return area?{...area,query_stats:Array.isArray(area.query_stats)?area.query_stats.filter(x=>x&&typeof x==='object'):[],pois:Array.isArray(area.pois)?area.pois.filter(x=>x&&typeof x==='object'):[]}:null;
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
  const links=(supply?.pois||[]).slice(0,5).map(p=>{const url=safePlaceUrl(p.place_url);return url?`<a href="${esc(url)}" target="_blank" rel="noopener">${esc(p.name)} · ${p.distance_m==null?'거리 미상':fmt(p.distance_m)+'m'} ↗</a>`:'';}).join('');
  const signalRows=signals(a).slice(0,3).map(s=>`<li>${FIELDS[s.field]} · 서울 백분위 <b>${Math.round(s.percentile*100)}</b><div class="signal-detail">기존 점수 비중 ${Math.round(s.weight*100)}% · 공개 집계 ${fmt(a[s.field])}</div></li>`).join('');
  const metricFields=state.candidate==='luggage'?['lodging','subway','rail','flow']:state.candidate==='photo'?['flow','young_flow','subway','attractors']:['worker','flow','day_flow','subway'];
  const localSites=state.sites.filter(s=>s.candidate_id===candidate.id&&String(s.commercial_area_id)===String(a.trdar_cd));
  host.innerHTML=`<div class="selected-title">${esc(a.trdar_name)}</div><div class="selected-sub">${esc(a.district)} ${esc(a.dong)} · ${esc(a.trdar_cd)}<br>${candidate.id} · ${candidate.label}</div>
    <div class="score-card"><div><span>수요 적합도</span><b>${currentScore(a).toFixed(1)}</b><small>100점 기준</small></div><div><span>서울 내 수요 순위</span><b>#${rank}</b><small>/ ${fmt(state.data.areas.length)} · 동점 동일 순위</small></div></div>
    <section class="decision-section"><h3><span class="kind">DERIVED SIGNAL</span>왜 살펴볼 만한가</h3><ul>${signalRows}</ul><p>가중 수요 신호입니다. 경쟁·비용을 반영한 사업성 판단은 아직 아닙니다.</p>${state.candidate==='luggage'?'<p>주요 역의 기존 보관 서비스를 먼저 확인하세요. 일반 보관 수요만으로 빈 시장을 뜻하지 않습니다.</p>':''}</section>
    <section class="decision-section"><h3><span class="kind">DATA</span>수요 원자료</h3><div class="metrics">${metricFields.map(f=>`<div><span>${FIELDS[f]}</span><b>${fmt(a[f])}</b></div>`).join('')}</div><p>서울 공개 상권 집계 · 분기와 원자료 정의는 데이터·방법 참조.</p></section>
    <section class="decision-section"><h3><span class="kind">DATA / PROXY</span>경쟁·대체재</h3>${supply?`<p>중심 ${fmt(state.poiData.radius_m)}m · 수집된 고유 POI <b>${fmt(supply.unique_poi_count)}</b>개</p>${failed?`<p>검색 ${failed}건 실패 · 불완전한 표본입니다.</p>`:''}<div class="poi-chips">${tags}</div><div class="poi-list">${links||'<p>수집된 POI 없음 · 경쟁 부재를 의미하지 않습니다.</p>'}</div><p>검색별 가까운 15개 결과만 수집합니다.</p>`:`<p>${state.poiData?'이 상권은 미조사입니다. 후보별 수요 상위 15개 상권만 POI를 수집합니다.':'POI 데이터를 불러오지 못했습니다. 수요 지도는 이용할 수 있습니다.'}</p>`}</section>
    <section class="decision-section"><h3><span class="kind">UNKNOWN</span>아직 모르는 조건</h3><p>임대료·보증금 / 호스트 수익배분 / 설치 가능한 정확한 공간 / 전환율·이용률 / 운영·관리 비용 / 법적·현장 제약</p></section>
    <section class="decision-section"><h3><span class="kind">FIELD CHECK</span>다음 현장 확인</h3><ol>${candidate.checks.map(c=>`<li>${c}</li>`).join('')}</ol><a class="area-link" href="https://map.kakao.com/link/map/${encodeURIComponent(a.trdar_name)},${toLatLng(a).join(',')}" target="_blank" rel="noopener">카카오맵에서 주변 살펴보기 ↗</a></section>
    <section class="decision-section"><h3>실제 후보지 관찰</h3>${localSites.length?localSites.map(s=>`<div class="site-info">${esc(s.name||s.site_id)} · ${esc(s.status||'상태 미기록')}<br>${esc(s.address||'주소 미기록')}<br>임대료 ${s.rent==null?'미확인':fmt(s.rent)+'원'} · 보증금 ${s.deposit==null?'미확인':fmt(s.deposit)+'원'}<br>${esc(s.field_note||'현장 메모 미기록')}</div>`).join(''):'<p>등록된 후보지가 없습니다. 확인한 건물·호스트·현장 조건을 별도 관찰 기록으로 연결할 수 있습니다.</p>'}</section>`;
}
function renderPoi(){
  const rows=[];let radius=null;
  const supply=state.selectedArea&&poiAreaFor(state.selectedArea.trdar_cd);
  if($('show-poi').checked&&supply){
    (supply.pois||[]).forEach(p=>{if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng))return;const url=safePlaceUrl(p.place_url);rows.push({position:[p.lat,p.lng],name:p.name,html:`<div class="map-popup"><h3>${esc(p.name)}</h3><p>${esc(p.category)} · ${p.distance_m==null?'거리 미상':fmt(p.distance_m)+'m'}</p><p>${esc(p.address)}</p>${url?`<a href="${esc(url)}" target="_blank" rel="noopener">카카오 장소 보기 ↗</a>`:''}</div>`});});
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
  document.querySelectorAll('.top-item').forEach(b=>b.classList.toggle('active',a&&b.dataset.code===String(a.trdar_cd)));
  if(openSheet&&matchMedia('(max-width:800px)').matches&&document.body.dataset.sheet!=='decision')setSheet('decision');
}
function matchesQuery(a){const q=state.query.trim().toLowerCase();return !q||[a.trdar_name,a.district,a.dong,a.trdar_cd].some(v=>String(v||'').toLowerCase().includes(q));}
function render(){
  if(!state.data||!state.adapter)return;
  state.ranked=state.data.areas.map(a=>({a,score:currentScore(a),position:toLatLng(a)})).sort((x,y)=>y.score-x.score||String(x.a.trdar_cd).localeCompare(String(y.a.trdar_cd)));
  state.rankByCode.clear();let rank=1;
  state.ranked.forEach((x,i)=>{if(i&&x.score!==state.ranked[i-1].score)rank=i+1;state.rankByCode.set(String(x.a.trdar_cd),rank);});
  state.visible=state.ranked.filter(x=>x.position&&x.score>=state.threshold&&matchesQuery(x.a));
  if(state.selectedArea&&!state.visible.some(x=>x.a===state.selectedArea))state.selectedArea=null;
  state.adapter.demand($('show-demand').checked?state.visible.map(x=>({area:x.a,position:x.position,score:x.score,color:scoreColor(x.score)})):[],a=>selectArea(a));
  $('visible-count').textContent=fmt(state.visible.length);$('area-count').textContent=fmt(state.data.areas.length);
  const top=state.visible.slice(0,state.limit);
  $('top-list').innerHTML=top.map(x=>{const supply=poiAreaFor(x.a.trdar_cd);return `<button class="top-item" data-code="${esc(x.a.trdar_cd)}"><span class="rank">${state.rankByCode.get(String(x.a.trdar_cd))}</span><span class="name">${esc(x.a.trdar_name)}</span><span class="score">${x.score.toFixed(1)}</span><span class="sub">${esc(x.a.district)} ${esc(x.a.dong)} · ${supply?'POI '+fmt(supply.unique_poi_count)+'개 표본':'주변 POI 미조사'}</span><span class="reason-tag">${reasonTag(x.a)}</span></button>`;}).join('')||'<p class="empty-state">조건에 맞는 상권이 없습니다. 검색어나 최소 점수를 조정하세요.</p>';
  $('load-more').hidden=state.visible.length<=state.limit;
  document.querySelectorAll('.top-item').forEach(b=>b.onclick=()=>selectArea(top.find(x=>String(x.a.trdar_cd)===b.dataset.code).a));
  selectArea(state.selectedArea||top[0]?.a||null,{pan:false,openSheet:false});renderSites();
}
function setSheet(sheet){const current=document.body.dataset.sheet;const next=sheet==='close'||current===sheet?'':sheet;document.body.dataset.sheet=next;if(next==='filters')$('filter-panel').open=true;document.querySelectorAll('.mobile-tabs button').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.sheet===next)));}
async function fetchJson(url,required=false){try{const r=await fetch(url,{cache:'no-cache'});if(!r.ok)throw new Error('Dataset unavailable');return await r.json();}catch{if(required)throw new Error('Demand dataset unavailable');return null;}}
function bindControls(){
  $('candidate').onchange=e=>{state.candidate=e.target.value;state.selectedArea=null;state.limit=30;render();};
  $('area-search').oninput=e=>{state.query=e.target.value;state.limit=30;render();};
  $('search-clear').onclick=()=>{$('area-search').value='';state.query='';state.limit=30;render();};
  const threshold=value=>{state.threshold=Number(value);$('threshold').value=value;$('threshold-value').textContent=value;state.limit=30;render();};
  $('threshold').oninput=e=>threshold(e.target.value);document.querySelectorAll('[data-threshold]').forEach(b=>b.onclick=()=>threshold(b.dataset.threshold));
  $('show-demand').onchange=render;$('show-poi').onchange=()=>state.adapter&&renderPoi();$('show-sites').onchange=()=>state.adapter&&renderSites();
  $('load-more').onclick=()=>{state.limit+=30;render();};$('seoul-view').onclick=()=>state.adapter?.overview();
  document.querySelectorAll('[data-sheet]').forEach(b=>b.onclick=()=>setSheet(b.dataset.sheet));
  document.querySelectorAll('[data-dialog]').forEach(b=>b.onclick=()=>$(b.dataset.dialog).showModal());
  document.querySelectorAll('[data-close-dialog]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
  document.addEventListener('keydown',e=>{if(e.key==='Escape')setSheet('close');});
}
async function init(){
  bindControls();
  $('method-weights').innerHTML=Object.values(CANDIDATES).map(c=>`<p><b>${c.id} ${c.label}</b><br>${Object.entries(c.weights).map(([f,w])=>`${FIELDS[f]} ${Math.round(w*100)}%`).join(' · ')}</p>`).join('');
  const configPromise=fetchJson(CONFIG_URL);
  const mapPromise=configPromise.then(config=>OpportunityMap.create($('map'),config));
  try{
    const [data,poi,sites,adapter]=await Promise.all([fetchJson(DATA_URL,true),fetchJson(POI_URL),fetchJson(SITE_URL),mapPromise]);
    if(!Array.isArray(data?.areas)||!data.areas.length)throw new Error('Invalid dataset');
    state.data=data;state.poiData=poi;state.sites=usableSites(sites);state.adapter=adapter;
    buildPercentiles();
    $('map-badge').textContent=adapter.provider==='kakao'?'Kakao 지도':'기본 지도 사용 중';
    const periods=data.periods||{};
    $('source-periods').textContent=`서울 Open Data · 직장 ${periods.worker||'—'} / 유동 ${periods.flow||'—'} / 집객 ${periods.facility||'—'}`;
    $('data-status').textContent=`서울 ${fmt(data.areas.length)} 상권 · 유동 ${periods.flow||'—'} · ${poi?'Kakao POI '+(poi.query_error_count?'일부 검색 실패':'표본'):'POI 데이터 이용 불가'} · 실제 후보지 ${state.sites.length}개`;
    render();new ResizeObserver(()=>adapter.resize()).observe($('map'));
  }catch{state.adapter=await mapPromise.catch(()=>null);$('data-status').textContent='수요 데이터를 불러오지 못했습니다.';$('top-list').innerHTML='<p class="empty-state">데이터를 준비하지 못했습니다. 잠시 후 다시 열어 주세요.</p>';}
}
init();
