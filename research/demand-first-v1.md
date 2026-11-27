# Demand-first research v1 — 2026-11-27

Base: adabef5453808ba482f0cb0862eeae0200c64028. Research only. Existing OC IDs, candidate validation, GIS data, economics and deployment behavior unchanged. This is a separate exploratory DF registry, not a replacement canonical OC registry, not a re-ranking. Existing CV-022 and CV-030 thresholds remain binding. No purchase, customer contact, commercial test, or employer clearance is claimed.

## Findings
- The initial 30 OC hypotheses overweight physical assets. Split OC-001 by payer, transaction and distribution rather than machine: public pay-per-use, supplier-backed enterprise contract, institution reservation. The variants are hypotheses, not verified sales.
- Digital is not intrinsically preferable. Fintate, BidQ/BidData and marketplace automation offers make generic software and generic bid alerts weak entry theses. Look for a specific underserved workflow, evidence of paid alternatives and low support burden; do not build before validating.
- MRO incumbents confirm an established spending category but not small-business willingness to pay a new intermediary. Existing CV-022 is preserved.
- All new DF records are C0 hypotheses even when a source establishes analogous supply. No numeric profitability or new score assigned. The registry records payer, revenue mechanism, substitute, test and falsifier.

## Public source evidence
See [machine-readable registry](../docs/data/demand-first-research-v1.json) and [standalone research board](../docs/demand-first.html). Sources are public page observations on 2026-11-27, not downloaded raw transaction datasets or audited earnings. The NTS catalog identifies 20260930 and 2026-11-18 publication; detailed page surfaced an older 20260531 version. Its suppression and boundary notices must be rechecked against the current release. Container DNS blocked data.go.kr; actual CSV not collected. Do not infer closures from net active-business changes, business count from suppressed zeros, demand from supply, or revenue/profit from estimated spending.

## NTS intake
Download the official CSV manually or via an independently verified sanctioned file URL; retain the immutable original and release date. Run:
```
python pipeline/nts_snapshot_audit.py source.csv --period 2026-09 --out snapshot.json
python -m unittest discover -s tests -p test_nts_snapshot_audit.py
```
This intentionally accepts only the published six columns and integer counts, rejects unexpected small cells, duplicates and malformed values. A zero may be suppressed; no percentages are produced. Claimed period is not inferred from bytes. Before publication independently reconcile row counts, totals/aggregate rows, coverage, geography and classification histories, actual publication date and revision status; no automatic crosswalk or join.

## Next execution order
1. Authenticate official NTS snapshot; retain raw checksum and metadata; compare eligible same-boundary groups only. Do not combine Seoul card spend with NTS taxpayer counts as per-shop revenue.
2. Extend existing Seoul Radar to administrative-dong values after boundary and category reconciliation; preserve old snapshots and tests. Integrate SEMAS only with explicit keys and coverage proof.
3. Acquire actual PPS contract rows for one non-financial service niche (including amendments/deletions). Deduplicate using documented contract identifiers, separate awarded amounts from estimates and exclude future information. Compare existing commercial tools. No generic bid prediction.
4. Research queue (not approved field work): DF-005/007/008 cheap desk tests, DF-002 supplier model recheck, alongside unchanged CV-022/CV-030. Require public-source recruitment and employer-policy check before outreach. No employer data/contacts.
5. Run the existing six scoring dimensions only with evidence. Track owner hours including acquisition, support, travel and interruption; owner-time opportunity cost and a no-business baseline are separate sensitivity assumptions. Proposed targets from discussion are not adopted policy. For recurring models calculate contribution only with complete price/cost, churn and customer acquisition evidence; for physical models require host terms, AS, exit cost. Unknown remains unknown.
6. Only then integrate eligible variants into canonical registry and primary UI via reviewed migrations; user-facing status must never imply approval.

## Decision
Research-only. No new validated candidate, ranked expected ROI, forecast, purchase or pilot. The standalone UI is additive and not wired into GIS navigation; README links it. Live data and browser/CI verification remain outstanding until actually run.
