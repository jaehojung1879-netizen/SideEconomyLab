# Parallel opportunity hurdles v1 — 2026-11-28 KST
Research only. Prior HEAD 0ed5d030f624d1bc48b8a4c096ae7e418d0e02cd passed six native workflows. Do not prefer an owner idea merely because it is novel. No change to canonical gates.

## New evidence
- [F01](https://www.sec.gov/Archives/edgar/data/815556/000081555626000009/fast-20251231.htm) (PRIMARY_FILING): Fastenal 2025 10-K: FMI 매출 37.127억 USD (전체 44.7%), FASTStock 10.377억 USD, FASTBin/FASTVend 26.750억 USD, 연말 136638 MEU. FAST5000 목표 월 매출 2000 USD. MEU는 실물 기기 수가 아닌 목표 매출 기반 가중 단위; 목표 매출은 실제 기기당 평균 아님.
- [F02](https://www.wurthindustry.kr/wis-korea/solutions/orsy-vending/orsy-vending.php) (VENDOR_PAGE): 한국어 공식 ORSY 페이지: 권한별 인출, 공급·보관·재고·보충, 스프링형 최대 48상품, 계량/서랍/잠금함. 케이블타이, 줄자, 테이프 등 인기 품목으로 안내하나 실제 판매량 및 국내 가격 미공개.
- [F03](https://serveone.co.kr/kr/support/new-introduction-guide.do) (VENDOR_SEARCH_SNIPPET): 1인 사업자부터 MRO 구매 플랫폼 이용 가능하다고 설명. 열린 페이지 접근 실패, 최소 거래 규모·가격 미확인. 소기업이 기존 공급사에서 배제된다는 가설은 근거 부족.
- [F04](https://www.eshare.go.kr/UserPortal/Upv/UprResrcGds/index.do?rsrc_no=CI01I5244446) (PUBLIC_LISTING): 강동구 암사1동 주민센터 공구세트 무료 대여 등록. 재고 및 운영시간 현장 미확인.
- [F05](https://www.eshare.go.kr/UserPortal/Upv/UprResrcGds/index.do?rsrc_no=DD18Q0418164) (PUBLIC_LISTING): 강동구 암사2동 전동드릴 1박 500원 대여 등록. 재고 및 운영시간 현장 미확인.
- [F06](https://work.00data.kr/projects/R26BK01794670) (THIRD_PARTY_NOTICE_SNIPPET): 서울도시철도엔지니어링 2026 시설물 유지보수용 소모품 구매 공고 표시 25554400원 VAT 포함, 분할납품 불가, 30일 이내. 공고 예산이지 낙찰/지급 또는 작은 사업장 반복 소비 증거 아님.

Fastenal demonstrates the business of stocking at the point of use, including inexpensive shelves rather than just machines. It is not a Korean small business profitability benchmark. Vendor claims do not establish reachable customers or actual local margins. Public tool libraries are a substitute for durable tools, not necessarily consumables. The public procurement notice is not an awarded contract.

## Equal target, different hurdles
Assumed monthly economic profit target 1m KRW, owner time 40k/h, capital recovery 24 months. Consumer basket 8k, goods 4.8k, 5% other variable expense, 10% host share, 2k contribution/order, 30 days. Hypothetical catchment 3000 households, 20% capture of eligible purchase events. No actual catchment count or capture estimate.
| Model | Economic breakeven orders/month | Target orders/month | Target eligible events per household/year |
|---|---:|---:|---:|
| Existing shelf, capex 200k, fixed 30k, 4h | 100 | 600 | 12.0 |
| Machine, capex 3.5m, fixed 100k, 8h | 283 | 783 | 15.66 |
These rates are arithmetic stress tests for a residential-only market. They are not predictions and cannot include B2B customers by silently changing the denominator.
B2B: 8 accounts, 20% contribution after variable costs, 300k capital, 100k fixed/month, 12h owner/month: target sales 7,962,500 total, ~995,313 per account/month. Break-even 2,962,500 total. The spend volume needs direct evidence. Do not infer from national MRO market size.
SaaS: 99k subscription, 15k variable, 30 min/customer, 4h fixed, 100k fixed cash: 20 accounts for target after labor, capacity 32; acquisition and build time not priced. No paid accounts.

## Decisions
- H24-B2C HOLD: 소비 빈도와 구매 전환 불명, 무료 공구 대여 대체재. 기기 없는 실험도 사전 승인 필요. Next: 독립 호스트 2곳 및 영업시간별 익명 요청 기록, SKU 20개 동일 규격 견적, POS 유료 거래와 대조 기간. 실제 마진·지원시간·공간계약 확정 후 손익분기 기준 재등록.
- H24-B2B DISCOVERY: 반복 구매 구조는 공시로 확인되나 국내 기존 공급사 존재. 소규모 고객 대상 틈새는 미확인. Next: 독립 비금융 사업장 3곳 익명 월 구매명세 및 현행 공급사 조건, 비긴급 자재 3종 동일 규격 견적, 직송/현장 보관 책임. 자판기 없이 기존 선반+재고표 검증부터.
- DF-008 DISCOVERY: 자본 위험 낮으나 구독 지불 근거 없음. Next: 독립 업체 3곳의 동일 월간 예외업무, 유료 의향 2곳, 기존 피벗/CMMS 대조. 가상 데모 이상 개발 금지.
- TOOL-RND PARKED: 줄눈/간판 자동화 장비는 제조·특허·인증 및 AS 위험. Next: 시공 공정 시간 관측 및 기성 도구 비교, 기존 특허 검토. 실제 개선 여지 입증 전 제작 금지.

No outreach, spend, contract, private data or pilot. Confirm employment-policy/conflict rules before commercial activity. Proposed future field gates not approved. Run python -m pipeline.parallel_hurdles; [ledger](../docs/data/parallel-hurdles-v1.json).
