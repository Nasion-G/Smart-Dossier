from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime

class UserBase(BaseModel):
    email: str
    full_name: str
    role: str = "citizen"

class UserCreate(UserBase):
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class UserRead(UserBase):
    id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead

class CaseCreate(BaseModel):
    title: str
    owner_name: Optional[str] = None
    property_id: Optional[str] = None
    zone: Optional[str] = None
    income_bracket: Optional[str] = None
    family_size: Optional[int] = None
    citizen_id: Optional[UUID] = None
    starting_phase: Optional[int] = None
class CaseUpdate(BaseModel):
    title: Optional[str] = None
    owner_name: Optional[str] = None
    property_id: Optional[str] = None
    zone: Optional[str] = None
    income_bracket: Optional[str] = None
    family_size: Optional[int] = None
    status: Optional[str] = None
    assigned_to: Optional[UUID] = None

class CaseRead(BaseModel):
    id: UUID
    code: str
    title: str
    owner_name: Optional[str] = None
    property_id: Optional[str] = None
    zone: Optional[str] = None
    income_bracket: Optional[str] = None
    family_size: Optional[int] = None
    current_phase: int
    status: str
    phase_entered_at: datetime
    assigned_to: Optional[UUID] = None
    citizen_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    days_in_phase: int = 0
    is_blocked: bool = False
    phase_checklist: Optional[Dict[str, bool]] = None
    class Config:
        from_attributes = True

class PhaseAdvance(BaseModel):
    new_phase: int
    notes: Optional[str] = None

class PhaseLogRead(BaseModel):
    id: UUID
    case_id: UUID
    phase: int
    entered_at: datetime
    exited_at: Optional[datetime] = None
    notes: Optional[str] = None
    changed_by: Optional[UUID] = None
    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    total_active: int
    avg_cycle_days: float
    high_latency_count: int
    completion_rate: float
    cases_by_phase: Dict[int, int]

class DocumentRead(BaseModel):
    id: UUID
    case_id: UUID
    filename: str
    file_path: str
    mime_type: Optional[str] = None
    docling_markdown: Optional[str] = None
    extracted_data: Optional[Dict[str, Any]] = None
    checklist: Optional[Dict[str, bool]] = None
    confirmed: bool = False
    class Config:
        from_attributes = True

class ExtractedFields(BaseModel):
    owner_name: Optional[str] = None
    property_id: Optional[str] = None
    zone: Optional[str] = None
    income_bracket: Optional[str] = None
    family_size: Optional[int] = None
    phase: Optional[int] = None
class AISummaryResponse(BaseModel):
    summary: str

class AILetterResponse(BaseModel):
    letter: str
