# API 명세 (내부 - health-backend 제공 API)

> health-backend(NestJS)가 health-web·health-mobile에 제공하는 자체 API 명세다. 이 프로젝트가 소유하며, 소비하는 쪽(web·mobile)은 참조만 한다.
> health-backend가 시뮬레이터로부터 데이터를 수신하는 인터페이스는 이 문서와 별개이며 [SIMULATOR_API_SPEC.md](./SIMULATOR_API_SPEC.md)를 참고한다.
> 회원·건강데이터 테이블 스키마는 [`../../docs/DATA_MODEL.md`](../../docs/DATA_MODEL.md) 1장을 참고한다.

## 목차
- 0. 공통 규칙
- 1. REST API
  - 1.1 회원 로그인
  - 1.2 AccessToken 재발급
  - 1.3 회원 목록 조회
  - 1.4 회원 상세조회
  - 1.5 회원 건강 데이터 조회
  - 1.6 채팅
  - 1.7 웹훅 메시지
- 2. WebSocket API (실시간 건강데이터 전달)
  - 2.1 초기 조회 → 실시간 수신 흐름
  - 2.2 접속 방법
  - 2.3 이벤트 목록
- 3. 에러 코드

## 0. 공통 규칙

- Base URL: `https://{server}/api`
- 인증: REST는 `Authorization: Bearer {AccessToken}` 헤더 사용 (로그인·재발급 API 제외)
- RefreshToken은 응답 바디가 아니라 **HttpOnly 쿠키**(`Set-Cookie: refreshToken=...`)로 내려간다 (1.1, 1.2 참고). 클라이언트는 요청 시 `credentials: 'include'`(axios `withCredentials: true`)를 설정해야 쿠키가 실린다. 서버 CORS는 이 쿠키 전송을 위해 와일드카드가 아닌 명시적 origin 화이트리스트 + `credentials: true`로 구성되어 있다([ARCHITECTURE.md](./ARCHITECTURE.md) 1장).
- Content-Type: `application/json`
- 공통 응답 포맷
  ```json
  { "success": true, "data": { }, "error": null }
  ```
  실패 시
  ```json
  { "success": false, "data": null, "error": { "code": "STRING_CODE", "message": "설명" } }
  ```
- 회원유형(`role`)은 `DOCTOR`(의사) / `PATIENT`(환자) 두 가지이며, [`docs/DATA_MODEL.md`](../../docs/DATA_MODEL.md) 1.1 회원관리테이블의 회원유형 필드를 따른다.
- 환자 계정은 자기 자신의 데이터만 조회할 수 있다 (`docs/REQUIREMENTS.md` 2·3번). AccessToken Payload의 `userid`와 요청 대상 회원아이디가 다르고 `role`이 `PATIENT`이면 403(`FORBIDDEN`)을 반환한다.
- **클라이언트(web·mobile)는 시뮬레이터 서버에 절대 직접 연결하지 않는다.** 시뮬레이터가 보내는 모든 데이터는 health-backend가 먼저 수신해 DB에 저장하고, 그 이후에만 health-backend가 제공하는 REST(1.5)·WebSocket(2장)을 통해 클라이언트에 전달된다 (`SIMULATOR_API_SPEC.md`는 health-backend 내부 연동 전용이며 클라이언트가 참조·호출할 대상이 아니다).
- 실시간 그래프가 필요한 화면(회원 상세조회)은 **"① REST로 DB에 저장된 최근 데이터 조회 → ② WebSocket 구독으로 이후 데이터 실시간 수신"** 순서로만 연동한다. 상세 흐름은 2.1 참고.

## 1. REST API

### 1.1 회원 로그인
`POST /auth/login`

인증이 필요 없는 공개 API다.

**요청 (Body)**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| id | string | Y | 회원아이디 |
| passwd | string | Y | 비밀번호 (평문 전송, 서버에서 해시 비교) |

```json
{ "id": "user_001", "passwd": "p@ssw0rd" }
```

**응답**

| 필드 | 타입 | 설명 |
|---|---|---|
| accessToken | string | JWT AccessToken |
| user | object | 회원정보 전체 (아래 표) |

