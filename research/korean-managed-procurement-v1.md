# Korean managed procurement v1 — 2026-11-28 KST
Research only; expansion beyond hardware. No commercial or forecast approval. Previous HEAD 92bf0dd4132daecede056b332b1f48e47586cea6: five native checks passed; static GIS failed during dependency installation (exit 100), not a demonstrated source-code defect. Do not merge based on this status.

## Observations
- [KR01](https://wefuncorp.com/blog/wefun-pr2025sales) COMPANY_RELEASE_OPENED: 위펀 연결 2025 매출 1586억원, 영업이익 64억원, 자체 발표 활성 고객 1만+, 복수서비스 이용률 28%, 연 해지율 5% 미만. 연결·단독·제품별 수치 혼합 금지; 회사 자체 지표.
- [KR02](https://www.e-jcr.org/archive/view_article?pid=jcr-30-4-93) ACADEMIC_SEARCH: 중소 제조 주문자동화 질적 사례 연구: 반복 소모품 중심 도입, ERP/센서/인력 등 도입 장벽. 대표 표본 또는 한국 시장 수익성 입증 아님.
- [KR03](https://www.wurthindustry.kr/wis-korea/solutions/storage-management/storage-management/inventory-management.php) VENDOR_SEARCH: 맞춤 VMI 및 화스너 재고 관리 제공.
- [KR04](https://wefuncorp.com/officesupplies) VENDOR_SEARCH: 사무용품 보충·배송·반품·설비 비용 무료 주장.
- [KR05](https://www.cesco.co.kr/solution/service/hygienecare) VENDOR_SEARCH: 화장실 위생 소모품 직접 구매관리 또는 전문가 방문관리 선택.
- [KR06](https://yuhan-kimberly.co.kr/newsroom/newsview/3985) VENDOR_RELEASE_SEARCH: 소모품 예산 최적화 워크북·비용절감 계산기 무료 제공, 사용량 절감형 디스펜서. 실제 개별 고객 절감 미확인.
- [KR07](https://www.modumaket.com/shopinfo/company.html) VENDOR_SEARCH: 사업장 청소·위생용품 정기납품 상담.
- [KR08](https://toputong.co.kr/supply/seoul) VENDOR_SEARCH: 숙박·사업장 비품/청소용품 정기 공급, 직접 배송 지역 공개.
- [KR09](https://www.dtpack.co.kr/) VENDOR_SEARCH: 포장자재 규격별 단가/직납·화물·택배 정기 거래. 에어캡 5500원부터, 규격·수량·배송비 별도, 도매 마진 미확인.
- [KR10](https://www.orderlist.co.kr/) VENDOR_OPENED: 로스터리 납품업체용 주문·재고·거래명세·거래처 관리 무료, 자동 정산 PRO 월 19000원, PRO+ 36000원. 결제 수수료 별도 가능.
- [KR11](https://baljubom.com/) VENDOR_OPENED: 카톡/사진/엑셀 발주 AI 파싱 29000/89000원 월, 판매·재고·정산 9900원 월 VAT 별도 표기. SMS 외부비용.
- [KR12](https://baljupass.com/) VENDOR_SEARCH_ONLY: 가맹점 5개 무료 핵심 발주, 30개 월 9만원(프로모션 5만원). 페이지 재접근 실패.
- [KR13](https://mgrgo.com/) VENDOR_SEARCH_ONLY: 병의원 QR 차감·주간 발주안·정산; 재접근 실패. 실제 사용자/가격 미확인.
- [KR14](https://refer.cmcism.or.kr/center/bidding_view?seq=372) PUBLIC_NOTICE_SEARCH: 인천성모병원 5년 구매·물류대행 입찰: 창고 300평 이상, 연매출 300억원 이상 최근 3년, 주5일 배송, 대형병원 실적 등. 공고이며 낙찰/지급 아님.
- [KR15](https://www.kg-partners.co.kr/store-management/service) VENDOR_SEARCH_ONLY: 무인점포 정기청소 및 소모품 보충 요청시 실구매비 별도 청구. 페이지 재접근 실패.
- [KR16](https://www.orderlist.co.kr/) VENDOR_OPENED: 거래처별 가격/카카오톡 링크 발주 및 원부자재 소진속도 기반 발주시점 안내. 기존 공급사 활용 SaaS 자체도 경쟁 존재.

## Research queue (not a proven ranking)
- K01 포장·출고 소모품: DISCOVERY. Buyer: 소형 제조/온라인 셀러 자체 출고장, 지역 포장재 납품사. Candidate: OPP테이프·택배라벨·비식품용 완충재. Test: 공급사 기존 거래처의 예상 소진/규격 오류 검토, 직송. Falsifier: 부피·운임, 저가 쇼핑몰, 3PL 대체. Evidence: KR09, KR10, KR11.
- K02 다점포 청소·위생: DISCOVERY. Buyer: 청소업체 또는 5~30개 일반 점포 운영사. Candidate: 화장지·핸드타월·일반 청소포(화학제품 제외). Test: 지점당 사용량과 계약규격/단가 차이, 구매예외 월보고. Falsifier: 세스코·유한킴벌리·기존 공급사 무료 서비스. Evidence: KR05, KR06, KR07, KR15.
- K03 숙박 운영 비품: HOLD. Buyer: 소형 호텔·숙박 관리업체 또는 비품 납품사. Candidate: 일반 쓰레기봉투(종량제 제외)·청소포·화장지. Test: 객실 이용량 연동 소비, 기존 정기납품과 비교. Falsifier: 기존 직납, 현장 긴급 요청, 위생·일회용품 규정. Evidence: KR08, KR07.
- K04 고정 작업장 산업 소모품: DISCOVERY. Buyer: 금속가공·간판제작 소형 업체와 공급사. Candidate: 비안전 핵심 체결재·마스킹·포장용 테이프. Test: 기존 납품사 SKU 정합성/소진 예외. Falsifier: 전문 규격, VMI 경쟁, 납기 책임. Evidence: KR02, KR03.
- K05 사무실 간식·문구: NO_GENERIC_BUILD. Buyer: 소기업 총무. Candidate: 문구·사무 비품. Test: 일반 정기배송. Falsifier: 위펀 무료 설비·배송, 경쟁/낮은 객단가. Evidence: KR01, KR04.
- K06 로스터리·프랜차이즈 발주: NO_GENERIC_BUILD. Buyer: 납품사 또는 본사. Candidate: 일반 소모품(식품 제외). Test: 기존 발주·정산 프로그램 대체. Falsifier: 무료/저가 전문 SaaS 다수. Evidence: KR10, KR11, KR12, KR16.
- K07 병의원 재고: PARKED. Buyer: 의료기관. Candidate: 비의료 일반 사무비품 외 제외. Test: 의료재료 자동발주. Falsifier: 규제·환자안전·납기, 기존 전문 서비스/대형 입찰 기준. Evidence: KR13, KR14.
- K08 무인점포 운영비품: HOLD. Buyer: 기존 무인점포 관리업체. Candidate: 휴지·청소포·비규제 일반 비품. Test: 방문자 대신 관리사 구매예외 보고. Falsifier: 소모품 비용 별도 청구, 청소업체가 이미 보충. Evidence: KR15, KR07.

## Working capital and fees
Eight accounts each 1m KRW/month, owner 12h/month, 40k/h, fixed 100k/month, 300k capital amortized over 24 months. All assumptions; not quoted rates.
| Model | Monthly economic contribution | Cash gap proxy | Per-account spend needed for 1m target |
|---|---:|---:|---:|
| Direct resale 20% | 1,007,500 | 6,400,000 | 995,313 |
| Direct resale 10% | 207,500 | 7,200,000 | 1,990,625 |
| Supplier direct billing 5% fee | -192,500 | 0 | 3,981,250 |
| 5% + 99k service fee (15k service variable cost) | 479,500 | 0 | 2,301,250 |
Direct model assumes all residual cost prepaid and 30-day cash gap; this is a stress proxy, not a working-capital forecast. Agency model assumes direct supplier invoicing/collection and no goods financing; actual contracts may differ. No tax, sales time, acquisition, churn or unspecified risk priced.

## Decision
Existing supplier and customer data workflows first, not another generic order platform. Compare against current order tool + spreadsheet, supplier’s free service and no change. Focus on packaging, janitorial nonregulated goods, fixed workshop. Do not bypass employment policy or use employer data. 기존 OC-022 조건을 완화하지 않음. 3개 독립 구매자/공급사 사례의 3개월 익명 명세, 동일 SKU/단위/VAT/배송 조건, 현행 공급사와 대체수단 비교. 2개 독립 유료 의향은 거래 아님. 회사 겸업/이해상충 확인 후 별도 승인·사전등록. 납품사 직접 청구/직송, 재고 소유권 및 반품 책임 명확화. 실제 주간 긴급요청이 있으면 보류.

[Ledger](../docs/data/korean-managed-procurement-v1.json). Run python -m pipeline.korean_managed_procurement.
