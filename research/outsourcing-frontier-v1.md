# Outsourcing frontier v1 — 2026-11-28 KST
Previous HEAD b62caa9d3d5e64a2ef0b726ad14097dc51e22f19: six native workflows passed. Research only; no commercial promotion. Procurement, hardware, and other prior gates remain unchanged.
## Observations
- [A01](https://kmong.com/gig/420616) OPENED_CACHE: 상품등록 1/10/100건 5000/40000/370000원, 100건 3일, 수정 1회, 이미지와 상세페이지 고객 제공. 열린 캐시 리뷰 456건(검색 458), 판매자 전체 거래 485건, 반복 의뢰 후기. 평일 작업, 평균 응답 30분. 실제 거래가격/업무시간 불명.
- [A02](https://kmong.com/gig/639729) OPENED_CACHE: 자동 상품등록 1000/5000/10000건 100만/150만/200만원, 수정 0회, API 활용 설명. 상품 리뷰 0, 판매자 전체 30건. A01과 서비스 범위·품질·원본 구조 다름. 제3자 콘텐츠 복제/계정 공유를 우리 서비스에 포함하지 않음.
- [A03](https://kmong.com/gig/815430) INDEX_ONLY: 10000건 3일, 엑셀 정리 및 검수 리포트 포함 주장. 상세 접근 실패, 가격·유료거래 미확인.
- [A04](https://www.sabangnet.co.kr/service-intro/sabangnet-ai) OFFICIAL_INDEX: 상품명·상세이미지로 상품정보고시 생성 기능. 상세 본문 재접근 불완전.
- [A05](https://kmong.com/gig/825351) INDEX_ONLY: 제품번호·제원 검색 카탈로그 250만원/10영업일, 최대 2000개 XLSX 관리 옵션 설명. 상세 재접근 실패, 판매 미확인; 웹 개발과 데이터 정비 가격 동일시 금지.
- [A06](https://kmong.com/gig/812864) INDEX_ONLY: 수출업체 공급사/상품 DB, 수량별 가격·MOQ·리드타임·인증서 관리 엑셀. 가격 미확인, 상세 재접근 실패.
- [A07](https://kmong.com/portfolio/view/335426) INDEX_ONLY: 다중마켓 정산 포트폴리오에 연결된 엑셀 상품 19000원/9000원 표시. 실제 판매·성과 미확인.
- [A08](https://kmong.com/portfolio/view/325729) INDEX_ONLY: 2채널 Power Query 정산 검수 포트폴리오 및 연결 상품 49000원 표시. 판매자 자체 사례; 실제 고객 절감·정산 데이터 독립 확인 없음.
- [A09](https://kmong.com/gig/798424) OPENED_CACHE: 30일 맞춤 입찰 알림 39000/69000/129000원, 리뷰 0, 전문가 전체 거래 1223건(이 서비스 거래 아님). 응답 30분 표기. 입찰 자격·제안서·가격 추천 제외.
- [A10](https://naver.worksmobile.com/pricing/clovanote/) OFFICIAL_OPENED: Lite 기업당 월 20000원(연간 계약 18000원), 월 변환 1000분/AI요약25회, VAT 별도.
- [A11](https://kmong.com/gig/575784) INDEX_ONLY: 매뉴얼 제작·편집 후기에서 고객 제공 번역문 반영과 원본 PDF 품질 유지 언급. 가격/실제 매출 미확인. 안전 매뉴얼 등 전문 영역 제외.
- [A12](https://kr.misumi-ec.com/guide/category/first/ecatalog.html) OFFICIAL_INDEX: 형번·CAD·부품표 제공. 큰 공급업체 자체 카탈로그 및 검색 서비스와 경쟁.
- [A13](https://kr.misumi-ec.com/vona2/detail/110310710729/) OFFICIAL_INDEX: 사양 동일하나 형번 변경 및 구형번 재고소진 후 단종 예정 안내. 변경 관리 문제의 사례, 모든 SKU 자동 대응 근거 아님.
- [A14](https://www.informatica.com/ko/products/master-data-management/product-information-management.html) OFFICIAL_INDEX: PIM 제품정보 관리 및 채널 전달 기능. 중소기업 가격/적합성 미확인.
## Candidate dispositions
- OUT-01 상품등록 대행: NO_GENERIC_BUILD. 상품등록 자동화와 가격경쟁, 계정·수정·평일 대응. Evidence A01, A02, A03, A04.
- OUT-02 제조·유통 상품 마스터 정비 및 변경 검수: DISCOVERY. 고객 승인 원본의 제품코드/규격/포장수량/단종 변경 검수, CSV 납품. PIM/엑셀 대조.. Evidence A05, A06, A12, A13, A14.
- OUT-03 판매채널 정산 데이터 정리: NO_GENERIC_BUILD. 저가 엑셀과 Power Query, 개인정보 및 정산 책임. Evidence A07, A08.
- OUT-04 입찰 정보 알림: HOLD. 기존 알림 및 실시간 장애·누락 대응, 실제 지불 미확인. Evidence A09.
- OUT-05 회의록·녹취 초벌: NO_GENERIC_BUILD. 저가 직접 사용, 음성 개인정보, 법정 녹취 제외. Evidence A10.
- OUT-06 비안전 제품자료 편집·번역문 반영: DISCOVERY. 고객 승인 문구와 원본만 사용, 복잡한 편집·수정시간·저작권 위험, 안전/인증/법정 문서 제외. Evidence A11.
## Hurdles
Same monthly economic target 1m KRW; fixed time 4h, fixed expense 100k, labor value 40k/h, cap 20h/month. Registration asking price is a different deliverable from catalog QA; QA price is hypothetical. No actual orders.
| Scenario | Required orders | Capacity | Max economic contribution |
|---|---:|---:|---:|
| 100건 등록 공개 표시가격 활용 가정 / 2h | 6 | 8 | 1524000 |
| 100건 등록 공개 표시가격 활용 가정 / 3h | 7 | 5 | 655000 |
| 100건 등록 공개 표시가격 활용 가정 / 5h | 13 | 3 | 49000 |
| 100건 데이터 검수 가상 가격 / 1h | 8 | 16 | 2540000 |
| 100건 데이터 검수 가상 가격 / 2h | 10 | 8 | 820000 |
100 rows per batch, total per-batch time includes intake, review, revision and delivery. At 2 hours only 1.2 minutes/row on average including all those tasks; no actual throughput measured. Generic registration not attractive given 10k bulk competing offers and frequent weekday contact. No price matching between service scopes.
## Proposed low-risk next experiment
고객이 사용권을 가진 승인 원본의 SKU 마스터와 이전/새 공급사 파일에서 정확한 코드 일치·누락·규격 변경·단종 표기를 검토용으로 납품. 추정 사양·제품 적합성 보증·판매 계정 접속 금지. 같은 파일·같은 기준으로 Excel/Power Query 및 수동 검수와 비교. 실제 작업자 시간, 고객 자료 준비와 수정 시간, 중요 오류, 누락 검출, 최종 승인 기준 기록. 외부 접촉 전 겸업/이해상충 확인과 승인. 독립 기업 3곳에서 반복 데이터 정비 사례와 익명/사용권 확인 입력 확보, 실제 유료 발주 2건 별도 승인 후 검증. 월정액은 서로 다른 기간의 실제 반복 결제 전 개발 금지. 제안 중단 조건: 기존 엑셀/ERP/PIM과 비슷한 비용·시간·오류 또는 평일 긴급지원 필요, 월 20h 한도에서 목표 달성 불가.
Synthetic fixture: detects pack change, status change, missing old record (not inferred discontinued), new incomplete ID, duplicate ID. Exact IDs only; no fuzzy substitutions or production use. This is a deterministic baseline, not an AI benchmark.
[Ledger](../docs/data/outsourcing-frontier-v1.json). Reproduce python -m pipeline.outsourcing_frontier. No real customer contact or spend.
