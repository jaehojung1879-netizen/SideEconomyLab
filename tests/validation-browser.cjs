const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.GIS_TEST_URL || 'http://127.0.0.1:8765/SideEconomyLab/';
(async () => {
  const options = {headless:true};
  if (process.env.VALIDATION_BROWSER_EXECUTABLE) options.executablePath = process.env.VALIDATION_BROWSER_EXECUTABLE;
  const browser = await chromium.launch(options);
  try {
    const context = await browser.newContext({viewport:{width:1440,height:1000}});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base+'validation.html');
    await page.locator('#portfolio').waitFor({state:'visible'});
    assert.equal(await page.locator('#rows tr').count(),7);
    assert.equal(await page.locator('#selection .card').count(),2);
    assert.match(await page.locator('#load-status').innerText(),/신규 공개 C2 0.*C3–C5 0/);
    assert.match(await page.locator('#selection').innerText(),/OC-022/);
    assert.match(await page.locator('#selection').innerText(),/OC-030/);
    assert.match(await page.locator('#budget').innerText(),/250,000원.*18h.*200,000원.*10h/);
    await page.selectOption('#lane','TRANSACTION');
    assert.equal(await page.locator('#rows tr').count(),3);
    await page.selectOption('#lane','LOCATION');
    assert.equal(await page.locator('#rows tr').count(),4);
    for (const id of ['OC-001','OC-013','OC-020','OC-008','OC-022','OC-021','OC-030']) {
      await page.selectOption('#candidate',id);
      assert.match(await page.locator('#detail h3').innerText(),new RegExp(id));
      const text=await page.locator('#detail').innerText();
      for(const word of ['UNKNOWN','ASSUMPTION','DERIVED SIGNAL','REAL-WORLD EVIDENCE REQUIRED','USER ACTION REQUIRED','PASS','HOLD','FAIL','STOP']) assert.ok(text.includes(word),`${id}: ${word}`);
      assert.ok(text.includes('종합 점수: UNKNOWN'));
      assert.ok(text.includes(id==='OC-021'||id==='OC-022'||id==='OC-030'?'NOT_APPLICABLE':'NOT_READY'));
    }
    await page.locator('[data-select="OC-001"]').click();
    assert.equal(await page.locator('#candidate').inputValue(),'OC-001');
    await page.locator('#detail a[href^="#source-"]').first().click();
    assert.ok((await page.url()).includes('#source-S-BOOTH'));
    assert.equal(await page.locator('#sources details').count(),18);
    assert.equal(await page.locator('#queue li').count(),5);
    fs.mkdirSync('/tmp/validation-browser',{recursive:true});
    await page.screenshot({path:'/tmp/validation-browser/desktop.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+'validation.html');
    await page.locator('#portfolio').waitFor({state:'visible'});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:'/tmp/validation-browser/mobile.png',fullPage:true});
    // Local relative Pages assets and navigation must resolve under the project prefix.
    for (const path of ['research.html','index.html','data/candidate-validation-portfolio.json','data/candidate-registry.json','assets/validation.css','assets/validation.js']) {
      const response=await page.request.get(base+path); assert.equal(response.status(),200,path);
    }
    // Fetch failures and mixed candidate definitions must not show a completed portfolio.
    await page.route('**/data/candidate-validation-portfolio.json',r=>r.fulfill({status:404,body:'missing'}));
    await page.reload();
    await page.waitForFunction(()=>document.querySelector('#load-status').textContent.includes('불러오지 못'));
    assert.equal(await page.locator('#portfolio').isVisible(),false);
    await page.unrouteAll();
    await page.route('**/data/candidate-validation-portfolio.json',async r=>{const response=await r.fetch();const data=await response.json();data.candidates[0].lane='INVALID';await r.fulfill({json:data});});
    await page.reload();
    await page.waitForFunction(()=>document.querySelector('#load-status').textContent.includes('불러오지 못'));
    assert.equal(await page.locator('#portfolio').isVisible(),false);
    assert.deepEqual(errors,[]);
    console.log('PASS: seven canonical candidates, selection/budget, filters, instruments, evidence limits, mobile, Pages paths, missing/mixed-state failure behavior.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
