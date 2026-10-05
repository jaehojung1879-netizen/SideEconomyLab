#!/usr/bin/env python3
"""Stage, rebuild and validate the complete GIS dependency bundle before publication."""
import argparse
import json
import os
import re
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

import real_estate_context as context
from opportunity_intelligence import derive

ROOT = Path(__file__).resolve().parents[1]
DATA = 'docs/data/'
DERIVED_INPUTS = tuple(DATA + name for name in (
    'seoul-opportunity-map.json', 'kakao-poi-layer.json',
    'opportunity-intelligence.json', 'real-estate-context.json'))
PORTFOLIO = DATA + 'candidate-validation-portfolio.json'
OUTPUTS = (*DERIVED_INPUTS, PORTFOLIO)


def copy_workspace(root, stage):
    # Existing modules resolve paths from __file__: isolated files, no Git checkout/worktree.
    for directory in ('pipeline', 'docs', 'tests', 'config', 'field', 'research', 'data/real-estate-context', '.github/workflows'):
        shutil.copytree(root / directory, stage / directory, ignore=shutil.ignore_patterns('__pycache__'))


def run(command, stage, env=None):
    print('GIS_STAGE ' + command[1], flush=True)
    subprocess.run(command, cwd=stage, env=env, check=True)


def build_stage(stage, refresh_demand=False, rebuild_only=False):
    if refresh_demand:
        env = dict(os.environ, GIS_OUTPUT=DATA + 'seoul-opportunity-map.json')
        run([sys.executable, '-u', 'pipeline/seoul_location_screen.py'], stage, env)
    if not rebuild_only:
        run([sys.executable, '-u', 'pipeline/kakao_competitor_layer.py'], stage)
    run([sys.executable, 'pipeline/opportunity_intelligence.py'], stage)
    # Deliberately no --refresh or --as-of: reuse immutable audited raw evidence and its date.
    run([sys.executable, 'pipeline/real_estate_context.py'], stage)


def validate_bundle(root):
    demand_path = root / DERIVED_INPUTS[0]
    source_path = root / DERIVED_INPUTS[1]
    registry_path = root / DATA / 'candidate-registry.json'
    demand = json.loads(demand_path.read_bytes())
    source = json.loads(source_path.read_bytes())
    registry = json.loads(registry_path.read_bytes())
    supplied = json.loads((root / DERIVED_INPUTS[2]).read_bytes())
    expected = derive(demand, source, registry)
    expected.update({name: context.sha(path.read_bytes()) for name, path in (
        ('demand_hash', demand_path), ('source_hash', source_path), ('registry_hash', registry_path))})
    if supplied != expected:
        raise ValueError('supply dependency mismatch; previous bundle preserved')
    published = json.loads((root / DERIVED_INPUTS[3]).read_bytes())
    snapshot_id = published['snapshot_id']
    if not isinstance(snapshot_id, str) or not re.fullmatch(r'20\d{2}-\d{2}-\d{2}(?:-[a-f0-9]{12})?', snapshot_id):
        raise ValueError('invalid context snapshot identity')
    snapshot = root / 'data/real-estate-context' / snapshot_id
    rebuilt = context.build(snapshot=snapshot, demand_path=demand_path)
    if published != rebuilt:
        raise ValueError('context dependency mismatch; previous bundle preserved')
    return published['demand_hash']


def rebind_portfolio_integrity(stage):
    # Technical provenance only. No evidence, selection, budget, date, experiment or UI changes.
    path = stage / PORTFOLIO
    state = json.loads(path.read_bytes())
    for name in DERIVED_INPUTS:
        state['integrity_baseline'][name] = context.sha((stage / name).read_bytes())
    path.write_text(json.dumps(state, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def validate_stage(stage):
    run([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-v'], stage)
    run(['node', 'tests/real-estate-context.cjs'], stage)
    run([sys.executable, 'pipeline/validation_portfolio.py', '--check'], stage)
    run([sys.executable, '-c', "import json,jsonschema; "
         "s=json.load(open('docs/data/candidate-validation-portfolio.schema.json')); "
         "v=json.load(open('docs/data/candidate-validation-portfolio.json')); "
         "jsonschema.Draft202012Validator(s,format_checker=jsonschema.FormatChecker()).validate(v)"], stage)


def raw_hashes(root):
    return {str(path.relative_to(root)): context.sha(path.read_bytes())
            for path in (root / 'data/real-estate-context').rglob('*') if path.is_file()}


def publish_bundle(root, stage):
    """Restore all previous public bytes if an ordinary publication operation fails."""
    before = {name: (root / name).read_bytes() for name in OUTPUTS}
    try:
        for name in OUTPUTS:
            destination = root / name
            temporary = destination.with_suffix('.json.refresh-tmp')
            temporary.write_bytes((stage / name).read_bytes())
            temporary.replace(destination)
    except Exception:
        for name, data in before.items():
            (root / name).write_bytes(data)
        raise
    finally:
        for name in OUTPUTS:
            (root / name).with_suffix('.json.refresh-tmp').unlink(missing_ok=True)


def refresh_bundle(root=ROOT, refresh_demand=False, rebuild_only=False,
                   builder=build_stage, validator=validate_stage):
    root = Path(root)
    before_raw = raw_hashes(root)
    before_public = {name: (root / name).read_bytes() for name in OUTPUTS}
    with tempfile.TemporaryDirectory(prefix='sideeconomylab-gis-') as folder:
        stage = Path(folder)
        copy_workspace(root, stage)
        builder(stage, refresh_demand, rebuild_only)
        # Validate exact derivations before rebinding provenance or running integration checks.
        identity = validate_bundle(stage)
        if before_raw != raw_hashes(stage):
            raise ValueError('demand refresh changed immutable source evidence')
        rebind_portfolio_integrity(stage)
        validator(stage)
        # Tests must not leave a mixed bundle either.
        validate_bundle(stage)
        if before_raw != raw_hashes(stage):
            raise ValueError('validation changed immutable source evidence')
        if before_public != {name: (root / name).read_bytes() for name in OUTPUTS} or before_raw != raw_hashes(root):
            raise ValueError('inputs changed during refresh; rerun from the new snapshot')
        publish_bundle(root, stage)
    print(f'GIS_BUNDLE_VALIDATED demand_hash={identity}; public outputs published together')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--refresh-demand', action='store_true')
    group.add_argument('--rebuild-only', action='store_true', help='Offline repair using committed demand, POIs and raw context')
    group.add_argument('--check', action='store_true', help='Verify exact live dependency derivations without writes')
    args = parser.parse_args()
    try:
        if args.check:
            print('GIS_DEPENDENCIES_VALID ' + validate_bundle(ROOT))
        else:
            refresh_bundle(refresh_demand=args.refresh_demand, rebuild_only=args.rebuild_only)
    except Exception as exc:
        # Never stringify URL-bearing subprocess/HTTP exceptions or environment credentials.
        raise SystemExit(f'GIS refresh failed ({type(exc).__name__}); no generated-data commit allowed; prior bundle preserved') from None


if __name__ == '__main__':
    main()
