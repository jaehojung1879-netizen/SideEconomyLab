"""Bounded authenticated official-source audit, sanitized before any persistent output."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re

from public_api_client import Client, SourceError

ROOT = Path(__file__).resolve().parents[1]
RENT_TABLE = 'T248223134698125'
VACANCY_TABLE = 'T241833134686576'


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


def sha(value):
    return hashlib.sha256(value).hexdigest()


def response_rows(payload, operation):
    blocks = payload.get(operation)
    if isinstance(blocks, list):
        heads = [h for b in blocks if isinstance(b, dict) for h in b.get('head', [])]
        rows = [r for b in blocks if isinstance(b, dict) for r in b.get('row', [])]
        code = next((h.get('RESULT', {}).get('CODE') for h in heads if 'RESULT' in h), None)
        total = next((h.get('list_total_count') for h in heads if 'list_total_count' in h), None)
        return rows, total, code
    error = payload.get('RESULT', {})
    return [], None, error.get('CODE') if isinstance(error, dict) else None


def public_fields(row):
    # Metadata/statistical fields only; never echo arbitrary authenticated API responses.
    return {k: v for k, v in row.items() if re.fullmatch(r'(?:STATBL|STTS|CLS|ITM|DTACYCLE|WRTTIME|DTA|UI|ORG|CMM|P|SECT|GRP|UNIT|PRD|START|END|DATA|LIST|VAL|REMARK|NOTE|WEIGHT|RSE|STD)[A-Z_0-9]*', k)
            and isinstance(v, (str, int, float, bool, type(None)))}


def portal_store_rows(payload):
    response = payload.get('response', payload)
    body = response.get('body', {}) if isinstance(response, dict) else {}
    header = response.get('header', payload.get('header', {})) if isinstance(response, dict) else {}
    if not body and isinstance(payload.get('body'), dict):
        body = payload['body']; header = payload.get('header', {})
    items = body.get('items', [])
    if isinstance(items, dict):
        items = items.get('item', items)
    if isinstance(items, dict):
        items = [items]
    return items if isinstance(items, list) else [], body.get('totalCount'), header.get('resultCode')


def probe(output):
    client = Client(budget=35)  # Missing DATA_GO/R_ONE fail before any network call.
    report = {'schema_version': 1, 'retrieved_at': datetime.now(timezone.utc).isoformat(), 'secret_contract': ['DATA_GO', 'R_ONE'], 'operations': []}
    def record(name, fn, parser):
        try:
            payload = fn(); rows, total, code = parser(payload)
            sanitized = client.sanitize({'operation': name, 'code': str(code) if code is not None else None, 'total': total, 'field_names': sorted(set().union(*(r.keys() for r in rows))) if rows else [], 'rows': [public_fields(r) for r in rows]})
            report['operations'].append(sanitized)
        except SourceError as exc:
            report['operations'].append({'operation': name, 'status': str(exc)})
    for op in ['SttsApiTbl', 'SttsApiTblItm']:
        record(op, lambda op=op: client.r_one(op, {'STATBL_ID': RENT_TABLE} if op.endswith('Itm') else {}), lambda p, op=op: response_rows(p, op))
    record('SttsApiTblData.rent', lambda: client.r_one('SttsApiTblData', {'STATBL_ID': RENT_TABLE, 'DTACYCLE_CD': 'QY', 'WRTTIME_IDTFR_ID': '202602'}), lambda p: response_rows(p, 'SttsApiTblData'))
    record('SttsApiTblData.vacancy', lambda: client.r_one('SttsApiTblData', {'STATBL_ID': VACANCY_TABLE, 'DTACYCLE_CD': 'QY', 'WRTTIME_IDTFR_ID': '202602'}), lambda p: response_rows(p, 'SttsApiTblData'))
    try:
        p = client.data_go('B553077/api/open/sdsc2/storeListInRadius', {'radius': 800, 'cx': 126.9818562, 'cy': 37.5640587, 'pageNo': 1, 'numOfRows': 1000, 'type': 'json'})
        rows, total, code = portal_store_rows(p)
        allowed = ('bizesId', 'bizesNm', 'brchNm', 'indsLclsCd', 'indsLclsNm', 'indsMclsCd', 'indsMclsNm', 'indsSclsCd', 'indsSclsNm', 'ksicCd', 'ksicNm', 'lnoAdr', 'rdnmAdr', 'lon', 'lat', 'ctprvnCd', 'signguCd', 'adongCd', 'ldongCd', 'bldMngNo', 'flrNo')
        report['operations'].append(client.sanitize({'operation': 'storeListInRadius', 'code': str(code) if code is not None else None, 'total': total, 'field_names': sorted(set().union(*(r.keys() for r in rows))) if rows else [], 'rows': [{k:r.get(k) for k in allowed} for r in rows]}))
    except SourceError as exc:
        report['operations'].append({'operation': 'storeListInRadius', 'status': str(exc)})
    # One hypothetical selected public parcel, not an inferred address or citywide crawl.
    try:
        p = client.data_go('1613000/BldRgstHubService/getBrTitleInfo', {'sigunguCd':'11680','bjdongCd':'10100','platGbCd':'0','bun':'0821','ji':'0001','numOfRows':100,'pageNo':1,'_type':'json'})
        rows, total, code = portal_store_rows(p)
        allowed = ('mgmBldrgstPk', 'platPlc', 'newPlatPlc', 'mainPurpsCd', 'mainPurpsCdNm', 'etcPurps', 'totArea', 'archArea', 'grndFlrCnt', 'ugrndFlrCnt', 'useAprDay', 'strctCdNm', 'regstrKindCdNm', 'regstrGbCdNm')
        report['operations'].append(client.sanitize({'operation':'getBrTitleInfo','code':str(code) if code is not None else None,'total':total,'field_names':sorted(set().union(*(r.keys() for r in rows))) if rows else [],'rows':[{k:r.get(k) for k in allowed} for r in rows]}))
    except SourceError as exc:
        report['operations'].append({'operation':'getBrTitleInfo','status':str(exc)})
    report['request_count'] = client.calls
    client.sanitize(report)
    output = Path(output); output.mkdir(parents=True, exist_ok=True)
    (output / 'probe.json').write_bytes(encoded(report))
    # No rows/field values or raw response are printed to logs.
    print('Sanitized official-source audit complete; operations=' + str(len(report['operations'])))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--probe', action='store_true')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    try:
        probe(args.output)
    except SourceError as exc:
        raise SystemExit(str(exc)) from None
    except Exception:
        raise SystemExit('SOURCE_AUDIT_FAILED; no public replacement') from None
