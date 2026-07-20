# health-mobile 아키텍처 (ARCHITECTURE)

`health-mobile`(React Native + Expo SDK 54)의 내부 구현 설계. 전체 흐름은 루트 [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) 참고 — 이 프로젝트는 그중 **로그인·회원목록·회원상세(실시간 모니터링)·챗봇** 역할을 담당하며, 모든 데이터/AI 요청은 `health-backend`를 경유한다.

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
| 프레임워크 | React Native + TypeScript + **Expo SDK 54** (Expo/React Native는 항상 SDK 54와 호환되는 최신 안정 버전을 유지한다 — 임의로 다운그레이드하지 않는다) |
| 라우팅 | `expo-router` (파일 기반, 클라이언트 사이드 라우팅 — SPA 방식, 7장 참고) |
| 실행/배포 타겟 | Expo Web(`react-native-web`) — 개발 중 브라우저(`http://localhost:8081`)로 접속해 확인하며, 배포도 이 웹 빌드를 컨테이너로 수행한다(8장) |
| HTTP 클라이언트 | `axios` |
| 실시간 통신 | `socket.io-client` (`health-backend`의 Socket.IO 게이트웨이 `/realtime`과 동일 프로토콜) |
| 스타일링 | **CSS Modules** + [`../../docs/DESIGN.md`](../../docs/DESIGN.md) 토큰 (3장 참고) |
| 인증 상태 | React Context(`AuthContext`), accessToken은 메모리에만 보관, refreshToken은 `expo-secure-store`(6장 참고) |
| 공유 타입/유틸 | [`../../shared/types.ts`](../../shared/types.ts), [`../../shared/utils.ts`](../../shared/utils.ts) (4장 참고) |

- 패키지 버전은 항상 설치 시점의 Expo SDK가 지원하는 최신 안정 버전을 쓴다(`npx expo install <package>`로 설치해 호환 버전이 자동 선택되도록 한다). SDK 버전 자체를 임의로 낮추지 않는다.

## 2. 폴더 구조

```
app/                        # expo-router 파일 기반 라우트 (7장)
├── _layout.tsx              # 루트 레이아웃 — AuthProvider 마운트
├── login.tsx                 # 로그인 화면 (AUTH)
└── (app)/                    # 로그인 필요 그룹 — 그룹 레이아웃에서 인증 가드
    ├── _layout.tsx
    ├── index.tsx              # 회원 목록 (LIST)
    └── members/
        └── [userId].tsx       # 회원 상세 — 실시간 모니터링(VIEW) + 챗봇(CHAT), SPA로 구현 (5.3·7장)

src/
├── api/            # axios 인스턴스, 인터셉터(6장), API_SPEC.md 엔드포인트별 호출 함수
├── ws/             # socket.io-client 연결/구독 관리 (5.3)
├── auth/           # AuthContext, expo-secure-store 연동, 라우트 가드 로직
├── components/     # 공유 프레젠테이션 컴포넌트
│   └── Xxx/
│       ├── Xxx.tsx
│       └── Xxx.module.css    # CSS Modules (컴포넌트 스코프 스타일, 3장)
├── hooks/          # 커스텀 훅 (useMembers, useMemberDetail, useRealtimeHealthData 등)
├── styles/         # 전역 리셋 + docs/DESIGN.md 토큰을 매핑한 CSS 변수
└── types/          # health-mobile 전용 타입만 둔다. shared/types.ts에 있는 타입은 재정의하지 않고 import한다
```

- 화면(라우트) 자체는 `app/`에 두되, 화면이 사용하는 로직(데이터 페칭, 상태, 프레젠테이션 컴포넌트)은 `src/`에 두고 `app/`의 라우트 파일에서 조합만 한다 — 라우트 파일에 비즈니스 로직을 직접 작성하지 않는다.

## 3. 스타일링

- 컴포넌트 스타일은 **CSS Modules**(`*.module.css`)로 작성한다. 전역 CSS(`src/styles/`)는 리셋과 디자인 토큰(CSS 변수) 정의에만 사용하고, 레이아웃·컴포넌트 스타일을 전역에 두지 않는다.
- 색상·타이포·간격 등 값은 [`../../docs/DESIGN.md`](../../docs/DESIGN.md)에 정의된 값만 사용하고 임의로 새 값을 만들지 않는다. 필요한 값이 문서에 없으면 먼저 `docs/DESIGN.md`에 추가한 뒤 코드에 반영한다.
  - **주의**: `docs/DESIGN.md`는 현재 비어있다. 값을 추가하기 전에 먼저 이 문서를 채워야 하며, 임의로 값을 정하지 않는다. (참고용 초안으로 [`../../docs/DESIGN-apple.md`](../../docs/DESIGN-apple.md)가 존재하지만, 이 프로젝트의 정식 기준 문서는 `docs/DESIGN.md`다.)
