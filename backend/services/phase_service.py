from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from models import Case, PhaseLog

BLOCK_THRESHOLDS = {3: 14, 6: 21}

def days_in_phase(case: Case) -> int:
    entered = case.phase_entered_at
    if entered.tzinfo is None:
        entered = entered.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - entered).days

def enrich(case: Case) -> dict:
    d = {c.name: getattr(case, c.name) for c in case.__table__.columns}
    days = days_in_phase(case)
    d["days_in_phase"] = days
    threshold = BLOCK_THRESHOLDS.get(case.current_phase, 14)
    d["is_blocked"] = days >= threshold and case.status == "active"
    return d

async def advance_phase(case: Case, new_phase: int, notes: str, user, db: AsyncSession) -> Case:
    from datetime import datetime, timezone
    if case.status == "completed":
        raise HTTPException(400, "Cannot advance a completed case")
    if new_phase <= case.current_phase or new_phase > 7:
        from fastapi import HTTPException
        raise HTTPException(400, "Invalid phase transition")
    # close current log
    from sqlalchemy import select, and_
    result = await db.execute(
        select(PhaseLog).where(
            and_(PhaseLog.case_id == case.id, PhaseLog.phase == case.current_phase, PhaseLog.exited_at.is_(None))
        )
    )
    log = result.scalar_one_or_none()
    if log:
        log.exited_at = datetime.now(timezone.utc)
    # advance
    case.current_phase = new_phase
    case.phase_entered_at = datetime.now(timezone.utc)
    if new_phase == 7:
        case.status = "completed"
    # new log
    db.add(PhaseLog(case_id=case.id, phase=new_phase, notes=notes, changed_by=user.id))
    await db.commit()
    await db.refresh(case)
    return case
