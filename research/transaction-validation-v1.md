# Transaction Validation v1

Date: 2026-10-03

## Objective

Move the TRANSACTION lane from C2 desk/supplier evidence toward C3/C4 evidence **without buying equipment**.

Candidates:
- OC-021 Industrial PPE / MRO vending
- OC-022 Narrow recurring B2B procurement operator
- OC-030 Hosted experience / event asset rental

This protocol deliberately tests payment paths before capex.

---

# 1. Core design decision: OC-022 first, OC-021 second

OC-021 and OC-022 target the same underlying operational problem:

> small and midsize worksites repeatedly consume low-value MRO / PPE items, while purchasing, stock checks, distribution and reconciliation consume disproportionate staff time.

Large incumbents validate the problem but also make a generic MRO web shop unattractive.

SERVEONE describes MRO as many suppliers, low item-level spend and irregular purchasing, and sells integrated sourcing / purchasing-process visibility.

Source:
https://www.serveone.co.kr/kr/purchasing-service/mro.do

Korea e-Platform similarly characterizes MRO as many suppliers, frequent orders, low item-level value and a need for delivery/process efficiency.

Source:
https://www.koreab2b.com/main/sub02/sub02_mro_2016.do

The 2026 SME MRO buyer-matching program separately confirms an active Korean market of SME MRO suppliers and institutional buyers across 17 product groups.

Source:
https://fanfandaero.kr/portal/v2/preSprtBizPbancDetail.do?groupNo=%27%29%3B&sprtBizCd=202618010200&sprtBizTrgtYn=N

## Wedge

Do **not** launch a general MRO catalogue.

Start with:

### "Safety Consumables Replenishment Desk"

Target:
- 10-100 employee light-manufacturing / repair / fabrication / logistics worksites in Seoul metro;
- no dedicated procurement team, or procurement handled by admin / site manager;
- repeated use of simple, non-regulated consumables.

Initial SKU family:
- work gloves;
- disposable gloves;
- masks / dust masks where legally appropriate;
- earplugs;
- safety glasses;
- wipes / shop towels;
- tapes;
- cutter blades;
- cable ties;
- simple cleaning consumables.

Exclude in v1:
- prescription / medical products;
- regulated chemicals;
- specialized certified safety equipment where wrong specification creates material safety risk;
- custom engineered components;
- emergency-critical spares.

Customer job:
1. stop checking 5-10 vendors;
2. stop noticing stockouts too late;
3. consolidate repeat orders;
4. receive one scheduled replenishment / invoice;
5. later, if needed, track employee-level issuance.

## Why procurement before vending

The asset-light service can reveal:
- actual monthly spend;
- SKU velocity;
- reorder interval;
- price sensitivity;
- delivery density;
- stockout frequency;
- whether issuance control is a real pain.

Only sites with real issuance-control pain graduate to OC-021.

This avoids buying a dispenser to discover that the customer only wanted cheaper gloves.

---

# 2. OC-022 transaction test

## Offer hypothesis

"Give us your 10-20 repeatedly purchased safety / shop consumables. We consolidate the quote, remember the reorder pattern and deliver on a fixed cadence."

The first test is manually operated. No software product is required.

## Customer economics to discover

Do not promise a fixed saving rate.

Collect:
- current SKU;
- brand/spec;
- monthly quantity;
- current unit price;
- shipping;
- number of monthly orders;
- number of suppliers;
- staff time spent ordering / checking;
- stockout incidents.

Then obtain supplier quotes and calculate:

`gross contribution = customer invoice - purchase cost - shipping / fulfillment - payment cost`

## Commercial hypothesis — not a sourced market fact

Initial screen:
- minimum recurring basket worth testing: KRW 300k/month;
- target gross margin before owner labor: >=15%;
- preferred delivery cadence: weekly or less frequent;
- preferred customer density: multiple sites on one route or parcel-direct supplier fulfillment.

These are validation thresholds, not promised terms.

## Outreach sample

> 사업장에서 장갑·마스크·와이퍼·테이프 같은 소모품을 여러 곳에서 반복 구매하고 계신지 확인하고 있습니다.  
> 10~20개 반복 품목만 대상으로 현재 구매내역을 기준으로 통합 견적과 정기보충안을 만들어드리는 소규모 테스트입니다.  
> 별도 시스템 도입이나 장비 구매는 없고, 현재 방식보다 가격이나 관리가 나아지는 경우에만 실제 주문을 진행합니다.

## Evidence ladder

### C3 interview gate
Complete 15 buyer interviews.

Required:
- >=8 report repeat MRO/PPE purchasing at least monthly;
- >=5 can show or describe a recent real basket;
- >=5 identify a pain beyond "price would be nice".

If not met: narrow or kill the segment.

### Quote gate
Obtain 5 anonymized real baskets and supplier-source them.

