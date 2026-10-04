# Opportunity intelligence GIS v3

## Separate evidence, not a profit score

Demand remains the existing 0–100 percentile-weighted score. Supply is a Kakao search observation. Site economics, operability and validation remain separate; null rent/deposit/share/space stays UNKNOWN. No overall opportunity/ROI score exists. A defensible economic ranking would need confirmed installable sites, host terms/quotes, direct-competitor verification, conversion/utilization observations, servicing costs and paid/pilot evidence, with a preregistered decision rule.

## Collection and budget

Official constraints checked 2026-10-04:
- https://developers.kakao.com/docs/en/getting-started/quota
- https://developers.kakao.com/docs/en/kakaomap/rest-api
- https://developers.kakao.com/docs/en/kakaomap/common

The published daily free limit is 100,000 requests for each keyword/category search API, but free Map quota applies only to the first activated app per developer account. Additional keyword/category usage is listed at KRW 2/request. This repository cannot verify private app eligibility, consumed quota or billing; these are not a promise of zero cost. No billing/account setting is changed.

Default design per candidate: demand top 40 plus up to 20 distinct areas with score **65 ≤ score < 85**, selecting highest remaining demand within districts in deterministic sorted-district round-robin order. This is a purposive research sample, not representative Seoul sampling. Selection is invariant to input record ordering. Four candidates × 60 areas × 3 queries = **720 first-page requests**, up to **2,160 HTTP attempts** including three-attempt transient retries. At the published additional-use unit price these correspond to KRW 1,440 / 4,320 scenarios, not a billing forecast. A hard request budget prevents uncontrolled expansion. Four workers, 15-second timeout, bounded backoff, no browser REST calls. Same three search definitions as v1; no pagination or extra account permissions added.

Queries use distance order and an 800m commercial-area **center** radius, returning up to 15 POIs per query. Deduplicate within an area by place ID and preserve merged query labels, raw records, total/pageable counts, returned count and truncation flags. API total counts are search counts, not a deduplicated establishment census. Different areas can share the same POI; do not sum area counts into unique Seoul establishments. A successful complete refresh records its UTC collection date. Legacy v1 data has no date and the UI says so rather than inventing one.

**Any query failure or malformed result preserves the entire old POI snapshot.** Complete means all planned requests succeeded, not that all real establishments were found. Derived JSON is rebuilt from the exact raw snapshot, demand snapshot and registry; SHA-256 links reject stale/mixed derived evidence in the browser. Generated data alone cannot retrigger the refresh workflow. Ordinary pushes reuse the demand snapshot; scheduled/manual runs rebuild source demand. A deliberate weight/feature change needs justification, tests and an explicit source refresh; this refactor keeps the v1 weights exactly.

## Candidate-specific relevance

The canonical `data/candidate-registry.json` contains exact queries, simple case-insensitive name/category substring rules, risk notes and field checks. **A query hit alone never establishes relevance.** Rules classify `direct_proxy`, `substitute_proxy`, or `context`; direct proxy is a service-format signal, not verified same-product competition. Direct rules take precedence. Unknown/context results remain in raw observations and are excluded from relevant counts. Rule attribution is inspectable in derived `classified_pois`.

| Candidate | Direct competition proxy | Substitute proxy | Context / principal risk |
|---|---|---|---|
| OC-001 booth | Explicit phone/work/soundproof booth names | Shared offices, study rooms/cafés, meeting/space rental | General cafés/keyword names; shared space does not prove booth stock or availability |
| OC-013 photo/document | Photo booths, explicit unmanned/self-photo formats and named booth chains | Photo studios, printing/copy/output services | Photo and document tasks differ; studios/industrial printers may not be usable walk-in substitutes |
| OC-020 specialty vending | Explicit vending/unmanned shop formats | Convenience stores | Product is undefined, so same-product competition is unverified; unrelated retailers remain context |
| OC-008 luggage | Explicit baggage/luggage/locker service names, T-Locker/T-Luggage formats | Ambiguous locker/storage-place formats | Self-storage/moving warehouses may be long-term context; station-internal stock, hours and large-bag capacity can be missing |

False positives: ambiguous brands/categories, format rather than product matches, unavailable services, closed/duplicate listings. False negatives: naming variants, missing businesses, station-internal facilities, host-based supply, result cap and registry rule omissions. Manual verification remains necessary; alter rules in the registry with evidence rather than adjusting them to favor a candidate.

## Metrics and quadrants

