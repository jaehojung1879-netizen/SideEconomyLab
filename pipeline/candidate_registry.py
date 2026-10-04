"""Small canonical public registry shared by pipelines and static UI."""
import hashlib
import json
from pathlib import Path

REGISTRY_PATH = Path(__file__).resolve().parents[1] / 'docs/data/candidate-registry.json'


def load_registry():
    data = json.loads(REGISTRY_PATH.read_text(encoding='utf-8'))
    if data.get('schema_version') != 1 or not isinstance(data.get('candidates'), list):
        raise ValueError('Invalid candidate registry')
    keys, ids = set(), set()
    for c in data['candidates']:
        if c['key'] in keys or c['id'] in ids or c['lane'] not in ('LOCATION', 'TRANSACTION'):
            raise ValueError('Duplicate or invalid candidate')
        keys.add(c['key']); ids.add(c['id'])
        if c['lane'] == 'LOCATION':
            weights = c['weights']
            if not weights or abs(sum(weights.values()) - 1) > 1e-9 or any(f not in data['fields'] or w < 0 for f, w in weights.items()):
                raise ValueError('Invalid demand weights')
            queries = c['competition']['queries']
            if not queries or any(q['kind'] not in ('keyword', 'category') or not q['value'] for q in queries):
                raise ValueError('Invalid competition queries')
    return data


def location_candidates(registry=None):
    return {c['key']: c for c in (registry or load_registry())['candidates'] if c['lane'] == 'LOCATION'}


def definition_hash(candidate, radius):
    evidence = {'queries': candidate['competition']['queries'], 'radius_m': radius,
                'limit': 15, 'sort': 'distance'}
    return hashlib.sha256(json.dumps(evidence, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
