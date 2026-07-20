# API 테스트 가이드

health-backend API를 테스트하는 5가지 방법을 정리한다. 전체 API 요청/응답 스펙은 [`../docs/API_SPEC.md`](../docs/API_SPEC.md) 참고.

- 인증 API: `POST /api/auth/login`, `POST /api/auth/refresh`
- 회원목록 API: `GET /api/members`
- 회원상세조회 API: `GET /api/members/:userId`
- 회원건강데이터 조회 API: `GET /api/members/:userId/health-data?type=&startAt=&endAt=`

## 목차
- 0. 사전 준비
- 1. REST Client (.http)
- 2. Swagger 문서
- 3. curl 명령 (Mac/Windows)
- 4. Jest 단위테스트
- 5. e2e 테스트

## 0. 사전 준비

- `.env`에 `DATABASE_*`, `JWT_*` 값이 채워져 있어야 한다 ([`../.env.example`](../.env.example) 참고).
- 로그인 테스트에 쓰는 계정은 `../docs/insert.sql` 시드 데이터 기준이다 (환자: `user_001` / `user_001123!`, 의사: `admin` / `admin001123!`). 시드가 DB에 적용되어 있지 않으면 먼저 `table.sql`, `insert.sql`을 실행한다.
- 서버 기동: `npm run start:dev` (기본 포트 3030, Base URL `http://localhost:3030/api`).

## 1. REST Client (.http)

VSCode 확장 [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) (`humao.rest-client`)를 설치한 뒤 아래 파일을 연다.

- [`http/auth.http`](./http/auth.http) — 로그인/재발급
  - 각 요청 위에 뜨는 **Send Request** 링크를 클릭해 실행한다.
  - 1번(로그인) 요청은 `# @name login`으로 이름이 붙어 있어, 6번(인증 확인) 요청이 `{{login.response.body.$.data.accessToken}}`으로 응답값을 자동으로 이어받는다. RefreshToken은 응답 바디가 아니라 `Set-Cookie`로 내려오며 REST Client가 쿠키 저장소에 자동 보관하므로, 4번(재발급) 요청은 Body 없이 쿠키만으로 동작한다. 즉 1번을 먼저 실행한 뒤 4번·6번을 실행해야 한다.
- [`http/members.http`](./http/members.http) — 회원목록·상세조회·건강데이터 조회
  - 1번(의사 로그인)·2번(환자 로그인)을 먼저 실행한 뒤, 3~7번에서 각 역할별 토큰(`{{loginDoctor...}}` / `{{loginPatient...}}`)으로 `GET /members`를 호출·비교해본다.
  - 8~11번은 `GET /members/:userId` 상세조회다. 8·9번은 정상 조회(환자 자기 자신 / 의사가 임의 회원), 10번은 환자가 타인을 조회할 때 403, 11번은 존재하지 않는 회원아이디로 404가 나는지 확인한다.
  - 12~18번은 `GET /members/:userId/health-data`다. `type`별(심박·혈압·혈당·체중·걸음수)로 개별 조회하며, `startAt`/`endAt`은 REST Client의 동적 변수(`{{$datetime iso8601 -1 d}}` 등)로 자동 채워진다. 17번은 기간이 뒤바뀐 400 케이스, 18번은 환자가 타인 데이터를 조회하는 403 케이스다.
- 파일 상단 `@baseUrl` 변수로 대상 서버를 바꿀 수 있다(배포 서버 테스트 시).

## 2. Swagger 문서

서버 기동 후 브라우저에서 접속한다.

```
http://localhost:3030/api/docs
```

- `AuthController`의 `login`/`refresh`는 `auth` 태그, `MembersController`의 회원목록·상세조회·건강데이터 조회는 `members` 태그로 묶여 있고, 각각 요청/응답 예시가 포함되어 있다.
- 우측 상단 **Authorize** 버튼에 로그인 응답의 `accessToken`을 입력하면, `members`(건강데이터 조회 포함)·`chat` 등 인증이 필요한 API도 Swagger UI에서 바로 호출해볼 수 있다.

## 3. curl 명령

### Mac / Linux (bash, zsh)

