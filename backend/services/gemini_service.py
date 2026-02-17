import os
import google.generativeai as genai
from config import GEMINI_API_KEY, GEMINI_MODEL

_model = None


def _get_model():
    global _model
    if _model is None:
        genai.configure(api_key=GEMINI_API_KEY)
        _model = genai.GenerativeModel(GEMINI_MODEL)
    return _model


def _load_system_prompt() -> str:
    prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "system_prompt.txt")
    prompt_path = os.path.abspath(prompt_path)
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()


def build_prompt(user_message: str, context_docs: list[dict], history: list[dict]) -> str:
    """Costruisce il prompt completo con contesto RAG e storia conversazione."""
    system_prompt = _load_system_prompt()

    # Formatta il contesto RAG
    if context_docs:
        context_text = "\n\n".join([
            f"[{doc['category']}] {doc['text']}"
            for doc in context_docs
            if doc['score'] > 0.3  # filtra risultati poco rilevanti
        ])
        context_section = f"\n\n## Informazioni rilevanti dalla knowledge base:\n{context_text}"
    else:
        context_section = ""

    # Formatta la storia della conversazione
    history_text = ""
    if history:
        history_lines = []
        for msg in history[-6:]:  # ultimi 6 messaggi per non sovraccaricare il contesto
            role = "Cliente" if msg["role"] == "user" else "LottAssist"
            history_lines.append(f"{role}: {msg['content']}")
        history_text = "\n\n## Conversazione precedente:\n" + "\n".join(history_lines)

    full_prompt = f"""{system_prompt}{context_section}{history_text}

## Messaggio attuale del cliente:
{user_message}

## Risposta di LottAssist:"""

    return full_prompt


async def get_response(user_message: str, context_docs: list[dict], history: list[dict]) -> str:
    """Genera una risposta completa usando Gemini (fallback non-streaming)."""
    model = _get_model()
    prompt = build_prompt(user_message, context_docs, history)

    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.3,
                max_output_tokens=1024,
            )
        )
        return response.text
    except Exception as e:
        print(f"[Gemini] Errore durante la generazione: {e}")
        raise


def get_response_stream(user_message: str, context_docs: list[dict], history: list[dict]):
    """Genera una risposta in streaming da Gemini, yield di chunk di testo."""
    model = _get_model()
    prompt = build_prompt(user_message, context_docs, history)

    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.3,
            max_output_tokens=1024,
        ),
        stream=True,
    )

    for chunk in response:
        try:
            if chunk.text:
                yield chunk.text
        except Exception:
            continue
