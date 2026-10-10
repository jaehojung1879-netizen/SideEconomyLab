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
               'research/opportunity-radar-v2/', '.github/workflows/opportunity-radar-', 'README.md')
KEY = ('docs/data/candidate-validation-portfolio.json', 'docs/data/candidate-registry.json', 'docs/data/business-workbench.json',
       'docs/data/decision-evidence.json', 'docs/data/seoul-opportunity-map.json', 'docs/data/kakao-poi-layer.json',
       'docs/data/opportunity-intelligence.json', 'docs/data/real-estate-context.json', 'docs/data/site-observations.json',
       'docs/assets/gis.js', 'docs/assets/map-adapter.js', 'docs/assets/economics.js', 'docs/assets/workbench.js',
       'docs/assets/business-workspace.js', 'docs/assets/decision-intelligence.js', 'docs/assets/decision-panel.js',
       'research/opportunity-registry.csv', 'data/opportunity-radar/2026-10-09-55b80cb44604/source.json.gz')


def git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, check=True, capture_output=True).stdout


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--base', default='origin/main'); ap.add_argument('--out'); a = ap.parse_args()
    base = git('rev-parse', a.base).decode().strip()
    changed = [p for p in git('diff', '--name-only', base, '--').decode().splitlines()]
    outside = [p for p in changed if not p.startswith(RADAR_SCOPE)]
    key = {}
    for p in KEY:
        old = hashlib.sha256(git('show', f'{base}:{p}')).hexdigest()
        new = hashlib.sha256((ROOT / p).read_bytes()).hexdigest()
        key[p] = {'sha256': new, 'identical_to_base': old == new}
    report = {'schema_version': 1, 'base': base, 'changed_files': len(changed), 'changed_outside_radar_scope': outside,
              'key_files': key, 'all_key_files_identical': all(v['identical_to_base'] for v in key.values())}
    if a.out: Path(a.out).write_text(json.dumps(report, ensure_ascii=False, indent=1) + '\n')
    print(json.dumps({k: report[k] for k in ('base', 'changed_files', 'changed_outside_radar_scope', 'all_key_files_identical')}, ensure_ascii=False))
    raise SystemExit(0 if report['all_key_files_identical'] and not outside else 1)


if __name__ == '__main__':
    main()