```bash
# 로그인 (-c로 Set-Cookie의 refreshToken을 cookie.txt에 저장)
curl -s -c cookie.txt -X POST http://localhost:3030/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"id":"user_001","passwd":"user_001123!"}'

# 재발급 (-b로 저장해둔 쿠키를 그대로 전송, Body 불필요)
curl -s -b cookie.txt -X POST http://localhost:3030/api/auth/refresh
```

### Windows (PowerShell)

```powershell
# 로그인 (-c로 Set-Cookie의 refreshToken을 cookie.txt에 저장)
curl.exe -c cookie.txt -X POST http://localhost:3030/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"id\":\"user_001\",\"passwd\":\"user_001123!\"}'

# 재발급 (-b로 저장해둔 쿠키를 그대로 전송, Body 불필요)
curl.exe -b cookie.txt -X POST http://localhost:3030/api/auth/refresh
```
> PowerShell의 `curl`은 기본적으로 `Invoke-WebRequest` 별칭이므로, 실제 curl.exe를 쓰려면 위처럼 `curl.exe`로 명시한다. 큰따옴표 이스케이프가 번거로우면 `Invoke-RestMethod`를 쓰는 것도 방법이다:
> ```powershell
> Invoke-RestMethod -Uri http://localhost:3030/api/auth/login -Method Post -ContentType "application/json" -Body '{"id":"user_001","passwd":"user_001123!"}'
> ```

### Windows (명령 프롬프트 cmd.exe)

```cmd
curl -X POST http://localhost:3030/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"id\":\"user_001\",\"passwd\":\"user_001123!\"}"
```

### 회원목록 조회 (인증 필요)

먼저 로그인해서 받은 `accessToken`을 아래 명령의 토큰 자리에 넣는다.

**Mac / Linux**
```bash
ACCESS_TOKEN="여기에_accessToken_붙여넣기"

# 의사 계정: 전체 회원 목록
curl -s http://localhost:3030/api/members -H "Authorization: Bearer $ACCESS_TOKEN"

# 조건 필터 (의사 계정에서만 유효)
curl -s "http://localhost:3030/api/members?userId=user_00&role=PATIENT" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Windows (PowerShell)**
```powershell
$accessToken = "여기에_accessToken_붙여넣기"
curl.exe http://localhost:3030/api/members -H "Authorization: Bearer $accessToken"
```

**Windows (cmd.exe)**
```cmd
curl http://localhost:3030/api/members -H "Authorization: Bearer 여기에_accessToken_붙여넣기"
```

### 회원 상세조회 (인증 필요)

기본정보 + 보유질병 + 최근 7일간 체중·혈압·혈당을 반환한다.

**Mac / Linux**
```bash
ACCESS_TOKEN="여기에_accessToken_붙여넣기"

curl -s http://localhost:3030/api/members/user_001 -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Windows (PowerShell)**
```powershell
$accessToken = "여기에_accessToken_붙여넣기"
curl.exe http://localhost:3030/api/members/user_001 -H "Authorization: Bearer $accessToken"
```

**Windows (cmd.exe)**
```cmd
curl http://localhost:3030/api/members/user_001 -H "Authorization: Bearer 여기에_accessToken_붙여넣기"
```

### 건강데이터 조회 (인증 필요)

`type`(heartRate/bloodPressure/weight/glucose/stepCount)별로 테이블 하나씩 개별 조회한다. `startAt`/`endAt`은 ISO 8601 형식이어야 한다.

**Mac / Linux**
```bash
ACCESS_TOKEN="여기에_accessToken_붙여넣기"
START_AT=$(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S.000Z)   # macOS는 date -u -v-1d 사용
END_AT=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)

curl -s "http://localhost:3030/api/members/user_001/health-data?type=heartRate&startAt=$START_AT&endAt=$END_AT" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Windows (PowerShell)**
```powershell
$accessToken = "여기에_accessToken_붙여넣기"
$startAt = (Get-Date).ToUniversalTime().AddDays(-1).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$endAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

curl.exe "http://localhost:3030/api/members/user_001/health-data?type=heartRate&startAt=$startAt&endAt=$endAt" `
  -H "Authorization: Bearer $accessToken"
```

