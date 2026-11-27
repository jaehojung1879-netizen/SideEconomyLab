# Revenue-side frontier and stop gates — 2026-11-28 KST
Previous HEAD d35fc049de4daee7ed77f0a0adac8b409646af2c: six native workflows succeeded. Research only. Upstream PR #18 remains dependency. No customer contact, purchases or promotion.

## Market evidence
- [G01](https://salessecret.co.kr/) OPENED_CACHE: 신규 인허가 지도, 업종/기간 필터, 영업상태/엑셀, 월 18900원, 첫달 100원 프로모션. 자체 예시 전환율은 실적 아님.
- [G02](https://ncsp.kr/) INDEX_ONLY: 건축허가/착공 영업정보 및 팀 관리. 상세 재접근 실패, 가격 미확인.
- [G03](https://leadberry.taeonts.kr/service) INDEX_ONLY: 공공데이터 신규/변화 신호, ICP 추천, 입찰공고. 상세 재접근 실패.
- [G04](https://www.kotra.or.kr/subList/20000020753/subhome/bizAply/selectBizMntInfoDetail.do?cpbizYn=&dtlBizMntNo=24RP01A) OFFICIAL_OPENED: HS6 단순 해외기업 정보 무료, 취급기업 상세 10개사 20만원, 교신의사 바이어 1개사 15만원. 공공 지원 조건이며 민간 시장가격이나 확정 계약 아님.
- [G05](https://sales-agent.kr/) INDEX_ONLY: Starter 월 30만원, Professional 월 50만원; 리드 검색은 데이터 제공사 제휴 후 요금제 포함 예정이라고 명시. 실제 고객·매출 미확인.
- [G06](https://offer.io.kr/pricing) OPENED_CACHE: 4주 초기 세팅, 최소 1개월 계약, 3개월 이상 권장, 미팅 수 보장하지 않음. 영업 전과정 대행은 평일 개입 위험.
- [G07](https://kicox.or.kr/kfactory/business/axSupplySearch.do) OFFICIAL_INDEX: 산업단지공단 제조 매칭. 거래단가/MOQ 합의 등 계약에는 관여하지 않는다고 명시.
- [G08](https://development.capa.ai/) VENDOR_INDEX: CAPA 제조 파트너 탐색/견적. 고객사 1만여 자체 표시. 활성 고객 또는 거래액 아님.
- [G09](https://www.logisall.com/kr/sub/business/new/logisticsSolution.asp) VENDOR_INDEX: 유휴 창고 매칭 및 계약 통합 서비스.
- [G10](https://seoulppurihub.kr/pages/business/equipment.do) OFFICIAL_INDEX: 고가 공동 장비와 예약 시스템 제공.
- [G11](https://www.keti.re.kr/platform/business_co/business_co04_03.php) OFFICIAL_INDEX: 약 560종 연구장비 공동 활용 및 장비별 사용료.
- [G12](https://www.data.go.kr/catalog/15136267/openapi.json) OFFICIAL_METADATA: 건축HUB 건축인허가 REST, 월간 갱신, 2026-07-10 메타 수정. 원본행/공개시각 미확인.
- [G13](https://data.seoul.go.kr/dataList/OA-22404/S/1/datasetView.do) OFFICIAL_INDEX: 서울 건축인허가 기본개요, 착공예정/실제착공/허가/사용승인일. 원천 행 및 이력 수집 미실행.
- [G14](https://data.seoul.go.kr/dataList/OA-16094/S/1/datasetView.do) OFFICIAL_INDEX: 일반음식점 인허가, 검색 결과 갱신일 2026-11-15. 11-28 현재 13일 경과라는 표시 차이일 뿐 개별 행 공개 지연은 측정 못함.
- [G15](https://www.law.go.kr/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1000608516) OFFICIAL_LAW_INDEX: 식품위생법 시행규칙 제42조 영업신고는 영업 필요 시설을 갖춘 후 제출. 적용 예외 및 최신 조문 별도 확인. 신규 음식점 신고가 인테리어 선행 신호라고 가정하지 않음.
- [G16](https://sidexit.com/market/content) LIST_INDEX_ONLY: 인터넷신문 희망가 600만원, 주 12h 운영 표시, 연 광고수익 4천만원대 주장, 월매출/운영 잔여액 미입력. 상세 접근 실패. 광고 매출은 이익 아님.
- [G17](https://eummarket.com/market?mode=noowner) LIST_INDEX_ONLY: AI 행동훈련 SaaS 희망가 1500만원, 연매출 5000만원, 순익 비공개. 상세 접근 실패. 기존 연구 통상 자본상한 1000만원 초과.
- [G18](https://blog.acquire.com/acquire-com-biannual-acquisition-multiples-report-jan-2026/) MARKETPLACE_REPORTED_CLOSED: Acquire.com 자체 익명 확인 거래 2024/2025 SaaS 매각가격/연이익 중앙값 3.9배. 플랫폼 표본; 한국 소액 매물의 적정 가격 아님.

## Economic hurdle (assumption only)
Monthly economic profit target 1m KRW; 20h cap, fixed 4h and 100k cash, owner labor 40k/h. Sales volume at capacity is a hypothetical ceiling, not a forecast. L1 uses one competing listed subscription price; L2/L3 are pricing hypotheses, all cost/time estimates unverified. No acquisition or build cost or taxes.
| Model | Needed customers/jobs | Capacity | Max economic profit (KRW) |
|---|---:|---:|---:|
| 신규개업 정보 저가 구독 | 214 | 64 | 117600 |
| 산업별 고가치 정보 (가상) | 26 | 32 | 1308000 |
| 검증 거래처 연결 (가격 가상) | 26 | 8 | 140000 |

## Dispositions and re-entry rules
- REV-01 범용 인허가/영업지도 — NO_GENERIC_BUILD. 월 18900원 경쟁, 업종별 신고시점과 구매발주시점 다름. 영업신고는 일부 시공 이후. Reopen: 한 산업의 구매 이벤트를 실제 발주 이전에 포착하는 시점 증거 및 고객이 기존 서비스보다 유용하다고 검증.
- REV-02 산업별 구매시점 정보 — SOURCE_BLOCKED_DISCOVERY. 건축/착공 정보도 경쟁. 공식 기록일은 공개일이 아님; 과거 공개시각 및 실제 발주 라벨 없음. Reopen: 원문 사용조건 확인, 30개 이상 비개인 공개 프로젝트를 대상으로 최초 수집일 기록. 공개일→실제 구매공고/요청까지 시간차, 기존 검색/지도 대비 유효 기회 정밀도/누락/작업시간 측정. 미래 공개자료로 소급 예측 금지.
- REV-03 수출 바이어·제조 매칭 — HOLD. 공공 무료/유료 지원 및 민간 대행, 전문성·책임·평일 협의. 단순 업체 목록 경쟁력 부족. Reopen: 공공 지원과 기존 플랫폼에 없는 특정 반복 업무 및 독립 고객 유료 검증; 대량 연락처 수집·자동 발송 제외.
- REV-04 유휴 창고·장비 중개 — HOLD. 기존 상용/공공 예약·매칭. 사고·보험·계약·운송 위험. Reopen: 특정 장비 예약 불가 수요와 공급사 직접 계약/운영/보험 책임 확보. 부동산 중개 관련 규제 검토.
- REV-05 수익형 디지털 자산 인수 — HOLD_NO_ACQUISITION. 희망가·판매자 주장만 존재. 600만원 매물은 운영 12h/주(~52h/월), 1500만원 매물은 자본 상한 초과. Reopen: 12개월 실제 결제/비용, 유입 및 고객 집중/이탈, 이전 가능 권리, 4주 작업로그, 장애 대응 및 가격 24개월 회수 검증. AI 개선 미검증이면 가치 0으로 가정.

## Digital acquisitions
A 6m asking-price news site discloses 12h/week (52h/month using 52 weeks/12) and no monthly residual cash. Exceeds 20h/month. Annual reported advertising is not profit. A 15m asking-price SaaS with undisclosed profit is outside the ordinary cap. Neither is an actionable acquisition. Acquire.com median 3.9x annual profit is a market reference only, not a Korean valuation. At 7m divided by 3.9 and 12, implied monthly profit is about 150k before any further owner adjustment, if that multiple applied. No purchase or contact.

## Research backlog reset
Stop adding feature prototypes and new candidate pages until evidence changes. Keep procurement audit and catalog change review as discovery, Hardware24 as HOLD, prior OC-022 and OC-030 gates unchanged. One feasible desk-only next task: verify official project event source and capture release/first-observed timestamps, then construct a time-consistent comparison to public procurement publication dates for a narrowly defined nonfinancial industry. If release history, identifiers, or outcome labels unavailable, mark SOURCE_BLOCKED; do not publish a prediction score. A seller-side contract opportunity can be late even before opening; buyer decision date must be measured. No direct customer data without approval and employment/COI check.

[Machine-readable source ledger](../docs/data/revenue-frontier-v1.json). No new executable code; existing economics engine already sufficient for these arithmetic hurdles. 

## Follow-up: timing feasibility
[Procurement timing audit](procurement-timing-v1.md) records three retrospective municipal notice pairs and explicit source limitations. No 30-project gate pass; no additional prototype.

## AI-created demand follow-up
[AI-demand frontier](ai-demand-frontier-v1.md): distinguishes labor-rate work from independently priced validation, retains low-capital discovery, does not authorize a pilot. GEO generic build rejected.
