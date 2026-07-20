# Healthcare 프로젝트 (전체 공통 규칙)

실시간 건강정보(심박수·혈당 등)를 시뮬레이터에서 받아 저장하고, 웹·모바일에서 모니터링하며, AI로 분석하는 교육용 모노레포입니다.

## 코딩 규칙
다음 규칙을 항상 참조한다: https://raw.githubusercontent.com/forrestchang/andrej-karpathy-skills/main/CLAUDE.md

## 프로젝트 구조 & 문서 지도
기능 개발 전, 관련된 프로젝트의 md를 먼저 확인하고 그 정의를 따른다.

```
/healthcare
├── CLAUDE.md                    # 전체 공통 + 문서 지도
├── docs/                        # 전 프로젝트 공유 규칙
│   ├── REQUIREMENTS.md          # 전체 제품 요구사항
│   ├── DATA_MODEL.md            # 언어 중립 데이터 계약 (TS/Python 공용)
│   ├── SCREEN_DESIGN.md         # 웹·앱 공통 화면 설계
│   ├── DESIGN.md                # 디자인 가이드 (색상·타이포·컴포넌트)
│   ├── ARCHITECTURE.md          # 전체 데이터 흐름
│   └── ROADMAP.md               # 전체 마일스톤
│
├── health-backend/              # NestJS
│   ├── CLAUDE.md
│   └── docs/ ARCHITECTURE.md · API_SPEC.md(웹·앱이 소비) · SIMULATOR_API_SPEC.md(외부 시뮬레이터 연동, backend 전용 소비) · TASKS.md
│
├── health-web/                  # React + Vite
│   ├── CLAUDE.md
│   └── docs/ ARCHITECTURE.md · TASKS.md
│
├── health-mobile/               # React Native
│   ├── CLAUDE.md
│   └── docs/ ARCHITECTURE.md · TASKS.md
│
├── health-ai/                   # FastAPI (Python)
│   ├── CLAUDE.md
│   └── docs/ API_SPEC.md · TASKS.md
│
└── shared/                       # Node.js 공유 코드 (backend·web·mobile, AI 제외)
    └── types.ts                  # 공유 타입 등
```

## 코딩 규칙 (계속)
- backend·web·mobile은 모두 Node.js 기반이다. 인터페이스·공통함수 등 셋 이상이 공유 가능한 코드는 `shared/`에 만들고 각 프로젝트에서 참조한다(중복 구현 금지). AI(Python)는 `shared/`를 쓰지 않고 `docs/DATA_MODEL.md`를 참조해 자체 구현한다.

## 문서 규칙
- 정보는 한 곳에만 둔다: 2개 이상 프로젝트가 공유 → 루트 `docs/`, 한 프로젝트만 사용 → 그 프로젝트 `docs/`.
- API 명세는 제공하는 서버가 소유한다(`health-backend/docs/API_SPEC.md`, `health-ai/docs/API_SPEC.md`). 소비하는 쪽은 참조만 한다.
- 외부 제공 API(우리가 설계하지 않은 API)는 그 API를 실제로 호출하는 프로젝트의 `docs/`에 둔다. 건강정보 시뮬레이터는 health-backend만 연결하므로 `health-backend/docs/SIMULATOR_API_SPEC.md`에 둔다.
- 데이터 구조·웹소켓 이벤트명은 `docs/DATA_MODEL.md`를 따르고 임의로 바꾸지 않는다.
- 각 MD 상단에 섹션 목차를 둔다.

## 실시간·저장 규칙
- 시뮬레이터 웹소켓 상시 연결·수신·저장은 **backend만** 담당한다. web·mobile은 backend를 경유한다.
- 저장 데이터 보존정책은 `docs/DATA_MODEL.md` 또는 backend 설계 문서의 정의를 따른다.
