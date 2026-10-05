# Decision Intelligence v1

Click an area, choose a business variant in the top bar, and read the decision snapshot. The selected variant stays first with its full scenario. Separately, up to three location business plays compare all 13 location variants across OC-001/008/013/020 at the same area/private point. MRO and event opportunities remain outside physical-location ranking. Cards show recommendation, evidence confidence, site-cost basis, competition observability, capture evidence and the next verification. The research dashboard and Workbench remain available below.

All seven evidence labels are supported: VERIFIED, PUBLIC_SOURCE, MARKET_ESTIMATE, PLANNING_ASSUMPTION, USER_INPUT, DERIVED, UNKNOWN. Public equipment asking prices cover the equipment alone. Delivery, installation, VAT reserves, utilities and contingencies are separate editable rows. An attractive idea can still have LOW evidence confidence.

## Economics and decision rules

Each cost row has low/base/high values, source, confidence and reason. Initial cash separates nonrecoverable setup, equipment capital, working capital and deposit. Deposit is excluded from the recovery target; its return and equipment resale are not guaranteed. Missing cost values propagate rather than becoming zero. The legacy six-model economics module is reused.

Contribution = price × (1 − payment − host share − platform − shrinkage) − unit costs. Break-even = ceiling(monthly fixed cost / positive contribution). Time businesses show occupied minutes, sessions and utilization; storage shows slot-days; order/event models retain their appropriate units. The low/high economics cases pair lower costs with higher price, and higher costs with lower price. Cash ranges use only the corresponding cost bounds.

Sensitivity uses 0.75/1/1.5/2 × break-even units, explicitly **not a demand forecast**. A user may enter a separate monthly volume. Conditional operating contribution = volume × unit contribution − fixed cost. Recovery months = cash at risk / positive operating contribution. Twelve/twenty-four/thirty-six-month thresholds add cash-at-risk / horizon to fixed cost. Maximum site cost at entered volume and horizon = volume × contribution − non-site fixed − cash at risk / horizon. Negative ceilings remain negative. Monthly contribution excludes taxes, financing and an imputed owner salary.

Gates expose definition, cost completeness, site-cost basis/terms, contribution, capacity, capture, competition, owner availability, known legal blocker and evidence quality. Known blockers yield BLOCKED. Known nonpositive contribution, impossible capacity, unavailable owner coverage, excessive **eligible** capture, high recent direct competitor evidence, or failure of actual/private/host-planning cost at entered volume yield WEAK. Incomplete unrelated fields do not erase those negative conclusions. The 1% capture/10 direct observations thresholds are editable research policies, not empirical probabilities.

PROMISING requires complete definition/costs, positive contribution, feasible capacity where applicable, ACTUAL_SITE_TERMS or PRIVATE_COMPARABLES, an eligible capture pass, adequate competition observability (GOOD/PARTIAL) and a competition pass, explicitly confirmed owner availability, and no known blocker. Market rent and unsourced host models alone stay CHECK. Remaining price/operating/permission assumptions keep v1 confidence LOW even in a stronger-input PROMISING scenario. No score or purchase approval is generated.

Location alternatives use exact deterministic tie-breakers: (1) PROMISING, CHECK, WEAK, BLOCKED; (2) ACTUAL_SITE_TERMS, PRIVATE_COMPARABLES, HOST_MODEL_ESTIMATE, MARKET_RENT_BASELINE, UNKNOWN; (3) GOOD, PARTIAL, POOR, UNKNOWN observability; (4) fewer unknown site_terms/capture/competition/owner gates; (5) lower cash at risk, unknown last; (6) stable economic-model ID grouping; (7) lower required utilization only within the same TIME/STORAGE model, unknown last; (8) stable variant ID. Model ID is an ordering convention, not business quality. Unlike raw flow, break-even units or capture rates are never compared. Selected scenario remains first regardless of this ordering. PR #13's validation frontier stays separate.

## Rent and required capture

The authenticated catalog enumerates 738 statistical tables and supplies current small, medium/large, collective-retail and office contexts. Until a defensible area/submarket crosswalk is available, the external MARKET_RENT_BASELINE uses a Seoul city statistic in the selected asset class. The default is the **2026 Q2 Seoul small-retail, first-floor-equivalent market statistic**: 52.7777926305664 thousand KRW/㎡. Multiply by requested area and an explicit planning factor: first floor 0.75/1/1.5, other floors 0.4/0.65/1. These are planning bands, **not confidence intervals**. The statistic incorporates deposit conversion and excludes management/VAT; it does not identify a shop's cash asking rent. Actual entered target fixed site cost has a separate USER_INPUT / ACTUAL_SITE_TERMS basis and overrides any baseline or older rent assumption. A fractional host installation's price may differ materially from full-property statistics.