PASS:
- >=3 baskets can plausibly produce >=15% gross margin after ordinary fulfillment; **or**
- buyer explicitly values consolidation enough to accept a lower saving / service premium.

FAIL:
- commodity price competition removes margin in >=4/5 baskets and buyers report no operational pain.

### C4 transaction gate
Seek:
- >=3 concrete trial proposals;
- >=2 written trial intents or purchase-order-ready confirmations;
- >=1 paid order.

No inventory stockpile before the first paid order.

---

# 3. OC-021 vending / controlled dispensing upgrade

Do not independently prospect vending machines in v1.

Ask OC-022 interviewees:

1. Who physically hands out PPE today?
2. Is usage recorded?
3. Are items taken outside staffed hours?
4. Do you see over-consumption / unexplained usage?
5. Does a supervisor spend time distributing items?
6. Have stockouts stopped work?
7. Would employee authentication / per-person limits matter?

## Upgrade trigger

Only request machine quotes for a site when all are true:
- recurring consumable spend is material;
- issuance / access control is a stated problem;
- buyer can identify an installation point;
- electricity/network/security constraints are manageable;
- buyer is willing to discuss a written trial.

## Equipment gate

Do not purchase hardware until:
- >=2 sites reach written trial intent;
- supplier provides real hardware + software + installation + maintenance quote;
- downside recovery / resale is understood;
- expected site contribution supports <=24 month downside payback;
- owner interruption is expected <=2 unplanned weekday incidents/month.

Possible commercial structures to compare:
1. customer buys machine; operator supplies consumables;
2. monthly machine rental + consumables;
3. free/low-cost placement with minimum monthly consumable commitment.

No structure is selected before real quotes.

---

# 4. OC-030 event asset: sell first, own later

Current Korean public pricing shows a broad service range.

SELPIC advertises event photo-kiosk rental from KRW 300k/day including installation/removal and remote monitoring.

Source:
https://selpic.kr/events

Chiki advertises a branded AI photo-booth package at KRW 1.0m/day in Seoul/Daegu/Busan, including transport, installation/removal, consumables, custom UI/frame and remote support.

Source:
https://chiki.ai/rental/ai-photo-booth

Chiki's purchase prices start around KRW 6m-9m before VAT depending on model.

Source:
https://chiki.ai/product

This proves a transaction category exists, but it also proves generic photo-booth rental is competitive.

## v1 test

Do not buy a booth.

Act as a packaged-event seller / broker only after obtaining supplier terms.

Target buyers:
- company HR / culture teams;
- corporate marketing teams;
- conference / seminar organizers;
- schools / associations;
- event agencies needing overflow capacity.

Offer concept:
### "Branded Event Memory Station"
One quote covering:
- booth / experience;
- custom event frame / branding;
- transport;
- setup / removal;
- remote or on-site support;
- optional lead / survey capture only with appropriate consent.

The asset itself may be subcontracted.

## Supplier gate

Obtain >=3 comparable supplier quotes including:
- net partner / reseller price if available;
- transport;
- setup/removal;
- consumables;
- staffing;
- cancellation;
- failure response;
- lead time.

Do not advertise a fixed retail price until this is known.

## Buyer gate

Test with 20 qualified buyers.

PASS:
- >=4 request an actual quote for a dated event;
- >=2 proceed to concrete scope/date discussion;
- >=1 pays a deposit / places an order;
- expected gross contribution >=KRW 150k/event;
- owner scheduled work <=2 hours/event excluding outsourced logistics;
- no required owner attendance during the event.

FAIL:
- buyer demand is only generic price shopping;
- supplier spread leaves <KRW 100k contribution;
- owner must personally transport/install/stand by;
- no real quote request after 20 qualified contacts.

## Ownership gate

Only evaluate buying an event asset after:
- >=3 paid subcontracted events;
- same asset type repeats;
- annualized observed demand supports ownership;
- purchase-vs-subcontract model shows <=18 month base payback and <=24 month downside payback;
- storage/logistics can be outsourced or batched.

---

# 5. Sequence

## Week 0 — compliance
Before external commercial outreach:
- verify employer moonlighting / outside-business rules;
- avoid employer customers, customer lists, internal systems and confidential information;
- decide whether testing is interview-only until formal approval is clear.

## Week 1 — MRO discovery
- source 30 public target companies;
- contact 15;
- conduct 8-15 interviews;
- collect up to 5 anonymized real baskets.

## Week 2 — MRO quote test
- obtain supplier quotes;
- calculate basket-level gross contribution;
- return 3 real trial proposals;
- seek first paid order.

## In parallel — event asset
- obtain 3 supplier terms;
- create one standardized offer;
- contact 20 qualified event buyers;
- do not own equipment.

# 6. Decision

The project should prefer **proof of transaction over more scoring**.

A candidate advances when someone with a real current need supplies operational data, requests a quote, signs trial intent or pays.

Compliments, survey interest and "sounds useful" do not advance evidence confidence.
