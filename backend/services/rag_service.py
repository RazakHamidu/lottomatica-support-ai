from services.vector_store import search
from config import TOP_K_RESULTS


def retrieve_context(query: str) -> list[dict]:
    """Recupera i documenti più rilevanti per la query dell'utente."""
    docs = search(query, top_k=TOP_K_RESULTS)
    # Filtra documenti con score troppo basso
    relevant = [d for d in docs if d["score"] > 0.2]
    return relevant
