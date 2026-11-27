# NTS local research profile v1 — 2026-11-28 KST

Official September 2026 active business file: [catalog](https://www.data.go.kr/catalog/15061118/fileData.json), published 2026-11-18. Run [46020482703](https://github.com/jaehojung1879-netizen/SideEconomyLab/actions/runs/46020482703) / artifact 15208465820. Raw CSV retrieved from that artifact into the chat environment, SHA-256 independently matched 16d341e70f123eeeed81ce635f9972a40e0a651091ee6f035700236395f12275, 1,310,324 bytes. Actual audit 24,588 rows, 100 industries. 258 region labels / 16 province labels; 1,212 combinations absent from the observed Cartesian grid (not necessarily expected records); 1,809 rows with any zero across three periods. Current zeros 1,682. Suppression caveat observed in older official detailed metadata; retain caution until current release details reconciled. Province labels include 전남광주통합특별시, and 화성시 and four subdistricts coexist. No independent boundary/coverage clearance, national total or growth rate.

## Current disclosed counts
| 업종 | 강동구 | 송파구 | 하남시 | 구리시 | 남양주시 |
|---|---:|---:|---:|---:|---:|
| 교습학원 | 672 | 922 | 573 | 306 | 1081 |
| 교습소ㆍ공부방 | 674 | 780 | 485 | 226 | 1039 |
| 예술학원 | 336 | 474 | 281 | 124 | 519 |
| 문구점 | 60 | 119 | 60 | 35 | 151 |
| 철물점 | 70 | 78 | 36 | 29 | 99 |
| 실내장식가게 | 818 | 1320 | 872 | 496 | 2077 |
| 커피음료점 | 642 | 1001 | 417 | 273 | 911 |
| 호프주점 | 157 | 198 | 63 | 100 | 155 |
| 세탁소 | 206 | 299 | 137 | 80 | 283 |
| 헬스클럽 | 149 | 297 | 103 | 57 | 178 |
| 자동차수리점 | 242 | 337 | 355 | 154 | 656 |
| 사진촬영업 | 207 | 380 | 263 | 108 | 321 |
| 독서실 | 58 | 97 | 17 | 20 | 47 |
| 통신판매업 | 7235 | 11635 | 6939 | 3446 | 17283 |
| 간판광고물업 | 94 | 136 | 148 | 60 | 251 |
| 가전제품수리점 | 198 | 198 | 178 | 183 | 692 |
| 주차장운영업 | 78 | 101 | 112 | 63 | 121 |

These are public registered active business counts, not physical shops or reachable buyers. The 17 purposive industries and five local regions are not a ranking. Do not mix NTS and Seoul service codes or compute spend per taxpayer. No aggregation of overlapping regions or categories, no imputation. No candidate approval.

## Decision use
- DF-004: compare accessible buyer segments (education or repair) and validate actual repeated purchase baskets; stationery shops are possible substitutes/suppliers, not demonstrated buyers.
- DF-008: academy and tutoring counts are distinct disclosed categories; not proof of independent multi-site companies or paid automation. Existing free competitors remain a falsifier.
- DF-009: pub/coffee counts are stock, not closures or secondhand supply; use actual disposition and resale records.
- New competitor benchmark: [Onset](https://onset.co.kr/analysis) already advertises nationwide NTS-derived shop counts, survival, startup cost and demand views. Its claims are not independent verification of our raw totals. Seoul's [commercial district service](https://golmok.seoul.go.kr/intendedOwner/intendedOwnerAnalysis.do) already offers fine-grained store and survival analysis. Do not build another generic dashboard as a commercial product.

## Reproduction
Retrieve original artifact while retained, extract snapshot.csv, from repo root run `python -m pipeline.nts_local_profile snapshot.csv`. This checks exact hash, size, counts and all 85 selected cells against the committed profile. Raw archive is not committed here; current Actions retention is finite. Standalone [research view](../docs/nts-local-profile.html) and [JSON](../docs/data/nts-local-profile-v1.json) are additive. No main deployment or existing GIS edits.

Native probe now independently replays the fixed local profile against the downloaded raw file only if SHA-256 equals the retained historical snapshot. Different snapshots are not silently compared. Result to be verified in Actions.
