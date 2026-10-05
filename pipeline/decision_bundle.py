"""Validate immutable, sanitized source snapshots and their exact public derivation."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import re
from public_api_client import assert_sanitized
ROOT = Path(__file__).resolve().parents[1]
PUBLIC = 'docs/data/decision-evidence.json'

def encode(v):
    return (json.dumps(v, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False)+'\n').encode()

def digest(data):
    return hashlib.sha256(data).hexdigest()

def derive(raw, snapshot, raw_hash):
    from decision_rent import derive_rent
    stores = {r['bizesId']: r for c in raw['store_caches'] for r in c['rows']}
    return {'schema_version':1, 'snapshot_id':snapshot, 'raw_hash':raw_hash,
            'retrieved_at':raw['retrieved_at'], 'classification_version':'variant-rules-v1',
            **(derive_rent(raw) if raw.get('decision_derivation_version',0)>=2 else {}),
            'coverage':[{k:v for k,v in c.items() if k!='rows'} for c in raw['store_caches']],
            'stores':list(stores.values()), 'r_one':[{k:v for k,v in r.items() if k!='rows'}|{'row_count':len(r.get('rows',[]))} for r in raw['r_one']] if raw.get('decision_derivation_version',0)>=3 else raw['r_one'], 'buildings':raw['buildings'],
            'public_research':raw.get('public_research',[]), **({k:raw[k] for k in ('additional_api_audit','audit_retrieved_at') if k in raw}), 'limitations':['Selected 800m caches only; no Seoul-wide store census','Building records belong to explicitly labeled public hypothetical parcels, not private user sites']}

def validate_raw(raw):
    assert_sanitized(raw)
    if raw['secret_contract'] != ['DATA_GO','R_ONE']: raise ValueError('Secret contract')
    if not re.fullmatch(r'20\d{2}-\d{2}-\d{2}T.*',raw['retrieved_at']):raise ValueError('Retrieval date')
    if not raw['store_caches']:raise ValueError('No complete store cache')
    for cache in raw['store_caches']:
        if not cache['complete'] or len(cache['rows']) != cache['total']:raise ValueError('Incomplete store cache')
        if len({r['bizesId'] for r in cache['rows']})!=cache['total']:raise ValueError('Duplicate store ID')
        if cache['radius_m']!=800 or cache['operation']!='storeListInRadius':raise ValueError('Cache contract')
        for r in cache['rows']:
            if not r['bizesId'] or not 33<=float(r['lat'])<=39 or not 124<=float(r['lon'])<=132:raise ValueError('Store identity/point')
    return raw

def publish(raw, root=ROOT):
    root=Path(root);validate_raw(raw)
    packed=gzip.compress(encode(raw),mtime=0);hash_=digest(packed)
    snapshot=raw['retrieved_at'][:10]+'-'+hash_[:12]
    public=derive(raw,snapshot,hash_);assert_sanitized(public)
    folder=root/'data/decision-intelligence'/snapshot
    source=folder/'source.json.gz'; public_path=root/PUBLIC
    # Complete validation happens in memory before any publication. Prior output restored on failure.
    before=public_path.read_bytes() if public_path.exists() else None
    existed=source.exists()
    try:
        folder.mkdir(parents=True,exist_ok=True)
        if existed and source.read_bytes()!=packed:raise ValueError('Immutable snapshot collision')
        source.write_bytes(packed)
        temp=public_path.with_suffix('.json.stage');temp.write_bytes(encode(public));temp.replace(public_path)
        check(root)
    except Exception:
        if before is None:public_path.unlink(missing_ok=True)
        else:public_path.write_bytes(before)
        if not existed:source.unlink(missing_ok=True)
        raise
    finally:public_path.with_suffix('.json.stage').unlink(missing_ok=True)
    return snapshot

def check(root=ROOT):
    root=Path(root);public=json.loads((root/PUBLIC).read_bytes());identity=public['snapshot_id']
    if not re.fullmatch(r'20\d{2}-\d{2}-\d{2}-[a-f0-9]{12}',identity):raise ValueError('Snapshot identity')
    packed=(root/'data/decision-intelligence'/identity/'source.json.gz').read_bytes()
    if len(packed)>15000000:raise ValueError('Snapshot budget')
    raw=json.loads(gzip.decompress(packed));validate_raw(raw)
    if digest(packed)!=public['raw_hash'] or public!=derive(raw,identity,digest(packed)):raise ValueError('Decision source dependency mismatch')
    assert_sanitized(public)
    return public

if __name__=='__main__':
    argparse.ArgumentParser(description=__doc__).parse_args()
    check();print('DECISION_SOURCE_BUNDLE_VALID')
