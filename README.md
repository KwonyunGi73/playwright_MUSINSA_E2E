🧥 MUSINSA E2E Automation Framework
📖 프로젝트 개요 (Overview)
이 프로젝트는 국내 1위 패션 플랫폼 **무신사(MUSINSA)**의 핵심 쇼핑 프로세스(검색, 필터링, 상세페이지, 장바구니)를 검증하기 위한 Playwright 기반 E2E 자동화 테스트 프레임워크입니다.

단순한 Happy Path 검증을 넘어, 동적인 옵션 구조 대응, 크로스 브라우저 호환성, 그리고 테스트 데이터 초기화(Self-Cleanup) 로직을 구현하여 테스트의 신뢰성과 반복 실행 안정성을 확보하는 데 중점을 두었습니다.

🎯 핵심 시나리오 (Key Scenarios)
통합 시나리오 (End-to-End Flow):

탐색 (Discovery & Search)

메인 페이지 진입 및 검색 레이어 제어.

키워드('코트') 검색 및 결과 페이지 이동 검증.

필터링 (Advanced Filtering)

성별 필터: '남성' 카테고리 적용.

실측 필터: 총장 110cm ~ 120cm 범위의 상세 조건 입력 및 적용 확인.

상세 페이지 (PDP)

검색 결과 내 첫 번째 상품 선택 및 새 탭(Context) 전환 처리.

핵심 요소(가격, 장바구니 버튼 등) 렌더링 검증.

동적 옵션 핸들링 (Dynamic Option Handling)

상품별로 상이한 옵션 개수(1~N개)를 자동으로 감지.

계단식 재시도(Cascading Retry) 로직을 적용하여, 옵션 선택이 필요한 경우에만 순차적으로 드롭다운을 제어하고 장바구니 담기를 시도.

장바구니 및 데이터 정리 (Cart & Cleanup)

장바구니 담기 성공 팝업 감지 및 페이지 이동.

데이터 초기화: 테스트로 생성된 장바구니 데이터를 '전체 선택 -> 삭제' 로직을 통해 원상 복구.

최종적으로 장바구니가 비워졌는지 텍스트 메시지(<strong class="cart-no-result__title">...</strong>)로 검증.

🛠️ 기술적 특징 & 해결 전략 (Technical Highlights)
1. 전략적 브라우저 테스팅 (Strategic Cross-Browser Testing)
전략: 점유율 90% 이상을 차지하는 **Chromium(Chrome/Edge)**과 WebKit(Safari) 엔진에 집중.

구현: playwright.config.ts 내 projects 설정을 통해 단일 스크립트로 다중 브라우저 병렬/순차 실행 환경 구축. Firefox는 렌더링 특수성 및 점유율 대비 효율성을 고려하여 제외(ROI 최적화).

2. 동적 옵션 선택 알고리즘 (Adaptive Option Logic)
문제: 무신사 상품은 옵션이 없는 경우, 1개인 경우, 2개 이상인 경우가 혼재되어 정적 스크립트로 대응 불가.

해결: try...catch 구문을 활용한 루프형 계단식 로직 구현.

옵션 선택 없이 장바구니 클릭 시도.

실패 시(alert 감지), 옵션 드롭다운을 순차적으로 탐색 및 클릭.

품절(disabled) 옵션은 자동으로 건너뛰고 유효한 옵션만 선택.

3. 견고한 데이터 클린업 (Robust Cleanup)
문제: 테스트 반복 실행 시 장바구니에 상품이 쌓여 테스트 신뢰도 하락.

해결: 테스트 마지막 단계에 Cleanup Step을 강제.

디테일: 무신사 장바구니의 DOM 구조(.cart-all-check__wrap, .cart-all-check__delete)를 정밀 타겟팅하여 '전체 선택 -> 삭제 -> 확인 팝업 승인' 프로세스 자동화.

4. Flaky Test 방지 (Stability)
전략: 네트워크 지연이나 UI 렌더링 속도 차이로 인한 실패를 방지하기 위해 waitForTimeout(필요 시), expect.poll, 그리고 재시도(Retry) 로직을 적재적소에 배치.

대응: 팝업 레이어 등에 가려져 클릭이 안 되는 현상을 막기 위해 { force: true } 옵션을 전략적으로 사용.
