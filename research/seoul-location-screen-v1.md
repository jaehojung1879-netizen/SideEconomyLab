# Seoul Location Screen v1

Date: 2026-10-03

## Decision question

For the four LOCATION-lane candidates, which Seoul commercial areas deserve the next unit of manual supply / rent / host validation?

This is a **demand-fit screen**, not a site-selection model and not an ROI forecast.

Candidates:
- OC-013 instant photo / document printing kiosk
- OC-020 specialty vending route
- OC-008 host-based luggage storage
- OC-001 public / office private booth

## Official Seoul sources

### Commercial-area master
Service: `TbgisTrdarRelm`

https://data.seoul.go.kr/dataList/OA-15560/A/1/datasetView.do

Provides commercial-area code/name, district, administrative dong and EPSG:5181 coordinates.

### Workplace population
Service: `VwsmTrdarWrcPopltnQq`

https://data.seoul.go.kr/dataList/OA-15569/A/1/datasetView.do

Key field: `TOT_WRC_POPLTN_CO`.

### Street-level / floating population
Service: `VwsmTrdarFlpopQq`

https://data.seoul.go.kr/dataList/OA-15568/A/1/datasetView.do

Key fields include total flow, age bands, time bands and weekday flow.

### Attractor facilities
Service: `VwsmTrdarFcltyQq`

https://data.seoul.go.kr/dataList/OA-15580/A/1/datasetView.do

Key fields include accommodation, subway, rail, bus, bank, public office, university, theater and department-store counts.

## Critical data rule

Do **not** trust the optional quarter path parameter as the only filter.

A live v1 run showed that multiple historical quarters could still be returned and silently summed if the client aggregated by commercial-area code.

The pipeline therefore:
1. downloads the complete service history;
2. derives the maximum observed `STDR_YYQU_CD` independently for each service;
3. filters rows client-side to that exact quarter;
4. only then aggregates by `TRDAR_CD`.

This is slower but auditable and prevents cross-quarter double counting.

The source quarters are intentionally allowed to differ because the datasets have different update cadences.

## Candidate demand-fit formulas

All components are percentile ranks across Seoul commercial areas.

### OC-013 photo / document kiosk
- total flow 35%
- age 20-40 flow 25%
- subway 15%
- attractor facilities 15%
- 17-21 flow 10%

### OC-020 specialty vending
- workplace population 30%
- total flow 25%
- 11-17 flow 20%
- attractor facilities 15%
- subway 10%

### OC-008 luggage storage
- accommodation facilities 30%
- subway 20%
- rail 15%
- total flow 25%
- attractor facilities 10%

### OC-001 office / private booth
- workplace population 40%
- weekday flow 20%
- 11-17 flow 15%
- subway 10%
- banks 5%
- public offices 5%
- attractor facilities 5%

## What the score means

A score near 100 means the area is near the top of Seoul on the weighted **demand proxies** selected for that candidate.

It does **not** mean:
- 100% probability of success;
- high profit;
- cheap rent;
- low competition;
- available host space;
- legal permission;
- actual customer willingness to pay.

## Next gate

The top 30 per candidate must be supply-adjusted.

For each candidate, inspect:
- direct incumbent locations;
- host availability;
- rent or revenue-share requirement;
- exact micro-location / pedestrian path;
- equipment placement feasibility;
- competitor pricing;
- practical visit / refill / maintenance route.

The desired output is not “the busiest place in Seoul.” It is:

> high demand proxy + tolerable competition + executable host economics + low owner interruption.


## Live corrected run

Validated GitHub Actions run: `37110955356`

After client-side quarter filtering:
- workplace population latest quarter: `20262` — 1,641 rows
- floating population latest quarter: `20262` — 1,648 rows
- attractor facilities latest quarter: `20262` — 1,578 rows
- joined commercial areas: 1,650

The corrected absolute values are plausible. For example, the Myeongdong/Namdaemun tourism district has roughly 199.7k workplace population, 7.37m flow and 3 subway stations in the source snapshot — not the multi-million workplace / dozens-of-stations values produced by the earlier cross-quarter aggregation bug.

The corrected ranking remains similar to the initial run because the historical duplication affected many areas proportionally, but only the corrected run is decision-relevant.

## Corrected top demand-fit areas

### OC-013 photo / document kiosk
1. Jongno/Cheonggye tourism district
2. Myeongdong/Namdaemun/Bukchang/Dadong/Mugyo tourism district
3. Gangnam Station
4. Jongno 3-ga Station
5. Jamsil tourism district
6. Seolleung Station
7. Nowon Station
8. Hongik University Station
9. Sinchon Station
10. Seoul Nat'l Univ. of Education / court-prosecutors area

### OC-020 specialty vending
1. Myeongdong/Namdaemun/Bukchang/Dadong/Mugyo tourism district
2. Jongno/Cheonggye tourism district
3. Gangnam Station
4. Jamsil tourism district
5. Seolleung Station
6. Jongno 3-ga Station
7. Seoul Nat'l Univ. of Education / court-prosecutors area
8. Yeoksam Station
9. Dongdaemun History & Culture Park Station
10. Dongdaemun Fashion Town tourism district

### OC-008 luggage storage
1. Jongno/Cheonggye tourism district
2. Myeongdong/Namdaemun/Bukchang/Dadong/Mugyo tourism district
3. Jongno 3-ga Station
4. Dongdaemun History & Culture Park Station
5. Sinchon Station
6. Isu / Chongshin Univ. Station
7. Jonggak Station
8. Sillim Station
9. Dongdaemun Fashion Town tourism district
10. Euljiro 3-ga Station

### OC-001 office / private booth
1. Myeongdong/Namdaemun/Bukchang/Dadong/Mugyo tourism district
2. Gangnam Station
3. Jongno/Cheonggye tourism district
4. Jamsil tourism district
5. Jongno 3-ga Station
6. Yeoksam Station
7. Dongdaemun Fashion Town tourism district
8. Seolleung Station
9. Dongdaemun History & Culture Park Station
10. Sinnonhyeon Station

## First supply-side falsification: generic luggage storage

Demand-fit alone overstates OC-008.

Seoul's own 2025 public information states that T-Locker smart storage was already installed at 269 subway stations, 332 locations and 5,511 compartments. T-Luggage was also operating at major tourist stations including Seoul Station, Hongik Univ., Jamsil, Myeongdong, Gimpo Airport and Jongno 3-ga.

Source:
https://mediahub.seoul.go.kr/archives/2013639

The official Seoul transportation page also lists T-Luggage at major stations:
https://english.seoul.go.kr/service/movement/public-transportation/subway-storage-facilities/

Implication:
- do **not** interpret a high luggage demand-fit score as whitespace;
- generic locker/storage near major subway stations should be downgraded;
- OC-008 survives only if a narrower gap exists: oversize/group luggage, hotel/host overflow, 24h edge cases, delivery integration, or a host-based model with near-zero fixed cost.

## Research implication

The screen successfully identifies **demand concentration**, but the most obvious top areas are often precisely where competition and occupancy cost are strongest.

The next useful object is therefore a `supply-adjusted shortlist`, not another demand model.

Priority questions:
1. Which high-demand areas have weak direct supply for the exact candidate?
2. Can the asset be placed inside an existing host rather than leased?
3. What revenue share or rent does the host require?
4. Can we find a second-tier area with 90th+ percentile demand but materially cheaper / less crowded supply?
