# Business opportunity GIS workspace v2

The landing page is the GIS application, with candidate/search controls, a location navigator, map and decision panel. `gis.html` remains a project-relative legacy entry point. Prior research narration is retained in `research.html`; methodology and transaction candidates are secondary dialogs. Existing source data, scores and server-side REST collection are unchanged.

## Evidence hierarchy

- **DATA**: source aggregates, quarters and collected public Kakao search results.
- **DERIVED SIGNAL**: contributions from the unchanged candidate weights and tie-average percentile ranks, reconstructed from the committed aggregates. Rounded scores remain authoritative; rounded inputs can cause tiny explanation differences. Ranking is across all 1,650 areas, and equal rounded scores share a rank. Filters restrict exploration, not the meaning of the overall rank.
- **UNKNOWN**: site availability, rent, deposit, host share, utilization, costs and legal/site restrictions.
- **FIELD CHECK**: candidate-specific questions to test demand and executable installation conditions.

No competition-adjusted opportunity score or economics has been invented. A zero or uncollected POI sample never proves absence of competition. Missing source aggregates may contribute zero; consult source coverage before decisions.

## Kakao Maps and public browser key

Official references checked 2026-10-04:
- https://apis.map.kakao.com/web/guide/
- https://apis.map.kakao.com/web/documentation/
- https://developers.kakao.com/docs/en/kakaomap/common
- https://developers.kakao.com/docs/en/app-setting/app

The browser uses the **Kakao Maps Web JavaScript SDK** (`sdk.js`, HTTPS, `autoload=false`, then `kakao.maps.load`). Native Kakao custom overlays draw demand centers, substitute POIs and observed sites; its Circle draws the 800m research radius. All data/analysis is renderer-independent. SDK/config/domain failure or an eight-second load timeout produces the existing Leaflet/OSM fallback without losing data exploration. No undocumented Kakao tile scraping is used.

**A JavaScript app key is browser-visible by design, not a perfectly secret credential.** Never put a REST/admin/native key into the JavaScript-key slot. Key formats alone cannot prove key type. The workflow reads only the explicitly named `KAKAO_JAVASCRIPT_KEY` for public output and compares it against supplied server-only keys to reject accidental substitution. It never serializes the environment or logs credential values. Server-only comparison values are not sent to Kakao or written into artifacts.

`docs/data/map-runtime.json` is a deliberately public browser configuration, not a secrets store. Source control starts with a null key. After human merge, `browser-map-config.yml` runs **only on main**, builds the allowlisted config, commits only that JSON, and explicitly requests a build of the existing **main /docs** Pages source. This is necessary because commits made with `GITHUB_TOKEN` do not themselves trigger a Pages build. The generated browser key can be inspected by site visitors and appears in git history once published. Domain restrictions and quota controls, not obfuscation, are its protection. No production configuration is published from an unmerged PR.

GitHub references:
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://docs.github.com/en/rest/pages/pages#request-a-github-pages-build

Before using Kakao on the live site, verify the Kakao Developers app:
1. The existing secret `KAKAO_JAVASCRIPT_KEY` contains the **JavaScript** key selected under **App → Platform Key**, not another key type.
2. Register JavaScript SDK domain **https://jaehojung1879-netizen.github.io**. The `/SideEconomyLab/` path is not a separate domain. Domain allowlisting applies to the origin, including other project paths on this host; it does not isolate one repository path.
3. Enable Kakao Map API under **Kakao Map → Usage settings** and review applicable quota/billing. The API usage policy changed in July 2026, so older setup screenshots may be stale.
4. After merge, inspect **Publish browser map configuration** and the resulting Pages build. For key rotations, manually run that workflow on main. If the key is absent, a null config is published and fallback remains usable.

The agent cannot verify private Kakao console settings or JavaScript-key type through GitHub's secrets metadata. The production-origin SDK acceptance therefore remains an account/domain activation check after merge, **not a claim of live Kakao validation**. CI uses a clearly synthetic SDK contract fixture, tests denied SDK → fallback, and separately tests the real Leaflet runtime/tiles. It never needs production credentials. Source/visibility are not changed by this PR.

## Actual candidate sites

`data/site-observations.json` starts with an empty `sites` array. The optional loader tolerates absent/malformed data. `data/site-observations.schema.json` defines:

`site_id`, `candidate_id`, optional `name`, WGS84 `lat/lng`, `address`, `commercial_area_id`, `observed_at`, `status`, monthly KRW `rent`, KRW `deposit`, `area_sqm`, `host_type`, fractional `revenue_share`, `source`, `field_note`, `photo_reference`.

Only ID, supported candidate and coordinates are required to draw a pin. Missing terms stay unknown; they are never converted to zero. `commercial_area_id` links confirmed sites to a selected-area panel. Unlinked sites still draw by candidate. This public dataset must contain only observations intended for public sharing, not private host/contact/negotiation information. No real sites or photos are fabricated. Supply-adjusted ranking and pilot economics belong in separate future derived layers with their own evidence.

## Verification / preview

Serve `docs` at `/SideEconomyLab/`, using the local HTTP setup in `gis-v1.md`. The same index UI works at the project root and legacy `gis.html` entry. Both renderers share candidate/ranking/selection state. Tests cover the public-config allowlist and rejected server-key substitution, unchanged pipeline, primary GIS entry, signals/rank synchronization, markers, search, thresholds, layers, empty/optional datasets, candidate-site isolation, dialogs, and mobile sheets. Screenshot artifacts support visual QA. The feature stays Draft and unmerged until human review; production continues to serve main.
