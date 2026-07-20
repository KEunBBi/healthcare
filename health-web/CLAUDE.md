# health-web 프로젝트 규칙

React + Vite(TypeScript) 웹 클라이언트. 전체 공통 규칙(코딩 규칙·문서 규칙·실시간 규칙)은 루트 [`../CLAUDE.md`](../CLAUDE.md)를 항상 함께 따른다. 이 문서는 health-web에만 해당하는 규칙만 다룬다.

## 문서 지도

작업 전 아래 문서를 먼저 확인하고 그 정의를 따른다.

| 문서 | 내용 |
|---|---|
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | health-web 구현설계 — 기술 스택·폴더 구조·데이터 흐름 결정 (이 프로젝트 소유) |
| [`docs/TASKS.md`](./docs/TASKS.md) | 작업 목록 (이 프로젝트 소유) |
| [`../docs/SCREEN_DESIGN.md`](../docs/SCREEN_DESIGN.md) | 화면명세 (web·mobile 공통, 참조만) |
| [`../docs/DESIGN-apple.md`](../docs/DESIGN-apple.md) | 디자인 가이드 — 색상·타이포·컴포넌트 토큰 (web·mobile 공통, 참조만). `../docs/DESIGN.md`는 현재 비어있다 — 내용이 채워지기 전까지는 DESIGN-apple.md가 실제 디자인 기준이다 |
| [`../health-backend/docs/API_SPEC.md`](../health-backend/docs/API_SPEC.md) | API 명세 (health-backend 소유, health-web은 참조만) |
| [`../docs/DATA_MODEL.md`](../docs/DATA_MODEL.md) | 데이터 구조·이벤트명 (전 프로젝트 공통, 참조만) |

## 코딩 규칙 (health-web 전용)

- **backend만 경유한다.** 시뮬레이터(`healthsim.iranglab.com`)와 health-ai에 직접 연결·호출하지 않는다. 데이터 조회, 실시간 그래프, 챗봇 모두 `health-backend`가 제공하는 API(`API_SPEC.md`)만 사용한다.
- **실시간 그래프는 순서를 지킨다.** 심박·혈당·걸음수 그래프는 항상 "① REST로 최근 데이터 조회 → ② WebSocket 구독으로 이어붙이기" 순서로만 구현한다(`API_SPEC.md` 2.1). 소켓 연결만으로 초기 화면을 채우지 않는다.
- **필드명을 임의로 바꾸지 않는다.** API 요청/응답 필드, WebSocket 이벤트명은 `API_SPEC.md`·`../docs/DATA_MODEL.md`에 정의된 그대로 사용한다(변환 어댑터를 따로 두지 않는다).
- **디자인 토큰을 임의로 만들지 않는다.** 색상·타이포·간격 값은 `../docs/DESIGN-apple.md`에 정의된 값만 사용한다. 문서에 없는 값이 필요하면 먼저 문서에 추가한 뒤 코드에 반영한다.
- **공유 가능한 코드는 `shared/`로.** backend·web·mobile 셋 이상이 함께 쓸 수 있는 타입·유틸(API DTO, 이벤트 타입 등)은 [`../shared/`](../shared/)에 두고 참조한다. health-web 안에서 중복 정의하지 않는다.
- **환자/의사 분기는 API 응답을 그대로 신뢰한다.** 접근 권한(본인 데이터만/전체 조회) 판단은 서버(`role`, 403 응답)가 최종 권한자다. 클라이언트는 UX상 분기(예: 환자는 목록 화면 스킵)만 담당하고, 권한 검증 로직을 프론트에서 다시 구현하지 않는다.
- 새 화면/기능을 시작하기 전 `docs/TASKS.md`에서 해당 항목을 확인하고, 완료 후 상태를 갱신한다.
