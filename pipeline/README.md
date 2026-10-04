# Pipeline

The LOCATION lane exports public Seoul aggregates and sanitized Kakao Local POIs for the static GIS. Credentials remain in the server-side Action environment. See `docs/gis-v1.md`.

Future code belongs here only when:
- a public dataset needs repeated refresh;
- scoring or economic calculations are repeated;
- geospatial joins become material;
- real operating data begins to accumulate.

Prefer simple, inspectable Python over infrastructure.
