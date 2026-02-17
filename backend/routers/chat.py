import uuid
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.rag_service import retrieve_context
from services.gemini_service import get_response, get_response_stream

router = APIRouter(prefix="/api", tags=["chat"])

# Conversation history in-memory: { conversation_id: [{"role": "user"|"assistant", "content": "..."}] }
conversations: dict[str, list[dict]] = {}


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    sources: list[dict]


class FeedbackRequest(BaseModel):
    conversation_id: str
    message_index: int
    rating: int  # 1 = positivo, -1 = negativo


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """Endpoint SSE: restituisce la risposta in streaming chunk per chunk."""
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Il messaggio non può essere vuoto.")

    conv_id = request.conversation_id or str(uuid.uuid4())
    if conv_id not in conversations:
        conversations[conv_id] = []

    history = conversations[conv_id]
    context_docs = retrieve_context(request.message)

    sources = [
        {"category": d["category"], "question": d["question"], "score": round(d["score"], 2)}
        for d in context_docs[:2]
    ]

    # Salva il messaggio utente subito
    conversations[conv_id].append({"role": "user", "content": request.message})

    def event_generator():
        full_text = ""
        try:
            # Primo evento: invia il conversation_id
            yield f"data: {json.dumps({'type': 'init', 'conversation_id': conv_id})}\n\n"

            # Stream dei chunk di testo
            for chunk in get_response_stream(request.message, context_docs, history):
                full_text += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"

            # Evento finale con fonti
            yield f"data: {json.dumps({'type': 'done', 'sources': sources})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            full_text = "Mi dispiace, si è verificato un errore. Contatta il supporto al **800 900 009**."
        finally:
            # Salva la risposta completa nella history
            if full_text:
                conversations[conv_id].append({"role": "assistant", "content": full_text})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Endpoint standard (non-streaming) — mantenuto come fallback."""
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Il messaggio non può essere vuoto.")

    conv_id = request.conversation_id or str(uuid.uuid4())
    if conv_id not in conversations:
        conversations[conv_id] = []

    history = conversations[conv_id]
    context_docs = retrieve_context(request.message)

    try:
        response_text = await get_response(
            user_message=request.message,
            context_docs=context_docs,
            history=history
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore: {str(e)}")

    conversations[conv_id].append({"role": "user", "content": request.message})
    conversations[conv_id].append({"role": "assistant", "content": response_text})

    sources = [
        {"category": d["category"], "question": d["question"], "score": round(d["score"], 2)}
        for d in context_docs[:2]
    ]

    return ChatResponse(response=response_text, conversation_id=conv_id, sources=sources)


@router.get("/health")
async def health():
    return {"status": "ok", "service": "Lottomatica Support AI"}


@router.post("/feedback")
async def feedback(request: FeedbackRequest):
    print(f"[Feedback] conv_id={request.conversation_id} msg_idx={request.message_index} rating={request.rating}")
    return {"status": "received"}
