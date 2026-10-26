"""
SQLAlchemy ORM models for the CBT (Computer Based Test) module.
Handles Bank Soal (Akademik & Psikologi), Questions, Options, Exam Schedules,
Applicant Attempts, and Answers.
"""

from datetime import date, datetime
from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class ExamBank(Base):
    """
    Bank Soal per Periode & Kategori (akademik | psikologi).
    Tiap periode memiliki bank soal aktif yang digunakan oleh gelombang-gelombang di bawahnya.
    """
    __tablename__ = "ppdb_exam_banks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    period_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("ppdb_periods.id", ondelete="CASCADE"), index=True, nullable=False
    )
    category: Mapped[str] = mapped_column(String(20), index=True, nullable=False)  # "akademik" | "psikologi"
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_points: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    questions = relationship(
        "ExamQuestion",
        back_populates="bank",
        cascade="all, delete-orphan",
        order_by="ExamQuestion.question_number",
    )


class ExamQuestion(Base):
    """
    Soal Pilihan Ganda (Single Choice MCQ).
    Setiap soal memiliki nomor urut, teks pertanyaan, dan poin.
    """
    __tablename__ = "ppdb_exam_questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    bank_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ppdb_exam_banks.id", ondelete="CASCADE"), index=True, nullable=False
    )
    question_number: Mapped[int] = mapped_column(Integer, nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    points: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    bank = relationship("ExamBank", back_populates="questions")
    options = relationship(
        "ExamOption",
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="ExamOption.option_key",
    )


class ExamOption(Base):
    """
    Pilihan Jawaban (A, B, C, D, E).
    Menyimpan teks pilihan dan flag is_correct (kunci jawaban).
    """
    __tablename__ = "ppdb_exam_options"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    question_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ppdb_exam_questions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    option_key: Mapped[str] = mapped_column(String(5), nullable=False)  # "A", "B", "C", "D", "E"
    option_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    question = relationship("ExamQuestion", back_populates="options")


class ExamSchedule(Base):
    """
    Jadwal Ujian Massal per Gelombang.
    Berlaku untuk seluruh pendaftar di gelombang tersebut yang sudah lolos verifikasi berkas.
    """
    __tablename__ = "ppdb_exam_schedules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    period_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("ppdb_periods.id", ondelete="CASCADE"), index=True, nullable=False
    )
    wave_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("ppdb_waves.id", ondelete="CASCADE"), index=True, nullable=False
    )
    bank_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ppdb_exam_banks.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    category: Mapped[str] = mapped_column(String(20), index=True, nullable=False)  # "akademik" | "psikologi"
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    batch_name: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    session_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[str] = mapped_column(String(10), nullable=False)  # "08:00"
    end_time: Mapped[str] = mapped_column(String(10), nullable=False)  # "10:00"
    officer_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    mode: Mapped[str] = mapped_column(String(20), default="offline", nullable=False)  # "offline" | "online"
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Gedung / Ruangan / Sharelok URL
    meeting_url: Mapped[str | None] = mapped_column(String(500), nullable=True)  # Zoom / Google Meet
    access_token: Mapped[str] = mapped_column(String(20), nullable=False)  # Session PIN e.g. "AKAD-8921"
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="scheduled", nullable=False
    )  # "scheduled" | "ongoing" | "completed" | "cancelled"
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    bank = relationship("ExamBank")
    attempts = relationship("ExamAttempt", back_populates="schedule", cascade="all, delete-orphan")


class ExamAttempt(Base):
    """
    Sesi Pengerjaan Pendaftar pada Jadwal Ujian.
    Mencatat status pengerjaan, sisa waktu, deteksi kecurangan, dan skor akhir.
    """
    __tablename__ = "ppdb_exam_attempts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    schedule_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ppdb_exam_schedules.id", ondelete="CASCADE"), index=True, nullable=False
    )
    applicant_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("ppdb_applicants.id", ondelete="CASCADE"), index=True, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), default="not_started", nullable=False
    )  # "not_started" | "in_progress" | "locked" | "completed"
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    remaining_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    violations_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_violation_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    answers_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    schedule = relationship("ExamSchedule", back_populates="attempts")
    answers = relationship("ExamAnswer", back_populates="attempt", cascade="all, delete-orphan")


class ExamAnswer(Base):
    """
    Rekaman Jawaban Peserta per Soal.
    Autosave dilakukan setiap kali peserta memilih opsi jawaban.
    """
    __tablename__ = "ppdb_exam_answers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    attempt_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ppdb_exam_attempts.id", ondelete="CASCADE"), index=True, nullable=False
    )
    question_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ppdb_exam_questions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    selected_option_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("ppdb_exam_options.id", ondelete="SET NULL"), nullable=True
    )
    option_key: Mapped[str | None] = mapped_column(String(5), nullable=True)  # "A", "B", "C", "D", "E"
    is_correct: Mapped[bool | None] = mapped_column(Boolean, default=False, nullable=True)
    score_awarded: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    answered_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    attempt = relationship("ExamAttempt", back_populates="answers")
