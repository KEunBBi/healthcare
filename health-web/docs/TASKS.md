# 작업 목록 (TASKS)

health-web 구현 작업 목록. 각 작업 착수 전 [`ARCHITECTURE.md`](./ARCHITECTURE.md)의 결정사항, [`../../docs/SCREEN_DESIGN.md`](../../docs/SCREEN_DESIGN.md)/[`../../docs/DESIGN-apple.md`](../../docs/DESIGN-apple.md), [`../../health-backend/docs/API_SPEC.md`](../../health-backend/docs/API_SPEC.md)를 먼저 확인한다.

## 1. 프로젝트 셋업
- [x] `react-router-dom`, `axios`, `socket.io-client`, `recharts` 설치 (React는 항상 최신 유지, 다운그레이드하지 않음)
- [x] `src/api/` — axios 인스턴스 + 401 인터셉터(토큰 재발급) 구성
- [x] `src/auth/` — `AuthContext`, RefreshToken은 **쿠키**로 저장(HttpOnly, `ARCHITECTURE.md` 6장), `ProtectedRoute`
- [x] `src/styles/` — `DESIGN-apple.md` 색상·타이포 토큰을 CSS 변수로 매핑 + CSS Modules
- [x] 라우터 구성: `/login`, `/`, `/members/:userId`

## 2. 로그인 화면 (AUTH)
- [x] `SCREEN_DESIGN.md` 2.1 명세대로 ID/Password 입력 + 로그인 버튼 + 회원가입 구현 (회원가입은 REQUIREMENTS.md상 가입 API가 없어 비활성 텍스트로만 표시)
- [x] `POST /auth/login`(`API_SPEC.md` 1.1) 연동, 성공 시 토큰 저장 후 `/`로 이동
- [x] 401(`INVALID_CREDENTIALS`) 에러 메시지 표시

## 3. 회원 목록 화면 (LIST)
- [x] 검색(회원 ID 부분일치) + 역할 필터 + 목록(아바타·이름·성별·생년월일) 구현 — `API_SPEC.md` 1.3이 이름/성별 검색 파라미터를 지원하지 않아 `SCREEN_DESIGN.md` 2.2의 이름·성별 검색 대신 실제 API 계약(userId·role)에 맞춰 구현함 (TODO: 화면 명세와 재조율 필요)
- [x] `GET /members`(`API_SPEC.md` 1.3) 연동
- [x] 환자 계정 로그인 시 목록을 거치지 않고 본인 `/members/:userId`로 즉시 리다이렉트(`REQUIREMENTS.md` 2번)

## 4. 회원 상세 화면 (VIEW)
- [x] 회원 기본정보(ID·이름·생년월일·성별·보유질병·메모) 표시 — `GET /members/:userId`(1.4)
- [x] 심박·혈당·걸음수 실시간 그래프 — `ARCHITECTURE.md` 5.3의 "REST 최초 로드 → WebSocket 구독 전환" 흐름대로 구현 (`useRealtimeHealthData`)
- [x] `socket.io-client`로 `/realtime` 연결, 의사 계정 `subscribe`/`unsubscribe` 처리
- [x] 소켓 재연결은 `socket.io-client` 기본 동작에 위임 (별도 재연결 로직 미구현 — 재연결 후 공백 구간을 1.5로 메우는 로직은 TODO)
- [x] 환자가 타인 상세 접근 시 403 에러 처리

## 5. 챗봇 (CHAT)
- [x] `POST /chat`(`API_SPEC.md` 1.6) 연동 UI 구현 — 회원 상세 화면 내 위젯으로 임베드 (`SCREEN_DESIGN.md`에 별도 챗봇 화면 명세가 아직 없어 `ARCHITECTURE.md` 7장 TODO 결정을 따름)

## 6. 배포
- [ ] `.github/workflows/`에 빌드/배포 워크플로우 작성 (`ARCHITECTURE.md` 8장)
- [ ] 배포 대상 서버·API Base URL 환경변수 확정 및 `ARCHITECTURE.md`에 반영

## 7. 알려진 TODO / 후속 작업
- [ ] `docs/SCREEN_DESIGN.md`에 회원 목록 검색조건(이름·성별) 반영 여부를 backend와 재조율 — 현재는 API 계약(userId·role)대로 구현됨
- [ ] `docs/SCREEN_DESIGN.md`에 챗봇 화면 명세 추가
- [ ] 소켓 재연결 시 공백 구간을 `GET /members/:userId/health-data`(1.5)로 메우는 로직 추가
- [ ] 회원가입 실제 플로우 필요 여부 확인 (REQUIREMENTS.md 1번은 계정이 사전 제공된다고 명시)
