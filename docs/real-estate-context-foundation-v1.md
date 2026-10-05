# Real-estate context foundation v1

2026-10-04 감사. 시장 맥락은 실제 사이트 경제성과 다릅니다. 수요 → 관측 공급 → **부동산 맥락** → 실제 사이트 조건 → 운영 가능성 → 현장 검증을 분리합니다. 수요점수·공급 분류·사분면·정렬을 바꾸지 않으며 ROI, IRR, 이익, 회수기간, 매출 전망, 종합 점수는 계산하지 않습니다.

## 실제 수집과 의사결정 가치

- **서울 전체 소규모 상가, 2026 Q2:** 환산 시장임대료 **52.8천원/㎡/월**, 공실률 **6.4%**. 한국부동산원 R-ONE 원값은 각각52.7777926305664,6.37793361121874이며 UI만 소수 첫째 자리로 표시합니다. 특정 상권·구·건물 월세/공실로 해석할 수 없습니다. 임대협의 시 시장 배경을 이해하는 용도입니다. 비교군/시계열을 수집하지 않아 HIGH/LOW 등급도 만들지 않습니다.
- **서울 점포-상권, 2025 Q4:** 1,650개 코드 중 **1,649개 ID·이름 일치**, 이름 불일치1개는 `INCOMPATIBLE_GEOGRAPHY`와 NULL. 분류된 업종 점포·분기 개업·폐업 세 개만 집계합니다. 전체 점포는 `SIMILR_INDUTY_STOR_CO`, 일반점포는 `STOR_CO`입니다. 원자료의 전체=일반+프랜차이즈를 검증했습니다. 업종별 개폐업률을 평균하지 않습니다. 점포는 임대 가능한 호실이나 직접 경쟁점 수가 아니며, 개업이 많음/폐업이 많음을 자동으로 좋음/나쁨으로 해석하지 않습니다.
- 점포 파일은2025년 관측이고 수요는2026 Q2입니다. 수집 시점을 최근 관측으로 위장하지 않습니다. 현재 UI는 점포를 **STALE**로 표시하며, 현재 동향·추세를 주장하지 않습니다. 최신 API 점포 분기는 수집하지 않아 UNKNOWN입니다.
- 실제 사이트 월세·보증금·관리비·호스트 배분·가용 공간은 계속 UNKNOWN입니다. 건축물은 아직 NOT_COLLECTED입니다. 부동산 수익률은 부동산 소유자의 지표이므로 설치형 사업 수익률에 사용하지 않습니다.

## 소스 감사 요약

전체 항목별 제공자·변수·시간 단위·최신 관측 근거·인증·이용조건·커버리지·조인·위험·판단 이유는 [기계 판독 감사](data/real-estate-source-audit.json)에 있습니다. `null` 최신 기간은 미확인이며, 홈페이지 갱신일로 채우지 않았습니다. ACCEPT는 기존 기반 유지, CONTEXT_ONLY는 해상도 제한을 명시한 수집/표시, DEFER는 현재 연결·증거 또는 결정 가치 부족, REJECT는 현재 설치형 의사결정에 부적합입니다.