- CSS Modules(Metro의 웹 번들링 지원)는 **Web 타겟에서만** 동작한다. 추후 네이티브(iOS/Android) 빌드가 필요해지면 해당 플랫폼의 스타일링 방식을 별도로 결정해 이 장에 반영해야 한다(TODO).

## 4. 공유 코드 (shared/)

- **타입**: 회원·건강데이터 DTO, WebSocket 이벤트 타입 등은 로컬에 재정의하지 않고 [`../../shared/types.ts`](../../shared/types.ts)에 정의된 것을 그대로 import해서 쓴다.
- **순수 로직**: 날짜/단위 포맷팅, 검증 등 backend·web·mobile이 공통으로 쓸 수 있는 순수 함수는 로컬에 재정의하지 않고 [`../../shared/utils.ts`](../../shared/utils.ts)를 사용한다.
- 필요한 타입/유틸이 아직 `shared/`에 없으면, health-mobile 안에 먼저 만들지 말고 `shared/types.ts` / `shared/utils.ts`에 **추가(업데이트)한 뒤** health-mobile에서 참조한다(backend·web도 갱신된 정의를 그대로 쓸 수 있도록).

## 5. 데이터 흐름

### 5.1 원칙

health-mobile은 **health-backend가 제공하는 API만** 호출한다. 시뮬레이터·health-ai에 직접 연결하지 않는다(`../../docs/ARCHITECTURE.md` 2장, `API_SPEC.md` 0장).

### 5.2 최초 로드 (REST)

- 회원 목록: `GET /members` (`API_SPEC.md` 1.3)
- 회원 상세: `GET /members/:userId` (1.4) — 회원정보 + 최근 7일 체중·혈압·혈당
- 심박·걸음수 등 그 외 항목의 최근 데이터: `GET /members/:userId/health-data` (1.5, `endAt`=현재시각)
- 각 응답의 마지막 레코드 `measuredAt`을 "여기까지 이미 그렸다" 커서로 클라이언트가 보관한다(5.3에서 사용).

### 5.3 실시간 전환 (WebSocket 구독)

회원 상세 화면의 건강데이터는 **"REST 최초 로드 → WebSocket(`/realtime`) 구독 전환"** 2단계 패턴(본 문서 §5.3)만 따른다. Polling 등 다른 방식으로 갱신을 구현하지 않는다.

1. 5.2의 REST 최초 로드로 화면을 채운다.
2. `socket.io-client`로 `wss://{server}/realtime?token={accessToken}`에 연결한다. 의사 계정은 연결 후 `subscribe`로 대상 `userId`를 전송하고, 화면 이탈(unmount) 시 `unsubscribe` 후 연결을 정리한다(`API_SPEC.md` 2.2).
3. 이후 `heartRate`·`glucose`·`stepCount`(및 필요 시 `bloodPressure`·`weight`) 이벤트를 수신해 그래프에 이어붙인다. 5.2에서 보관한 커서보다 `measuredAt`이 이르거나 같은 이벤트는 무시해 최초 로드와의 중복을 막는다.
4. 소켓이 끊겼다 재연결되면, 끊긴 구간은 소켓으로 복구되지 않으므로 `GET /members/:userId/health-data`(1.5)를 `startAt`=마지막 수신 시각으로 다시 호출해 공백을 메운 뒤 재구독한다. `socket.io-client`의 기본 재연결 동작을 사용하고 별도 재연결 로직을 만들지 않는다.
5. 실시간 그래프 데이터는 전역 상태로 올리지 않고 해당 화면(라우트) 로컬 상태로만 관리한다.

**회원 상세 화면(그래프로 실시간 데이터를 보여주는 화면)은 SPA로 구현한다.** `expo-router`의 클라이언트 사이드 라우팅을 사용해 화면 전환 시 전체 페이지 리로드가 일어나지 않도록 하고, 소켓 연결은 이 화면이 마운트되어 있는 동안에만 유지한다(다른 화면으로 이동하면 위 2번의 `unsubscribe` 및 연결 종료만 수행하고 앱 전체를 다시 로드하지 않는다).

## 6. 인증 (JWT)

