/* Korean-first research navigation; public summaries only, detail on selection. */
(() => {
  const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>v===null||v===undefined||!Number.isFinite(v)?'미확인':v.toLocaleString('ko-KR');
  const period=p=>/^20\d{2}[1-4]$/.test(p)?`${p.slice(0,4)}년 ${p[4]}분기`:'관측 분기 미확인';
  const issues={GEOGRAPHY_REVISION_UNKNOWN:'지리 기준 확인 필요',SOURCE_IDENTITY_CHANGED:'지역·업종 정의 확인 필요',STALE_OBSERVATION:'오래된 관측',MISSING_OBSERVATIONS:'일부 관측 누락'};
  let data=null,sourceState=null,selected=null,detail=null,limit=6,sequence=0;
  const cache=new Map(), filters={area:'',industry:'',period:'',type:'',evidence:'',sort:'recent'};
  const fresh=p=>{if(!/^20\d{2}[1-4]$/.test(p))return false;const end=new Date(Date.UTC(+p.slice(0,4),+p[4]*3,0));const age=(Date.now()-end.getTime())/86400000;return age>=0&&age<=180;};
  const sourceUrl=u=>{try{const url=new URL(u);return url.protocol==='https:'&&['data.seoul.go.kr','golmok.seoul.go.kr','www.data.go.kr'].includes(url.hostname)?url.href:'';}catch{return '';}};
  function prepare(index){
    if(index?.schema_version!==1||!Array.isArray(index.entities)||!Array.isArray(index.signals)||!Array.isArray(index.sources)||!Array.isArray(index.periods)||!index.coverage)throw Error('형식 확인 필요');
    if(!['AVAILABLE','NOT_COLLECTED'].includes(index.status))throw Error('출처 확인 필요');
    if(index.status==='NOT_COLLECTED'&&(index.entities.length||index.signals.length))throw Error('출처 없는 관측');
    if(index.status==='AVAILABLE'&&(!/^20\d{2}-\d{2}-\d{2}-[a-f0-9]{12}$/.test(index.snapshot_id)||index.sources.length!==2))throw Error('출처 확인 필요');
    const ids=new Set();
    for(const e of index.entities){
      if(!/^\d{7}-CS\d{6}$/.test(e.id)||ids.has(e.id)||!Array.isArray(e.issues)||!Array.isArray(e.signal_ids)||!e.latest||e.period!==index.periods.at(-1)||e.detail_url!==`./data/opportunity-radar-details/${e.id}.json`||!/^([a-f0-9]{64})$/.test(e.detail_hash))throw Error('지역 근거 형식 오류');
      ids.add(e.id);
      // Null remains unknown; strings, negative counts and NaN never become zero.
      for(const k of ['sales','stores','opened','closed'])if(e.latest[k]!==null&&(!Number.isFinite(e.latest[k])||e.latest[k]<0))throw Error('관측값 형식 오류');
      if(e.map_area_id!==null)throw Error('공식 지도 대응 미검증');
    }
    for(const s of index.signals){
      const e=index.entities.find(e=>e.id===s.entity_id);
      if(!e||e.issues.length||!['spending','churn'].includes(s.type)||!e.signal_ids.includes(s.id)||index.geography?.comparability_verified!==true||!index.geography.version||!index.geography.geometry_version||!index.geography.crs||!sourceUrl(index.geography.evidence_url)||s.evidence_status!=='DERIVED_FROM_MODELED_STATISTICS'||s.evidence_completeness!==1||!s.interpretation||!s.alternative||!s.next_action)throw Error('연구 신호 검증 실패');
    }
    return index;
  }
  function signals(){return (data?.signals||[]).filter(s=>fresh(data.entities.find(e=>e.id===s.entity_id)?.period));}
  function mode(value,{push=false}={}){
    const next=['radar','region','evaluate'].includes(value)?value:'radar';
    document.body.dataset.workspace=next;document.body.dataset.sheet='';
    document.querySelector('.brand h1').textContent={radar:'기회 탐색',region:'지역 분석',evaluate:'사업성 검토'}[next];
    document.querySelectorAll('[data-workspace-nav]').forEach(a=>a.setAttribute('aria-current',a.dataset.workspaceNav===next?'page':'false'));
    if(push&&location.hash!==`#${next}`)location.hash=next;
    window.dispatchEvent(new CustomEvent('sideeconomy:workspace-mode',{detail:next}));
    window.SideEconomyGIS?.refresh();
    if(next==='evaluate'&&matchMedia('(max-width:800px)').matches)document.body.dataset.sheet='decision';
  }
  function view(value){document.body.dataset.radarView=value;document.querySelectorAll('button[data-radar-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.radarView===value)));}
  function options(id,values,label){$(id).innerHTML=`<option value="">${label}</option>`+[...values].map(([k,v])=>`<option value="${esc(k)}">${esc(v)}</option>`).join('');}
  function summary(){
    const c=data?.coverage||{}, candidates=window.SideEconomyGIS?.candidates()||[], freshSources=data?.sources.filter(s=>fresh(s.periods?.at(-1))).length||0;
    $('radar-summary').innerHTML=`<div><dt>분석 범위</dt><dd>${num(c.source_areas??0)}<small>출처 지역 · 전체 서울 아님</small></dd></div><div><dt>최근 관측 출처</dt><dd>${freshSources}<small>180일 이내 관측</small></dd></div><div><dt>검증 가능한 변화</dt><dd>${signals().length}<small>비교 조건 통과</small></dd></div><div><dt>기존 사업 가설</dt><dd>${candidates.length||'—'}<small>현장 검증과 별도</small></dd></div>`;
    $('radar-headline').textContent=signals().length?`비교 조건을 통과한 변화 ${signals().length}건이 있습니다. 원인과 고객 문제를 함께 확인하세요.`:data?.status==='AVAILABLE'?'관측 자료는 확보했지만, 동일 지리 기준을 확인하기 전에는 시장 변화로 판단하지 않습니다.':'새 시장 변화를 판단할 검증된 자료가 아직 없습니다. 기존 지역 연구를 계속 살펴볼 수 있습니다.';
  }
  function render(){
    summary();
    const all=signals(), active=all.filter(s=>(!filters.type||s.type===filters.type)&&(!filters.period||data.entities.find(e=>e.id===s.entity_id)?.period===filters.period));
    let rows=(data?.entities||[]).filter(e=>(!filters.area||e.area_id===filters.area)&&(!filters.industry||e.industry_id===filters.industry)&&(!filters.evidence||(filters.evidence==='eligible'?active.some(s=>s.entity_id===e.id):e.issues.length>0)));
    if(filters.type)rows=rows.filter(e=>active.some(s=>s.entity_id===e.id));
    if(['spending','stores'].includes(filters.sort)){
      rows=filters.industry?rows.filter(e=>active.some(s=>s.entity_id===e.id&&s.type===(filters.sort==='spending'?'spending':'churn'))):[];
      const val=e=>active.find(s=>s.entity_id===e.id&&s.type===(filters.sort==='spending'?'spending':'churn'))?.[filters.sort==='spending'?'sales_change_pct':'store_change_count']??-Infinity;
      rows.sort((a,b)=>val(b)-val(a)||a.id.localeCompare(b.id));
    }else rows.sort((a,b)=>filters.sort==='completeness'?b.evidence_completeness-a.evidence_completeness||a.id.localeCompare(b.id):b.period.localeCompare(a.period)||a.id.localeCompare(b.id));
    if(selected&&!rows.some(e=>e.id===selected.id)){selected=null;detail=null;sequence++;$('radar-detail').innerHTML='<h3>선택 지역 없음</h3><p>조건에 맞는 관측 목록에서 지역을 선택하세요.</p>';}
    document.body.dataset.radarSelected=String(Boolean(selected));
    $('radar-result-count').textContent=`${rows.length}개 지역·업종`;
    let message='';
    if(!data)message='<div class="radar-empty"><strong>자료를 불러오지 못했습니다.</strong><p>네트워크 또는 자료 형식을 확인해야 합니다. 기존 지도와 연구는 계속 사용할 수 있습니다.</p><button data-radar-retry>다시 불러오기</button></div>';
    else if(!all.length)message=`<div class="radar-empty"><strong>검증 가능한 시장 변화가 아직 없습니다.</strong><p>${data.entities.length?'매출·점포 관측값은 확보했습니다. 분기별 지리 기준이 같은지 확인해야 변화 비교를 열 수 있습니다. 아래 자료는 변화 신호가 아닌 개별 관측입니다.':'매출·점포의 검증된 수집 결과가 준비되지 않았습니다. 임의의 기회나 수치를 표시하지 않습니다.'}</p><button data-radar-region>기존 지역 분석 이어가기</button></div>`;
    if(sourceState?.status==='BLOCKED')message+=`<p class="radar-notice">최근 수집에 실패했습니다. 이전 검증 자료를 보존했습니다. ${sourceState.attempted_at?`시도일 ${esc(sourceState.attempted_at.slice(0,10))}`:''}<br>출처·검증 상태는 상세 안내에서 확인하세요.</p>`;
    if(data?.status==='AVAILABLE'&&!fresh(data.periods.at(-1)))message+='<p class="radar-notice">오래된 관측입니다. 최신 동향으로 해석하지 마세요. 새 신호는 비활성 상태입니다.</p>';
    if(['spending','stores'].includes(filters.sort)&&!filters.industry)message+='<p class="radar-notice">수치로 정렬하려면 같은 업종을 선택하세요. 업종·기간이 다른 신호를 하나의 순위로 비교하지 않습니다.</p>';
    $('radar-source-state').innerHTML=message;
    $('radar-list').innerHTML=rows.slice(0,limit).map(e=>{
      const s=active.find(s=>s.entity_id===e.id), current=!filters.period||filters.period===e.period;
      return `<button class="radar-item" data-radar-entity="${e.id}" aria-pressed="${selected?.id===e.id}"><strong>${esc(e.area_name)} · ${esc(e.industry_name)}</strong><p>${esc(s?.interpretation||'출처의 관측값을 확인할 수 있습니다. 변화 비교는 추가 검증이 필요합니다.')}</p><small class="radar-metric">${s?.type==='spending'?`추정 소비 ${num(s.sales_change_pct)}% · 점포 ${num(s.store_change_pct)}%`:s?.type==='churn'?`최근 분기 개업 ${num(s.current?.opened)}개 · 폐업 ${num(s.current?.closed)}개`:current?`추정 소비 ${num(e.latest.sales)}원 · 점포 ${num(e.latest.stores)}개`:'선택 분기의 관측값은 상세에서 확인하세요.'}</small><small>${s?`${period(s.periods[0])} → ${period(s.periods[1])}`:period(filters.period||e.period)} · 출처 기준 지역</small><span class="radar-evidence">${s?'공식 추정통계에서 계산':esc(e.issues.map(k=>issues[k]||'확인 필요').join(' · ')||'관측 자료')}</span><small>${esc(s?.next_action||'다음 확인: 동일 지리 기준과 업종 정의 검증')}</small></button>`;
    }).join('')||(data?'<p class="empty-state">조건에 맞는 근거가 없습니다. 지역·업종·근거 조건을 조정하세요.</p>':'');
    $('radar-more').hidden=rows.length<=limit;
    document.querySelectorAll('[data-radar-entity]').forEach(b=>b.onclick=()=>select(data.entities.find(e=>e.id===b.dataset.radarEntity)));
    document.querySelectorAll('[data-radar-region]').forEach(b=>b.onclick=()=>mode('region',{push:true}));
    document.querySelectorAll('[data-radar-retry]').forEach(b=>b.onclick=init);
  }
  async function select(entity){
    selected=entity;detail=null;const token=++sequence;render();
    $('radar-detail').innerHTML=`<h3>${esc(entity.area_name)} · ${esc(entity.industry_name)}</h3><p>선택 근거를 불러오고 있습니다.</p>`;
    try{
      let d=cache.get(entity.id);
      if(!d){const r=await fetch(entity.detail_url);if(!r.ok)throw Error('network');const bytes=await r.arrayBuffer();const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');if(hash!==entity.detail_hash)throw Error('mixed snapshot');d=JSON.parse(new TextDecoder().decode(bytes));if(d.snapshot_id!==data.snapshot_id||d.entity.id!==entity.id)throw Error('identity');cache.set(entity.id,d);}
      if(token!==sequence)return;detail=d;renderDetail();
      // Let the compact mobile layout settle before scrolling past its sticky switch.
      await new Promise(resolve=>requestAnimationFrame(resolve));if(token!==sequence)return;
      const panel=$('radar-detail');
      if(matchMedia('(max-width:800px)').matches)window.scrollTo(0,Math.max(0,panel.getBoundingClientRect().top+scrollY-70));
      else panel.scrollIntoView({block:'start'});
      panel.focus({preventScroll:true});
    }catch{if(token===sequence)$('radar-detail').innerHTML='<h3>상세 근거를 불러오지 못했습니다.</h3><p>자료가 갱신됐거나 네트워크 연결에 실패했습니다. 요약을 다시 불러온 후 선택하세요.</p><button id="radar-retry-detail">다시 확인</button>';const retry=$('radar-retry-detail');if(retry)retry.onclick=()=>select(entity);}
  }
  function chart(history,field,label,unit){
    if(history.length<3||history.some(h=>h[field]===null||!Number.isFinite(h[field])))return '<p>해당 지표는 아직 검증 가능한 데이터가 없습니다.</p>';
    const scale=field==='sales'?100000000:1;unit=field==='sales'?'억원':unit;const values=history.map(h=>h[field]/scale), max=Math.max(...values), ceiling=max||1;
    const x=i=>46+i*256/(history.length-1),y=v=>112-v/ceiling*88;
    return `<svg class="radar-chart" viewBox="0 0 330 150" role="img" aria-label="${esc(label)} · ${esc(unit)} · ${history.map(h=>period(h.period)).join(', ')}"><line x1="46" y1="24" x2="46" y2="112"/><line x1="46" y1="112" x2="302" y2="112"/><text x="4" y="22">${esc(unit)}</text><text x="4" y="37">${num(Math.round(max*100)/100)}</text><text x="24" y="115">0</text><path d="${values.map((v,i)=>(i?'L':'M')+x(i)+','+y(v)).join(' ')}"/>${values.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="3"><title>${period(history[i].period)}: ${num(v)} ${unit}</title></circle><text x="${x(i)}" y="136" text-anchor="middle">${history[i].period.slice(2,4)}.${history[i].period[4]}분기</text>`).join('')}</svg>`;
  }
  function renderDetail(){
    if(!selected||!detail)return;
    const h=detail.history.find(h=>h.period===(filters.period||selected.period)), ss=signals().filter(s=>s.entity_id===selected.id&&(!filters.period||filters.period===selected.period)), compatible=detail.comparable&&fresh(selected.period);
    const label=window.SideEconomyGIS?.selected()?.area?.trdar_name;
    const nextAction=ss[0]?.next_action||'공식 분기별 경계와 대응표로 비교 가능한 지역인지 확인하세요.';
    const candidates=window.SideEconomyGIS?.candidates()||[], current=window.SideEconomyGIS?.selected()?.candidate_id, candidate=candidates.find(c=>c.id===current);
    $('radar-detail').innerHTML=`<button id="radar-back-list" class="radar-action">← 근거 목록으로</button><h3>${esc(selected.area_name)} · ${esc(selected.industry_name)}</h3><p><strong>${esc(ss[0]?.interpretation||'관측 자료 확보 · 변화 비교는 확인 필요')}</strong></p><p>${period(h?.period)} · 공식 추정통계 · 개별 점포 실측 매출이 아닌 업종 전체 추정치</p>${!compatible?'<p class="radar-notice">지리 기준·지도 대응 확인 필요 · 변화 비교 보류</p>':''}<dl><div><dt>추정 소비 · 분기 합계</dt><dd>${num(h?.sales)}원</dd></div><div><dt>영업 점포</dt><dd>${num(h?.stores)}개</dd></div><div><dt>분기 개업</dt><dd>${num(h?.opened)}개</dd></div><div><dt>분기 폐업</dt><dd>${num(h?.closed)}개</dd></div></dl><p class="radar-next"><strong>다음 검증</strong><br>${esc(nextAction)}</p><button class="radar-action" id="radar-handoff">기존 지도 선택 지역의 사업성 검토</button><p>지도 선택과 사업 가설을 유지합니다. 새 통계는 매출 전망에 입력하지 않습니다.</p><details ${ss.length?'open':''}><summary>소비 추이 · 점포·경쟁 변화</summary>${compatible?chart(detail.history,'sales','추정 소비 추이','원'):'<p>해당 지표는 아직 검증 가능한 데이터가 없습니다. 동일 지리 기준을 확인하기 전에는 분기 간 변화선을 그리지 않습니다.</p>'}${compatible?chart(detail.history,'stores','영업 점포 추이','개'):''}<p>점포 수는 직접 경쟁점·무인기기·빈 호실 수가 아닙니다.</p></details><details><summary>인구·활동 변화</summary><p>해당 지표는 아직 검증 가능한 데이터가 없습니다. 250m 격자와 기존 상권의 공식 대응 및 시간 단위를 먼저 확인해야 합니다.</p></details><details><summary>관련 사업 가설</summary><p>${candidate?`선택한 사업 가설: ${esc(candidate.label)}. `:''}이 업종 통계가 해당 사업의 고객 문제나 매출을 직접 입증하지는 않습니다. 현장 증거가 확보되면 연구 가설로 기록하세요.</p></details><details><summary>위험·불확실성</summary><ul><li>${esc(ss[0]?.alternative||'카드 기반 보정 추정치입니다. 물가·보정 방식·특정 점포 매출 집중이 해석을 바꿀 수 있습니다.')}</li><li>${detail.geography.comparability_verified?'지리 비교 조건은 확인했지만 기존 지도 대응·실제 사이트 조건은 별도 확인이 필요합니다.':'분기별 경계 버전·기존 지도 대응·실제 사이트 조건은 미확인입니다.'}</li><li>새 통계 지역과 현재 지도 선택${label?' ('+esc(label)+')':''}은 별개입니다. 이름이나 가까운 중심점으로 연결하지 않습니다.</li></ul></details><details><summary>다음 검증 행동 · 근거 구별</summary><ol><li>${esc(ss[0]?.next_action||'공식 분기별 경계와 대응표로 비교 가능한 지역인지 확인하세요.')}</li><li>고객의 실제 지출·불편을 확인한 뒤 사이트 견적과 운영 시간을 조사하세요.</li></ol><p>시장 변화 → 사업 가설 → 사이트 조건 → 기획 가정 → 현장 근거를 구별합니다. 지도 선택과 사업 가설을 유지하며, 새 통계를 매출 전망에 입력하지 않습니다.</p></details><details><summary>출처·데이터 기준일·계산 방법</summary><p>수집일 ${esc(data.retrieved_at?.slice(0,10)||'미확인')} · 공표일 미확인<br>관측 ${data.periods.map(period).join(' / ')}<br>지역 코드 ${esc(selected.area_id)} · 업종 코드 ${esc(selected.industry_id)}<br>경계 버전 ${esc(detail.geography.version||'미확인')} · 좌표계 ${esc(detail.geography.crs||'미확인')}<br>근거 완결성 ${num(Math.round(selected.evidence_completeness*100))}% · 누락은 0으로 대체하지 않음</p>${detail.sources.map(s=>`<p><a href="${esc(sourceUrl(s.url))}" target="_blank" rel="noopener">${esc(s.name)}</a><br>${esc(s.license)}</p>`).join('')}<p>소비·점포 증가율 = (비교값 ÷ 전년 동분기 기준값 − 1) × 100. 기준값 0은 증가율 미계산. 개폐업은 최근 3개 연속 분기 방향을 구분합니다. 계절성·원인·수익은 추론하지 않습니다.</p><p><a href="./opportunity-radar-v1.md">비교 조건과 재현 방법</a></p><table class="radar-table"><caption>출처별 개별 관측 · 지리 기준 확인 전 추세 해석 보류</caption><thead><tr><th>분기</th><th>추정 소비(원)</th><th>점포(개)</th></tr></thead><tbody>${detail.history.map(h=>`<tr><td>${period(h.period)}</td><td>${num(h.sales)}</td><td>${num(h.stores)}</td></tr>`).join('')}</tbody></table>${sourceState?.reason?`<p>최근 수집 상태 코드: <code>${esc(sourceState.reason)}</code></p>`:''}</details>`;
    $('radar-handoff').onclick=()=>mode('evaluate',{push:true});$('radar-back-list').onclick=()=>{const id=selected.id;selected=null;detail=null;sequence++;$('radar-detail').innerHTML='<h3>선택 지역 없음</h3><p>관측 목록에서 확인할 지역·업종을 선택하세요.</p>';render();document.querySelector('.radar-panel').scrollTop=0;document.querySelector(`[data-radar-entity="${id}"]`)?.focus();};
  }
  async function init(){
    data=null;selected=null;detail=null;sequence++;cache.clear();
    try{
      const [r,s]=await Promise.all([fetch('./data/opportunity-radar.json'),fetch('./data/opportunity-radar-status.json').catch(()=>null)]);
      if(!r.ok)throw Error('network');data=prepare(await r.json());sourceState=s?.ok?await s.json():null;
      options('radar-area',new Map(data.entities.map(e=>[e.area_id,e.area_name])),'전체 수집 지역');
      options('radar-industry',[...new Map(data.entities.map(e=>[e.industry_id,e.industry_name]))].sort((a,b)=>a[1].localeCompare(b[1],'ko')),'전체 업종');
      options('radar-period',data.periods.map(p=>[p,period(p)]),'최근 분기');
      for(const [id,key] of [['radar-area','area'],['radar-industry','industry'],['radar-period','period'],['radar-type','type'],['radar-evidence','evidence'],['radar-sort','sort']])$(id).value=filters[key];
    }catch{data=null;}
    render();
  }
  for(const [id,key] of [['radar-area','area'],['radar-industry','industry'],['radar-period','period'],['radar-type','type'],['radar-evidence','evidence'],['radar-sort','sort']])$(id).onchange=()=>{filters[key]=$(id).value;limit=6;render();renderDetail();};
  $('radar-more').onclick=()=>{limit+=6;render();};$('radar-map-region').onclick=()=>mode('region',{push:true});
  document.querySelectorAll('[data-workspace-nav]').forEach(a=>a.onclick=()=>mode(a.dataset.workspaceNav));
  document.querySelectorAll('button[data-radar-view]').forEach(b=>b.onclick=()=>view(b.dataset.radarView));
  window.addEventListener('hashchange',()=>mode(location.hash.slice(1)));
  window.addEventListener('sideeconomy:gis-ready',()=>summary());
  window.addEventListener('sideeconomy:area-selected',e=>{
    summary();if(document.body.dataset.workspace!=='radar')return;
    if(selected){renderDetail();return;}
    // Source geography stays separate; map selection never pulls an ID/name join.
    if(!selected){$('radar-detail').innerHTML=`<h3>${esc(e.detail.area?.trdar_name||'선택 지역 없음')}</h3><p>${e.detail.area?'기존 지도에서 선택한 상권입니다. 새 매출·점포 통계와의 공식 지리 대응은 아직 확인되지 않았습니다.':'지도나 출처 기준 관측 목록에서 지역을 선택하세요.'}</p><button class="radar-action" id="radar-map-handoff">선택 지역의 기존 연구 확인</button>`;$('radar-map-handoff').onclick=()=>mode('region',{push:true});}
  });
  window.OpportunityRadar={mapRows:rows=>document.body.dataset.workspace==='radar'?rows.slice(0,12):rows,mode,prepare};
  mode(location.hash.slice(1));view('map');init();
})();
