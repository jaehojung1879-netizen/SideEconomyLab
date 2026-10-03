#!/usr/bin/env python3
import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

DEFAULT_SERVICE = "VwsmSignguWrcPopltnW"

def call_seoul_api(api_key: str, service: str, start: int, end: int):
    encoded_key = urllib.parse.quote(api_key.strip(), safe="")
    encoded_service = urllib.parse.quote(service.strip(), safe="")
    bases = [
        "https://openapi.seoul.go.kr:8088",
        "http://openapi.seoul.go.kr:8088",
    ]

    last_error = None
    for base in bases:
        url = f"{base}/{encoded_key}/json/{encoded_service}/{start}/{end}/"
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "SideEconomyLab/1.0"},
            )
            with urllib.request.urlopen(req, timeout=30) as response:
                payload = json.loads(response.read().decode("utf-8"))
                return payload
        except urllib.error.HTTPError as exc:
            last_error = f"HTTP {exc.code}"
        except urllib.error.URLError:
            last_error = "network error"
        except json.JSONDecodeError:
            last_error = "invalid JSON response"

    raise RuntimeError(last_error or "API request failed")

def normalize(payload: dict, service: str):
    root = payload.get(service)
    if root is None:
        result = payload.get("RESULT") or {}
        raise RuntimeError(
            f"service payload missing; code={result.get('CODE','UNKNOWN')} "
            f"message={result.get('MESSAGE','UNKNOWN')}"
        )

    result = root.get("RESULT") or {}
    code = result.get("CODE")
    message = result.get("MESSAGE")
    rows = root.get("row") or []
    total = root.get("list_total_count")

    if code != "INFO-000":
        raise RuntimeError(f"API returned code={code} message={message}")

    if not isinstance(rows, list) or not rows:
        raise RuntimeError("API returned success but no rows")

    sample_fields = sorted(rows[0].keys())
    periods = sorted(
        {
            str(row.get("STDR_YYQU_CD"))
            for row in rows
            if row.get("STDR_YYQU_CD") is not None
        }
    )

    return {
        "service": service,
        "result_code": code,
        "result_message": message,
        "list_total_count": total,
        "returned_rows": len(rows),
        "sample_fields": sample_fields,
        "periods_in_sample": periods,
        "sample_rows": rows,
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--service", default=DEFAULT_SERVICE)
    parser.add_argument("--start", type=int, default=1)
    parser.add_argument("--end", type=int, default=5)
    parser.add_argument("--out", default="artifacts/seoul-open-data-smoke.json")
    args = parser.parse_args()

    api_key = os.environ.get("SEOUL", "").strip()
    if not api_key:
        print("ERROR: repository secret SEOUL is missing or empty.", file=sys.stderr)
        return 2

    if args.start < 1 or args.end < args.start or (args.end - args.start + 1) > 1000:
        print("ERROR: invalid row range; Seoul Open Data API supports max 1,000 rows/request.", file=sys.stderr)
        return 2

    try:
        payload = call_seoul_api(api_key, args.service, args.start, args.end)
        summary = normalize(payload, args.service)
    except Exception as exc:
        # Do not print request URLs because the API key is embedded in the path.
        print(f"ERROR: Seoul API smoke test failed: {exc}", file=sys.stderr)
        return 1

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(
        "Seoul API OK | "
        f"service={summary['service']} "
        f"code={summary['result_code']} "
        f"rows={summary['returned_rows']} "
        f"total={summary['list_total_count']} "
        f"periods={','.join(summary['periods_in_sample']) or 'n/a'}"
    )
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
