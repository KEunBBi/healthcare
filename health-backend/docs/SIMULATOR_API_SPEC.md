# API 명세 (외부 연동 - 건강정보 시뮬레이터 서버)

> **⚠️ 외부 데이터 명세**
> 본 문서는 우리 시스템이 자체적으로 설계한 API가 아니라, **외부에서 제공되는 건강정보 시뮬레이터 서버**의
> WebSocket 인터페이스를 정리한 문서입니다. health-backend만 이 서버에 연결하므로 이 프로젝트 소유로 둔다.
> health-backend가 프론트엔드(web·mobile)에 제공하는 자체 API 명세는 [API_SPEC.md](./API_SPEC.md) 참고.
> 원본 출처: [`Health_interface.pdf`](./Health_interface.pdf) (Interface Specification - 응답 프로토콜 상세)
> 이벤트별 필드 상세 및 값 생성 규칙은 [`../../docs/DATA_MODEL.md`](../../docs/DATA_MODEL.md) 2장을 참고하세요.

## 0. 공통 규칙
- 프로토콜: WebSocket (Socket.IO)
- 모든 이벤트 페이로드는 아래 형태로 감싸져 전송된다.
  ```json
  { "event": "<이벤트명>", "data": { ... } }
  ```
- `timestamp` 필드는 서버 실행 타임존과 무관하게 항상 **한국시간(KST, UTC+9)** 로 계산되며, `+09:00` 오프셋이 붙은 ISO 8601 문자열이다.
  - 예: `2026-07-03T22:07:15.541+09:00`
- 회원별 취침~기상 시간대("수면 중")는 회원 고유 기준 수면시간(`userId` 해시로 6.0~9.0시간 산출, KST 07시 기상 고정)을 기준으로 판정되며, 이 판정 결과가 심박수·걸음수·혈압·혈당 값 생성에 공통으로 반영된다.

## 1. 접속 방법

### 1.1 엔드포인트 & 인증
- 네임스페이스: `{ws|wss}://{server}/simulator`
- 인증은 별도 이벤트가 아니라 **연결(handshake) 시점의 쿼리 파라미터**로 이루어진다.
  - `userId`, `apiKey`: 회원관리테이블(`User`)에 저장·관리되는 값이다. health-backend가 시뮬레이터에 연결할 때 회원별로 DB에서 조회해 사용한다. 필드 정의는 [DATA_MODEL.md](../../docs/DATA_MODEL.md) 1.1 참고.
- 예시
  ```
  wss://healthsim.iranglab.com/simulator?userId=user_001&apiKey=key_001
  ws://localhost:10000/simulator?userId=user_001&apiKey=key_001
  ```

### 1.2 Socket.IO 클라이언트 예시 (Node.js)
```js
const { io } = require('socket.io-client');

const socket = io('wss://healthsim.iranglab.com/simulator', {
  transports: ['websocket'], // polling 폴백 없이 websocket으로 고정
  query: { userId: 'user_001', apiKey: 'key_001' },
  reconnectionAttempts: 5,
  timeout: 5000,
});

socket.on('connect', () => console.log('connected', socket.id));
socket.on('userProfile', (msg) => console.log(msg));
socket.on('heartRate', (msg) => console.log(msg));
// stepCount, bloodPressure, weight, glucose, sleep 도 동일하게 socket.on(...)으로 구독
socket.on('error', (err) => console.error(err));
socket.on('disconnect', (reason) => console.log('disconnected:', reason));
```
> `transports: ['websocket']`을 지정하지 않으면 Socket.IO가 기본적으로 HTTP 롱폴링으로 먼저 시도한 뒤 업그레이드하므로, 초기 이벤트 수신이 지연될 수 있어 명시적으로 고정하는 것을 권장한다.

### 1.3 연결 성공/실패 흐름
1. 클라이언트가 위 URL로 연결하면 서버(`SimulatorGateway.handleConnection`)가 `userId` / `apiKey`를 검증한다.
2. **실패 시**: `error` 이벤트(`{ code: "AUTH_FAILED", message: "Invalid userId or apiKey." }`)를 보낸 뒤 서버가 즉시 소켓 연결을 끊는다. (재시도해도 같은 자격증명이면 계속 실패)
3. **성공 시**: `userProfile` 이벤트를 1회 보낸 뒤, 곧바로 `weight` / `bloodPressure` / `glucose` / `sleep`을 각 1회 즉시 전송하고, 이어서 아래 주기로 반복 전송이 시작된다.
   - `heartRate`: 4초
   - `stepCount`: 4.5초
   - `bloodPressure`: 2시간
   - `glucose`: 1시간
   - `weight`: 매일 아침/점심/저녁(KST 08/12/18시)
   - `sleep`: 매일 기상 시각(KST 07시)

   자세한 이벤트별 필드 스펙은 [DATA_MODEL.md](../../docs/DATA_MODEL.md) 참고.

### 1.4 연결 해제 및 재접속
- 클라이언트가 연결을 끊거나 네트워크가 끊기면 서버(`handleDisconnect`)가 해당 연결의 모든 타이머를 정리한다(`destroySession`).
- **세션 상태는 저장되지 않는다.** 재접속하면 완전히 새 세션으로 시작되어 `stepCount`는 0부터, `weight` / `sleep`의 "오늘 이미 보냈는지" 여부도 초기화된 상태로 다시 계산된다.
- 같은 `userId`로 동시에 여러 소켓을 연결하면 서버 내부적으로 연결(`client.id`)마다 독립된 세션을 생성한다 — 즉 두 연결의 `stepCount` 누적치나 오늘 전송 여부가 서로 공유되지 않고 각자 따로 계산된다.

### 1.5 연결 상태 확인 (ping/pong)
- 클라이언트가 임의 데이터로 `ping`을 보내면 서버가 동일한 데이터를 `pong`으로 그대로 반환한다. 왕복 지연 측정이나 연결 확인 용도로 사용할 수 있다.
```js
socket.emit('ping', { ts: Date.now() });
socket.on('pong', (msg) => console.log('rtt check', msg));
```

## 2. 이벤트 목록 (개요)

| 이벤트 | 발생 시점 | 설명 |
|---|---|---|
| `userProfile` | 인증 성공 직후 1회 | 회원 프로필/질환 정보 |
| `heartRate` | 4초 주기 (+ 이상 이벤트 10분 주기) | 심박수 |
| `stepCount` | 4.5초 주기 | 당일 누적 걸음 수 |
| `bloodPressure` | 접속 즉시 1회 + 2시간 주기 | 수축기/이완기 혈압 |
| `weight` | 접속 즉시 1회 + 매일 08/12/18시 | 체중, BMI, 체지방률, 골격근량 |
| `glucose` | 접속 즉시 1회 + 1시간 주기 | 혈당 |
| `sleep` | 접속 즉시 1회 + 매일 기상 시각(07시) | 수면 시간/품질 |
| `error` | 인증 실패 시 | 인증 오류 |
| `pong` | 클라이언트 `ping` 요청 시 | ping echo |

각 이벤트의 필드, 타입, 값 생성 로직, 예시 payload는 [DATA_MODEL.md](../../docs/DATA_MODEL.md) 에서 확인할 수 있다.
