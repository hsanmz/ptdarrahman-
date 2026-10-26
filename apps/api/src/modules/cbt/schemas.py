from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, Field


# ── Option & Question Schemas ─────────────────────────────────────────────

class OptionAdmin(BaseModel):
    id: str | None = None
    option_key: str
    option_text: str
    is_correct: bool = False


class OptionPublic(BaseModel):
    id: str
    option_key: str
    option_text: str


class QuestionAdmin(BaseModel):
    id: str | None = None
    question_number: int
    question_text: str
    points: float = 1.0
    options: list[OptionAdmin] = Field(default_factory=list)


class QuestionPublic(BaseModel):
    id: str
    question_number: int
    question_text: str
    points: float = 1.0
    options: list[OptionPublic] = Field(default_factory=list)


# ── Bank Soal Schemas ─────────────────────────────────────────────────────

class BankSoalCreate(BaseModel):
    category: Literal["akademik", "psikologi"]
    title: str = Field(..., min_length=3, max_length=255)
    description: str | None = None
    duration_minutes: int = Field(default=60, ge=5, le=300)
    period_id: str | None = None


class BankSoalResponse(BaseModel):
    id: str
    period_id: str
    category: Literal["akademik", "psikologi"]
    title: str
    description: str | None = None
    duration_minutes: int
    total_questions: int
    total_points: float
    is_active: bool
    created_at: datetime
    updated_at: datetime


class BankSoalDetailResponse(BankSoalResponse):
    questions: list[QuestionAdmin] = Field(default_factory=list)


# ── Schedule Schemas ──────────────────────────────────────────────────────

class ScheduleCreate(BaseModel):
    wave_id: str
    bank_id: str
    category: Literal["akademik", "psikologi"]
    name: str = Field(..., min_length=3, max_length=150)
    batch_name: str | None = None
    session_date: date
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")  # e.g. "08:00"
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")    # e.g. "10:00"
    officer_name: str | None = None
    mode: Literal["offline", "online"] = "offline"
    location: str | None = None
    meeting_url: str | None = None
    notes: str | None = None


class ScheduleUpdate(BaseModel):
    name: str | None = None
    batch_name: str | None = None
    session_date: date | None = None
    start_time: str | None = None
    end_time: str | None = None
    officer_name: str | None = None
    mode: Literal["offline", "online"] | None = None
    location: str | None = None
    meeting_url: str | None = None
    notes: str | None = None
    status: Literal["scheduled", "ongoing", "completed", "cancelled"] | None = None


class ScheduleResponse(BaseModel):
    id: str
    period_id: str
    wave_id: str
    wave_name: str | None = None
    bank_id: str
    bank_title: str | None = None
    duration_minutes: int | None = None
    category: Literal["akademik", "psikologi"]
    name: str
    batch_name: str | None = None
    session_date: date
    start_time: str
    end_time: str
    officer_name: str | None = None
    mode: Literal["offline", "online"]
    location: str | None = None
    meeting_url: str | None = None
    access_token: str
    notes: str | None = None
    status: Literal["scheduled", "ongoing", "completed", "cancelled"]
    total_eligible: int = 0
    total_attempts: int = 0
    created_at: datetime


# ── Monitoring Room Schemas ───────────────────────────────────────────────

class CandidateMonitoringItem(BaseModel):
    applicant_id: str
    registration_number: str | None = None
    full_name: str


class RescheduleCandidatePayload(BaseModel):
    target_schedule_id: str
    reason: str | None = None
    phone: str
    status: Literal["not_started", "in_progress", "locked", "completed"]
    started_at: datetime | None = None
    finished_at: datetime | None = None
    remaining_seconds: int | None = None
    violations_count: int = 0
    last_violation_at: datetime | None = None
    answers_count: int = 0
    total_questions: int = 0
    score: float | None = None


class ScheduleMonitoringResponse(BaseModel):
    schedule: ScheduleResponse
    candidates: list[CandidateMonitoringItem]
    stats: dict[str, int]


# ── Applicant CBT Engine Schemas ──────────────────────────────────────────

class VerifyExamAccessRequest(BaseModel):
    password: str
    access_token: str


class VerifyExamAccessResponse(BaseModel):
    valid: bool
    applicant_id: str
    applicant_name: str
    schedule_id: str
    category: str
    exam_title: str
    duration_minutes: int
    status: Literal["not_started", "in_progress", "locked", "completed"]
    remaining_seconds: int
    answers_count: int
    total_questions: int


class ExamSheetResponse(BaseModel):
    schedule_id: str
    exam_title: str
    category: str
    duration_minutes: int
    remaining_seconds: int
    status: str
    questions: list[QuestionPublic]
    saved_answers: dict[str, str]  # question_id -> option_key


class SaveAnswerRequest(BaseModel):
    question_id: str
    selected_option_id: str
    option_key: str


class SaveAnswerResponse(BaseModel):
    saved: bool
    question_id: str
    option_key: str
    answers_count: int


class ViolationReportRequest(BaseModel):
    reason: str | None = "tab_switch_or_blur"


class ViolationReportResponse(BaseModel):
    locked: bool
    status: str
    violations_count: int
    message: str


class AttemptStatusResponse(BaseModel):
    status: Literal["not_started", "in_progress", "locked", "completed"]
    remaining_seconds: int
    violations_count: int
    answers_count: int
    total_questions: int
    score: float | None = None
