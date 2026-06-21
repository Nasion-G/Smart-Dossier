from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_session
from models import Case, PhaseLog, User
from schemas import (
    CaseCreate, CaseRead, CaseUpdate,
    PhaseAdvance, DashboardStats, PhaseLogRead,
    AISummaryResponse, AILetterResponse, ExtractedFields,
)
from auth import get_current_user, require_role
from services.phase_service import enrich, advance_phase as _advance, BLOCK_THRESHOLDS, days_in_phase

router = APIRouter()


def _generate_code(sequence: int) -> str:
    year = datetime.now(timezone.utc).year
    return f"EKB-{year}-{sequence:04d}"


async def _get_case_or_404(case_id: UUID, db: AsyncSession) -> Case:
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(404, "Case not found")
    return case

def _assert_access(case: Case, user: User) -> None:
    """Citizens get a 404 (not 403) to avoid leaking whether a case exists."""
    if user.role == "citizen" and case.citizen_id != user.id:
        raise HTTPException(404, "Case not found")


@router.get("/", response_model=list[CaseRead])
async def list_cases(
    phase: Optional[int] = Query(None, ge=1, le=7, description="Filter by phase"),
    status: Optional[str] = Query(None, description="Filter by status (active/completed)"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    q = select(Case)
    if user.role == "citizen":
        q = q.where(Case.citizen_id == user.id)
    else:
        if phase:
            q = q.where(Case.current_phase == phase)
        if status:
            q = q.where(Case.status == status)
    q = q.order_by(Case.phase_entered_at.asc())

    result = await db.execute(q)
    return [CaseRead(**enrich(c)) for c in result.scalars().all()]



@router.get("/mine", response_model=list[CaseRead])
async def my_cases(
    user: User = Depends(require_role("citizen")),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Case).where(Case.citizen_id == user.id).order_by(Case.created_at)
    )
    return [CaseRead(**enrich(c)) for c in result.scalars().all()]



@router.get("/stats", response_model=DashboardStats)
async def dashboard_stats(
    _: User = Depends(require_role("clerk")),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(Case))
    all_cases = result.scalars().all()

    active    = [c for c in all_cases if c.status == "active"]
    completed = [c for c in all_cases if c.status == "completed"]

    high_latency = sum(
        1 for c in active
        if days_in_phase(c) >= BLOCK_THRESHOLDS.get(c.current_phase, 14)
    )

    avg_cycle = (
        round(sum((c.phase_entered_at - c.created_at).days for c in completed) / len(completed), 1)
        if completed else 0.0
    )

    completion_rate = (
        round(len(completed) / len(all_cases) * 100, 1) if all_cases else 0.0
    )

    cases_by_phase: dict[int, int] = {i: 0 for i in range(1, 8)}
    for c in all_cases:
        cases_by_phase[c.current_phase] = cases_by_phase.get(c.current_phase, 0) + 1

    return DashboardStats(
        total_active=len(active),
        avg_cycle_days=avg_cycle,
        high_latency_count=high_latency,
        completion_rate=completion_rate,
        cases_by_phase=cases_by_phase,
    )



@router.get("/{case_id}", response_model=CaseRead)
async def get_case(
    case_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    case = await _get_case_or_404(case_id, db)
    _assert_access(case, user)
    return CaseRead(**enrich(case))



@router.post("/", response_model=CaseRead, status_code=201)
async def create_case(
    body: CaseCreate,
    user: User = Depends(require_role("clerk")),
    db: AsyncSession = Depends(get_session),
):
    count_result = await db.execute(select(func.count()).select_from(Case))
    seq = count_result.scalar_one() + 1

    case = Case(
        code=_generate_code(seq),
        title=body.title,
        owner_name=body.owner_name,
        property_id=body.property_id,
        zone=body.zone,
        income_bracket=body.income_bracket,
        family_size=body.family_size,
        citizen_id=body.citizen_id,
        assigned_to=user.id,
    )
    db.add(case)
    await db.flush()

    starting_phase = body.starting_phase if body.starting_phase and 1 <= body.starting_phase <= 7 else 1
    if starting_phase != 1:
        case.current_phase = starting_phase
        case.phase_entered_at = datetime.now(timezone.utc)
    db.add(PhaseLog(case_id=case.id, phase=starting_phase, changed_by=user.id))
    await db.commit()
    await db.refresh(case)
    return CaseRead(**enrich(case))



@router.patch("/{case_id}", response_model=CaseRead)
async def update_case(
    case_id: UUID,
    body: CaseUpdate,
    user: User = Depends(require_role("clerk")),
    db: AsyncSession = Depends(get_session),
):
    case = await _get_case_or_404(case_id, db)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(case, field, value)
    await db.commit()
    await db.refresh(case)
    return CaseRead(**enrich(case))



@router.patch("/{case_id}/phase", response_model=CaseRead)
async def advance_phase(
    case_id: UUID,
    body: PhaseAdvance,
    user: User = Depends(require_role("clerk")),
    db: AsyncSession = Depends(get_session),
):
    case = await _get_case_or_404(case_id, db)
    case = await _advance(case, body.new_phase, body.notes, user, db)
    return CaseRead(**enrich(case))



@router.get("/{case_id}/history", response_model=list[PhaseLogRead])
async def phase_history(
    case_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    case = await _get_case_or_404(case_id, db)
    _assert_access(case, user)
    result = await db.execute(
        select(PhaseLog)
        .where(PhaseLog.case_id == case_id)
        .order_by(PhaseLog.entered_at)
    )
    return result.scalars().all()



@router.post("/{case_id}/ai-summary", response_model=AISummaryResponse)
async def ai_summary(
    case_id: UUID,
    user: User = Depends(require_role("clerk")),
    db: AsyncSession = Depends(get_session),
):
    case = await _get_case_or_404(case_id, db)
    from services.ai_service import summarize_case
    summary = await summarize_case(case)
    return AISummaryResponse(summary=summary)



@router.post("/{case_id}/generate-letter", response_model=AILetterResponse)
async def generate_letter(
    case_id: UUID,
    user: User = Depends(require_role("clerk")),
    db: AsyncSession = Depends(get_session),
):
    case = await _get_case_or_404(case_id, db)
    from services.ai_service import generate_letter
    letter = await generate_letter(case)
    return AILetterResponse(letter=letter)


@router.post("/{case_id}/phase-checklist")
async def recompute_phase_checklist(
    case_id: UUID,
    user: User = Depends(require_role("clerk")),
    db: AsyncSession = Depends(get_session),
):
    case = await _get_case_or_404(case_id, db)
    from models import Document
    from services.ai_service import check_phase_checklist
    docs_result = await db.execute(
        select(Document.docling_markdown).where(Document.case_id == case_id)
    )
    all_markdown = "\n\n---\n\n".join(m for (m,) in docs_result.all() if m)
    if not all_markdown:
        raise HTTPException(400, "No document text available for this case")
    case.phase_checklist = await check_phase_checklist(all_markdown)
    await db.commit()
    return case.phase_checklist


@router.post("/extract-fields", response_model=ExtractedFields)
async def extract_fields_from_pdf(
    file: UploadFile = File(...),
    _: User = Depends(require_role("clerk")),
):
    """Upload a PDF, extract structured fields via GLiNER2, return them.
    Does NOT create a case or persist the file — used for new-case autofill.
    """
    import tempfile
    import aiofiles
    from pathlib import Path
    from services.docling_service import convert_to_markdown, SUPPORTED_MIME_TYPES
    from services.extraction_service import extract_fields

    mime = file.content_type or "application/octet-stream"
    if mime not in SUPPORTED_MIME_TYPES:
        raise HTTPException(415, f"Unsupported format: {mime}. Accepted: PDF, DOCX, PNG, JPEG, TIFF, TXT.")

    content = await file.read()
    max_mb = 20
    if len(content) > max_mb * 1024 * 1024:
        raise HTTPException(413, f"File too large (max {max_mb} MB).")

    # Write to temp file for Docling
    suffix = Path(file.filename or "upload").suffix or ".pdf"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp_path = tmp.name
        tmp.write(content)

    try:
        markdown_text = await convert_to_markdown(tmp_path)
        if not markdown_text:
            raise HTTPException(422, "Could not extract text from document.")
        extracted = await extract_fields(markdown_text)
        return ExtractedFields(**extracted)
    finally:
        Path(tmp_path).unlink(missing_ok=True)
