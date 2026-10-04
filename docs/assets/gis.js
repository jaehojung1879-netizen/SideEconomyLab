const DATA_URL='./data/seoul-opportunity-map.json';
const POI_URL='./data/kakao-poi-layer.json';

const CANDIDATES={
  booth:{label:'OC-001 · Private booth',score:'booth'},
  photo:{label:'OC-013 · Photo / document kiosk',score:'photo'},
  vending:{label:'OC-020 · Specialty vending',score:'vending'},
  luggage:{label:'OC-008 · Luggage storage',score:'luggage'},
};

proj4.defs('EPSG:5181','+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs');

const state={
  data:null,
  poiData:null,
  candidate:'booth',
  threshold:85,
  query:'',
  map:null,
  demandLayer:null,
  poiLayer:null,
  selectedArea:null,
  ranked:[],
  renderer:null,
  coordinates:new Map(),
};

function esc(s){
  return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function fmt(n){
  const x=Number(n);
  if(!Number.isFinite(x)) return '—';
  return Math.round(x).toLocaleString('ko-KR');
}

function scoreColor(score){
  if(score>=95) return '#ef476f';
  if(score>=90) return '#ff9f1c';
  if(score>=80) return '#ffd166';
  return '#3a86ff';
}

function safePlaceUrl(value){
  try{
    const u=new URL(value);
    return ['http:','https:'].includes(u.protocol)&&u.hostname==='place.map.kakao.com'?u.href:'';
  }catch{return '';}
}

function toLatLng(a){
  if(state.coordinates.has(a)) return state.coordinates.get(a);
  const x=Number(a.x_epsg5181), y=Number(a.y_epsg5181);
  if(!Number.isFinite(x)||!Number.isFinite(y)||(!x&&!y)) return null;
  const out=proj4('EPSG:5181','EPSG:4326',[x,y]);
  const lng=out[0],lat=out[1];
  if(lat<33||lat>39||lng<124||lng>132) return null;
  state.coordinates.set(a,[lat,lng]);
  return [lat,lng];
}

function currentScore(a){
  const key=CANDIDATES[state.candidate].score;
  return Number((a.scores||{})[key]||0);
}

function popupHtml(a,score){
  return `<div class="popup">
    <h3>${esc(a.trdar_name||'상권')}</h3>
    <div class="meta">${esc(a.district||'')} ${esc(a.dong||'')} · ${esc(a.trdar_cd||'')}</div>
    <div class="popup-grid">
      <span>Demand-fit</span><b>${score.toFixed(2)}</b>
      <span>직장인구</span><b>${fmt(a.worker)}</b>
      <span>유동인구</span><b>${fmt(a.flow)}</b>
      <span>20–40대 유동</span><b>${fmt(a.young_flow)}</b>
      <span>주간 유동</span><b>${fmt(a.day_flow)}</b>
      <span>퇴근시간 유동</span><b>${fmt(a.afterwork_flow)}</b>
      <span>집객시설</span><b>${fmt(a.attractors)}</b>
      <span>지하철</span><b>${fmt(a.subway)}</b>
      <span>숙박시설</span><b>${fmt(a.lodging)}</b>
      <span>공공기관</span><b>${fmt(a.public_office)}</b>
    </div>
    <div class="warning">수요 적합도만 반영. 경쟁·임대료·host 비용은 별도 확인.</div>
  </div>`;
}

function poiAreaFor(trdarCd){
  const c=state.poiData?.candidates?.[state.candidate];
  if(!c) return null;
  return (c.areas||[]).find(x=>String(x.trdar_cd)===String(trdarCd))||null;
}

function renderSelected(){
  const host=document.getElementById('selected-card');
  if(!state.selectedArea){
    host.className='selected-card muted-card';
    host.textContent='지도나 상위 입지를 선택하세요.';
    return;
  }
  const a=state.selectedArea;
  const score=currentScore(a);
  const supply=poiAreaFor(a.trdar_cd);
  const queryStats=(supply?.query_stats||[]).filter(x=>!x.error);
  const chips=queryStats.map(x=>`<span class="poi-chip">${esc(x.query)} ${fmt(x.total_count)}</span>`).join('');
  const failed=(supply?.query_stats||[]).filter(x=>x.error).length;
  const closest=(supply?.pois||[]).slice(0,5);
  const links=closest.map(p=>{
    const label=`${esc(p.name)} · ${p.distance_m==null?'?':fmt(p.distance_m)+'m'}`;
    const url=safePlaceUrl(p.place_url);
    return url
      ? `<a href="${esc(url)}" target="_blank" rel="noopener">${label}</a>`
      : `<span>${label}</span>`;
  }).join('');

  host.className='selected-card';
  host.innerHTML=`
    <div class="selected-title">${esc(a.trdar_name||'상권')}</div>
    <div class="selected-sub">${esc(a.district||'')} ${esc(a.dong||'')} · ${esc(a.trdar_cd||'')}</div>
    <div class="selected-metrics">
      <div><span>Demand-fit</span><b>${score.toFixed(2)}</b></div>
      <div><span>직장인구</span><b>${fmt(a.worker)}</b></div>
      <div><span>유동인구</span><b>${fmt(a.flow)}</b></div>
      <div><span>집객시설</span><b>${fmt(a.attractors)}</b></div>
    </div>
    <div class="poi-summary">
      <strong>Kakao 경쟁·대체재</strong><br>
      ${supply
        ? `반경 ${fmt(state.poiData.radius_m)}m · 고유 POI ${fmt(supply.unique_poi_count)}개<br>${failed?`<div class="note">검색 ${failed}건 실패 · POI 수는 불완전합니다.</div>`:''}${chips||'<span class="note">성공한 검색결과 없음</span>'}
           <div class="poi-list">${links||'<span class="note">표시할 POI 없음</span>'}</div>`
        : `<span class="note">${state.poiData?'수요 상위 15개 상권에만 POI 조사를 수행합니다.':'POI 데이터를 불러오지 못했습니다. 수요 지도는 이용할 수 있습니다.'}</span>`}
    </div>`;
}

function clearPoiLayer(){
  if(state.poiLayer) state.poiLayer.clearLayers();
}

function renderPoi(){
  clearPoiLayer();
  if(!document.getElementById('show-poi').checked || !state.selectedArea || !state.poiData) return;
  if(!state.poiLayer) state.poiLayer=L.layerGroup().addTo(state.map);

  const row=poiAreaFor(state.selectedArea.trdar_cd);
  if(!row) return;
  const icon=L.divIcon({
    className:'',
    html:'<div class="poi-marker"></div>',
    iconSize:[13,13],
    iconAnchor:[6,6],
  });
  for(const p of (row.pois||[])){
    const lat=Number(p.lat),lng=Number(p.lng);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)) continue;
    const url=safePlaceUrl(p.place_url);
    const popup=`<div class="poi-popup">
      <h4>${esc(p.name)}</h4>
      <div class="meta">${esc(p.category||'')} · ${p.distance_m==null?'거리 미상':fmt(p.distance_m)+'m'}</div>
      <div>${esc(p.address||'')}</div>
      <div class="meta">matched: ${esc(p.matched_by||'')}</div>
      ${url?`<a href="${esc(url)}" target="_blank" rel="noopener">Kakao 장소 보기</a>`:''}
    </div>`;
    L.marker([lat,lng],{icon}).bindPopup(popup).addTo(state.poiLayer);
  }

  if(row.lat && row.lng){
    L.circle([Number(row.lat),Number(row.lng)],{
      radius:Number(state.poiData.radius_m||800),
      color:'#7c4dff',
      weight:1,
      opacity:.5,
      fillOpacity:.025,
      dashArray:'5,5',
    }).addTo(state.poiLayer);
  }
}

