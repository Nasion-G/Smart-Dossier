"""
services/docling_service.py

Step 1 of the extraction pipeline: convert any uploaded file to clean Markdown.

Docling handles:
  - Digital PDFs (layout-aware parsing, reading order, table structure)
  - Scanned PDFs and images (built-in OCR via EasyOCR / Tesseract)
  - DOCX, XLSX, plain text
  - All with a single DocumentConverter API

The resulting Markdown is stored in documents.docling_markdown so that
re-extraction (by GLiNER2 or manually) is free — no re-parsing needed.
"""

import asyncio
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

SUPPORTED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "image/png",
    "image/jpeg",
    "image/tiff",
    "image/webp",
    "text/plain",
}


def _convert_sync(file_path: str) -> str:
    """
    Run Docling conversion synchronously.
    Called via run_in_executor so it doesn't block the event loop.
    """
    from docling.document_converter import DocumentConverter
    from docling.datamodel.pipeline_options import PdfPipelineOptions
    from docling.datamodel.base_models import InputFormat
    from docling.document_converter import PdfFormatOption

    pipeline_options = PdfPipelineOptions()
    pipeline_options.do_ocr = True              # handles scanned documents
    pipeline_options.do_table_structure = True  # preserves tables as Markdown

    converter = DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options),
        }
    )

    result = converter.convert(file_path)
    return result.document.export_to_markdown()


async def convert_to_markdown(file_path: str) -> str:
    """
    Convert a document to Markdown using Docling (async wrapper).
    Runs in a thread pool to avoid blocking FastAPI.
    """
    loop = asyncio.get_event_loop()
    logger.info("Starting Docling conversion: %s", file_path)
    markdown = await loop.run_in_executor(None, _convert_sync, file_path)
    logger.info("Docling conversion complete — %d chars", len(markdown))
    return markdown


def warm_up() -> None:
    """
    Pre-load Docling models at startup so the first upload isn't slow.
    Call from the FastAPI lifespan handler (in a thread, not awaited).
    """
    try:
        from docling.document_converter import DocumentConverter
        DocumentConverter()
        logger.info("Docling models loaded and ready")
    except Exception as e:
        logger.warning("Docling warm-up failed (non-fatal): %s", e)
