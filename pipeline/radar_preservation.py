"""Record that Opportunity Radar v2 leaves non-radar evidence byte-identical to a base commit.

python pipeline/radar_preservation.py --base origin/main --out research/opportunity-radar-v2/preservation.json
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
# Paths this PR is allowed to change. Everything else tracked must match the base byte-for-byte.
RADAR_SCOPE = ('docs/data/opportunity-radar', 'data/opportunity-radar/', 'docs/assets/opportunity-radar.', 'docs/assets/radar-format.js',
               'docs/opportunity-radar-v2.md', 'docs/index.html', 'docs/data/seoul-source-catalog.json', 'pipeline/opportunity_radar.py',
               'pipeline/radar_', 'pipeline/README.md', 'config/opportunity-radar', 'tests/test_opportunity_radar.py', 'tests/radar-',
               'research/opportunity-radar-v2/', 'research/screenshots/opportunity-radar-v2/', 'research/seoul-opportunity-completion-v2.md',
               '.github/workflows/opportunity-radar-', '.github/workflows/seoul-open-data-smoke.yml', 'pipeline/seoul_transport_audit.py',
               'pipeline/seoul_open_data_smoke.py', 'docs/opportunity-radar-v1.md', 'docs/seoul-open-data-api.md', 'README.md')
# Explicit independent scope; no prefix wildcard and no changes to existing data/UI.
DEMAND_FIRST_NEW = frozenset(["docs/data/outsourcing-frontier-v1.json","research/outsourcing-frontier-v1.md","research/catalog-review-synthetic-v1.json","pipeline/outsourcing_frontier.py","tests/test_outsourcing_frontier.py","docs/data/procurement-audit-v1.json","research/procurement-audit-v1.md","research/procurement-audit-synthetic-v1.json","pipeline/procurement_audit.py","tests/test_procurement_audit.py","docs/data/managed-procurement-evidence-v2.json","research/managed-procurement-evidence-v2.md","pipeline/managed_procurement_evidence.py","tests/test_managed_procurement_evidence.py","docs/data/korean-managed-procurement-v1.json","docs/korean-managed-procurement.html","pipeline/korean_managed_procurement.py","tests/test_korean_managed_procurement.py","research/korean-managed-procurement-v1.md","docs/data/parallel-hurdles-v1.json","docs/parallel-hurdles.html","pipeline/parallel_hurdles.py","tests/test_parallel_hurdles.py","research/parallel-hurdles-v1.md","docs/data/hardware24-v1.json","docs/hardware24.html","pipeline/hardware24.py","tests/test_hardware24.py","research/hardware24-v1.md","docs/data/facility-dual-track-v1.json","docs/facility-dual-track.html","pipeline/facility_dual_track.py","tests/test_facility_dual_track.py","research/facility-dual-track-v1.md","research/facility-expense-synthetic-v1.json","docs/data/recommerce-research-v1.json","docs/recommerce-research.html","pipeline/recommerce_research.py","tests/test_recommerce_research.py","research/recommerce-research-v1.md","docs/data/buyer-route-v1.json","docs/buyer-route.html","pipeline/buyer_route.py","tests/test_buyer_route.py","research/buyer-route-v1.md","docs/data/nts-local-profile-v1.json","docs/nts-local-profile.html","pipeline/nts_local_profile.py","tests/test_nts_local_profile.py","research/nts-local-profile-v1.md","docs/data/sidejob-sector-slice-v1.json","pipeline/sidejob_sector_slice.py","tests/test_sidejob_sector_slice.py","research/sidejob-sector-slice-v1.md","docs/data/market-falsification-v3.json","research/market-falsification-v3.md","tests/test_market_falsification.py","docs/data/demand-first-research-v1.json","docs/data/demand-spend-sample-v1.json","docs/demand-first.html","docs/spend-evidence.html","pipeline/nts_snapshot_audit.py","pipeline/owner_capacity.py","pipeline/nts_public_probe.cjs","research/demand-first-spend-v2.md","research/demand-first-v1.md","research/owner-capacity-scenarios-v1.json","tests/test_nts_snapshot_audit.py","tests/test_owner_capacity.py","tests/test_preservation_scope.py",".github/workflows/nts-public-probe.yml"])
DEMAND_FIRST_EXISTING = frozenset([".github/workflows/decision-check.yml",".github/workflows/gis-check.yml",".github/workflows/opportunity-radar-check.yml",".github/workflows/validation-portfolio-check.yml",".github/workflows/workbench-check.yml","README.md","pipeline/radar_preservation.py"])
PORTFOLIO = 'docs/data/candidate-validation-portfolio.json'
KEY = ('docs/data/candidate-registry.json', 'docs/data/business-workbench.json',
       'docs/data/decision-evidence.json', 'docs/data/seoul-opportunity-map.json', 'docs/data/kakao-poi-layer.json',
       'docs/data/opportunity-intelligence.json', 'docs/data/real-estate-context.json', 'docs/data/site-observations.json',
       'docs/assets/gis.js', 'docs/assets/map-adapter.js', 'docs/assets/economics.js', 'docs/assets/workbench.js',
       'docs/assets/business-workspace.js', 'docs/assets/decision-intelligence.js', 'docs/assets/decision-panel.js',
       'research/opportunity-registry.csv', 'data/opportunity-radar/2026-10-09-55b80cb44604/source.json.gz')


def git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, check=True, capture_output=True).stdout


def select_scope(changed, requested):
    if requested == 'auto':
        return 'demand-first' if set(changed) & DEMAND_FIRST_NEW else 'radar'
    return requested


def demand_first_outside(statuses):
    return [p for p, status in statuses.items() if not (
        (p in DEMAND_FIRST_NEW and status in ('A', 'M')) or
        (p in DEMAND_FIRST_EXISTING and status == 'M'))]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--base', default=None, help='default: merge-base of origin/main and HEAD'); ap.add_argument('--out'); ap.add_argument('--scope', choices=('radar', 'demand-first', 'auto'), default='radar'); a = ap.parse_args()
    base = git('rev-parse', a.base).decode().strip() if a.base else git('merge-base', 'origin/main', 'HEAD').decode().strip()
    changed = [p for p in git('diff', '--name-only', base, '--').decode().splitlines()]
    scope = select_scope(changed, a.scope)
    if scope == 'demand-first':
        statuses = dict((p, status) for status, p in (line.split('\t', 1) for line in git('diff', '--name-status', '--no-renames', base, '--').decode().splitlines()))
        outside = demand_first_outside(statuses)
        # Existing non-radar workflows may only pin the runner. Radar workflow additionally selects scope.
        for p in sorted(DEMAND_FIRST_EXISTING & set(changed)):
            if not p.startswith('.github/workflows/'):
                continue
            expected = git('show', f'{base}:{p}').decode().replace('runs-on: ubuntu-latest', 'runs-on: ubuntu-24.04')
            if p.endswith('/opportunity-radar-check.yml'):
                expected = expected.replace('python pipeline/radar_preservation.py\n', 'python pipeline/radar_preservation.py --scope auto\n')
            if (ROOT / p).read_text() != expected:
                outside.append(p + ': unexpected workflow modification')
    else:
        outside = [p for p in changed if not p.startswith(RADAR_SCOPE) and p != PORTFOLIO]
    # The portfolio may differ from the base ONLY by the technical integrity hash of the presentation
    # file this PR edits (docs/index.html). Candidates, gates, promotion, budgets stay identical.
    old, new = json.loads(git('show', f'{base}:{PORTFOLIO}')), json.loads((ROOT / PORTFOLIO).read_bytes())
    strip = lambda d: {k: v for k, v in d.items() if k != 'integrity_baseline'}
    others = lambda d: {k: v for k, v in d['integrity_baseline'].items() if k != 'docs/index.html'}
    portfolio_ok = strip(old) == strip(new) and others(old) == others(new)
    if scope == 'demand-first':
        portfolio_ok = portfolio_ok and git('show', f'{base}:{PORTFOLIO}') == (ROOT / PORTFOLIO).read_bytes()
    index_hash_current = new['integrity_baseline']['docs/index.html'] == hashlib.sha256((ROOT / 'docs/index.html').read_bytes()).hexdigest()
    key = {}
    for p in KEY:
        old = hashlib.sha256(git('show', f'{base}:{p}')).hexdigest()
        new = hashlib.sha256((ROOT / p).read_bytes()).hexdigest()
        key[p] = {'sha256': new, 'identical_to_base': old == new}
    report = {'schema_version': 1, 'base': base, 'scope': scope, 'changed_files': len(changed), 'changed_outside_radar_scope': outside,
              'key_files': key, 'all_key_files_identical': all(v['identical_to_base'] for v in key.values()),
              'portfolio': {'semantics_identical_to_base': portfolio_ok, 'only_allowed_rebinding': 'integrity_baseline[docs/index.html]', 'index_hash_current': index_hash_current}}
    if a.out: Path(a.out).write_text(json.dumps(report, ensure_ascii=False, indent=1) + '\n')
    print(json.dumps({k: report[k] for k in ('base', 'scope', 'changed_files', 'changed_outside_radar_scope', 'all_key_files_identical', 'portfolio')}, ensure_ascii=False))
    raise SystemExit(0 if report['all_key_files_identical'] and not outside and portfolio_ok and index_hash_current else 1)


if __name__ == '__main__':
    main()
