# Candidate validation portfolio v1

2026-10-05 KST · 판단 단위: 후보 사업 가설 · **잠정 / 현재 공개 C2 재확인 대기**

다음 현실 검증은 **OC-022 반복조달**, 그리고 **OC-030 외주 행사 패키지의 공급 조건 확인**에 배정한다. 반복조달은 실제 구매 바스켓으로, 행사는 동일 사양의 외주 순견적으로 약한 가설을 구매 없이 반증할 수 있다. 두 후보가 좋은 사업이라는 결론이 아니다. 이 PR은 인터뷰·견적·무예치 RFQ 계획이며 장비·임대차·예치금·재고·광고·파일럿을 승인하지 않는다.

[의사결정 보드](../docs/validation.html) · [기계 판독 상태](../docs/data/candidate-validation-portfolio.json) · [실험 도구](../field/candidate-validation-instruments-v1.md)

## 1. 실제 저장소 기준과 증거 경계

원격 main을 `git ls-remote origin refs/heads/main`과 `git fetch origin main`으로 확인했다. 출발점은 **18e213b86bd42d61052925996fa59878de0c9e21**, PR12 merge `36456448afa2abd492858353cece8a608f62adc3` 다음의 Seoul GIS refresh다. 전달 SHA를 main으로 가정하지 않았다.

판단의 우선순위는 [헌법](../docs/research-constitution.md), [연구 철학](../docs/research-philosophy.md), [공통 scoring](scoring-framework.md), [정규화 후보](normalized-candidates-v1.csv), [canonical registry](../docs/data/candidate-registry.json), [기존 한국 C2](korea-c2-evidence-v1.csv), [거래 프로토콜](transaction-validation-v1.md), 실제 현장 기록이다. `opportunity-registry.csv`는 SE-xxx archetype의 초기 빈 기록으로, OC-xxx canonical 후보를 대체하지 않는다. 후보 이름/lane 정의는 registry에만 두고 새 상태는 ID로 연결한다.

[global cases](global-case-registry.csv)의 GC-001/009는 해외 부스 배포, GC-025/030은 host 짐보관, GC-041/050/097은 사진/출력 배포, GC-069–076은 공급/구매 모델의 유사 사례다. 배포 사례의 수는 한국 신규 사업의 순이익·호스트 승인·고객 의향이 아니다. [v3](../docs/opportunity-intelligence-v3.md)의 수요·검색 공급/사분면과 [부동산 맥락](../docs/real-estate-context-foundation-v1.md)의 시장 통계도 사업 검증과 별개다. 기존 실제 사이트/건물 스키마를 읽었으며 새 사이트·건물·좌표는 생성하지 않았다.

**신규 현재 공개 C2 수집: 0건.** 14개 공급자/공공 URL 요청이 모두 proxy tunnel 403으로 차단됐다. GitHub API와 지도 CDN도 차단됐다. 아래 가격은 저장소에서 2026-10-03 관측으로 기록한 **과거 공개 주장**이며 이번 작업의 현재 웹 검증·협상 견적이 아니다. 각 source_id에는 원문 URL, 실제 기존 관측일, repository reference, 재접근 시도/접근상태, caveat가 들어 있다. `rechecked_at`은 성공 관측일이 아니다. 링크는 문법/로컬 참조까지 검사할 수 있지만 외부 접근 유효성·최신 내용은 미확인이다. 접근 복구 후 가격/규격/현재 공급/규제/중고거래를 재검증해야 한다. 장비 판매 호가는 resale evidence가 아니다.

현장 로그는 헤더만 있고 인터뷰/의향/주문 행이 없다. **등록된 C3/C4/C5: 0**. 활동이 외부에서 있었는지까지 단정하지 않는다. 과거 문서가 C1 또는 HIGH라고 표기한 것은 현재 C3를 뜻하지 않는다. 이번 상태의 C2는 *제한된 공개 supplier/competitor 자료*, 실제 견적 수준이 아니다. 원래 scoring 72–82점은 과거 screening 가정으로 보존하지만 이번 순위에는 사용하지 않는다.

## 2. 현재 증거와 frontier

OBSERVED/SOURCED FACT는 원문 확인을 재현할 수 있는 외부 관측이며, 이번에는 저장소의 과거 sourced claim만 상속했다. DERIVED SIGNAL은 그 근거에서 추론한 결론, ASSUMPTION은 아직 관측 없는 설계 가정, UNKNOWN은 적절한 근거 없음, REAL-WORLD EVIDENCE REQUIRED는 대면/회신/실제 행동 없이는 풀리지 않는 질문이다. 일곱 후보 모두 canonical 상태의 inventory에서 다섯 층을 분리한다.

