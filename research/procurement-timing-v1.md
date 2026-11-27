# Procurement timing feasibility — 2026-11-28 KST
Previous HEAD a36d520cbcdb6862b93630e5f17ba52587584519: 6/6 native checks passed. Research only.
## Building-to-purchase hypothesis: SOURCE_BLOCKED
National building API metadata monthly; Seoul catalog metadata daily but cached page shows no downloadable file and 2026-08-10 update. No actual API retrieval, first-publication history or stable building-to-purchase key verified. Do not use permit date as knowledge date.
## Public municipal notice pairs (retrospective positive examples)
| Buyer | Pre-spec date | Tender notice date | Calendar-day gap |
|---|---|---|---:|
| 부산 기장소방서 | [2025-12-02](https://www.busan.go.kr/nbgosi/view?curPage=2&gosiGbn=A&sno=75044) | [2025-12-15](https://www.busan.go.kr/nbgosi/view?conGosiGbn=&curPage=99&gosiGbn=A&sno=75289) | 13 |
| 부산 동래소방서 | [2025-12-02](https://www.busan.go.kr/nbgosi/view?curPage=2&gosiGbn=A&sno=75058) | [2025-12-09](https://www.busan.go.kr/nbgosi/view?curPage=1&gosiGbn=A&sno=75177) | 7 |
| 부산 중부소방서 | [2025-12-05](https://www.busan.go.kr/nbgosi/view?curPage=1&gosiGbn=A&sno=75132) | [2025-12-12](https://www.busan.go.kr/nbgosi/view?curPage=1&gosiGbn=A&sno=75273) | 7 |
Same buyer, service year and name, 56,625,000 KRW each in pre-budget and tender base. Manual semantic matches, not G2B ID-linked. Source date conflicts preserved in ledger; no inferred correction. Median date gap 7 days, range 7–13. Three selected positive pairs from same city and annual cycle, zero prospective observations, no denominator or actual award/payment. No measured advantage over free services. Do not extrapolate.
## Evidence
- [B01](https://www.data.go.kr/catalog/15136267/openapi.json) (OFFICIAL_METADATA): 건축HUB 월간 갱신, 이용허락범위 제한 없음. 행 최초 공개시각 및 실제 API 응답 미확보.
- [B02](https://data.seoul.go.kr/dataList/OA-22404/S/1/datasetView.do) (OFFICIAL_OPENED_CACHED): 페이지 메타 매일 1회, 2026-08-10 데이터 갱신 표시, 공공누리 1유형, 파일 없음. 캐시와 공통 종료 안내 포함; 실제 서비스 종료 여부나 현재 최신성 단정 금지. 행 단위 최초 공개시점 미확보.
- [B03](https://www.data.go.kr/data/15129462/openapi.do?recommendDataYn=Y) (OFFICIAL_INDEX): 발주계획 및 예정 발주시기. 계획 없이도 입찰/계약 가능.
- [B04](https://www.data.go.kr/data/15129437/openapi.do) (OFFICIAL_INDEX): 사전규격정보, 입찰 이전 규격 공개.
- [B05](https://www.data.go.kr/data/15129459/openapi.do?recommendDataYn=Y) (OFFICIAL_INDEX): 계약과정통합공개, 입찰/사전규격/발주계획/조달요청 ID를 통한 연결; 일부 단계 누락 가능.
- [B06](https://www.data.go.kr/data/15129394/openapi.do) (OFFICIAL_INDEX): 입찰공고와 변경이력.
- [B07](https://presignal.co.kr/) (INDEX_ONLY): 2026-10-02 기준 무료, 발주계획→사전규격→입찰→낙찰 연결 및 알림 자체 안내. 본문 재접근 실패; 성능/가격 현재 조건 검증 아님.
- [B08](https://aiops.didim.com/scout/ko) (INDEX_ONLY): 로그인 없이 발주예정/공고 검색 및 사전규격 본공고 알림 안내; 계정 필요 기능 별도.
- [B09](https://bid.infovista.kr/) (INDEX_ONLY): 발주계획·사전규격·입찰공고 기반 알림 및 검색 서비스.
- [B10](https://www.data.go.kr/data/15129468/openapi.do) (OFFICIAL_INDEX): 조달요청 서비스, 조달요청번호 등. 실제 API 행 미확보.
## Decision
Generic alert NO_GENERIC_BUILD. Building forecast remains SOURCE_BLOCKED. Previous 30-project prospective gate unmet (0/30), no score, no new prototype. Reopen only with lawful source retrieval, stable IDs, timestamped observation and defined independent outcomes, benchmark against calendar and free alerts. No real outreach, spending, procurement bid, merge or promotion. 
[Ledger](../docs/data/procurement-timing-v1.json).