- 로그인(`API_SPEC.md` 1.1) 성공 시 서버가 `accessToken`·`refreshToken`·`user`를 반환한다.
- **accessToken**: 응답 바디로 받아 `AuthContext`(메모리)에만 보관한다. API 호출 시 `Authorization: Bearer {accessToken}` 헤더로 전송한다.
- **refreshToken**: **`expo-secure-store`**에 저장한다(iOS Keychain / Android Keystore 기반 암호화 저장).
  - **주의(TODO)**: `expo-secure-store`의 암호화 저장은 네이티브(iOS/Android)에서만 OS 수준 보안이 보장된다. health-mobile은 현재 Web 타겟(8장)이 사실상 주 실행 환경이므로, 사용 중인 Expo SDK 버전에서 `expo-secure-store`의 Web 동작(지원 여부·폴백 저장소·보안 수준)을 먼저 확인하고, 필요하면 Web 전용 저장 전략을 별도로 정해 이 장에 반영한다.
- **재발급 흐름**: API 응답이 401이면 axios 인터셉터가 `expo-secure-store`에서 refreshToken을 읽어 `POST /auth/refresh`(1.2)를 호출해 새 `accessToken`을 받아 원 요청을 1회 재시도한다. 재발급마저 실패(토큰 만료/무효)하면 `AuthContext`를 초기화하고 저장된 refreshToken을 삭제한 뒤 `/login`으로 이동한다.
- 앱 재실행 시에는 accessToken이 메모리에서 사라지므로, 부트스트랩(루트 `_layout.tsx`) 시 `expo-secure-store`에 저장된 refreshToken으로 `/auth/refresh`를 먼저 호출해 accessToken을 재발급받고 로그인 상태를 복원한다. 저장된 refreshToken이 없거나 재발급에 실패하면 `/login`으로 이동한다.

## 7. 라우팅 및 화면 구성

`expo-router` 파일 기반 라우팅을 사용한다(2장 폴더 구조 참고). 앱 전체가 클라이언트 사이드 라우팅(SPA)으로 동작하며, 특히 회원 상세 화면은 실시간 소켓 연결을 유지해야 하므로 반드시 SPA 방식으로 구현한다(5.3 참고).

| 경로 | 화면 | 접근 조건 |
|---|---|---|
| `/login` | 로그인(`SCREEN_DESIGN.md` 2.1) | 비로그인 상태만. 로그인 상태면 `/`로 리다이렉트 |
| `/` (`(app)/index.tsx`) | 회원 목록(`SCREEN_DESIGN.md` 2.2) | 로그인 필요. **환자** 계정은 목록을 거치지 않고 자신의 `/members/:userId`로 바로 리다이렉트(`REQUIREMENTS.md` 2번) |
| `/members/:userId` | 회원 상세 — 실시간 모니터링(5.3) + 챗봇 | 로그인 필요. 환자는 본인 `userId`만 접근 가능(서버가 403으로 최종 검증) |

- `(app)/_layout.tsx`에서 `AuthContext`를 확인해 비로그인 상태면 `/login`으로 리다이렉트하는 라우트 가드를 둔다.
- **TODO**: 챗봇(CHAT)의 화면 배치는 `../../docs/SCREEN_DESIGN.md`에 아직 별도 명세가 없다. `health-web`과 동일하게 우선 회원 상세 화면 내 패널/위젯으로 임베드하는 것으로 가정하고, `SCREEN_DESIGN.md`에 챗봇 화면 명세가 추가되면 그 정의를 따르도록 갱신한다.

## 8. 배포 인프라

- health-mobile(Web 빌드)은 **health-backend와 같은 서버에 컨테이너로 배포**된다.
- backend 접속정보(axios `baseURL`, WebSocket URL)는 환경별로 다르다:

  | 환경 | backend 접속정보 |
  |---|---|
  | dev(로컬 개발) | `127.0.0.1` |
  | 상용(production) | `172.27.0.192` |

- 포트를 포함한 실제 접속 URL은 9장 환경변수로 분리해 관리한다.
- **TODO**: 네이티브(iOS/Android) 앱으로도 배포할지 여부는 아직 결정되지 않았다. 필요해지면 EAS Build 등 별도 빌드/배포 절차를 정해 이 장과 `docs/TASKS.md`에 반영한다.

## 9. 환경변수 (.env)

