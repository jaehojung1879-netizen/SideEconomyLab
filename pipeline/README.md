# Pipeline

The LOCATION lane exports public Seoul aggregates and sanitized Kakao Local POIs for the static GIS. Credentials remain in the server-side Action environment. See `docs/gis-v1.md`.

Future code belongs here only when:
- a public dataset needs repeated refresh;
- scoring or economic calculations are repeated;
- geospatial joins become material;
- real operating data begins to accumulate.

Prefer simple, inspectable Python over infrastructure.

### Opportunity Radar v1

`opportunity_radar.py --check` verifies the exact immutable source snapshot, lightweight index and per-entity details. `Seoul Open Data API smoke` with `radar_history=true` collects five common quarters using server-side `SEOUL`, emits artifacts only, and preserves prior data on any failure. Sales supports quarter filtering only, so bounded city pages are inspected once and only two configured source IDs are retained. Unknown geography keeps signals disabled. See `docs/opportunity-radar-v1.md`.
