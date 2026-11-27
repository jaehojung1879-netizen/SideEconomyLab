# Recommerce and repeat-payment falsification v1 — 2026-11-28 KST

Research only. Previous HEAD 33b92854f9c7f7bab81b9cd3bf5f850d546965c0 passed six native workflows; NTS local profile replay confirmed in run 46026363194. No paid customer transaction or matched resale.

## What was observed
- [콘티 X-One Tci 13L](https://auction.minmins.kr/item/2026-0900-051966/) — AWARD_THIRD_PARTY_ADJACENT: 2026-10-26 개찰, 낙찰가 1,266,000원, 표시 낙찰가율 194.8%. 다른 물건 페이지의 관련 사례로만 노출; 본 물건 ID·수량·공식 원문·납부 미확인.
- [상업용커피메이커및아이스티메이커](https://auction.minmins.kr/item/2026-0900-051964/) — AWARD_THIRD_PARTY_DETAIL: 2026-10-20 개찰, 감정/최저 900,000원, 낙찰 2,610,000원, 유효입찰 10명. 공식 결과 원장·수량·납부 미확인.
- [콘티 X-One TCI 2G](https://web.joongna.com/search/%EC%BD%98%ED%8B%B0%20%20tci) — ASK_SEARCH_LIST: 검색 결과 단일 매물 2,000,000원 표시. 연식·상태·실거래 미확인.
- [콘티 X-One TCI 2GR](https://search.danawa.com/mobile/dsearch.php?keyword=%EC%BD%98%ED%8B%B0%EC%97%91%EC%8A%A4%EC%9B%90TCI) — ASK_COMPARISON_LIST: 중고 호가 2,200,000원 + 배송 100,000원; 메인보드 부품 호가 398,000원. 재고/정비/결제 여부 미확인.
- [씨메 03 NEO 2그룹](https://web.joongna.com/product/229965912) — SOLD_LABEL_NO_PRICE: 판매완료 라벨, 2022년식으로 설명(제조 2021년). 최종 거래가와 결제 여부 미확인.
- [말코닉 EK43](https://web.joongna.com/product/228174817) — SOLD_LABEL_NO_PRICE: 판매완료 표시, 판매자 2020년 11월식이라고 설명. 최종 거래가·결제 미확인.
- [제빙기 위탁 플랫폼 후기](https://web.sosangspace.com/consignment/taxdiet?device=MO&tab=proxy) — SELLER_REPORTED_TRANSACTION: 플랫폼 게재 후기는 6일 만에 630,000원 거래했다고 주장. 동일 모델·구매 영수증·수수료·독립 검증 없음.
- [루프마켓](https://loopmarket.co.kr/?industry=3) — COMPETITOR_TERMS: 사업장 중고 장비 직거래, 거래 수수료 0원 광고. 실제 거래 규모와 기타 유료 기능 미확인.
- [미엔느 다이렉트](https://miennedirect.com/) — COMPETITOR_TERMS: 출장 매입, 현장 즉시 지급 주장, 철거·원상복구 제휴, 위탁/보상판매. 매입 견적과 수수료 미확인.
- [희망리턴패키지](https://www.sbiz.or.kr/nhrp/cnsl/bsnsArngCnslInfo.do?cMenuNo=100201&directCall=Y&pMenuNo=100200) — PUBLIC_POLICY: 요건 충족 소상공인의 점포 철거·원상복구 비용 최대 600만원, VAT 제외 안내. 장비 매입/매각 보조금 또는 우리 수입으로 산정 금지.
- [온비드 입찰결과 목록](https://www.data.go.kr/data/15157252/openapi.do) — OFFICIAL_API_METADATA: 감정·낙찰가격 조회 가능. 원천 API 인증 자료는 아직 없음.
- [주문·정산 자동화 외주](https://kmong.com/gig/804138) — COMPETITOR_OFFER: 일회 제작 후 구독료 없음, 코드 전달, 30일 무상 대응, 서버형 별도 월 5천~2만원 안내. 실제 가격·매출 미확인.
- [업무정비소](https://kmong.com/gig/813435) — BUYER_REVIEW_CLAIM: 표시 리뷰 2건 중 한 리뷰는 사이트 조회·엑셀 정리 시간 1시간→5분이라고 진술. 독립 측정/반복 구독 확인 없음.
- [STAFF AI](https://staff.ai.kr/) — COMPETITOR_PRELAUNCH_OFFER: 업종별 MES 웹 무료, 현장 월 19만원/현장+사무실 29만원, 초기 세팅 50만원(VAT 별도), 유료 구독 준비 중 표기. 실제 유료 고객 수 미확인.

## Economics (hypothetical, not a matched spread)
| Scenario | cash contribution | economic contribution | maximum purchase for desired economic profit |
|---|---:|---:|---:|
| 콘티 호가 200만원·낙찰 126.6만원을 가정한 반증 | -16000 | -136000 | 830000 |
| 매각가 20% 하락·수리비 증가 | -646000 | -846000 | 120000 |
| 경량 위탁: 재고 없는 10% 수수료 가정 | 170000 | 90000 | -10000 |

The 734,000 KRW gross gap between third-party award display and an asking price does not establish tradable margin. The first scenario assumes the two are comparable solely to challenge the thesis. Fees, transport, repair, storage, risk reserve, and owner labor reduce it to a negative economic contribution. Second scenario tests lower resale value and higher repair cost; no expected value is claimed. C03 considers service-fee revenue only, not asset turnover. Taxes, funding and initial customer acquisition are not estimated.

## Decisions
- DF-009 HOLD: no speculative inventory or new generic marketplace. Existing professional collection, repair and warranties and zero-fee alternatives make an undifferentiated commission business weak. Research a narrow independently useful documentation/inspection coordination service only if suppliers actually pay for it. No claim of partner commission or access to grant money.
- DF-008 NO_GENERIC_BUILD: the reviewed automation task shows a specific pain, but a one-time custom automation offer undercuts subscriptions. Require a job with recurring changing inputs, decisions or exception resolution, and evidence that existing software and one-time scripts cannot solve it. A non-critical monthly exception report remains a hypothesis. 
- Gate: 공식 공매 동일 모델 20건, 독립 실매각 5건 및 순수령액, 비용·소유권·일련번호·상태·수량·부가세·판매기간 확인. 기존 연구 조건 유지. 독립 업체 3곳의 같은 월말 작업 원본/산출물(동의·익명) 및 2곳의 유료 의향. 일회성 납품 대비 지속 지불 이유 확인. 외부 접촉 전 겸업·이해상충 확인.

[Machine-readable ledger](../docs/data/recommerce-research-v1.json) · [research view](../docs/recommerce-research.html). Reproduce: python -m pipeline.recommerce_research. No customer contact, no API credentials or new official raw rows, no purchase, no change to canonical decisions.
