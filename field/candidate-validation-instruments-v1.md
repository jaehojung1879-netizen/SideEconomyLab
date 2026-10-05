# Candidate validation instruments v1

모든 실험은 **USER ACTION REQUIRED**. 이 파일은 연락 도구이며 회신·견적·면담 완료 기록이 아니다. [canonical state](../docs/data/candidate-validation-portfolio.json)에 hypothesis/sample/PASS/HOLD/FAIL/비용·시간 상한이 있다. 고용주 정책 미확인 시 비상업 정보 면담만; 고용주 고객/내부 연락처·자료 금지. quote/RFQ는 구매 주문이 아니다. 예치금·주문·임대차·광고·장비·재고·pilot은 이 작업에서 하지 않는다.

## 공통 기록법

- `experiment_id`, 익명 상대방/역할/적격 여부, 날짜, source_id, 실제 sample 여부, 정확 job, 질문과 응답을 구분한다.
- 사실: 실제 회신/관측의 내용과 범위. 추론/가정은 별도 필드. 무응답·자료 없음은 UNKNOWN/null. “좋은 아이디어”는 의향/dated RFQ가 아니다.
- 기존 공개가격에는 source 관측일·모델/묶음·VAT·배송·시점·호가/실거래를 기록한다. supplier 회신은 유효기간·동일 명세 여부를 기록한다. 웹페이지는 협상 견적이 아니다.
- 비용/소유자 분/근무 중 연락/출장/총 요청/실제 회신을 기록한다. 상한 또는 결정창에 닿으면 HOLD/FAIL 판정; protocol 변경은 관측 전에 별도 기록.
- public repository에는 이름·전화·이메일·주소 상세·인보이스·계좌·개인 서명·이미지/개인정보를 넣지 않는다. 실제 원본은 동의/접근권한 있는 비공개 경로에 보관하고 공개 기록은 익명 aggregate만 쓴다.
- `C2` 공개/직접견적은 범위를 구별한다. `C3` 적격 면담/실바스켓/dated RFQ; `C4` 별도 승인된 written intent/trial, `C5` 실제 완료된 유료 이행. payment order만으로 fulfilled C5로 올리지 않는다. 과거 문서의 C4-B paid-order 분류와 완료거래를 구별한다.

## cv-022

**10분 buyer 질문** (15 qualified, 바스켓 5, supplier 견적 3; 상한 15만원/10h/21일):

1. 최근 한 달에 실제 반복 구매한 10–20개의 품목/정확 규격/수량은? 최근 단가·배송·결제·반품은?
2. 지난 구매의 공급사 수/주문 건수·주문/검수/재고확인 담당 분은? 기억나는 실제 stockout/급구매 사례는?
3. 단가 외에 어떤 과정 때문에 귀찮거나 비용이 발생했는가? 기존 구매/무료 incumbent와 비교해 바꿀 이유는?
4. 당일 배송 없이 주간 이하 빈도/공급사 직송으로 가능한가? 가격·브랜드 대체 불가 규격/인증/안전필수 품목은?
5. 개인정보·계좌·supplier 개인 연락처를 제거한 SKU/규격/최근 수량/단가를 비공개로 공유할 수 있는가? 공개에는 익명 집계만 가능하다.
6. 동일 규격 비교견적(주문/입금 없는 제안)을 실제 검토할 것인가? consolidation fee를 말로만 긍정하지 않고 구체 금액/조건을 확인한다.

**supplier RFQ 명세:** 실제 익명 바스켓의 SKU/규격·수량·배송지 범위/빈도·브랜드 대체 허용을 한 표로 제시. VAT 일치 unit/net 가격, MOQ, 직송/parcel, leadtime, 운임·반품·결제·품절 대체·인보이스·유효기간. 초기 관찰 범위는 일반 와이퍼/테이프/케이블타이 등 비규제 범위가 확인된 품목에 한정하고 위험 PPE/화학/의료/안전필수 부품을 제외한다. 알려진 비용이 빠지면 contribution UNKNOWN.

**결정:** 기존 15명 gate(반복 >=8, 실제 baskets >=5, 비가격 pain >=5), 5중 3이 이행 후 >=15% margin 또는 확인된 서비스료로 이를 충족·배치가능하면 PASS; 미완료는 HOLD; 4/5 commodity-only+가치 없음/일일 emergency 필요는 FAIL. 실제 owner 처리 분을 함께 평가. 다음은 무예치 제안서 3건까지만, 주문은 별도 검토.

## cv-030

**Stage A supplier 동일사양 RFQ** (3 complete quotes; Stage B 포함 상한 10만원/8h/21일):

> 서울 소재 1일 행사(시간/예상 인원/출력 수를 같은 값으로 명시), 사진 출력+브랜딩 프레임, 리드/설문/개인정보 수집 없음. 순파트너 비용과 포함 범위 확인을 위한 요청이며 주문·입금·날짜 예약은 아닙니다.

