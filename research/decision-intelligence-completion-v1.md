# Decision Intelligence v1 — initial review report

> Historical report for handoff HEAD `5853003df80c2dd6af37453eea57f2db8be63990`. Recommendation states, defaults and family-only ranking below are superseded by the [decision-semantics correctness revision](decision-semantics-revision-v1.md). In particular, Myeongdong vending is now CHECK / LOW by default.

Draft PR [#15](https://github.com/jaehojung1879-netizen/SideEconomyLab/pull/15), branch `feat/decision-intelligence-v1`. Actual starting main: `6f40b0fbf447c6cd5c6ddd57b8759d66e6983c2f` (PR #14 merged). No PR was open at the verified start; this task created one Draft. Final commit identity and Actions links are recorded in the PR completion comment; the report is committed with the implementation rather than embedding its own recursively changing hash.

## Delivered behavior

Selecting an area shows DECISION SNAPSHOT and up to three business plays first: cash range, monthly site-cost range, required daily transactions/utilization, capture burden, source-specific competition, LOW evidence confidence and one next verification. The selected variant stays first; other variants are ordered by explicit decision status, utilization burden, cash at risk and stable ID inside that family. Existing demand ranking and PR #13's frontier remain separate.

All 15 variants have complete visible/editable initial/fixed/variable cost rows with evidence class, source, confidence and reason. Selling price and unsourced operating costs use named planning ranges. Supplier equipment asking prices are not installed cost. Cash splits equipment, nonrecoverable setup, working capital and recoverable deposit. Return/recovery uses cash at risk; deposit is not an expense and resale is not assumed. Six existing revenue models and private Workbench inputs remain available.

Status gates expose definition, cost, rent, contribution, capacity, capture, competition, operational coverage, legal blocker and evidence quality. Known blockers give BLOCKED; nonpositive contribution, impossible capacity, owner inability, excessive research capture/competition burden or a failing entered-volume site ceiling give WEAK. Remaining cases give CHECK, or conditional PROMISING with explicitly available operational coverage and low required capture. The default 1% capture/10 direct observations thresholds are editable research policies, not learned conversion rates. LOW confidence stays independent of attractiveness. There is no new Opportunity Score or success probability.

## Authenticated sources and geography

Expected secrets, by name only: **DATA_GO**, **R_ONE**. Collection runs server-side in Actions. The initial R_ONE ERROR-290 was resolved on a later authenticated audit. Both exact secrets authenticated successfully; no value was inspected or printed.

Successful DATA_GO operations: `storeListInRadius`, `getBrTitleInfo`, `getBrFlrOulnInfo`. Two complete 800m caches use the actual GIS centers: Myeongdong 3001492 (11,189 records / 12 pages), Gangnam station 3120189 (12,199 / 13). Total: **23,388 distinct official store IDs**. Coordinates, IDs, industry codes/names, public addresses and collection provenance are retained. This is not a Seoul-wide census. 200/400/800m variant-specific role counts show each source, MATCHED/KAKAO_ONLY/DATA_GO_ONLY, observed unique totals and coverage limitations. Ambiguous identities remain unmatched. Generic convenience stores are substitutes for beverage vending; general games/entertainment are context for singing booths.

Successful R_ONE operations: `SttsApiTbl`, `SttsApiTblItm`, `SttsApiTblData`, returning INFO-000. The catalog has 738 tables; small-retail item/class metadata has 277 rows; core rent/vacancy tables each have 276 rows. Current market rent includes small, medium/large, collective retail and office, with published Seoul city/market/submarket classes. Finest available geography is **submarket**, but finest defensibly linked to existing GIS areas is **city**: no published survey-polygon/GIS crosswalk is proven. Name similarity between Gangnam station and Gangnam-daero does not authorize a join. No city statistic is described as a Myeongdong shop quote.

The rent resolver uses an exact qualified asset/period/unit market context, optional exact floor-rent match, requested area and explicitly named planning bands. It preserves source dates and observation quarter. Deposit-converted survey rent is distinct from cash asking rent; VAT/management/partial host terms are not silently included. No RSE-derived confidence interval is invented. Actual user rent overrides the market estimate separately. Five or more scoped/same-floor/recent/size-comparable private asking listings can replace the estimate with their per-area IQR; outliers are retained and flagged.

## Buildings, taxonomy and listings

One store-derived **public hypothetical parcel** per target has title/floor context. Myeongdong: 서울 중구 남대문로 73, 판매시설, 43,189.89㎡, ground 20/basement 3, approval 19841201, 50 floor rows. Gangnam: 서초대로78길 5, 업무시설, 14,514.78㎡, ground 18/basement 5, approval 19950502, 47 floor rows. Main use only supports physical plausibility; private-site floor legality, power, ventilation, fire safety, noise and host permission remain unverified. No building crawl or private parcel network request occurs.

Original 13 variants / 22 configurations / 13 source records are retained verbatim by entry hashes. Added VEND-SNACK and VEND-AMENITY, two configurations and one captured domestic vendor source. Shinsung's public listing supports snack/beverage/amenity/disposable vending with a 7.9m KRW machine asking price and a separately described 13m exhibition machine. VAT/installation/dimensions/SKU suitability require matching quotes. Toy gacha, unspecified character/specialty goods and restricted products remain excluded.

Automated rental-listing evidence: **none**. Public/robots access was unavailable; no fabricated 10–30 listings or access circumvention. PRIVATE CSV/JSON import supports 5–10 real public asking listings, null unknowns, medians/ranges per ㎡/평, dated sources and IQR flags. Test fixtures are explicitly synthetic and never published as market evidence. Optional land-use/sale APIs are documented in [additional-public-api-requests-v1.md](additional-public-api-requests-v1.md); neither is a prerequisite for this review.

## UI and integrity validation

Desktop map stays wider than half the viewport. Left filters are initially collapsed with visible rankings; top family/variant/area-or-private-site selectors and dynamic legends stay clear. POIs inspect on hover and dismiss on leave/Escape/background; touch/click remains supported. Right-click or explicit map creation adds a browser-private point and quick floor/area/rent/deposit/management/key-money/host-share terms. All economics recalculate after edits. Owner STRONG/NEUTRAL/WEAK judgment/confidence/reason/change-evidence and later outcomes remain separate from model status. Combined backup includes the original Workbench workspace, restores only after full validation, and preserves both stores after invalid imports. New UI timestamps use Asia/Seoul.

Immutable content-addressed gzip snapshots and exact public derivation are validated before atomic publication. Full store pagination/unique IDs, bounded requests, freshness and actual credential/full/encoded/fragment scans protect the public bundle. Metadata audits keep original store retrieval dates. Failed source refresh preserves previous valid bytes. Existing GIS staged refresh validates the new source dependency; decisions are recalculated at runtime, so there is no persisted stale recommendation mixed with new sources. PR #13 semantic evidence/budgets/selection and original PR #14 records remain unchanged; authorized UI asset hash bindings are updated explicitly.

Local Python: **50 tests passed**. Node decision models cover all 15 envelopes, arithmetic, units, capture, recovery, ceilings, favorable/weak/blocked/unknown cases, floor/geography/freshness, source matching, industry rules and private comparables. Original Workbench 13 regression groups and real-estate contexts pass. Actual Chromium desktop/mobile checks cover decision-first cards, unfavorable rent, BLOCKED input, hover dismissal, dynamic legends, map/private terms, persistence, owner override, valid/invalid combined backup and no browser writes/authenticated official-API requests. Existing GIS, portfolio, Workbench and new decision Actions are required on final HEAD. Kakao's browser test uses an explicit synthetic SDK fixture; live Kakao acceptance is not claimed. Local decision screenshots intentionally abort basemap tiles; existing GIS CI separately verifies loaded live Leaflet tiles and the /SideEconomyLab/ Pages path.

## Remaining user work

No additional secret is needed for this Draft. For an actual site, supply matched vendor/host quotes, a private parcel/floor check, counted front-door traffic or a defensible paid-volume basis, and a responsible weekday interruption responder. A published survey-boundary crosswalk enables finer rent geography. Optional API authorizations are UNKNOWN pending portal checks, not claimed denied. Planning sensitivity is conditional operating contribution, not demand or guaranteed profit; tax, financing and imputed owner salary are excluded. No purchase, lease, deposit, deployment, pilot approval, merge or ready-for-review transition was performed.

## Final source snapshot and acceptance examples

Committed immutable snapshot: `2026-10-05-105da80ed300`, SHA-256 `105da80ed300dd342811228e13497f87db29be42e3041d49bc1de9b8add23496`. Original store retrieval `2026-10-05T03:37:00.630271+00:00`; separate metadata audit `2026-10-05T04:34:24.472810+00:00`. Selected statistical quarter 2026 Q2: the 202603 probe returned INFO-200 and 202602 INFO-000. There are **216 qualified Seoul rent contexts** (small 64, medium/large 73, collective 45, office 34), **2,472 Seoul floor cells** and **712 ancillary cells**. Complete nationwide floor-table rows: office 1,152, medium/large 4,270, small 1,656, collective 3,514. Medium/large's regional-rent request failed transiently; its market basis uses the same quarter's complete published 1F floor table with `QUALIFIED_FIRST_FLOOR_TABLE_FALLBACK`, preserving that table's source identity. Other unavailable tables remain unavailable. No statistics are filled with zero. The stored raw snapshot is unchanged when public floor fallbacks are rederived.

These are reproducible demonstrations using committed public sources and **explicit planning inputs**, not sales forecasts or actual sites. Selling prices, unit costs, operational coverage and volumes below are assumptions. Daily flow uses the explicitly labeled quarterly-signal/91 interpretation; no front-door observation is claimed. The report records this snapshot, so later refreshes may change these historical examples.

A: Myeongdong / VEND-BEVERAGE, 4㎡, 1F, planning 1,000 transactions/month and interruption responder available. B: Gangnam station / BOOTH-SING, 8㎡, 2F, planning 10,000 paid minutes/month. C: adverse hypothetical Myeongdong site, manually entered 5m KRW monthly rent and planning 300 transactions/month. C's entry is not a signed landlord quote.

| Output | A: beverage | B: singing booth | C: adverse rent |
|---|---:|---:|---:|
| Configuration | C-VEND-USED | C-SING-STD | C-VEND-USED |
| Equipment source low/base/high (KRW) | 2,500,000/2,500,000/2,500,000 | 4,630,000/4,630,000/4,630,000 | 2,500,000/2,500,000/2,500,000 |
| Initial cash low/base/high (KRW) | 4,350,000/7,661,112/16,050,001 | 6,505,223/10,060,163/18,493,894 | 33,400,000/55,550,000/72,250,000 |
| Base recoverable deposit / cash at risk (KRW) | 2,111,112 / 5,550,000 | 2,167,163 / 7,893,000 | 50,000,000 / 5,550,000 |
| Rent low/base/high excluding management (KRW/mo) | 158,333/211,111/316,667 | 162,537/216,716/325,074 | 5,000,000/5,000,000/5,000,000 |
| Base fixed / unit contribution (KRW) | 571,111 / 910 | 576,716 / 118 | 5,360,000 / 910 |
| Break-even units/month | 628 | 4,878 | 5,891 |
| Break-even transactions/day | 20.93 | 10.87 | 196.37 |
| Required utilization | N/A | 22.58% | N/A |
| Required capture (planning denominator) | 0.0527% | 0.0604% | 0.4940% |
| Max rent with 24m recovery at entered planning volume | 318,750 | 493,625 | -318,250 |
| Conditional contribution at entered planning volume (KRW/mo) | 338,889 | 605,784 | -5,087,000 |
| Status / evidence confidence | PROMISING / LOW | WEAK / LOW | WEAK / LOW |

All shown rent planning bands are **not statistical confidence intervals**. A and B use qualified same-quarter city floor rent (1F 52.77779263 and 2F 27.08954120 thousand KRW/㎡). C uses its explicit USER_INPUT rent. B needs floor-specific host/legal/noise checks; the nearby hypothetical office building is not approval for a karaoke booth. A becomes CHECK if interruption coverage is left unverified. B is WEAK because 43 directly classified observations exceed the default 10-observation research gate. A has 0 direct classified observations, but 392 unique substitute observations (Kakao 55, official 355, matched 18); this does not prove no vending machines. B has official 43 direct/Kakao 0/matched 0; registry text does not verify each establishment’s exact short-session offering.

| A sensitivity (NOT DEMAND FORECAST) | Monthly transactions | Conditional operating contribution KRW/mo | Recovery months if positive |
|---|---:|---:|---:|
| 0.75 × break-even | 471.0 | -142,501 | Not recoverable |
| 1.00 × break-even | 628.0 | 369 | 15047.6 |
| 1.50 × break-even | 942.0 | 286,109 | 19.4 |
| 2.00 × break-even | 1,256.0 | 571,849 | 9.7 |

A required monthly transactions for 12/24/36-month cash-at-risk recovery: 1136, 882, 798. A known host/legal prohibition yields BLOCKED and is exercised in model and browser tests. Negative affordability ceilings remain negative; C cannot afford any positive rent at its entered volume/recovery horizon.
