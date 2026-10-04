/* Optional context only. No effect on demand, supply, quadrants or site terms. */
window.RealEstateContext=(()=>{
  const statuses=new Set(['AVAILABLE','UNAVAILABLE','NOT_COLLECTED','STALE','INCOMPATIBLE_GEOGRAPHY','SOURCE_ERROR']);
  const labels={AVAILABLE:'이용 가능',UNAVAILABLE:'이용 불가',NOT_COLLECTED:'미수집',STALE:'오래된 관측',INCOMPATIBLE_GEOGRAPHY:'공간 연결 보류',SOURCE_ERROR:'소스 검증 실패'};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
  const isoDay=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
  function endDate(p){if(typeof p!=='string'||!/^20\d{2}[1-4]$/.test(p))return null;return new Date(Date.UTC(Number(p.slice(0,4)),Number(p[4])*3,0));}
  function statusNow(row,today=new Date().toISOString().slice(0,10)){
    if(!['AVAILABLE','STALE'].includes(row?.status))return statuses.has(row?.status)?row.status:'SOURCE_ERROR';
    const end=endDate(row.period);if(!end||!isoDay(today))return 'SOURCE_ERROR';
    const age=(Date.parse(today)-end.getTime())/86400000;
    if(age<0)return 'SOURCE_ERROR';
    return age>180?'STALE':'AVAILABLE';
  }
  function prepare(data,demand){
    const failure=status=>({status,data:null,areas:new Map()});
    if(!data)return failure('UNAVAILABLE');
    if(data.schema_version!==1||!Array.isArray(data.areas)||!Array.isArray(data.markets)||!isoDay(data.as_of)||typeof data.retrieved_at!=='string'||Number.isNaN(Date.parse(data.retrieved_at)))return failure('SOURCE_ERROR');
    if(data.demand_hash!==demand._contentHash)return failure('INCOMPATIBLE_GEOGRAPHY');
    const targets=new Map(demand.areas.map(a=>[String(a.trdar_cd),a]));
    const areas=new Map();
    for(const r of data.areas){
      const target=targets.get(r?.trdar_cd);
      if(!target||areas.has(r.trdar_cd)||r.target_name!==target.trdar_name||r.geography_type!=='commercial_area_id'||!endDate(r.period)||!statuses.has(r.status))return failure('SOURCE_ERROR');
      const mapped=['AVAILABLE','STALE'].includes(r.status);
      if(mapped&&(r.mapping!=='exact_id_and_name'||r.source_name!==target.trdar_name||r.exactness!=='published_area_aggregate'||![r.store_count,r.opened_count,r.closed_count].every(finite)))return failure('SOURCE_ERROR');
      if(!mapped&&[r.store_count,r.opened_count,r.closed_count].some(v=>v!==null))return failure('SOURCE_ERROR');
      areas.set(r.trdar_cd,r);
    }
    if(areas.size!==targets.size||data.markets.length!==1)return failure('SOURCE_ERROR');
    const market=data.markets[0];
    if(!market||market.geography_type!=='city'||market.geography_id!=='11'||market.exactness!=='contextual_only'||market.source_id!=='reb-small-retail'||!['AVAILABLE','STALE'].includes(market.status)||!endDate(market.period)||!finite(market.rent_thousand_krw_per_sqm)||!finite(market.vacancy_pct)||market.vacancy_pct>100)return failure('SOURCE_ERROR');
    if(!data.sources?.['reb-small-retail']||!data.sources?.['seoul-stores'])return failure('SOURCE_ERROR');
    return {status:'AVAILABLE',data,areas};
  }
  function quarter(p){return endDate(p)?`${p.slice(0,4)} Q${p[4]}`:'관측 분기 미상';}
  function link(url,text){try{const u=new URL(url);if(u.protocol==='https:'&&['www.reb.or.kr','data.seoul.go.kr'].includes(u.hostname))return `<a href="${esc(u.href)}" target="_blank" rel="noopener">${esc(text)} ↗</a>`;}catch{}return esc(text);}
  function render(area,context){
    const title='<h3><span class="kind">DATA · CONTEXT</span>REAL-ESTATE CONTEXT · 부동산 맥락</h3>';
    const warning='<p class="caution">시장 통계 ≠ 실제 사이트 조건. 월세·보증금·관리비·호스트 배분은 UNKNOWN이며 통계로 대입하지 않습니다.</p>';
    if(!context?.data)return `<section class="decision-section real-estate-section">${title}<p>${labels[context?.status||'UNAVAILABLE']} · 검증된 부동산 맥락을 표시할 수 없습니다.</p>${warning}</section>`;
    const data=context.data,market=data.markets[0],row=context.areas.get(String(area.trdar_cd));
    const marketStatus=statusNow(market),rowStatus=statusNow(row);
    const marketValid=['AVAILABLE','STALE'].includes(marketStatus);
    const number=n=>finite(n)?n.toLocaleString('ko-KR',{maximumFractionDigits:0}):'UNKNOWN';
    return `<section class="decision-section real-estate-section">${title}
      <p><b>서울 전체 · 소규모 상가</b><br>${quarter(market.period)} · ${labels[marketStatus]} · CONTEXT_ONLY<br>선택 상권·자치구·설치 장소의 고유 관측값이 아닙니다.</p>
      <div class="metrics"><div><span>환산 시장임대료</span><b>${marketValid?market.rent_thousand_krw_per_sqm.toFixed(1):'UNKNOWN'}</b><small>천원/㎡/월 · 서울 전체</small></div><div><span>공실률</span><b>${marketValid?market.vacancy_pct.toFixed(1)+'%':'UNKNOWN'}</b><small>서울 전체 조사표본</small></div></div>
      <details><summary>출처·기간·상권 점포 동향</summary>
        <p>${link(data.sources['reb-small-retail'].url,'한국부동산원 · 임대료')} / ${link(data.sources['reb-small-retail'].vacancy_url,'공실률')}<br>관측 ${quarter(market.period)} · 공간 해상도 서울시 전체 · 맥락 연결<br>보증금을 월세로 환산한 1층 기준 임대료 · 관리비·부가세 제외. 설치 면적에 곱해 견적을 만들지 않습니다.</p>
        <p><b>상권 점포 동향 · ${labels[rowStatus]}</b><br>${quarter(row?.period)} · ${row?.mapping==='exact_id_and_name'?'공개 상권 ID·이름 일치':'공간 연결 미입증'} · 상권 집계</p>
        ${['AVAILABLE','STALE'].includes(rowStatus)?`<p>분류 업종 점포 ${number(row.store_count)}개 · 분기 개업 ${number(row.opened_count)}개 · 폐업 ${number(row.closed_count)}개</p><p>과거 관측입니다. 점포 수는 임대 가능한 공간 수가 아니며 개폐업은 좋음/나쁨 판정이 아닙니다. ${rowStatus==='STALE'?'180일 경과 · 현재 동향으로 해석하지 마세요.':''}</p>`:'<p>점포·개폐업 UNKNOWN · 코드만으로 이름이 다른 상권을 자동 연결하지 않습니다.</p>'}
        <p>${link(data.sources['seoul-stores'].url,'서울신용보증재단 / 서울특별시 · 점포-상권')}<br>1,650개 중 ID·이름 일치 ${number(data.coverage?.matched_area_count)}개 · 폴리곤 동일성/표준단위구역 변환 미입증</p>
        <p>수집 ${esc(data.retrieved_at)} · 스냅샷 ${esc(data.snapshot_id)}<br>조회 시점과 관측 분기는 다릅니다. 분기말 이후 180일 경과 시 STALE로 표시합니다.</p>
      </details>
      <p>건축물·호스트 가능성: NOT_COLLECTED · 실제 주소/건물을 선정한 뒤 대장·층별 용도·면적·접근·허용 조건 확인</p>${warning}</section>`;
  }
  return Object.freeze({prepare,statusNow,render});
})();