RefreshToken은 응답 바디에 포함되지 않고, 응답 헤더의 `Set-Cookie`로 내려간다 (`refreshToken`, `HttpOnly`, `Path=/api/auth`, 만료시각은 RefreshToken의 `exp`와 동일). 배포 환경(`NODE_ENV=production`)에서는 `Secure` + `SameSite=None`, 그 외(dev)에서는 `SameSite=Lax`로 설정된다 — health-web이 dev에서도 다른 포트(5173↔3030)로 호출하지만 같은 호스트이므로 `Lax`로 충분하다.

`user` 객체 (회원관리테이블 전체 컬럼, [DATA_MODEL.md](../../docs/DATA_MODEL.md) 1.1 기준. `암호` 필드는 응답에 포함하지 않는다)

| 필드 | 타입 | 설명 |
|---|---|---|
| userId | string | 회원ID |
| name | string | 회원명 |
| gender | string | 성별 |
| birthDate | string | 생년월일(YYYYMMDD) |
| role | "DOCTOR" \| "PATIENT" | 회원유형 |
| apiKey | string | 시뮬레이터 인증용 API Key |
| createdAt | string | 등록일 |
| updatedAt | string | 수정일 |

AccessToken/RefreshToken의 JWT Payload는 `userid`, `name`, `api_key` 세 필드로 구성한다 ([ARCHITECTURE.md](./ARCHITECTURE.md) 4장).

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "user": {
      "userId": "user_001",
      "name": "박지훈",
      "gender": "M",
      "birthDate": "19800101",
      "role": "PATIENT",
      "apiKey": "key_001",
      "createdAt": "2026-01-01T00:00:00+09:00",
      "updatedAt": "2026-01-01T00:00:00+09:00"
    }
  },
  "error": null
}
```
```
Set-Cookie: refreshToken=eyJhbGciOi...; Path=/api/auth; HttpOnly; SameSite=Lax
```

**추가 조건**
- id/passwd 불일치 시 401(`INVALID_CREDENTIALS`)을 반환한다. 아이디 존재 여부를 구분해 응답하지 않는다(계정 존재 유추 방지).
- AccessToken 만료시간은 짧게(예: 30분), RefreshToken은 길게(예: 14일) 설정한다. 정확한 값은 구현 시 `.env`로 관리한다.

### 1.2 AccessToken 재발급
`POST /auth/refresh`

**요청**

Body 없음. 1.1에서 내려받은 `refreshToken` 쿠키를 그대로 전송한다(브라우저가 자동 첨부, 클라이언트 코드는 `credentials: 'include'`/`withCredentials: true`만 설정하면 된다).

**응답**

| 필드 | 타입 | 설명 |
|---|---|---|
| accessToken | string | 새로 발급된 AccessToken |

```json
{ "success": true, "data": { "accessToken": "eyJhbGciOi..." }, "error": null }
```

**추가 조건**
- `refreshToken` 쿠키가 없거나, 값이 만료되었거나 유효하지 않으면 401(`INVALID_REFRESH_TOKEN`)을 반환하며, 클라이언트는 재로그인해야 한다.
- RefreshToken 자체는 이 API로 갱신하지 않는다 (RefreshToken 로테이션은 범위 밖). 응답에서도 쿠키를 다시 내려주지 않는다.

### 1.3 회원 목록 조회
`GET /members`

**요청 (Query)**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| userId | string | N | 검색할 회원아이디(부분일치). 의사 계정에서만 유효 |
| role | "DOCTOR" \| "PATIENT" | N | 회원유형 필터. 의사 계정에서만 유효 |

**응답**

| 필드 | 타입 | 설명 |
|---|---|---|
| members | array | 회원정보 목록 (1.1의 `user` 객체 배열, `apiKey` 제외) |

- **의사** 계정으로 호출: `userId`/`role` 조건에 맞는 전체 회원 목록을 반환한다. 조건이 없으면 전체 회원을 반환한다.
- **환자** 계정으로 호출: 전송값(`userId`, `role`)과 무관하게 자기 자신의 데이터 1건만 반환한다.

```json
{
  "success": true,
  "data": {
    "members": [
      { "userId": "user_001", "name": "박지훈", "gender": "M", "birthDate": "19800101", "role": "PATIENT", "createdAt": "...", "updatedAt": "..." }
    ]
  },
  "error": null
}
```

### 1.4 회원 상세조회
`GET /members/:userId`

**요청 (Path)**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| userId | string | Y | 조회할 회원아이디 |

**응답**

| 필드 | 타입 | 설명 |
|---|---|---|
| member | object | 회원정보 (1.1의 `user` 객체, `apiKey` 제외) + `diseases`, `memo` |
| recentWeights | array | 최근 7일간 체중 기록 ([DATA_MODEL.md](../../docs/DATA_MODEL.md) 1.6 UserBodyRecord, 측정일시 내림차순) |
| recentBloodPressures | array | 최근 7일간 혈압 기록 (1.5 UserBloodPressure, 측정일시 내림차순) |
| recentGlucoses | array | 최근 7일간 혈당 기록 (1.7 UserGlucose, 측정일시 내림차순) |

`member.diseases`: `[{ diseaseCode, nameKr, diagnosedAt }]` (1.2 질병코드테이블 + 1.3 회원-질병관리테이블 조인)

```json
{
  "success": true,
  "data": {
    "member": {
      "userId": "user_001",
      "name": "박지훈",
      "gender": "M",
      "birthDate": "19800101",
      "role": "PATIENT",
      "diseases": [{ "diseaseCode": "HYP", "nameKr": "고혈압", "diagnosedAt": "2025-03-10T00:00:00+09:00" }],
      "memo": null
    },
    "recentWeights": [
      { "measuredAt": "2026-07-16T08:00:00+09:00", "weightKg": 88, "bmi": 29.8 }
    ],
    "recentBloodPressures": [
      { "measuredAt": "2026-07-16T06:00:00+09:00", "systolic": 138, "diastolic": 88, "status": null }
    ],
    "recentGlucoses": [
      { "measuredAt": "2026-07-16T07:00:00+09:00", "glucoseMgDl": 96, "status": "normal" }
    ]
  },
  "error": null
}
```

**추가 조건**
- 환자 계정이 자기 자신이 아닌 `userId`를 조회하면 403(`FORBIDDEN`)을 반환한다.
- 존재하지 않는 `userId`는 404(`MEMBER_NOT_FOUND`)를 반환한다.
- 심박·걸음수 등 그 이후의 실시간 갱신 데이터는 이 API가 아니라 2장 WebSocket API로 전달한다 (`docs/REQUIREMENTS.md` 3번). 이 API가 반환하는 최근 7일 체중·혈압·혈당은 2.1의 1차 조회 단계에 해당하며, 이후 갱신분(혈당 포함)은 동일하게 소켓으로 이어붙인다.

### 1.5 회원 건강 데이터 조회
`GET /members/:userId/health-data`

혈압·혈당·심박 등 시계열 건강데이터를 기간 조건으로 조회한다.

**요청**

Path

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| userId | string | Y | 조회할 회원아이디 |

Query

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| type | "heartRate" \| "bloodPressure" \| "weight" \| "glucose" \| "stepCount" | Y | 조회할 건강데이터 종류 |
| startAt | string | Y | 조회 시작일시 (ISO 8601, KST) |
| endAt | string | Y | 조회 종료일시 (ISO 8601, KST) |

**응답**

`type`에 대응하는 테이블([DATA_MODEL.md](../../docs/DATA_MODEL.md) 1.4~1.8)의 전체 컬럼을, 측정일시가 `startAt`~`endAt` 범위인 행 전체를 측정일시 오름차순으로 반환한다.

| 필드 | 타입 | 설명 |
|---|---|---|
| type | string | 요청한 건강데이터 종류 |
| records | array | 해당 타입 테이블의 행 배열 |

```json
{
  "success": true,
  "data": {
    "type": "heartRate",
    "records": [
      { "userId": "user_001", "heartRate": 78, "status": null, "note": null, "measuredAt": "2026-07-16T09:00:00+09:00", "createdAt": "2026-07-16T09:00:00+09:00" }
    ]
  },
  "error": null
}
```

**추가 조건**
- `startAt`이 `endAt`보다 늦으면 400(`INVALID_DATE_RANGE`)을 반환한다.
- 백엔드 보존정책상 7일이 지난 데이터는 삭제되므로([ARCHITECTURE.md](./ARCHITECTURE.md) 5장), 7일 이전 구간을 조회해도 해당 구간 데이터는 없을 수 있다.
- 환자 계정이 자기 자신이 아닌 `userId`를 조회하면 403(`FORBIDDEN`)을 반환한다.
- 실시간 그래프 초기값 조회 용도로 쓸 때는 `endAt`=현재시각으로 호출한다. 이 API는 DB에 이미 저장된 데이터까지만 반환하며, 이후 새로 발생하는 데이터는 2장 WebSocket으로 이어받는다 (2.1 흐름 참고).

### 1.6 채팅
`POST /chat`

health-ai(AI Agent) API를 프록시한다. web·mobile은 이 API만 호출하며 health-ai를 직접 호출하지 않는다 ([ARCHITECTURE.md](../../docs/ARCHITECTURE.md) 2장).

**요청 (Body)**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| message | string | Y | 질의내용 |

```json
{ "message": "user_001의 최근 혈압 추이를 요약해줘" }
```

**응답**

| 필드 | 타입 | 설명 |
|---|---|---|
| answer | string | AI Agent API 답변내용 |

```json
{ "success": true, "data": { "answer": "user_001님의 최근 7일 혈압은..." }, "error": null }
```

**추가 조건**
- health-ai 호출 상세 스펙(요청/응답 필드)은 `health-ai/docs/API_SPEC.md`를 따른다. 이 API는 그 응답을 그대로 프록시하며 임의로 가공하지 않는다.
- health-ai 응답 지연/오류 시 502(`AI_AGENT_UNAVAILABLE`)를 반환한다.

### 1.7 웹훅 메시지
`POST /webhook`

이상 데이터 감지 시(ALM) Slack으로 알림을 전송하는 내부용 API다. health-backend 내부(AlertModule)에서 호출하는 것을 기본으로 하며, 외부에서 호출할 경우 서버 간 인증(API Key 등)을 별도로 적용한다.

**요청 (Body)**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| message | string | Y | 전송할 메시지내용 |

```json
{ "message": "[경고] user_009 심박수 132bpm (이상 이벤트 감지)" }
```

**응답**

| 필드 | 타입 | 설명 |
|---|---|---|
| sent | boolean | 전송완료여부 |
| sentAt | string | 전송시각 (ISO 8601, KST) |

```json
{ "success": true, "data": { "sent": true, "sentAt": "2026-07-16T09:00:05+09:00" }, "error": null }
```

**추가 조건**
- Slack 웹훅 전송 실패 시 `sent: false`와 함께 200을 반환하고, `error`에 실패 사유를 담는다 (재시도는 호출측 책임).
- 여러 학생/서버가 같은 Slack 채널(웹훅 URL)을 공유하므로, 실제 전송되는 텍스트 앞에는 `[{DATABASE_USER} 서버]`가 자동으로 붙는다 (예: `[user02 서버] [경고] user_009 심박수 132bpm (이상 이벤트 감지)`). 요청 시 보낸 `message` 값 자체를 바꾸지는 않는다.

## 2. WebSocket API (실시간 건강데이터 전달)

health-backend의 `RealtimeModule`이 프론트엔드(web·mobile)에 제공하는 WebSocket 게이트웨이다. health-backend는 시뮬레이터와 상시 연결을 유지하며 수신한 이벤트를 **DB에 먼저 저장한 뒤** 접속 중인 클라이언트에게 회원 단위로 중계한다 ([ARCHITECTURE.md](./ARCHITECTURE.md) 5장 DATA). 클라이언트는 이 게이트웨이(`/realtime`)에만 연결하며, 시뮬레이터의 `/simulator` 네임스페이스([SIMULATOR_API_SPEC.md](./SIMULATOR_API_SPEC.md))에는 접근할 수 없다 — 그 인터페이스는 health-backend 내부 연동 전용이다. 이벤트 이름·필드 구조는 SIMULATOR_API_SPEC.md, [`Health_interface.pdf`](./Health_interface.pdf)의 정의를 그대로 따르며 임의로 재정의하지 않는다.

### 2.1 초기 조회 → 실시간 수신 흐름

화면 진입 시 클라이언트는 아래 두 단계로만 데이터를 채운다. 두 단계 모두 health-backend만 상대하며, 그 뒤에서 DB 저장과 시뮬레이터 연결을 처리하는 것은 health-backend의 책임이다.

1. **① 1차 조회 (REST, DB에 이미 저장된 가장 최근 데이터까지)**
   - 회원정보 + 체중/혈압/혈당 최근 7일: 1.4 회원 상세조회
   - 심박·걸음수 등 그 외 항목의 최근 데이터: 1.5 회원 건강 데이터 조회를 `endAt`=현재시각으로 호출
   - 각 응답의 마지막 레코드 `measuredAt`(또는 `createdAt`)을 그래프의 "여기까지 이미 그렸다" 커서로 클라이언트가 보관한다.
2. **② 실시간 수신 (WebSocket 구독)**
   - 2.2 접속 방법에 따라 `/realtime`에 연결하고 대상 회원을 구독한다.
   - 이후 health-backend가 시뮬레이터로부터 수신 → DB 저장과 동시에 중계하는 이벤트(2.3 이벤트 목록)를 그래프에 이어붙인다.
   - 소켓은 **연결 이후 새로 발생한 이벤트만** 전달하며 과거 데이터를 재전송하지 않는다. 1차 조회의 커서보다 `measuredAt`이 이르거나 같은 이벤트는 클라이언트에서 무시한다 (조회~구독 사이 경계 중복 방지).
3. 네트워크 문제 등으로 소켓이 끊겼다 재연결된 경우, 끊긴 구간의 데이터는 소켓으로 복구되지 않으므로 1.5를 `startAt`=마지막 수신 시각으로 다시 호출해 공백을 메운 뒤 재구독한다.

### 2.2 접속 방법

- 네임스페이스: `{ws|wss}://{server}/realtime`
- 인증: 연결(handshake) 시점의 쿼리 파라미터로 AccessToken을 전달한다.
  ```
  wss://{server}/realtime?token={AccessToken}
  ```
