'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? 'UNKNOWN').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money = value => value === null || value === undefined ? 'UNKNOWN' : `${value.toLocaleString('ko-KR')}원`;
  const list = items => `<ul>${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  const decisions = {ADVANCE_NOW:'ADVANCE NOW',CHEAP_TEST_FIRST:'CHEAP TEST FIRST',HOLD:'HOLD',DEPENDENT:'DEPENDENT',KILL_ARCHIVE:'KILL / ARCHIVE'};
  const refs = ids => ids.map(id => `<a href="#source-${esc(id)}">${esc(id)}</a>`).join(' · ');
  let state, registry;
  const label = id => registry.candidates.find(x => x.id === id).label;
  function details(id) {
    const c = state.candidates.find(x => x.candidate_id === id), e = c.next_experiment, i = c.inventory;
    $('detail').innerHTML = `<h3>${esc(id)} · ${esc(label(id))} <span class="tag">${esc(decisions[c.decision_status])}</span></h3>
      <p>${esc(c.decision_rationale)}</p><p><strong>${esc(c.evidence_level)} 공개 자료만 / 현재 새 확인 없음</strong> · ${esc(c.evidence_scope.strength)}</p>
      <div class="columns"><div><h4>SOURCED FACT · 과거 저장소 주장</h4><ul>${i.sourced_facts.map(f => `<li>${esc(f.text)} ${refs(f.source_ids)}</li>`).join('')}</ul><h4>DERIVED SIGNAL</h4>${list(i.derived_signals)}<h4>ASSUMPTION</h4>${list(i.assumptions)}</div><div><h4>UNKNOWN</h4>${list(i.unknowns)}<h4>REAL-WORLD EVIDENCE REQUIRED</h4>${list(i.real_world_evidence_required)}<h4>의존성 / 사이트 준비</h4><p>${c.dependencies.length ? esc(c.dependencies.join(', ')) : '선행 후보 없음'} · ${esc(c.site_discovery.status)}</p><p>${esc(c.site_discovery.reason)}</p></div></div>
      <details><summary>Hard gates 10개 · ${esc(c.hard_gates.status)}</summary>${Object.entries(c.hard_gates.checks).map(([k,v]) => `<p><strong>${esc(k)}: ${esc(v.status)}</strong><br>${esc(v.finding)}</p>`).join('')}</details>
      <h4>${esc(e.experiment_id)} · ${esc(e.status)}</h4><p><strong>가설:</strong> ${esc(e.hypothesis)}</p><p><strong>대상:</strong> ${esc(e.target_counterparty)}</p><p><strong>필요 sample:</strong> ${esc(Object.entries(e.required_sample).map(([k,v]) => `${k} ${v}`).join(' · '))}</p><p>${money(e.cash_ceiling_krw)} / ${esc(e.owner_hours_ceiling)}시간 / ${esc(e.decision_window_days)}일 / 최대 ${esc(e.external_parties)}곳 · 완료 시 ${esc(e.expected_evidence_level)} 가능</p><p class="muted">${esc(e.budget_basis)} · sample/회신 미완료는 완료가 아닙니다.</p>${list(e.questions_and_data)}
      <div class="rules"><p><strong>PASS</strong><br>${esc(e.pass_rule)}</p><p><strong>HOLD</strong><br>${esc(e.hold_rule)}</p><p><strong>FAIL</strong><br>${esc(e.fail_rule)}</p></div><p><strong>다음:</strong> ${esc(e.next_on_pass)}</p><h4>STOP / KILL</h4>${list(c.stop_conditions)}<p>경제성: ${esc(c.economics.status)} / 종합 점수: ${c.economics.overall_score === null ? 'UNKNOWN (산출 없음)' : esc(c.economics.overall_score)}</p>`;
  }
  function rows() {
    const filtered = state.candidates.filter(c => $('lane').value === 'all' || c.lane === $('lane').value);
    $('rows').innerHTML = filtered.map(c => `<tr data-candidate-id="${esc(c.candidate_id)}"><td><button type="button" data-select="${esc(c.candidate_id)}">${esc(c.candidate_id)}<br>${esc(label(c.candidate_id))}</button><br>${esc(c.lane)}</td><td>${esc(c.evidence_level)} · 공개자료(상속)<br>${esc(c.evidence_scope.strength)}</td><td>${esc(c.hard_gates.status)}</td><td>${esc(c.decisive_questions.join(' / '))}</td><td>${esc(c.next_experiment.experiment_id)}<br>${esc(c.next_experiment.hypothesis)}</td><td>${money(c.next_experiment.cash_ceiling_krw)} / ${esc(c.next_experiment.owner_hours_ceiling)}h<br>${esc(c.next_experiment.expected_evidence_level)} (미실행)</td><td>${esc(decisions[c.decision_status])}${c.selected_for_next_cycle ? '<br><strong>잠정 선정</strong>' : ''}</td></tr>`).join('');
  }
  async function load() {
    const responses = await Promise.all(['./data/candidate-validation-portfolio.json','./data/candidate-registry.json'].map(url => fetch(url).then(r => {if (!r.ok) throw new Error('HTTP');return r.json();})));
    [state, registry] = responses;
    if (state.schema_version !== 1 || state.pilot_authorized !== false || !Array.isArray(state.candidates) || state.candidates.length !== 7 || new Set(state.candidates.map(c=>c.candidate_id)).size!==7 || !state.candidates.every(c => registry.candidates.some(r => r.id === c.candidate_id && r.lane === c.lane) && c.economics.overall_score===null && c.evidence_level==='C2')) throw new Error('schema');
    $('load-status').textContent = `${state.updated_at} · 잠정 판단 · 신규 공개 C2 ${state.scope.current_public_c2_collected_count} / 등록 현장 C3–C5 ${state.scope.current_c3_c4_c5_registered_rows} · 파일럿 승인 없음`;
    $('evidence-note').textContent = '현재 새 공개 C2 확인은 0건입니다. 기존 관측은 2026-10-03 자료이며 최신 공급자 페이지 접근은 네트워크 403으로 차단되었습니다. 일곱 후보의 C2는 공개 모델/기본가격에 한정되고 고객·호스트 검증을 뜻하지 않습니다.';
    $('selection').innerHTML = state.candidates.filter(c => c.selected_for_next_cycle).map(c => `<div class="card"><h3>${esc(c.candidate_id)} · ${esc(label(c.candidate_id))}</h3><span class="tag">${esc(decisions[c.decision_status])}</span><p>${esc(c.decision_rationale)}</p><p>${esc(c.decisive_questions[0])}</p><p>${money(c.next_experiment.cash_ceiling_krw)} / ${esc(c.next_experiment.owner_hours_ceiling)}h · 전체 실험 상한</p></div>`).join('');
    const b=state.portfolio_budget;
    $('budget').textContent = `전체 두 실험: ${money(b.full_experiment_cash_ceiling_krw)} / ${b.full_experiment_owner_hours_ceiling}h, 최대 21일. 첫 주: ${money(b.first_week_cash_ceiling_krw)} / ${b.first_week_owner_hours_ceiling}h. 제안된 정보수집 상한이며 시장 견적·파일럿 비용이 아닙니다.`;
    rows();
    $('candidate').innerHTML = state.candidates.map(c => `<option value="${esc(c.candidate_id)}">${esc(c.candidate_id)} · ${esc(label(c.candidate_id))}</option>`).join('');
    $('candidate').value = 'OC-022'; details('OC-022');
    $('lane').addEventListener('change',rows);
    $('candidate').addEventListener('change',()=>details($('candidate').value));
    $('rows').addEventListener('click',event => {const button=event.target.closest('[data-select]');if(button){$('candidate').value=button.dataset.select;details(button.dataset.select);$('candidate').focus();}});
    $('queue').innerHTML = state.execution_queue.map(q => `<li><strong>${esc(q.window)} · ${esc(q.owner_hours_ceiling)}h / ${money(q.cash_ceiling_krw)}</strong><p>${esc(q.action)}</p><small>${esc(q.expected_output)} · ${esc(q.status)}</small></li>`).join('');
    $('bias').textContent = state.bias_audit.counterfactual;
    $('sources').innerHTML = state.sources.map(s => `<details id="source-${esc(s.source_id)}"><summary>${esc(s.source_id)} · 기존 관측 ${esc(s.observed_date)} · ${esc(s.access_status)}</summary><p>${esc(s.claim)}</p><p>${esc(s.caveat)}</p><p class="source-status">현재 내용 신규 수집: 없음. 재접근 시도: ${s.rechecked_at ? esc(s.rechecked_at)+' (실패)' : '이 작업에서 요청 안 함; 저장소만 읽음'}</p>${s.url ? `<p class="source-url"><a href="${esc(s.url)}" target="_blank" rel="noopener">과거 근거의 외부 원문 (현재 접근 미확인)</a></p>` : ''}<p>기존 기록: ${esc(s.repository_reference)}</p></details>`).join('');
    $('blockers').innerHTML=state.blockers.map(b=>`<li><strong>${esc(b.operation)} · ${esc(b.status)}</strong><br>${esc(b.action)}</li>`).join('');
    $('portfolio').hidden=false;
  }
  load().catch(()=>{ $('portfolio').hidden=true;$('load-status').textContent='검증 상태를 불러오지 못했습니다. 데이터 누락 또는 후보 정의 불일치입니다. 완료·0원·통과로 해석하지 마세요.';});
})();