function selectArea(a,{pan=true,openPopup=true}={}){
  if(!a) return;
  state.selectedArea=a;
  const latlng=toLatLng(a);
  if(latlng && pan) state.map.setView(latlng,15,{animate:true});
  if(latlng && openPopup){
    L.popup({maxWidth:330}).setLatLng(latlng).setContent(popupHtml(a,currentScore(a))).openOn(state.map);
  }
  renderSelected();
  renderPoi();
  document.querySelectorAll('.top-item').forEach(btn=>{
    btn.classList.toggle('active',String(btn.dataset.code)===String(a.trdar_cd));
  });
}

function matchesQuery(a){
  const q=state.query.trim().toLowerCase();
  if(!q) return true;
  return [a.trdar_name,a.district,a.dong,a.trdar_cd]
    .some(v=>String(v||'').toLowerCase().includes(q));
}

function render(){
  if(!state.data) return;
  const areas=state.data.areas||[];

  if(state.demandLayer) state.demandLayer.clearLayers();
  else state.demandLayer=L.layerGroup().addTo(state.map);

  state.ranked=areas
    .map(a=>({a,score:currentScore(a),latlng:toLatLng(a)}))
    .filter(x=>x.latlng)
    .sort((x,y)=>y.score-x.score);

  const visible=state.ranked.filter(x=>x.score>=state.threshold && matchesQuery(x.a));

  if(document.getElementById('show-demand').checked){
    for(const x of visible){
      const radius=x.score>=95?7:x.score>=90?6:x.score>=80?5:4;
      const marker=L.circleMarker(x.latlng,{
        radius,
        color:scoreColor(x.score),
        fillColor:scoreColor(x.score),
        fillOpacity:.62,
        weight:1,
        opacity:.9,
        renderer:state.renderer
      }).bindPopup(popupHtml(x.a,x.score));
      marker.on('click',()=>selectArea(x.a,{pan:false,openPopup:false}));
      marker.addTo(state.demandLayer);
    }
  }

  document.getElementById('visible-count').textContent=visible.length.toLocaleString();
  document.getElementById('area-count').textContent=areas.length.toLocaleString();

  const top=visible.slice(0,15);
  if(state.selectedArea && !visible.some(x=>x.a===state.selectedArea)){
    state.selectedArea=null;
    state.map.closePopup();
    clearPoiLayer();
  }
  document.getElementById('top-list').innerHTML=top.map((x,i)=>`
    <button class="top-item ${state.selectedArea&&String(state.selectedArea.trdar_cd)===String(x.a.trdar_cd)?'active':''}"
            data-i="${i}" data-code="${esc(x.a.trdar_cd)}">
      <span class="rank">${i+1}</span>
      <span class="name">${esc(x.a.trdar_name)}</span>
      <span class="score">${x.score.toFixed(1)}</span>
      <span class="sub">${esc(x.a.district||'')} ${esc(x.a.dong||'')}</span>
    </button>`).join('')||'<p class="note">조건에 맞는 상권이 없습니다. 검색어나 최소 점수를 조정하세요.</p>';

  document.querySelectorAll('.top-item').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const x=top[Number(btn.dataset.i)];
      selectArea(x.a);
    });
  });

  if(state.selectedArea){
    renderSelected();
    renderPoi();
  } else if(top.length){
    selectArea(top[0].a,{pan:false,openPopup:false});
  } else {
    renderSelected();
    clearPoiLayer();
  }
}

