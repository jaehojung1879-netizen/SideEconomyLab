const DATA_URL='./data/seoul-opportunity-map.json';

const CANDIDATES={
  booth:{label:'OC-001 · Private booth',score:'booth'},
  photo:{label:'OC-013 · Photo / document kiosk',score:'photo'},
  vending:{label:'OC-020 · Specialty vending',score:'vending'},
  luggage:{label:'OC-008 · Luggage storage',score:'luggage'},
};

proj4.defs('EPSG:5181','+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs');

const state={data:null,candidate:'booth',threshold:85,markers:[],map:null,layer:null};

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

function toLatLng(a){
  const x=Number(a.x_epsg5181), y=Number(a.y_epsg5181);
  if(!Number.isFinite(x)||!Number.isFinite(y)||(!x&&!y)) return null;
  const out=proj4('EPSG:5181','EPSG:4326',[x,y]);
  const lng=out[0],lat=out[1];
  if(lat<33||lat>39||lng<124||lng>132) return null;
  return [lat,lng];
}

function popupHtml(a,score){
  return `<div class="popup">
    <h3>${a.trdar_name||'상권'}</h3>
    <div class="meta">${a.district||''} ${a.dong||''} · ${a.trdar_cd||''}</div>
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
    <div class="warning">수요 적합도만 반영. 경쟁·임대료·host 비용 미반영.</div>
  </div>`;
}

function render(){
  if(!state.data) return;
  const areas=state.data.areas||[];
  const key=CANDIDATES[state.candidate].score;

  if(state.layer) state.layer.clearLayers();
  else state.layer=L.layerGroup().addTo(state.map);

  const ranked=areas
    .map(a=>({a,score:Number((a.scores||{})[key]||0),latlng:toLatLng(a)}))
    .filter(x=>x.latlng)
    .sort((x,y)=>y.score-x.score);

  const visible=ranked.filter(x=>x.score>=state.threshold);
  for(const x of visible){
    const radius=x.score>=95?7:x.score>=90?6:x.score>=80?5:4;
    L.circleMarker(x.latlng,{
      radius,
      color:scoreColor(x.score),
      fillColor:scoreColor(x.score),
      fillOpacity:.62,
      weight:1,
      opacity:.9,
      renderer:L.canvas()
    }).bindPopup(popupHtml(x.a,x.score)).addTo(state.layer);
  }

  document.getElementById('visible-count').textContent=visible.length.toLocaleString();
  document.getElementById('area-count').textContent=areas.length.toLocaleString();

  const top=ranked.slice(0,15);
  document.getElementById('top-list').innerHTML=top.map((x,i)=>`
    <button class="top-item" data-i="${i}">
      <span class="rank">${i+1}</span>
      <span class="name">${x.a.trdar_name}</span>
      <span class="score">${x.score.toFixed(1)}</span>
      <span class="sub">${x.a.district||''} ${x.a.dong||''}</span>
    </button>`).join('');

  document.querySelectorAll('.top-item').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const x=top[Number(btn.dataset.i)];
      state.map.setView(x.latlng,15,{animate:true});
      L.popup({maxWidth:320}).setLatLng(x.latlng).setContent(popupHtml(x.a,x.score)).openOn(state.map);
    });
  });
}

async function init(){
  state.map=L.map('map',{preferCanvas:true,zoomControl:true}).setView([37.5665,126.9780],11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,
    attribution:'&copy; OpenStreetMap contributors'
  }).addTo(state.map);

  try{
    const r=await fetch(DATA_URL+'?t='+Date.now());
    if(!r.ok) throw new Error('HTTP '+r.status);
    state.data=await r.json();
    const periods=state.data.periods||{};
    document.getElementById('period').textContent=periods.flow||periods.worker||'—';
    document.getElementById('data-status').textContent=`서울 상권 ${(state.data.area_count||0).toLocaleString()}개 · ${periods.flow||'—'}`;
    render();
  }catch(e){
    document.getElementById('data-status').textContent='GIS 데이터 생성 필요';
    document.getElementById('top-list').innerHTML='<p class="note">아직 지도 데이터가 없습니다. GitHub Actions의 “Refresh Seoul opportunity GIS”를 한 번 실행하면 생성됩니다.</p>';
    console.error(e);
  }

  const candidate=document.getElementById('candidate');
  candidate.addEventListener('change',()=>{state.candidate=candidate.value;render();});

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
}

init();
