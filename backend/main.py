from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routers.chat import router as chat_router
from services.vector_store import load_knowledge_base


@asynccontextmanager
async def lifespan(app: FastAPI):
    # All'avvio: carica la knowledge base in ChromaDB
    print("[Startup] Caricamento knowledge base Lottomatica...")
    load_knowledge_base()
    print("[Startup] Pronto!")
    yield
    print("[Shutdown] Server arrestato.")


app = FastAPI(
    title="Lottomatica Support AI",
    description="Assistente virtuale AI per il supporto clienti Lottomatica",
    version="1.0.0",
    lifespan=lifespan
)

import os

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://*.vercel.app",
        os.getenv("FRONTEND_URL", ""),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)


@app.get("/")
async def root():
    return {
        "message": "Lottomatica Support AI API",
        "docs": "/docs",
        "health": "/api/health"
    }
