# 작업 목록 (TASKS)

health-mobile 구현 작업 목록. 각 작업 착수 전 [`ARCHITECTURE.md`](./ARCHITECTURE.md)의 결정사항, [`../../docs/SCREEN_DESIGN.md`](../../docs/SCREEN_DESIGN.md)/[`../../docs/DESIGN.md`](../../docs/DESIGN.md), [`../../health-backend/docs/API_SPEC.md`](../../health-backend/docs/API_SPEC.md)를 먼저 확인한다.

## 1. 프로젝트 셋업
- [x] `create-expo-app`(SDK 54)으로 프로젝트 스캐폴딩 — 기존 `CLAUDE.md`/`docs/`는 임시 폴더에 스캐폴딩한 뒤 병합하는 방식으로 처리
- [x] `npx expo install axios socket.io-client` 설치(`expo-router`는 템플릿에 기본 포함). refreshToken을 쿠키 방식으로 통일하기로 하여(6장 변경 이력 참고) `expo-secure-store`는 더 이상 필요 없다. 차트 라이브러리는 회원 상세 화면(4장) 작업 시 선정한다(TODO)
- [x] Web 타겟 빌드 확인 — `npx expo start --web`이 `http://localhost:8081`에서 정상 구동, 로그인 화면 렌더링을 헤드리스 브라우저 스크린샷으로 확인
- [x] `app/` — expo-router 루트 레이아웃(`_layout.tsx`)과 `(app)` 그룹 레이아웃(라우트 가드) 구성(`ARCHITECTURE.md` 2·7장) — `(app)/index.tsx`는 회원 목록 구현 전까지 로그인 확인용 임시 화면
- [x] `src/api/` — axios 인스턴스(`withCredentials: true`) + 401 인터셉터(토큰 재발급) 구성
- [x] `src/auth/` — `AuthContext`, refreshToken은 `health-web`과 동일하게 HttpOnly 쿠키로 처리(6장 변경 이력 참고, `expo-secure-store` 미사용)
- [x] `src/styles/` — `docs/DESIGN.md` 색상·타이포 토큰을 CSS 변수로 매핑(`tokens.css`) + 컴포넌트별 CSS Modules(`*.module.css`) 구조 확립(`ARCHITECTURE.md` 3장) — RN 컴포넌트에는 `unstable_styles` export를 써야 한다(3장 주의사항 참고)
- [x] `.env.example`/`.env`/`.env.production` 구성 — dev `127.0.0.1`, 상용 `172.27.0.192`, `PORT=8081`(`ARCHITECTURE.md` 9장)
- [x] health-backend `.env`의 `CORS_ORIGINS`에 `http://localhost:8081` 추가(`ARCHITECTURE.md` 10장) — **주의**: 로컬에서 이미 실행 중이던 health-backend 프로세스는 재시작 전까지 이 값을 반영하지 않는다. 재시작 필요

## 2. 로그인 화면 (AUTH)
- [x] `SCREEN_DESIGN.md` 2.1 명세대로 ID/Password 입력 + 로그인 버튼 + 회원가입 구현(회원가입은 `REQUIREMENTS.md`상 가입 API가 없어 비활성 텍스트로만 표시 — `health-web` 동일 처리 참고)
- [x] `POST /auth/login`(`API_SPEC.md` 1.1) 연동, 성공 시 토큰 저장 후 `/`로 이동
- [x] 401(`INVALID_CREDENTIALS`) 에러 메시지 표시 — 실제 로그인 성공 케이스는 health-backend 재시작(CORS 반영) 후 사용자가 직접 확인 필요

## 3. 회원 목록 화면 (LIST)
- [x] 검색(회원 ID 부분일치) + 역할 필터(전체/의사/환자 칩) + 목록(아바타·이름·성별·생년월일) 구현 — `API_SPEC.md` 1.3 실제 계약(userId·role)에 맞춰 구현. `health-web`의 검색 input + `<select>` 대신 RN 환경에 맞게 역할 필터는 Pressable 칩 그룹으로 구현(동일 기능, 다른 컨트롤)
- [x] `GET /members`(`API_SPEC.md` 1.3) 연동 — `useMembers` 훅(`health-web`과 동일 패턴)
- [x] 환자 계정 로그인 시 목록을 거치지 않고 본인 `/members/:userId`로 즉시 리다이렉트(`REQUIREMENTS.md` 2번) — `user_001`(환자) 로그인으로 실제 리다이렉트 확인
- [x] (부수 작업) `formatBirthDate`/`genderLabel`/`roleLabel`을 `health-web` 로컬 구현에서 `shared/utils.ts`로 이동 — 두 프로젝트가 동일 로직을 쓰게 되어 `ARCHITECTURE.md` 4장 규칙(2개 이상 프로젝트 공유 시 shared/) 대상이 됨. `health-web`도 함께 갱신함
- [x] (인프라) `metro.config.js` 추가 — Metro가 기본적으로 `health-mobile/` 밖의 `shared/`를 resolve하지 못해 `shared/utils.ts`의 런타임 import가 실패하는 문제 발견 및 수정(`ARCHITECTURE.md` 4장 주의사항 참고)