- Expo 규칙에 따라 `EXPO_PUBLIC_` 접두사가 붙은 변수만 클라이언트 번들에 노출된다. backend URL은 반드시 `EXPO_PUBLIC_` 접두사를 붙인다.
- backend 접속 URL과 웹서버(Expo/Metro 웹 개발 서버) 포트를 코드에 하드코딩하지 않고 `.env` 계열 파일로 분리한다. `.env*` 파일은 `.gitignore`에 포함하고, 값 없는 키 목록만 `.env.example`로 커밋한다.

`.env.example` (커밋 대상, 값은 비워둠)
```
EXPO_PUBLIC_API_BASE_URL=
EXPO_PUBLIC_WS_BASE_URL=
PORT=
```

`.env`(dev, 미커밋)
```
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3030
EXPO_PUBLIC_WS_BASE_URL=ws://127.0.0.1:3030
PORT=8081
```

`.env.production`(상용, 미커밋 또는 배포 파이프라인에서 주입)
```
EXPO_PUBLIC_API_BASE_URL=http://172.27.0.192:3030
EXPO_PUBLIC_WS_BASE_URL=ws://172.27.0.192:3030
PORT=8081
```

- `PORT`는 Expo(Metro) 웹 개발 서버 포트다. 기본값 `8081`을 그대로 쓰며, 10장 CORS 허용 origin(`http://localhost:8081`)과 반드시 일치시킨다. 상용 배포 시 컨테이너 노출 포트가 달라지면 이 값과 배포 설정(리버스 프록시 등)을 함께 갱신한다.
- backend의 실제 포트(`health-backend/.env`의 `PORT`, 기본 3030)가 바뀌면 `EXPO_PUBLIC_API_BASE_URL`/`EXPO_PUBLIC_WS_BASE_URL`도 함께 갱신해야 한다.

## 10. CORS

health-mobile이 Web 타겟(8장)으로 브라우저에서 backend를 직접 호출하므로 브라우저의 CORS 정책이 적용된다(추후 네이티브 앱 빌드를 추가하면 그 빌드는 CORS 대상이 아니다).

health-backend(`main.ts`의 `app.enableCors(...)`, `realtime.gateway.ts`의 WebSocket `cors` 옵션)에 아래 origin을 추가해야 한다.

| Origin | 용도 |
|---|---|
| `http://localhost:8081` | health-mobile 로컬 개발 서버(Expo Web, 9장 `PORT` 기본값과 일치) — 브라우저로 확인할 때 필요 |
| (상용 도메인, 확인 필요) | 배포된 health-mobile 도메인 |

- refreshToken을 쿠키가 아닌 `expo-secure-store`(6장)에 저장하고 accessToken은 `Authorization` 헤더로만 전송하므로, `health-web`과 달리 쿠키 기반 `credentials: true` 설정이 필수는 아니다. 다만 실제 axios/fetch 설정에 쿠키를 함께 쓰게 되면 이 부분을 재확인해야 한다.
- **TODO**: 상용 도메인은 예시가 아직 없다. 실제로는 학생별로 다른 도메인이 제공되므로, 본인에게 제공된 도메인 정보를 확인한 뒤 이 표와 backend CORS 설정을 함께 갱신해야 한다.
- health-backend 현재 설정(`origin: true`)은 모든 origin을 허용하는 임시 상태다. 위 화이트리스트 적용은 `health-backend` 쪽 작업이며, 반영 여부는 `health-backend/docs/TASKS.md`에서 함께 추적한다.

## 11. 참고 문서

- [`../../docs/REQUIREMENTS.md`](../../docs/REQUIREMENTS.md) — 제품 요구사항
- [`../../docs/DATA_MODEL.md`](../../docs/DATA_MODEL.md) — 데이터 계약(모든 프로젝트 필수 참조)
- [`../../docs/SCREEN_DESIGN.md`](../../docs/SCREEN_DESIGN.md) — 화면별 구성/명세
- [`../../docs/DESIGN.md`](../../docs/DESIGN.md) — 디자인 가이드(현재 비어있음, 3장 참고 — 이 프로젝트의 정식 스타일 기준 문서)
- [`../../health-backend/docs/API_SPEC.md`](../../health-backend/docs/API_SPEC.md) — health-backend가 제공하는 API 명세(health-backend 소유, 이 프로젝트는 참조만)
- [`../../shared/types.ts`](../../shared/types.ts), [`../../shared/utils.ts`](../../shared/utils.ts) — 공유 타입/순수 로직(4장 참고)
- [`../../health-web/docs/ARCHITECTURE.md`](../../health-web/docs/ARCHITECTURE.md) — 동일 기능을 웹으로 구현한 참고 설계
- [`docs/TASKS.md`](./TASKS.md) — 작업 목록
