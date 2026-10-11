# Seoul Open Data API foundation v1

## Purpose

Validate that the repository secret `SEOUL` can authenticate against Seoul Open Data and establish the smallest reusable API client.

This is intentionally a smoke test, not a Seoul opportunity model.

## First service

`VwsmSignguWrcPopltnW`

Seoul Commercial District Analysis Service — workplace population by district.

The smoke test requests only rows 1-5.

## Security

- API key lives only in the GitHub repository secret `SEOUL`.
- The script never prints the key.
- The script never prints the full request URL because the key is embedded in the URL path.
- The uploaded artifact contains only response metadata and the five public-data rows.
- No secret value is committed to the repository.

## 전송 보안 — 검증된 HTTPS 없음 (2026-10-11 감사)

**결론: 서울 열린데이터광장 Open API(`openapi.seoul.go.kr`)는 검증된 HTTPS를 제공하지 않습니다. 인증키가 URL 경로에 들어가므로, 이 저장소의 모든 호출에서 키는 GitHub 러너에서 서울시 서버까지 암호화되지 않은 채 이동합니다.** 이 한계는 해결하지 못했고 "안전하다"고 주장하지 않습니다.

| 관측 (GitHub 러너, 공개 `sample` 키 · 실제 키 미사용) | 결과 |
|---|---|
| 대조군 `https://data.seoul.go.kr` | TLS 1.3, `*.seoul.go.kr` 인증서(GlobalSign, 2026-12-19까지) **검증 성공** — 러너는 TLS를 검증할 수 있음 |
| `https://openapi.seoul.go.kr:8088` | TCP는 열려 있으나 TLS 협상이 `WRONG_VERSION_NUMBER`로 실패 — 이 포트는 평문 HTTP로만 응답 |
| `https://openapi.seoul.go.kr:443` | TCP 연결 시간 초과(닫혀 있거나 차단, 둘을 구별하지 못함) |
| `http://openapi.seoul.go.kr:80` | TCP 연결 시간 초과 |
| `http://openapi.seoul.go.kr:8088` | 200, `INFO-000` — 유일하게 동작하는 경로 |

[기록](../research/opportunity-radar-v2/transport-audit.json) · [실행](https://github.com/jaehojung1879-netizen/SideEconomyLab/actions/runs/38106459789). 재현: `python pipeline/seoul_transport_audit.py` 또는 **Opportunity Radar official collection** 워크플로의 `transport-audit` 모드. 감사는 공개 `sample` 키만 쓰고 인증서 검증을 끄지 않으며, 환경 변수를 읽지 않습니다.

### 이 저장소의 사용처

| 파일 | 전송 | 비고 |
|---|---|---|
| `pipeline/opportunity_radar.py` (기회 탐색) | 평문 HTTP 8088만 | 다른 주소·스킴으로 바꾸지 않음, 리다이렉트 거부, 실행 시 경고 출력 |
| `pipeline/radar_geography_probe.py` | 평문 HTTP 8088만 | 같은 상수 사용, 실행 시 경고 출력 |
| `pipeline/seoul_open_data_smoke.py` | HTTPS 시도 후 HTTP | HTTPS 시도는 항상 실패함. 이전에는 조용히 HTTP로 내려갔고, 이제 경고를 stderr에 남김(동작은 동일) |
| `pipeline/seoul_location_screen.py`, `seoul_location_probe.py` (기존 GIS 수요 수집) | 평문 HTTP 8088만 | **이번 PR에서 변경하지 않음**(GIS 갱신 파이프라인 보존). 같은 한계가 적용됨 |

### 현재 적용된 완화 (코드로 시험함)

- 키는 GitHub 저장소 비밀값 `SEOUL`에만 있고 Actions 러너에서만 사용합니다. 수집 워크플로는 **수동 실행 전용**, `contents: read`, 결과는 artifact로만 올립니다.
- 기회 탐색 수집기와 조사 도구는 호출 URL·예외 문자열·응답 메시지를 출력하지 않습니다. 응답에 키가 되돌아오면 저장 전에 거부합니다(`CREDENTIAL_LEAK_REJECTED`). 오류 코드는 `HTTP_403` 같은 공개 코드뿐입니다. (기존 smoke 스크립트는 API가 돌려준 오류 메시지를 그대로 출력하므로 이 보장이 적용되지 않습니다. 변경하지 않았습니다.)
- 호스트·포트를 고정하고 리다이렉트를 따라가지 않으며, 연결 실패 시 다른 주소로 재시도하지 않습니다.
- 평문 전송은 실행마다 경고(`::warning`)로 드러납니다. 조용히 내려가지 않습니다.
- 위 동작은 합성 키(특수문자 포함, 인코딩된 형태까지)로 시험하며 실제 키는 시험·산출물·로그에 쓰이지 않습니다.

### 남은 위험과 실무적 대응 (저장소 소유자 몫, 이번 PR에서 변경하지 않음)

- **키 노출 가능 구간은 러너 → 서울시 서버의 인터넷 경로입니다.** 서울 열린데이터광장이 공개데이터 조회용으로 발급하는 키이지만, 이 키의 권한 범위와 호출 한도는 이 저장소에서 확인하지 못했습니다. 노출이 의심되면 즉시 폐기·재발급하고 `SEOUL` 비밀값을 교체하세요. 정기 교체도 권합니다.
- 키를 환경(Environment) 비밀값으로 옮기고 필수 검토자를 두면 실행 주체와 범위를 더 좁힐 수 있습니다.
- 로컬 PC·공용망에서는 실제 키로 실행하지 마세요. 키는 Actions에서만 쓰는 것이 전제입니다.
- 서울 열린데이터광장(문의하기)에 HTTPS 지원을 요청하고, 지원되면 `API_ENDPOINT`만 바꾼 뒤 감사를 다시 실행하세요.
- 일부 데이터셋(상권·행정동)은 HTTPS 파일 다운로드가 있으나, 자치구 추정매출·점포는 2026-10-10 조사 시 파일이 없었습니다. 파일로 대체하는 것은 이번 PR에서 구현하지 않았습니다.
- 관측은 GitHub 러너에서 하루(2026-10-11)에 두 번 한 것입니다. 제공기관이 이후 HTTPS를 열 수 있으므로 감사를 다시 실행해 확인해야 합니다.

## Usage in GitHub Actions

The workflow `.github/workflows/seoul-open-data-smoke.yml` runs on pushes to the dedicated data branch and can also be run manually after merge. Opportunity Radar collection uses its own manual workflow, `.github/workflows/opportunity-radar-collect.yml` (artifact only; see `docs/opportunity-radar-v2.md`).

## Why this dataset

Workplace population is a useful future feature for opportunity models aimed at office-worker demand, but this test does **not** claim that workplace population predicts business success.

## Future data candidates

Only after Korea feasibility screening narrows the opportunity set:

- workplace population
- floating / street-level population
- estimated sales
- store count / opening / closure
- attractor facilities
- commercial-district polygons
- residential population
- apartment / household features

We should add only the datasets that correspond to actual candidate demand hypotheses.