| 후보 | 현재 수준 / 가장 강한 근거 | 결정 / 이유 | 가설을 죽이거나 진전시키는 질문 |
|---|---|---|---|
| OC-022 | C2: 국내 통합 MRO 경쟁자 모델; 표적 SME pain·바스켓 없음 | **ADVANCE NOW**, 선정. 재고 없이 실바스켓/공급견적으로 확인 가능 | 15명 중 반복구매/비가격 불편이 있는가? 5개 실제 바스켓 중 3개에 이행 후 15% 마진과 일정 배송이 가능한가? |
| OC-030 | C2: 공개 행사 패키지/가격; 순파트너 조건 없음 | **CHEAP TEST FIRST**, 선정. 공급 gate 실패면 buyer 영업 전에 중단 | owner 운송/현장 장애 없이 외주 가능한가? 이후 실제 날짜 있는 RFQ와 모든 비용 후 기여가 있는가? |
| OC-013 | C2: 기본가·출력 소매가·호스트 모델; 장당/host economics 없음 | **CHEAP TEST FIRST**, 미선정. OC-030과 공급사 질문 공유 가능; 다음 budget 경쟁자 | 사진 출력 한 job에서 장당 기여가 남는가? 호스트는 incumbent 무료설치 대신 왜 이 구조를 택하는가? |
| OC-001 | C2: 홈/개인/노래 부스 단서; 한국 상업 통화 서비스는 C1 수준 | **HOLD**. 장비 용도 전용 금지; cost/host/통화 지불가치 미확인 | 상업용 완전 견적이 정상 ceiling에 들어오는가? 구체적 통화 부족+무고정임대 host가 있는가? |
| OC-008 | C2: 운영자 가격·기존 공공 공급; host 순기여 없음 | **HOLD**. generic 역세권 선임대/락커 구매형은 archive; oversize/group overflow만 남김 | 현재 대체재가 실제로 거절한 같은 유형 짐이 있는가? 기존 직원·보험·배상·host economics로 가능한가? |
| OC-020 | C2: 중고 단일 호가; 상품/수요는 C0–C1 | **HOLD**. 정확한 SKU 없이는 사업 실험 정의 불가 | 편의점/온라인 대체 실패가 있는 한 SKU는 무엇인가? 주간 보충/규제 확인으로 운영 가능한가? |
| OC-021 | C2: QR/직원 인증 지급 모델; 가격/통제 pain 없음 | **DEPENDENT**. OC-022 성공과 지급통제 필요가 먼저 | 고객은 단가 대신 통제/발급 job을 원하는가? 두 사이트가 설치·지원/보안 책임을 논의하는가? |

세 번째 후보를 억지로 선정하지 않는다. OC-013은 OC-030 supply inquiry에 같은 supplier가 있을 때 추가 질문만 얻을 수 있지만 별도 host 인터뷰/설치 작업은 이번 2개 후보 예산을 쓰지 않는다. OC-030이 공급 gate에서 탈락하면 OC-013로 자동 전환하지 않고 남은 예산을 보고 사람이 frontier를 재심사한다.

## 3. hard gates가 점수보다 먼저다

모든 후보의 hard gate 상태는 `UNRESOLVED_NO_PILOT`이다. `AVOIDED_BY_DESIGN`은 **정보수집 실험에서** 비용/임대/재고를 회피했다는 의미이며 사업의 PASS가 아니다. `CONDITIONAL`은 운영 설계 가설, `UNKNOWN`은 미확인, `PLAUSIBLE_UNPROVEN`은 기존 결제 시장만 확인한 것이다. 중앙 법적 허가 미해결이면 상업 현장 검증에 진입하지 않는다. 질문·규격/법적 범위의 정보수집만 진행할 수 있다.

