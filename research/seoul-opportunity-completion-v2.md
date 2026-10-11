# 기회 탐색 v2 완료 기록 — 검증된 시장 변화

## 시작점과 v1 병합 확인

PR [#16](https://github.com/jaehojung1879-netizen/SideEconomyLab/pull/16)은 실제로 병합됐습니다(`merged: true`, 2026-10-09 23:43 UTC, 병합 커밋 `f30db21`). 원격 `main`은 그 뒤 자동 GIS 데이터 갱신 `e7c0b748fc2574026b1e55800de3028e935ee0d0`로 이동했고, 이 PR은 그 커밋에서 시작합니다. 인계 문서의 `a1372273…`은 병합 전 기준이었습니다.

## 사용자가 경험하는 변화

기회 탐색 첫 화면에서 **지역 · 업종 · 비교 기간**을 고르면 추정 소비와 점포 수의 변화, 차트, 조사할 발견이 바로 나옵니다. 기본 화면은 기준 분기 소비가 가장 큰 업종(한식음식점)의 25개 자치구 비교입니다. 발견을 누르면 해당 시장으로 이동하고, 상세에서 분기별 원값과 공식 근거 링크를 봅니다. 기회 탐색 → 지역 분석 → 사업성 검토 → 검증 현황 흐름, 지도·후보·경제성·개인 저장본은 그대로입니다.

## 두 지리 질문 — 독립 판단

| 출처 | ① 분기 비교 | ② 기존 지도 연결 |
|---|---|---|
| 자치구 (OA-22176 / OA-22173) | **통과** | 미통과 |
| 상권 표본 (OA-15572 / OA-15577) | 미통과 | 미통과 |

- ① 자치구 근거: 공식 정의·표준단위구역 공지, 22개 분기 동안 자치구 25개 코드·이름과 업종 코드·이름 불변, 하위 행정동 425곳 코드·이름이 비교 기간 내내 동일. 한계: 행정표준코드 API 403으로 경계 변경 이력은 조회하지 못함.
- ① 상권 미통과: 분기별 영역 버전·재계산 근거 없음. 5개 분기 모두 나타나는 코드 1,555개로 구성이 달라짐.
- ② 상권 지도: 기존 1,650개가 공식 영역 목록과 **코드·중심 좌표(EPSG:5181)·이름이 모두 일치**함을 확인했지만 도형·영역 버전·분기별 대응이 없어 연결하지 않음. 자치구 경계 도형은 이번에 수집하지 않아 지도 레이어는 비활성.
- 강제 방식: 파이프라인 `--check`는 ①이 닫힌 출처에 변화값이 있거나 ②가 닫힌 출처에 지도 연결값이 있으면 실패하고, 브라우저도 같은 조건에서 자료를 거부합니다. 단위 시험과 브라우저 변조 시험으로 확인했습니다.

[근거와 계산 규칙](../docs/opportunity-radar-v2.md) · [조사 기록(JSON)](opportunity-radar-v2/geography-probe.json)

## 수집한 실제 자료

GitHub Actions run [38022005175](https://github.com/jaehojung1879-netizen/SideEconomyLab/actions/runs/38022005175), 스냅샷 `2026-10-10-9288cbd4d5f2`, 89회 요청, 기존 `SEOUL` 서버 비밀값.

- 추정매출-자치구: 전체 이력 33,803행·34페이지 검사 후 2025Q2~2026Q2 보존 7,667행(25개 구, 63개 업종).
- 점포-자치구: 54,765행·55페이지 검사 후 보존 12,474행(25개 구, 100개 업종).
- 중복 0, 점포 항등식 통과, 코드↔이름 불변 확인. 불변 gzip 스냅샷과 결정적 파생을 `--check`가 바이트 단위로 재현합니다.
- 자치구 API는 분기 인자를 무시합니다(조사에서 확인). 첫 수집 시도는 분기별 행 예산을 넘어 **아무것도 게시하지 않고 실패**했습니다(run [38020401407](https://github.com/jaehojung1879-netizen/SideEconomyLab/actions/runs/38020401407)). 전체 이력 1회 읽기로 고쳤습니다.
- 행정동·상권배후지·250m·관광·행사·부동산·이동 자료는 수집하지 않았습니다. 행정동은 식별자 안정성만 조사했습니다.

## 활성화한 신호와 결과

활성: 전년 동분기 변화율·절대 변화·기준/현재값, 분기 개업·폐업·순개업, 4개 분기 방향 지속, 소비·점포 4개 패턴. 비활성: 인구·활동, 매출 전망, 수익성, 종합 점수. 기준값 0·관측 없음 = 미확인, 관문 미통과 = 보류.

비교 가능 2,497개 중 **조사할 발견 945건**(급변 38건 포함, 맨 아래 정렬·별도 표시). 참고로 조합별 1년 변화율의 중앙값은 소비 +0.45%(1,531개 조합), 점포 −1.6%(2,493개 조합)이며, 이는 서울 전체 소비·점포의 증가율이 아니라 자치구×업종 조합별 변화율의 가운데 값입니다. 사례 3건과 해석 한계는 [방법 문서](../docs/opportunity-radar-v2.md)에 있습니다.

## 검증

- Python 66개(기존 + radar 16개) 통과: 관문 독립, 성장 규칙, 4개 패턴·밴드, 규모·급변, 개폐업 흐름, 식별 변경·오래됨, 스키마·단위·계약·허위 자료 거부, 전체 이력 수집·페이지·중복, 불변 스냅샷·실패 보존.
- `radar-models.cjs`: 브라우저 계산이 파이프라인 값 **9,988건**과 일치(반올림 규칙 포함), 억원/만원 표기, 지수 계산.
- 브라우저 `radar-browser.cjs`(실제 번들): 순위·카드 수치 일치, 차트 점·툴팁·원값 표 일치(지수 − 100 = 전년 동분기 변화율), 정렬이 단일 지표임, 기간 전환, 상권 관문 차단 시 추세선 없음, 사업성 검토 이동 시 지도 선택·후보 유지·저장 0건, 1440/1024/390px 넘침 없음, 모바일 전환·복귀, 수집 실패·오래된 자료·상세 해시 불일치·네트워크 실패·변조 자료 거부, 쓰기 요청 0건.
- 로컬 통과: 사업 구성·의사결정·검증 현황 브라우저 검사, 의사결정 모델, 경제성·개인 저장 13개 그룹, 부동산 맥락, GIS 의존성, 판단 증거, 후보 검증 포트폴리오 검사. **기존 GIS 브라우저 검사(`gis-browser.cjs`)는 이 샌드박스에서 외부 지도 타일·CDN 접근이 막혀 변경 전 트리에서도 시간 초과**가 나 로컬에서는 확인하지 못했습니다. 대신 GitHub Actions에서 확인했습니다(아래).
- 보존 증거: [`opportunity-radar-v2/preservation.json`](opportunity-radar-v2/preservation.json). 후보·경제·판단 증거·GIS 데이터·지도 코드·v1 스냅샷이 기준 커밋과 바이트 동일. 후보 검증 포트폴리오는 `integrity_baseline["docs/index.html"]` 해시 한 줄만 재결합했으며(v1과 같은 표현 계층 예외) 후보 점수·게이트·승격·예산은 동일함을 스크립트가 증명합니다.

## GitHub Actions (PR [#17](https://github.com/jaehojung1879-netizen/SideEconomyLab/pull/17), 커밋 `37f4894`)

5개 검사 모두 성공: [Verify static GIS](https://github.com/jaehojung1879-netizen/SideEconomyLab/actions/runs/38096781628)(기존 GIS 브라우저 검사 포함), [Verify opportunity radar](https://github.com/jaehojung1879-netizen/SideEconomyLab/actions/runs/38096781626)(재현·단위·모델·보존·브라우저), [Verify decision intelligence](https://github.com/jaehojung1879-netizen/SideEconomyLab/actions/runs/38096781673), [Verify business workbench](https://github.com/jaehojung1879-netizen/SideEconomyLab/actions/runs/38096781615), [Verify candidate validation portfolio](https://github.com/jaehojung1879-netizen/SideEconomyLab/actions/runs/38096781634). 열린 리뷰 코멘트 없음, 병합 상태 `clean`.

## 화면 증거

| 화면 | 스크린샷 |
|---|---|
| 데스크톱 첫 화면 1440px | [desktop-overview](screenshots/opportunity-radar-v2/desktop-overview.png) |
| 용산구 컴퓨터 시장(동반 감소) | [desktop-market-yongsan-computer](screenshots/opportunity-radar-v2/desktop-market-yongsan-computer.png) |
| 차트 원값 툴팁 | [desktop-chart-tooltip](screenshots/opportunity-radar-v2/desktop-chart-tooltip.png) |
| 송파구 슈퍼마켓 · 강남구 한식 | [songpa](screenshots/opportunity-radar-v2/desktop-market-songpa-supermarket.png) · [gangnam](screenshots/opportunity-radar-v2/desktop-market-gangnam-korean.png) |
| 지역의 업종별 비교 | [desktop-area-industries](screenshots/opportunity-radar-v2/desktop-area-industries.png) |
| 비교 보류(상권 표본) | [blocked-commercial-area](screenshots/opportunity-radar-v2/blocked-commercial-area.png) |
| 태블릿 1024px | [tablet](screenshots/opportunity-radar-v2/tablet.png) |
| 모바일 390px | [overview](screenshots/opportunity-radar-v2/mobile-overview.png) · [findings](screenshots/opportunity-radar-v2/mobile-findings.png) · [market](screenshots/opportunity-radar-v2/mobile-market.png) · [chart](screenshots/opportunity-radar-v2/mobile-chart.png) |

모든 화면은 커밋된 실제 번들로 만들었습니다. 로컬 환경의 외부 지도 타일은 차단되어 있어 이 화면에는 지도가 나오지 않으며(기회 탐색은 지도를 쓰지 않음), 지역 분석 화면의 지도는 기존 GIS 검사에서 확인합니다.

## 한계와 병합 전 확인

- 자치구 경계 변경 이력은 공식 경계 이력으로 확인하지 못했습니다(코드·이름·하위 행정동 구성의 불변과 제공기관 안내에 근거).
- 금액은 명목값이고 업종 전체의 카드 기반 추정치입니다. 매출이 제공되는 업종은 63개뿐입니다.
- 발견 945건은 읽기 순서이며 조사 우선순위나 기회 순위가 아닙니다. 5%/3% 변화 폭과 1억원/10개 규모 기준은 연구용 설정(`config/opportunity-radar-v2.json`)입니다.
- 요약 색인이 v1보다 큽니다(523 KB, gzip 약 102 KB).
- 실제 배포 도메인에서의 10초 이해 여부는 사용자가 확인해야 합니다. 병합·Ready 전환은 수행하지 않았습니다.
