const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),realm={window:{},URL,Date};vm.createContext(realm);
vm.runInContext(fs.readFileSync(path.join(root,'docs/assets/real-estate.js'),'utf8'),realm);
const C=realm.window.RealEstateContext;
const bytes=fs.readFileSync(path.join(root,'docs/data/seoul-opportunity-map.json'));
const demand=JSON.parse(bytes);demand._contentHash=crypto.createHash('sha256').update(bytes).digest('hex');
const data=JSON.parse(fs.readFileSync(path.join(root,'docs/data/real-estate-context.json'),'utf8'));
assert.equal(C.prepare(data,demand).status,'AVAILABLE');
assert.equal(C.prepare(null,demand).status,'UNAVAILABLE');
assert.equal(C.prepare({source_error:true},demand).status,'SOURCE_ERROR');
assert.equal(C.prepare({...data,demand_hash:'different'},demand).status,'INCOMPATIBLE_GEOGRAPHY');
assert.equal(C.statusNow({status:'NOT_COLLECTED'}),'NOT_COLLECTED');
assert.equal(C.statusNow({status:'SOURCE_ERROR'}),'SOURCE_ERROR');
assert.equal(C.statusNow({status:'AVAILABLE',period:'20262'},'2026-10-04'),'AVAILABLE');
assert.equal(C.statusNow({status:'AVAILABLE',period:'20262'},'2027-01-01'),'STALE');
assert.equal(C.statusNow({status:'AVAILABLE',period:'20264'},'2026-10-04'),'SOURCE_ERROR');
assert.equal(C.statusNow({status:'AVAILABLE',period:'20262'},'2026-02-30'),'SOURCE_ERROR');
for(const [key,value] of [['geography_type','district'],['geography_id','11110'],['vacancy_pct',null],['rent_thousand_krw_per_sqm','52.8'],['vacancy_pct',false]]){
  const bad=structuredClone(data);bad.markets[0][key]=value;assert.equal(C.prepare(bad,demand).status,'SOURCE_ERROR');
}
const mismatch=data.areas.find(a=>a.status==='INCOMPATIBLE_GEOGRAPHY');
const target=demand.areas.find(a=>a.trdar_cd===mismatch.trdar_cd);
assert.ok(C.render(target,C.prepare(data,demand)).includes('점포·개폐업 UNKNOWN'));
const html=C.render(demand.areas[0],C.prepare(data,demand));
for(const text of ['서울 전체','2026 Q2','시장 통계 ≠ 실제 사이트 조건','NOT_COLLECTED','52.8','6.4%'])assert.ok(html.includes(text));
assert.ok(!C.render(demand.areas[0],C.prepare(null,demand)).includes('0원'));
console.log('PASS: six context statuses, exact/city geography, temporal age, null vs zero, optional context and no site-rent imputation.');