| 후보 | 핵심 gate 위험 | 비용·고정임대·회수·이행 경로 |
|---|---|---|
| OC-001 | 환기/화재/건물 용도/접근성·상업 사용; 잠금/환기 장애 출동; free room 대체 | 독립 임대 제외. 홈 가격은 commercial total 아님. 재판매/매입보장 UNKNOWN. AS 책임이 supplier/host에 없으면 FAIL. |
| OC-013 | 보충·프린터 장애·사진/문서 데이터 삭제·사용 범위 | 선임대 제외. 일부 장비 base가 선호 3–7m 범위를 넘고 설치 전부터 normal 10m에 근접. host 조건과 monthly license가 UNKNOWN. |
| OC-020 | SKU 자체 미정으로 판매·인증 요건도 미정; 상품별 폐기/긴급 보충 | 저렴한 중고기가 downside fit을 보장하지 않는다. 실제 중고 매입/회수·호환성 UNKNOWN. |
| OC-008 | 분실/배상·인수인계·야간 요청; host 직원 노동 | 짐 수에 따라 host 노동 증가. owner가 접수하거나 긴급 응답하면 owner fit 실패. 보험/책임·host fee UNKNOWN. |
| OC-022 | 개별 RFQ/포장/배송이 선형 노동; 당일 delivery·정확 규격·결제/반품 | 조사 중 재고/여신/거래 없음. 직송·예약 배송만. 인증 PPE/의료/화학/긴급부품 제외. 장당/주문당 시간 측정 없이는 owner fit 미통과. |
| OC-021 | 장애 시 안전용품 접근 문제·보안/직원 데이터·최소약정 | quote/payer/AS/회수 조건 전부 미확인; OC-022 없이 장비 발굴 금지. 고객 소유/렌탈/공급약정은 선택된 구조 아님. |
| OC-030 | 행사시간 즉시 장애 대응·주말 운송·취소·개인정보/초상·보험 | owner logistics 필수면 FAIL. 공급자 서면 이행/SLA 없이 판매 금지. 순견적/여신/취소 노출 UNKNOWN. ownership은 후속 3 paid events 전 금지. |

공통으로 고용주 겸업/이해상충 정책, 사업자·세무·계약/보험, 개인정보, 상품/사이트별 공식 허가를 판매/설치 전에 확인한다. 이 문서는 법률 판단이 아니다. 공개 정부 원문에 접근하지 못해 규제 cleared라고 표시하지 않는다. 공공 리드 경로와 operator 모델만으로 employer clearance·buyer 의향·법적 적합성은 결정할 수 없다.

100점 framework의 Economics 25, Owner Fit 25, Demand/Distribution 20, Asset/Ops 15, Competition 10, AI/Data 5를 그대로 사용한다. 경제성은 UNKNOWN, owner/배포/운영은 근거를 적은 정성 provisional, AI 노동절감은 assumption, 총점은 **null**이다. UNKNOWN을 0점으로 바꾸지 않았다.

## 4. 유용한 경제적 경계만

아래 값은 과거 공개 페이지에 대한 기존 저장소 주장이며 현시점 확정 범위가 아니다. 같은 용도/범위가 아니면 최저·최고 가격 하나로 묶지 않는다. 완전 견적과 supplier net/host 조건 없이는 contribution도 계산하지 않는다.

| 후보 | SOURCE FACT(상속) | 의미와 남은 UNKNOWN |
|---|---|---|
| OC-001 | K-zone 개인/홈 265만원; 다른 singing 부스 463–803만원 [S-BOOTH] | commercial call job/인증결제/환기/설치/AS 총비용 아님 |
| OC-013 | SELPIC 모델별 VAT 포함 550/770/990만원 [S-PHOTO]; 4×6 시작 1,000원 [S-PRINT] | 문서/촬영 job 섞지 않음. 소모품/결제/host share/고정비/폐기율 없음 |
| OC-020 | 냉장 중고기 250만원 한 건 [S-VEND] | 재고·실거래·제품 적합성·잔존가치·최종 acquisition UNKNOWN |
| OC-008 | Radical 서울 과거 가방/일 5,100원부터 [S-LUGGAGE] | 수수료/host share/보험·인수 노동 전; 가격은 수요량 아님 |
| OC-022 | MRO 통합 서비스 모델 [S-MRO/S-MRO2] | SKU 매입가·판매가·이행비·신용/반품비 미확인으로 contribution UNKNOWN |
| OC-021 | QR 지급 모델 [S-DISPENSE] | 장비/소프트웨어/설치/지원/월약정 가격 UNKNOWN |
| OC-030 | SELPIC 30만~, Chiki 100만, PhotoQ 99–132만원/일 [S-EVENT/S-CHIKI/S-PHOTOQ] | 다른 묶음; 가격차는 중개 마진 아님. 동일 실제 dated job의 net quote 필요 |

**ESTIMATE / 명시적 가정:** Chiki 과거 VAT 별도 base 600/700/900만원에 VAT 10%를 가정해서 더하면 **660/770/990만원**. 소프트웨어·설치·보관·운송·재판매는 UNKNOWN이며 실제 세무 처리/견적 확인이 필요하다. 정상 pilot ceiling과 acquisition base만 비교하는 경계이며 purchase 권고가 아니다.

