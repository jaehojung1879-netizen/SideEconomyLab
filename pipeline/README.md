# Pipeline

The LOCATION lane exports public Seoul aggregates and sanitized Kakao Local POIs for the static GIS. Credentials remain in the server-side Action environment. See `docs/gis-v1.md`.

Future code belongs here only when:
- a public dataset needs repeated refresh;
- scoring or economic calculations are repeated;
- geospatial joins become material;
- real operating data begins to accumulate.

Prefer simple, inspectable Python over infrastructure.

### Opportunity Radar v2

`opportunity_radar.py --check` re-derives the radar index and per-area details from immutable snapshots (`data/opportunity-radar/<date>-<hash>/source.json.gz`) and `config/opportunity-radar-v2.json`. Each source geography has two independent gates: **temporal** (may quarters be compared?) and **gis** (may it be joined to the 1,650-area map?). `opportunity_radar.py --domain district` collects five complete quarters of official district sales/stores with server-side `SEOUL` and fails closed (previous bundle preserved, status BLOCKED). `radar_geography_probe.py` records the official page/service/code evidence used to decide the gates. Workflow: **Opportunity Radar official collection** (manual `workflow_dispatch`, `contents: read`, artifact only; `mode=collect|probe|transport-audit`). `seoul_transport_audit.py` records that the official endpoint has no verified HTTPS (credential-free); see `docs/seoul-open-data-api.md`. See `docs/opportunity-radar-v2.md`.
