"""
services/extraction_service.py

Step 2 of the extraction pipeline: extract structured fields from Docling Markdown.

Why GLiNER2 instead of an LLM for this step
--------------------------------------------
LLM-based extraction (even a 7B model) has two problems for our use case:
  1. It can hallucinate — inventing a property ID that doesn't appear in the document.
  2. It's slow — a 7B model takes 5-15s per document even on a good CPU.

GLiNER2 is a 205M encoder model purpose-built for named entity recognition
and structured extraction. It:
  - Runs entirely on CPU in ~50ms per document
  - Scores spans of text against label descriptions — it physically CANNOT invent
    values that don't exist in the input text
  - Requires no GPU, no API key, downloads once from HuggingFace (~400MB)
  - Accepts plain English label descriptions, so no fine-tuning is needed

The model is loaded once at startup and reused for all requests.

Field schema
------------
We define each field as a human-readable description. GLiNER2 uses these
descriptions to score spans, so more specific descriptions = better accuracy.
"""

import asyncio
import logging
import re
from functools import lru_cache
from typing import Optional

logger = logging.getLogger(__name__)

# ── Field schema ─────────────────────────────────────────────────────────────
# Each key is the field name we want in extracted_data.
# The value is the natural-language description GLiNER2 uses to find it.
FIELD_SCHEMA = {
    "owner_name":      "full name of the property owner or applicant person",
    "property_id":     "property identification number, cadastral number, parcel ID, or asset ID",
    "zone":            "zone, district, neighborhood, city, or location of the property",
    "income_bracket":  "income category, economic group, or income classification of the applicant",
    "family_size":     "number of family members, household size, or number of dependants",
}

# Maximum characters to pass to GLiNER2 — the model has a token limit,
# and headers/first page typically contain all the fields we need.
MAX_CHARS = 3000


@lru_cache(maxsize=1)
def _get_gliner2():
    """Load GLiNER2 once and cache it for the process lifetime."""
    try:
        from gliner2 import GLiNER2
        logger.info("Loading GLiNER2 model: %s", "fastino/gliner2-base-v1")
        model = GLiNER2.from_pretrained("fastino/gliner2-base-v1")
        logger.info("GLiNER2 model loaded successfully")
        return model
    except ImportError:
        logger.warning("gliner2 not installed — falling back to regex extraction only")
        return None
    except Exception as e:
        logger.warning("GLiNER2 load failed (%s) — falling back to regex", e)
        return None


def _extract_with_gliner2(text: str) -> dict:
    """
    Run GLiNER2 structured extraction on a text chunk.

    GLiNER2's schema-driven interface accepts a dict of {field_name: description}
    and returns a dict of {field_name: extracted_value | None}.
    """
    model = _get_gliner2()
    if model is None:
        return {}

    truncated = text[:MAX_CHARS]

    try:
        # GLiNER2 structured extraction API
        result = model.extract_structured(
            text=truncated,
            schema=FIELD_SCHEMA,
            threshold=0.45,   # confidence threshold — lower = more recall, higher = more precision
        )
        # Normalise: cast family_size to int if present
        if result.get("family_size"):
            try:
                result["family_size"] = int(str(result["family_size"]).strip().split()[0])
            except (ValueError, AttributeError):
                result["family_size"] = None
        return {k: v for k, v in result.items() if v}
    except Exception as e:
        logger.warning("GLiNER2 extraction error: %s", e)
        return {}


# ── Regex fallback ────────────────────────────────────────────────────────────
# Used when GLiNER2 misses a field (or if the model isn't installed).
# Patterns are intentionally broad to handle varied document formats.

_REGEX_PATTERNS: dict[str, list[str]] = {
    "owner_name": [
        r"(?:owner|applicant|full\s+name)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)",
        r"(?:name)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)",
    ],
    "property_id": [
        r"(?:property\s+id|property\s+number|cadastral\s+(?:no|number)|parcel\s+(?:id|no))[:\s]+([A-Z0-9\-/]+)",
        r"(?:asset\s+id|reference\s+no)[:\s]+([A-Z0-9\-/]{4,20})",
    ],
    "zone": [
        r"(?:zone|district|neighborhood|location|address)[:\s]+([^\n,]{4,60})",
    ],
    "income_bracket": [
        r"(?:income\s+(?:category|bracket|group|class)|economic\s+group)[:\s]+([^\n,]{2,30})",
    ],
    "family_size": [
        r"(?:family\s+(?:members?|size)|household\s+size|number\s+of\s+(?:dependants?|members?))[:\s]+(\d+)",
    ],
}


def _extract_with_regex(text: str) -> dict:
    results: dict = {}
    for field, patterns in _REGEX_PATTERNS.items():
        for pattern in patterns:
            m = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if m:
                val = m.group(1).strip().rstrip(".,;")
                results[field] = int(val) if field == "family_size" else val
                break
    return results


# ── Main extraction entry point ───────────────────────────────────────────────

def _extract_sync(markdown_text: str) -> dict:
    """
    Extract fields from Docling Markdown.
    Strategy:
      1. GLiNER2 (primary — fast, accurate, cannot hallucinate)
      2. Regex fills any gaps GLiNER2 missed
    """
    gliner_result = _extract_with_gliner2(markdown_text)
    logger.info("GLiNER2 extracted %d fields", len(gliner_result))

    # Fill gaps with regex
    regex_result = _extract_with_regex(markdown_text)
    for key, val in regex_result.items():
        if key not in gliner_result:
            gliner_result[key] = val

    logger.info("Final extraction: %d/5 fields found", len(gliner_result))

    # Normalise — ensure all expected keys are present
    return {
        "owner_name":      gliner_result.get("owner_name"),
        "property_id":     gliner_result.get("property_id"),
        "zone":            gliner_result.get("zone"),
        "income_bracket":  gliner_result.get("income_bracket"),
        "family_size":     gliner_result.get("family_size"),
    }


async def extract_fields(markdown_text: str) -> dict:
    """Async wrapper — runs GLiNER2 in a thread pool."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _extract_sync, markdown_text)


def warm_up() -> None:
    """Pre-load GLiNER2 at startup."""
    _get_gliner2()
