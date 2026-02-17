# LottAssist — AI Customer Support Agent per Lottomatica

> Progetto dimostrativo sviluppato per il processo di selezione **Innovation Gen AI** @ Lottomatica

---

## Il Problema

Lottomatica è il leader italiano nel gioco regolamentato con oltre 3 milioni di utenti attivi. Nonostante la posizione di mercato dominante, il supporto clienti rappresenta il punto critico più evidente:

| Metrica | Dato |
|--------|------|
| Valutazione Trustpilot | ★☆☆☆☆ **1.2 / 5** |
| Principali lamentele | Account bloccati, prelievi fermi, KYC lenta, risposte generiche |
| Supporto disponibile | Solo 9:00–22:00 (telefono), code elevate nelle ore di punta |

**Sintomi del problema:**
- L'utente apre un ticket → aspetta giorni → riceve una risposta generica → riapre il ticket
- Le FAQ pubbliche sono incomplete e non coprono i casi reali
- Assenza totale di AI/automazione nel percorso di supporto

**Impatto sul business:**
- Alta churn rate tra utenti con problemi non risolti
- Danno reputazionale misurabile (Trustpilot, Google Reviews, forum)
- Costo elevato del supporto umano per richieste ripetitive e risolvibili automaticamente

---

## La Soluzione

**LottAssist** è un agente AI di customer support basato su RAG (Retrieval-Augmented Generation) che:

1. **Risponde immediatamente** — niente code, niente attese, disponibile 24/7
2. **Usa le informazioni reali** — il modello non inventa: recupera la risposta corretta dalla knowledge base Lottomatica
3. **Scala senza costi lineari** — 1 utente o 10.000, il costo marginale è quasi zero
4. **Sa quando passare a un umano** — riconosce i casi complessi e indirizza al supporto reale con numero diretto
5. **Risponde in streaming** — la risposta appare token per token, eliminando la percezione di attesa

### Flusso di una conversazione

```
Utente: "Il mio account è bloccato da 3 giorni"
   │
   ▼
[Frontend React] — invia il messaggio via HTTP POST
   │
   ▼
[Backend FastAPI] — riceve la richiesta
   │
   ├─► [RAG Pipeline]
   │     ├─ Embedding della query (sentence-transformers / all-MiniLM-L6-v2)
   │     ├─ Ricerca coseno sulla knowledge base (NumPy)
   │     └─ Top-4 documenti rilevanti (es. account.json → blocco account)
   │
   ├─► [Google Gemini 2.0 Flash]
   │     └─ Genera risposta con: contesto RAG + history conversazione + system prompt
   │
   └─► [Frontend — SSE Streaming]
         └─ Risposta mostrata token per token con cursore animato
```

---

## Architettura Tecnica

```
lottomatica-support-ai/
├── backend/
│   ├── main.py                        # FastAPI app + lifespan (carica KB all'avvio)
│   ├── config.py                      # Variabili d'ambiente (API key, modelli, top_k)
│   ├── requirements.txt
│   ├── routers/
│   │   └── chat.py                    # Endpoints: /api/chat/stream, /api/chat, /api/feedback
│   ├── services/
│   │   ├── gemini_service.py          # Integrazione Google Gemini (streaming + fallback sync)
│   │   ├── rag_service.py             # Pipeline RAG: query → retrieve_context()
│   │   └── vector_store.py            # Vector store in-memory con NumPy (cosine similarity)
│   ├── data/knowledge_base/
│   │   ├── faq.json                   # FAQ generali Lottomatica
│   │   ├── kyc_procedures.json        # Verifica identità e documenti
│   │   ├── payments.json              # Depositi, prelievi, metodi di pagamento
│   │   ├── account.json               # Gestione account (blocchi, password, dati)
│   │   ├── responsible_gaming.json    # Gioco responsabile, autoesclusione, limiti
│   │   ├── promotions.json            # Bonus e promozioni
│   │   └── sports_betting.json        # Scommesse sportive
│   └── prompts/
│       └── system_prompt.txt          # Persona e istruzioni agente LottAssist
│
└── frontend/
    └── src/
        ├── App.jsx                    # Pagina principale con info progetto
        ├── components/
        │   ├── ChatWidget.jsx         # Widget chat (SSE reader, streaming state)
        │   ├── ChatMessage.jsx        # Rendering messaggio (markdown, feedback 👍👎)
        │   ├── ChatHeader.jsx         # Header widget con logo LOTTOmatica
        │   ├── ChatInput.jsx          # Input + quick replies predefiniti
        │   └── TypingIndicator.jsx    # Indicatore "sta scrivendo..."
        └── styles/
            └── chat.css               # Stili widget (palette ufficiale Lottomatica blu #003DA5)
```

