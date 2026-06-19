import logging
from pathlib import Path
from uuid import UUID

import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db import get_session
from models import Document, Case, User
from schemas import DocumentRead, ExtractedFields
from auth import get_current_user, require_role
from services.docling_service import convert_to_markdown, SUPPORTED_MIME_TYPES
from services.extraction_service import extract_fields

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_BYTES = settings.MAX_FILE_MB * 1024 * 1024
UPLOAD_DIR = Path(settings.UPLOAD_DIR)


async def _get_case_or_404(case_id: UUID, db: AsyncSession) -> Case:
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(404, "Case not found")
    return case



@router.post("/{case_id}/documents", response_model=DocumentRead, status_code=201)
async def upload_document(
    case_id: UUID,
    file: UploadFile = File(...),
    user: User = Depends(require_role("clerk")),
    db: AsyncSession = Depends(get_session),
):
    await _get_case_or_404(case_id, db)

    # Validate mime type
    mime = file.content_type or "application/octet-stream"
    if mime not in SUPPORTED_MIME_TYPES:
        raise HTTPException(
            415,
            f"Unsupported file format: {mime}. "
            f"Accepted: PDF, DOCX, PNG, JPEG, TIFF, TXT.",
        )

    # Read and size-check
    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(
            413,
            f"File is too large ({len(content) // 1024 // 1024} MB). "
            f"Maximum: {settings.MAX_FILE_MB} MB.",
        )

    # Save to disk
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = f"{case_id}_{file.filename}".replace(" ", "_")
    file_path = UPLOAD_DIR / safe_name

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    logger.info("Saved upload: %s (%d bytes)", file_path, len(content))

    # ── Docling: convert to Markdown ─────────────────────────────────────────
    markdown_text: str | None = None
    extracted: dict = {}

    try:
        markdown_text = await convert_to_markdown(str(file_path))
    except Exception as e:
        logger.warning("Docling conversion failed for %s: %s", safe_name, e)

    # ── GLiNER2: extract fields from Markdown ─────────────────────────────────
    if markdown_text:
        try:
            extracted = await extract_fields(markdown_text)
        except Exception as e:
            logger.warning("GLiNER2 extraction failed: %s", e)

    # Persist document record
    doc = Document(
        case_id=case_id,
        filename=file.filename,
        file_path=str(file_path),
        mime_type=mime,
        docling_markdown=markdown_text,
        extracted_data=extracted if any(v is not None for v in extracted.values()) else None,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    return DocumentRead.model_validate(doc)



@router.get("/{case_id}/documents", response_model=list[DocumentRead])
async def list_documents(
    case_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    await _get_case_or_404(case_id, db)
    result = await db.execute(
        select(Document)
        .where(Document.case_id == case_id)
        .order_by(Document.uploaded_at)
    )
    return result.scalars().all()



@router.post("/documents/{doc_id}/re-extract", response_model=ExtractedFields)
async def re_extract(
    doc_id: UUID,
    user: User = Depends(require_role("clerk")),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Document not found")

    try:
        # Re-use stored Markdown if available (avoids re-running Docling)
        if doc.docling_markdown:
            markdown = doc.docling_markdown
        else:
            markdown = await convert_to_markdown(doc.file_path)
            doc.docling_markdown = markdown

        extracted = await extract_fields(markdown)
        doc.extracted_data = extracted
        doc.confirmed = False
        await db.commit()
        await db.refresh(doc)
    except Exception as e:
        logger.error("Re-extraction failed: %s", e)
        raise HTTPException(500, f"Extraction failed: {e}")

    return ExtractedFields(**extracted)



@router.post("/documents/{doc_id}/confirm")
async def confirm_extraction(
    doc_id: UUID,
    user: User = Depends(require_role("clerk")),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Document not found")
    if not doc.extracted_data:
        raise HTTPException(400, "No extracted data available to confirm")

    # Write confirmed non-null fields into the parent case
    case_result = await db.execute(select(Case).where(Case.id == doc.case_id))
    case = case_result.scalar_one_or_none()
    if case:
        data = doc.extracted_data
        for field in ("owner_name", "property_id", "zone", "income_bracket"):
            if data.get(field):
                setattr(case, field, data[field])

    doc.confirmed = True
    await db.commit()
    return {"ok": True, "confirmed": True}