- 연결 성공 시 서버는 AccessToken Payload의 `userid`를 기준으로 해당 회원 전용 룸(room)에 클라이언트를 join시킨다.
  - **환자** 계정: 자기 자신의 룸에만 join된다.
  - **의사** 계정: 회원 상세조회 화면 진입 시 조회 대상 회원의 `userId`를 `subscribe` 이벤트로 전송해 해당 회원 룸을 구독한다 (여러 회원 동시 구독 가능, `unsubscribe`로 해제).
    ```js
    socket.emit('subscribe', { userId: 'user_001' });
    socket.emit('unsubscribe', { userId: 'user_001' });
    ```
- 인증 실패(AccessToken 만료·위조) 시 `error` 이벤트(`{ code: "AUTH_FAILED", message: "..." }`)를 보낸 뒤 연결을 끊는다.

### 2.3 이벤트 목록

health-backend가 시뮬레이터로부터 수신 즉시 같은 형태로 중계하는 이벤트다. 페이로드 형태(`{ event, data }`)와 필드는 [SIMULATOR_API_SPEC.md](./SIMULATOR_API_SPEC.md) 2장, [DATA_MODEL.md](../../docs/DATA_MODEL.md) 2장과 동일하다.

| 이벤트 | 설명 |
|---|---|
| `heartRate` | 심박수 (`docs/REQUIREMENTS.md` 4번 실시간 대상) |
| `stepCount` | 당일 누적 걸음 수 (`docs/REQUIREMENTS.md` 4번 실시간 대상) |
| `bloodPressure` | 수축기/이완기 혈압 |
| `weight` | 체중, BMI, 체지방률, 골격근량 |
| `glucose` | 혈당 (`docs/REQUIREMENTS.md` 4번 실시간 대상) |
| `sleep` | 수면 시간/품질 |

