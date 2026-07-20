# 전체 시스템 아키텍처 (ARCHITECTURE)

Healthcare 프로젝트의 **전체 데이터 흐름**을 정리한 문서다. (첨부 시스템 구성도 기준)
각 프로젝트 내부 구현 설계는 해당 프로젝트의 `docs/ARCHITECTURE.md`를 참조한다.

- 실시간 건강데이터의 **상시 수신·저장은 backend(NestJS)만** 담당한다. web·app은 backend를 경유한다. (`CLAUDE.md` 규칙)
- 데이터 구조·이벤트 이름은 `docs/DATA_MODEL.md`를 따른다.
- API 명세의 주인은 그 API를 **제공하는** 서버다. backend API는 `health-backend/docs/API_SPEC.md`, AI API는 `health-ai/docs/API_SPEC.md`. 소비하는 쪽은 참조만 한다.
- 외부 시뮬레이터 API 명세는 이를 실제로 호출하는 `health-backend/docs/SIMULATOR_API_SPEC.md`에 있다 (health-backend만 시뮬레이터에 연결하므로).

## 1. 사전준비 단계

1. 요구사항 확인 → `docs/REQUIREMENTS.md`
2. 화면설계 → `docs/SCREEN_DESIGN.md`, `docs/DESIGN-apple.md`
3. ERD 작성 및 테이블 설계/생성 → 각 프로젝트 `docs/ARCHITECTURE.md`(추후 작성)

## 2. 전체 데이터 흐름

```
[시뮬레이터 서버] ──WebSocket──→ [health-backend (NestJS)] ──→ [DB]
   healthsim.iranglab.com                 │
                          ┌────────────────┼────────────────┐
                          ▼                ▼                 ▼
                 [health-web]      [health-mobile]      [health-ai]
                 (React + Vite)    (React Native/Expo)  (FastAPI/Python)
                          │                │                 ▲
                          └───────┬────────┘                 │
                       로그인 · 회원목록 ·               HTTP 호출(API-1)
                    회원상세(실시간 모니터링) · 챗봇              │
                                                     health-backend가 이상 데이터
                                                     감지 시 분석 요청
                                                              │
                                                              ▼
                                                     [Slack Webhook]
                                                  이상 증상 분석 결과 전송
```

- 시뮬레이터(`healthsim.iranglab.com`)가 회원 건강정보(심박·혈압·체중·혈당·걸음수)를 WebSocket으로 실시간 전송한다. 상세 스펙은 `health-backend/docs/SIMULATOR_API_SPEC.md`, `docs/DATA_MODEL.md` 참조.
- **health-backend만** 시뮬레이터와 상시 연결을 유지하며 수신한 데이터를 DB에 저장한다.
- health-web, health-mobile은 **backend가 제공하는 API를 통해서만** 데이터를 조회한다 — 시뮬레이터나 health-ai에 직접 연결하지 않는다.
- health-backend는 이상 데이터 감지 시 health-ai(AI Agent API)를 HTTP로 호출해 분석을 요청하고, 그 결과를 Slack 웹훅으로 전송한다.
- 챗봇 기능도 web/app → backend → health-ai 순서로 경유한다 (web/app이 health-ai를 직접 호출하지 않는다).

## 3. 구성 요소

### 3.1 시뮬레이터 서버 (제공됨)
- 주소: `healthsim.iranglab.com`
- 회원 건강정보(심박·혈압·체중·혈당·걸음수)를 WebSocket으로 실시간 전송
- 상세: `health-backend/docs/SIMULATOR_API_SPEC.md`, `docs/DATA_MODEL.md`

### 3.2 health-backend (NestJS)
- **DATA** 건강데이터 수신 및 저장 (시뮬레이터 웹소켓 상시 연결)
- **ALM** 실시간 모니터링 알림 — 이상 데이터 감지 시 Slack 웹훅으로 전송
- **API-1** AI Agent API 연동 — health-ai(Python)를 HTTP로 호출
- **API-2** 건강데이터 제공 API — health-web·health-mobile에 데이터 제공

### 3.3 health-ai (FastAPI / Python) — AI Agent 백엔드
- **RAG** — 문서/데이터 검색 및 벡터 기반 조회
- **Ollama 로컬 LLM** — Gemma3 모델 로컬 실행
- **AI Agent API** — RAG + LLM 연동, 프롬프트/컨텍스트 관리, API 제공
- health-backend의 HTTP 호출만 받아 동작한다 (web·app이 직접 호출하지 않음)

### 3.4 health-web (React + Vite)
- **AUTH** 로그인
- **LIST** 회원목록
- **VIEW** 회원상세 (실시간 모니터링)
- **CHAT** 챗봇 — health-backend를 경유해 health-ai 호출
- 모든 데이터/AI 요청은 health-backend를 경유한다

### 3.5 health-mobile (React Native / Expo)
- 로그인 · 회원목록 · 회원상세(실시간 모니터링) · 챗봇
- health-web과 동일한 기능 구성, health-backend를 경유한다

### 3.6 Slack (웹훅)
- health-backend가 이상 증상을 감지하면 health-ai가 생성한 분석 내용을 Slack 웹훅으로 전송한다

## 4. 서버배포 및 네트워크 인프라

- 배포는 **GitHub Actions**(CI/CD)를 통해 이루어진다. 각 프로젝트(backend·web·mobile·ai)는 자신의 저장소/디렉터리에 워크플로우(`.github/workflows/`)를 두고 빌드·배포한다.
- 워크플로우 상세(트리거 조건, 빌드·배포 단계, 대상 서버·환경변수·시크릿 관리 등)는 각 프로젝트 `docs/ARCHITECTURE.md`에 작성한다.
- 클라우드 서버, 네트워크, 보안 등 인프라 구성 상세는 배포 시점에 별도 정리한다.

## 5. 참고 문서

- `docs/REQUIREMENTS.md` — 전체 제품 요구사항
- `docs/DATA_MODEL.md` — 데이터 계약 (모든 프로젝트 필수 참조)
- `docs/SCREEN_DESIGN.md` — 화면별 구성/명세
- `docs/DESIGN-apple.md` — 디자인 가이드 (색상·타이포·컴포넌트 스타일)
- `health-backend/docs/SIMULATOR_API_SPEC.md` — 외부 시뮬레이터 API 명세
- `health-backend/docs/API_SPEC.md` — health-backend가 web·mobile에 제공하는 내부 API 명세
- 각 프로젝트 내부 구현 설계: `health-backend/docs/ARCHITECTURE.md`, `health-web/docs/ARCHITECTURE.md`, `health-mobile/docs/ARCHITECTURE.md`, `health-ai/docs/ARCHITECTURE.md` (각 프로젝트에서 별도 작성)