The public classification catalog proves city → market → submarket names, including 서울>도심>명동 and 서울>강남>강남대로. A tourism-area aggregate or Gangnam station center does not prove equality with those survey boundaries. Name similarity is insufficient. The resolver accepts a published explicit crosswalk or falls back to city membership. Current floor-rent/utility and deposit-conversion tables are collected with complete pagination where returned. The committed snapshot has 2,472 qualified Seoul floor cells; a failed regional table can use a qualified same-quarter published first-floor cell, explicitly labeled QUALIFIED_FIRST_FLOOR_TABLE_FALLBACK with the floor table’s source identity. An exact city/asset/quarter/floor rent cell can replace the regional point before applying the explicit planning range. Other asset classes retain a warning if their floor conversion basis is unverified. RSE/confidence metadata was not identified in the enumerated commercial tables; no statistical confidence interval is invented.

### Commercial model and site-cost basis

R_ONE calculations remain visible under **MARKET RENT BASELINE**, separate from the selected commercial model and target terms. The five bases are ACTUAL_SITE_TERMS (target quote/owner input), PRIVATE_COMPARABLES (at least five validated lease listings), HOST_MODEL_ESTIMATE (editable unsourced planning budget), MARKET_RENT_BASELINE (R_ONE × area/floor) and UNKNOWN. The city statistic is never called actual installation cost.

Defaults reflect possible occupancy arrangements rather than a universal retail lease: BOOTH-CALL/FOCUS and DOCUMENT-PRINT use MICRO_SPACE_LICENSE; BOOTH-SING uses FULL_LEASE; PHOTO variants and all vending use HOST_FIXED_FEE; LUGGAGE-HOST uses HOST_REVENUE_SHARE; LUGGAGE-LOCKER/OVERFLOW use MICRO_SPACE_LICENSE; MRO/EVENT use NO_STANDALONE_SITE. The editor offers only plausible models per variant, including explicit FULL_LEASE where appropriate and concession/revenue-share alternatives.

Absent a host quote, fixed placement budgets are 100k/300k/700k KRW; micro-space/concession budgets are 200k/500k/1m. These rounded low/base/high **planning assumptions are not observed host prices and are not derived from R_ONE**. Revenue share assumes 10/20/30% plus a separate editable additional minimum-guarantee row; fixed-fee models do not silently add share. A revenue-share quote remains HOST_MODEL_ESTIMATE until share and additional guarantee are explicitly sourced/input too. Actual target fixed cost overrides planning; other stack rows retain their own evidence.

Private host quotes and counted relevant flow are scoped to variant/site; a saved host quote is never silently copied to another family/model. Legacy shared Workbench rent is treated only as FULL_LEASE terms, with ASSUMPTION still labeled planning. Lease comparables cannot substitute for host licenses/placement fees. Space dimensions/floor are shared physical context.

### Capture evidence

Capture = required paid transactions per operating day / relevant daily flow. The default divides the chosen quarterly signal by 91 days as an **explicit editable planning interpretation**. The source's temporal grain is unverified: it may already be an average. This denominator is therefore not asserted as observed daily traffic. Its denominator is PLANNING_ASSUMPTION_TEMPORAL_GRAIN, shown as “계획용 환산 — 원자료 시간단위 미검증”; its gate is UNKNOWN and cannot create PROMISING or WEAK. Enter counted relevant daily/front-door flow to replace it: USER_INPUT enables the gate. Future trusted daily source metadata can also enable it when source identity, geography, DAILY grain and paid-opportunity unit are proven; a private “verified” toggle cannot do so. The source includes area-level modeled flows, not unique customers or guaranteed physical access. Weekday, young, daytime and after-work signals differ by customer job. Storage/contract businesses with no defensible paid-opportunity denominator display that limitation.

## Public and private data

DATA_GO authenticated collection uses `storeListInRadius`, with complete paginated 800m caches for two public centers. Smaller 200/400m bands are derived by geographic distance. Official IDs/industries, addresses and coordinates retain provenance. Variant-specific DIRECT/SUBSTITUTE/COMPLEMENTARY/CONTEXT rules use industry names and place names; no registry classification proves a specific vending machine or SKU.

Kakao remains a consumer search sample. Source matching requires an exact normalized name within 35m, or a sufficiently long contained name within 15m; ambiguous many-to-one identities remain unmatched. Counts expose MATCHED, KAKAO_ONLY and DATA_GO_ONLY and never add a matched pair twice. Coverage is complete only when the whole requested 800m circle lies inside a fresh complete target cache. Other locations remain partial/unmeasured; zero observations do not prove no competitors.

### Competition observability policy

