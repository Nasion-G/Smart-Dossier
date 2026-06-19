"""
Intelligent Case Management System — FastAPI backend

AI stack (fully local, no API keys):
  - Docling     → PDF/DOCX/image → Markdown conversion (with OCR)
  - GLiNER2     → structured field extraction from Markdown (205M encoder, CPU)
  - Qwen2.5:7b  → case summaries and letter generation (via Ollama)
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from db import engine, Base
from routers import auth, cases, documents

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create database tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ready")

    # Warm up both local models in background threads
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _warm_up_models)

    yield

    await engine.dispose()
    logger.info("Shutdown complete")


def _warm_up_models() -> None:
    """Pre-load Docling and GLiNER2 so the first request is fast."""
    from services.docling_service import warm_up as docling_warmup
    from services.extraction_service import warm_up as gliner_warmup
    docling_warmup()
    gliner_warmup()


app = FastAPI(
    title="Intelligent Case Management API",
    version="1.0.0",
    description=(
        "EKB property privatization case management. "
        "AI stack: Docling (document parsing) + GLiNER2 (field extraction) + "
        "Qwen2.5:7b via Ollama (summaries & letters). All local, no API keys."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,      prefix="/auth",   tags=["Auth"])
app.include_router(cases.router,     prefix="/cases",  tags=["Cases"])
app.include_router(documents.router, prefix="/cases",  tags=["Documents"])
# Single-document operations also available at /documents/{id}/*
app.include_router(documents.router, prefix="",        tags=["Documents"])


@app.get("/health", tags=["Health"])
async def health():
    from services.ai_service import check_ollama_available
    ollama_ok = await asyncio.get_event_loop().run_in_executor(None, check_ollama_available)
    return {
        "status": "ok",
        "ollama": "ready" if ollama_ok else f"not ready — run: ollama pull {settings.OLLAMA_MODEL}",
        "model": settings.OLLAMA_MODEL,
    }
