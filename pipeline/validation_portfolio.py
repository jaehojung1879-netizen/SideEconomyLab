#!/usr/bin/env python3
"""Validate the v1 decision state and preserved GIS, without network or source writes."""
import argparse
import csv
from datetime import date
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / 'docs/data/candidate-validation-portfolio.json'
GATES = {'weekday_availability', 'emergency_response', 'owner_labor_scaling', 'fixed_lease',
         'legal_permission', 'downside', 'paying_customer_route', 'cheap_kill',
         'recoverability', 'outsourcing'}
GATE_STATUSES = {'UNKNOWN', 'CONDITIONAL', 'AVOIDED_BY_DESIGN', 'PLAUSIBLE_UNPROVEN',
                 'DEPENDENT', 'NOT_APPLICABLE'}
DECISIONS = {'ADVANCE_NOW', 'CHEAP_TEST_FIRST', 'HOLD', 'DEPENDENT', 'KILL_ARCHIVE'}
BASELINE_PATHS = {'docs/data/seoul-opportunity-map.json', 'docs/data/kakao-poi-layer.json',
                  'docs/data/opportunity-intelligence.json', 'docs/data/real-estate-context.json',
                  'docs/data/candidate-registry.json', 'docs/assets/gis.js',
                  'docs/assets/map-adapter.js', 'docs/assets/real-estate.js',
                  'docs/index.html', 'docs/gis.html'}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def local_path(root, name):
    require(isinstance(name, str), 'reference must be a path string')
    path = (root / name).resolve()
    require(path.is_relative_to(root.resolve()) and path.is_file(), f'missing/unsafe reference: {name}')
    return path


def nonnegative(value):
    return type(value) in (int, float) and value >= 0