### Stack tecnologico

| Layer | Tecnologia | Motivazione |
|-------|-----------|-------------|
| LLM | Google Gemini 2.0 Flash | Veloce, economico, ottima qualità in italiano |
| Embedding | `all-MiniLM-L6-v2` (HuggingFace) | Leggero, offline, nessuna dipendenza cloud aggiuntiva |
| Vector Store | **NumPy** cosine similarity | Zero dipendenze complesse, funziona su qualsiasi OS senza build tools |
| Backend | FastAPI + Python 3.13 | Async nativo, SSE built-in, OpenAPI autodocs |
| Streaming | Server-Sent Events (SSE) | Standard HTTP, nessun WebSocket overhead |
| Frontend | React 19 + Vite | ReadableStream API per consumo SSE chunk-by-chunk |

---

## Decisioni di Design

### Perché RAG invece di fine-tuning?

Il fine-tuning è costoso (dati etichettati + GPU) e statico: il modello non si aggiorna senza un nuovo training. Il RAG permette di:
- Aggiornare la knowledge base in tempo reale senza ri-addestrare
- Avere fonti tracciabili e verificabili per ogni risposta (evidenziate nel widget)
- Controllare esattamente cosa può sapere il modello

### Perché NumPy invece di ChromaDB/Pinecone?

Su Windows, ChromaDB richiede Microsoft Visual C++ 14.0 come build tool. Per un MVP dimostrativo, NumPy è già disponibile come dipendenza transitiva di sentence-transformers. Con ~500 documenti la differenza di performance è impercettibile.

```python
# Ricerca coseno con NumPy — semplice ed efficace
scores = _embeddings @ query_vec  # dot product su vettori L2-normalizzati = cosine sim
top_indices = np.argsort(scores)[::-1][:top_k]
```

In produzione si sostituirebbe con Pinecone, Weaviate o pgvector su Postgres senza cambiare l'interfaccia di `vector_store.py`.

### Perché SSE invece di WebSocket?

SSE è unidirezionale (server → client), usa HTTP/1.1 standard, non richiede upgrade di protocollo e FastAPI lo supporta nativamente con `StreamingResponse`. Per una chat in cui l'utente invia un messaggio e aspetta la risposta, SSE è più semplice, affidabile e più facile da debuggare rispetto ai WebSocket.

### Conversation Memory

La history è mantenuta in-memory sul backend (dict keyed by `conversation_id` UUID). Solo gli ultimi 6 messaggi vengono inclusi nel prompt per contenere la dimensione del contesto e il costo API. In produzione si userebbe Redis o un DB persistente.

---

## Come Avviare il Progetto

