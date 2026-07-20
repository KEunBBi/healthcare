# health-web 아키텍처 (ARCHITECTURE)

`health-web`(React + Vite)의 내부 구현 설계. 전체 흐름은 루트 [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) 참고 — 이 프로젝트는 그중 **AUTH·LIST·VIEW·CHAT** 역할을 담당하며, 모든 데이터/AI 요청은 `health-backend`를 경유한다.

## 목차
- [1. 기술 스택](#1-기술-스택)
- [2. 폴더 구조](#2-폴더-구조)
- [3. 스타일링](#3-스타일링)
- [4. 공유 코드 (shared/)](#4-공유-코드-shared)
- [5. 데이터 흐름](#5-데이터-흐름)
  - [5.1 원칙](#51-원칙)
  - [5.2 최초 로드 (REST)](#52-최초-로드-rest)
  - [5.3 실시간 전환 (WebSocket 구독)](#53-실시간-전환-websocket-구독)
- [6. 인증 (JWT)](#6-인증-jwt)
- [7. 라우팅 및 화면 구성](#7-라우팅-및-화면-구성)
- [8. 배포 인프라](#8-배포-인프라)
- [9. 환경변수 (.env)](#9-환경변수-env)
- [10. CORS](#10-cors)
- [11. 참고 문서](#11-참고-문서)

## 1. 기술 스택

| 영역 | 선택 |
|---|---|
| 프레임워크 | React + TypeScript + Vite (React는 항상 최신 안정 버전을 유지한다. 다운그레이드하지 않는다 — 작성 시점 기준 React 19) |
| 라우팅 | `react-router-dom` |
| HTTP 클라이언트 | `axios` |
| 실시간 통신 | `socket.io-client` (`health-backend`의 Socket.IO 게이트웨이 `/realtime`과 동일 프로토콜) |
| 스타일링 | CSS Modules + [`../../docs/DESIGN-apple.md`](../../docs/DESIGN-apple.md) 토큰 (3장 참고) |
| 인증 상태 | React Context(`AuthContext`), RefreshToken은 쿠키 저장(6장 참고) |
| 공유 타입/유틸 | [`../../shared/types.ts`](../../shared/types.ts), [`../../shared/utils.ts`](../../shared/utils.ts) (4장 참고) |

- 패키지 버전은 항상 설치 시점의 최신 안정(stable) 버전을 쓴다. React를 포함해 특정 버전을 임의로 낮추지 않는다. 신규 설치·업그레이드 시 `npm install <package>`(버전 미지정)로 최신 버전을 받는다.

## 2. 폴더 구조

```
src/
├── api/            # axios 인스턴스, 인터셉터(6장), API_SPEC.md 엔드포인트별 호출 함수
├── ws/             # socket.io-client 연결/구독 관리 (5.3)
├── auth/           # AuthContext, 라우트 가드(ProtectedRoute)
├── pages/          # 화면 단위 컴포넌트: Login, MemberList, MemberDetail
├── components/     # 공유 프레젠테이션 컴포넌트
│   └── Xxx/
│       ├── Xxx.tsx
│       └── Xxx.module.css   # CSS Modules (컴포넌트 스코프 스타일)
├── hooks/          # 커스텀 훅 (useMembers, useMemberDetail, useRealtimeHealthData 등)
├── styles/         # 전역 리셋 + docs/DESIGN-apple.md 토큰을 매핑한 CSS 변수
└── types/          # health-web 전용 타입만 둔다. shared/types.ts에 있는 타입은 재정의하지 않고 import한다
```

## 3. 스타일링

- 컴포넌트 스타일은 **CSS Modules**(`*.module.css`)로 작성한다. 전역 CSS(`src/styles/`)는 리셋과 디자인 토큰(CSS 변수) 정의에만 사용하고, 레이아웃·컴포넌트 스타일을 전역에 두지 않는다.
- 색상·타이포·간격 등 값은 [`../../docs/DESIGN-apple.md`](../../docs/DESIGN-apple.md)에 정의된 값만 사용하고 임의로 새 값을 만들지 않는다. (`../../docs/DESIGN.md`는 현재 비어있어 디자인 기준 문서로 쓰지 않는다.)

## 4. 공유 코드 (shared/)

- **타입**: 회원·건강데이터 DTO, WebSocket 이벤트 타입 등은 [`../../shared/types.ts`](../../shared/types.ts)에 정의된 것을 그대로 import해서 쓴다. health-web 안에서 동일한 타입을 다시 선언하지 않는다.
- **순수 로직**: 날짜/단위 포맷팅, 검증 등 backend·web·mobile이 공통으로 쓸 수 있는 순수 함수는 [`../../shared/utils.ts`](../../shared/utils.ts)에 추가하고 그것을 참조한다. health-web 로컬에 동일한 로직을 중복 구현하지 않는다.
- 필요한 타입/유틸이 아직 `shared/`에 없으면, health-web 안에 먼저 만들지 말고 `shared/types.ts` / `shared/utils.ts`에 추가한 뒤 health-web에서 참조한다 (backend·mobile도 갱신된 정의를 그대로 쓸 수 있도록).

## 5. 데이터 흐름

### 5.1 원칙

health-web은 **health-backend가 제공하는 API만** 호출한다. 시뮬레이터·health-ai에 직접 연결하지 않는다 (`../../docs/ARCHITECTURE.md` 2장, `API_SPEC.md` 0장).

### 5.2 최초 로드 (REST)

- 회원 목록: `GET /members` (`API_SPEC.md` 1.3)
- 회원 상세: `GET /members/:userId` (1.4) — 회원정보 + 최근 7일 체중·혈압·혈당
- 심박·걸음수 등 그 외 항목의 최근 데이터: `GET /members/:userId/health-data` (1.5, `endAt`=현재시각)
- 각 응답의 마지막 레코드 `measuredAt`을 "여기까지 이미 그렸다" 커서로 클라이언트가 보관한다 (5.3에서 사용).

### 5.3 실시간 전환 (WebSocket 구독)

회원 상세 화면의 건강데이터는 **"REST 최초 로드 → WebSocket(`/realtime`) 구독 전환"** 2단계 패턴만 따른다. Polling 등 다른 방식으로 갱신을 구현하지 않는다.

1. 5.2의 REST 최초 로드로 화면을 채운다.
2. `socket.io-client`로 `wss://{server}/realtime?token={accessToken}`에 연결한다. 의사 계정은 연결 후 `subscribe`로 대상 `userId`를 전송하고, 화면 이탈 시 `unsubscribe` 후 연결을 정리한다 (`API_SPEC.md` 2.2).
3. 이후 `heartRate`·`glucose`·`stepCount`(및 필요 시 `bloodPressure`·`weight`) 이벤트를 수신해 그래프에 이어붙인다. 5.2에서 보관한 커서보다 `measuredAt`이 이르거나 같은 이벤트는 무시해 최초 로드와의 중복을 막는다.
4. 소켓이 끊겼다 재연결되면, 끊긴 구간은 소켓으로 복구되지 않으므로 `GET /members/:userId/health-data`(1.5)를 `startAt`=마지막 수신 시각으로 다시 호출해 공백을 메운 뒤 재구독한다. `socket.io-client`의 기본 재연결 동작을 사용하고 별도 재연결 로직을 만들지 않는다.
5. 실시간 그래프 데이터는 전역 상태로 올리지 않고 해당 화면(컴포넌트) 로컬 상태로만 관리한다.

## 6. 인증 (JWT)

- 로그인(`API_SPEC.md` 1.1) 성공 시 서버가 `accessToken`·`refreshToken`·`user`를 반환한다.
- **accessToken**: 응답 바디로 받아 `AuthContext`(메모리)에만 보관한다. API 호출 시 `Authorization: Bearer {accessToken}` 헤더로 전송한다.
- **refreshToken**: **쿠키**에 저장한다 (`HttpOnly`, `Secure`, `SameSite=Strict` 또는 `Lax`). 브라우저가 자동으로 전송하며 JS 코드에서 직접 읽거나 `localStorage`에 두지 않는다 — XSS로 인한 토큰 탈취 위험을 줄이기 위함이다.
- `axios` 인스턴스는 `withCredentials: true`로 설정해 쿠키가 요청에 실려 가도록 한다. 이에 맞춰 backend CORS도 명시적 origin + `credentials: true`가 필요하다 (10장 참고).
- **재발급 흐름**: API 응답이 401이면 axios 인터셉터가 `POST /auth/refresh`(1.2)를 쿠키 포함으로 호출해 새 `accessToken`을 받아 원 요청을 1회 재시도한다. 재발급마저 실패(쿠키 만료/무효)하면 `AuthContext`를 초기화하고 `/login`으로 이동한다.
- 새로고침 시에는 accessToken이 메모리에서 사라지므로, 부트스트랩 시 쿠키에 담긴 refreshToken으로 `/auth/refresh`를 먼저 호출해 accessToken을 재발급받고 로그인 상태를 복원한다.

## 7. 라우팅 및 화면 구성

| 경로 | 화면 | 접근 조건 |
|---|---|---|
| `/login` | 로그인 (`SCREEN_DESIGN.md` 2.1) | 비로그인 상태만. 로그인 상태면 `/`로 리다이렉트 |
| `/` | 회원 목록 (`SCREEN_DESIGN.md` 2.2) | 로그인 필요. **환자** 계정은 목록을 거치지 않고 자신의 `/members/:userId`로 바로 리다이렉트(`REQUIREMENTS.md` 2번) |
| `/members/:userId` | 회원 상세 — 실시간 모니터링(5.3) + 챗봇 | 로그인 필요. 환자는 본인 `userId`만 접근 가능(서버가 403으로 최종 검증) |

- 비로그인 상태로 `/`, `/members/:userId` 접근 시 `/login`으로 리다이렉트하는 라우트 가드(`ProtectedRoute`)를 둔다.
- **TODO**: 챗봇(CHAT)의 화면 배치는 `../../docs/SCREEN_DESIGN.md`에 아직 별도 명세가 없다. 우선 회원 상세 화면 내 패널/위젯으로 임베드하는 것으로 가정하고, `SCREEN_DESIGN.md`에 챗봇 화면 명세가 추가되면 그 정의를 따르도록 갱신한다.

## 8. 배포 인프라

- health-web은 **health-backend와 같은 서버에 컨테이너로 배포**된다.
- backend 접속정보(axios `baseURL`, WebSocket URL)는 환경별로 다르다:

  | 환경 | backend 접속정보 |
  |---|---|
  | dev(로컬 개발) | `127.0.0.1` |
  | 상용(production) | `172.27.0.192` |

- 포트를 포함한 실제 접속 URL은 9장 환경변수로 분리해 관리한다.

## 9. 환경변수 (.env)

- Vite 규칙에 따라 `VITE_` 접두사가 붙은 변수만 클라이언트 번들에 노출된다. backend URL은 반드시 `VITE_` 접두사를 붙인다.
- backend 접속 URL과 웹서버(Vite dev server) 포트를 코드에 하드코딩하지 않고 `.env` 계열 파일로 분리한다. `.env*` 파일은 `.gitignore`에 포함하고(이미 적용됨), 값 없는 키 목록만 `.env.example`로 커밋한다.

`.env.example` (커밋 대상, 값은 비워둠)
```
VITE_API_BASE_URL=
VITE_WS_BASE_URL=
PORT=
```

`.env`(dev, 미커밋)
```
VITE_API_BASE_URL=http://127.0.0.1:3030
VITE_WS_BASE_URL=ws://127.0.0.1:3030
PORT=5173
```

`.env.production`(상용, 미커밋 또는 배포 파이프라인에서 주입)
```
VITE_API_BASE_URL=http://172.27.0.192:3030
VITE_WS_BASE_URL=ws://172.27.0.192:3030
PORT=5173
```

- `PORT`는 Vite 개발 서버 포트다. 기본값 `5173`을 그대로 쓰며, 10장 CORS 허용 origin(`http://localhost:5173`)과 반드시 일치시킨다. 상용 배포 시 컨테이너 노출 포트가 달라지면 이 값과 배포 설정(리버스 프록시 등)을 함께 갱신한다.
- backend의 실제 포트(`health-backend/.env`의 `PORT`, 기본 3030)가 바뀌면 `VITE_API_BASE_URL`/`VITE_WS_BASE_URL`도 함께 갱신해야 한다.

## 10. CORS

health-web이 쿠키(refreshToken, 6장) 기반 인증으로 backend를 호출하므로, backend CORS는 **`credentials: true` + 명시적 origin 목록**이어야 한다 (`*` 와일드카드는 `credentials: true`와 함께 쓸 수 없다).

health-backend(`main.ts`의 `app.enableCors(...)`, `realtime.gateway.ts`의 WebSocket `cors` 옵션)에 아래 origin을 추가해야 한다.

| Origin | 용도 |
|---|---|
| `http://localhost:5173` | health-web 로컬 개발 서버 (9장 `PORT` 기본값과 일치) |
| `https://fe000.ys.iranglab.com` | 배포된 health-web 도메인 |

- **TODO**: `fe000.ys.iranglab.com`은 예시 도메인이다. 실제로는 학생별로 다른 도메인이 제공되므로, 본인에게 제공된 도메인 정보를 확인한 뒤 이 표와 backend CORS 설정을 함께 갱신해야 한다.
- health-backend 현재 설정(`origin: true`)은 모든 origin을 허용하는 임시 상태다. 위 화이트리스트 적용은 `health-backend` 쪽 작업이며, 반영 여부는 `health-backend/docs/TASKS.md`에서 함께 추적한다.

## 11. 참고 문서

- [`../../docs/REQUIREMENTS.md`](../../docs/REQUIREMENTS.md) — 제품 요구사항
- [`../../docs/DATA_MODEL.md`](../../docs/DATA_MODEL.md) — 데이터 계약 (모든 프로젝트 필수 참조)
- [`../../docs/SCREEN_DESIGN.md`](../../docs/SCREEN_DESIGN.md) — 화면별 구성/명세
- [`../../docs/DESIGN.md`](../../docs/DESIGN.md) — 디자인 가이드 (현재 비어있음, 3장 참고)
- [`../../docs/DESIGN-apple.md`](../../docs/DESIGN-apple.md) — 디자인 토큰 초안 (DESIGN.md 작성 전 임시 기준)
- [`../../health-backend/docs/API_SPEC.md`](../../health-backend/docs/API_SPEC.md) — health-backend가 제공하는 API 명세 (health-backend 소유, 이 프로젝트는 참조만)
- [`../../shared/types.ts`](../../shared/types.ts), [`../../shared/utils.ts`](../../shared/utils.ts) — 공유 타입/순수 로직 (4장 참고)
- [`docs/TASKS.md`](./TASKS.md) — 작업 목록
