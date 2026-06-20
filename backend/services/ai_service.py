"""
services/ai_service.py

Uses Qwen2.5:1.5b running locally via Ollama for generative features and
document/phase checklist validation.

Why Qwen2.5:1.5b
-----------------
- Small enough (~1 GB) to auto-pull and run on modest hardware
- Reliable JSON-mode output via Ollama — no free-text parsing needed
- OpenAI-compatible API — swap to larger model by changing one config line
- Apache 2.0 license

Setup (once):
  ollama pull qwen2.5:1.5b
"""

import json
import asyncio
import logging
from fastapi import HTTPException

import ollama as ollama_client

from config import settings


logger = logging.getLogger(__name__)


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



LETTER_SYSTEM = (
    "Generate a formal government administrative letter from EKB (Property Privatization Authority) "
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
        result = ollama_client.Client(host=settings.OLLAMA_HOST).list()
        names = [m.model for m in (result.models or [])]
        return any(settings.OLLAMA_MODEL in n for n in names)
    except Exception:
        return False


# ── Checklist validation ──────────────────────────────────────────────────────

DOCUMENT_CHECKLIST = {
    "has_owner_name":     "the document clearly states the property owner's or applicant's full name",
    "has_property_id":    "the document includes a property, cadastral, or parcel ID number",
    "has_signature":      "the document contains a signature or a signed signature line",
    "has_official_stamp": "the document references or shows an official stamp, seal, or institutional certification",
    "is_dated":           "the document includes a clear date",
}

PHASE_CHECKLIST = {
    "1": "a public notice for this property has been issued or referenced",
    "2": "a citizen application has been submitted with required paperwork",
    "3": "ASHK legal verification has been completed or confirmed",
    "4": "the property's value has been calculated",
    "5": "a contract has been signed",
    "6": "the case file has been transferred to ASHK",
    "7": "the property has been formally registered",
}

CHECKLIST_SYSTEM_TEMPLATE = (
    "You are validating documents for a property privatization case. "
    "Given the text below, decide true or false for each item, based ONLY on what is "
    "explicitly present in the text — never guess or assume.\n\n"
    "Checklist (respond with exactly these keys):\n{schema}\n\n"
    "Respond with ONLY a JSON object mapping each key to true or false. No other text."
)


def _call_ollama_json(system: str, prompt: str) -> dict:
    try:
        response = ollama_client.Client(host=settings.OLLAMA_HOST).chat(
            model=settings.OLLAMA_MODEL,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}],
            format="json",
            options={"temperature": 0.0, "num_predict": 300},
        )
        return json.loads(response["message"]["content"])
    except Exception as e:
        logger.error("Ollama JSON call failed: %s", e)
        raise HTTPException(503, f"AI service unavailable: {e}")


async def check_document_checklist(markdown_text: str) -> dict:
    system = CHECKLIST_SYSTEM_TEMPLATE.format(schema=json.dumps(DOCUMENT_CHECKLIST, indent=2))
    prompt = f"Document text:\n{markdown_text[:4000]}"
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _call_ollama_json, system, prompt)
    return {k: bool(result.get(k, False)) for k in DOCUMENT_CHECKLIST}


async def check_phase_checklist(combined_markdown: str) -> dict:
    system = CHECKLIST_SYSTEM_TEMPLATE.format(schema=json.dumps(PHASE_CHECKLIST, indent=2))
    prompt = f"All uploaded document text for this case:\n{combined_markdown[:6000]}"
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _call_ollama_json, system, prompt)
    return {k: bool(result.get(k, False)) for k in PHASE_CHECKLIST}