### Prerequisiti
- Python 3.11+
- Node.js 18+
- Google Gemini API Key (gratuita su [aistudio.google.com](https://aistudio.google.com))

### Backend

```bash
cd backend

# Crea e attiva il virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac

# Installa dipendenze
pip install fastapi uvicorn google-generativeai sentence-transformers numpy python-dotenv

# Configura l'API key
echo GEMINI_API_KEY=la_tua_api_key > .env

# Avvia il server
uvicorn main:app --reload
```

Backend disponibile su `http://localhost:8000`
Documentazione interattiva: `http://localhost:8000/docs`

> **Nota:** Al primo avvio il modello `all-MiniLM-L6-v2` viene scaricato automaticamente (~90MB). Le richieste successive sono istantanee.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend disponibile su `http://localhost:5173`

---

## API Reference

### `POST /api/chat/stream`
Endpoint principale — risposta in streaming SSE.

**Request:**
```json
{
  "message": "Come faccio a verificare il mio account?",
  "conversation_id": null
}
```

**Response (SSE stream):**
```
data: {"type": "init", "conversation_id": "550e8400-e29b-41d4-a716-446655440000"}

data: {"type": "chunk", "text": "Per verificare"}
data: {"type": "chunk", "text": " il tuo account"}
data: {"type": "chunk", "text": " devi caricare..."}

data: {"type": "done", "sources": [{"category": "KYC", "question": "Quali documenti servono?", "score": 0.87}]}
```

### `POST /api/chat`
Endpoint fallback non-streaming (risposta completa in un colpo solo).

### `POST /api/feedback`
Feedback utente su una risposta.

```json
{ "conversation_id": "uuid", "message_index": 2, "rating": 1 }
```

`rating`: `1` = positivo (👍), `-1` = negativo (👎)

### `GET /api/health`
```json
{"status": "ok", "service": "Lottomatica Support AI"}
```

---

## Knowledge Base

La knowledge base contiene documenti simulati basati sulle informazioni reali di lottomatica.it. Ogni documento ha questa struttura:

```json
{
  "category": "KYC",
  "question": "Quali documenti servono per la verifica?",
  "answer": "Per completare la verifica KYC sono accettati: carta d'identità, patente...",
  "tags": ["verifica", "documenti", "identità"]
}
```

| File | Categoria | Esempi di domande coperte |
|------|-----------|--------------------------|
| `faq.json` | FAQ Generali | Registrazione, login, problemi comuni |
| `kyc_procedures.json` | KYC / Verifica | Documenti, tempi, blocco verifica |
| `payments.json` | Pagamenti | Depositi, prelievi, metodi, limiti |
| `account.json` | Account | Blocchi, password, modifica dati |
| `responsible_gaming.json` | Gioco Responsabile | Autoesclusione, limiti, contatti aiuto |
| `promotions.json` | Bonus | Bonus benvenuto, requisiti puntata |
| `sports_betting.json` | Scommesse | Quote, multipla, cashout |

---

## Domande di test suggerite

```
"Come faccio a verificare il mio account?"
"Il mio account è bloccato da una settimana"
"Ho problemi con il deposito con carta di credito"
"Come funziona il bonus benvenuto?"
"Voglio autoescludermi dal gioco"
"Il mio prelievo non è ancora arrivato"
"Come piazzo una scommessa multipla?"
```

---

## Possibili Evoluzioni in Produzione

| Feature | Impatto | Note |
|---------|---------|------|
| Integrazione CRM Lottomatica | Risposte personalizzate per utente (stato conto, tier) | Richiede accesso API interna |
| Escalation automatica a operatore | Handoff seamless quando il bot non riesce | LiveChat SDK |
| Persistenza conversazioni | Redis o Postgres per history multi-sessione | Sostituisce dict in-memory |
| Dashboard analytics | KPI supporto: topic frequenti, tasso risoluzione, CSAT | Elasticsearch + Kibana |
| Aggiornamento automatico KB | Sync con FAQ ufficiali via scraping schedulato | Apache Airflow |
| Guardrails anti-allucinazione | Verifica risposta vs. fonti citate prima dell'invio | LLM-as-judge |

---

*Progetto realizzato per dimostrare come la Gen AI può trasformare l'esperienza di supporto clienti nel settore gaming regolamentato.*
