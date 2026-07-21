# health-mobile 배포 가이드

## 목차
- [1. 개요](#1-개요)
- [2. 네임스페이스 규칙 (MOBILE_PORT)](#2-네임스페이스-규칙-mobile_port)
- [3. 빌드 시점 값 vs 런타임 값](#3-빌드-시점-값-vs-런타임-값)
- [4. 사전 준비: GitHub Secrets / Variables](#4-사전-준비-github-secrets--variables)
- [5. 환경변수 매핑표](#5-환경변수-매핑표)
- [6. 파일 구성](#6-파일-구성)
- [7. Dockerfile](#7-dockerfile)
- [8. docker-compose.yml](#8-docker-composeyml)
- [9. nginx.conf — 동적 라우트 폴백](#9-nginxconf--동적-라우트-폴백)
- [10. .github/workflows/deploy-mobile.yml](#10-githubworkflowsdeploy-mobileyml)
- [11. 배포 흐름](#11-배포-흐름)
- [12. 트러블슈팅](#12-트러블슈팅)

## 1. 개요

`health-web/docs/DEPLOY.md`와 구조가 거의 동일하다(같은 배포 서버를 공유하고, 정적 빌드 산출물을 nginx로 서빙하는 방식도 같다). health-mobile만의 차이는 두 가지다.

- **`expo export -p web`이 산출물이다.** `npm run build`(Vite) 대신 Expo의 웹 정적 export를 쓴다. 결과물은 `health-web`의 `dist/`처럼 단일 SPA가 아니라 **라우트별로 개별 HTML 파일**이 생성된다(9절 참고) — 특히 동적 라우트(`/members/:userId`)는 `members/[userId].html` 파일 하나로 만들어지므로, 새로고침·딥링크 대응 nginx 설정이 health-web보다 한 단계 더 필요하다.
- **일부 의존성이 네이티브 빌드 도구를 요구한다.** `react-native-reanimated` 등의 postinstall 스크립트가 Alpine 이미지에 없는 `python3`/`make`/`g++`를 필요로 해서, Dockerfile에 `apk add`가 추가로 들어간다(7절). health-web은 순수 웹 의존성만 써서 이 문제가 없었다.

나머지(학생별 포트로 배포 산출물을 격리하는 방식, `context: ..`로 `shared/`를 함께 포함하는 이유, `network_mode: host`를 쓰지 않는 이유)는 `health-web/docs/DEPLOY.md` 1절과 동일하므로 거기서 자세한 배경을 확인한다.

## 2. 네임스페이스 규칙 (MOBILE_PORT)

`health-web`의 `FRONTEND_PORT`와 동일한 역할을 하는 새 GitHub Variable **`MOBILE_PORT`**를 쓴다(둘 다 정적 웹 프론트엔드라 이름만 다를 뿐 구조는 같다).

| 대상 | 규칙 | 예시 (`MOBILE_PORT=22100`이라 가정) |
|---|---|---|
| 서버 소스 디렉토리 | `~/deploy/health-mobile-${MOBILE_PORT}` | `~/deploy/health-mobile-22100` |
| 도커 이미지 이름 | `health-mobile-${MOBILE_PORT}:latest` | `health-mobile-22100:latest` |
| 컨테이너 이름 | `health-mobile-${MOBILE_PORT}` | `health-mobile-22100` |
| compose 프로젝트 이름 (`-p`) | `health-mobile-${MOBILE_PORT}` | `health-mobile-22100` |
| 호스트에서 컨테이너로 매핑되는 포트 | `${MOBILE_PORT}:80` | `22100:80` |

> **주의**: `MOBILE_PORT`는 아직 등록되어 있지 않다(강사가 배정한 실제 값을 이 리포지토리의 GitHub Variable로 새로 등록해야 한다). `health-web`의 `FRONTEND_PORT`와 겹치지 않는 별도의 포트를 써야 같은 서버에서 두 컨테이너가 동시에 뜰 수 있다.

## 3. 빌드 시점 값 vs 런타임 값

`health-web`의 `VITE_*`와 완전히 동일한 제약이다. Expo의 `EXPO_PUBLIC_*` 값은 **빌드 시점에 JS 번들 안에 문자열로 그대로 박힌다.** 컨테이너를 껐다 켠다고 값이 바뀌지 않으며, 값을 바꾸려면 이미지를 다시 빌드해야 한다.

| 값 | 시점 | 전달 방식 |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_WS_BASE_URL` | **빌드 시점** | Dockerfile의 `ARG` → `expo export -p web` 실행 전 `ENV`로 주입(docker-compose.yml의 `build.args`) |
| `MOBILE_PORT` | **`docker compose` 실행 시점** | 컨테이너 안으로는 주입되지 않는다. `ports: '${MOBILE_PORT}:80'`을 만들 때 셸 환경변수로만 쓰인다(2절) |

## 4. 사전 준비: GitHub Secrets / Variables

**Secrets** (health-backend·health-web과 공유, 같은 서버를 쓰므로 이미 등록되어 있다면 재사용)
- `SERVER_USER`, `SSH_KEY` — 배포 서버 SSH 접속 정보

**Variables**
- `SERVER_HOST`, `SERVER_PORT` — health-backend·health-web과 동일한 값(같은 서버)
- `MOBILE_PORT` — 학생별 고유 포트, 이 문서의 네임스페이스 키. **아직 등록되어 있지 않다** — 배포 전 강사가 배정한 값으로 새로 등록해야 한다
- `EXPO_PUBLIC_API_BASE_URL` — health-backend 배포 도메인. `health-web`의 `VITE_API_BASE_URL`과 같은 값을 쓰면 된다(같은 backend를 바라보므로)
- `EXPO_PUBLIC_WS_BASE_URL` — 위와 같은 호스트에 프로토콜만 `wss://`로 바꾼 값. **아직 등록되어 있지 않다.** 없으면 빌드는 되지만 실시간 그래프(`ARCHITECTURE.md` 5.3)가 동작하지 않는다

> `health-mobile/.env`(로컬 개발용)의 이름과 동일하다. 값만 배포용 도메인으로 바꿔서 등록한다.

## 5. 환경변수 매핑표

| 앱이 읽는 이름 | 값의 출처 | GitHub 이름 | 비고 |
|---|---|---|---|
| `process.env.EXPO_PUBLIC_API_BASE_URL` | Variable (빌드 args) | `EXPO_PUBLIC_API_BASE_URL` | `src/api/client.ts`에서 axios `baseURL`로 사용 |
| `process.env.EXPO_PUBLIC_WS_BASE_URL` | Variable (빌드 args) | `EXPO_PUBLIC_WS_BASE_URL` | `src/ws/realtimeSocket.ts`에서 socket.io 연결 주소로 사용 |
| 호스트 포트 매핑 (`ports:`) | Variable (compose 실행 시 셸 env) | `MOBILE_PORT` | 네임스페이스 키. 컨테이너 내부(80)로는 주입되지 않는다 |

## 6. 파일 구성

```
healthcare/
├── .dockerignore                          # health-web·health-mobile 공용 빌드 컨텍스트(모노레포 루트)용
├── .github/workflows/deploy-mobile.yml    # CI/CD 워크플로우 (레포 루트에 위치해야 함)
├── shared/                                # health-mobile이 런타임에 import하므로 빌드 컨텍스트에 포함
└── health-mobile/
    ├── Dockerfile
    ├── docker-compose.yml
    ├── nginx.conf
    └── docs/DEPLOY.md                      # 이 문서
```

## 7. Dockerfile

멀티 스테이지 빌드(health-web과 동일한 2단계 구조).

1. **build 스테이지** (`node:24-alpine`): `apk add python3 make g++`(1절 참고, `react-native-reanimated` 등의 postinstall 대응) → `health-mobile/package.json`으로 `npm ci` → `health-mobile/` 전체와 `shared/`를 각각 `/app`, `/shared`로 복사(로컬과 같은 형제 디렉토리 구조를 유지해야 `../../../shared` 상대경로가 그대로 풀린다) → `EXPO_PUBLIC_*`를 build arg로 받아 `npx expo export -p web` 실행.
2. **runtime 스테이지** (`nginx:1.27-alpine`): build 스테이지의 `/app/dist`만 `/usr/share/nginx/html`로 복사하고, `nginx.conf`를 그대로 넣는다. 컨테이너 내부에서는 항상 80번 포트로 고정 리스닝한다 — 학생별 포트는 이미지 안이 아니라 `docker-compose.yml`의 포트 매핑이 담당한다(8·9절).

## 8. docker-compose.yml

`health-web/docs/DEPLOY.md` 8절과 구조가 완전히 같다(`build.context: ..`, `build.args`로 `EXPO_PUBLIC_*` 전달, `image`/`container_name`에 `${MOBILE_PORT}` 포함, `ports: '${MOBILE_PORT}:80'`, `network_mode: host` 미사용, `.env` 파일 없이 셸 환경변수만 참조).

## 9. nginx.conf — 동적 라우트 폴백

health-web과 가장 크게 다른 지점이다. `expo export -p web`은 라우트별로 **개별 정적 HTML**을 만든다(`dist/login.html`, `dist/index.html`, `dist/members/[userId].html` 등) — react-router-dom처럼 모든 경로를 `index.html` 하나로 서빙하는 순수 SPA가 아니다.

- `location /members/`: 실제로는 `/members/user_001`처럼 다양한 `userId`로 요청이 들어오지만, 디스크에는 `members/[userId].html` 파일 하나만 있다. `try_files $uri $uri.html /members/[userId].html;`로, 해당 파일이 없으면 이 리터럴 파일로 폴백한다. 폴백된 이후에는 `expo-router`의 client-side 라우팅이 실제 `userId`를 읽어 알맞은 데이터를 불러온다(`ARCHITECTURE.md` 7장 SPA 참고) — 즉 서버는 "이 앱을 실행시켜주는 셸"만 내려주고, 실제 라우팅 로직은 브라우저에서 처리된다.
- `location /`: 그 외 라우트(`/login` 등)는 `$uri`/`$uri.html`로 먼저 찾고, 없으면 `index.html`로 폴백한다.

## 10. .github/workflows/deploy-mobile.yml

`health-mobile/**`, `shared/**` 변경 시 실행되며 `health-web`의 워크플로우와 완전히 동일한 2단계로 동작한다(소스 복사 → SSH로 `docker compose up -d --build`). 변수명만 `FRONTEND_PORT`→`MOBILE_PORT`, `VITE_*`→`EXPO_PUBLIC_*`로 바뀐다.

## 11. 배포 흐름

```
push to main (health-mobile/** 또는 shared/** 변경)
  → GitHub Actions 트리거
  → health-mobile/, shared/ 소스를 서버의 ~/deploy/health-mobile-${MOBILE_PORT}/ 아래
    각각 health-mobile/, shared/ 형제 디렉토리로 복사
  → SSH 접속 후 ~/deploy/health-mobile-${MOBILE_PORT}/health-mobile 에서
    docker compose -p health-mobile-${MOBILE_PORT} up -d --build
    (빌드 시 EXPO_PUBLIC_API_BASE_URL/EXPO_PUBLIC_WS_BASE_URL을 build args로 주입 → expo export -p web)
  → 컨테이너 health-mobile-${MOBILE_PORT}가 뜨고, 호스트의 ${MOBILE_PORT} 포트가
    컨테이너 80번 포트로 매핑되어 nginx가 정적 파일을 서빙
```

## 12. 트러블슈팅

- **`/members/:userId` 새로고침 시 404**: `nginx.conf`의 `location /members/` 폴백이 이미지에 제대로 반영됐는지 확인한다(9절). health-web과 달리 단순 `try_files ... /index.html;` 하나로는 해결되지 않는다.
- **도메인 접속 시 502 Bad Gateway**: `health-web/docs/DEPLOY.md` 12절과 원인이 동일하다 — `docker ps`에서 이 컨테이너의 `PORTS` 컬럼이 비어있으면 `network_mode: host`로 잘못 떠 있는 것이다. 이 리포의 `docker-compose.yml`은 처음부터 표준 `ports:` 매핑을 쓰므로, 정상이라면 `0.0.0.0:${MOBILE_PORT}->80/tcp`가 보여야 한다.
- **`EXPO_PUBLIC_*`를 바꿨는데 반영이 안 된다**: 빌드 시점 값이다(3절). 재배포(재빌드) 없이는 이전 값이 계속 서빙된다.
- **로그인은 되는데 API 호출이 다 실패한다(CORS)**: health-backend의 `CORS_ORIGINS` Variable에 이 배포 도메인이 포함되어 있는지 확인한다(`health-backend/docs/DEPLOY.md` 참고). `health-web`의 도메인만 등록되어 있고 mobile 도메인이 빠져 있는 경우가 흔하다.
- **`npm ci` 단계에서 네이티브 빌드 실패**: `python3`/`make`/`g++`가 Dockerfile에 실제로 설치되고 있는지 확인한다(1·7절).
- **실시간 그래프(WebSocket)가 안 붙는다**: `EXPO_PUBLIC_WS_BASE_URL`이 등록되어 있는지(4절), `wss://`(HTTPS 배포 시) 프로토콜인지 확인한다.
- **컨테이너 로그 확인**: 서버에서 `docker logs -f health-mobile-${MOBILE_PORT}`.
- **수동 재배포**: 서버의 `~/deploy/health-mobile-${MOBILE_PORT}/health-mobile`에서 필요한 환경변수를 export한 뒤 `docker compose -p health-mobile-${MOBILE_PORT} up -d --build`를 직접 실행한다.
