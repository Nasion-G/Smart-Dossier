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

logger = logging.getLogger(__name__)

# Each key is the field name we want in extracted_data.
# The value is the natural-language description GLiNER2 uses to find it.
FIELD_SCHEMA = {
    "owner_name":      "full name of the property owner or applicant person",
    "property_id":     "property identification number, cadastral number, parcel ID, or asset ID",
    "zone":            "zone, district, neighborhood, city, or location of the property",
    "income_bracket":  "income category, economic group, or income classification of the applicant",
    "family_size":     "number of family members, household size, or number of dependants",
    "phase":           "current phase or stage number of the legalization process, e.g. phase 1, faza 2, etapa 3",
}
# Maximum characters to pass to GLiNER2 — the model has a token limit.
# Head+tail strategy: first 2/3 + last 1/3 to catch fields on any page.
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
    Run GLiNER2 structured extraction via extract_json.

    GLiNER2 extract_json expects structures in the format:
      { parent_key: [ "field::str::description", ... ] }

    Returns a flat dict of {field_name: extracted_value | None}.
    """
    model = _get_gliner2()
    if model is None:
        return {}

    # Head + tail strategy — key fields often appear on first or last page.
    if len(text) > MAX_CHARS:
        truncated = text[:MAX_CHARS * 2 // 3] + "\n...\n" + text[-MAX_CHARS // 3:]
    else:
        truncated = text

    # Build extract_json structures from FIELD_SCHEMA
    structures = {
        "extraction": [
            f"{field}::str::{desc}"
            for field, desc in FIELD_SCHEMA.items()
        ]
    }

    try:
        raw = model.extract_json(
            text=truncated,
            structures=structures,
            threshold=0.35,
        )
        # extract_json returns {"extraction": [{field: value, ...}]}
        items = raw.get("extraction", [])
        result = items[0] if items else {}
        # Normalise: cast family_size to int if present
        if result.get("family_size"):
            try:
                result["family_size"] = int(str(result["family_size"]).strip().split()[0])
            except (ValueError, AttributeError):
                result.pop("family_size", None)
        return {k: v for k, v in result.items() if v}
    except Exception as e:
        logger.warning("GLiNER2 extraction error: %s", e)
        return {}


# Used when GLiNER2 misses a field (or if the model isn't installed).
# Patterns are intentionally broad to handle varied document formats.

_REGEX_PATTERNS: dict[str, list[str]] = {
    "owner_name": [
        # English: "Owner: Besnik Mjeda" — names on a single line only
        r"(?:owner|applicant|full\s+name)[:\s]+([A-Z][A-Za-z\u00C0-\u024F\-']+(?:[^\S\n][A-Z][A-Za-z\u00C0-\u024F\-']+){1,3})",
        r"(?:name)[:\s]+([A-Z][A-Za-z\u00C0-\u024F\-']+(?:[^\S\n][A-Z][A-Za-z\u00C0-\u024F\-']+){1,3})",
        # Albanian: "Emri i plote i aplikuesit: Besnik Mjeda"
        r"(?:emri(?:\s+i\s+plot[ëe])?(?:\s+i\s+aplikuesit)?|aplikuesit?)[:\s]+([A-Z][A-Za-z\u00C0-\u024F\-']+(?:[^\S\n][A-Z][A-Za-z\u00C0-\u024F\-']+){1,3})",
    ],
    "property_id": [
        r"(?:property\s+id|property\s+number|cadastral\s+(?:no|number)|parcel\s+(?:id|no))[:\s]+([A-Z0-9\-/]+)",
        r"(?:asset\s+id|reference\s+no|nr[\.\s]+seri)[:\s]+([^\n]{3,20})",
    ],
    "zone": [
        # Allow commas for multi-part zone names like "Vasil Shanto Zone, Tirana"
        r"(?:zone|district|neighborhood|location|address|zona|rajoni)[^:\n]*:\s*([^\n]{4,80})",
    ],
    "income_bracket": [
        r"(?:income\s+(?:category|bracket|group|class)|economic\s+group)[:\s]+([^\n]{2,30})",
        # Albanian: "Kategoria e te ardhurave: Kategoria B"
        r"(?:kategoria(?:\s+e\s+t[ëe]\s+ardhurave)?|t[ëe]\s+ardhurave)[:\s]+([^\n]{2,30})",
    ],
    "family_size": [
        r"(?:family\s+(?:members?|size)|household\s+size|number\s+of\s+(?:dependants?|members?))[:\s]+(\d+)",
        # Albanian: "Madhesia e familjes: 4 anetare"
        r"(?:madhesia|familjes|antar[ëe])[:\s]+(\d+)",
    ],
    "phase": [
        r"(?:phase|stage|faza|etapa)\s*[:#]?\s*(\d+)",
    ],
}


def _extract_with_regex(text: str) -> dict:
    results: dict = {}
    for field, patterns in _REGEX_PATTERNS.items():
        for pattern in patterns:
            m = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if m:
                val = m.group(1).strip().rstrip(".,;")
                results[field] = int(val) if field in ("family_size", "phase") else val
                break
    return results
def _normalize_markdown(text: str) -> str:
    """Insert newlines before known Albanian field labels — Docling can squash
    multi-field blocks into a single line, breaking regex extraction."""
    labels = [
        r"Emri\s+i\s+plot[ëe]\s+i\s+aplikuesit:",
        r"Numri\s+i\s+pasuris[ëe]",
        r"Zona\s*/\s*Rajoni:",
        r"Kategoria\s+e\s+t[ëe]\s+ardhurave:",
        r"Madh[ëe]sia\s+e\s+familjes:",
        r"Faza\s*(?:e\s+)?(?:procesit)?\s*:",
        r"Etapa\s*:",
        r"Deklarat[ëe]:",
        r"N[ëe]nshkrimi:",
        r"Vula\s+zyrtare:",
    ]
    for label in labels:
        text = re.sub(rf"\s*({label})", r"\n\1", text, flags=re.IGNORECASE)
    return text


def _extract_sync(markdown_text: str) -> dict:
    """
    Extract fields from Docling Markdown.
    Strategy:
      1. Normalize — split squashed field labels onto separate lines
      2. GLiNER2 (primary — fast, accurate, cannot hallucinate)
      3. Regex fills any gaps GLiNER2 missed, or overrides owner_name
    """
    markdown_text = _normalize_markdown(markdown_text)
    logger.info("Markdown: %d chars, %d lines", len(markdown_text), markdown_text.count("\n") + 1)

    gliner_result = _extract_with_gliner2(markdown_text)
    logger.info("GLiNER2 extracted %d fields", len(gliner_result))

    # Fill gaps with regex, and override GLiNER2 when regex finds a longer match
    regex_result = _extract_with_regex(markdown_text)
    for key, val in regex_result.items():
        existing = gliner_result.get(key)
        if existing is None or key == "owner_name":
            # Regex patterns are more reliable for owner_name — GLiNER2 at low
            # thresholds can match non-name all-caps text like "VULAT E KOMUNES".
            gliner_result[key] = val

    logger.info("Final extraction: %d/5 fields found", len(gliner_result))

    # Normalise — ensure all expected keys are present
    return {
        "owner_name":      gliner_result.get("owner_name"),
        "property_id":     gliner_result.get("property_id"),
        "zone":            gliner_result.get("zone"),
        "income_bracket":  gliner_result.get("income_bracket"),
        "family_size":     gliner_result.get("family_size"),
        "phase":           gliner_result.get("phase"),
    }


async def extract_fields(markdown_text: str) -> dict:
    """Async wrapper — runs GLiNER2 in a thread pool."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _extract_sync, markdown_text)


def warm_up() -> None:
    """Pre-load GLiNER2 and run a smoke test at startup."""
    model = _get_gliner2()
    if model is None:
        return
    # Smoke test: verify the model can actually extract, not just load.
    try:
        test_text = "Owner: John Doe. Property ID: ABC-12345. Zone: Tirana Center."
        structures = {
            "extraction": [
                "owner_name::str::full name of the property owner",
                "property_id::str::property identification number",
                "zone::str::zone or district",
            ]
        }
        raw = model.extract_json(text=test_text, structures=structures, threshold=0.3)
        items = raw.get("extraction", [])
        result = items[0] if items else {}
        logger.info("GLiNER2 smoke test: %d fields extracted from sample", len(result))
        if not result:
            logger.warning(
                "GLiNER2 smoke test returned no fields — "
                "extraction may be degraded. Check model and threshold."
            )
    except Exception as e:
        logger.warning("GLiNER2 smoke test failed: %s — extraction degraded", e)
