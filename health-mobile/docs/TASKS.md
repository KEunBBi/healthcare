# 작업 목록 (TASKS)

health-mobile 구현 작업 목록. 각 작업 착수 전 [`ARCHITECTURE.md`](./ARCHITECTURE.md)의 결정사항, [`../../docs/SCREEN_DESIGN.md`](../../docs/SCREEN_DESIGN.md)/[`../../docs/DESIGN.md`](../../docs/DESIGN.md), [`../../health-backend/docs/API_SPEC.md`](../../health-backend/docs/API_SPEC.md)를 먼저 확인한다.

## 1. 프로젝트 셋업
- [ ] `create-expo-app`(SDK 54)으로 프로젝트 스캐폴딩 — `health-mobile` 폴더에 기존 `CLAUDE.md`/`docs/`가 있어 그대로 실행하면 거부되므로, 두 항목을 임시로 옮겨두고 스캐폴딩한 뒤 다시 원위치한다
- [ ] `npx expo install expo-router expo-secure-store axios socket.io-client` 설치(`ARCHITECTURE.md` 1장, `expo install`로 SDK 54 호환 버전 확보). 차트 라이브러리는 Web 타겟에서의 CSS Modules 스타일링과의 호환성을 확인한 뒤 선정해 이 문서에 반영한다(TODO)
- [ ] Web 타겟 빌드 확인 — `npx expo start --web`이 `http://localhost:8081`에서 정상 구동되는지 확인(`ARCHITECTURE.md` 1·9장)
- [ ] `app/` — expo-router 루트 레이아웃(`_layout.tsx`)과 `(app)` 그룹 레이아웃 구성(`ARCHITECTURE.md` 2·7장)
- [ ] `src/api/` — axios 인스턴스 + 401 인터셉터(토큰 재발급) 구성
- [ ] `src/auth/` — `AuthContext`, RefreshToken은 `expo-secure-store`로 저장(`ARCHITECTURE.md` 6장). 구현 전 `expo-secure-store`의 Web 타겟 지원 여부를 먼저 확인한다(`ARCHITECTURE.md` 6장 TODO)
- [ ] `src/styles/` — `docs/DESIGN.md` 색상·타이포 토큰을 CSS 변수로 매핑 + 컴포넌트별 CSS Modules(`*.module.css`) 구조 확립(`ARCHITECTURE.md` 3장)
- [ ] `.env.example`/`.env`/`.env.production` 구성 — dev `127.0.0.1`, 상용 `172.27.0.192`, `PORT=8081`(`ARCHITECTURE.md` 9장)
- [ ] health-backend CORS 허용 목록에 `http://localhost:8081` 추가 요청/반영(`ARCHITECTURE.md` 10장, `health-backend/docs/TASKS.md`와 함께 추적)

## 2. 로그인 화면 (AUTH)
- [ ] `SCREEN_DESIGN.md` 2.1 명세대로 ID/Password 입력 + 로그인 버튼 + 회원가입 구현(회원가입은 `REQUIREMENTS.md`상 가입 API가 없어 비활성 텍스트로만 표시 — `health-web` 동일 처리 참고)
- [ ] `POST /auth/login`(`API_SPEC.md` 1.1) 연동, 성공 시 토큰 저장 후 `/`로 이동
- [ ] 401(`INVALID_CREDENTIALS`) 에러 메시지 표시

## 3. 회원 목록 화면 (LIST)
- [ ] 검색(회원 ID 부분일치) + 역할 필터 + 목록(아바타·이름·성별·생년월일) 구현 — `API_SPEC.md` 1.3 실제 계약(userId·role)에 맞춰 구현(`health-web`과 동일한 화면 명세 재조율 필요, `health-web/docs/TASKS.md` 7장 TODO 참고)
- [ ] `GET /members`(`API_SPEC.md` 1.3) 연동
- [ ] 환자 계정 로그인 시 목록을 거치지 않고 본인 `/members/:userId`로 즉시 리다이렉트(`REQUIREMENTS.md` 2번)

## 4. 회원 상세 화면 (VIEW)
- [ ] 회원 기본정보(ID·이름·생년월일·성별·보유질병·메모) 표시 — `GET /members/:userId`(1.4)
- [ ] 심박·혈당·걸음수 실시간 그래프 — `ARCHITECTURE.md` 5.3의 "REST 최초 로드 → WebSocket 구독 전환" 흐름대로 구현(`useRealtimeHealthData`)
- [ ] 화면을 SPA로 구현 — `expo-router` 클라이언트 사이드 라우팅으로 전체 리로드 없이 전환, 화면 마운트 동안만 소켓 연결 유지(`ARCHITECTURE.md` 5.3·7장)
- [ ] `socket.io-client`로 `/realtime` 연결, 의사 계정 `subscribe`/`unsubscribe` 처리
- [ ] 소켓 재연결 시 `GET /members/:userId/health-data`(1.5)로 공백 구간을 메운 뒤 재구독(`ARCHITECTURE.md` 5.3 4번)
- [ ] 환자가 타인 상세 접근 시 403 에러 처리

## 5. 챗봇 (CHAT)
- [ ] `POST /chat`(`API_SPEC.md` 1.6) 연동 UI 구현 — 회원 상세 화면 내 위젯으로 임베드(`SCREEN_DESIGN.md`에 별도 챗봇 화면 명세가 아직 없어 `ARCHITECTURE.md` 7장 TODO 결정을 따름)

## 6. 배포
- [ ] Web 빌드(`npx expo export -p web`)를 컨테이너 이미지로 만들어 health-backend와 같은 서버에 배포(`ARCHITECTURE.md` 8장)
- [ ] `.github/workflows/`에 빌드/배포 워크플로우 작성
- [ ] 상용 도메인 확정 후 `ARCHITECTURE.md` 10장 CORS 표와 health-backend CORS 설정에 반영
- [ ] 네이티브(iOS/Android) 배포 필요 여부 결정 — 필요 시 EAS Build 등 별도 절차를 정해 `ARCHITECTURE.md` 8장에 반영(TODO)

## 7. 알려진 TODO / 후속 작업
- [ ] `docs/DESIGN.md`가 비어있음 — 값이 필요해지는 시점에 먼저 문서를 채운 뒤 코드에 반영(`ARCHITECTURE.md` 3장)
- [ ] `expo-secure-store`의 Web 타겟 지원 여부·보안 수준 확인, 필요 시 Web 전용 저장 전략 결정(`ARCHITECTURE.md` 6장)
- [ ] `docs/SCREEN_DESIGN.md`에 회원 목록 검색조건(이름·성별) 반영 여부를 backend와 재조율 — 현재는 API 계약(userId·role)대로 구현 예정
- [ ] `docs/SCREEN_DESIGN.md`에 챗봇 화면 명세 추가
- [ ] 회원가입 실제 플로우 필요 여부 확인(`REQUIREMENTS.md` 1번은 계정이 사전 제공된다고 명시)
- [ ] `health-web`과의 실시간 갱신·인증 흐름 일관성을 주기적으로 재확인(두 클라이언트가 동일 API를 다른 저장 방식으로 소비하므로 드리프트 가능성 있음)
