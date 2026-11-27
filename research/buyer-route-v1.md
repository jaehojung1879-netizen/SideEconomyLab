# Buyer-route v1 — 2026-11-28 KST

## Concrete purchase observations
Incheon Hambak Elementary School public contract list shows copy paper purchases 500,000 KRW (2026-08-06) and 1,200,000 KRW (2026-09-29), different suppliers. Detail request timed out. Public school demand is not private academy demand, no unit price, quantity or payment evidence. No repeat-rate estimate. Two retail offers and one dropship supplier establish readily available alternatives; only a matched SKU, tax and fully landed supplier quote can establish margin. Interior full-stack software already offered at 40,000/50,000 KRW per month and another provider advertises 49,000 KRW web monthly. PartsClub advertises automated quote/replenishment workflows. Print vendors offer direct ordering and some same-day dispatch; size/shipping restrictions matter. See exact [evidence ledger](../docs/data/buyer-route-v1.json).

## Research queue (not authorized outreach)
### PX-01 학원 A4 복사용지·소모품 직송 — QUOTE_BEFORE_BUILD
- Deliverable: 동일 제조사·SKU의 3개 품목 구매명세와 공급사 직송 견적 비교표
- Gate: 기존 CV-022 유지: 실제 구매 바스켓 5개 및 공급 견적 3개. 판매가·VAT·배송·반품·수수료·결제기간 일치. 현금/시간 한도 미달이면 중단.
- Risk: 학교 계약은 학원 수요가 아님. 일반 온라인몰·도매상과 직접 경쟁.

### PX-02 인테리어 현장 정산 예외 리포트 — NO_GENERIC_BUILD
- Deliverable: 기존 시스템 내보내기 파일에서 누락·중복·미수금 예외만 확인하는 월마감 샘플(합성 데이터)
- Gate: 서로 독립적인 업체 3곳의 동일한 미해결 업무와 익명 양식, 유료 의사 2곳 확인 전 개발 금지. 기존 기능으로 해결되면 폐기.
- Risk: 4~5만원 통합 SaaS의 가격과 기능, 맞춤 지원을 이겨야 함.

### PX-03 자동차 정비소 비안전 핵심 외 소모품 조달 — HOLD_UNTIL_DISTINCT_BASKET
- Deliverable: 부품 적합성 판단·안전 책임 없는 소모품만 3개 SKU 분리
- Gate: CV-022에 준하는 구매명세·공급 견적 및 재고/직송/반품 조건. 긴급 납품 또는 차량 안전 관련 책임 필요 시 중단.
- Risk: 부품 플랫폼 및 기존 유통망, 평일 즉시 납품. 신규 업종은 별도 가설이며 CV-022를 통과한 것이 아님.

### PX-04 규격화된 안내물·출력물 공급사 이행 — QUOTE_BEFORE_BUILD
- Deliverable: 완성 디자인 파일, 동일 크기·재질·후가공·배송 조건의 비교견적 3건
- Gate: 공급사 직접배송 및 파손/재출력 책임 서면 확인. 직접 판매보다 명확한 지불 이유와 시간 제약 충족. 행사 패키지는 기존 CV-030 별도 유지.
- Risk: 직접 온라인 발주가 가능하며 설치·긴급 납품 요구가 노동시간을 잠식.

## Reverse unit economics
All inputs hypothetical; fixed cost 100k/mo, fixed time 4h/mo, 20h cap, owner time 40k/h, 1m target, capital 0, no separate income tax/finance or CAC/churn unless cost inputs include them. Not a forecast.
| Scenario | price | variable cost | unit hours | cash units | economic units | max units |
|---|---:|---:|---:|---:|---:|---:|
| 복사용지 박스 단위 중개 | 35000 | 32000 | 0.1 | 367 | 불가 | 160 |
| 인테리어 월정액 49,000원 | 49000 | 9000 | 0.5 | 28 | 63 | 32 |
| 반복 예외 리포트 10만원 | 100000 | 20000 | 0.5 | 14 | 21 | 32 |
| 출력물 중개 5만원 | 50000 | 40000 | 0.25 | 110 | 불가 | 64 |
The high-margin repeated standardized service is arithmetically more plausible under these assumptions, but price and retention not proven. No broad build; no candidate promoted. Run python -m pipeline.buyer_route. Before any field contact check employer policies; no employer records, customer lists or relationships. No spend or external messages.