다음 견적 계산은 실제 받은 입력으로만 한다:

- 사진 기여/건 = 실제 고객 가격 − 소모품/불량 − 결제료 − host share − 건당 지원/보충비.
- MRO 기여/바스켓 = 실제 제안 매출 − 정규격 매입 − 배송/fulfillment − 결제 − 알려진 반품/재작업 비용. 마진 = 기여 / 해당 바스켓 제안 매출; VAT 처리 양쪽 일치. owner 노동 전 기여와 실제 분/주문을 별도로 평가한다.
- 행사 기여/건 = 같은 dated job의 buyer 가격 − 순공급가 − 포함 안 된 물류/소모품/결제/지원/보험/알려진 취소 노출 비용. 알 수 없는 필수 비용이 있으면 UNKNOWN이다.
- 실제 고정비 F와 양의 실제 건당 기여 c가 있을 때만 F/c가 *그 비용 하나*를 커버하는 최소 거래수다. F/c를 수요나 손익/ROI 전망으로 읽지 않는다. 현재는 F/c의 숫자도 생성하지 않는다.

ROI·IRR·expected profit·payback·수익 전망 없음. 미래 ownership 문서의 payback gates는 이번에 계산/통과하지 않는다.

## 5. 최소 결정 실험 / 비용 비교

상한은 **제안 정책(ASSUMPTION)**이며 견적/실측 비용이 아니다. 인터뷰 모집·출장은 원격 우선, 최대 한 번 묶음 방문, 근무 중 즉시 응답/당일 출동 약속 없음. 실제 지출/시간/샘플을 기록하고 상한에 닿으면 중단한다. 각 실험의 hypothesis, target, 질문, sample, cash/time, PASS/HOLD/FAIL, next와 STOP은 canonical JSON 및 [도구](../field/candidate-validation-instruments-v1.md)에 있다.

| 실험 | 필요한 의미 있는 sample | 최대 현금 | 최대 owner 시간 | 상대방/결정창 | 완료 시 가능 수준 |
|---|---|---:|---:|---|---|
| CV-022 선정 | qualified buyer 15, 익명 실바스켓 5, 공급견적 3 | 15만원 | 10h | 18곳(일부 buyer가 basket 제공), 21일 | C3; 바스켓/의향 전부 실제 수신해야 함 |
| CV-030 선정 | Stage A 비교 순견적 3; 통과 후 Stage B qualified buyer 20 | 10만원 | 8h | 최대 23곳, 21일 | Stage A C2 직접견적; Stage B C3 dated RFQ |
| CV-013 | supplier 3 + host 3 | 10만원 | 6h | 6곳, 14일 | C2 quote + C3 host(실제 면담) |
| CV-001 | supplier 3 + host 3 | 10만원 | 6h | 6곳, 14일 | C2 quote + C3 host |
| CV-008 | niche host 5 + 실제 substitute 3 | 5만원 | 5h | 8곳, 14일 | C3 host 필요; mystery-shop만이면 C2 |
| CV-020 | 한 SKU buyer 8 + host 2 | 5만원 | 4h | 10곳, 14일 | C3 정확 job; 규제 범위 확인 전 상업활동 없음 |
| CV-021 종속 | OC-022 동일 15명 내 확장; pain 5·설치 논의 2 | 추가 0원 | 잠재 추가 1h | 신규 접촉 0, 21일 | C3 control pain; quotes는 후속 |

비용만 낮다고 우선하지 않는다. OC-008/020은 싸지만 현재 job/공백이 불분명해 완료 후에도 좁은 수요 정의에 머물 위험이 있다. OC-022는 실제 돈이 쓰이는 basket에 바로 접근한다. OC-030은 supplier gate에서 실패하면 owner 주말/장비 노출을 막는다. 일곱 개 모두를 병렬 실행하는 계획은 없다.

### 선택된 두 실험의 결정 규칙

**OC-022:** 기존 15명 gate(매월 반복 >=8, 실제 basket >=5, 비가격 pain >=5)를 보존한다. 5 basket 중 3이 동일 규격/fulfillment 후 >=15% margin 또는 확인된 consolidation 서비스료를 포함해 이를 충족해야 한다. 이 수치는 [기존 protocol](transaction-validation-v1.md)의 상업 가설 기준이며 시장 평균이 아니다. 서비스료도 지불의사가 확인되어야 한다. 일일 배송/긴급 요청만 수용하거나 commodity-only 4/5라면 FAIL. sample/비용/owner 시간 미완료면 HOLD, 한 번만 범위를 좁힌다. PASS 후에도 제안서 3건까지만; 실제 주문/재고/예치금은 별도 승인이다.

