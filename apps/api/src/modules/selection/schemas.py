from datetime import datetime
from typing import Literal

from pydantic import AnyHttpUrl, BaseModel, Field, field_validator, model_validator


class SessionFields(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    session_type: str = Field(
        default="tahfidz"
    )  # "tahfidz", "interview", "wawancara", "interview_santri", "interview_ortu"
    wave_id: str | None = None
    batch_name: str | None = Field(default=None, max_length=50)
    session_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    start_time: str = Field(pattern=r"^\d{2}:\d{2}$")
    end_time: str | None = Field(default=None)
    mode: Literal["online", "offline"]
    officer_name: str | None = Field(default=None, max_length=150)
    location: str | None = Field(None, max_length=200)
    meeting_url: AnyHttpUrl | None = None
    description: str | None = None
    quota: int = Field(default=0, ge=0)  # 0 means unlimited / all applicants in wave

    @model_validator(mode="after")
    def validate_delivery_details(self):
        if self.end_time and self.end_time != "Selesai":
            try:
                start = datetime.strptime(self.start_time, "%H:%M").time()
                end = datetime.strptime(self.end_time, "%H:%M").time()
                if end <= start:
                    raise ValueError("Jam selesai harus setelah jam mulai")
            except ValueError as e:
                if "Jam selesai harus setelah jam mulai" in str(e):
                    raise
                # Jika string non-HH:MM (misal "Selesai"), lewati validasi jam
                pass
        if self.mode == "online" and not self.meeting_url:
            raise ValueError("Tautan Zoom wajib diisi untuk sesi online")
        if self.mode == "offline" and not (self.location and self.location.strip()):
            raise ValueError("Lokasi wajib diisi untuk sesi offline")
        return self

    @field_validator("name")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Wajib diisi")
        return value

    @field_validator("officer_name")
    @classmethod
    def trim_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class SessionCreate(SessionFields):
    pass


class SessionUpdate(SessionFields):
    pass


class RescheduleApplicantSession(BaseModel):
    target_session_id: str
    reason: str | None = None


class BulkMoveApplicantsSession(BaseModel):
    applicant_ids: list[str] = Field(min_length=1)
    target_session_id: str = Field(min_length=1)
    # Wajib saat target berupa jadwal CBT (ExamSchedule)
    current_session_id: str | None = None
    reason: str | None = None


class BroadcastSession(BaseModel):
    message: str


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class CriteriaCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(None, max_length=1000)
    weight: float = Field(gt=0, le=100)


class CriteriaUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(None, max_length=1000)
    weight: float = Field(gt=0, le=100)


class ScoreInputItem(BaseModel):
    criteria_id: str
    score: float


class ApplicantScoreSave(BaseModel):
    applicant_id: str
    scores: list[ScoreInputItem]
    notes: str | None = None  # saved to selection_results


class BulkApplicantScoreSave(BaseModel):
    items: list[ApplicantScoreSave]


class ApplicantStatusUpdate(BaseModel):
    # Kategori hasil: passed=Diterima, conditional=Diterima Bersyarat,
    # waitlist=Cadangan, failed=Tidak Diterima, selection=Dalam Proses.
    status: Literal["passed", "failed", "conditional", "waitlist", "selection"]
    reason: str | None = None


class ApplicantResultNotesUpdate(BaseModel):
    """Catatan hasil opsional per komponen seleksi."""

    notes_akademik: str | None = Field(default=None, max_length=2000)
    notes_psikologi: str | None = Field(default=None, max_length=2000)
    notes_tahfidz: str | None = Field(default=None, max_length=2000)
    notes_wawancara: str | None = Field(default=None, max_length=2000)