## 4. 회원 상세 화면 (VIEW)
- [x] 회원 기본정보(ID·이름·생년월일·성별·보유질병·메모) 표시 — `GET /members/:userId`(1.4). 자리표시자였던 `[userId].tsx`를 실제 구현으로 교체
- [x] 심박·혈당·걸음수 실시간 그래프 — `ARCHITECTURE.md` 5.3의 "REST 최초 로드 → WebSocket 구독 전환" 흐름대로 구현(`useRealtimeHealthData`, health-web과 동일 로직 그대로 포팅). `admin`으로 로그인해 실제 데이터가 그려지는 것까지 헤드리스 브라우저로 시각 확인(심박수·혈당·걸음수 그래프 전부 실데이터로 렌더링됨)
- [x] 화면을 SPA로 구현 — `expo-router`(`useLocalSearchParams`/`useRouter`)로 전체 리로드 없이 전환, 화면 마운트 동안만 소켓 연결 유지(`ARCHITECTURE.md` 5.3·7장)
- [x] `socket.io-client`로 `/realtime` 연결, 의사 계정 `subscribe`/`unsubscribe` 처리 — 실제 연결 후 "실시간 연결됨" 배지로 확인
- [x] 소켓 재연결 시 `GET /members/:userId/health-data`(1.5)로 공백 구간을 메운 뒤 재구독(`ARCHITECTURE.md` 5.3 4번) — 로직은 포팅했으나 실제 연결 끊김 재현 테스트는 안 함(TODO, health-web도 동일 상태)
- [x] 환자가 타인 상세 접근 시 403 에러 처리 — `error.code === 'FORBIDDEN'` 분기 구현(health-web과 동일). 실제로 환자 계정으로 타인 조회를 시도하는 라이브 테스트는 아직 안 함(TODO)
- [x] 차트 라이브러리로 `recharts` 채택(`ARCHITECTURE.md` 1장) — Web 타겟 전용, 네이티브 빌드 시 교체 필요(TODO로 기록)

## 5. 챗봇 (CHAT)
- [x] `POST /chat`(`API_SPEC.md` 1.6) 연동 UI 구현 — 회원 상세 화면 내 위젯으로 임베드(`SCREEN_DESIGN.md`에 별도 챗봇 화면 명세가 아직 없어 `ARCHITECTURE.md` 7장 TODO 결정을 따름). UI 렌더링은 확인했으나 실제 메시지 전송→`health-ai` 응답 수신까지의 라이브 테스트는 안 함(TODO, health-ai 서버 기동 여부 확인 필요)

## 6. 배포
- [x] Web 빌드(`npx expo export -p web`)를 컨테이너 이미지로 만들어 health-backend와 같은 서버에 배포(`ARCHITECTURE.md` 8장) — `Dockerfile`·`docker-compose.yml`·`nginx.conf` 작성, `health-web`과 동일한 패턴(`docs/DEPLOY.md` 참고)
- [x] `.github/workflows/deploy-mobile.yml` 작성 — `health-web`의 `deploy.yml`과 동일 구조, 변수명만 `FRONTEND_PORT`→`MOBILE_PORT`, `VITE_*`→`EXPO_PUBLIC_*`
- [ ] 상용 도메인 확정 후 `ARCHITECTURE.md` 10장 CORS 표와 health-backend CORS 설정(`CORS_ORIGINS`)에 반영 — 아직 mobile 배포 도메인이 없어 미반영
- [ ] 네이티브(iOS/Android) 배포 필요 여부 결정 — 필요 시 EAS Build 등 별도 절차를 정해 `ARCHITECTURE.md` 8장에 반영(TODO)
- [ ] **GitHub Variable `MOBILE_PORT`, `EXPO_PUBLIC_WS_BASE_URL` 등록 필요** — 아직 리포지토리에 등록되어 있지 않다(`docs/DEPLOY.md` 4절). 강사가 배정한 실제 포트 값으로 등록해야 워크플로우가 동작한다
- [ ] **실제 배포 미검증** — 로컬에 Docker 데몬이 없어 `docker build`/`docker compose up`을 실제로 실행해보지 못했다. `npx expo export -p web`는 로컬에서 성공 확인(`dist/` 정상 생성), `docker compose config`로 compose 파일 문법·변수치환은 확인했지만, 실제 이미지 빌드·컨테이너 기동·nginx 동작은 GitHub Actions 워크플로우가 처음 실행될 때 검증해야 한다

## 7. 알려진 TODO / 후속 작업
- [x] `docs/DESIGN.md`가 비어있음 — `DESIGN-apple.md`/`health-web` 값을 그대로 옮겨 채움(`ARCHITECTURE.md` 3장)
- [ ] `docs/SCREEN_DESIGN.md`에 회원 목록 검색조건(이름·성별) 반영 여부를 backend와 재조율 — 현재는 API 계약(userId·role)대로 구현 예정
- [ ] `docs/SCREEN_DESIGN.md`에 챗봇 화면 명세 추가
- [ ] 회원가입 실제 플로우 필요 여부 확인(`REQUIREMENTS.md` 1번은 계정이 사전 제공된다고 명시)
- [ ] `health-web`과의 실시간 갱신·인증 흐름 일관성을 주기적으로 재확인(두 클라이언트가 동일 API를 다른 저장 방식으로 소비하므로 드리프트 가능성 있음)
