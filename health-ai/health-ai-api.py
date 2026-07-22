# app.py
# 서버실행방법 터미널에서 아래의 명령을 실행
# python -m uvicorn app:apiApp --host 0.0.0.0 --port 8000 --reload

# 테스트 방법 :터미널에서 아래와 같이 API 호출
"""
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "만성 기침의 유병율은?",
    "top_k": 3,
    "temperature": 0.2
  }'
"""

from fastapi import FastAPI
from pydantic import BaseModel
from typing import Literal, Optional

from rag_query import (
    answer_agent_question,
    get_config,
)


# ============================================================
# FastAPI 앱 생성
# ============================================================

apiApp = FastAPI(
    title="Healthcare RAG API",
    description="Ollama + pgvector 기반 RAG 질문 답변 API",
    version="1.0.0",
)


# ============================================================
# API 요청 모델
# ============================================================

class AskRequest(BaseModel):
    question: str
    top_k: int = 3
    temperature: float = 0.2
    max_chars_per_doc: Optional[int] = None


class ChatHistoryTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    # 멀티턴 문맥 유지용 이전 대화 턴(최근 순). health-backend가 그대로 전달한다.
    history: Optional[list[ChatHistoryTurn]] = None


# ============================================================
# API 응답 모델은 우선 dict로 반환
# ============================================================

@apiApp.get("/")
def root():
    return {
        "message": "Healthcare RAG API Server is running"
    }


# ============================================================
# 질문 답변 API
# ============================================================

@apiApp.post("/ask")
def ask(request: AskRequest):
    config = get_config()

    result = answer_agent_question(
        question=request.question,
        ollama_base_url=config["ollama_base_url"],
        top_k=request.top_k,
        temperature=request.temperature,
        max_chars_per_doc=request.max_chars_per_doc,
        verbose=False,
    )

    return result["answer"]


# ============================================================
# 챗봇 API (health-backend가 프록시하는 대화형 엔드포인트)
# health-backend/docs/API_SPEC.md 1.6, health-ai/docs/API_SPEC.md 1.1 계약을 따른다.
# Tool & Agent 기반(answer_agent_question)이라 건강 문서 질문은 자동으로 RAG 검색을 거치고,
# 일반 대화는 도구 호출 없이 바로 답변한다.
# ============================================================

@apiApp.post("/chat")
def chat(request: ChatRequest):
    config = get_config()

    history = [turn.model_dump() for turn in request.history] if request.history else None

    result = answer_agent_question(
        question=request.message,
        llm_model=config["llm_model"],
        ollama_base_url=config["ollama_base_url"],
        top_k=3,
        temperature=0.2,
        verbose=False,
        history=history,
    )

    return {"answer": result["answer"]}