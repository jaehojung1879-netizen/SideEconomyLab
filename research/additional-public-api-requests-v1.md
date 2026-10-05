# Additional public API requests — v1

Only two incremental services are recommended. Existing store/building/R-ONE access already works; no additional key is required to review this Draft.

| Dataset | data.go.kr page | Decision use | Priority | Currently authorized? |
|---|---|---|---|---|
| 국토교통부_토지이용규제정보서비스 | [Verified portal dataset search](https://www.data.go.kr/tcs/dss/selectDataSetList.do?keyword=%EA%B5%AD%ED%86%A0%EA%B5%90%ED%86%B5%EB%B6%80%20%ED%86%A0%EC%A7%80%EC%9D%B4%EC%9A%A9%EA%B7%9C%EC%A0%9C%EC%A0%95%EB%B3%B4%EC%84%9C%EB%B9%84%EC%8A%A4) | Parcel-specific permitted/restricted activities and legal installation gate, alongside building/floor/host checks. | HIGH | UNKNOWN — catalog title verified by HTTP 200; authenticated operation not tested. |
| 국토교통부_상업업무용 부동산 매매 실거래가 자료 | [Portal dataset search](https://www.data.go.kr/tcs/dss/selectDataSetList.do?keyword=%EA%B5%AD%ED%86%A0%EA%B5%90%ED%86%B5%EB%B6%80%20%EC%83%81%EC%97%85%EC%97%85%EB%AC%B4%EC%9A%A9%20%EB%B6%80%EB%8F%99%EC%82%B0%20%EB%A7%A4%EB%A7%A4%20%EC%8B%A4%EA%B1%B0%EB%9E%98%EA%B0%80%20%EC%9E%90%EB%A3%8C) | Optional commercial asset-sale context; never a substitute for rent, a host quote or machine ROI. | MEDIUM | UNKNOWN — bounded `getRTMSDataSvcNrgTrade` probe for 11140/202609 returned HTTP 403; this does not establish whether the key lacks authorization. |

The verified land-use search distinguishes the information service from the separate legislation service. Direct dataset IDs were not conclusively verified; no guessed ID is presented. The sales probe uses the official API operation; its portal search link is a discovery link, not an independently captured dataset detail page. Public access failures were recorded without circumvention. Individually assessed land price adds little to this equipment/host decision and is not requested.

If these services are wanted, check portal service authorization and the exact current documentation before enabling collection. Do not paste a service key into the app or this report. Source audit: immutable `data/decision-intelligence` snapshots and `docs/data/decision-evidence.json`.