async function fetchJson(url,required=true){
  const r=await fetch(url,{cache:'no-cache'});
  if(!r.ok){
    if(required) throw new Error(url+' HTTP '+r.status);
    return null;
  }
  return await r.json();
}

async function init(){
  state.map=L.map('map',{preferCanvas:true,zoomControl:true}).setView([37.5665,126.9780],11);
  state.renderer=L.canvas();
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,
    attribution:'&copy; OpenStreetMap contributors'
  }).addTo(state.map);

  try{
    const [data,poi]=await Promise.all([
      fetchJson(DATA_URL,true),
      fetchJson(POI_URL,false).catch(()=>null),
    ]);
    if(!Array.isArray(data.areas)||!data.areas.length) throw new Error('Invalid demand dataset');
    state.data=data;
    state.poiData=poi;
    const periods=state.data.periods||{};
    document.getElementById('period').textContent=periods.flow||periods.worker||'—';
    const poiText=poi?` · Kakao POI${poi.query_error_count?' 일부 검색 실패':''}`:' · Kakao POI 이용 불가';
    document.getElementById('data-status').textContent=`서울 상권 ${(state.data.area_count||0).toLocaleString()}개 · ${periods.flow||'—'}${poiText}`;
    render();
  }catch(e){
    document.getElementById('data-status').textContent='GIS 데이터 생성 필요';
    document.getElementById('top-list').innerHTML='<p class="note">아직 지도 데이터가 없습니다. GitHub Actions의 “Refresh Seoul opportunity GIS”를 실행해 주세요.</p>';
    console.error(e);
  }

  const candidate=document.getElementById('candidate');
  candidate.addEventListener('change',()=>{
    state.candidate=candidate.value;
    state.selectedArea=null;
    state.map.closePopup();
    clearPoiLayer();
    render();
  });

  const threshold=document.getElementById('threshold');
  threshold.addEventListener('input',()=>{
    state.threshold=Number(threshold.value);
    document.getElementById('threshold-value').textContent=state.threshold;
    render();
  });

  document.querySelectorAll('[data-threshold]').forEach(b=>b.addEventListener('click',()=>{
    threshold.value=b.dataset.threshold;
    state.threshold=Number(b.dataset.threshold);
    document.getElementById('threshold-value').textContent=state.threshold;
    render();
  }));

  const search=document.getElementById('area-search');
  search.addEventListener('input',()=>{
    state.query=search.value||'';
    render();
  });
  document.getElementById('search-clear').addEventListener('click',()=>{
    search.value='';
    state.query='';
    render();
  });

  document.getElementById('show-demand').addEventListener('change',render);
  document.getElementById('show-poi').addEventListener('change',renderPoi);
}

init();
