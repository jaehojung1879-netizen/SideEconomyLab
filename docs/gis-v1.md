# Seoul opportunity GIS v1

Architecture: public/open data → GitHub Actions → sanitized JSON → static Leaflet/OpenStreetMap UI. No browser API key is required.

## Data and interpretation

- `data/seoul-opportunity-map.json`: commercial-area center points in EPSG:5181, source quarters, public demand aggregates and four candidate scores. Centers are not commercial-area boundaries or available installation sites.
- Demand-fit is a weighted sum of Seoul-wide percentile ranks (0–100). Formulas are in `research/seoul-location-screen-v1.md`. It does not estimate revenue, ROI or success probability.
- `data/kakao-poi-layer.json`: candidate → sampled areas → query statistics and sanitized public POIs. Each query captures only page 1 (up to 15 nearest results) within 800m around each of the top 15 demand areas. `total_count` is the API match count, not the number of captured POIs. Deduplicated POIs are a limited substitute/competition proxy, not a census.
- Missing source rows can contribute zero demand proxies; scores should be checked against source coverage before field decisions. Rent, revenue share, available space, conversion, utilization, capex, operating cost and site restrictions remain unmeasured.
- Partial Kakao query failures are shown in the selected-area card. Total failure preserves the previous snapshot and fails the refresh job. Error output contains exception types / HTTP codes only, never raw request or exception text.

## Refresh and deployment

`seoul-gis-refresh.yml` reuses committed demand data for ordinary UI pushes. Demand-script changes, missing demand data, schedules and manual runs refresh Seoul source history and filter each service to its latest quarter. Kakao uses four bounded workers and at most three attempts per request (transient HTTP failures only; authentication failures are not retried). Stable inputs produce stable JSON; no generated timestamps are injected. Generated-data paths do not trigger the refresh workflow, preventing commit loops. Concurrency is isolated per branch.

The existing GitHub Pages deployment builds **main /docs**. A successful production deployment cannot preview this unmerged feature branch. The verified deployment run `37165703208` builds `/github/workspace/./docs` and publishes `https://jaehojung1879-netizen.github.io/SideEconomyLab/`. The feature's `gis.html` is absent from main at the v1 handoff, so its production URL returns no PR preview until merged. Production source / visibility are unchanged.

To preview with the exact project Pages path model:

```sh
mkdir -p /tmp/gis-static
ln -s "$PWD/docs" /tmp/gis-static/SideEconomyLab
python -m http.server 8765 --directory /tmp/gis-static
# http://127.0.0.1:8765/SideEconomyLab/index.html
# http://127.0.0.1:8765/SideEconomyLab/gis.html
```

`gis-check.yml` runs credential-free pipeline regressions and real Chromium checks against that server: candidates, filters, search/empty results, demand/POI toggles, canvas markers, details, POI links, embedded dashboard, mobile layout and missing datasets. Screenshots are uploaded as workflow artifacts. It also checks real Leaflet assets / OSM tile loading. External CDNs and OSM availability are runtime dependencies.

## Next layer: observed candidate sites

Keep future observations in a separate versioned dataset, rather than modifying commercial-area centers or the demand score. Suggested record fields: `site_id`, `candidate_id`, optional `trdar_cd`, address, WGS84 latitude/longitude, host type, observed rent / revenue-share terms, visit date, notes, photo references, confidence and installability constraints. Missing terms remain unknown, not zero. Supply-adjusted rankings and pilot economics should be separate derived outputs with their own evidence and definitions. No site or financial observations are invented in v1.
