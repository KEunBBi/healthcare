# API 명세 (내부 - health-ai 제공 API)

> health-ai(FastAPI)가 health-backend에 제공하는 자체 API 명세다. 이 프로젝트가 소유하며, 소비하는 쪽(health-backend)은 참조만 한다.
> health-backend가 이 API를 프록시해 web·mobile에 제공하는 인터페이스는 [`health-backend/docs/API_SPEC.md`](../../health-backend/docs/API_SPEC.md) 1.6을 참고한다.

## 목차
- 0. 공통 규칙
- 1. REST API
  - 1.1 채팅 (Agent)
  - 1.2 RAG 단발 질의 (개발/디버그용)
- 2. 에러 코드

## 0. 공통 규칙

- Base URL: `http://{host}:8000` (배포 시 `OLLAMA_BASE_URL` 등은 서버 환경변수로 주입, API 자체 경로는 고정)
- Content-Type: `application/json`
- health-backend 외 다른 클라이언트(web·mobile)는 이 API를 직접 호출하지 않는다. health-backend만 호출한다.
- health-backend는 이 API의 응답을 그대로(가공 없이) `{ success, data: { answer }, error }` 포맷으로 감싸 프록시한다 (`health-backend/docs/API_SPEC.md` 1.6).

## 1. REST API

### 1.1 채팅 (Agent)
`POST /chat`

health-backend `ChatService`가 호출하는 실제 프로덕션 엔드포인트. LangChain `create_agent` 기반 Tool-calling 에이전트(`answer_agent_question`, [`rag_query.py`](../rag_query.py))가 처리한다.

- 사용자 질문이 건강검진/처방전/개인 건강기록 등 등록된 문서 확인이 필요한 질문이면 에이전트가 `search_health_documents` 도구를 호출해 pgvector에서 유사 문서를 검색(RAG)한 뒤 문서 근거로 답변한다.
- 문서 검색이 필요 없는 일반 질문(프로그래밍, 일상 대화 등)은 도구 호출 없이 LLM이 직접 답변한다.
- 도구를 사용한 답변에는 `[source: ..., page: ...]` 형식의 출처가 포함된다. 근거 문서에 없는 내용은 "문서에서 확인되지 않습니다"로 답한다.

**요청 (Body)**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| message | string | Y | 질의내용 |
| history | `{ role: "user" \| "assistant", content: string }[]` | N | 이전 대화 턴(최근 순). health-backend가 그대로 전달한다. Agent 호출 시 `messages` 리스트의 앞부분에 이어붙여 멀티턴 문맥으로 사용한다(`rag_query.py answer_agent_question`). |

```json
{
  "message": "그 사람 혈압도 알려줘",
  "history": [
    { "role": "user", "content": "user_001의 건강검진 결과를 요약해줘" },
    { "role": "assistant", "content": "user_001님의 심박·혈당·혈압은 모두 정상 범위입니다..." }
  ]
}
```

**응답**

| 필드 | 타입 | 설명 |
|---|---|---|
| answer | string | Agent 답변내용 (문서 기반인 경우 근거·출처 포함) |

```json
{ "answer": "핵심 답변:\n...\n\n근거:\n...\n\n출처:\n- [source: ..., page: ...]" }
```

**추가 조건**
- 응답 지연 시 health-backend가 10초 타임아웃 후 502(`AI_AGENT_UNAVAILABLE`)로 처리한다 (`health-backend/src/chat/chat.service.ts`).
- LLM 모델(`LLM_MODEL`), Ollama 서버 주소(`OLLAMA_BASE_URL`) 등은 서버 환경변수로 주입한다([`rag_query.py`](../rag_query.py) `get_config`).

### 1.2 RAG 단발 질의 (개발/디버그용)
`POST /ask`

RAG 파이프라인(문서 검색 → context 구성 → LLM 답변)만 단독으로 테스트하기 위한 개발용 엔드포인트다. health-backend는 이 API를 호출하지 않는다(1.1 참고).

**요청 (Body)**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| question | string | Y | 질의내용 |
| top_k | number | N | 검색할 유사 문서 수 (기본 3) |
| temperature | number | N | LLM temperature (기본 0.2) |
| max_chars_per_doc | number | N | 문서별 context에 포함할 최대 글자 수 |

**응답**

RAG 답변 문자열을 그대로 반환한다(엔벨로프 없음).

## 2. 에러 코드

이 API 자체는 별도의 에러 코드 체계를 두지 않는다. DB·LLM 호출 실패 시 FastAPI 기본 500 응답을 반환하며, health-backend가 이를 502(`AI_AGENT_UNAVAILABLE`)로 변환해 상위로 전달한다.