순가격/VAT, 운송·설치·철거·상주staff·소모품상한/초과, custom frame, 결제/브랜딩·reseller invoice, 최소 leadtime, 출입/전력/네트워크, 고장 즉시 대응 담당/SLA·환불/배상·취소/연기·보험·청소·수거를 동일 필드로 비교한다. 공급자 소매가는 intermediary spread가 아니다. owner 현장 참석/운송/주말 대기 필수면 Stage A FAIL. 3견적+1 완전외주/지원 서면 없으면 buyer 단계로 가지 않는다.

**Stage B 20 qualified buyer 질문:** 최근 확정 행사에서 실제 쓴 비용/채택 대체재; 다음 확정 날짜/지역/시간/인원/출력수; 목적(사진/브랜딩)·현재 vendor; 동일 사양 실제 quote 요청 여부; 결제/계약 승인 과정. 개인/참가자 정보를 수집하지 않는다. 미정 행사·호감·generic 가격조회는 dated RFQ로 세지 않는다. 20명 후 4 dated RFQ+2 scope 논의, matched job의 모든 비용 후 >=15만원, scheduled owner <=2h, 현장없음일 때 PASS. <10만원/현장필수/dated RFQ0 FAIL; 10–15만원/샘플 미완료/비용 미확인 HOLD. 이 단계에서 예치금/주문을 요청하지 않는다.

## cv-013

supplier 3+host 3, 10만원/6h/14일. 사진 출력 한 job만, 문서/촬영 혼합 금지. 4×6 같은 기능의 기기/렌탈/무료설치 조건, VAT·설치·monthly license·지급/결제·소모품/불량·원격지원/긴급AS·수리·매입/해지·사진 보관/삭제. host 최근 요청·현재 무료 incumbent·보충 주체·배분/최소보장·전력/접근성/개인정보 책임. 완전 견적 2+host1, 비용 cap 또는 cancellable rental, 장당 양의 기여(필수 비용 전부 포함)라야 PASS. fixed cost/demand는 아직 미판정. 기여<=0/평일 owner AS/ceiling 초과 FAIL; 누락 HOLD. 기대 C2 quote+C3 host, SITE_DISCOVERY_READY는 별도 재판정.

## cv-001

supplier 3+host 3, 10만원/6h/14일. **상업 통화용** 규격·면적·환기/안전/방음·power·출입/결제·VAT·운송/설치·월 license·AS SLA·회수/매입·정확 건물/소방 적용 검토 범위. 홈/노래 부스와 명세 비교 금지. host 최근 통화 공간 거절/대기·무료 room 대체·payer/user·공간 책임자·무고정임대 조건·청소/고장 담당. 2 complete quotes normal 1,000만원 ceiling(선호 300–700만원), host1에서 구체 unmet case+무고정임대/외주 논의가 PASS; 실제 수요량·WTP 없으면 깊은 site 조사 불가. 두 견적 모두 ceiling 초과/선임대/owner 즉시 출동 FAIL. 허가/명세/회신 누락 HOLD. 미래 site 목록 없음.

## cv-008

niche host 5+substitute 3, 5만원/5h/14일. 기존 호스트 인력이 있는 같은 유형의 **oversize/group overflow**만. 최근30일 거절한 실제 크기/짐수/시간·현존 역/호텔 서비스로 가능한지; 실제 substitute 가격/크기/시간·입출고·배상/보험/보안·호스트 순수취·예약/취소·owner 긴급 연락. 직접 mystery-shop 결과 없으면 완료라 기록하지 않는다. host2의 같은 최근 공백+host1 기존직원/무고정임대/책임 논의가 PASS, 보험 미해결이면 접수 금지. 공백없음/owner 접수/배상 해결불가 FAIL, 미완료 HOLD. generic 선임대 저장소는 이번 portfolio에서 제외.

## cv-020

한 SKU buyer8+host2, 5만원/4h/14일. 구매자에게 최근 언제/어떤 정확 상품·규격/어디서/얼마·재구매 간격·편의점/온라인 대체 실패를 묻는다. host 보충·도난·반품·판매/인증 범위·소유자 emergency를 확인. 장비를 먼저 묻지 않는다. 한 SKU 고정+buyer3 구체 대체실패/반복 필요+host1 무선임대+공식 상품별 요건 확인 시 quote 단계 PASS. SKU미정/규제 누락 HOLD; 필요없음/일일 보충/대체충분 FAIL. 가설 좁히기 1회 후 반복 문서 조사 중단.

## cv-021

OC-022 같은 15명에만 질문, 추가 현금0/잠재 추가1h/21일; 이번 주 독립 작업 없음. 누가 지급/기록? 최근 분실/과다사용/stockout 사례? 야간 접근? 감독자 분/주? 수동 통합구매로 이미 해결되는가? employee authentication이 필요한가? 반복 수요 통과 후 pain5+설치/지원/보안·무예치 서면논의2이면 다음 장비 complete quotes 단계 PASS. parent 미완료 HOLD, 단가만 필요/manual 충분 FAIL. 장비/SLA/최소약정/회수·정보처리·고객 비용부담은 이후 비교하고 실제 구매를 승인하지 않는다.