For completely comparable query definitions/radius and valid observations, derive unique relevant count = direct proxy + substitute proxy; separate role counts; nearest observed relevant distance; cumulative counts within 200/400/800m; contextual count; query errors and truncation. Missing/error/incompatible evidence produces **null**, never zero. An observed zero has status MEASURED, whereas an absent area has UNMEASURED. Partial rows cannot enter comparison. The distance bands use the collected API distance, not walking time or catchment polygons.

High demand: existing score **≥ 90**. Lower observed supply: relevant count **≤ the same candidate's measured-sample median**; higher: > median. Require at least 10 comparable measured areas and a nonconstant count distribution. The reference includes capped samples and is a benchmark of collected observations only. It is not citywide supply, a probability or rent-adjusted performance. Recomputed reference values may change after a refresh and are shown with their sample size.

| Quadrant | Research meaning |
|---|---|
| A | High demand / lower observed supply: priority whitespace **research**, not best/profitable |
| B | High demand / higher observed supply: investigate incumbent saturation, differentiation or demand clustering |
| C | Demand below 90 / lower observed supply: exploratory whitespace research; sampled moderate areas are 65–85 |
| D | Demand below 90 / higher observed supply: check specialization or decline; no automatic rejection |
| E | Unmeasured, partial, incompatible/stale analysis, insufficient/invariant reference, or capped results that cannot establish lower observed supply |

Conservative cap rule: a capped sample at/below the median stays **E**, never A/C. A capped sample above the median can show B/D because the collected lower bound already exceeds the reference. This can leave many apparently low-supply places pending; complete pagination/manual census is a later explicitly budgeted study, not an invented zero.

## Workspace and extension

Map modes: demand, observed supply, quadrant. The navigator keeps the **global demand rank** visible regardless of sort; separate supply sorting and A/C research shortlists do not produce an overall opportunity rank. Filters include district, score, measured status and quadrant. C/D/whitespace shortcuts expose lower scores without changing score calculations. Selected analysis shows source data, derived signals, supply coverage, unknown economics/operability, validation and actionable next checks. Only the selected area's raw POIs are drawn, avoiding hundreds of competing POI layers. Context markers are gray and their raw links remain accessible.

The existing Kakao/Leaflet map adapter, public JavaScript-key configuration, secret isolation and account setup remain unchanged in architecture. Production still serves main/docs; an unmerged Draft is verified at `/SideEconomyLab/` through static HTTP and real browser CI.

`candidate-registry.json` is shared by the UI, Seoul score generation, REST query collection and supply derivation. A future LOCATION candidate defines key/id/label/lane, weights over available source features, metric fields, competition queries/rules, checks, next actions and research status. The app needs no new hardcoded selector/branches. Publish a refreshed demand score column and explicitly revisit request budget, relevance evidence and the supported-ID enum in the existing site schema. New underlying source features still require a legitimate data integration; configuration cannot invent them. The three TRANSACTION candidates stay in the compact overall stage view, without map pins or claims of completed paid milestones.

The existing optional site schema is preserved. A confirmed site links `commercial_area_id` to area analysis; unlinked sites remain candidate pins. Panel terms show observed date/source, host, share, rent/deposit, area and notes. Null remains unknown. Area → actual site → field visit → quote → paid/pilot evidence is the next collection sequence; no site, rent, paid event or pilot is fabricated here.

## Validated committed coverage (2026-10-04 UTC)

Complete live refresh: 720 planned requests, 720 actual HTTP attempts, zero query errors. Each candidate has 60 measured areas (40 top-demand + 20 moderate); 240 candidate–area observations cover **131 distinct commercial areas**. Each candidate still has 1,590 unmeasured areas. These are coverage counts, not competitors or site/pilot evidence.

| Candidate | Measured | Reference median relevant POIs | A | B | C | D | E/pending |
|---|---:|---:|---:|---:|---:|---:|---:|
| OC-001 | 60 | 23.5 | 7 | 26 | 8 | 4 | 15 |
| OC-013 | 60 | 30.0 | 1 | 23 | 7 | 6 | 23 |
| OC-020 | 60 | 15.0 | 0 | 12 | 0 | 3 | 45 |
| OC-008 | 60 | 2.0 | 1 | 5 | 31 | 23 | 0 |

The zero A/C counts for specialty vending are an honest consequence of result caps, not a finding that no whitespace exists. Define the specialty product and verify convenience-store/unmanned-shop substitution before expanding pagination or changing relevance rules. Table values describe this committed snapshot and must be recomputed after a refresh.
