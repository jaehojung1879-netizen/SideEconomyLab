# Global Opportunity Discovery v1

Date: 2026-10-03

## Purpose

Build a broad, evidence-backed opportunity universe before scoring or committing capital.

This phase deliberately does **not** pick a winner. It collects observed business deployments and normalizes them into comparable opportunity clusters.

## Coverage

- 102 observed deployment cases
- Korea: 39 cases
- Japan: 24 cases
- US: 16 cases
- Global / cross-market: 22 cases
- US/Australia: 1 case
- 30 normalized opportunity clusters

A "case" here is an observed deployment pattern, not necessarily a unique company. One operator can support multiple distinct cases when the same system is deployed in materially different environments or with different economics.

## Source standard

Preference order:
1. operator / manufacturer / public-sector primary source
2. official institutional or company release
3. specialist industry source where primary evidence is unavailable

Every row in `global-case-registry.csv` carries its source URL and observation date.

## Early structural findings

### 1. Hosted beats standalone surprisingly often

A recurring pattern is **asset + somebody else's foot traffic**:
- photo-print kiosks inside clinics, cafés and retailers;
- laundromat equipment inside convenience stores;
- rental stations in transit / hospitality locations;
- vending / coolers inside workplaces, apartments, hotels and hospitals.

The economic implication is important: the first question is often not "what store should we lease?" but "which host already owns the customer flow?"

### 2. Network businesses can be attractive but poor first pilots

Power-bank and umbrella sharing look operationally elegant, but their customer value improves sharply with network density and cross-location return. A one- or two-node test can therefore understate the mature model while still being a poor use of first-pilot capital.

### 3. Route businesses deserve a dedicated branch of research

Vending, office pantry, smart coolers, laundry lockers and equipment lockers share a common operating form:

`many small endpoints -> scheduled replenishment / collection route -> centralized monitoring`

This may fit a full-time worker better than a staffed shop **if** service cadence is weekly-ish rather than daily and if emergency calls remain rare.

### 4. Physical-digital hybrids are more interesting than "AI businesses"

The strongest AI role is usually behind the business:
- remote access;
- inventory / usage visibility;
- anomaly detection;
- dynamic pricing;
- route planning;
- maintenance triage;
- automatic reordering.

The customer is paying for a physical outcome, not for AI.

### 5. B2B recurring operators remain in scope

SERVEONE, Sikbom and Xometry demonstrate a different path from micro-assets: own little or no consumer-facing real estate, but remove procurement/RFQ friction and earn on repeated business transactions.

This direction deserves to remain in the lab because it can start with less capital, although it risks becoming labor-heavy unless the niche is standardized.

### 6. Korea already has a large smart-equipment supply ecosystem

The Small Business Smart Shop program explicitly recognizes categories such as 3D equipment, smart coaching, access authentication, AI CCTV, energy management, smart mirrors, vending, robots and kitchen automation. This is useful not as proof that each business is good, but because equipment availability and supplier competition may lower pilot friction.

### 7. The coin-karaoke example is a valid archetype, not a conclusion

Korean suppliers provide coin-karaoke systems with remote room and revenue monitoring, and TJ Media has publicly described continued coin-karaoke expansion. It belongs in the universe as a short-duration private-room model. We should not let the original anecdote bias the broader search.

## What is intentionally not done

- no 1-to-30 ranking;
- no 100-point scores;
- no revenue projections;
- no Seoul heatmap;
- no API ingestion;
- no pilot authorization.

All normalized candidates remain C1 desk-research hypotheses.

## Next phase

`korea-feasibility-screen-v1`

For the 30 normalized candidates:
1. verify Korean legal / licensing constraints;
2. collect real equipment or setup price ranges;
3. estimate owner interruption and service cadence;
4. identify whether a standalone lease is necessary;
5. verify resale / reversibility;
6. identify direct Korean substitutes;
7. obtain first-pass host / supplier economics where public;
8. then apply the existing 100-point framework.

Only after that should we select roughly 8-12 candidates for Seoul data screening and field interviews.