| 공식 소스 | 최소 유효 공간 단위 / 이번 연결 | 최신 확인 관측 | 접근 | 판단과 이유 |
|---|---|---|---|---|
| [서울 영역-상권 OA-15560](https://data.seoul.go.kr/dataList/OA-15560/A/1/datasetView.do) | 상권 ID; 새 폴리곤 버전/대응표 미검증 | 현재 GIS1650; 경계 ZIP게시2023-10-23, 최신 경계시점 UNKNOWN | API/ZIP | ACCEPT 기존 중심점 유지; 새 공간조인 보류 |
| [서울 직장/유동/집객-상권](https://data.seoul.go.kr/dataList/OA-15569/A/1/datasetView.do) | 기존 상권 ID | 저장된2026 Q2 | 기존 서버 API | ACCEPT 기존 수요 그대로 |
| [점포-상권 OA-15577](https://data.seoul.go.kr/dataList/OA-15577/A/1/datasetView.do) | 상권×업종 → 상권 집계; ID·이름1649일치 | 실제ZIP최대2025 Q4; 최신API UNKNOWN | 공개ZIP/인증API | CONTEXT_ONLY 점포·개폐업; 오래된 관측 표시 |
| [상권변화 OA-15576](https://data.seoul.go.kr/dataList/OA-15576/A/1/datasetView.do) | 상권; 새 응답 연결 검증 필요 | UNKNOWN | 인증API | DEFER 생존/폐업 영업기간 분류; v1추가 가치 제한 |
| [추정매출 OA-15572](https://data.seoul.go.kr/dataList/OA-15572/A/1/datasetView.do) | 상권×업종, 표준구역 기반 변경 검토 필요 | 2025ZIP 목록 확인, 실제최대분기 UNKNOWN | ZIP/인증API | DEFER 카드 기반 추정·후보 업종 불일치; 수요에 미삽입 |
| [아파트 OA-15566](https://data.seoul.go.kr/dataList/OA-15566/A/1/datasetView.do) | 상권 집계; 분기 표기가 연간 관측 반복 | UNKNOWN | 인증API | DEFER 상가월세/설치가능성과 연결 약함 |
| [표준단위구역 변경 공지](https://data.seoul.go.kr/dataList/OA-22181/A/1/datasetView.do) | 표준단위구역·공식 대응표 필요 | 공간변경2024; 이력제한 적용2026-07-03 | 공식 설명 | DEFER 새 단위→기존1650의 직접 연결 금지 |
| [REB 소규모 상가 임대료/공실률](https://www.reb.or.kr/r-one/portal/stat/easyStatPage/T248223134698125.do) | 제공은 시장/하위시장까지; 이번엔 서울시 전체만 | 실제응답2026 Q2 | REST/XLS/PDF | CONTEXT_ONLY 서울2셀만 연결 |
| [REB 임대가격지수](https://www.reb.or.kr/reb/cm/cntnts/cntntsView.do?cntntsId=1049&mi=10335&statId=S237220284) | REB시장, 서울 상권과 다름 | 조사2026 Q2 공표; 개별 수치/시계열 미수집 | REST/파일 | DEFER 시대별 표/비교가능성 검증 후 추세 검토 |
| REB 투자수익률 | 부동산 소유 투자수익·시장 | 조사2026 Q2 공표; 수치 미수집 | REST/파일 | REJECT 설치형 사업 경제성 대리변수로 부적합 |
| [국토부 상업업무용 매매15126463](https://www.data.go.kr/data/15126463/openapi.do) | 계약건, 법정구코드5+월; 일부 지번 마스킹 | 최신계약월 UNKNOWN | 인증REST XML | DEFER 실제 건물 매입 검토 시만; 매매가≠임대료 |
| [국토부 토지 매매15126466](https://www.data.go.kr/data/15126466/openapi.do) | 거래필지, 일부 지번 마스킹 | UNKNOWN | 인증REST XML | REJECT 현재 호스트 설치형 맥락에 가치 낮음 |
| [건축HUB대장15134735](https://www.data.go.kr/data/15134735/openapi.do) | 건물/층, 확인 주소·법정필지→버전 있는PK | 최신실제대장 UNKNOWN; 카탈로그 월간 | 인증REST JSON/XML | DEFER 실제 사이트 주소 확보 후 최우선, SHORTLIST-ONLY |
| [GIS건물15123552](https://www.data.go.kr/data/15123552/openapi.do) | 건물 도형·속성; CRS/대장PK 대응 필요 | 최신레이어 UNKNOWN; 월간 | VWorld LINK/WMS/WFS | DEFER 후보 bbox만, 인증/이용조건/좌표 검증 후 |

서울 ZIP은 인증 없이 내려받을 수 있고 API는 기존 서버 SEOUL 인증을 사용합니다. DATA.GO.KR의 거래·대장은 별도 활용신청/서비스키가 필요합니다. 이번에는 신청·계정·새 비밀값을 만들거나 조회하지 않았습니다. 서울은 공공누리1유형 출처표시를 따릅니다. 국토부의 위 거래/대장 카탈로그는 이용범위 제한 없음으로 안내합니다. VWorld의 세부 서비스 조건·재배포와 R-ONE 마이크로데이터 조건은 별도로 확인해야 하므로 대량 수집/재배포를 가정하지 않습니다.

## 공간 단위 hard gate

서울 공지의 확인 가능한 내용:2024년부터 상권분석서비스의 공간 단위가 표준단위구역으로 변경되었고,2026-07-03부터 일관성을 위해2021년 이후 자료만 제공한다는 안내입니다. 이 공지를 모든 공개 테이블의 ID가 교체되었다는 증거로 확대하지 않습니다.

실제로 내려받은2025점포 파일에는 기존1650상권 코드가 모두 있습니다. 최신분기75,985개 상권×업종키에 중복이 없고 ID·이름1649개가 동일합니다. `3110379`: GIS `KTNG 북부지사` ↔ 파일 `KT&G 북부지사`는 임의 별칭 처리 없이 보류했습니다. 연결은 **공개 상권 ID 집계의 대응**이며 폴리곤 동일성을 입증한 공간 교차분석이 아닙니다. 공식 표준단위구역 폴리곤·버전별 대응표를 확보하지 못했으므로 새로운 표준단위구역 자료에는 이 연결을 재사용하지 않습니다. 이름검색·최근접 중심점으로 대응표를 만들지 않습니다.1%이상 이름 불일치, 코드 집합 변경, 중복 또는 잘못된 수치가 생기면 전체 새 스냅샷을 거절합니다.

REB 지역코드 카탈로그의 `CLS_ID=500002`가 `서울`이며, 수치 응답의 지역도 `서울`임을 확인했습니다. GIS가 모두 서울25개 구에 속하는지 검증하여 서울시 맥락을 연결합니다. REB의 광화문/강남 등 시장명과 GIS 상권 이름을 맞추지 않았습니다. REB시장은 행정구·서울상권 경계와 동일하지 않으므로 더 정밀한 연결에는 공식 경계가 필요합니다. 서울 전체 값에는 공간 차이가 없어 새로운 지도 모드를 추가하지 않았습니다.

## 수집·변환·추적성

[data/real-estate-context/2026-10-04](../data/real-estate-context/2026-10-04/)에 공개ZIP, 두 R-ONE 수치 응답, 두 지역/항목 코드 응답, manifest를 저장했습니다. 출처 URL·조회 방법·조회 UTC시각·관측 분기·공간 단위·변환·이용조건·각 raw SHA256을 보존합니다. manifest 해시와 현재 수요 JSON 해시가 public `data/real-estate-context.json`에 연결됩니다. 전체 ZIP304,775행/2025년4분기, 최신75,985행을 검증했습니다.

R-ONE의 [공식 개발가이드](https://www.reb.or.kr/r-one/portal/openapi/openApiDevPage.do)는 인증키 미사용 sample 모드와 서버 호출을 설명합니다. 일반 페이지 설명과 예제의 샘플 한도(10/5건)가 일치하지 않으므로 수량을 가정하지 않았습니다. **두 요청 모두 해당 서울·분기·항목만 지정했고 list_total_count=1, 실제row=1**을 확인했습니다. 전체지역 또는 긴 시계열을 sample로 수집한 것이 아닙니다. 정식 대량수집은 R-ONE 인증키/조건을 별도 검토합니다. 이번 요청에 자격증명은 없고, 브라우저는 정제 JSON만 가져옵니다.

REB는 분기 조사와 익월 공표, 도시/시장 통계·자료 다운로드를 제공하며 R-ONE 표에는2024Q3이후와 과거 시대별 테이블이 따로 존재합니다. 연속 시계열을 임의 연결하지 않습니다. 임대료는 보증금을 전환한 면적당 월 비용이고 소매 1층 기준이며 관리비·VAT 제외입니다. [공식 산출방법](https://www.reb.or.kr/reb/cm/cntnts/cntntsView.do?cntntsId=1051&mi=9802)과 [2026 Q2공표](https://www.reb.or.kr/reb/na/ntt/selectNttInfo.do?mi=9565&nttSn=115895)를 참조합니다. 조사표본/RSE 한계와 특정 건물의 호실·조건을 혼동하지 않습니다.

오프라인 재현:

```bash
python pipeline/real_estate_context.py
python -m unittest discover -s tests -v
```

수동 재조회는 `python pipeline/real_estate_context.py --refresh` 또는 **Refresh audited real-estate context** workflow입니다. 검증한2025ZIP과2026Q2의5개 공식 요청만 다시 읽습니다. 다음 연도/분기를 자동으로 추정하지 않으며, 갱신하려면 감사·manifest·대상 분기를 함께 검토해야 합니다. 성공 시 새 날짜/해시 디렉터리를 만들고 이전 원자료를 유지합니다. 실패/불완전/공간 변경/단위 변경은 이전 public JSON을 보존하고 오류로 종료합니다. 일반 push는 새 수집을 하지 않습니다. 생성 데이터로 수집 루프가 발생하지 않으며 기존 Seoul/Kakao 정기·수동 파이프라인을 변경하지 않았습니다.

## 상태와 UI

- `AVAILABLE`: 검증된 원자료/공간 연결; 사이트 경제성 검증이라는 뜻은 아닙니다.
- `UNAVAILABLE`: 선택적 JSON이404/410/없음. 기존 GIS는 계속 작동합니다.
- `NOT_COLLECTED`: 건축물/현장 조건 등 아직 수집하지 않은 차원입니다.
- `STALE`: **관측 분기말 이후180일 초과**. 이는 v1의 명시적 표시 정책이며 공식 발표 지연 판정이 아닙니다. 조회일로 age를 초기화하지 않으며 브라우저에서도 오늘 날짜로 다시 평가합니다. 값은 과거 증거로만 표시합니다.
- `INCOMPATIBLE_GEOGRAPHY`: 이름 불일치 또는 수요스냅샷 해시 변경. 해당값은 UNKNOWN/NULL입니다.
- `SOURCE_ERROR`: 잘못된 응답/형식/단위·공간·기간 검증 실패. 실패한 refresh는 기존 성공 증거를 덮어쓰지 않습니다.

선택 패널의 별도 부동산 구역에 기간·범위·맥락 연결·출처·수집시각·오래됨을 표시합니다. 후보 전환에도 도시맥락은 동일하며 기존 분석은 후보별로 바뀝니다. 실제 조건에는 임대료·보증금·관리비·배분 UNKNOWN을 유지합니다. 금액을 면적에 곱하거나 비용으로 대입하지 않습니다. 새로운 사이트·매물·호스트는 없습니다.

## 다음 수집: 전체서울 대신 SHORTLIST-ONLY

먼저 후보별 A/C 및 수요 상위 중 실제 보행동선과 경쟁을 확인하고, 가능성 있는 건물/호스트3곳의 정확한 주소·호실·층을 기록합니다. 그때 건축HUB에서 주/세부용도·층별 면적·연면적·사용승인일·구조를 수집하고 확인 주소/필지로 연결합니다. 구 시스템→건축HUB PK 변경도 기록해야 합니다. 좌표는 별도 공식 건물 도형/검증된 지오코딩으로 확인합니다. 대장 용도는 설치 허가·전력·접근·영업 가능성의 증명이 아닙니다.

[건축물 증거 스키마](data/building-context.schema.json)는 기존 site_id에 연결 가능한 미래 구조만 정의합니다. 실제 건축물 데이터/사이트는 생성하지 않았고 기존 사이트 관측 스키마도 유지했습니다. 실제 월세·보증금·관리비·호스트배분은 호스트 인터뷰/견적/계약 증거로 확보하고, 이용률·서비스 비용·유료거래를 검증한 다음 별도 경제성 연구를 설계합니다.

## 수요 refresh의 파생 의존성 (PR #13 무결성 보수)

Seoul demand snapshot은 부동산 컨텍스트의 `demand_hash`와 ID/이름 매핑의 상위 입력이다. PR12 merge에서는 일치했으나 `18e213b`의 scheduled GIS refresh가 수요/공급만 커밋하여 main에서 먼저 불일치가 생겼다. #13은 이를 상속했고 기존 transform 테스트 및 Actions 로그로 동일 실패를 확인했다.

`pipeline/gis_refresh.py`는 Git checkout/worktree 없이 임시 파일 공간에서 수요(필요 시) → POI → 공급 파생 → 부동산 파생을 만든다. 부동산은 **기존 active immutable raw snapshot**만 재사용하며 `--refresh`/새 `as_of`를 전달하지 않는다. 관측 기간·retrieved_at·raw hashes·STALE·서울시 R-ONE 값/출처는 보존한다. 전체 Python·Node context·portfolio·schema 검증과 정확한 dependency 재계산을 모두 통과한 bundle만 반영하고 Git workflow가 함께 커밋한다. 실패 시 remote의 이전 커밋은 유지되며 일반 파일 반영 오류도 이전 public bytes로 되돌린다. 강제 프로세스 종료 후 runner 로컬 파일까지 다중 파일 원자성을 보장하는 것은 아니지만 실패한 job은 Git commit 단계에 진입하지 않는다.

원래 unique ID·서울 구·store ID coverage·99% 이름 일치 검증은 유지한다. `config/real-estate-geography-v1.json`은 PR12에서 감사한 1,650개 중심점의 ID/이름/구/dong/좌표·CRS fingerprint를 고정한다. count/ID/name/district/center/CRS drift는 자동 hash 교체 대신 새 감사를 요구한다. 중심점 일치가 폴리곤 동일성이나 새 표준단위구역 crosswalk를 증명하지는 않는다.

portfolio의 선택·증거·실험·예산·날짜·UI는 바꾸지 않는다. 합법적인 GIS refresh 뒤 보호 파일 검사도 유효하도록 `integrity_baseline`의 **생성 데이터 4개 SHA만 기계적으로 재바인딩**한다. GIS와 수동 원자료 refresh는 같은 branch concurrency group으로 직렬화하고, bot commit 후 다른 mutation workflow가 실행될 것을 기대하지 않는다. 생성 출력은 mutation trigger에 추가하지 않았다. remote가 검증 중 바뀌면 rebase하지 않고 실패/재실행한다. 정상 push도 non-fast-forward를 거부하므로 검증된 서로 다른 snapshot을 재합성하지 않는다.

기존 committed inputs의 offline 복구: `python pipeline/gis_refresh.py --rebuild-only`. 읽기 전용 dependency 확인: `python pipeline/gis_refresh.py --check`. 둘 다 비밀값/새 네트워크 원자료 요청 없이 사용할 수 있다.