```js
socket.on('heartRate', (msg) => console.log(msg));
// { event: 'heartRate', data: { timestamp, userId, heartRate, source } }
```

**추가 조건**
- 회원 상세조회 화면(`docs/REQUIREMENTS.md` 3·4번)은 심박·혈당·걸음수를 실시간 그래프로 표시한다. 나머지 이벤트(`bloodPressure`, `weight`, `sleep`)도 동일하게 구독 가능하나 화면 요구사항상 필수는 아니다.
- 구독하지 않은(룸에 join하지 않은) 회원의 이벤트는 전달되지 않는다.

## 3. 에러 코드

| code | HTTP 상태 | 설명 |
|---|---|---|
| INVALID_CREDENTIALS | 401 | 로그인 id/passwd 불일치 |
| INVALID_REFRESH_TOKEN | 401 | RefreshToken 만료/위조 |
| AUTH_FAILED | 401 | AccessToken 만료/위조 (REST), WebSocket 인증 실패 |
| FORBIDDEN | 403 | 환자 계정이 타인 데이터 접근 시도 |
| MEMBER_NOT_FOUND | 404 | 존재하지 않는 회원아이디 |
| INVALID_DATE_RANGE | 400 | startAt이 endAt보다 늦은 경우 |
| AI_AGENT_UNAVAILABLE | 502 | health-ai 호출 실패/타임아웃 |
