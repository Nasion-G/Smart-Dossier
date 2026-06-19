"""
services/ai_service.py

Uses Qwen2.5:7b running locally via Ollama for the two generative features:
  1. Case summary — reason about where a case is stuck and what to do next
  2. Formal letter generation — produce an official government letter

Why Qwen2.5:7b for this
-----------------------
- Specifically noted for reliable JSON and structured output (we use plain text here
  but the instruction-following quality is what matters)
- Runs on CPU with ~5GB RAM — no GPU required for a hackathon demo
- Multilingual support (29 languages) — handles any language in the documents
- OpenAI-compatible API via Ollama, so swapping to a larger model is one line
- Apache 2.0 license for sizes other than 3B/72B

Setup (once):
  ollama pull qwen2.5:7b
"""

import asyncio
import logging
from fastapi import HTTPException

import ollama as ollama_client

from config import settings

logger = logging.getLogger(__name__)

# ── Process knowledge injected into every prompt ─────────────────────────────

PROCESS_CONTEXT = """
The EKB Property Privatization process has 7 phases:
  Phase 1 — Public notice          (EKB posts notice; limited reach is a known issue)
  Phase 2 — Citizen application    (physical submission, 12-18 paper documents)
  Phase 3 — Legal verification     (manual ASHK check; typical delay 2-4 weeks) ⚠ BOTTLENECK
  Phase 4 — Value calculation      (manual Excel spreadsheet, no audit trail)
  Phase 5 — Contract signing       (physical signatures)
  Phase 6 — File transfer to ASHK  (physical delivery; loss risk; typical delay 4-8 weeks) ⚠ BOTTLENECK
  Phase 7 — Property registration  (ASHK queue; typical 4-8 weeks)

Known bottlenecks are Phase 3 (ASHK legal check) and Phase 6 (physical file transfer).
"""

PHASE_LABELS = {
    1: "Public notice",
    2: "Citizen application",
    3: "Legal verification (ASHK)",
    4: "Value calculation",
    5: "Contract signing",
    6: "File transfer to ASHK",
    7: "Property registration",
}

BLOCK_THRESHOLDS = {3: 14, 6: 21}  # days before a phase is flagged as blocked


def _days_in_phase(case) -> int:
    from datetime import datetime, timezone
    entered = case.phase_entered_at
    if entered.tzinfo is None:
        entered = entered.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - entered).days


def _call_ollama(system: str, prompt: str) -> str:
    """Synchronous Ollama call. Wrap with run_in_executor for async use."""
    try:
        response = ollama_client.Client(host=settings.OLLAMA_HOST).chat(
            model=settings.OLLAMA_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": prompt},
            ],
            options={
                "temperature": 0.3,   # low = more deterministic / less hallucination
                "num_predict": 600,
            },
        )
        return response["message"]["content"].strip()
    except Exception as e:
        logger.error("Ollama call failed: %s", e)
        raise HTTPException(
            503,
            f"AI service unavailable. Make sure Ollama is running and "
            f"'{settings.OLLAMA_MODEL}' is pulled. Error: {e}",
        )


# ── Feature 1: Case summary ───────────────────────────────────────────────────

SUMMARY_SYSTEM = (
    PROCESS_CONTEXT
    + "\n\nYou are an assistant for the EKB case management clerk. "
    "Given the 7-phase process above and the case data below, provide a concise analysis:\n"
    "1. Where the case currently stands and how long it has been there\n"
    "2. Whether the current phase is a known bottleneck — warn clearly if so\n"
    "3. The concrete next action the clerk should take\n"
    "4. Any missing information that is blocking progress\n\n"
    "Write in plain English. Be direct and specific to this case. Max 180 words."
)


async def summarize_case(case) -> str:
    days = _days_in_phase(case)
    is_bottleneck = case.current_phase in BLOCK_THRESHOLDS
    threshold = BLOCK_THRESHOLDS.get(case.current_phase, 14)

    user_prompt = (
        f"Case: {case.code} — {case.title}\n"
        f"Current phase: {case.current_phase}/7 ({PHASE_LABELS.get(case.current_phase, '?')})\n"
        f"Days in current phase: {days}\n"
        f"Status: {case.status}\n"
        f"Owner: {case.owner_name or 'unknown'}\n"
        f"Property ID: {case.property_id or 'unknown'}\n"
        f"Zone: {case.zone or 'unknown'}\n"
        f"Income bracket: {case.income_bracket or 'unknown'}\n"
        + (f"\n⚠ WARNING: Phase {case.current_phase} is a known bottleneck "
           f"(threshold: {threshold} days, case has been here {days} days).\n"
           if is_bottleneck else "")
    )

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _call_ollama, SUMMARY_SYSTEM, user_prompt)


# ── Feature 2: Official letter generation ─────────────────────────────────────

LETTER_SYSTEM = (
    "Generate a formal government administrative letter from EKB (Enti i Kalimit të Banesave) "
    "addressed to ASHK (Agency of State Cadastre).\n\n"
    "Required format:\n"
    "  Ref No: [reference] / [date]\n"
    "  To: ASHK — Agency of State Cadastre\n"
    "  Subject: [subject line]\n\n"
    "  [Body — 2-3 formal paragraphs]\n\n"
    "  Respectfully,\n"
    "  EKB Directorate\n\n"
    "Rules: formal institutional tone, grammatically correct, no commentary outside the letter."
)


async def generate_letter(case) -> str:
    user_prompt = (
        f"Write a formal letter for case {case.code}.\n"
        f"Applicant: {case.owner_name or 'unknown'}\n"
        f"Property ID: {case.property_id or 'unknown'}\n"
        f"Zone: {case.zone or 'unknown'}\n"
        f"Current phase: {case.current_phase} — {PHASE_LABELS.get(case.current_phase, '')}\n"
        f"Purpose: Request verification/confirmation from ASHK for phase {case.current_phase}."
    )

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _call_ollama, LETTER_SYSTEM, user_prompt)


def check_ollama_available() -> bool:
    """Health check — returns True if Ollama is reachable and the model is loaded."""
    try:
        models = ollama_client.Client(host=settings.OLLAMA_HOST).list()
        names = [m["name"] for m in models.get("models", [])]
        return any(settings.OLLAMA_MODEL in n for n in names)
    except Exception:
        return False
