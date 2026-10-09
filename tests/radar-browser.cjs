/* Production observations and explicit synthetic network failures; no fixture data published. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),crypto=require('crypto');
const {execFile}=require('child_process'),{promisify}=require('util');
const base=process.env.GIS_TEST_URL||'http://127.0.0.1:8765/SideEconomyLab/';
const output=process.env.RADAR_SCREENSHOTS||'/tmp/radar-browser';fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push({url:r.url(),method:r.method()}));
 for(const [url,file] of [['https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','leaflet/dist/leaflet.js'],['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','leaflet/dist/leaflet.css'],['https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.11.0/proj4.js','proj4/dist/proj4.js']])await page.route(url,r=>r.fulfill({path:require.resolve(file)}));
 // Optional local verification uses exact requested OSM tiles fetched through the
 // configured session proxy with Python TLS verification. CI remains offline here;
 // the existing GIS suite separately verifies the real renderer/network provider.
 await page.route('https://*.tile.openstreetmap.org/**',async r=>{
  if(!process.env.RADAR_TILE_FETCH)return r.abort();
  try{const result=await promisify(execFile)('python',[process.env.RADAR_TILE_FETCH,r.request().url()],{encoding:'buffer',maxBuffer:2000000});await r.fulfill({body:result.stdout,contentType:'image/png'});}catch{await r.abort();}
 });
 const source=JSON.parse(fs.readFileSync('docs/data/opportunity-radar.json','utf8'));
 async function ready(){await page.waitForFunction(()=>state.data&&state.adapter&&document.querySelectorAll('.radar-item').length>0);}
 try{
  await page.goto(base);await ready();
  assert.equal(await page.evaluate(()=>document.body.dataset.workspace),'radar');
  assert.ok((await page.locator('.radar-overview').innerText()).includes('검증 가능한 변화\n0'));
  assert.equal(await page.locator('[data-workspace-nav]').count(),3);
  assert.equal(await page.locator('.radar-item').count(),6);
  assert.equal(await page.evaluate(()=>state.adapter.layers.demand.getLayers().length),12);
  assert.equal(await page.locator('.poi-marker').count(),0);
  assert.ok(!requests.some(r=>/decision-evidence\.json|source\.json\.gz/.test(r.url)),'heavy decision evidence and raw sources are lazy');
  assert.ok(!requests.some(r=>/opportunity-radar-details/.test(r.url)),'no detail before selection');
  assert.ok((await page.locator('#radar-source-state').innerText()).includes('개별 관측'));
  if(process.env.RADAR_TILE_FETCH)await page.waitForFunction(()=>document.querySelectorAll('.leaflet-tile').length>=4&&[...document.querySelectorAll('.leaflet-tile')].every(t=>t.classList.contains('leaflet-tile-loaded')&&Number(getComputedStyle(t).opacity)>.99));
  await page.screenshot({path:output+'/desktop-overview.png'});
  fs.writeFileSync(output+'/initial-load.json',JSON.stringify(await page.evaluate(()=>({navigation:performance.getEntriesByType('navigation').map(e=>({domContentLoaded_ms:e.domContentLoadedEventEnd,load_ms:e.loadEventEnd})),public_json:performance.getEntriesByType('resource').filter(e=>e.name.includes('/data/')).map(e=>({file:new URL(e.name).pathname.split('/').at(-1),encoded_bytes:e.encodedBodySize,transfer_bytes:e.transferSize})),markers:state.adapter.layers.demand.getLayers().length})),null,2));
  const first=source.entities[0];await page.locator('.radar-item').first().focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#radar-handoff'));
  assert.ok((await page.locator('#radar-detail').innerText()).includes('지도 대응'));
  assert.equal(await page.locator('.radar-chart').count(),0,'unknown geographic version must not draw a trend');
  assert.ok((await page.locator('#radar-detail').innerText()).includes(first.latest.stores.toLocaleString('ko-KR')));
  assert.equal(requests.filter(r=>/opportunity-radar-details/.test(r.url)).length,1);
  await page.screenshot({path:output+'/selected-area-detail.png'});
  await page.locator('#radar-detail details').last().locator('summary').click();
  for(const url of await page.locator('#radar-detail a[target=_blank]').evaluateAll(xs=>xs.map(x=>x.href)))assert.equal(new URL(url).hostname,'data.seoul.go.kr');
  const text=await page.locator('#radar-detail').innerText();for(const label of ['2025년 2분기','2026년 2분기','공표일 미확인','경계 버전 미확인','추정통계'])assert.ok(text.includes(label),label);
  const originalArea=await page.evaluate(()=>state.selectedArea.trdar_cd);
  await page.selectOption('#candidate','vending');assert.equal(await page.evaluate(()=>state.selectedArea.trdar_cd),originalArea,'candidate switch preserves reasonable map context');
  await page.locator('#radar-handoff').click();await page.waitForFunction(()=>document.querySelectorAll('.di-play').length===4);
  assert.equal(await page.evaluate(()=>state.selectedArea.trdar_cd),originalArea);
  assert.equal(await page.locator('#candidate').inputValue(),'vending');
  assert.ok(requests.some(r=>r.url.endsWith('decision-evidence.json')));
  assert.equal(await page.evaluate(()=>localStorage.length),0,'research handoff must not fabricate private sites/scenarios');
  await page.goBack();await page.waitForFunction(()=>document.body.dataset.workspace==='radar');
  await page.selectOption('#radar-area','3120189');assert.ok(await page.locator('.radar-item').evaluateAll(xs=>xs.every(x=>x.textContent.includes('강남역'))));
  await page.selectOption('#radar-industry','CS100001');assert.equal(await page.locator('.radar-item').count(),1);
  await page.selectOption('#radar-period','20252');await page.locator('.radar-item').click();await page.waitForFunction(()=>document.querySelector('#radar-handoff'));
  assert.ok((await page.locator('#radar-detail').innerText()).includes('2025년 2분기'));
  await page.locator('.radar-more summary').click();await page.selectOption('#radar-evidence','eligible');assert.equal(await page.locator('.radar-item').count(),0);assert.ok((await page.locator('#radar-detail').innerText()).includes('선택 지역 없음'));
  await page.selectOption('#radar-evidence','');await page.selectOption('#radar-type','spending');assert.equal(await page.locator('.radar-item').count(),0);
  await page.selectOption('#radar-type','');await page.selectOption('#radar-industry','');await page.selectOption('#radar-sort','spending');assert.ok((await page.locator('#radar-source-state').innerText()).includes('같은 업종'));
  await page.selectOption('#radar-sort','recent');await page.selectOption('#radar-area','');await page.selectOption('#radar-period','');
  await page.click('#radar-more');assert.equal(await page.locator('.radar-item').count(),12);
  // Map selection updates the integrated panel while explicitly refusing source joins.
  await page.reload();await ready();
  const selection=await page.evaluate(()=>{const a=state.visible[2].a;state.adapter.focus(toLatLng(a));return {code:a.trdar_cd,point:state.adapter.project(toLatLng(a))};});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const mb=await page.locator('#map').boundingBox();await page.mouse.click(mb.x+selection.point.x,mb.y+selection.point.y);
  assert.equal(await page.evaluate(()=>state.selectedArea.trdar_cd),selection.code);
  assert.ok((await page.locator('#radar-detail').innerText()).includes('기존 지도'));
  const detailRequests=requests.filter(r=>/opportunity-radar-details/.test(r.url)).length;
  await page.click('#seoul-view');await page.selectOption('#candidate','photo');
  assert.equal(requests.filter(r=>/opportunity-radar-details/.test(r.url)).length,detailRequests,'map/candidate interaction must not download unrelated evidence');
  for(const width of [1440,1024,390]){
   await page.setViewportSize({width,height:width===390?844:1000});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no page overflow '+width);
   if(width===1024){assert.ok((await page.locator('#map').boundingBox()).width>600);await page.screenshot({path:output+'/tablet.png'});}
   if(width===390){
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:output+'/mobile-overview.png'});
    await page.click('[data-radar-view=list]');assert.ok(await page.locator('.radar-panel').isVisible());assert.ok(!await page.locator('.map-wrap').isVisible());
    await page.locator('.radar-item').first().click();await page.waitForFunction(()=>document.querySelector('#radar-handoff'));
    assert.ok(!await page.locator('#radar-list').isVisible(),'mobile investigation hides the long list');assert.ok(!await page.locator('.radar-toolbar').isVisible());
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.waitForFunction(()=>document.querySelector('#radar-back-list').getBoundingClientRect().top>=document.querySelector('.radar-mobile-switch').getBoundingClientRect().bottom);assert.equal(await page.locator('#radar-back-list').evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e;}),true,'return control is not covered');fs.writeFileSync(output+'/mobile-layout-metrics.json',JSON.stringify(await page.evaluate(()=>({scroll:scrollY,detail:document.querySelector('#radar-detail').getBoundingClientRect().toJSON(),back:document.querySelector('#radar-back-list').getBoundingClientRect().toJSON(),switch:document.querySelector('.radar-mobile-switch').getBoundingClientRect().toJSON(),margin:getComputedStyle(document.querySelector('#radar-detail')).scrollMarginTop})),null,2));await page.screenshot({path:output+'/mobile-layout.png'});
    await page.click('#radar-back-list');assert.ok(await page.locator('.radar-toolbar').isVisible());assert.ok(await page.locator('.radar-item').first().isVisible());
    await page.click('[data-radar-view=map]');assert.ok(await page.locator('#map').isVisible());
   }
  }
  await page.setViewportSize({width:1440,height:1000});
  // Network unavailable / truthful blocked source / stale evidence / integrity mismatch.
  await page.route('**/data/opportunity-radar.json',r=>r.abort());await page.reload();await page.locator('[data-radar-retry]').waitFor();
  assert.ok((await page.locator('#radar-source-state').innerText()).includes('불러오지'));await page.unroute('**/data/opportunity-radar.json');await page.click('[data-radar-retry]');await ready();
  await page.route('**/data/opportunity-radar-status.json',r=>r.fulfill({json:{schema_version:1,status:'BLOCKED',reason:'SYNTHETIC_AUTH_FAILURE_FOR_BROWSER_TEST',attempted_at:'2026-10-09T00:00:00Z'}}));
  await page.reload();await ready();assert.ok((await page.locator('#radar-source-state').innerText()).includes('수집에 실패'));
  if(process.env.RADAR_TILE_FETCH)await page.waitForFunction(()=>document.querySelectorAll('.leaflet-tile').length>=4&&[...document.querySelectorAll('.leaflet-tile')].every(t=>t.classList.contains('leaflet-tile-loaded')&&Number(getComputedStyle(t).opacity)>.99));await page.screenshot({path:output+'/blocked-source.png'});await page.unroute('**/data/opportunity-radar-status.json');
  const stale=structuredClone(source);stale.periods=['20241','20242','20243','20244','20251'];for(const e of stale.entities){e.period='20251';e.latest.period='20251';}for(const s of stale.sources)s.periods=stale.periods;
  await page.route('**/data/opportunity-radar.json',r=>r.fulfill({json:stale}));await page.reload();await ready();assert.ok((await page.locator('#radar-source-state').innerText()).includes('오래된 관측'));await page.unroute('**/data/opportunity-radar.json');
  await page.reload();await ready();const detailUrl=source.entities[0].detail_url.replace('./','');await page.route('**/'+detailUrl,r=>r.fulfill({json:{schema_version:1,snapshot_id:'mismatched'}}));await page.locator('.radar-item').first().click();await page.locator('#radar-retry-detail').waitFor();assert.equal(await page.locator('.radar-chart').count(),0);await page.unroute('**/'+detailUrl);await page.click('#radar-retry-detail');await page.waitForFunction(()=>document.querySelector('#radar-handoff'));
  // Pure synthetic compatible signals exercise otherwise disabled derivation UI.
  // Clearly labeled fixture never touches repository data or production publication.
  const fixture=structuredClone(source),e=structuredClone(source.entities[0]);fixture.entities=[e];fixture.geography={...fixture.geography,comparability_verified:true,version:'SYNTHETIC_BROWSER_TEST_ONLY',geometry_version:'SYNTHETIC_BROWSER_TEST_ONLY',crs:'SYNTHETIC_BROWSER_TEST_ONLY'};e.area_name='합성 브라우저 테스트 지역';e.issues=[];e.signal_ids=[e.id+'-spending'];
  const signal={id:e.signal_ids[0],entity_id:e.id,type:'spending',interpretation:'합성 테스트: 소비 증가율이 점포 증가율보다 높습니다.',alternative:'합성 테스트 대안 설명',next_action:'합성 테스트 고객 지출 확인',periods:['20252','20262'],evidence_status:'DERIVED_FROM_MODELED_STATISTICS',evidence_completeness:1,sales_change_pct:20,store_change_pct:5};fixture.signals=[signal];
  const d=JSON.parse(fs.readFileSync('docs/'+detailUrl,'utf8'));d.entity=e;d.comparable=true;d.geography=fixture.geography;d.signals=[signal];const bytes=Buffer.from(JSON.stringify(d));e.detail_hash=crypto.createHash('sha256').update(bytes).digest('hex');
  await page.route('**/data/opportunity-radar.json',r=>r.fulfill({json:fixture}));await page.route('**/'+detailUrl,r=>r.fulfill({body:bytes,contentType:'application/json'}));await page.reload();await ready();assert.ok((await page.locator('.radar-overview').innerText()).includes('검증 가능한 변화\n1'));await page.locator('.radar-item').click();await page.waitForFunction(()=>document.querySelectorAll('.radar-chart').length===2);await page.locator('#radar-detail details').filter({hasText:'위험·불확실성'}).locator('summary').click();assert.ok((await page.locator('#radar-detail').innerText()).includes('합성 테스트 대안 설명'));await page.selectOption('#radar-period','20252');assert.ok(!(await page.locator('#radar-detail').innerText()).includes(signal.interpretation),'older observation must not inherit the latest comparison signal');await page.locator('.radar-more summary').click();await page.selectOption('#radar-evidence','eligible');assert.equal(await page.locator('.radar-item').count(),0,'no comparison signal for an older selected quarter');
  assert.deepEqual(errors,[],'no browser runtime errors');assert.ok(!requests.some(r=>r.method!=='GET'),'no writes');assert.ok(!requests.some(r=>/openapi\.seoul|apis\.data\.go|reb\.or\.kr|source\.json\.gz/.test(r.url)),'no secret/source API requests in browser');
  console.log('RADAR_BROWSER_PASS: discover, investigate, handoff, uncertainty, filters, map sync, responsive, empty/error/stale, provenance, synthetic compatible charts');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