def validate(state, root=ROOT, verify_baseline=True):
    """v1 is an inherited-C2 assessment, not an evidence-upgrade ingestion tool."""
    registry = json.loads(local_path(root, state['scope']['candidate_registry']).read_text())
    definitions = {c['id']: c for c in registry['candidates']}
    require(state['schema_version'] == 1 and state['portfolio_id'] == 'candidate-validation-portfolio-v1', 'unsupported version')
    require(state['pilot_authorized'] is False, 'pilot authorization is forbidden')
    date.fromisoformat(state['updated_at'])
    require(re.fullmatch('[0-9a-f]{40}', state['baseline_main']) is not None, 'invalid main SHA')
    require(state['assessment_status'] == 'PROVISIONAL_PENDING_CURRENT_PUBLIC_C2_RECHECK', 'current C2 not verified')
    require(not state['scope']['historical_scores_used_for_selection'], 'historical scores cannot rank this portfolio')
    require(state['scope']['current_public_c2_collected_count'] == 0, 'no new public content collected in this version')
    require(state['scope']['new_field_evidence_count'] == 0, 'no field evidence collected in this version')
    with local_path(root, 'field/transaction-evidence-log-v1.csv').open(encoding='utf-8') as handle:
        field_rows = list(csv.DictReader(handle))
    require(len(field_rows) == state['scope']['current_c3_c4_c5_registered_rows'] == 0, 'field evidence changed: reassess evidence inventory')
    sources = {s['source_id']: s for s in state['sources']}
    require(len(sources) == len(state['sources']), 'duplicate source IDs')
    for s in sources.values():
        local_path(root, s['repository_reference'])
        require(set(s['candidate_ids']) <= definitions.keys(), 'source candidate not canonical')
        date.fromisoformat(s['observed_date'])
        require(s['fresh_public_content_collected'] is False, 'unsupported fresh source claim')
        require(s['access_status'] in {'BLOCKED_NETWORK_403', 'REPOSITORY_READ'}, 'unsupported verification status')
        if s['url'] is not None:
            url = urlsplit(s['url'])
            require(url.scheme == 'https' and bool(url.hostname) and url.username is None and url.password is None, 'unsafe source URL')
        if s['rechecked_at'] is not None:
            date.fromisoformat(s['rechecked_at'])
            require(s['access_status'] == 'BLOCKED_NETWORK_403', 'recheck cannot imply successful observation')
    ids = [c['candidate_id'] for c in state['candidates']]
    require(len(ids) == len(set(ids)) and set(ids) == definitions.keys(), 'candidate set differs from registry')
    selected = []
    instrument_text = local_path(root, 'field/candidate-validation-instruments-v1.md').read_text()
    for c in state['candidates']:
        cid = c['candidate_id']
        require(c['lane'] == definitions[cid]['lane'], f'lane mismatch: {cid}')
        require(c['evidence_level'] == 'C2' and c['evidence_verified_through'] == 'C2_PUBLIC_ONLY_INHERITED', 'unsupported field evidence upgrade')
        require(c['decision_status'] in DECISIONS, 'unknown frontier')
        require(bool(c['decision_rationale']), 'decision requires a rationale')
        for sid in c['evidence_references']:
            require(sid in sources and cid in sources[sid]['candidate_ids'], 'invalid candidate source attribution')
        inv = c['inventory']
        require(set(inv) == {'sourced_facts', 'derived_signals', 'assumptions', 'unknowns', 'real_world_evidence_required'}, 'inventory layers missing')
        for fact in inv['sourced_facts']:
            require(fact['verification'] == 'INHERITED_REPOSITORY_CLAIM' and bool(fact['source_ids']), 'unsupported sourced fact')
            require(set(fact['source_ids']) <= set(c['evidence_references']), 'unattributed fact')
        require(len(c['decisive_questions']) in (1, 2) and c['decisive_questions'] == inv['real_world_evidence_required'], 'decisive questions inconsistent')
        require(c['hard_gates']['status'] == 'UNRESOLVED_NO_PILOT', 'unsupported hard gate pass')
        require(set(c['hard_gates']['checks']) == GATES, 'hard gate inventory incomplete')
        for g in c['hard_gates']['checks'].values():
            require(g['status'] in GATE_STATUSES and bool(g['finding']), 'hard gate ungrounded')
        require(set(c['dependencies']) <= definitions.keys() and cid not in c['dependencies'], 'invalid dependency')
        if cid == 'OC-021':
            require(c['dependencies'] == ['OC-022'] and c['decision_status'] == 'DEPENDENT' and not c['selected_for_next_cycle'], 'dispensing must follow procurement')
        require(c['economics']['status'] == 'UNKNOWN', 'economics not measured')
        for field in ['overall_score', 'forecast_revenue_krw', 'contribution_krw', 'resale_recovery_krw']:
            require(c['economics'][field] is None, f'unknown converted to number: {field}')
        require(set(c['economics']['framework_assessment']) == {'economics_25', 'owner_fit_25', 'demand_distribution_20', 'asset_operations_15', 'competition_defensibility_10', 'ai_data_leverage_5'}, 'common framework changed')
        e = c['next_experiment']
        require(e['status'] == 'USER ACTION REQUIRED', 'experiment completion fabricated')
        for f in ['hypothesis', 'unknown_resolved', 'target_counterparty', 'pass_rule', 'hold_rule', 'fail_rule', 'next_on_pass', 'budget_basis']:
            require(isinstance(e[f], str) and bool(e[f].strip()), f'experiment missing {f}')
        require(bool(e['required_sample']) and all(type(v) is int and v > 0 for v in e['required_sample'].values()), 'sample must be positive and explicit')
        for f in ['cash_ceiling_krw', 'owner_hours_ceiling', 'external_parties', 'decision_window_days']:
            require(nonnegative(e[f]), f'invalid budget: {f}')
        require(set(e['prohibited']) == {'장비 구매', '임대차', '보증금/예치금', '재고 약정', '유료광고', '파일럿 시작'}, 'authorization boundary changed')
        path, anchor = e['instrument'].split('#')
        local_path(root, path)
        require(f'## {anchor}' in instrument_text, 'instrument anchor missing')
        require(c['site_discovery']['actual_site_discovery_authorized'] is False, 'site discovery not authorized')
        require(c['site_discovery']['status'] == ('NOT_READY' if c['lane'] == 'LOCATION' else 'NOT_APPLICABLE'), 'site readiness fabricated')
        if c['selected_for_next_cycle']:
            require(c['decision_status'] in {'ADVANCE_NOW', 'CHEAP_TEST_FIRST'}, 'held/dependent candidate selected')
            selected.append(cid)
    budget = state['portfolio_budget']
    require(selected == budget['selected_candidate_ids'] == ['OC-022', 'OC-030'], 'selection drift')
    require(sum(c['next_experiment']['cash_ceiling_krw'] for c in state['candidates'] if c['selected_for_next_cycle']) == budget['full_experiment_cash_ceiling_krw'], 'cash budget mismatch')
    require(sum(c['next_experiment']['owner_hours_ceiling'] for c in state['candidates'] if c['selected_for_next_cycle']) == budget['full_experiment_owner_hours_ceiling'], 'time budget mismatch')
    require(sum(q['cash_ceiling_krw'] for q in state['execution_queue']) == budget['first_week_cash_ceiling_krw'], 'week cash mismatch')
    require(sum(q['owner_hours_ceiling'] for q in state['execution_queue']) == budget['first_week_owner_hours_ceiling'], 'week hours mismatch')
    require(budget['capex_commitment_krw'] == 0, 'capex commitment forbidden')
    for b in state['economic_bounds']:
        require(b['candidate_id'] in definitions and set(b['source_ids']) <= sources.keys(), 'bound provenance missing')
        require(nonnegative(b['value_krw']) and bool(b['limitation']), 'bound must disclose limitations')
    require(set(state['integrity_baseline']) == BASELINE_PATHS, 'integrity baseline incomplete')
    if verify_baseline:
        for path, expected in state['integrity_baseline'].items():
            actual = hashlib.sha256(local_path(root, path).read_bytes()).hexdigest()
            require(actual == expected, f'protected GIS changed: {path}')
    return len(ids), len(sources)


def encoded(state):
    return (json.dumps(state, ensure_ascii=False, indent=2) + '\n').encode()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--state', type=Path, default=STATE)
    parser.add_argument('--check', action='store_true', help='also require canonical deterministic JSON encoding')
    args = parser.parse_args()
    state = json.loads(args.state.read_bytes())
    count, sources = validate(state)
    if args.check:
        require(encoded(state) == args.state.read_bytes(), 'state JSON encoding differs')
    print(f'PASS: {count} canonical candidates, {sources} attributable sources; no unsupported upgrades; budget/instruments/GIS baseline intact.')


if __name__ == '__main__':
    main()
