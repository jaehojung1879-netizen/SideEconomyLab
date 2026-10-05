# Decision Intelligence v1 — recommendation correctness revision

Existing Draft PR [#15](https://github.com/jaehojung1879-netizen/SideEconomyLab/pull/15), branch `feat/decision-intelligence-v1`. Before editing, GitHub PR HEAD and the actual remote branch both matched **5853003df80c2dd6af37453eea57f2db8be63990**. Actual remote main was **6f40b0fbf447c6cd5c6ddd57b8759d66e6983c2f**. Final HEAD and its four successful Actions links are recorded in the PR completion comment to avoid a self-referential commit hash. The initial review report is historical; this report describes current semantics.

## Corrected behavior

1. **Market baseline vs site cost:** R_ONE city/floor × area remains calculated and visible as MARKET_RENT_BASELINE. It is an external commercial-space benchmark, never direct installation/host cost. Selected model and actual target terms appear separately. Actual target fixed cost overrides the baseline and older planning rent overrides.
2. **Site basis/model:** Five explicit bases: ACTUAL_SITE_TERMS, PRIVATE_COMPARABLES, HOST_MODEL_ESTIMATE, MARKET_RENT_BASELINE, UNKNOWN. Machines/photo kiosks default to fixed host placement; call/focus/document services and lockers/overflow use micro-space; singing uses an exclusive lease; host luggage uses revenue share. Per-variant allowed alternatives include explicit lease/license/share/concession where appropriate. Host budgets are editable, rounded unsourced planning assumptions, never market observations. Actual revenue-share terms require explicit share and additional-guarantee evidence too. Lease comparables retain the existing five-listing threshold and apply only to FULL_LEASE. Private host quotes are scoped to variant/site/model; they cannot silently become another variant's host or full-lease terms through the legacy shared workspace.
3. **Competition observability:** Explicit capability policy separates storefront establishments, embedded equipment and host-based services. DOCUMENT-PRINT is GOOD; focus/singing/host luggage/overflow are PARTIAL; call booths/photo machines/vending/lockers are POOR. Incomplete fresh source coverage downgrades GOOD to PARTIAL; absent/stale observations become UNKNOWN. A successful storefront registry query does not observe every internal machine. Direct count 0 + POOR/UNKNOWN gives UNKNOWN gate, retaining the raw count and its immediate Korean qualifier. Reliable recent positive direct evidence can still yield WEAK. Stale raw counts remain visible without silently becoming recent decision evidence.
4. **Capture evidence:** Default `/91` is PLANNING_ASSUMPTION_TEMPORAL_GRAIN, displayed as “계획용 환산 — 원자료 시간단위 미검증”. Its rate is informational and the capture gate UNKNOWN regardless of threshold crossings. Counted relevant daily flow is USER_INPUT and activates the gate. Future trusted daily metadata may activate it when source identity, DAILY grain, geography and paid-opportunity units match. Ordinary daily pedestrian counts do not become luggage bag-days.
5. **Recommendation interaction:** PROMISING requires definition/cost completeness, positive contribution, feasible applicable capacity, actual/validated-comparable site basis, eligible passing capture, adequate competition observability and a passing competition gate, confirmed owner availability and no known blocker. Market-only and unsourced host models remain CHECK even with interesting economics. Known negative contribution/capacity/observed capture/recent competition/owner availability or a failing actual/private/planning site ceiling remain WEAK; known blockers remain BLOCKED. Unrelated missing inputs do not erase negative evidence. Evidence confidence stays separate and LOW while other prices/costs/permissions are assumptions.
6. **Location shortlist:** All 13 existing location variants across OC-001/008/013/020 are evaluated at the selected area/private point. The selected variant is always first, with its scenario, followed by up to three alternatives across families. OC-022 MRO and OC-030 event are excluded from physical-location ranking. Cross-family clicks preserve the location/private site. No Opportunity Score was added.

Exact capability/model policies, planning ranges and tie-breakers are documented in the [method guide](../docs/decision-intelligence-v1.md). Ranking uses status, site basis, observability, fewer unknown core gates, cash at risk, stable model grouping, utilization within comparable TIME/STORAGE models only, then variant ID. It never compares unlike raw flows/transactions/capture rates.

## Acceptance cases

Public examples use the existing committed source bundle `2026-10-05-105da80ed300` at the actual Myeongdong 3001492 center, as of 2026-10-05. Source facts were not rewritten.

| Case | Result | Why |
| --- | --- | --- |
| Myeongdong VEND-BEVERAGE, default planning inputs | **CHECK / LOW** | HOST_FIXED_FEE / HOST_MODEL_ESTIMATE; 300,000 KRW base planned fee, not an actual offer. R_ONE benchmark remains approximately 211,111 KRW/month for the requested 4㎡. Direct observed 0; POOR capability, competition gate UNKNOWN. Required capture about 0.052% is only the unverified `/91` interpretation. Owner confirmation alone does not promote it. |
| Same vending variant, explicitly selected FULL_LEASE with city baseline only | **CHECK / LOW** | MARKET_RENT_BASELINE cannot pass site_terms. Separate GOOD-observability document-print test also remains CHECK with counted flow/owner confirmed, isolating the site-basis cap from poor vending observability. |
| Stronger-evidence DOCUMENT-PRINT fixture | **PROMISING / LOW** | Explicit FULL_LEASE target input 100,000 KRW/month, counted relevant flow 100,000/day, owner confirmed, fresh complete test-only circle with zero directly observed storefront competitors (GOOD), positive contribution 1,110 KRW/transaction, 13.83 break-even transactions/day, capture 0.01383%, no blocker; non-capacity model. Unknown operating prices/costs still cap confidence LOW. |
| Myeongdong VEND-BEVERAGE, actual target fee 5,000,000 KRW/month, entered planning volume 300/month, recovery horizon 24 months | **WEAK / LOW** | ACTUAL_SITE_TERMS exceeds the affordable fixed-fee ceiling **−218,250 KRW/month**. Public demand and small informational capture cannot erase this negative economics result. |
| Stronger document-print fixture with counted flow reduced to 1/day | **WEAK** | Eligible user-observed capture fails. |
| Known host installation prohibition | **BLOCKED** | Known blocker takes precedence. |

The strong case is **synthetic regression input**, not collected evidence or a claim about real Myeongdong competition/quotes/footfall. It proves the gates can still advance a case. Its fresh empty-circle fixture is never published to source data. Validated lease-comparable fixtures can also become PROMISING with the other stronger gates satisfied. Browser tests exercise both stronger-input promotion and excessive observed-capture rejection.

## Files and integrity

- `docs/assets/decision-intelligence.js`: explicit policies, bases/models, capture eligibility, observability/gates and deterministic cross-family selection.
- `docs/assets/decision-panel.js`: selected-first snapshot, separate alternatives, Korean uncertainty labels, contract editor and scoped private terms.
- `docs/assets/gis.js`: one event listener allows explicit cross-family selection to preserve the selected area; legacy string events retain their previous behavior.
- `docs/data/candidate-validation-portfolio.json`: **only** the exact GIS asset SHA-256 was rebound for that authorized listener change, from `80e63cb10263c71ff7a9abcd07aae6498938b81720dbaec99118e2db9f848c73` to `7a1e82d8f2af977039ef7718b89b21dc486bc1dc3f66b5b18a9eb07d51fa610c`.
- `tests/decision-models.cjs`, `tests/decision-browser.cjs`: focused semantic regression and selected/private-site/cross-family UI coverage; existing arithmetic, backup, mobile, hover, privacy and failure checks retained.
- `docs/decision-intelligence-v1.md`, this report, `research/decision-intelligence-completion-v1.md`: current method, acceptance evidence and explicit historical-report notice.

Portfolio semantic digest remains `0df2b83b637ca2c19af4a11d7e4fae9c61326af3489e2785678433a277ea108f`. Integrity tests were not weakened. Catalog variants/configurations/sources, source snapshots, 23,388 official store records, buildings, public data, secret names, collection operations, source derivation, scanning and fail-safe refresh were not changed. No refresh or derived-source regeneration was necessary.

## Validation

Local validation passed:

- All **50 Python tests**, including secret/data/immutable-source/integrity regressions.
- Decision model regressions for baseline-only promotion cap, poor/good/unknown zero observation, temporal-grain neutrality across opposite threshold sides, user/verified denominator activation, visible benchmark/actual override, private comparables/host distinction, share model terms, cross-family eligibility/selection stability, stronger PROMISING, adverse WEAK and BLOCKED.
- Decision desktop/mobile browser tests: selected first + three cross-family alternatives, same-area/private-site selection, model/quote scoping, real-term override, synthetic stronger-input PROMISING, observed-flow WEAK, private backup/invalid import preservation, dynamic legend, hover dismissal, no private server writes or browser authentication.
- Existing Workbench 13 regression groups, context models, Workbench browser/private scenarios and portfolio browser.
- `pipeline/decision_bundle.py`, `pipeline/gis_refresh.py --check`, `pipeline/validation_portfolio.py --check`, syntax and whitespace checks.

Required final Actions: **Verify static GIS**, **Verify candidate validation portfolio**, **Verify business workbench**, **Verify decision intelligence**. Their successful final-HEAD run links are in the completion comment. Existing authenticated source audits on the starting reviewed HEAD succeeded, including [run 37265955114](https://github.com/jaehojung1879-netizen/SideEconomyLab/actions/runs/37265955114); DATA_GO and R_ONE remain exact names. No key value was inspected or disclosed, and this semantics-only revision did not invoke collection.

## Remaining limits

Host ranges remain unsourced planning budgets, not predicted fees. Actual owner-entered quotes/flow are not independently authenticated. Storefront observability does not measure all embedded equipment; such variants cannot become PROMISING solely from current place/registry sources. Source dates age normally. No source daily temporal grain or survey-boundary/GIS crosswalk has been proven. Legal/host permissions and supplier/operating costs need separate confirmation. Daily pedestrian counts do not prove paid storage opportunities. The stronger example is synthetic. This change grants no commercial commitment or deployment authority.

PR #15 remains Draft and unmerged. Recommendation semantics are corrected and ready for human review.
