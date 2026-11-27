# Distribution evidence and existing asset audit — 2026-11-28 KST
## TOPDA read-only audit
Commit fe2d92df13d9d164f5918dfdd71b197b225353bd in jaehojung1879-netizen/TOPDA: 768 tracked files, 407 HTML in site/, 115 loc entries (115 unique) in four sitemap children. Not indexed pages or traffic. GA4 and Naver IDs configured in source; event instrumentation exists, not proven delivery. No credentials or measurement IDs retained. No GA/GSC/AdSense account access; visits, conversion, paid sales, current approval unknown. Historical July AdSense remediation report describes prior template-heavy generated output and index restrictions; do not compare generated counts with tracked files. Cached public homepage is four months old, live sitemap fetch unsuccessful. TOPDA unchanged.
## External evidence
- [Source](https://developers.google.com/search/docs/essentials/spam-policies): Scaled content created primarily to manipulate ranking rather than help users is spam.
- [Source](https://developers.google.com/webmaster-tools/v1/searchanalytics/query): Search Console returns clicks/impressions/position and may omit rows.
- [Source](https://chartmogul.com/reports/saas-go-to-market-report/): 2025 2500 SaaS companies: among sample low ASP self-serve associated with faster growth, not causal estimate or our CAC.
- [Source](https://blog.acquire.com/bootstrapped-profitable-and-acquired-in-four-days/): Founder interview: Helploom reports Reddit threads via high-intent searches most useful after SEO/ads; no numeric CAC or revenue verification. No unsolicited promotion recommended.
- [Source](https://blog.acquire.com/the-genius-sheets-acquisition-story-no-vc-just-profit/): Marketplace founder story on nights/weekends financial reporting SaaS, no verified unit economics in search excerpt.
Survivorship bias: founder interviews do not establish profitability distribution or replicable acquisition cost. Existing users and intent matter; content, partner access and direct referrals are candidate routes, not verified demand.
## Reverse economics
Monthly target 1m, fixed cash 100k, fixed 4h, labor 40k/h, 20h cap. Advertising RPM 2k/5k/10k requires 630k/252k/126k pageviews, ignoring incremental work. Digital product 69k, variable12k, 10min/order: 26 fulfilled sales needed, max96; 0.5/1/2% session conversion requires 5200/2600/1300 relevant sessions. Partner job contribution150k, 1h/job: 12 paid jobs, max16; 5/10/20% qualified-lead conversion requires 240/120/60 leads. Assumptions only, not market benchmarks. Acquisition work for lost leads and development not priced; all ceilings optimistic. No ads or product build.
## Required measurement
- Search Console performance: page, query, clicks, impressions, CTR, average position; separate totals, anonymized/omitted rows acknowledged
- GA4 landing page / session source-medium, sessions, engaged sessions, calc_complete and calculator_run separately, outbound_click; no raw user ids or sensitive params
- AdSense aggregate earnings / pageviews if active; payment status and cost aggregate
Use 90 complete days and separate prior window. Measure customer cash and owner labor, not just clicks. No sensitive exports or raw user data in public repo. No commercial activity or employer data.
## Decision
First read aggregate export and find actual high-intent landing pages; compare existing TOPDA traffic with nonfinancial product relevance. If traffic absent, no new product or ads. For OC-022/030 use existing field gates; no additional outreach. Partner acquisition requires consent, transparent affiliation and approved scope.
Existing OC-022 and OC-030 budget/gates unchanged. No new canonical promotion, no build. [Ledger](../docs/data/distribution-evidence-v1.json).