**OC-030:** 먼저 동일 행사 사양 3 complete quotes 중 1 supplier의 완전 logistics/support가 서면이어야 한다. retail price dispersion은 margin으로 계산하지 않는다. 이후 20 qualified buyer 중 dated RFQ >=4, scope 논의 >=2, 실제 같은 job 기여 >=15만원, owner scheduled <=2h/event, 현장 없음이면 PASS. RFQ 0, owner 운송/대기 필수, 실제 matched 기여 <10만원이면 FAIL; 10–15만원·비용 누락은 HOLD 후 범위 조정 1회. 기존 protocol의 deposit/order는 **후속 단계로 분리**해 이 PR에서 요청하지 않는다. C3 질문 단계가 paid fulfillment인 C5를 대신하지 않는다.

## 6. 첫 한 주 실행 큐

**USER ACTION REQUIRED** — 모든 연락/면담/견적 회신은 아직 수행되지 않았다. 정확한 요일 대신 저녁/주말 슬롯으로 제안하며 합계 **10h / 20만원** 상한. full selected experiments의 **18h / 25만원**은 최대 21일에 걸친 별도 전체 상한이다. 첫 주에는 15/20명 전체 gate 달성을 약속하지 않는다. 모집 불가/회신 없음은 HOLD다.

1. 저녁 1 (1h, 0원): 고용주 정책과 비고용주 접촉 범위 확인, 비규제 SKU·면담/견적 양식 고정. 승인 미확인이면 비상업 정보수집만.
2. 저녁 2 (2h, 0원): OC-030의 같은 Seoul 1일 job으로 supplier 3곳에 순조건 질문. 실제 0–3 회신 상태 그대로 기록. support gate 전 buyer campaign 금지.
3. 저녁 3/예약 면담 (3h, 5만원): OC-022의 공개 회사 정보로 10곳 eligibility/모집, 합계 5개 퇴근 후/주말 인터뷰 예약·일부 수행. 고용주 관계/개인 연락처를 public 파일에 저장하지 않음.
4. 주말 묶음 (3h, 10만원): 확정 인터뷰를 첫 주 합계 최대 5개 완료, 동의된 익명 basket 최대 2개 확보. 실제 basket이 있으면 3 supplier에 같은 규격 quote 요청만. quote는 주문이 아님.
5. 일요일 저녁 (1h, 5만원 reserve): 실제 시간을 집계하고 공급 gate/partial buyer 결과로 다음 주 continue/HOLD/FAIL. sample 미완료를 C3 전체검증 완료로 올리지 않음. 사용하지 않은 reserve는 남겨 둠.

첫 번째 행동은 정책 경계 확인 뒤 **같은 명세의 행사 순조건 요청 + 비규제 반복바스켓 면담 예약**이다. 공장 30곳/행사 buyer 20곳을 일주일에 무리해서 모두 접촉하는 목표를 두지 않는다. 한 번의 field observation을 위해 수십 건물 목록을 생성하지 않는다.

## 7. site-discovery gate와 종료

네 LOCATION 후보 모두 `SITE_DISCOVERY_READY = NOT_READY`. OC-001의 상업 total capex·환기/화재/접근·host·정확 call job/결제 부족, OC-013의 출력 job/소모품/host/AS 부족, OC-020의 SKU 자체 미정, OC-008의 niche/배상/host 순조건 부족이 이유다. 공공 수요 신호는 조건 중 하나만 제공한다.

미래 READY 판정은 정확 job/user, 완전 acquisition/service 견적, plausibly viable commercial structure, 기존 인력 있는 host archetype, public demand evidence, 확인된 운영/법적 장애 없음이 함께 필요하다. READY라도 다음 PR에는 조사 방법/호스트 유형부터 제시하고 실제 사이트 조사는 사람 검토 후 별도 작업으로 한다. 이 PR에는 건물 목록/핀/임대 조건을 추가하지 않는다.

