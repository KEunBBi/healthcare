# health-backend 아키텍처 (ARCHITECTURE)

`health-backend`(NestJS)의 내부 구현 설계. 전체 흐름은 루트 [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) 참고 — 이 프로젝트는 그중 **DATA·ALM·API-1·API-2** 역할을 담당한다.

## 목차
- [1. 기술 스택](#1-기술-스택)
- [2. DB 연결](#2-db-연결)
- [3. 모듈 구성](#3-모듈-구성)
- [4. API-2: 프론트엔드 제공 API](#4-api-2-프론트엔드-제공-api)
- [5. DATA: 시뮬레이터 연동·저장·보존정책](#5-data-시뮬레이터-연동저장보존정책)
- [6. API-1: AI Agent 프록시(채팅)](#6-api-1-ai-agent-프록시채팅)
- [7. ALM: 이상 데이터 감지 및 Slack 알림](#7-alm-이상-데이터-감지-및-slack-알림)
- [8. 공유 코드 (shared/)](#8-공유-코드-shared)
- [9. 참고 문서](#9-참고-문서)

## 1. 기술 스택
- 프레임워크: NestJS
- DB: PostgreSQL
- 시뮬레이터 연동: WebSocket (Socket.IO client)
- 프론트엔드 실시간 전달: WebSocket (Socket.IO gateway)
- 인증: JWT

## 2. DB 연결
- 접속정보: `211.253.27.76:5432`, database `db02`, user `user02`
- 비밀번호 등 자격증명은 코드에 하드코딩하지 않고 환경변수(`.env`, NestJS `ConfigModule`)로 관리한다.
- 테이블 스키마: 루트 [`docs/table.sql`](../../docs/table.sql) (= [`docs/DATA_MODEL.md`](../../docs/DATA_MODEL.md) 1장 ERD)

## 3. 모듈 구성
| 모듈 | 역할 |
|---|---|
| `AuthModule` | 회원 로그인, JWT 발급/검증 |
| `MemberModule` | 회원 목록·상세 조회 |
| `SimulatorModule` | 시뮬레이터 WebSocket 클라이언트, 수신 데이터 DB 저장, 보존정책(7일) |
| `RealtimeModule` | 프론트엔드용 WebSocket 게이트웨이 (실시간 그래프 전송) |
| `ChatModule` | health-ai 챗봇 API 프록시 |
| `AlertModule` | 이상 데이터 감지 및 Slack 알림 |

## 4. API-2: 프론트엔드 제공 API
상세 요청/응답 스펙은 [`docs/API_SPEC.md`](./API_SPEC.md)(이 프로젝트 소유)에 정의한다. 여기서는 역할만 정리한다.

- **로그인**: JWT 발급. Payload는 `userid`, `name`, `api_key`.
- **회원 목록 조회**: 환자는 본인 정보만, 의사는 전체 회원 조회 가능 (`docs/REQUIREMENTS.md` 2번).
- **회원 상세 조회**: 최초 응답은 DB에 저장된 최근 데이터(ID·이름·생년월일·성별·보유질병·메모, 최근 건강정보)를 반환하고, 이후 심박·혈당·걸음수 실시간 그래프는 `RealtimeModule`의 WebSocket으로 전달한다.

## 5. DATA: 시뮬레이터 연동·저장·보존정책
- 시뮬레이터 연동 인터페이스(엔드포인트, 인증, 이벤트 구조)는 [`docs/SIMULATOR_API_SPEC.md`](./SIMULATOR_API_SPEC.md), [`docs/DATA_MODEL.md`](../../docs/DATA_MODEL.md) 2장을 따른다. 임의로 재정의하지 않는다.
- 접속 인증에 쓰이는 `userId`/`apiKey`는 회원관리테이블(`users`)에서 조회한다 — 별도 인증 테이블을 두지 않는다.
- `SimulatorModule`은 앱 부트스트랩 시 등록된 **환자(P)** 회원 전원에 대해 각자의 `userId`/`apiKey`로 개별 WebSocket 연결을 맺고 상시 유지한다 (의사 계정은 자신의 건강데이터가 없으므로 제외 — 실제 시뮬레이터도 의사 계정을 인식하지 않는다). 알림(ALM)이 전 환자를 실시간 감시해야 하므로, 특정 회원 상세조회 화면 진입 여부와 무관하게 항상 연결되어 있어야 한다.
- **재연결 정책**: 연결이 끊기면(서버가 인증 실패로 의도적으로 끊은 경우 제외) 2초 간격으로 최대 3회까지 재연결을 시도한다. 3회 모두 실패하면 재연결을 중단하고 에러 로그를 남긴다 — 무한 재시도로 죽은 연결을 붙잡고 있지 않는다. 이후 재연결은 앱을 재시작해야 한다.
- **수신 로그**: 수신한 각 이벤트는 로그로 남기되, 측정일시(KST)가 오늘이 아니면 로그를 생략해 불필요한 로그 폭주를 막는다.
- 수신한 이벤트는 `docs/DATA_MODEL.md` 1.4~1.8 테이블에 각각 저장한다 (`heartRate`→`user_heart_rates`, `bloodPressure`→`user_blood_pressures`, `weight`→`user_body_records`, `glucose`→`user_glucoses`, `stepCount`→`user_step_counts`). `userProfile`은 회원·질병 정보 검증용으로만 쓰고 별도 저장하지 않는다 (회원·질병 데이터는 이미 `users`/`user_diseases`에 있음).
- **보존정책**: 매일 1회 스케줄러(`@nestjs/schedule` `@Cron`)로 `측정일시`가 7일이 지난 행을 5개 시계열 테이블에서 삭제한다.

## 6. API-1: AI Agent 프록시(채팅)
- 프론트엔드의 챗봇 요청을 받아 health-ai(FastAPI) HTTP API로 그대로 프록시한다. web·mobile은 health-ai를 직접 호출하지 않는다.
- health-ai API 상세 스펙은 `health-ai/docs/API_SPEC.md`(health-ai 소유, 추후 작성)를 참고한다.

## 7. ALM: 이상 데이터 감지 및 Slack 알림
- 대상: 심박·혈압·혈당 (`docs/REQUIREMENTS.md` 5번)
- 이상 데이터 판정 기준은 `docs/DATA_MODEL.md`를 따른다.
  - 심박수: `source: "abnormal_event"`로 수신된 이벤트 (MI/HYP 보유자 10분 주기)
  - 혈당: `status`가 `"high"`(140 이상)인 경우
  - **혈압: `docs/DATA_MODEL.md`에 별도 상태값이 정의되어 있지 않다 — 판정 기준(임계값 등)을 추가로 정의해야 하는 TODO.**
- 이상 데이터 감지 시 API-1을 통해 health-ai에 분석을 요청하고, 응답 결과를 Slack 웹훅으로 전송한다.

## 8. 공유 코드 (shared/)
- backend·web·mobile은 모두 Node.js 기반이므로, 이벤트/DTO 인터페이스·공통 유틸 등 공유 가능한 코드는 상위 [`shared/`](../../shared/) 폴더에 작성하고 참조한다. 중복 구현하지 않는다.
- 예: `docs/DATA_MODEL.md` 기반 이벤트 타입, API 응답 DTO 등.

## 9. 참고 문서
- [`docs/REQUIREMENTS.md`](../../docs/REQUIREMENTS.md) — 제품 요구사항
- [`docs/DATA_MODEL.md`](../../docs/DATA_MODEL.md) — DB 스키마 + 시뮬레이터 데이터 계약
- [`docs/API_SPEC.md`](./API_SPEC.md) — health-backend가 web·mobile에 제공하는 내부 API 명세 (이 프로젝트 소유)
- [`docs/SIMULATOR_API_SPEC.md`](./SIMULATOR_API_SPEC.md) — 외부 시뮬레이터 API 명세 (이 프로젝트 소유)
- [`docs/table.sql`](../../docs/table.sql), [`docs/insert.sql`](../../docs/insert.sql) — DDL/시드 데이터
- `docs/TASKS.md` — 추후 작성
