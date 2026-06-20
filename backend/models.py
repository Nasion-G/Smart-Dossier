import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from db import Base

def utcnow():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="citizen")  # clerk | citizen
    created_at = Column(DateTime(timezone=True), default=utcnow)

class Case(Base):
    __tablename__ = "cases"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False)
    owner_name = Column(String, nullable=True)
    property_id = Column(String, nullable=True)
    zone = Column(String, nullable=True)
    income_bracket = Column(String, nullable=True)
    current_phase = Column(Integer, nullable=False, default=1)
    status = Column(String, nullable=False, default="active")  # active | completed
    phase_entered_at = Column(DateTime(timezone=True), default=utcnow)
    phase_checklist = Column(JSON, nullable=True)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    citizen_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    documents = relationship("Document", back_populates="case", cascade="all, delete-orphan")
    phase_logs = relationship("PhaseLog", back_populates="case", cascade="all, delete-orphan")

class PhaseLog(Base):
    __tablename__ = "phase_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id"), nullable=False)
    phase = Column(Integer, nullable=False)
    entered_at = Column(DateTime(timezone=True), default=utcnow)
    exited_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    case = relationship("Case", back_populates="phase_logs")

class Document(Base):
    __tablename__ = "documents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    mime_type = Column(String, nullable=True)
    docling_markdown = Column(Text, nullable=True)
    extracted_data = Column(JSON, nullable=True)
    checklist = Column(JSON, nullable=True)
    confirmed = Column(Boolean, default=False)
    uploaded_at = Column(DateTime(timezone=True), default=utcnow)
    case = relationship("Case", back_populates="documents")
