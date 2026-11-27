// One public portal download attempt. No credentials, no guessed endpoint, no repository write.
const fs = require('node:fs/promises');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {chromium} = require('playwright');
const catalog = 'https://www.data.go.kr/catalog/15061118/fileData.json';
const portal = 'https://www.data.go.kr/data/15061118/fileData.do';
const dir = process.argv[2];
if (!dir) throw Error('artifact directory required');
(async () => {
  await fs.mkdir(dir, {recursive:true});
  const status = {status:'BLOCKED', source:portal, catalog, coverage_verified:false, comparison_eligible:0, stage:'catalog'};
  let browser;
  try {
    const response = await fetch(catalog, {redirect:'error', signal:AbortSignal.timeout(25000)});
    if (!response.ok) throw Error('catalog HTTP '+response.status);
    const body = await response.text();
    if (Buffer.byteLength(body) > 1000000) throw Error('catalog body too large');
    const meta = JSON.parse(body);
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) throw Error('catalog not an object');
    // Preserve the public response before testing identity, so mismatch is inspectable.
    await fs.writeFile(path.join(dir,'catalog.json'), JSON.stringify(meta,null,2));
    status.catalog_diagnostic = {
      keys:Object.keys(meta).sort().slice(0,80),
      alternateName:typeof meta.alternateName==='string'?meta.alternateName.slice(0,180):null,
      name:typeof meta.name==='string'?meta.name.slice(0,180):null,
      url_matches:meta.url===portal,
      encodingFormat:typeof meta.encodingFormat==='string'?meta.encodingFormat.slice(0,40):null,
      creator_matches:meta.creator?.name==='국세청'
    };
    const title = meta.alternateName;
    const match = typeof title === 'string' && title.match(/^국세청_사업자현황_100대 생활업종_(20\\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\\d|3[01]))$/);
    if (!match || meta.url !== portal || meta.encodingFormat !== 'CSV' || meta.creator?.name !== '국세청') throw Error('catalog identity mismatch');
    status.catalog_period = match[1];
    status.stage = 'portal';
    browser = await chromium.launch({headless:true});
    const page = await browser.newPage({acceptDownloads:true});
    await page.goto(portal,{waitUntil:'domcontentloaded',timeout:45000});
    if (new URL(page.url()).origin !== new URL(portal).origin) throw Error('portal origin mismatch');
    await page.getByText(title,{exact:true}).first().waitFor({state:'visible',timeout:15000});
    status.stage = 'download';
    const control = page.getByText('다운로드',{exact:true}).filter({visible:true});
    if (await control.count() !== 1) throw Error('public download control ambiguous or absent');
    const [download] = await Promise.all([page.waitForEvent('download',{timeout:30000}), control.click({timeout:10000})]);
    const filename = download.suggestedFilename();
    if (!filename.endsWith('.csv') || !filename.includes(match[1])) throw Error('filename period mismatch');
    const dlurl = new URL(download.url());
    if (dlurl.origin !== new URL(portal).origin) throw Error('download origin mismatch');
    const temp = await download.path();
    const stat = await fs.stat(temp);
    if (!stat.size || stat.size > 25000000) throw Error('unexpected file size');
    const raw = path.join(dir,'snapshot.csv');
    await download.saveAs(raw);
    status.filename = filename;
    status.stage = 'audit';
    execFileSync('python',['pipeline/nts_snapshot_audit.py',raw,'--period',match[1].slice(0,4)+'-'+match[1].slice(4,6),'--out',path.join(dir,'audit.json')],{stdio:'inherit',timeout:30000});
    const audit = JSON.parse(await fs.readFile(path.join(dir,'audit.json'),'utf8'));
    status.status = 'PARSED_NOT_PUBLISHED';
    status.row_count = audit.row_count;
    status.sha256 = audit.sha256;
  } catch(e) { status.reason = String(e.message).slice(0,400); }
  finally { if(browser) await browser.close(); await fs.writeFile(path.join(dir,'status.json'),JSON.stringify(status,null,2)); console.log(JSON.stringify(status)); }
})().catch(e=>{console.error(e);process.exitCode=1;});
