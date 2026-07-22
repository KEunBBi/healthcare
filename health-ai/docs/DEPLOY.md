# health-ai 배포 가이드

## 목차
- [1. 개요](#1-개요)
- [2. 사전 준비: GitHub Secrets / Variables](#2-사전-준비-github-secrets--variables)
- [3. 환경변수 매핑표](#3-환경변수-매핑표)
- [4. 배포 흐름](#4-배포-흐름)
- [5. 트러블슈팅](#5-트러블슈팅)

## 1. 개요

health-ai는 학생별로 `ai{학생번호}.ys.iranglab.com` 도메인이 배정되며, 배포서버 nginx가 이 도메인을 `localhost:20{학생번호}`로 라우팅한다 (`health-backend/docs/DEPLOY.md`의 `BACKEND_PORT`/`be{번호}` 규칙과 동일한 패턴). 이 학생은 `be002`(포트 21002)를 쓰고 있으므로 health-ai는 **포트 20002 고정**으로 배포한다.

health-backend가 이 서비스를 프록시하므로(`health-backend/docs/API_SPEC.md` 1.6), web·mobile은 health-ai를 직접 호출하지 않는다. health-backend의 `AI_AGENT_BASE_URL`은 `http://host.docker.internal:20002`로 고정되어 있다(`health-backend/docker-compose.yml`).

## 2. 사전 준비: GitHub Secrets / Variables

health-backend와 같은 배포 서버·DB를 쓰므로 새로 등록할 값은 없다. 기존에 등록된 아래 값을 워크플로우에서 이름만 바꿔(`DATABASE_*` → `DB_*`) 재사용한다.

- `SERVER_HOST`, `SERVER_PORT`, `SERVER_USER`, `SSH_KEY` (health-backend와 동일)
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME` (Variable), `DATABASE_USER`, `DATABASE_PASSWORD` (Secret)

## 3. 환경변수 매핑표

| 앱이 읽는 env 이름 (`rag_query.py get_config`) | 값의 출처 | GitHub 이름 |
|---|---|---|
| `PORT` | 고정값 | `20002` |
| `DB_HOST` | Variable | `DATABASE_HOST` |
| `DB_PORT` | Variable | `DATABASE_PORT` |
| `DB_NAME` | Variable | `DATABASE_NAME` |
| `DB_USER` | Secret | `DATABASE_USER` |
| `DB_PASSWORD` | Secret | `DATABASE_PASSWORD` |
| `OLLAMA_BASE_URL` | 고정값 | `https://ai.iranglab.com` (교수님이 기간 한정으로 공용 개방) |
| `LLM_MODEL` | 고정값 | `qwen2.5:3b` |
| `EMBED_MODEL` | 고정값 | `bge-m3` |

## 4. 배포 흐름

```
push to main (health-ai/** 변경)
  → GitHub Actions 트리거 (.github/workflows/deploy-ai.yml)
  → health-ai/ 소스를 서버의 ~/deploy/health-ai-20002 로 복사
  → SSH 접속 후 해당 디렉토리에서 docker compose -p health-ai-20002 up -d --build
  → 컨테이너 health-ai-20002 가 포트 20002로 기동
  → https://ai002.ys.iranglab.com 로 접근 가능
```

## 5. 트러블슈팅

- **`https://ai002.ys.iranglab.com`이 502**: 컨테이너가 떠 있는지 `docker ps | grep health-ai-20002`로 확인. `docker logs health-ai-20002`로 기동 에러(특히 DB 연결 실패) 확인.
- **health-backend에서 `AI_AGENT_UNAVAILABLE`**: health-backend가 `http://host.docker.internal:20002`로 접근하므로, health-backend 컨테이너에 `extra_hosts: host.docker.internal:host-gateway`가 설정되어 있는지 확인(`health-backend/docker-compose.yml`).
