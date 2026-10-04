"""A demand refresh must publish one proven bundle or preserve every previous byte."""
import copy
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'pipeline'))
import gis_refresh as refresh
import real_estate_context as context


class RefreshTests(unittest.TestCase):
    def fixture(self, folder):
        root = Path(folder)
        for name in ('pipeline', 'docs', 'tests', 'config', 'field', 'research', 'data/real-estate-context', '.github/workflows'):
            (root / name).mkdir(parents=True, exist_ok=True)
        for name in (*refresh.OUTPUTS, 'docs/data/candidate-registry.json', 'config/real-estate-geography-v1.json'):
            dest = root / name
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / name, dest)
        stored = json.loads((root / refresh.DERIVED_INPUTS[3]).read_bytes())
        snapshot = ROOT / 'data/real-estate-context' / stored['snapshot_id']
        shutil.copytree(snapshot, root / 'data/real-estate-context' / stored['snapshot_id'])
        return root

    def old_bytes(self, root):
        return {name: (root / name).read_bytes() for name in refresh.OUTPUTS}

    def compatible_builder(self, stage, *args):
        path = stage / refresh.DERIVED_INPUTS[0]
        demand = json.loads(path.read_bytes())
        # Real byte change, same IDs/names/districts/centers: no fabricated field evidence.
        demand['areas'][0]['worker'] += 1
        path.write_bytes(context.encoded(demand))
        source = json.loads((stage / refresh.DERIVED_INPUTS[1]).read_bytes())
        registry_path = stage / 'docs/data/candidate-registry.json'
        derived = refresh.derive(demand, source, json.loads(registry_path.read_bytes()))
        derived.update({key: context.sha((stage / name).read_bytes()) for key, name in (
            ('demand_hash', refresh.DERIVED_INPUTS[0]), ('source_hash', refresh.DERIVED_INPUTS[1]),
            ('registry_hash', 'docs/data/candidate-registry.json'))})
        (stage / refresh.DERIVED_INPUTS[2]).write_bytes(context.encoded(derived))
        current = json.loads((stage / refresh.DERIVED_INPUTS[3]).read_bytes())
        context.publish(stage / 'data/real-estate-context' / current['snapshot_id'],
                        stage / refresh.DERIVED_INPUTS[3], path)

    def test_compatible_demand_bytes_rebuild_identity_preserving_source_age(self):
        with tempfile.TemporaryDirectory() as folder:
            root = self.fixture(folder)
            before = self.old_bytes(root)
            before_raw = refresh.raw_hashes(root)
            seen = []
            def verify(stage):
                seen.append(refresh.validate_bundle(stage))
                self.assertEqual(self.old_bytes(root), before, 'validation must precede public writes')
            with patch.object(context.urllib.request, 'urlopen', side_effect=AssertionError('no source refetch')):
                refresh.refresh_bundle(root, builder=self.compatible_builder, validator=verify)
            self.assertEqual(len(seen), 1)
            expected = context.sha((root / refresh.DERIVED_INPUTS[0]).read_bytes())
            result = json.loads((root / refresh.DERIVED_INPUTS[3]).read_bytes())
            original = json.loads(before[refresh.DERIVED_INPUTS[3]])
            self.assertEqual(result['demand_hash'], expected)
            self.assertNotEqual(expected, original['demand_hash'])
            result.pop('demand_hash'); original.pop('demand_hash')
            self.assertEqual(result, original)  # includes timestamps, freshness, periods, mappings and source values
            self.assertEqual(refresh.raw_hashes(root), before_raw)
            portfolio = json.loads((root / refresh.PORTFOLIO).read_bytes())
            prior = json.loads(before[refresh.PORTFOLIO])
            portfolio.pop('integrity_baseline'); prior.pop('integrity_baseline')
            self.assertEqual(portfolio, prior, 'research semantics must never be rebound')

    def test_incompatible_geography_preserves_entire_previous_bundle(self):
        mutations = [
            lambda d: d['areas'][0].update(trdar_cd='changed-id'),
            lambda d: d['areas'].append(copy.deepcopy(d['areas'][0])),
            lambda d: d['areas'][0].update(district='outside Seoul'),
            lambda d: d['areas'][0].update(trdar_name='unproven new name'),
            lambda d: d['areas'][0].update(x_epsg5181=d['areas'][0]['x_epsg5181']+1),
            lambda d: d.update(area_count=d['area_count']-1),
            lambda d: d.update(coordinate_system='unproven CRS'),
        ]
        with tempfile.TemporaryDirectory() as folder:
            root = self.fixture(folder); before = self.old_bytes(root)
            for mutate in mutations:
                with self.subTest(mutation=mutate):
                    def bad(stage, *args):
                        path=stage / refresh.DERIVED_INPUTS[0]
                        demand=json.loads(path.read_bytes()); mutate(demand)
                        path.write_bytes(context.encoded(demand))
                        old=json.loads((stage / refresh.DERIVED_INPUTS[3]).read_bytes())
                        context.publish(stage / 'data/real-estate-context' / old['snapshot_id'],
                                        stage / refresh.DERIVED_INPUTS[3], path)
                    with self.assertRaises((ValueError, KeyError)):
                        refresh.refresh_bundle(root, builder=bad, validator=lambda stage: None)
                    self.assertEqual(self.old_bytes(root), before)

    def test_failed_dependent_build_and_validation_preserve_previous_public_artifacts(self):
        with tempfile.TemporaryDirectory() as folder:
            root=self.fixture(folder); before=self.old_bytes(root)
            def broken(stage, *args):
                (stage / refresh.DERIVED_INPUTS[0]).write_bytes(b'new incomplete demand')
                (stage / refresh.DERIVED_INPUTS[1]).write_bytes(b'new partial supply')
                raise ValueError('dependent producer failed')
            with self.assertRaises(ValueError):
                refresh.refresh_bundle(root, builder=broken, validator=lambda stage: None)
            self.assertEqual(self.old_bytes(root), before)
            with self.assertRaises(ValueError):
                refresh.refresh_bundle(root, builder=self.compatible_builder,
                                       validator=lambda stage: (_ for _ in ()).throw(ValueError('integration check failed')))
            self.assertEqual(self.old_bytes(root), before)

    def test_mixed_dependencies_and_source_mutation_fail_before_publication(self):
        with tempfile.TemporaryDirectory() as folder:
            root=self.fixture(folder); before=self.old_bytes(root)
            def stale(stage, *args):
                demand=stage / refresh.DERIVED_INPUTS[0]
                demand.write_bytes(demand.read_bytes()+b'\n')
            with self.assertRaisesRegex(ValueError, 'supply dependency mismatch'):
                refresh.refresh_bundle(root, builder=stale, validator=lambda stage: None)
            self.assertEqual(self.old_bytes(root), before)
            def changed_raw(stage, *args):
                self.compatible_builder(stage)
                snapshot=json.loads((stage / refresh.DERIVED_INPUTS[3]).read_bytes())['snapshot_id']
                # Unreferenced new file must also be rejected as a raw-snapshot mutation.
                (stage / 'data/real-estate-context' / snapshot / 'unexpected').write_text('mutation')
            with self.assertRaisesRegex(ValueError, 'immutable source'):
                refresh.refresh_bundle(root, builder=changed_raw, validator=lambda stage: None)
            self.assertEqual(self.old_bytes(root), before)

    def test_publication_io_failure_rolls_back_all_outputs(self):
        with tempfile.TemporaryDirectory() as folder:
            root=self.fixture(folder); before=self.old_bytes(root)
            replace=Path.replace
            def fail_once(path, target):
                if path.name=='real-estate-context.json.refresh-tmp':
                    raise OSError('fixture publication error')
                return replace(path,target)
            with patch.object(Path,'replace',fail_once), self.assertRaises(OSError):
                refresh.refresh_bundle(root,builder=self.compatible_builder,validator=lambda stage: None)
            self.assertEqual(self.old_bytes(root),before)
            self.assertEqual(list((root / 'docs/data').glob('*.refresh-tmp')),[])

    def test_concurrent_input_edit_is_preserved_instead_of_overwritten(self):
        with tempfile.TemporaryDirectory() as folder:
            root=self.fixture(folder); before=self.old_bytes(root)
            def edit_input(stage):
                (root / refresh.DERIVED_INPUTS[0]).write_bytes(b'concurrent local edit')
            with self.assertRaisesRegex(ValueError, 'inputs changed during refresh'):
                refresh.refresh_bundle(root, builder=self.compatible_builder, validator=edit_input)
            self.assertEqual((root / refresh.DERIVED_INPUTS[0]).read_bytes(), b'concurrent local edit')
            for name in refresh.OUTPUTS[1:]:
                self.assertEqual((root / name).read_bytes(), before[name])

    def test_workflow_requires_proven_bundle_before_commit_and_has_no_mutation_loop(self):
        workflow=(ROOT / '.github/workflows/seoul-gis-refresh.yml').read_text()
        self.assertLess(workflow.index('python -u pipeline/gis_refresh.py'),workflow.index('git commit'))
        self.assertLess(workflow.index('python pipeline/gis_refresh.py --check'),workflow.index('git commit'))
        self.assertIn('set -euo pipefail',workflow)
        self.assertNotIn('git pull --rebase',workflow)
        self.assertIn('git rev-parse FETCH_HEAD',workflow)
        triggers=workflow.split('permissions:')[0]
        for name in refresh.OUTPUTS:
            self.assertNotIn(name,triggers)
            self.assertIn(name,workflow.split('git add ',1)[1])
        source_workflow=(ROOT / '.github/workflows/real-estate-context.yml').read_text()
        self.assertNotIn('  push:',source_workflow.split('permissions:')[0])
        self.assertIn('group: seoul-derived-data-${{ github.ref }}',workflow)
        self.assertIn('group: seoul-derived-data-${{ github.ref }}',source_workflow)


if __name__=='__main__':unittest.main()
