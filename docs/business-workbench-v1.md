# Business Configuration & Economics Workbench v1

Open the existing [GIS](./index.html?workbench=1), choose **사업 구성·경제성**, and select a candidate family / child variant. The map and original LOCATION screening remain available. A map selection creates a **hypothetical commercial-area center**, not an identified building, rent quote or authorized site. Create a scenario from a variant, commercial structure, compatible configuration and private site. Transaction families can use site context without acquiring an invented GIS demand score.

## Public catalog and evidence

[Public JSON](./data/business-workbench.json) and its [schema](./data/business-workbench.schema.json) contain 13 child variants, 22 equipment/service configurations and 13 source references. They preserve canonical families and PR13 frontier decisions; the workbench never writes scores, evidence upgrades or pilot authorizations. A variant describes the customer job, payer, unit, equipment/service, host, direct/substitute definitions, site/cost inputs, operating constraints and legal unknowns. Commercial call/focus service and overflow hypotheses are explicitly unproven. ID-photo **file output** is distinct from ID-photo **capture**. Toy gacha, unspecified amenity/specialty goods and ID capture were investigated but excluded pending a defensible Korean product/job source; capsule **coffee** is not toy gacha.

Ten bounded public HTTPS pages were manually reviewed on 2026-10-05, using existing C2 URLs first. Curated excerpts, response SHA256, observation date and URLs are recorded under `research/workbench-source-excerpts/`; no large crawler or automatic catalog mutation is introduced. Access failures leave inherited evidence dated 2026-10-03 and STALE. The old portfolio's historical access claims remain historical; new workbench observations are separate.

Examples of distinct **LIST_PRICE**, not TOTAL_INSTALLED_COST:

- Muzone personal/home K-zone: KRW 2.65m; singing standard 4.63m, premium 5.48m, commercial MuzonePlus 8.03m. Paired comparison prices and unspecified VAT/options remain caveats. These do not establish commercial call-service suitability.
- SELPIC SM06 Station 5.5m, SM05 Dual 7.7m, SM08 Premium 9.9m: VAT included. Basic/BigPrint require a quote. Premium lists A4 support. Power voltage is known; consumption, monthly fees and service labor are unknown. Dual's card height and tabular height disagree; confirm before layout/installation.
- Chiki Compact/Original/Signature: 6m/7m/9m **from**, VAT excluded, delivery/installation and monthly software separate. These are event hardware references; v1 permits outsourced/rented event service, not an ownership authorization.
- Shinsung used open refrigerated 5-tier: 2.5m asking price; slim can/PET vending 6.6m; M500 coffee 26.4m; X500 coffee full set 19.25m. Different products, not a pooled machine price or resale recovery evidence. VAT/installed totals remain unknown.
- Service observations: SELPIC event from 0.3m/day; Chiki 1m/day VAT excluded (three named cities, delivery/setup/removal/paper/remote support described); Radical Seoul standard bag-day from 5,100. Retail service rates are not supplier net quotes or host payout. Standard bag pricing does not establish overflow pricing.

Unknown fields are null. Footprint derived from published width/depth covers only device base, excluding access/service space. Price age is evaluated in the browser; >30 days, future/invalid dates and inherited unverified evidence display STALE. There is no public refresh job that can destroy old evidence. Purchase/lease/free-placement availability describes a consultation structure, not a signed contract or zero cash requirement.

## Reverse economics

`assets/economics.js` is a pure deterministic module, with separate UNIT_SALE, TRANSACTION, TIME, STORAGE, ORDER and EVENT primitives. Only each primitive's price/cost fields enter contribution. Every input carries SOURCED (identified source), USER_INPUT or ASSUMPTION; every calculated result is DERIVED. Missing fields propagate to UNKNOWN, never zero. Explicitly enter 0 only after confirming a cost does not apply.

Let `p` be price per economic unit, `v` the sum of the model's variable costs, `f` payment rate, `h` host gross-revenue share, `F` total fixed costs, `N` explicitly entered monthly volume and `K` at-risk initial capital:

- Unit contribution `c = p × (1 − f − h) − v`.
- Monthly break-even units `ceil(F/c)`, only for `c > 0`; daily threshold divides by entered operating days. This is a threshold, not a sales prediction.
- Maximum monthly site cost (rent + management) `N × c − non_site_fixed`; maximum rent subtracts entered management fee.
- Maximum host share `min(1, [p × (1−f) − v − F/N] / p)`, for positive entered `N` and `p`. A negative ceiling means infeasible, not a free host.
- Recovery horizon units `ceil([F + K / selected_months]/c)`. `K` includes acquisition, installation, opening stock/working capital and key money. Deposit adds to cash required but is excluded from at-risk recovery capital; return is not guaranteed or assumed as profit.
- TIME uses occupied minutes, price/cost per minute, operating days × minutes/day × concurrent capacity. Average session minutes translates the threshold to transactions. STORAGE uses bag/slot days against days × storage capacity. Utilization >100% is explicitly CAPACITY_EXCEEDED.
- Only when monthly volume is entered: conditional monthly surplus `N × c − F`; at-risk capital recovery `K / surplus` for positive surplus. These are pre-tax modeled operating cash bounds, not net profit or demand forecasts. Financing, taxes and omitted costs are not automatically estimated.

