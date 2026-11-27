# Facility dual-track v1 — 2026-11-28 KST

Owner direction: study hardware vending and SaaS in parallel; no equipment development or spend authorization. Previous HEAD 06243f93d0f325f836b7cf143eeb2cef7949a184 six workflows passed. Existing OC-020 and DF-008/005 are not promoted. New variants remain research only.

## Vending: distribution first, device last
- 기존 철물점 가격표·재고 안내 및 영업시간 내 픽업 예약
- 영업시간 중 준비 후 기존 보관함 수령
- 기존 제휴 매장 내 즉시구매 진열/기성 자판기
- 시설관리 B2B 소모품 지급함
A 24h pickup locker requires earlier fulfillment, unlike immediate walk-up sales. Start with no hardware, log unmet requests by hour/SKU and urgency; do not claim actual demand from interest. Proposed test gate: 기존 CV-020 HOLD 유지. 별도 사전등록 및 승인 전 외부 연락/비용 금지. 제안 기준: 철물점 3곳의 14일 익명 미충족 요청 기록, 실제 동일 SKU 가격/원가 20개, 기존 기기 3개 동일 조건 견적, 30일 해지 가능 조건. 예약 수령과 즉시 구매 수요는 분리. 기기 없는 관찰은 실제 거래로 간주하지 않음. 이후 독립 파일럿에서 실제 유료 거래와 운영시간 측정 후 판단.

### Exposure scenarios, hypothetical only
| Scenario | Initial cash (before first rent) | Total committed outlay | Stress loss if no recovery |
|---|---:|---:|---:|
| 무기기 사전 검증 | 50000 | 50000 | 50000 |
| 1개월 해지 가능 렌탈(가정) | 450000 | 850000 | 850000 |
| 36개월 중도해지 불가 렌탈(가정) | 450000 | 11350000 | 11350000 |
| 기존 기기 구매(가정) | 5500000 | 5700000 | 5700000 |
| 자체 하드웨어 개발(가정) | 20500000 | 20700000 | 20700000 |

No real vendor quote. Compare termination, installation, return freight, deposit, warranty, stock, jam/refund support, weather and power; no assumed resale. Refundable deposits only if truly secured; otherwise model as at risk. Loss bound conditional on input contracts, excludes unknown liabilities. Owner labor and CAC separate. No own development until sales and device limitations independently proven.

## SaaS: narrow monthly output, not a general CMMS
월간 시설 유지보수 지출 예외 리포트: 동일 규격/단위/세금 기준 비용 명세에서 중복 송장 키와 비교 가능 승인단가 초과 후보만 탐지. 실제 과다청구/부정 판정 아님. 개인 정보, 은행 자료, 법정 점검, 긴급 대응 제외.
Price 99k/month is hypothetical, variable cost 15k/customer, 30 min/customer, fixed time 4h and cost 100k/month; 14 accounts cash / 20 accounts economic for 1m target, max 32 at 20h. No retention or CAC established. 3 independent buyers/2 paid-intent before further build. 독립 업체 3곳의 동일 반복업무와 익명 입력양식, 2곳의 유료 의향. 사전등록 후 실제 2개월 결제 및 운영시간 검증 제안. 기존 소프트웨어 또는 피벗으로 동일 가치 제공 시 개발 중단.

Synthetic prototype can detect repeat invoice/SKU keys, above-approved-unit-price candidates, and blocked comparison. These are review flags, not fraud or savings. Test only fictional data. No login, real user upload, billing, alerting or hosted SaaS. No employer systems, client/vendor contacts or real data.

## Evidence
- [MTS](https://mts-multi.co.kr/unmanned-vending/): 스프링/푸시 등 상품 배출 형태 및 렌탈 검토. 가격·계약 확정 없음.
- [동네자판기](https://dongnevending.com/): 생활용품 판매 가능 및 임대·렌탈 상담, 재고·매출 확인. 철물 SKU 호환 미확인.
- [SMART VENDING](https://smart-vending.co.kr/vending/standard/rental): 설치, 결제, 계약 기간, 원격 관리 및 출장 책임 구분. 확정 견적 없음.
- [bauSpezi](https://bauspezi-oppenheim.de/neu-24-7-baumarkt-automat-in-undenheim/): 철물점의 24시간 자판기 실제 운영 안내. 매출·손익 미공개.
- [Toolstation GO](https://www.toolstation.com/toolstation-go): 영업시간 중 준비한 주문을 24시간 보관함 수령. 심야 즉시 신규 주문과 다름.
- [Fastenal](https://fastenal.eu/fastvend/): 서비스 계약을 전제로 기기 무상 제공 주장. 유료 서비스 조건 및 국내 적용 미확인.
- [바로냄](https://www.balonaem.com/introduce.php): 견적, 공정, 발주, 정산, 공급자/고객 포털. 범용 인테리어 SaaS 차별화 어려움.
- [핀테이트](https://fintate.com/intro/saas): 임대차 및 임대료 관리, 알림, 정산, 리포트.
- [Leysys](https://www.leysys.com/products/facility/): 시설 점검, 작업, 설비 이력 및 비용 관리.
- [HADA](https://www.cloudsup.or.kr/solution/all/view/4356): QR 기반 현장 점검 및 업무·이슈 관리.
- [MaintainX](https://www.getmaintainx.com//pricing): 작업지시, 유지보수, 다점포 관리.
- [UpKeep](https://upkeep.com/): 유지보수 핵심 상품 사용자당 월 24달러부터 표시. 실제 국내 요금 미확인.

Reproduce: python -m pipeline.facility_dual_track. [Data](../docs/data/facility-dual-track-v1.json) · [Research UI](../docs/facility-dual-track.html).
