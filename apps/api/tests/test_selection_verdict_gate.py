"""Gerbang keputusan hasil pendaftaran seleksi.

Keputusan kategori hasil (Diterima/Bersyarat/Cadangan/Tidak Diterima) hanya
boleh ditetapkan (atau diubah) setelah seluruh nilai wajib masuk — rubrik
Tahfidz, Wawancara, dan ujian CBT Akademik & Psikologi — serta catatan
evaluator wajib diisi.
"""

import uuid
from datetime import date, datetime

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models.cbt import ExamAttempt, ExamBank, ExamSchedule
from src.models.ppdb import PPDBApplicant, PPDBPeriod, PPDBWave
from src.models.selection import (
    SelectionCategory,
    SelectionCriteria,
    SelectionScore,
)
from src.modules.selection.schemas import ApplicantStatusUpdate
from src.repositories.selection_repository import SelectionRepository
from src.services.selection_service import SelectionService, selection_score_gaps


@pytest.fixture
def db():
    generator = get_db()
    session = next(generator)
    try:
        yield session
    finally:
        try:
            next(generator)
        except StopIteration:
            pass


@pytest.fixture
def active_wave(db: Session):
    db.query(PPDBWave).update({"status": "inactive"})
    db.query(PPDBPeriod).update({"status": "inactive"})
    db.commit()

    now = datetime.now()
    period_id = str(uuid.uuid4())
    db.add(
        PPDBPeriod(
            id=period_id,
            name="Periode Verdict Gate",
            academic_year="2026/2027",
            status="active",
            created_at=now,
            updated_at=now,
        )
    )
    wave = PPDBWave(
        id=str(uuid.uuid4()),
        period_id=period_id,
        wave_number=90,
        name="Gelombang Verdict Gate",
        status="active",
        created_at=now,
        updated_at=now,
    )
    db.add(wave)
    db.commit()
    return wave


def _make_applicant(db: Session, wave_id: str) -> PPDBApplicant:
    now = datetime.now()
    applicant = PPDBApplicant(
        id=str(uuid.uuid4()),
        user_id=str(uuid.uuid4()),
        wave_id=wave_id,
        full_name="Calon Santri Verdict",
        email=f"verdict-{uuid.uuid4().hex[:8]}@example.com",
        phone="081234567890",
        status="selection",
        created_at=now,
        updated_at=now,
    )
    db.add(applicant)
    db.commit()
    return applicant


def _make_rubric(
    db: Session,
    wave_id: str,
    category_name: str,
    criteria_names: list[str],
    applicant_id: str | None = None,
    scores: dict[str, float] | None = None,
) -> SelectionCategory:
    """Buat kategori + kriteria, dan opsional skor untuk sebagian kriteria."""
    now = datetime.now()
    category = SelectionCategory(
        id=str(uuid.uuid4()),
        wave_id=wave_id,
        name=category_name,
        created_at=now,
        updated_at=now,
    )
    db.add(category)
    db.flush()

    scores = scores or {}
    for criteria_name in criteria_names:
        criteria = SelectionCriteria(
            id=str(uuid.uuid4()),
            category_id=category.id,
            name=criteria_name,
            weight=round(100 / len(criteria_names), 2),
            created_at=now,
            updated_at=now,
        )
        db.add(criteria)
        db.flush()
        if applicant_id and criteria_name in scores:
            db.add(
                SelectionScore(
                    id=str(uuid.uuid4()),
                    applicant_id=applicant_id,
                    criteria_id=criteria.id,
                    score=scores[criteria_name],
                    created_at=now,
                    updated_at=now,
                )
            )
    db.commit()
    return category