All prices and costs need a consistent VAT/settlement basis. Non-site fixed cost must include applicable insurance, electricity, cleaning, software, monthly equipment rental, maintenance and fixed labor. Per-unit variable costs must include applicable host work, waste, refunds, fulfillment and service labor. No unknown quote is copied from catalog into actual terms. Share is on gross unit revenue; other contract structures require separately converting the identified contract terms.

Sensitivity tables explicitly mark daily 10/20/30/40 **economic units** and 0/10/20/30% host shares as ASSUMPTION; TIME's unit is an occupied minute. Entered-rent ×0.8/1/1.2 sensitivity and the site-cost ceiling are shown; missing rent stays UNKNOWN. Owner workload is an entered assumption displayed separately, not an opaque score.

Synthetic arithmetic examples (all ASSUMPTION, no business recommendation): selling at 2,000, purchase 800, fulfillment 100, payment 3%, host 10% gives 840/unit; 1m monthly fixed requires 1,191 units/month or 39.7/day at 30 days. At an explicitly entered 2,000/month and 300k non-site fixed plus 100k management, max rent is 1.28m. For 6m at-risk capital over 12 months the threshold is 1,786/month. A booth at 20/min with 5/min variable and 1m fixed requires 66,667 occupied minutes; one 600-minute/day booth ×30 days provides 18,000 minutes, so the configuration is infeasible at those assumptions.

## Private workspace

Sites and scenarios are stored exclusively under the `SideEconomyLab.business-workbench.v1` localStorage key. No account or backend exists. There are no write requests, URL parameters containing site terms, analytics calls or Git files generated from private records. Terms, names, address, coordinates, floor, area, contract period, source/date, notes, analyst judgment/confidence/rationale/key observation/change evidence stay local. All start UNKNOWN, and sites start HYPOTHETICAL.

Sites are shared by reference across scenarios: edit a site to hold terms constant for variant comparisons, or clone the site to compare different terms. Scenario cloning copies model inputs/judgment independently while preserving the selected site. Changing the draft variant creates a new scenario rather than silently reusing an incompatible model's inputs. Compare 2–4 scenarios without sorting/ranking: variant/site/configuration/structure, cash, fixed/unit costs, break-even, utilization, site-cost ceiling, workload, competition, input completeness and separate human judgment.

Export PRIVATE JSON for backup; importing **replaces** the browser workspace after strict version, size, reference, numeric, provenance and judgment validation. Failed import or quota errors preserve the prior saved state. A corrupt saved state is preserved and exportable; mutations are blocked until a valid restore. Changing browser/profile, clearing storage or private browsing can lose local records. localStorage is plaintext and accessible to other scripts on the same origin: use a trusted personal browser. Exported JSON is private and must not be committed or shared unintentionally. Explicit save buttons persist edits; switching sections does not save unfinished inputs.

## Competition and future source

Existing Kakao raw POIs are unchanged. The workbench unions public sampled records, deduplicates provider IDs, remeasures WGS84 straight-line distance to the private site's coordinates and applies each variant's explicit name/category rules. Counts, nearest distance and identifiable observations appear separately for DIRECT, SUBSTITUTE, CONTEXT within 200/400/800m. These roles are **service-match proxies**, not verified operating competitors. Convenience stores substitute beverage/coffee sales; coworking substitutes calls, without proving a sellable booth.

Every band states whether a collected 800m circle covers it and whether query errors/result caps exist. Counts are observed lower bounds, never a census; no sample/coordinates produces UNKNOWN. Off-center 800m coverage usually requires another circle and remains outside-sample. Query bias, 15-result caps, missing/closed places, stale observation date and unverified on-site service remain limitations. There is no new API call or secret.

Official [SEMAS store API](https://www.data.go.kr/data/15012005/openapi.do) metadata was checked: nationwide REST JSON/XML, radius/area queries, store IDs, names, industry classes, addresses and coordinates; portal labels cost free and update realtime. Access requires a service key/application, which was not supplied, added or used. Future integration must version the source, preserve observations on failure, reconcile duplicates and verify service matches; broad industry codes do not prove phone-booth or SKU supply.

## Verification and preservation

Run `node tests/workbench-models.cjs`, Python discovery, both JSON schemas/portfolio checks, and Playwright `tests/workbench-browser.cjs` at project Pages prefix. New **Verify business workbench** checks catalog, arithmetic, privacy persistence/import, scenario isolation/comparison and mobile. Existing GIS and portfolio checks remain required; GIS/context refresh logic is unchanged.

Starting main: `db730a2c7afa3365e8905a0be39c9e37fc9fd2d2`, after PR13 and validated GIS refresh. The portfolio update changes only checksums for the intentional GIS UI/entry-point additions; decisions, budgets, experiments, evidence, readiness, supply data and context are unchanged. `research/workbench-preservation-v1.json` records unchanged-file hashes and semantic state independently of those UI checksums. No Kakao key/account/domain, repository visibility or map-provider architecture changes.
