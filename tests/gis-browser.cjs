const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.GIS_TEST_URL||'http://127.0.0.1:8765/SideEconomyLab/';
let activePage;
fs.mkdirSync('/tmp/gis-browser',{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1600,height:1000}});activePage=page;
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push('browser console error');});
  await page.goto(base);await page.locator('.top-item').first().waitFor();
  assert.equal(await page.locator('iframe').count(),0,'map is the application, not an embed');
  assert.equal(await page.locator('#area-count').innerText(),'1,650');
  assert.equal(await page.evaluate(()=>state.adapter.provider),'leaflet');
  await page.waitForFunction(()=>document.querySelectorAll('.leaflet-tile-loaded').length>0);
  const desktop=await page.locator('#map').boundingBox();assert.ok(desktop.width>1600/2);
  assert.equal(await page.locator('#candidate option').count(),4);
  assert.equal(await page.evaluate(()=>state.realEstate.status),'AVAILABLE');
  const estate=await page.locator('.real-estate-section').innerText();
  for(const text of ['서울 전체','2026 Q2','52.8','6.4%','CONTEXT_ONLY','NOT_COLLECTED'])assert.ok(estate.includes(text));
  await page.locator('.real-estate-section summary').click();
  assert.ok((await page.locator('.real-estate-section').innerText()).includes('2025 Q4'));
  assert.ok((await page.locator('.real-estate-section').innerText()).includes('오래된 관측'));
  await page.locator('.real-estate-section').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/gis-browser/real-estate-panel.png'});
  await page.locator('.real-estate-section summary').click();await page.locator('#intelligence').evaluate(e=>e.scrollTop=0);
  assert.ok(await page.evaluate(()=>state.evidence&&evidenceCandidate().measured_count>=15));
  const median=await page.evaluate(()=>evidenceCandidate().reference_median);if(median!==null)assert.ok((await page.locator('#selected-card').innerText()).includes(String(median)+'개'));
  await page.locator('#filter-panel').evaluate(e=>e.open=true);
  for(const mode of ['supply','quadrant','demand']){
    await page.selectOption('#map-mode',mode);assert.equal(await page.evaluate(()=>state.mode),mode);
    assert.ok((await page.locator('#map-legend').innerText()).length>0);
  }
  await page.selectOption('#supply-filter','UNMEASURED');
  assert.ok(await page.evaluate(()=>state.visible.every(x=>supplyFor(x.a).relevant_count===null&&supplyFor(x.a).quadrant==='E')));
  assert.ok(!(await page.locator('.supply-section').innerText()).includes('관련 POI (직접형 + 대체형)\n0'));
  await page.selectOption('#supply-filter','MEASURED');assert.ok(await page.evaluate(()=>state.visible.every(x=>supplyFor(x.a).status==='MEASURED')));
  await page.selectOption('#sort-order','supply');assert.ok(await page.evaluate(()=>state.visible.every((x,i)=>!i||supplyFor(state.visible[i-1].a).relevant_count<=supplyFor(x.a).relevant_count)));
  await page.selectOption('#sort-order','whitespace');assert.ok(await page.evaluate(()=>state.visible.every(x=>['A','C'].includes(supplyFor(x.a).quadrant))));
  await page.selectOption('#sort-order','demand');await page.selectOption('#supply-filter','all');
  await page.selectOption('#district-filter','강남구');assert.ok(await page.evaluate(()=>state.visible.every(x=>x.a.district==='강남구')));await page.selectOption('#district-filter','');
  for(const quadrant of ['A','B','C','D','E']){await page.selectOption('#quadrant-filter',quadrant);assert.ok(await page.evaluate(()=>state.visible.every(x=>supplyFor(x.a).quadrant===state.quadrant)));}
  await page.selectOption('#quadrant-filter','all');await page.click('[data-threshold="85"]');

  for(const candidate of ['photo','vending','luggage','booth']){
    await page.selectOption('#candidate',candidate);
    const code=await page.locator('.top-item').nth(1).getAttribute('data-code');await page.locator('.top-item').nth(1).click();
    assert.equal(await page.evaluate(()=>state.selectedArea.trdar_cd),code);
    const panel=await page.locator('#selected-card').innerText();
    for(const label of ['DERIVED SIGNAL','DATA','UNKNOWN','FIELD CHECK', '백분위'])assert.ok(panel.includes(label));
    const synchronized=await page.evaluate(()=>{
      const a=state.selectedArea,s=signals(a);return {candidate:CANDIDATES[state.candidate].id,score:currentScore(a),reconstructed:s.reduce((total,x)=>total+100*x.weight*x.percentile,0),rank:state.rankByCode.get(a.trdar_cd),poi:poiAreaFor(a.trdar_cd)?.unique_poi_count};
    });
    assert.ok(Math.abs(synchronized.score-synchronized.reconstructed)<.02,'unchanged scoring explanation');
    assert.ok(panel.includes(synchronized.candidate));assert.ok(panel.includes('#'+synchronized.rank));
    assert.ok(panel.includes('서울 전체'));assert.ok(panel.includes('52.8'));assert.ok(panel.includes('SITE ECONOMICS'));
    assert.ok(await page.locator('.poi-marker').count()>0);
  }
  await page.click('[data-threshold="95"]');
  for(const s of await page.locator('.top-item .score').allTextContents())assert.ok(Number(s)>=95);
  await page.fill('#area-search','__no_area__');assert.equal(await page.locator('#visible-count').innerText(),'0');assert.equal(await page.locator('.top-item').count(),0);assert.equal(await page.locator('.poi-marker').count(),0);assert.ok((await page.locator('#top-list').innerText()).includes('조건에 맞는'));
  await page.click('#search-clear');await page.click('[data-threshold="0"]');await page.fill('#area-search','강남');assert.ok(await page.locator('.top-item').count()>0);await page.click('#search-clear');
  assert.equal(await page.locator('.top-item').count(),30);await page.click('#load-more');assert.equal(await page.locator('.top-item').count(),60);
  await page.locator('.top-item').first().click();
  await page.uncheck('#show-poi');assert.equal(await page.locator('.poi-marker').count(),0);await page.check('#show-poi');assert.ok(await page.locator('.poi-marker').count()>0);
  await page.uncheck('#show-demand');assert.equal(await page.evaluate(()=>state.adapter.layers.demand.getLayers().length),0);await page.check('#show-demand');
  assert.ok(await page.evaluate(()=>state.adapter.layers.demand.getLayers().length)>0);
  // Select a different real area through a real Leaflet canvas hit target.
  const target=await page.evaluate(()=>{const a=state.visible[2].a;state.adapter.focus(toLatLng(a));return {code:a.trdar_cd,point:state.adapter.project(toLatLng(a))};});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const mapBox=await page.locator('#map').boundingBox();await page.mouse.click(mapBox.x+target.point.x,mapBox.y+target.point.y);
  assert.equal(await page.evaluate(()=>state.selectedArea.trdar_cd),target.code);
  for(const u of await page.locator('.poi-list a').evaluateAll(es=>es.map(e=>e.href)))assert.equal(new URL(u).hostname,'place.map.kakao.com');
  await page.evaluate(()=>{for(const el of document.querySelectorAll('.poi-marker')){const r=el.getBoundingClientRect();if(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el){el.dataset.gisExposed='true';break;}}});await page.locator('[data-gis-exposed=true]').hover();await page.locator('.leaflet-tooltip').last().waitFor();await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelectorAll('.leaflet-tooltip').length===0);assert.equal(await page.locator('.leaflet-tooltip').count(),0);
  await page.click('[data-dialog="method-dialog"]');assert.ok(await page.locator('#method-dialog').isVisible());await page.locator('#method-dialog [data-close-dialog]').click();
  await page.click('[data-dialog="transaction-dialog"]');for(const c of ['OC-021','OC-022','OC-030'])assert.ok((await page.locator('#transaction-dialog').innerText()).includes(c));await page.locator('#transaction-dialog [data-close-dialog]').click();
  await page.locator('#navigator').evaluate(e=>{e.scrollTop=0;});await page.locator('.filter-content').evaluate(e=>{e.scrollTop=0;});await page.waitForTimeout(300);
  await page.screenshot({path:'/tmp/gis-browser/desktop.png'});
  await page.selectOption('#map-mode','quadrant');await page.screenshot({path:'/tmp/gis-browser/quadrants.png'});await page.selectOption('#map-mode','demand');
  await page.setViewportSize({width:390,height:844});await page.reload();await page.locator('.top-item').first().waitFor({state:'attached'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const mobile=await page.locator('#map').boundingBox();assert.ok(mobile.y<160&&mobile.height>500);
  await page.screenshot({path:'/tmp/gis-browser/mobile-map.png'});
  await page.click('.mobile-tabs [data-sheet="rank"]');assert.ok(await page.locator('#navigator').isVisible());await page.locator('.top-item').nth(1).click();assert.ok(await page.locator('#intelligence').isVisible());await page.screenshot({path:'/tmp/gis-browser/mobile-decision.png'});
  await page.click('#intelligence [data-sheet="close"]');await page.click('.mobile-tabs [data-sheet="filters"]');await page.click('[data-threshold="90"]');await page.uncheck('#show-poi');await page.click('#navigator [data-sheet="close"]');assert.equal(await page.locator('.poi-marker').count(),0);
  await page.goto(base+'gis.html');await page.waitForURL(base+'index.html');await page.locator('#map').waitFor();
  assert.deepEqual(errors,[],'normal runtime has no console/page errors');
  // Optional datasets can be missing and candidate switches remain usable.
  await page.route('**/data/kakao-poi-layer.json',r=>r.fulfill({status:404,body:''}));await page.route('**/data/site-observations.json',r=>r.fulfill({status:404,body:''}));await page.route('**/data/map-runtime.json',r=>r.fulfill({status:404,body:''}));
  await page.reload();await page.waitForFunction(()=>state.data&&state.adapter);assert.equal(await page.evaluate(()=>state.sites.length),0);assert.ok((await page.locator('#selected-card').innerText()).includes('POI 데이터를 불러오지'));
  await page.selectOption('#candidate','photo');assert.ok(await page.evaluate(()=>state.visible.length)>0);await page.unrouteAll();
  // Malformed optional collections/config must not break the workspace.
  await page.route('**/data/kakao-poi-layer.json',r=>r.fulfill({json:{candidates:{booth:{areas:[{trdar_cd:'3001492',pois:{},query_stats:{}}]},photo:{areas:{}}}}}));
  await page.route('**/data/map-runtime.json',r=>r.fulfill({json:{schema_version:1,preferred_basemap:'kakao',browser_app_key:'a'.repeat(32),allowed_origins:{}}}));
  await page.reload();await page.waitForFunction(()=>state.data&&state.adapter);await page.selectOption('#candidate','photo');assert.ok(await page.evaluate(()=>state.visible.length)>0);await page.unrouteAll();
  errors.length=0;
  // Optional real-estate context must never change the v3 analytical state.
  await page.setViewportSize({width:1600,height:1000});await page.reload();await page.waitForFunction(()=>state.data&&state.adapter);
  const unchanged=await page.evaluate(()=>({scores:state.data.areas.map(a=>a.scores),quadrants:state.evidence.candidates.booth.areas.map(a=>a.quadrant)}));
  await page.route('**/data/real-estate-context.json',r=>r.fulfill({status:404,body:''}));
  await page.reload();await page.waitForFunction(()=>state.data&&state.adapter);
  assert.equal(await page.evaluate(()=>state.realEstate.status),'UNAVAILABLE');
  assert.ok((await page.locator('.real-estate-section').innerText()).includes('이용 불가'));
  assert.deepEqual(await page.evaluate(()=>({scores:state.data.areas.map(a=>a.scores),quadrants:state.evidence.candidates.booth.areas.map(a=>a.quadrant)})),unchanged);await page.unrouteAll();
  errors.length=0; // Deliberate404 may produce Chromium's network diagnostic.
  await page.route('**/data/real-estate-context.json',r=>r.fulfill({json:{schema_version:1,areas:[],markets:[]}}));
  await page.reload();await page.waitForFunction(()=>state.data&&state.adapter);assert.equal(await page.evaluate(()=>state.realEstate.status),'SOURCE_ERROR');await page.unrouteAll();
  const contextFixture=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/data/real-estate-context.json'),'utf8'));
  await page.route('**/data/real-estate-context.json',r=>r.fulfill({json:{...contextFixture,demand_hash:'mismatched'}}));
  await page.reload();await page.waitForFunction(()=>state.data&&state.adapter);assert.equal(await page.evaluate(()=>state.realEstate.status),'INCOMPATIBLE_GEOGRAPHY');assert.ok((await page.locator('.real-estate-section').innerText()).includes('공간 연결 보류'));await page.unrouteAll();
  await page.reload();await page.waitForFunction(()=>state.data&&state.adapter);
  await page.evaluate(()=>selectArea(state.data.areas.find(a=>a.trdar_cd==='3110379'),{openSheet:false}));
  await page.locator('.real-estate-section summary').click();assert.ok((await page.locator('.real-estate-section').innerText()).includes('점포·개폐업 UNKNOWN'));
  errors.length=0;
  // Stale derived evidence must never produce zero supply or quadrants.
  await page.route('**/data/opportunity-intelligence.json',r=>r.fulfill({json:{schema_version:1,source_hash:'mismatched',candidates:{}}}));await page.reload();await page.waitForFunction(()=>state.data&&state.adapter);assert.equal(await page.evaluate(()=>state.evidence),null);assert.equal(await page.evaluate(()=>supplyFor(state.selectedArea).relevant_count),null);await page.unrouteAll();
  // Synthetic observed site only in the test, never in committed business data.
  const a=await page.evaluate(()=>state.data.areas[0]);const position=await page.evaluate(a=>toLatLng(a),a);
  const synthetic={schema_version:1,sites:[{site_id:'fixture-only',candidate_id:'OC-001',name:'Synthetic QA site',lat:position[0],lng:position[1],commercial_area_id:a.trdar_cd,rent:null,deposit:null},{site_id:'invalid',candidate_id:'OC-001',lat:null,lng:null}]};
  await page.route('**/data/site-observations.json',r=>r.fulfill({json:synthetic}));await page.reload();await page.waitForFunction(()=>state.data&&state.adapter);assert.equal(await page.locator('.site-marker').count(),1);await page.evaluate(code=>selectArea(state.data.areas.find(a=>a.trdar_cd===code),{openSheet:false}),a.trdar_cd);const sitePanel=await page.locator('.site-info').innerText();assert.ok(sitePanel.includes('Synthetic QA site'));assert.ok(sitePanel.includes('임대료 미확인'));assert.ok(sitePanel.includes('수익배분 UNKNOWN'));await page.selectOption('#candidate','photo');assert.equal(await page.locator('.site-marker').count(),0);await page.unrouteAll();
  // Native Kakao renderer contract, using explicit fake SDK and dummy key.
  await page.setViewportSize({width:1600,height:1000});
  const config={schema_version:1,preferred_basemap:'kakao',browser_app_key:'a'.repeat(32),allowed_origins:[new URL(base).origin]};
  await page.route('**/data/map-runtime.json',r=>r.fulfill({json:config}));
  await page.route('https://dapi.kakao.com/v2/maps/sdk.js?*',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(__dirname,'kakao-sdk-fixture.js'),'utf8')}));
  await page.goto(base);await page.waitForFunction(()=>state.adapter?.provider==='kakao');assert.equal(await page.locator('#map').getAttribute('data-synthetic-kakao'),'true');assert.ok(await page.locator('.demand-marker').count()>0);
  await page.locator('.demand-marker').nth(2).click();assert.ok((await page.locator('#selected-card').innerText()).includes('FIELD CHECK'));
  for(const candidate of ['photo','vending','luggage','booth']){await page.selectOption('#candidate',candidate);assert.ok(await page.locator('.demand-marker').count()>0);assert.ok(await page.locator('.poi-marker').count()>0);}
  await page.locator('#filter-panel').evaluate(e=>e.open=true);
  await page.uncheck('#show-demand');assert.equal(await page.locator('button.demand-marker').count(),0);await page.check('#show-demand');assert.ok(await page.locator('button.demand-marker').count()>0);
  for(const mode of ['quadrant','supply','demand']){await page.selectOption('#map-mode',mode);assert.ok(await page.locator('button.demand-marker').count()>0);}
  await page.unroute('https://dapi.kakao.com/v2/maps/sdk.js?*');await page.route('https://dapi.kakao.com/v2/maps/sdk.js?*',r=>r.fulfill({contentType:'application/javascript',body:'/* synthetic SDK rejection: no Kakao globals */'}));
  await page.reload();await page.waitForFunction(()=>state.adapter?.provider==='leaflet');assert.ok(await page.evaluate(()=>state.visible.length)>0);await page.unrouteAll();
  assert.deepEqual(errors,[],'site and native renderer runtime has no console/page errors');
  await page.route('**/data/seoul-opportunity-map.json',r=>r.fulfill({json:{areas:[]}}));await page.reload();await page.waitForFunction(()=>document.querySelector('#data-status').textContent==='수요 데이터를 불러오지 못했습니다.');
  await browser.close();console.log('PASS: real static /SideEconomyLab/ workspace and Leaflet runtime; synchronized decisions/rankings; mobile sheets; optional context/source errors/geography; synthetic Kakao SDK contract and denied-SDK fallback (not live Kakao acceptance).');
})().catch(async error=>{if(activePage)await activePage.screenshot({path:'/tmp/gis-browser/failure.png'}).catch(()=>{});console.error(error);process.exit(1);});