Capabilities follow the actual catalog's industry/name rules and current official storefront/Kakao place sources:

| Variants | Capability | Observable object / limitation |
| --- | --- | --- |
| DOCUMENT-PRINT | GOOD | Copy/print storefront registry + printing-place searches; internal printers remain separate |
| BOOTH-FOCUS | PARTIAL | Named practice-room service, not every internal booth |
| BOOTH-SING | PARTIAL | Karaoke establishments; coin/short sessions/internal equipment not completely classified |
| LUGGAGE-HOST / OVERFLOW | PARTIAL | Named storage operator; private host service/large-bag capacity may be absent |
| BOOTH-CALL, PHOTO variants, all VEND variants, LUGGAGE-LOCKER | POOR | Embedded equipment is not exhaustively registered as a storefront/place |
| MRO / EVENT | UNKNOWN | Not location supply models |

Successful collection does not improve source capability. GOOD is downgraded to PARTIAL outside a fresh complete 800m circle; absent/stale observations become UNKNOWN. Zero direct observations with POOR/UNKNOWN gives an UNKNOWN competition gate, retaining “직접형 관측 0개” plus “관측성 낮음 — 경쟁 부재를 의미하지 않음”. Recent positive direct evidence can still trigger WEAK even when absence observability is poor. Raw observed totals stay unchanged; freshness is checked separately for decision evidence.

The building service successfully returned title and floor records for one nearest registered-store public hypothetical parcel per target. These are examples, not the user's site. A private site's compatibility remains unverified until its own official parcel/floor evidence is supplied. Commercial main use makes physical fit plausible; power, ventilation, fire safety, host permission and legal operation remain separate checks. No Seoul building crawl is implemented.

Automated rental listings were not collected: public access/robots checks were unavailable, and no circumvention was attempted. Enter 5–10 public asking listings through PRIVATE CSV/JSON. Required columns: `id,scope,address,area_sqm,floor,deposit,rent,management,observed_at,source_url`. Scope is the selected commercial-area code. Compare the same floor group, 0.5–2 times requested area and observations no older than 90 days. Unknown deposit/management stays null. Medians/ranges and rent per ㎡/평 are shown; IQR outliers are flagged but retained. For FULL_LEASE only, at least five eligible listings supply a PRIVATE_COMPARABLES asking-price IQR; this is not a confidence interval.

Private sites, terms, assumptions, listings, owner overrides and observed outcomes stay in browser storage. The combined JSON backup includes the existing Workbench workspace; malformed imports preserve both stores. Right-click or use the explicit map button to create a private site at an arbitrary point, then enter floor, area, rent, deposit, management, key money and host share. A corrupt stored file is preserved until valid restoration. Owner overrides and later observations never rewrite public research evidence.

## Refresh and integrity

`Refresh decision intelligence evidence` is manually dispatched, without bot-trigger loops. Exact secret names are `DATA_GO` and `R_ONE`. Missing variables fail before network access. The transport decodes a portal-encoded DATA_GO key at most once, preserves a raw `+`, forbids credential-bearing redirects, and reports code/type-only errors. Actual keys and authentication query parameters are scanned before persistence. Browser files contain only sanitized public data.

A bounded collection validates full pagination, unique IDs, coordinates, request budgets and exact source derivation before publication. Each gzip source snapshot is immutable and content-addressed; the public dataset declares its raw hash, date, operation, coverage, counts and classification version. Ordinary publication failure restores previous bytes. Upstream HEAD changes abort the generated-data commit. Metadata-only audits keep the original store retrieval date. The GIS staged refresh also validates this source bundle and preserves its immutable snapshots. Decisions/economics are recalculated from current inputs at runtime; no stored derived recommendation can become stale against newly published inputs.

PR #13 semantic selection, budgets, evidence and frontier are unchanged. PR #14's original 13 variants, 22 configurations and 13 source entries are preserved verbatim; two source-backed snack/amenity variants and two configurations are additions. Toy gacha and unspecified character/specialty goods remain excluded.

## User action still required

Both exact secrets have successfully authenticated in Actions. R-ONE’s initial ERROR-290 was resolved on the subsequent authenticated audit. No secret value was inspected or exposed. A published survey-boundary/GIS-area crosswalk, actual private-site parcel/floor records and source-backed front-door volume remain user/research work. Additional API requests are optional and listed separately.

Before a real commitment, replace planning prices/costs with matched supplier and host quotes, count front-door flow, confirm parcel/floor permissions and assign an interruption responder. The product authorizes no purchase, lease, deposit or pilot.

Current correctness revision and acceptance examples: [semantic review report](../research/decision-semantics-revision-v1.md). The [initial report](../research/decision-intelligence-completion-v1.md) is historical and predates these revised gates.