**Windows (cmd.exe)**
```cmd
REM cmd.exe는 날짜 계산이 번거로우므로 startAt/endAt을 직접 채워 넣는다 (예: 2026-07-16T00:00:00.000Z)
curl "http://localhost:3030/api/members/user_001/health-data?type=heartRate&startAt=2026-07-16T00:00:00.000Z&endAt=2026-07-17T00:00:00.000Z" ^
  -H "Authorization: Bearer 여기에_accessToken_붙여넣기"
```

## 4. Jest 단위테스트

Repository·JwtService·ConfigService·bcrypt를 모두 mock으로 대체해 순수 로직만 검증한다 (DB·서버 기동 불필요).

- [`unit/auth.service.spec.ts`](./unit/auth.service.spec.ts) — `AuthService.login`/`refresh`
- [`unit/members.service.spec.ts`](./unit/members.service.spec.ts) — `MembersService.list`/`detail`/`healthData`

```bash
npm run test:unit
```

검증 항목:
- 로그인/재발급: 로그인 성공, 존재하지 않는 아이디, 비밀번호 불일치, 재발급 성공, 유효하지 않은/만료된 RefreshToken, 토큰은 유효하나 회원이 삭제된 경우
- 회원목록: 환자는 자기 자신만(전송값 무시), 환자 데이터가 없으면 빈 배열, 의사는 조건 없이 전체 조회, 의사 + userId 부분일치(ILIKE) 필터, 의사 + role 필터 시 DB의 `D`/`P` 값으로 변환되는지
- 회원상세조회: 정상 조회 시 기본정보+보유질병+최근 7일 체중·혈압·혈당 반환, 환자가 타인 조회 시 FORBIDDEN, 존재하지 않는 회원 MEMBER_NOT_FOUND
- 건강데이터 조회: `type`별로 올바른 테이블을 조회하는지, `startAt >= endAt`이면 INVALID_DATE_RANGE, 환자가 타인 데이터 조회 시 FORBIDDEN, 존재하지 않는 회원 MEMBER_NOT_FOUND

## 5. e2e 테스트

실제 Nest 애플리케이션을 띄우고(내부적으로 실제 DB에 연결) HTTP 요청으로 API를 검증한다.

- [`auth.e2e-spec.ts`](./auth.e2e-spec.ts) — `/api/auth/login`, `/api/auth/refresh`
- [`members.e2e-spec.ts`](./members.e2e-spec.ts) — `/api/members`, `/api/members/:userId`, `/api/members/:userId/health-data` (로그인으로 실제 토큰을 발급받아 사용)

```bash
npm run test:e2e
```

- 별도로 `npm run start:dev`를 띄울 필요는 없다 (테스트 코드가 자체적으로 Nest 앱을 생성한다). 단, **0. 사전 준비**의 `.env`·시드 데이터는 그대로 필요하다.
- e2e는 매번 전체 `AppModule`(시뮬레이터 실시간 연결 포함)을 부팅하므로 리소스 경합을 피하기 위해 `test/jest-e2e.json`에서 `maxWorkers: 1`로 순차 실행한다.
- 검증 항목:
  - 로그인/재발급: 로그인 성공(토큰·회원정보 반환), 비밀번호 불일치(401 `INVALID_CREDENTIALS`), 필수값 누락(400), 재발급 성공, 유효하지 않은 토큰(401 `INVALID_REFRESH_TOKEN`)
  - 회원목록: 토큰 없이 호출 시 401 `AUTH_FAILED`, 환자는 자기 자신 1건만, 의사는 전체 조회, userId/role 필터 동작
  - 회원상세조회: 환자 자기 자신 조회 시 최근 7일 체중·혈압·혈당 포함, 환자가 타인 조회 시 403 `FORBIDDEN`, 존재하지 않는 회원아이디는 404 `MEMBER_NOT_FOUND`
  - 건강데이터 조회: `type`별(심박·혈압·혈당) 정상 조회, 기간이 뒤바뀐 경우 400 `INVALID_DATE_RANGE`, 환자가 타인 데이터 조회 시 403 `FORBIDDEN`
