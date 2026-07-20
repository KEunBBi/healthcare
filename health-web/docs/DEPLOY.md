# health-web 배포 가이드

## 목차
- [1. 개요](#1-개요)
- [2. 네임스페이스 규칙 (FRONTEND_PORT)](#2-네임스페이스-규칙-frontend_port)
- [3. 빌드 시점 값 vs 런타임 값](#3-빌드-시점-값-vs-런타임-값)
- [4. 사전 준비: GitHub Secrets / Variables](#4-사전-준비-github-secrets--variables)
- [5. 환경변수 매핑표](#5-환경변수-매핑표)
- [6. 파일 구성](#6-파일-구성)
- [7. Dockerfile](#7-dockerfile)
- [8. docker-compose.yml](#8-docker-composeyml)
- [9. nginx.conf.template](#9-nginxconftemplate)
- [10. .github/workflows/deploy.yml](#10-githubworkflowsdeployyml)
- [11. 배포 흐름](#11-배포-흐름)
- [12. 트러블슈팅](#12-트러블슈팅)

## 1. 개요

health-backend와 마찬가지로 여러 학생이 **같은 배포 서버(`SERVER_HOST`)를 공유**하므로, 학생마다 배포 결과물(소스 디렉토리, 도커 이미지, 컨테이너, 실행 포트)이 충돌하면 안 된다.

이 프로젝트는 학생마다 고유하게 할당되는 GitHub Variable **`FRONTEND_PORT`** 를 네임스페이스로 사용해서 아래 항목을 자동으로 격리한다. 전체 구조·용어는 [`../../health-backend/docs/DEPLOY.md`](../../health-backend/docs/DEPLOY.md)(`BACKEND_PORT` 버전)와 동일하되, 프론트엔드 특성 때문에 두 가지가 다르다.

- **정적 빌드 산출물을 nginx로 서빙한다.** `node dist/main`처럼 앱 서버를 직접 실행하는 대신, `npm run build`로 만든 `dist/`(정적 파일)를 nginx 컨테이너가 서빙한다.
- **빌드 컨텍스트가 `health-web/`이 아니라 모노레포 루트다.** health-web은 [`../src/hooks/useRealtimeHealthData.ts`](../src/hooks/useRealtimeHealthData.ts)에서 `../../../shared/utils`의 `isNewerThanCursor`를 **런타임 코드로** import한다(타입만이 아님). 이미지 빌드 시 `shared/` 소스가 실제로 필요하므로, 컨텍스트를 모노레포 루트로 넓혀 `shared/`를 함께 포함시킨다. (health-backend는 아직 `shared/`를 쓰지 않아 이 문제가 없다.)

## 2. 네임스페이스 규칙 (FRONTEND_PORT)

`FRONTEND_PORT` 값(예: `22000`)을 기준으로 아래처럼 이름을 만든다.

| 대상 | 규칙 | 예시 (`FRONTEND_PORT=22000`) |
|---|---|---|
| 서버 소스 디렉토리 | `~/deploy/health-web-${FRONTEND_PORT}` | `~/deploy/health-web-22000` |
| 도커 이미지 이름 | `health-web-${FRONTEND_PORT}:latest` | `health-web-22000:latest` |
| 컨테이너 이름 | `health-web-${FRONTEND_PORT}` | `health-web-22000` |
| compose 프로젝트 이름 (`-p`) | `health-web-${FRONTEND_PORT}` | `health-web-22000` |
| 컨테이너(nginx)가 실제 바인딩하는 포트 | `${FRONTEND_PORT}` 그대로 사용 | `22000` |

컨테이너는 `network_mode: host`로 실행되므로(8절) 별도 포트 매핑 없이 호스트 네트워크를 그대로 쓴다. **학생마다 다른 `FRONTEND_PORT`를 쓰는 한 포트 충돌이 발생하지 않는다.**

## 3. 빌드 시점 값 vs 런타임 값

health-backend와 가장 크게 다른 지점이다. Vite로 빌드하는 프론트엔드는 `import.meta.env.VITE_*` 값이 **빌드 시점에 JS 번들 안에 문자열로 그대로 박힌다.** 컨테이너를 껐다 켠다고 값이 바뀌지 않는다 — 값을 바꾸려면 반드시 이미지를 다시 빌드해야 한다.

| 값 | 시점 | 전달 방식 |
|---|---|---|
| `VITE_API_BASE_URL`, `VITE_WS_BASE_URL` | **빌드 시점** | Dockerfile의 `ARG` → `npm run build` 실행 전 `ENV`로 주입 (docker-compose.yml의 `build.args`) |
| `FRONTEND_PORT` | **런타임** | docker-compose.yml의 `environment:` → nginx 컨테이너 기동 시 `envsubst`로 리스닝 포트 결정 |

## 4. 사전 준비: GitHub Secrets / Variables

리포지토리(Settings → Secrets and variables → Actions)에 아래 값이 등록되어 있어야 한다.

**Secrets** (health-backend와 공유, 같은 서버를 쓰므로 이미 등록되어 있다면 재사용)
- `SERVER_USER`, `SSH_KEY` — 배포 서버 SSH 접속 정보

**Variables**
- `SERVER_HOST`, `SERVER_PORT` — health-backend와 동일한 값 (같은 서버)
- `FRONTEND_PORT` — 학생별 고유 포트, 이 문서의 네임스페이스 키. 현재 등록값: `22000`
- `VITE_API_BASE_URL` — health-backend 배포 도메인. 현재 등록값: `https://be002.ys.iranglab.com`
- `VITE_WS_BASE_URL` — **아직 등록되어 있지 않다. 배포 전 추가로 등록해야 한다.** health-web은 [`src/ws/realtimeSocket.ts`](../src/ws/realtimeSocket.ts)에서 이 값을 소켓 연결에 직접 사용하므로 없으면 빌드는 되지만 실시간 그래프가 동작하지 않는다. `VITE_API_BASE_URL`과 같은 호스트에 프로토콜만 `wss://`로 바꾼 값(예: `wss://be002.ys.iranglab.com`)이면 된다.

> `SERVER_*`를 제외한 나머지 이름은 `health-web/.env`(로컬 개발용)의 `VITE_API_BASE_URL`/`VITE_WS_BASE_URL`과 동일하다. `PORT`(로컬 dev 서버 포트, 5173)는 배포와 무관하므로 GitHub Variable로 옮기지 않는다 — 배포에서는 `FRONTEND_PORT`가 그 역할을 대신한다.

## 5. 환경변수 매핑표

| 앱이 읽는 이름 | 값의 출처 | GitHub 이름 | 비고 |
|---|---|---|---|
| `import.meta.env.VITE_API_BASE_URL` | Variable (빌드 args) | `VITE_API_BASE_URL` | `src/api/client.ts`에서 axios `baseURL`로 사용 |
| `import.meta.env.VITE_WS_BASE_URL` | Variable (빌드 args) | `VITE_WS_BASE_URL` | `src/ws/realtimeSocket.ts`에서 socket.io 연결 주소로 사용. **4절 참고 — 등록 필요** |
| nginx `listen` 포트 | Variable (런타임 env) | `FRONTEND_PORT` | 네임스페이스 키. 컨테이너가 바인딩하는 포트 |

## 6. 파일 구성

```
healthcare/
├── .dockerignore                          # health-web 이미지 빌드 컨텍스트(모노레포 루트)용
├── .github/workflows/deploy.yml           # CI/CD 워크플로우 (레포 루트에 위치해야 함)
├── shared/                                # health-web이 런타임에 import하므로 빌드 컨텍스트에 포함
└── health-web/
    ├── Dockerfile
    ├── docker-compose.yml
    ├── nginx.conf.template
    └── docs/DEPLOY.md                      # 이 문서
```

health-backend와 달리 `.dockerignore`가 `health-web/` 안이 아니라 **모노레포 루트**에 있다. Docker는 빌드 컨텍스트 루트의 `.dockerignore`만 읽는데, health-web의 빌드 컨텍스트가 루트(`..`)이기 때문이다(7·8절).

## 7. Dockerfile

멀티 스테이지 빌드.

1. **build 스테이지** (`node:24-alpine`): `health-web/package.json`으로 `npm ci` → `health-web/` 전체와 `shared/`를 각각 `/app`, `/app/../shared`(=`/shared`)에 복사 → `VITE_API_BASE_URL`/`VITE_WS_BASE_URL`을 build arg로 받아 `npm run build` 실행. `/app/src/**`의 `../../../shared` 상대경로가 컨테이너 안에서도 `/shared`로 정확히 풀리도록 두 디렉토리를 로컬과 같은 형제 구조로 복사한다.
2. **runtime 스테이지** (`nginx:1.27-alpine`): build 스테이지의 `/app/dist`만 `/usr/share/nginx/html`로 복사하고, `nginx.conf.template`을 nginx 기본 템플릿 디렉토리에 넣는다. `EXPOSE`는 따로 두지 않는다 — 실제 리스닝 포트는 컨테이너 기동 시 주입되는 `FRONTEND_PORT`로 결정되기 때문이다(9절).

## 8. docker-compose.yml

- `build.context: ..` — 모노레포 루트. `shared/`를 이미지에 포함시키기 위해 health-backend(`context: .`)보다 범위가 넓다.
- `build.dockerfile: health-web/Dockerfile` — 컨텍스트는 루트지만 Dockerfile 자체는 `health-web/` 안에 그대로 둔다.
- `build.args`로 `VITE_API_BASE_URL`/`VITE_WS_BASE_URL`을 전달 — **빌드 시점**에만 쓰인다(3절).
- `image`, `container_name`은 `${FRONTEND_PORT}`를 포함해 학생별로 유일하다.
- `network_mode: host` — 별도 포트 매핑 없이 호스트 포트를 그대로 쓴다.
- `environment.FRONTEND_PORT` — **런타임**에 nginx가 읽는 유일한 환경변수(9절).
- health-backend와 동일하게 **`.env` 파일을 만들지 않는다.** `${VAR}`는 `docker compose`를 실행하는 셸의 환경변수를 참조하며, 그 값은 배포 워크플로우(10절)가 GitHub Secrets/Variables로부터 주입한다.

## 9. nginx.conf.template

nginx 공식 이미지는 컨테이너 기동 시 `/etc/nginx/templates/*.template`을 `envsubst`로 치환해 `/etc/nginx/conf.d/`에 생성하는 기능을 기본 엔트리포인트에 내장하고 있다. 별도 스크립트 없이 `listen ${FRONTEND_PORT};` 한 줄로 리스닝 포트를 런타임에 결정할 수 있는 이유다.

- `try_files $uri $uri/ /index.html;` — health-web은 `react-router-dom`으로 클라이언트 사이드 라우팅을 하므로, 없는 경로 요청은 전부 `index.html`로 폴백해야 새로고침/딥링크 시 404가 나지 않는다.
- `$uri`는 치환되지 않는다. `envsubst`는 컨테이너에 **실제로 설정된 환경변수 이름**만 치환하는데 `uri`라는 환경변수는 없기 때문이다. 치환 대상은 `${FRONTEND_PORT}` 하나뿐이다.

## 10. .github/workflows/deploy.yml

`health-web/**`, `shared/**` 변경 시 실행되며 두 단계로 동작한다.

1. **소스 복사**: `health-web/*`, `shared/*`, 루트 `.dockerignore`를 SSH로 서버의 `~/deploy/health-web-${FRONTEND_PORT}`에 복사한다. health-backend와 달리 `strip_components`를 쓰지 않는다 — `health-web/`과 `shared/`를 서버에서도 형제 디렉토리로 유지해야 `docker-compose.yml`의 `build.context: ..`가 `shared/`를 찾을 수 있기 때문이다.
2. **빌드 & 기동**: SSH로 `~/deploy/health-web-${FRONTEND_PORT}/health-web`(compose 파일이 있는 위치)로 이동한 뒤, Secrets/Variables 값을 셸 환경변수로 export하고 `docker compose -p health-web-${FRONTEND_PORT} up -d --build` 실행. `context: ..`가 그 상위 디렉토리(`~/deploy/health-web-${FRONTEND_PORT}`)를 가리키므로 `shared/`가 정확히 함께 잡힌다.

`SERVER_HOST`/`SERVER_PORT`는 Variable, `SERVER_USER`/`SSH_KEY`는 Secret이므로 워크플로우에서 각각 `vars.*`/`secrets.*`로 참조한다(health-backend와 동일).

## 11. 배포 흐름

```
push to main (health-web/** 또는 shared/** 변경)
  → GitHub Actions 트리거
  → health-web/, shared/ 소스를 서버의 ~/deploy/health-web-${FRONTEND_PORT}/ 아래
    각각 health-web/, shared/ 형제 디렉토리로 복사
  → SSH 접속 후 ~/deploy/health-web-${FRONTEND_PORT}/health-web 에서
    docker compose -p health-web-${FRONTEND_PORT} up -d --build
    (빌드 시 VITE_API_BASE_URL/VITE_WS_BASE_URL을 build args로 주입 → npm run build)
  → 컨테이너 health-web-${FRONTEND_PORT}가 host 네트워크의 ${FRONTEND_PORT} 포트에서
    nginx로 정적 파일을 서빙
```

## 12. 트러블슈팅

- **`VITE_API_BASE_URL`/`VITE_WS_BASE_URL`을 바꿨는데 반영이 안 된다**: 이 값들은 런타임이 아니라 빌드 시점에 번들에 박힌다(3절). Variable 값만 바꾸고 재배포(재빌드)하지 않으면 이전 값이 계속 서빙된다. `git push`로 워크플로우를 다시 트리거하거나 `workflow_dispatch`로 수동 재실행한다.
- **로그인은 되는데 API 호출이 다 실패한다(CORS)**: health-backend는 쿠키 기반 인증이라 와일드카드 origin을 허용하지 않는다(`health-backend/docs/DEPLOY.md` 4절). health-backend의 `CORS_ORIGINS` Variable에 이 프론트엔드의 배포 도메인(예: `https://fe002.ys.iranglab.com`)이 포함되어 있는지 확인한다.
- **실시간 그래프(WebSocket)가 안 붙는다**: `VITE_WS_BASE_URL`이 등록되어 있는지(4절), `wss://`(HTTPS 배포 시) 프로토콜인지 확인한다.
- **새로고침하면 404가 뜬다**: `nginx.conf.template`의 `try_files ... /index.html;`이 이미지에 제대로 반영됐는지 확인한다(9절).
- **다른 학생과 포트가 겹치는 것 같다**: `FRONTEND_PORT` Variable 값이 실제로 고유하게 할당된 값인지 먼저 확인한다.
- **컨테이너 로그 확인**: 서버에서 `docker logs -f health-web-${FRONTEND_PORT}`.
- **수동 재배포**: 서버의 `~/deploy/health-web-${FRONTEND_PORT}/health-web`에서 필요한 환경변수를 export한 뒤 `docker compose -p health-web-${FRONTEND_PORT} up -d --build`를 직접 실행한다.
