"""Offline NTS 100-industry snapshot audit. No market forecasts or geographic joins."""
import argparse
import csv
import hashlib
import io
import json
import re
from pathlib import Path

FIELDS = ["업종", "시도", "시군구", "당월", "전월", "전년동월"]
# Observed in official 20260930 artifact (run 46020228872); no generic whitespace normalization.
OBSERVED_HEADER = ["업종", "시도", "시군구", " 당월 ", " 전월 ", " 전년동월 "]
SOURCE = "https://www.data.go.kr/data/15061118/fileData.do"

def count(value):
    value = value.strip()
    if not re.fullmatch(r"(?:[0-9]+|[0-9]{1,3}(?:,[0-9]{3})+)", value):
        raise ValueError("Unexpected count: " + repr(value))
    n = int(value.replace(",", ""))
    # Published zero may conceal 0–2; never divide by or infer from it.
    if n in (1, 2):
        raise ValueError("Unexpected unsuppressed small cell; confirm source definition")
    return n

def decode_csv(raw):
    for encoding in ("utf-8-sig", "cp949"):
        try:
            return raw.decode(encoding), encoding
        except UnicodeDecodeError:
            continue
    raise ValueError("Unknown encoding")

def inspect_header(raw):
    decoded, encoding = decode_csv(raw)
    header = next(csv.reader(io.StringIO(decoded)), [])
    return {"encoding": encoding, "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw), "header": [s[:100] for s in header[:20]], "header_count": len(header), "header_exact_match": len(header) == len(FIELDS) and set(header) == set(FIELDS)}

def audit(raw, period):
    if not re.fullmatch(r"[0-9]{4}-(?:0[1-9]|1[0-2])", period):
        raise ValueError("Expected YYYY-MM; verify against source file")
    decoded, encoding = decode_csv(raw)
    reader = csv.DictReader(io.StringIO(decoded))
    raw_header = reader.fieldnames
    if raw_header == OBSERVED_HEADER:
        reader.fieldnames = FIELDS.copy()
        header_mapping = "OBSERVED_20260930_EXACT_SPACE_VARIANT"
    elif raw_header and len(raw_header) == len(FIELDS) and set(raw_header) == set(FIELDS):
        header_mapping = "EXACT_METADATA_FIELDS"
    else:
        raise ValueError("Header mismatch; do not silently remap")
    keys = set()
    rows = []
    for row in reader:
        if None in row or any(row[k] is None for k in FIELDS):
            raise ValueError("Malformed row")
        key = tuple(row[k].strip() for k in FIELDS[:3])
        if not all(key) or key in keys:
            raise ValueError("Blank or duplicate industry/geography")
        keys.add(key)
        current, previous, year_ago = (count(row[k]) for k in FIELDS[3:])
        rows.append(dict(industry=key[0], province=key[1], district=key[2],
                         current=current, previous=previous, year_ago=year_ago,
                         suppressed_or_zero=0 in (current, previous, year_ago),
                         comparison_status="BLOCKED_GEOGRAPHY_AND_CLASSIFICATION",
                         yoy=None, mom=None))
    if not rows:
        raise ValueError("Empty snapshot")
    return dict(source=SOURCE, period_claimed=period, sha256=hashlib.sha256(raw).hexdigest(),
                encoding=encoding, raw_header=raw_header, header_mapping=header_mapping, row_count=len(rows), industry_count=len({r["industry"] for r in rows}),
                coverage_verified=False, comparison_eligible=0,
                status="PARSED_NOT_PUBLISHED", rows=rows)

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("csv", type=Path)
    p.add_argument("--inspect-header", action="store_true")
    p.add_argument("--period")
    p.add_argument("--out", type=Path)
    a = p.parse_args()
    raw = a.csv.read_bytes()
    if a.inspect_header:
        print(json.dumps(inspect_header(raw), ensure_ascii=False))
        return
    if a.period is None or a.out is None:
        p.error("--period and --out are required for audit")
    result = audit(raw, a.period)
    # Exclusive output: never replace a previously retained observation.
    with a.out.open("x", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
        f.write("\n")

if __name__ == "__main__":
    main()
