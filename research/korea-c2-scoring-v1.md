# Korea C2 Evidence + Provisional Scoring v1

Date: 2026-10-03

## Purpose

Apply the existing 100-point framework to the 12 KEEP candidates using currently verifiable Korean evidence.

Scores are **research-priority scores**, not ROI forecasts or probabilities of success. Evidence confidence is recorded separately.

## Result

### ADVANCE — 7

| Candidate | Score | Lane | Confidence |
|---|---:|---|---|
| OC-021 Industrial PPE / MRO vending | 82 | Transaction | Medium |
| OC-022 Narrow recurring B2B procurement operator | 78 | Transaction | Medium |
| OC-013 Instant photo / document printing kiosk | 74 | Location | High |
| OC-020 Specialty vending route | 74 | Location | Medium-high |
| OC-030 Hosted experience / event asset rental | 73 | Transaction | Medium-high |
| OC-008 Host-based luggage storage | 73 | Location | Medium-high |
| OC-001 Public / office private booth | 72 | Location | Medium |

### RESERVE — 5

- OC-024 Custom manufacturing RFQ operator — 71
- OC-010 Sports-equipment rental locker — 69
- OC-018 Workplace micro-market — 68
- OC-016 Laundry locker route service — 68
- OC-026 3D / personalization micro-production — 66

RESERVE means the next unit of research time has higher expected value elsewhere. It is not a rejection.

## Evidence-driven changes

### Manufacturing RFQ moved to reserve

The pain is real, but Korean operators already provide automated quote/DFM/order workflows. A generic human intermediary would be entering after much of the friction has already been digitized.

### Workplace micro-market moved to reserve

Office snack demand is real, but a major Korean incumbent publicly offers a Basic plan from KRW 50,000/month and Standard from KRW 150,000/month. A generic office-snack offer therefore has weak differentiation.

### Photo/document kiosk remains viable for location research

Current Korean kiosk purchase prices sit inside or near the project's pilot ceiling and operators support remote/hosted deployment. Competition is mature, so the remaining question is primarily site economics.

### Specialty vending remains viable for location research

Used hardware can fit the pilot envelope. The unresolved variable is not machine availability but product-location fit and host economics.

### PPE/MRO vending is the highest research priority, not a pilot authorization

The model combines recurring B2B consumables with authenticated dispensing and usage data. However, public hardware pricing and real SME host economics remain missing, so confidence stays Medium.

## Two-lane research design

### LOCATION lane
- OC-013 photo/document kiosk
- OC-020 specialty vending route
- OC-008 luggage storage
- OC-001 office/private booth

These depend heavily on under-served micro-markets. The next evidence source should be Seoul public data plus incumbent location mapping.

### TRANSACTION lane
- OC-021 industrial PPE/MRO vending
- OC-022 narrow recurring B2B procurement
- OC-030 hosted experience/event asset rental

These should not wait for a location model. The next evidence should be a narrow offer and a real buyer/host transaction test.

## Scoring weights

- Economics: 25
- Owner Fit: 25
- Demand & Distribution: 20
- Asset / Operations: 15
- Competition & Defensibility: 10
- AI / Data Leverage: 5

A 3-5 point difference at Medium confidence should not be interpreted as statistically meaningful.

## Next phase

1. Build `seoul-location-screen-v1` for the four LOCATION candidates.
2. Build one-page transaction-validation protocols for the three TRANSACTION candidates.
3. Do not purchase equipment yet.
4. Promote a candidate to pilot only after C3/C4 evidence materially improves confidence.