def _make_cbt_appointments_completed(
    db: Session, applicant_id: str, wave_id: str
) -> None:
    """Buat bank soal + jadwal CBT akademik & psikologi dengan attempt selesai."""
    now = datetime.now()
    categories = ("akademik", "psikologi")
    for idx, category in enumerate(categories):
        bank = ExamBank(
            id=str(uuid.uuid4()),
            period_id=_cbt_period_id(db, wave_id),
            category=category,
            title=f"Bank {category.title()} Terpadu",
            duration_minutes=60,
            total_questions=5,
            total_points=100.0,
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        db.add(bank)
        db.flush()

        schedule = ExamSchedule(
            id=str(uuid.uuid4()),
            period_id=bank.period_id,
            wave_id=wave_id,
            bank_id=bank.id,
            category=category,
            name=f"Ujian {category.title()}",
            session_date=date(2026, 10, 20 + idx),
            start_time="08:00",
            end_time="10:00",
            mode="offline",
            access_token=f"{category[:4].upper()}-000{idx + 1}",
            status="completed",
            created_at=now,
            updated_at=now,
        )
        db.add(schedule)
        db.flush()

        db.add(
            ExamAttempt(
                id=str(uuid.uuid4()),
                schedule_id=schedule.id,
                applicant_id=applicant_id,
                status="completed",
                started_at=now,
                finished_at=now,
                score=85.0,
                answers_count=5,
                created_at=now,
                updated_at=now,
            )
        )
    db.commit()


def _cbt_period_id(db: Session, wave_id: str) -> str:
    wave: PPDBWave | None = db.get(PPDBWave, wave_id)
    if wave is None:
        raise AssertionError(f"Gelombang {wave_id} tidak ditemukan")
    return str(wave.period_id)


def test_gaps_reports_missing_components(db: Session, active_wave):
    applicant = _make_applicant(db, active_wave.id)

    # Tahfidz: baru 1 dari 2 kriteria dinilai.
    _make_rubric(
        db,
        active_wave.id,
        "Tahfidz",
        ["Kelancaran", "Makhraj"],
        applicant_id=applicant.id,
        scores={"Kelancaran": 88.0},
    )
    # Wawancara: kriteria ada, belum ada skor sama sekali.

    gaps = selection_score_gaps(db, applicant)

    assert gaps == [
        "ujian Tahfidz",
        "ujian Wawancara",
        "ujian Akademik (CBT)",
        "ujian Psikologi (CBT)",
    ]


def test_gaps_empty_when_all_scores_complete(db: Session, active_wave):
    applicant = _make_applicant(db, active_wave.id)

    _make_rubric(
        db,
        active_wave.id,
        "Tahfidz",
        ["Kelancaran", "Makhraj"],
        applicant_id=applicant.id,
        scores={"Kelancaran": 88.0, "Makhraj": 90.0},
    )
    _make_rubric(
        db,
        active_wave.id,
        "Wawancara",
        ["Sikap", "Jawaban"],
        applicant_id=applicant.id,
        scores={"Sikap": 85.0, "Jawaban": 92.0},
    )
    _make_cbt_appointments_completed(db, applicant.id, active_wave.id)

    assert selection_score_gaps(db, applicant) == []


def test_gaps_reports_missing_cbt_attempt(db: Session, active_wave):
    applicant = _make_applicant(db, active_wave.id)

    _make_rubric(
        db,
        active_wave.id,
        "Tahfidz",
        ["Kelancaran"],
        applicant_id=applicant.id,
        scores={"Kelancaran": 88.0},
    )
    _make_rubric(
        db,
        active_wave.id,
        "Wawancara",
        ["Sikap"],
        applicant_id=applicant.id,
        scores={"Sikap": 85.0},
    )

    gaps = selection_score_gaps(db, applicant)

    assert gaps == ["ujian Akademik (CBT)", "ujian Psikologi (CBT)"]


def test_verdict_rejected_while_scores_incomplete(db: Session, active_wave):
    applicant = _make_applicant(db, active_wave.id)
    svc = SelectionService(SelectionRepository(db))

    with pytest.raises(HTTPException) as exc:
        svc.update_applicant_status(
            applicant.id, ApplicantStatusUpdate(status="passed")
        )

    assert exc.value.status_code == 400
    assert "nilai belum lengkap" in str(exc.value.detail).lower()

    db.expire_all()
    assert db.get(PPDBApplicant, applicant.id).status == "selection"


def test_reset_to_selection_allowed_while_scores_incomplete(db: Session, active_wave):
    applicant = _make_applicant(db, active_wave.id)
    svc = SelectionService(SelectionRepository(db))

    result = svc.update_applicant_status(
        applicant.id, ApplicantStatusUpdate(status="selection")
    )

    assert "message" in result
    db.expire_all()
    assert db.get(PPDBApplicant, applicant.id).status == "selection"


def test_verdict_rejected_without_evaluator_note(db: Session, active_wave):
    applicant = _make_applicant(db, active_wave.id)
    svc = SelectionService(SelectionRepository(db))

    _make_rubric(
        db,
        active_wave.id,
        "Tahfidz",
        ["Kelancaran"],
        applicant_id=applicant.id,
        scores={"Kelancaran": 88.0},
    )
    _make_rubric(
        db,
        active_wave.id,
        "Wawancara",
        ["Sikap"],
        applicant_id=applicant.id,
        scores={"Sikap": 85.0},
    )
    _make_cbt_appointments_completed(db, applicant.id, active_wave.id)

    with pytest.raises(HTTPException) as exc:
        svc.update_applicant_status(
            applicant.id, ApplicantStatusUpdate(status="passed", reason="   ")
        )

    assert exc.value.status_code == 400
    assert "catatan evaluator wajib" in str(exc.value.detail).lower()

    db.expire_all()
    assert db.get(PPDBApplicant, applicant.id).status == "selection"


@pytest.mark.parametrize(
    "status,result_status",
    [
        ("passed", "passed"),
        ("conditional", "conditional"),
        ("waitlist", "waitlist"),
        ("failed", "failed"),
    ],
)
def test_verdict_accepted_with_note_syncs_graduation_status(
    db: Session, active_wave, monkeypatch, status, result_status
):
    applicant = _make_applicant(db, active_wave.id)
    svc = SelectionService(SelectionRepository(db))

    _make_rubric(
        db,
        active_wave.id,
        "Tahfidz",
        ["Kelancaran"],
        applicant_id=applicant.id,
        scores={"Kelancaran": 88.0},
    )
    _make_rubric(
        db,
        active_wave.id,
        "Wawancara",
        ["Sikap"],
        applicant_id=applicant.id,
        scores={"Sikap": 85.0},
    )
    _make_cbt_appointments_completed(db, applicant.id, active_wave.id)

    monkeypatch.setattr(
        "src.services.selection_service.send_notifications", lambda *a, **k: None
    )
    svc.update_applicant_status(
        applicant.id,
        ApplicantStatusUpdate(status=status, reason="Catatan evaluator resmi"),
    )

    db.expire_all()
    assert db.get(PPDBApplicant, applicant.id).status == status
    result_row = svc.repo.get_selection_result_by_applicant(applicant.id)
    assert result_row is not None and result_row.graduation_status == result_status
    assert result_row.notes == "Catatan evaluator resmi"
