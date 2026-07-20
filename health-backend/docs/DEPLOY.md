# health-backend 배포 가이드

## 목차
- [1. 개요](#1-개요)
- [2. 네임스페이스 규칙 (BACKEND_PORT)](#2-네임스페이스-규칙-backend_port)
- [3. 사전 준비: GitHub Secrets / Variables](#3-사전-준비-github-secrets--variables)
- [4. 환경변수 매핑표](#4-환경변수-매핑표)
- [5. 파일 구성](#5-파일-구성)
- [6. Dockerfile](#6-dockerfile)
- [7. docker-compose.yml](#7-docker-composeyml)
- [8. .github/workflows/deploy-backend.yml](#8-githubworkflowsdeploy-backendyml)
- [9. 배포 흐름](#9-배포-흐름)
- [10. 트러블슈팅](#10-트러블슈팅)

## 1. 개요

여러 학생이 **같은 배포 서버(`SERVER_HOST`)를 공유**하기 때문에, 학생마다 배포 결과물(소스 디렉토리, 도커 이미지, 컨테이너, 실행 포트)이 서로 충돌하면 안 됩니다.

이 프로젝트는 학생마다 고유하게 할당되는 GitHub Variable **`BACKEND_PORT`** 를 네임스페이스로 사용해서 아래 항목들을 자동으로 격리합니다.

- 서버에 소스가 배치되는 디렉토리 경로
- 빌드되는 도커 이미지 이름
- 실행되는 컨테이너 이름 (및 docker compose 프로젝트 이름)
- 컨테이너 내부에서 앱이 실제로 바인딩하는 포트

또한 배포 시 서버에 `.env` 파일을 생성하지 않습니다. GitHub Actions가 Secrets/Variables 값을 SSH 세션의 **환경변수로 주입**하고, `docker compose`가 그 값을 그대로 읽어 컨테이너를 띄웁니다.

## 2. 네임스페이스 규칙 (BACKEND_PORT)

`BACKEND_PORT` 값(예: `3001`)을 기준으로 아래처럼 이름을 만듭니다.

| 대상 | 규칙 | 예시 (`BACKEND_PORT=3001`) |
|---|---|---|
| 서버 소스 디렉토리 | `~/deploy/health-backend-${BACKEND_PORT}` | `~/deploy/health-backend-3001` |
| 도커 이미지 이름 | `health-backend-${BACKEND_PORT}:latest` | `health-backend-3001:latest` |
| 컨테이너 이름 | `health-backend-${BACKEND_PORT}` | `health-backend-3001` |
| compose 프로젝트 이름 (`-p`) | `health-backend-${BACKEND_PORT}` | `health-backend-3001` |
| 컨테이너가 실제 바인딩하는 포트 (`PORT`) | `${BACKEND_PORT}` 그대로 사용 | `3001` |

컨테이너는 `network_mode: host` 로 실행됩니다(아래 6절 참고). 즉 별도의 포트 매핑(`ports:`) 없이 호스트 네트워크를 그대로 사용하므로, **학생마다 다른 `BACKEND_PORT`를 쓰는 한 포트 충돌이 발생하지 않습니다.** 동시에 host 네트워크를 쓰기 때문에 `AI_AGENT_BASE_URL=http://localhost:8000` (health-ai 서버)처럼 서버에 이미 떠 있는 서비스에도 컨테이너 안에서 `localhost`로 그대로 접근할 수 있습니다.

## 3. 사전 준비: GitHub Secrets / Variables

리포지토리(Settings → Secrets and variables → Actions)에 아래 값이 학생별로 등록되어 있어야 합니다.

**Secrets**
- `SERVER_USER`, `SSH_KEY` — 배포 서버 SSH 접속 정보
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `DATABASE_USER`, `DATABASE_PASSWORD`

**Variables**
- `SERVER_HOST`(`211.253.10.22`), `SERVER_PORT`(`22`)
- `BACKEND_PORT` — 학생별 고유 포트, 이 문서의 네임스페이스 키
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`
- `JWT_ACCESS_EXPIRES_IN`(예: `30m`), `JWT_REFRESH_EXPIRES_IN`(예: `14d`)
- `SIMULATOR_WS_URL`
- `SLACK_WEBHOOK_URL`
- `CORS_ORIGINS` — 학생별로 배포된 health-web 도메인을 포함한 콤마 구분 origin 목록 (예: `http://localhost:5173,https://fe000.ys.iranglab.com`)

> `BACKEND_PORT`·`SERVER_*`를 제외한 나머지는 이름이 모두 `health-backend/.env`(로컬 개발용)와 동일하다. 로컬 `.env`에 이미 값이 있다면 그대로 복사해 넣으면 된다.

## 4. 환경변수 매핑표

앱이 실제로 읽는 환경변수(`src/**`에서 `process.env` / `ConfigService.get`으로 참조하는 이름)와 GitHub Secret/Variable을 아래처럼 연결합니다. `BACKEND_PORT`를 제외하면 **GitHub 이름 = 앱이 읽는 이름**으로 동일합니다.

| 앱이 읽는 env 이름 | 값의 출처 | GitHub 이름 | 비고 |
|---|---|---|---|
| `PORT` | Variable | `BACKEND_PORT` | 네임스페이스 키. 컨테이너가 바인딩하는 포트 |
| `DATABASE_HOST` | Variable | `DATABASE_HOST` | |
| `DATABASE_PORT` | Variable | `DATABASE_PORT` | |
| `DATABASE_NAME` | Variable | `DATABASE_NAME` | |
| `DATABASE_USER` | Secret | `DATABASE_USER` | |
| `DATABASE_PASSWORD` | Secret | `DATABASE_PASSWORD` | |
| `JWT_ACCESS_SECRET` | Secret | `JWT_ACCESS_SECRET` | |
| `JWT_ACCESS_EXPIRES_IN` | Variable | `JWT_ACCESS_EXPIRES_IN` | `30m`처럼 사람이 읽는 형식 그대로 전달한다(`jsonwebtoken`이 이 형식을 직접 해석하므로 초 단위로 변환할 필요가 없다) |
| `JWT_REFRESH_SECRET` | Secret | `JWT_REFRESH_SECRET` | |
| `JWT_REFRESH_EXPIRES_IN` | Variable | `JWT_REFRESH_EXPIRES_IN` | `14d`처럼 사람이 읽는 형식 그대로 전달 |
| `SIMULATOR_WS_URL` | Variable | `SIMULATOR_WS_URL` | |
| `SLACK_WEBHOOK_URL` | Variable | `SLACK_WEBHOOK_URL` | |
| `CORS_ORIGINS` | Variable | `CORS_ORIGINS` | health-web이 RefreshToken을 쿠키로 전송하므로(`auth.controller.ts`) 와일드카드 origin을 쓸 수 없다. 로컬 개발(`http://localhost:5173`)과 배포된 health-web 도메인을 콤마로 나열한다 |
| `AI_AGENT_BASE_URL` | **고정값** | (Secret/Variable 없음) | `http://localhost:8000` 로 고정. `network_mode: host` 덕분에 서버에 떠 있는 health-ai에 `localhost`로 접근 가능 |

> GitHub Secret/Variable에 없는 값은 `AI_AGENT_BASE_URL` 하나뿐이며, 이 값은 학생마다 달라질 이유가 없어 고정값으로 둡니다. (`SIMULATOR_RECONNECT_ATTEMPTS`/`SIMULATOR_TIMEOUT_MS`는 앱 코드에서 아직 쓰지 않아 배포 파이프라인에서 제외했습니다.)

## 5. 파일 구성

```
healthcare/
├── .github/workflows/deploy-backend.yml   # CI/CD 워크플로우 (레포 루트에 위치해야 함)
└── health-backend/
    ├── Dockerfile
    ├── docker-compose.yml
    ├── .dockerignore
    └── docs/DEPLOY.md                      # 이 문서
```

`Dockerfile`, `docker-compose.yml`은 반드시 `health-backend/` 안에 두어야 합니다. 워크플로우가 서버로 복사하는 대상도 `health-backend/` 디렉토리 하나이고, 이미지 빌드 컨텍스트도 그 디렉토리 기준이기 때문입니다. 반면 GitHub Actions 워크플로우 파일은 모노레포 루트의 `.github/workflows/`에 있어야 GitHub이 인식합니다.

## 6. Dockerfile

멀티 스테이지 빌드로, 빌드 단계에서 `npm run build`로 `dist/`를 생성하고 실행 단계에는 프로덕션 의존성 + `dist/`만 남깁니다.

- base 이미지: `node:24-alpine` (`package.json`의 `@types/node` 버전과 맞춤)
- 실행 커맨드: `node dist/main`
- `EXPOSE`는 문서용 힌트일 뿐이며, 실제 바인딩 포트는 컨테이너 실행 시 주입되는 `PORT` 환경변수(=`BACKEND_PORT`)로 결정됩니다.

## 7. docker-compose.yml

- `image`, `container_name`은 모두 `${BACKEND_PORT}`를 포함해 학생별로 유일합니다.
- `network_mode: host`를 사용해 별도 포트 매핑 없이 호스트 포트를 그대로 씁니다.
- `environment`에 4절 매핑표를 그대로 반영합니다.
- **`.env` 파일을 만들지 않습니다.** `${VAR}` 형태는 `docker compose`를 실행하는 셸에 이미 존재하는 환경변수를 참조하며, 그 값은 배포 워크플로우(8절)가 GitHub Secrets/Variables로부터 주입합니다.

## 8. .github/workflows/deploy-backend.yml

`health-backend/**` 변경 시 실행되며 두 단계로 동작합니다.

1. **소스 복사**: `actions/checkout`으로 받은 `health-backend/` 디렉토리를 SSH로 서버의 `~/deploy/health-backend-${BACKEND_PORT}`에 복사(기존 내용 정리 후 복사).
2. **빌드 & 기동**: SSH로 서버에 접속해 해당 디렉토리로 이동한 뒤, Secrets/Variables 값을 셸 환경변수로 export하고 `docker compose -p health-backend-${BACKEND_PORT} up -d --build` 실행. 기존 동일 이름 컨테이너는 compose가 알아서 재생성합니다.

`SERVER_HOST`, `SERVER_PORT`는 Variable, `SERVER_USER`, `SSH_KEY`는 Secret이므로 워크플로우에서 각각 `vars.*` / `secrets.*`로 참조합니다.

## 9. 배포 흐름

```
push to main (health-backend/** 변경)
  → GitHub Actions 트리거
  → health-backend/ 소스를 서버의 ~/deploy/health-backend-${BACKEND_PORT} 로 복사
  → SSH 접속 후 해당 디렉토리에서 docker compose -p health-backend-${BACKEND_PORT} up -d --build
  → 컨테이너 health-backend-${BACKEND_PORT} 가 host 네트워크의 ${BACKEND_PORT} 포트로 기동
```

## 10. 트러블슈팅

- **다른 학생과 포트가 겹치는 것 같다**: `BACKEND_PORT` Variable 값이 실제로 고유하게 할당된 값인지 먼저 확인합니다. 이 가이드의 모든 격리(디렉토리/이미지/컨테이너/포트)는 이 값 하나에 의존합니다.
- **컨테이너 로그 확인**: 서버에서 `docker logs -f health-backend-${BACKEND_PORT}`.
- **수동 재배포**: 서버의 `~/deploy/health-backend-${BACKEND_PORT}`에서 필요한 환경변수를 export한 뒤 `docker compose -p health-backend-${BACKEND_PORT} up -d --build`를 직접 실행합니다.
- **AI 서버(`localhost:8000`)에 연결이 안 된다**: `network_mode: host`가 빠져있지 않은지 확인합니다. bridge 네트워크로 바뀌면 컨테이너 안의 `localhost`는 호스트가 아니라 컨테이너 자신을 가리켜 연결이 끊어집니다.
