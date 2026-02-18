"""
Vector store in-memory con numpy + Google Gemini Embeddings API.
Nessun PyTorch/CUDA — build leggero (~50MB invece di 3.5GB).
"""
import json
import os
import numpy as np
from google import genai
from google.genai import types
from config import GEMINI_API_KEY

_documents: list[dict] = []
_embeddings = None  # np.ndarray shape (N, D)

EMBEDDING_MODEL = "models/gemini-embedding-001"

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client


def _embed_texts(texts: list[str]) -> np.ndarray:
    """Genera embeddings per una lista di testi usando Gemini API."""
    client = _get_client()
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=texts,
    )
    vecs = np.array([e.values for e in result.embeddings], dtype=np.float32)
    # Normalizza L2 per cosine similarity via dot product
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1, norms)
    return vecs / norms


def _embed_query(query: str) -> np.ndarray:
    """Genera embedding per una singola query."""
    client = _get_client()
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=query,
        config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY"),
    )
    vec = np.array(result.embeddings[0].values, dtype=np.float32)
    norm = np.linalg.norm(vec)
    return vec / norm if norm > 0 else vec


def load_knowledge_base():
    global _documents, _embeddings

    if _documents:
        print(f"[VectorStore] Knowledge base gia' caricata ({len(_documents)} doc).")
        return

    kb_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "data", "knowledge_base")
    )

    all_texts = []
    all_meta = []

    for filename in sorted(os.listdir(kb_dir)):
        if not filename.endswith(".json"):
            continue
        with open(os.path.join(kb_dir, filename), "r", encoding="utf-8") as f:
            entries = json.load(f)

        for entry in entries:
            text = f"Domanda: {entry['question']}\nRisposta: {entry['answer']}"
            all_texts.append(text)
            all_meta.append({
                "id":       entry["id"],
                "category": entry.get("category", ""),
                "question": entry["question"],
                "text":     text,
            })

    if not all_texts:
        print("[VectorStore] Nessun documento trovato.")
        return

    print(f"[VectorStore] Indicizzazione {len(all_texts)} documenti con Gemini Embeddings...")
    vecs = _embed_texts(all_texts)

    _documents = all_meta
    _embeddings = vecs
    print(f"[VectorStore] Pronto. {len(_documents)} documenti indicizzati.")


def search(query: str, top_k: int = 4) -> list[dict]:
    """Cosine similarity search (vettori L2-normalizzati -> dot product)."""
    if _embeddings is None or len(_documents) == 0:
        return []

    q_vec = _embed_query(query)
    scores = _embeddings @ q_vec  # (N,)
    top_idx = np.argsort(scores)[::-1][:top_k]

    return [{**_documents[i], "score": float(scores[i])} for i in top_idx]