OC-001: complete capex 둘 다 normal ceiling 초과/선임대/상시출동이면 현재 형태 archive. OC-013: host 조건 후 장당 기여<=0 또는 owner 평일 AS 필수이면 선택 job 종료. OC-020: SKU 좁히기 1회 후에도 구체 반복 필요가 없으면 archive. OC-008: 5 hosts에서 같은 공백이 없거나 owner 입출고/배상 해결 불가면 niche도 archive. OC-022: 15명 gate 실패 후 segment 수정 1회만; 직송/배치 불가면 종료. OC-021: parent demand FAIL/통제 불편 부재면 장비 upgrade 종료. OC-030: 20명 dated RFQ 없음/외주 logistics 불가/차익 부족이면 현재 offer 종료.

어떤 후보도 실제 새 negative field 결과 없이 전체를 KILL로 확정하지 않았다. 이미 부적합한 **모델 변형**은 제외했으며 각 surviving 가설의 STOP을 따로 정했다. budget을 반복 desk documentation으로 소비하지 않는다.

## 8. 편향/무결성과 남은 제한

지도/행수/코드/소프트웨어 성숙도/AI 가능성을 ranking에서 제외했다. 지도 없는 동일 상황을 가정해도 OC-022/030의 싼 basket/외주 quote 경로가 우선이다. 반대로 과거 최고점 OC-021은 DEPENDENT, mature GIS가 있는 OC-001은 HOLD다. 연구 문서/소프트웨어가 많아서 현장 검증 단계가 올라가는 후보는 없다.

baseline hashes는 수요·POI·파생 공급·부동산·registry·기존 GIS assets/pages를 고정한다. PR12 context 원본도 바꾸지 않는다. 현재 main의 **부동산 `demand_hash`만 재빌드와 불일치**하여 기존 Python 1개 및 Node context test가 실패한다. 이 PR은 defect를 수정하거나 asserted AVAILABLE로 위장하지 않는다. main에서 이미 해당 통합이 깨져 있으므로 현재 GIS 전체가 통과했다고 보고할 수 없다. 지도 CDN/CI Chromium 네트워크 차단도 별도 blocker다.

결정 페이지는 기존 GIS와 독립이며 CDN/keys 없이 같은 Pages prefix에서 registry+state를 읽는다. 미래 증거 추가 시 source 날짜/관측범위/개인정보·sample를 검토하고 상태를 갱신한 다음 deterministic integrity checks를 실행한다. 이 PR은 원문 latest prices, 법적 clearance, supplier replies, host/buyer interviews, current external links, paid/intent evidence를 검증 완료했다고 주장하지 않는다.

### 검증 명령과 관측 결과

- `python pipeline/validation_portfolio.py --check`: 7개 canonical ID/lane, 18 source references, full/week budget, UNKNOWN·C2·미실행/무승인 경계, 보호한 10개 GIS 파일 hash 통과. baseline main 객체와도 hash 비교했다. PR12 context는 merge 객체와 byte-identical이다.
- `python -m unittest discover -s tests -v`: 29 실행, 28 PASS / 기존 `test_committed_transform_and_geography` 1 FAIL. 개별 portfolio suite 5개는 통과. 기존 Node context 검사는 같은 demand_hash mismatch로 FAIL. 이를 수정하거나 skip하지 않았다.
- JSON Schema Draft2020-12 자체/instance 검증과 새 JavaScript syntax 통과. 새 페이지의 실제 Chromium(system 151) 실행은 candidate 7개·선정2·예산·lane filter·후보 선택·source anchor·mobile overflow·Pages local paths·404/invalid lane 안전 실패를 통과. system Chromium 검증을 CI pinned Chromium 설치 완료로 간주하지 않는다.
- pinned Playwright 1.58.2 Chromium 다운로드/기존 GIS CDN·타일이 network 403으로 차단되어 **기존 GIS 전체 browser suite는 미완료**. 신규 독립 CI workflow를 추가했고 실제 GitHub Actions 실행 여부는 PR 생성/네트워크 복구 후 확인해야 한다. local 새 페이지 검증과 hosted Pages 배포는 별개다.
- public supplier current content 0건, quotes/interviews/intent/paid evidence 0건. 새 파일의 credential-pattern scan과 local source/instrument paths 확인; 외부 URL 내용/HTTP 유효성·현재 법적/보험 조건은 미확인.
- GitHub REST의 repo read는 proxy 403이었지만 실제 PR용 GraphQL 경로는 동작했다. 동일 branch의 기존 PR이 없음을 확인한 뒤 **Draft PR #13**만 생성하고 OPEN/isDraft=true를 확인했다. merge/ready 전환은 하지 않는다. Git read/write와 PR GraphQL의 성공을 다른 REST/API/공급자 사이트 접근 성공으로 일반화하지 않는다.
