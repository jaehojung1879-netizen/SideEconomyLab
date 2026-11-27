# Procurement audit v1 — 2026-11-28 KST
Previous HEAD 519a5c416320f12d32983326ee6b6e0d7879c00e: all six native workflows passed. Do not merge before upstream PR #18. Research only.
## Competitor baseline
- [C01](https://www.ecount.com/kr/ecount/join/pricing): ERP 전 기능 월 4만원(VAT 별도); 가입비 별도.
- [C02](https://www.ecount.com/kr/ecount/product/purchasing_purchase-request): 복수 매입처 견적 요청 및 품목별 비교.
- [C03](https://www.ecount.com/kr/ecount/product/inventory_price-management): 품목/거래처 단가 관리 및 Excel 입력.
- [C04](https://www.ecount.com/kr/ecount/service/faq-view?page=415&record_sid=7WCJFB6TI9P3QPK): 구매현황 거래처별 소계로 저가 매입처 확인.
- [C05](https://support.microsoft.com/ko-kr/excel/import-data-from-a-folder-with-multiple-files-power-query): 동일 구조 여러 파일 결합.
- [C06](https://support.microsoft.com/ko-kr/excel/power-query-for-excel-help): 데이터 결합 및 그룹별 합계/평균/최소/최대.
Do not claim an AI advantage over ERP/Power Query. Generic dashboard/order SaaS remains NO_GENERIC_BUILD.
## Same advertised SKU 45322 (300m, 2-ply, 16 rolls)
| Source | displayed delivered price | evidence status |
|---|---:|---|
| [유한크린텍](https://yuhanshop.com/product/%EC%9C%A0%ED%95%9C%ED%82%B4%EB%B2%8C%EB%A6%AC-%EC%84%B8%EC%9D%B4%EB%B8%8C-%EC%A0%90%EB%B3%B4%EB%A1%A4-%ED%99%94%EC%9E%A5%EC%A7%80-300m-16%EB%A1%A4-%EB%B0%95%EC%8A%A4-45322/617/) | 76200 | UNCERTAIN_SOLD_OUT_TEXT; OPENED_CACHED |
| [유한라이프](https://newts.co.kr/product/45322-%EC%9C%A0%ED%95%9C%ED%82%B4%EB%B2%8C%EB%A6%AC-%EC%84%B8%EC%9D%B4%EB%B8%8C-%EC%A0%90%EB%B3%B4%EB%A1%A4-300m-2%EA%B2%B9-16%EB%A1%A4/1850/) | 63500 | UNCERTAIN_SOLD_OUT_TEXT; OPENED_CACHED |
| [킴벌리쇼핑 (11번가 가격비교)](https://catalog.11st.co.kr/pc/16630791?poc=pc&sortCds=DLV_INCLUDE) | 60000 | UNKNOWN; INDEXED_LIST |
| [유한킴벌리Shop (에누리)](https://price.enuri.com/catalog/9197093) | 46000 | UNKNOWN; INDEXED_LIST |
| [(주)디에스엠알오 (옥션)](https://stores.auction.co.kr/dsmrokorea/List?Category=39320000&CategoryType=General&DisplayType=SmallImage&IsFreeShipping=False&MaxPrice=0&MinPrice=0&Page=0&PageIndex=0&PageSize=60&SortType=MostPopular&isStarDeliveryItem=False) | 69570 | UNKNOWN; INDEXED_LIST |
Observed display range 46,000–76,200 KRW, 30,200 gap; endpoints are not matched executable quotes. No checkout, quote, B2B tax/quantity/availability or paid data. Price comparison site itself is the simple free baseline.
## Synthetic minimum viable audit
Two eligible invoice examples produce 35k/75k review differences independently; one missing shipping and one tax mismatch blocked. Alternatives with expired price, unavailable stock, or MOQ above requested quantity excluded. Quote quantity conversion exact; no automatic order, aggregation across invoices, actual savings or real inputs. Public observations never fed into fictional quote engine.
## Stop rule and proposal
Only test if three independent, nonfinancial private businesses supply consenting anonymized records after employment/COI checks and separate approval. Obtain 90-day actual purchase lines and same SKU written, current, delivered quotes. Compare independent reviewer vs existing ERP + Excel + ordinary price search, recording total analyst AND customer minutes, eligibility errors, confirmed realized savings net of switching/quality/returns and actual payment. A one-off fixed-price audit or transparent success-fee hypothesis first; no ongoing fee unless new opportunities recur across two later months. Do not infer savings from a quote, market price gap, or synthetic data. No further generic SaaS feature development. If user can obtain same result at similar effort or no independent paid demand, stop. No customer contact, orders, spend or change to approvals.
Reproduce python -m pipeline.procurement_audit. [Ledger](../docs/data/procurement-audit-v1.json).
