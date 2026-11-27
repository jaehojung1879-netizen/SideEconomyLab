# SideEconomyLab desk-to-field decision packet — 2026-11-28 KST
## Decision
Prior head 8a6305baa3fa76930baa62c65e1abde3934f0c08 passed all six native workflows. Main observed adabef5453808ba482f0cb0862eeae0200c64028; stacked #18 dependency 730c95065765200f36451bd17b9c15cb34d8d360. No merge. The canonical field CSV contains only a header (0 records); no C3/C4/C5 promotion. No own paid transaction. Desk research has reached its current decision boundary. This is a proposed execution packet, not an authorization. Do not confuse existence of market demand with our accessible demand or owner economics.
## New physical-business evidence
- [P01](https://gongdae.kr/) (INDEX_ONLY): 0810함마 및 38함마드릴 일 22000원; 동일 규격 다른 모델 가능, 배송 상담. 본문 재접근 실패.
- [P02](https://www.gkrental.kr/dehumidifier-rental) (INDEX_ONLY): 150L/일 WPD-150 표시 10일 500000원, 1개월 650000원; 운송비 별도. 본문 403.
- [P03](https://www.ulsan.go.kr/contract/contract_info/open_condition/all?idx=202600210115&mode=view) (OFFICIAL_OPENED_CACHED): 남부소방서 2026 제습기 임차, 계약 824400원, 2025-12-31~2026-12-31; 캐시상 2026-01-19 71340원 및 02-13 68700원 부분금, 총 140040원. 대수/규격 불명; 현재 지급잔액 아님.
- [P04](https://www.uiwang.go.kr/UWKOROPEN0314/view?ctrtAcctBookMngNo=202500220912&ctrtGovCd=&curPage=37&custNm=&seachCtrtAmtEnd=&seachCtrtAmtSt=&srchEndDay=&srchStartDay=&srchText=&useAt=) (OFFICIAL_INDEXED_TEXT): 의왕시 2025 도서관의 날 AI 포토부스 임차, 계약/지급총액 2200000원, 준공 2025-04-12, 검수 2025-04-16. 상세 재접근 timeout, 행사 사양 불명.
- [P05](https://jeongseon.go.kr/portal/admininfo/contractinfo/payment/pay_service?ctrtAcctBookMngNo=202600225695) (OFFICIAL_INDEXED_TEXT): 가리왕산 케이블카 포토부스 임차, 2026-01-01~12-31, 계약 5280000원, 2026-11-06 지급총액 4400000원, 잔액 880000원. 상세 재접근 cache miss; 대수/장비/부대서비스 미확인.
- [P06](https://www.geumcheon.go.kr/portal/tcmSummaryListView.do?ctrtLdgrMngNo=202500311693) (OFFICIAL_INDEXED_TEXT): 시흥행궁전시관 포토부스 구매 2025-11-27 계약 7260000원, 완납금 7260000원. 검색 원문에는 메뉴 key=434 포함; 보안 스캐너 충돌을 피하려고 공개 메뉴값 제외, 위 링크 단독 접근은 미검증. 계약 사양·대수 미확인. P05와 별개 구매이므로 수익률 산출 금지.
- [P07](https://www.herephoto.com/event-photobooth) (INDEX_ONLY): 포토부스 렌탈 40만원부터, 설치·철수, 디자인/서류 안내. 정확한 묶음 및 순파트너 공급가 미확인, 재접근 실패.
- [P08](https://www.modlounge.co.kr/photobooth) (INDEX_ONLY): 설치 약 40분/철수 20분, 행사 시작 전 도착, 무인 운영 상담. 실제 행사 대응과 순공급 조건 미확인.
- [P09](https://kplanz.com/ko/rental-baby) (INDEX_ONLY): 리안 프라임라이트 3일 45000원/보증금150000원, 배송/회수비 별도. 안전책임, 청소, 파손/회수. 카시트 등 안전필수 제품 제외.
- [P10](https://lucaswash.com/index) (INDEX_ONLY): 셀프 반려동물 목욕기와 24h 무인매장 제공, 실제 원가/매출 미확인.
- [P11](https://care.blkorea.co.kr/) (INDEXED_FAQ): 커피머신 정기케어 베이직 월29000, 스탠다드59000, 프리미엄179000원(런칭 첫12개월89500원), 무료 진단, 장비별 조정; A/S 우선배정. 원문 재접근 실패.
- [P12](https://brwnie.kr/industries/vending-mealkit/) (INDEX_ONLY): 자판기/밀키트 매장 4주 주2회 244000원부터 VAT 별도. 기기 단독 설치 견적 아님.
- [P13](https://brwnie.kr/pricing/) (INDEX_ONLY): 스터디카페 4주 주2회 90분 348000원부터 VAT 별도. 원문 재접근 실패.
- [P14](https://brwnie.kr/) (INDEX_ONLY): 정기 청소/진열/소모품 보충/기기 점검. JS 페이지 원문 불완전. 긴급 장애/SLA 책임 미확인.
External payment records are stronger than seller listings, but not our customer evidence. Equipment quantities and scopes unknown, never compute ROI by combining a purchase and unrelated rental. P03 cached partial payment as recorded then; P04–P06 indexed text not independently reopened. Existing tool rental, maintenance and retail operators already supply many physical models.
## Event hurdle vs old field gate
Existing OC-030 field PASS requires matched contribution at least KRW150k/job, scheduled owner <=2h/job, no attendance, and buyer/supplier evidence. Preserve it. Under later assumption 20h/month, fixed 4h/100k, labor 40k/h, zero capital, target 1m/month:
| Contribution/job | Hours/job | Max jobs | Max cash after fixed | Max economic profit | Required contribution/job for target at capacity |
|---:|---:|---:|---:|---:|---:|
| 150000 | 2 | 8 | 1100000 | 300000 | 237500 |
| 150000 | 1 | 16 | 2300000 | 1500000 | 118750 |
| 237500 | 2 | 8 | 1800000 | 1000000 | 237500 |
| 118750 | 1 | 16 | 1800000 | 1000000 | 118750 |
The 150k/2h case clears the numeric field screen but not the economic goal (300k maximum). At 2h/job, 237500 contribution is necessary for target assuming 8 jobs sold. At 1h/job, 118750 contribution at full 16 jobs is the arithmetic hurdle but existing 150k screen still applies. No new gate change, no sales forecast.
## Portfolio dispositions
- OC-022: EXISTING_SELECTED_GATE_UNCHANGED. 위생/포장/고정 작업장 중 실제 동일규격 바스켓·비가격 pain 먼저. 직송 및 공급사 직접청구 구조를 별도 검토. 기존 15명, 5바스켓, 3견적, 15% gate 보존.
- OC-030: EXISTING_SELECTED_GATE_UNCHANGED. 3개 동일사양 순파트너 RFQ 우선. 설치·철거·현장·긴급대응 전부 공급사. 기존 건당 15만원/2h gate는 field screen, 100만원 목표 충분조건 아님. 실제 수주/운영 시간이 없으면 ownership 금지.
- NEW-02: DISCOVERY_WAIT. 비고영향 FAQ 독립 검수. 실제 구매자 3곳/유료의향 2곳 및 기존 무료도구 대비 결과. 추가 비용·시간은 기존 선정 예산 밖이며 별도 승인 전 실행 금지.
- OUT-02: DISCOVERY_WAIT. 상품마스터 변경 정비. 독립 구매자/공급자 실제 파일과 엑셀 대조, 단종/규격 판단은 원문 근거만.
- DF-008 / procurement-audit: DISCOVERY_WAIT. 실제 지점별 비용 및 공급사 확정견적 없으므로 추가 기능 동결.
- OC-020: HOLD. 철물24 기존 단일 SKU/host 조건 먼저. 무인점포 대행비는 실제 자판기 견적 아님. 장비 구매 금지.
- OC-013 / OC-001 / OC-008: PRIOR_GATES_UNCHANGED. 공간·설비·운영비·회수·host 미확인; 독립임대 및 구매 금지.
- REV-02 / REV-05: SOURCE_BLOCKED_OR_HOLD. 공개시각/실제 계약 연결 불가; 디지털 매물 실사 불가. 신규 개발/인수 금지.
- physical rental / maintenance: NO_NEW_CANONICAL_CANDIDATE. 대여·정기관리 기존 경쟁 확인, 직접 운송/수리/청소 부담. 완전 외주와 순기여 입증 전 신규 실행 후보로 승격하지 않음.
No ad hoc score. Evidence missing, so total score remains null. Existing [constitution](../docs/research-constitution.md), [portfolio](candidate-validation-portfolio-v1.md), [instruments](../field/candidate-validation-instruments-v1.md) control.
## Concrete next action: prepare, not transmit
Before commercial contact: confirm employment/COI, external nonfinancial customers only, scope of permissions. No company/customer confidential data. No purchase, reservation, order, contract, ad spend, customer contact or actual pilot.
1. OC-030 supply stage: three direct same-spec quotes. Proposed comparison spec (not fixed commercial prereg): Seoul indoor event, one booth, 4-hour operation, 200 photo prints, custom non-identifying frame, all delivery/setup/removal, staffing/support by supplier, no owner onsite, no personal lead capture. Specify hypothetical date window; no booking. Request net reseller price and VAT, all-in scope, transport, consumables/overage, cancellation, insurance, failure/refund, whether reseller agreement and direct supplier fulfillment are permitted. Use canonical instruments. Buyer stage only after supplier gate passes.
2. OC-022: use 15 qualified nonfinancial buyer interviews, at least 5 anonymized exact baskets, same-spec supplier comparison, no goods finance or urgent delivery. Capture actual dates, landed price, unit/pack and actual handling time, explicit nonprice pain. Existing conditions prevail. No personal identifiers or invoices in public repo.
3. Do not expand field budget to AI or catalog merely because prototypes exist. Existing total proposed ceilings 250k/18h over 21 days, first week 200k/10h, capex zero; review remaining budget before any new selection. No approval inferred. At limits record HOLD/FAIL; avoid repeated web research without new decision-changing data.
## Stop / reopen
No new feature development while field evidence missing. Desk work only if a new source produces a specific new candidate falsifier or verified transaction scope, or user requests distinct exploration. Record actual buyer evidence privately with authorization and anonymous aggregates in canonical ledger. Existing scoring/registry unchanged. [Machine-readable packet](../docs/data/desk-to-field-decision-v1.json).

## Follow-up: overseas channels
[Global distribution audit](global-distribution-v1.md) separates downloadable products, platform apps and finite affiliate cohorts. Existing selected queue unchanged.
