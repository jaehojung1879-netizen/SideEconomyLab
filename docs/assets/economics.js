/* Deterministic reverse economics. GIS scores never enter this module. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BusinessEconomics=api;})(typeof window==='object'?window:globalThis,()=>{
  'use strict';
  const MODELS={
    UNIT_SALE:{label:'상품 1개',price:'unit_price',costs:['cogs_per_unit','fulfillment_per_unit']},
    TRANSACTION:{label:'서비스 1건',price:'service_price',costs:['consumables_per_transaction','service_labor_per_transaction']},
    TIME:{label:'점유 1분',price:'price_per_minute',costs:['variable_cost_per_minute']},
    STORAGE:{label:'가방/칸 1일',price:'price_per_bag_day',costs:['cost_per_bag_day']},
    ORDER:{label:'주문 바스켓 1건',price:'basket_revenue',costs:['basket_purchase_cost','fulfillment_per_order']},
    EVENT:{label:'행사 1건',price:'event_price',costs:['supplier_per_event','delivery_per_event']}
  };
  const KINDS=['SOURCED','USER_INPUT','ASSUMPTION'];
  const COMMON=['payment_rate','host_share','non_site_fixed','rent','management','operating_days','acquisition','installation','initial_stock','key_money','deposit','recovery_months','expected_monthly_units','owner_hours_month'];
  const EXTRA={TIME:['session_minutes','operating_minutes_per_day','capacity'],STORAGE:['storage_capacity']};
  function fields(model){const m=MODELS[model];if(!m)throw new Error('Unknown economic model');return [m.price,...m.costs,...COMMON,...(EXTRA[model]||[])];}
  function input(value=null,kind='USER_INPUT',source=null){return {value,kind,source};}
  function value(cell,key){
    if(!cell||cell.value===null||cell.value===undefined)return null;
    if(!KINDS.includes(cell.kind)||typeof cell.value!=='number'||!Number.isFinite(cell.value)||cell.value<0)throw new Error('Invalid input: '+key);
    if(cell.kind==='SOURCED'&&!(typeof cell.source==='string'&&cell.source.trim()))throw new Error('Source required: '+key);
    if(['host_share','payment_rate'].includes(key)&&cell.value>1)throw new Error('Rate must be 0–1: '+key);
    if(['operating_days','recovery_months','session_minutes','operating_minutes_per_day','capacity','storage_capacity'].includes(key)&&cell.value===0)throw new Error('Positive value required: '+key);
    if(key==='operating_days'&&cell.value>31)throw new Error('Operating days must be <=31');
    if(key==='operating_minutes_per_day'&&cell.value>1440)throw new Error('Operating minutes must be <=1440');
    if(['capacity','storage_capacity'].includes(key)&&!Number.isInteger(cell.value))throw new Error('Capacity must be an integer');
    return cell.value;
  }
  const sum=xs=>{if(xs.some(x=>x===null))return null;const total=xs.reduce((a,b)=>a+b,0);if(!Number.isFinite(total))throw new Error('Inputs exceed finite range');return total;};
  function solve(model,inputs){
    const m=MODELS[model];if(!m)throw new Error('Unknown economic model');
    const v=Object.fromEntries(fields(model).map(k=>[k,value(inputs[k],k)]));
    const price=v[m.price],variable=sum(m.costs.map(k=>v[k])),rates=sum([v.payment_rate,v.host_share]);
    const contribution=price===null||variable===null||rates===null?null:price*(1-rates)-variable;
    const fixed=sum([v.non_site_fixed,v.rent,v.management]);
    const capital=sum([v.acquisition,v.installation,v.initial_stock,v.key_money]);
    const cash=sum([capital,v.deposit]);
    const required=cost=>cost===null||contribution===null||contribution<=0?null:Math.ceil(cost/contribution);
    const breakEven=required(fixed),daily=breakEven===null||v.operating_days===null?null:breakEven/v.operating_days;
    const recoveryUnits=required(fixed===null||capital===null||v.recovery_months===null?null:fixed+capital/v.recovery_months);
    const available=model==='TIME'?sum([v.operating_days,v.operating_minutes_per_day,v.capacity])===null?null:v.operating_days*v.operating_minutes_per_day*v.capacity:model==='STORAGE'?sum([v.operating_days,v.storage_capacity])===null?null:v.operating_days*v.storage_capacity:null;
    const utilization=breakEven===null||available===null?null:breakEven/available;
    const volume=v.expected_monthly_units;
    const maxSite=volume===null||contribution===null||v.non_site_fixed===null?null:volume*contribution-v.non_site_fixed;
    const maxRent=maxSite===null||v.management===null?null:maxSite-v.management;
    const maxShare=volume===null||volume===0||price===null||price===0||variable===null||v.payment_rate===null||fixed===null?null:Math.min(1,(price*(1-v.payment_rate)-variable-fixed/volume)/price);
    const net=volume===null||contribution===null||fixed===null?null:volume*contribution-fixed;
    const payback=capital===null||net===null||net<=0?null:capital/net;
    const missing=fields(model).filter(k=>v[k]===null);
    const result={kind:'DERIVED',model,unit:m.label,contribution_per_unit:contribution,monthly_fixed:fixed,cash_required:cash,capital_at_risk:capital,
      break_even_units_month:breakEven,break_even_units_day:daily,recovery_units_month:recoveryUnits,
      required_utilization:utilization,available_units_month:available,
      recovery_utilization:recoveryUnits===null||available===null?null:recoveryUnits/available,
      recovery_transactions_month:model==='TIME'?(recoveryUnits===null||v.session_minutes===null?null:Math.ceil(recoveryUnits/v.session_minutes)):recoveryUnits,
      break_even_transactions_month:model==='TIME'?(breakEven===null||v.session_minutes===null?null:Math.ceil(breakEven/v.session_minutes)):breakEven,
      max_site_cost:maxSite,max_rent:maxRent,max_host_share:maxShare,conditional_monthly_surplus:net,capital_recovery_months:payback,
      status:contribution===null||fixed===null?'UNKNOWN':contribution<=0?'NON_POSITIVE_CONTRIBUTION':utilization!==null&&utilization>1?'CAPACITY_EXCEEDED':'THRESHOLD_ONLY',missing,
      lineage:Object.fromEntries(fields(model).map(k=>[k,inputs[k]||input()])),
      limitations:['단위 가격·변동비는 동일 VAT/정산 기준으로 입력. 세무·금융비용은 자동 추정하지 않음.','보증금은 필요 현금에 포함; 회수 목표의 투자비에서는 제외. 반환 보장은 아님.','입력된 변동비·고정비 밖의 비용은 계산하지 않음. 미입력 항목은 UNKNOWN.','수익은 사용자 입력 물량에 조건부이며 GIS 기반 예상 매출이 아님.']};
    if(Object.values(result).some(x=>typeof x==='number'&&!Number.isFinite(x)))throw new Error('Calculated values exceed finite range');
    return result;
  }
  function sensitivity(model,inputs,{dailyVolumes=[10,20,30,40],shares=[0,.1,.2,.3]}={}){
    const days=value(inputs.operating_days,'operating_days');
    return {volume:dailyVolumes.map(daily=>({kind:'ASSUMPTION',daily,...solve(model,{...inputs,expected_monthly_units:input(days===null?null:daily*days,'ASSUMPTION')})})),
      host:shares.map(share=>({kind:'ASSUMPTION',share,...solve(model,{...inputs,host_share:input(share,'ASSUMPTION')})}))};
  }
  return {MODELS,KINDS,COMMON,fields,input,value,solve,sensitivity};
});
