"""
Vector store in-memory con numpy.
Nessuna dipendenza da C++/compilatori — ideale per demo e sviluppo locale.
"""
import json
import os
import numpy as np
from sentence_transformers import SentenceTransformer
from config import EMBEDDING_MODEL

_embedder = None
_documents: list[dict] = []
_embeddings = None  # np.ndarray shape (N, D)


def _get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        print(f"[VectorStore] Caricamento modello: {EMBEDDING_MODEL}")
        _embedder = SentenceTransformer(EMBEDDING_MODEL)
    return _embedder


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

    print(f"[VectorStore] Indicizzazione {len(all_texts)} documenti...")
    embedder = _get_embedder()
    vecs = embedder.encode(all_texts, show_progress_bar=False, normalize_embeddings=True)

    _documents = all_meta
    _embeddings = np.array(vecs, dtype=np.float32)
    print("[VectorStore] Pronto.")


def search(query: str, top_k: int = 4) -> list[dict]:
    """Cosine similarity search (vettori normalizzati -> prodotto scalare)."""
    if _embeddings is None or len(_documents) == 0:
        return []

    embedder = _get_embedder()
    q_vec = embedder.encode([query], normalize_embeddings=True)[0]

    scores = _embeddings @ q_vec  # (N,)
    top_idx = np.argsort(scores)[::-1][:top_k]

    results = []
    for i in top_idx:
        results.append({**_documents[i], "score": float(scores[i])})
    return results
