const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const base=process.env.GIS_BASE_URL||'http://127.0.0.1:8765/SideEconomyLab/';
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.WORKBENCH_CHROMIUM?{executablePath:process.env.WORKBENCH_CHROMIUM}:{})});
  const context=await browser.newContext({viewport:{width:1600,height:1000}}),page=await context.newPage(),errors=[],requests=[];
  await page.addInitScript(()=>{if(!location.hash)history.replaceState(null,'',location.pathname+'#evaluate');});
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push({url:r.url(),method:r.method(),body:r.postData()}));
  // Pinned local copies remove third-party dependency from the new workbench test. Existing GIS tests verify real providers separately.
  for(const [url,file,type] of [['https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','leaflet/dist/leaflet.js','application/javascript'],['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','leaflet/dist/leaflet.css','text/css'],['https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.11.0/proj4.js','proj4/dist/proj4.js','application/javascript']])await page.route(url,r=>r.fulfill({path:require.resolve(file),contentType:type}));
  await page.route('https://*.tile.openstreetmap.org/**',r=>r.abort());
  await page.route('https://dapi.kakao.com/**',r=>r.abort());
  const KEY='SideEconomyLab.business-workbench.v1',read=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  const tab=t=>page.locator(`[data-wb-tab="${t}"]`).click();
  async function fillNumbers(selector,valueFor){for(const node of await page.locator(selector).all()){const key=await node.getAttribute('data-number');await node.fill(String(valueFor(key)));}}
  try{
    await page.goto(base+'index.html');await page.waitForFunction(()=>state.data&&state.adapter);await page.waitForFunction(()=>!document.querySelector('#wb-toggle').disabled);
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),null,'startup must not write private records');
    await page.locator('.wb-map-create').click();await page.locator('#workbench').waitFor({state:'visible'});assert.equal((await read()).sites[0].evidence_status,'HYPOTHETICAL');assert.equal((await read()).scenarios[0].variant_id,'BOOTH-CALL');
    await page.locator('#wb-delete').click();assert.ok(await page.locator('#wb-map-seed').innerText());
    await page.selectOption('#wb-family','OC-020');await page.selectOption('#wb-variant','VEND-BEVERAGE');await page.locator('#wb-new-scenario').click();
    let stored=await read();assert.equal(stored.scenarios.length,1);assert.equal(stored.sites[0].evidence_status,'HYPOTHETICAL');assert.equal(stored.sites[0].rent.value,null);assert.equal(stored.scenarios[0].variant_id,'VEND-BEVERAGE');assert.equal(await page.locator('#candidate').inputValue(),'vending');
    await page.selectOption('#wb-config','C-VEND-SLIM');await page.fill('#wb-name','PRIVATE-QA-NEGOTIATION');await page.locator('#wb-save-config').click();
    await tab('Site Cost');await page.fill('#wb-site-name','PRIVATE-QA-SITE');await page.fill('#wb-site-notes','PRIVATE-QA-HOST-TERMS');
    await fillNumbers('#wb-content [data-number]',k=>({rent:600000,management:100000,deposit:2000000,host_share:.1,key_money:0,area_sqm:10,contract_months:12})[k]);
    await page.locator('#wb-save-site').click();
    await tab('Economics');assert.ok((await page.locator('#wb-content').innerText()).includes('UNKNOWN'));assert.ok((await page.locator('#wb-content').innerText()).includes('월 수익·회수기간을 예측하지'));
    await fillNumbers('#wb-content [data-number]',k=>({unit_price:2000,cogs_per_unit:800,fulfillment_per_unit:100,payment_rate:.03,non_site_fixed:300000,operating_days:30,acquisition:6000000,installation:0,initial_stock:0,recovery_months:12,owner_hours_month:8})[k]??0);
    await page.fill('[data-number="expected_monthly_units"]','');
    await page.locator('#wb-save-economics').click();let text=await page.locator('#wb-content').innerText();assert.ok(text.includes('840'));assert.ok(text.includes('1,191'));assert.ok(text.includes('월 수익·회수기간을 예측하지'));
    await page.fill('[data-number="expected_monthly_units"]','2000');await page.selectOption('[data-kind="expected_monthly_units"]','ASSUMPTION');await page.locator('#wb-save-economics').click();text=await page.locator('#wb-content').innerText();assert.ok(text.includes('1,280,000'));assert.ok(text.includes('680,000'));assert.ok(text.includes('ASSUMPTION'));
    // Bad source entry must fail without changing saved economics.
    const before=await read();await page.selectOption('[data-kind="unit_price"]','SOURCED');await page.fill('[data-source="unit_price"]','');await page.locator('#wb-save-economics').click();assert.ok((await page.locator('#wb-status').innerText()).includes('저장 실패'));assert.deepEqual(await read(),before);await page.selectOption('[data-kind="unit_price"]','USER_INPUT');await page.locator('#wb-save-economics').click();
    await tab('Decision');await page.selectOption('#wb-rating','STRONG');await page.fill('#wb-confidence','65');await page.fill('#wb-rationale','PRIVATE-QA-JUDGMENT');await page.fill('#wb-key_observation','need observed usage');await page.fill('#wb-change_evidence','written host terms');await page.locator('#wb-save-judgment').click();
    const first=(await read()).scenarios[0];assert.equal(first.judgment.confidence,65);
    await page.locator('#wb-clone').click();stored=await read();assert.equal(stored.scenarios.length,2);assert.equal(stored.scenarios[0].site_id,stored.scenarios[1].site_id);assert.notEqual(stored.scenarios[0].scenario_id,stored.scenarios[1].scenario_id);
    // Different business, same site: new model inputs must be null, not copied unit prices.
    await page.selectOption('#wb-variant','VEND-COFFEE');await page.locator('#wb-new-scenario').click();stored=await read();assert.equal(stored.scenarios.length,3);assert.equal(stored.scenarios[2].inputs.unit_price.value,null);assert.equal(stored.scenarios[2].site_id,first.site_id);await page.selectOption('#wb-config','C-COFFEE-M500');await page.locator('#wb-save-config').click();
    // Clone site to hold business constant across independently editable locations.
    await tab('Site Cost');await page.locator('#wb-clone-site').click();stored=await read();assert.equal(stored.sites.length,3);assert.notEqual(stored.scenarios[2].site_id,first.site_id);await page.fill('#wb-site-rent','900000');await page.locator('#wb-save-site').click();stored=await read();assert.equal(stored.sites.find(t=>t.site_id===first.site_id).rent.value,600000);assert.equal(stored.sites.find(t=>t.site_id===stored.scenarios[2].site_id).rent.value,900000);
    await tab('Competition');text=await page.locator('#wb-content').innerText();for(const word of ['DIRECT','SUBSTITUTE','CONTEXT','200m','400m','800m','표본','UNKNOWN'])assert.ok(text.includes(word),word);
    // Comparison keeps unlike units and human judgment separate.
    await page.locator('#wb-comparison').locator('..').evaluate(el=>el.open=true);
    const picks=page.locator('[data-compare]');await picks.nth(0).check();await picks.nth(2).check();text=await page.locator('#wb-comparison').innerText();for(const word of ['PRIVATE-QA-NEGOTIATION','커피','필요 현금','손익분기','인간 판단','입력 완전성'])assert.ok(text.includes(word),word);
    await page.selectOption('#wb-scenario',first.scenario_id);await tab('Economics');fs.mkdirSync('/tmp/workbench-browser',{recursive:true});await page.screenshot({path:'/tmp/workbench-browser/desktop.png',fullPage:true});
    const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#wb-export').click()]);const exported=fs.readFileSync(await download.path(),'utf8');assert.ok(exported.includes('PRIVATE-QA-HOST-TERMS'));const snapshot=await read();
    await page.locator('#wb-import').setInputFiles({name:'restore.json',mimeType:'application/json',buffer:Buffer.from(exported)});await page.waitForFunction(()=>document.querySelector('#wb-status').textContent.includes('복원 완료'));assert.deepEqual(await read(),snapshot);
    await page.locator('#wb-import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"schema_version":999}')});await page.waitForFunction(()=>document.querySelector('#wb-status').textContent.includes('가져오기 실패'));assert.deepEqual(await read(),snapshot);
    await page.reload();await page.waitForFunction(()=>!document.querySelector('#wb-toggle').disabled);await page.locator('#wb-toggle').click();await page.locator('#workbench').waitFor({state:'visible'});assert.deepEqual(await read(),snapshot);assert.equal(await page.locator('#wb-scenario option').count(),4);
    await page.setViewportSize({width:390,height:844});await page.locator('#wb-new-scenario').scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await tab('Economics');await page.locator('.wb-metrics').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/workbench-browser/mobile.png',fullPage:true});
    for(const t of ['Configuration','Site Cost','Economics','Decision','Competition']){await tab(t);assert.ok(await page.locator('#wb-content').isVisible());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
    assert.ok(requests.every(r=>r.method==='GET'||r.method==='HEAD'));assert.ok(requests.every(r=>!JSON.stringify(r).includes('PRIVATE-QA')),'private strings must never enter URL/body');
    assert.ok(requests.every(r=>!r.url.includes('serviceKey=')&&!r.url.includes('KAKAO_REST')));
    // A corrupt local store is preserved, exportable and protected from accidental replacement.
    await page.evaluate(k=>localStorage.setItem(k,'corrupt-private-record'),KEY);await page.reload();await page.waitForFunction(()=>!document.querySelector('#wb-toggle').disabled);await page.locator('#wb-toggle').click();await page.locator('#workbench').waitFor({state:'visible'});await page.locator('#wb-new-scenario').click();assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),'corrupt-private-record');
    const [corrupt]=await Promise.all([page.waitForEvent('download'),page.locator('#wb-export').click()]);assert.equal(fs.readFileSync(await corrupt.path(),'utf8'),'corrupt-private-record');
    await page.locator('#wb-import').setInputFiles({name:'restore.json',mimeType:'application/json',buffer:Buffer.from(exported)});await page.waitForFunction(()=>document.querySelector('#wb-status').textContent.includes('복원 완료'));assert.deepEqual(await read(),snapshot);
    // Missing catalog should leave existing GIS usable and not overwrite private data.
    await page.route('**/data/business-workbench.json',r=>r.fulfill({status:404,body:'missing'}));await page.reload();await page.waitForFunction(()=>state.data&&state.adapter);assert.equal(await page.locator('#wb-toggle').isDisabled(),true);assert.deepEqual(await read(),snapshot);
    assert.deepEqual(errors,[]);console.log('PASS: real map selection, variant isolation, explicit reverse arithmetic, private persistence/backup/import, cloning/comparison, source labels, mobile, no writes/secrets, corrupt/missing-data preservation.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
