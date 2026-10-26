"""
Business logic and orchestration for CBT (Computer Based Test) module.
Handles:
  - Bank Soal file import (.csv / .json) with strict MCQ validation
  - Schedule generation with unique access tokens
  - Monitoring room queries and candidate unfreezing
  - CBT engine: re-auth, start/resume, autosave, anti-cheat lock, and auto-grading
"""

import csv
import io
import json
import random
import string
from datetime import datetime
from typing import Any
from uuid import uuid4

import bcrypt
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.models.auth import User
from src.models.cbt import (
    ExamAnswer,
    ExamAttempt,
    ExamBank,
    ExamOption,
    ExamQuestion,
    ExamSchedule,
)
from src.models.ppdb import NotificationLog, PPDBApplicant, PPDBPeriod, PPDBWave
from src.models.selection import SelectionResult
from src.modules.cbt.schemas import (
    BankSoalCreate,
    CandidateMonitoringItem,
    ExamSheetResponse,
    QuestionAdmin,
    QuestionPublic,
    OptionAdmin,
    OptionPublic,
    SaveAnswerRequest,
    ScheduleCreate,
    ScheduleMonitoringResponse,
    ScheduleResponse,
    ScheduleUpdate,
)


class CBTService:

    # ── 1. Bank Soal & File Import ────────────────────────────────────────

    @staticmethod
    def generate_access_token(category: str) -> str:
        prefix = "AKAD" if category == "akademik" else "PSIK"
        random_digits = "".join(random.choices(string.digits, k=4))
        return f"{prefix}-{random_digits}"

    @staticmethod
    def generate_csv_template(category: str) -> str:
        """Returns standard CSV template with sample questions."""
        cat_name = "Tes Akademik" if category == "akademik" else "Tes Psikologi"
        output = io.StringIO()
        writer = csv.writer(output, delimiter=",")
        writer.writerow([
            "No",
            "Pertanyaan",
            "Pilihan A",
            "Pilihan B",
            "Pilihan C",
            "Pilihan D",
            "Pilihan E",
            "Kunci Jawaban",
            "Poin",
        ])
        writer.writerow([
            1,
            f"Contoh soal 1 untuk {cat_name}: Berapakah hasil dari 15 x 4?",
            "40",
            "50",
            "60",
            "70",
            "80",
            "C",
            10,
        ])
        writer.writerow([
            2,
            f"Contoh soal 2 untuk {cat_name}: Ibukota negara Indonesia adalah...",
            "Surabaya",
            "Nusantara",
            "Bandung",
            "Medan",
            "Semarang",
            "B",
            10,
        ])
        return output.getvalue()

    @staticmethod
    def parse_and_validate_file(file_content: bytes, filename: str) -> list[dict]:
        """
        Parses CSV or JSON file and enforces strict Multiple-Choice (MCQ) validation.
        Rejects non-MCQ, essay, empty options, or invalid answer keys.
        """
        lower_name = filename.lower()
        questions: list[dict] = []

        if lower_name.endswith(".json"):
            try:
                data = json.loads(file_content.decode("utf-8-sig"))
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Format file JSON tidak valid: {str(e)}",
                )
            if not isinstance(data, list):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File JSON harus berisi daftar (array) objek soal.",
                )

            for idx, item in enumerate(data, start=1):
                q_text = str(item.get("question_text") or item.get("soal") or "").strip()
                if not q_text:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Validasi Gagal pada Soal #{idx}: Teks pertanyaan tidak boleh kosong.",
                    )
                raw_opts = item.get("options") or item.get("pilihan") or []
                if not isinstance(raw_opts, (list, dict)):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Validasi Gagal pada Soal #{idx}: Format pilihan jawaban tidak valid (harus berupa pilihan ganda).",
                    )

                options_map = {}
                if isinstance(raw_opts, list):
                    for opt in raw_opts:
                        k = str(opt.get("key") or opt.get("option_key") or "").strip().upper()
                        v = str(opt.get("text") or opt.get("option_text") or "").strip()
                        if k and v:
                            options_map[k] = v
                elif isinstance(raw_opts, dict):
                    for k, v in raw_opts.items():
                        k_clean = str(k).strip().upper()
                        v_clean = str(v).strip()
                        if k_clean and v_clean:
                            options_map[k_clean] = v_clean

                for req_key in ["A", "B", "C", "D"]:
                    if not options_map.get(req_key):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Validasi Gagal pada Soal #{idx}: Pilihan {req_key} kosong. Soal wajib berupa Pilihan Ganda minimal A-D.",
                        )

                answer_key = str(item.get("answer_key") or item.get("kunci") or "").strip().upper()
                if answer_key not in ["A", "B", "C", "D", "E"] or answer_key not in options_map:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Validasi Gagal pada Soal #{idx}: Kunci jawaban '{answer_key}' tidak valid atau tidak cocok dengan opsi yang ada.",
                    )

                try:
                    pts = float(item.get("points") or item.get("poin") or 1.0)
                    if pts <= 0:
                        pts = 1.0
                except (ValueError, TypeError):
                    pts = 1.0

                questions.append({
                    "question_number": idx,
                    "question_text": q_text,
                    "points": pts,
                    "options": options_map,
                    "answer_key": answer_key,
                })

        else:
            # Assume CSV / Text Delimited
            try:
                decoded_text = file_content.decode("utf-8-sig")
            except UnicodeDecodeError:
                try:
                    decoded_text = file_content.decode("latin-1")
                except Exception as e:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Gagal membaca teks file: {str(e)}. Pastikan file berformat CSV / UTF-8.",
                    )

            lines = decoded_text.splitlines()
            if not lines:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File kosong. Harap unggah file soal yang berisi data.",
                )

            # Auto-detect delimiter
            sample = "\n".join(lines[:5])
            delimiter = ","
            if ";" in lines[0] and lines[0].count(";") > lines[0].count(","):
                delimiter = ";"
            elif "\t" in lines[0]:
                delimiter = "\t"

            reader = csv.reader(io.StringIO(decoded_text), delimiter=delimiter)
            rows = list(reader)
            if not rows:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tidak ada baris yang dapat dibaca pada file CSV.",
                )

            # Header inspection
            raw_headers = [h.strip().lower() for h in rows[0]]
            # Find column indices
            col_map = {}
            for col_idx, h in enumerate(raw_headers):
                if any(x in h for x in ["pertanyaan", "soal", "question"]):
                    col_map["question"] = col_idx
                elif "pilihan a" in h or "opsi a" in h or h == "a":
                    col_map["A"] = col_idx
                elif "pilihan b" in h or "opsi b" in h or h == "b":
                    col_map["B"] = col_idx
                elif "pilihan c" in h or "opsi c" in h or h == "c":
                    col_map["C"] = col_idx
                elif "pilihan d" in h or "opsi d" in h or h == "d":
                    col_map["D"] = col_idx
                elif "pilihan e" in h or "opsi e" in h or h == "e":
                    col_map["E"] = col_idx
                elif any(x in h for x in ["kunci", "jawaban", "answer"]):
                    col_map["key"] = col_idx
                elif any(x in h for x in ["poin", "point", "bobot", "score"]):
                    col_map["points"] = col_idx

            required_cols = ["question", "A", "B", "C", "D", "key"]
            missing = [c for c in required_cols if c not in col_map]
            if missing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Format kolom CSV tidak sesuai. Kolom wajib tidak ditemukan: {', '.join(missing)}. "
                        "Silakan gunakan Template Resmi (.csv) yang disediakan."
                    ),
                )

            data_rows = rows[1:]
            if not data_rows:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File CSV hanya berisi header tanpa baris soal.",
                )

            for line_no, row in enumerate(data_rows, start=2):
                if not any(cell.strip() for cell in row):
                    continue  # skip completely empty line

                # Validate Question
                q_idx = col_map["question"]
                q_text = row[q_idx].strip() if q_idx < len(row) else ""
                if not q_text:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Validasi Gagal pada Baris {line_no}: Teks pertanyaan kosong.",
                    )

                # Validate Options A, B, C, D
                options_map = {}
                for opt_key in ["A", "B", "C", "D", "E"]:
                    if opt_key in col_map:
                        idx = col_map[opt_key]
                        val = row[idx].strip() if idx < len(row) else ""
                        if val:
                            options_map[opt_key] = val

                for req_key in ["A", "B", "C", "D"]:
                    if not options_map.get(req_key):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=(
                                f"Validasi Gagal pada Baris {line_no}: Pilihan {req_key} kosong. "
                                "Seluruh soal wajib berupa Pilihan Ganda (Single Choice) minimal opsi A s/d D."
                            ),
                        )

                # Validate Answer Key
                k_idx = col_map["key"]
                answer_key = (row[k_idx].strip().upper() if k_idx < len(row) else "")
                if answer_key not in ["A", "B", "C", "D", "E"] or answer_key not in options_map:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Validasi Gagal pada Baris {line_no}: Kunci jawaban '{answer_key}' tidak valid "
                            "atau tidak cocok dengan pilihan jawaban yang tersedia. Kunci wajib salah satu dari A, B, C, D, atau E."
                        ),
                    )

                # Points
                pts = 1.0
                if "points" in col_map:
                    p_idx = col_map["points"]
                    raw_pts = row[p_idx].strip() if p_idx < len(row) else ""
                    try:
                        if raw_pts:
                            pts = float(raw_pts.replace(",", "."))
                            if pts <= 0:
                                pts = 1.0
                    except ValueError:
                        pts = 1.0

                questions.append({
                    "question_number": len(questions) + 1,
                    "question_text": q_text,
                    "points": pts,
                    "options": options_map,
                    "answer_key": answer_key,
                })

        if not questions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tidak ada soal valid yang ditemukan dalam file.",
            )

        return questions

    @staticmethod
    def get_active_period(db: Session) -> PPDBPeriod:
        period = db.execute(
            select(PPDBPeriod).where(PPDBPeriod.status == "active")
        ).scalar_one_or_none()
        if not period:
            # Fallback to latest period
            period = db.execute(
                select(PPDBPeriod).order_by(PPDBPeriod.created_at.desc())
            ).scalars().first()
        if not period:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Belum ada Periode PPDB yang aktif di sistem. Harap aktifkan periode terlebih dahulu.",
            )
        return period

    @classmethod
    def import_bank_soal(
        cls,
        db: Session,
        title: str,
        category: str,
        duration_minutes: int,
        description: str | None,
        file_content: bytes,
        filename: str,
        user_id: str | None = None,
    ) -> ExamBank:
        period = cls.get_active_period(db)
        parsed_questions = cls.parse_and_validate_file(file_content, filename)

        total_questions = len(parsed_questions)
        total_points = sum(q["points"] for q in parsed_questions)

        bank_id = str(uuid4())
        bank = ExamBank(
            id=bank_id,
            period_id=period.id,
            category=category,
            title=title.strip(),
            description=description.strip() if description else None,
            duration_minutes=duration_minutes,
            total_questions=total_questions,
            total_points=total_points,
            is_active=True,
            created_by=user_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(bank)

        for q_data in parsed_questions:
            q_id = str(uuid4())
            question = ExamQuestion(
                id=q_id,
                bank_id=bank_id,
                question_number=q_data["question_number"],
                question_text=q_data["question_text"],
                points=q_data["points"],
                created_at=datetime.utcnow(),
            )
            db.add(question)

            for opt_key, opt_text in q_data["options"].items():
                is_correct = (opt_key == q_data["answer_key"])
                option = ExamOption(
                    id=str(uuid4()),
                    question_id=q_id,
                    option_key=opt_key,
                    option_text=opt_text,
                    is_correct=is_correct,
                )
                db.add(option)

        db.commit()
        db.refresh(bank)
        return bank

    @classmethod
    def list_bank_soal(cls, db: Session, category: str) -> list[ExamBank]:
        period = cls.get_active_period(db)
        return db.execute(
            select(ExamBank)
            .where(ExamBank.period_id == period.id, ExamBank.category == category)
            .order_by(ExamBank.created_at.desc())
        ).scalars().all()

    @classmethod
    def get_bank_soal_detail(cls, db: Session, bank_id: str) -> ExamBank:
        bank = db.execute(
            select(ExamBank).where(ExamBank.id == bank_id)
        ).scalar_one_or_none()
        if not bank:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bank Soal tidak ditemukan.",
            )
        return bank

    @classmethod
    def delete_bank_soal(cls, db: Session, bank_id: str) -> None:
        bank = cls.get_bank_soal_detail(db, bank_id)
        # Check if used in any schedule
        used_schedules = db.execute(
            select(ExamSchedule.id).where(ExamSchedule.bank_id == bank_id)
        ).scalars().first()
        if used_schedules:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bank Soal ini tidak dapat dihapus karena sudah digunakan oleh Jadwal Ujian.",
            )
        db.delete(bank)
        db.commit()

    # ── 2. Jadwal Ujian & Monitoring ──────────────────────────────────────

    @classmethod
    def create_schedule(cls, db: Session, payload: ScheduleCreate) -> ExamSchedule:
        period = cls.get_active_period(db)

        # Verify wave exists and belongs to active period
        wave = db.execute(
            select(PPDBWave).where(PPDBWave.id == payload.wave_id)
        ).scalar_one_or_none()
        if not wave:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Gelombang tidak ditemukan.",
            )

        # Verify bank exists
        bank = db.execute(
            select(ExamBank).where(
                ExamBank.id == payload.bank_id,
                ExamBank.category == payload.category,
            )
        ).scalar_one_or_none()
        if not bank:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bank Soal yang dipilih tidak sesuai dengan kategori ujian.",
            )

        access_token = cls.generate_access_token(payload.category)

        schedule_id = str(uuid4())
        schedule = ExamSchedule(
            id=schedule_id,
            period_id=period.id,
            wave_id=payload.wave_id,
            bank_id=payload.bank_id,
            category=payload.category,
            name=payload.name.strip(),
            batch_name=payload.batch_name.strip() if payload.batch_name else None,
            session_date=payload.session_date,
            start_time=payload.start_time,
            end_time=payload.end_time,
            officer_name=payload.officer_name.strip() if payload.officer_name else None,
            mode=payload.mode,
            location=payload.location.strip() if payload.location else None,
            meeting_url=payload.meeting_url.strip() if payload.meeting_url else None,
            access_token=access_token,
            notes=payload.notes.strip() if payload.notes else None,
            status="scheduled",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(schedule)
        db.commit()
        db.refresh(schedule)

        # Otomatis cek dan jalankan stage progression / pengiriman jadwal bertahap dengan anti-ban delay
        try:
            from src.services.selection_stage_service import SelectionStageService

            SelectionStageService(db).check_and_advance_stages()
        except Exception:
            pass

        return schedule

    @classmethod
    def list_schedules(
        cls, db: Session, category: str, wave_id: str | None = None
    ) -> list[ScheduleResponse]:
        period = cls.get_active_period(db)
        query = (
            select(ExamSchedule, PPDBWave.name, ExamBank.title, ExamBank.duration_minutes)
            .join(PPDBWave, PPDBWave.id == ExamSchedule.wave_id)
            .join(ExamBank, ExamBank.id == ExamSchedule.bank_id)
            .where(ExamSchedule.period_id == period.id, ExamSchedule.category == category)
            .order_by(ExamSchedule.session_date.desc(), ExamSchedule.start_time.asc())
        )
        if wave_id:
            query = query.where(ExamSchedule.wave_id == wave_id)

        rows = db.execute(query).all()
        results = []
        for sched, wave_name, bank_title, duration in rows:
            # Count eligible applicants
            eligible_count = db.execute(
                select(func.count(PPDBApplicant.id)).where(
                    PPDBApplicant.wave_id == sched.wave_id,
                    PPDBApplicant.status.in_(["document_approved", "selection", "passed", "failed"]),
                    PPDBApplicant.deleted_at == None,
                )
            ).scalar() or 0

            # Count attempts
            attempt_count = db.execute(
                select(func.count(ExamAttempt.id)).where(ExamAttempt.schedule_id == sched.id)
            ).scalar() or 0

            results.append(
                ScheduleResponse(
                    id=sched.id,
                    period_id=sched.period_id,
                    wave_id=sched.wave_id,
                    wave_name=wave_name,
                    bank_id=sched.bank_id,
                    bank_title=bank_title,
                    duration_minutes=duration,
                    category=sched.category,
                    name=sched.name,
                    batch_name=sched.batch_name,
                    session_date=sched.session_date,
                    start_time=sched.start_time,
                    end_time=sched.end_time,
                    officer_name=sched.officer_name,
                    mode=sched.mode,
                    location=sched.location,
                    meeting_url=sched.meeting_url,
                    access_token=sched.access_token,
                    notes=sched.notes,
                    status=sched.status,
                    total_eligible=eligible_count,
                    total_attempts=attempt_count,
                    created_at=sched.created_at,
                )
            )
        return results

    @classmethod
    def get_schedule_detail(cls, db: Session, schedule_id: str) -> ScheduleResponse:
        row = db.execute(
            select(ExamSchedule, PPDBWave.name, ExamBank.title, ExamBank.duration_minutes)
            .join(PPDBWave, PPDBWave.id == ExamSchedule.wave_id)
            .join(ExamBank, ExamBank.id == ExamSchedule.bank_id)
            .where(ExamSchedule.id == schedule_id)
        ).first()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Jadwal Ujian tidak ditemukan.",
            )
        sched, wave_name, bank_title, duration = row

        eligible_count = db.execute(
            select(func.count(PPDBApplicant.id)).where(
                PPDBApplicant.wave_id == sched.wave_id,
                PPDBApplicant.status.in_(["document_approved", "selection", "passed", "failed"]),
                PPDBApplicant.deleted_at == None,
            )
        ).scalar() or 0

        attempt_count = db.execute(
            select(func.count(ExamAttempt.id)).where(ExamAttempt.schedule_id == sched.id)
        ).scalar() or 0

        return ScheduleResponse(
            id=sched.id,
            period_id=sched.period_id,
            wave_id=sched.wave_id,
            wave_name=wave_name,
            bank_id=sched.bank_id,
            bank_title=bank_title,
            duration_minutes=duration,
            category=sched.category,
            name=sched.name,
            batch_name=sched.batch_name,
            session_date=sched.session_date,
            start_time=sched.start_time,
            end_time=sched.end_time,
            officer_name=sched.officer_name,
            mode=sched.mode,
            location=sched.location,
            meeting_url=sched.meeting_url,
            access_token=sched.access_token,
            notes=sched.notes,
            status=sched.status,
            total_eligible=eligible_count,
            total_attempts=attempt_count,
            created_at=sched.created_at,
        )

    @classmethod
    def update_schedule(
        cls, db: Session, schedule_id: str, payload: ScheduleUpdate
    ) -> ExamSchedule:
        schedule = db.execute(
            select(ExamSchedule).where(ExamSchedule.id == schedule_id)
        ).scalar_one_or_none()
        if not schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Jadwal Ujian tidak ditemukan.",
            )

        tracked_fields = (
            "name",
            "session_date",
            "start_time",
            "end_time",
            "mode",
            "location",
            "meeting_url",
        )
        original_schedule = tuple(getattr(schedule, field) for field in tracked_fields)
        update_dict = payload.model_dump(exclude_unset=True)
        for k, v in update_dict.items():
            if v is not None:
                setattr(schedule, k, v)
        schedule.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(schedule)

        updated_schedule = tuple(
            getattr(schedule, field) for field in tracked_fields
        )
        if original_schedule != updated_schedule:
            recipients_query = select(PPDBApplicant).where(
                PPDBApplicant.wave_id == schedule.wave_id,
                PPDBApplicant.status.in_(
                    ["document_approved", "selection", "passed", "failed"]
                ),
                PPDBApplicant.deleted_at.is_(None),
            )
            if schedule.batch_name:
                recipients_query = recipients_query.join(
                    SelectionResult,
                    SelectionResult.applicant_id == PPDBApplicant.id,
                ).where(
                    SelectionResult.batch_name == schedule.batch_name
                )
            recipients = db.execute(recipients_query).scalars().all()

            from src.core.config import settings
            from src.core.notif_service import send_notifications

            location_or_link = (
                schedule.meeting_url
                if schedule.mode == "online"
                else (schedule.location or "Laboratorium Komputer CBT")
            )
            for applicant in recipients:
                if not applicant.user_id:
                    continue
                try:
                    send_notifications(
                        [
                            (
                                "session_confirmed",
                                {
                                    "nama_ujian": f"{schedule.name} (Jadwal Diperbarui)",
                                    "tanggal": str(schedule.session_date),
                                    "jam_mulai": schedule.start_time,
                                    "jam_selesai": schedule.end_time,
                                    "lokasi_atau_link": location_or_link,
                                    "link_aplikasi": f"{settings.ppdb_frontend_url}/applicant/tes-seleksi",
                                },
                            )
                        ],
                        applicant.user_id,
                    )
                except Exception:
                    import logging

                    logging.getLogger("ptdarrahman.cbt").exception(
                        "Failed to notify applicant about updated exam schedule"
                    )
        return schedule

    @classmethod
    def delete_schedule(cls, db: Session, schedule_id: str) -> None:
        schedule = db.execute(
            select(ExamSchedule).where(ExamSchedule.id == schedule_id)
        ).scalar_one_or_none()
        if not schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Jadwal Ujian tidak ditemukan.",
            )
        db.delete(schedule)
        db.commit()

    @classmethod
    def get_monitoring_data(cls, db: Session, schedule_id: str) -> ScheduleMonitoringResponse:
        schedule_detail = cls.get_schedule_detail(db, schedule_id)
        bank = cls.get_bank_soal_detail(db, schedule_detail.bank_id)

        # Get all eligible applicants in wave
        applicants = db.execute(
            select(PPDBApplicant)
            .where(
                PPDBApplicant.wave_id == schedule_detail.wave_id,
                PPDBApplicant.status.in_(["document_approved", "selection", "passed", "failed"]),
                PPDBApplicant.deleted_at == None,
            )
            .order_by(PPDBApplicant.full_name.asc())
        ).scalars().all()

        # Get all attempts for this schedule
        attempts = db.execute(
            select(ExamAttempt).where(ExamAttempt.schedule_id == schedule_id)
        ).scalars().all()
        attempt_map = {att.applicant_id: att for att in attempts}

        candidate_items: list[CandidateMonitoringItem] = []
        stats = {
            "total": len(applicants),
            "not_started": 0,
            "in_progress": 0,
            "locked": 0,
            "completed": 0,
        }

        for app in applicants:
            att = attempt_map.get(app.id)
            if att:
                status_val = att.status
                started = att.started_at
                finished = att.finished_at
                rem = att.remaining_seconds
                viol = att.violations_count
                last_viol = att.last_violation_at
                ans_cnt = att.answers_count
                scr = att.score
            else:
                status_val = "not_started"
                started = None
                finished = None
                rem = bank.duration_minutes * 60
                viol = 0
                last_viol = None
                ans_cnt = 0
                scr = None

            stats[status_val] = stats.get(status_val, 0) + 1

            candidate_items.append(
                CandidateMonitoringItem(
                    applicant_id=app.id,
                    registration_number=app.registration_number,
                    full_name=app.full_name,
                    phone=app.phone,
                    status=status_val,
                    started_at=started,
                    finished_at=finished,
                    remaining_seconds=rem,
                    violations_count=viol,
                    last_violation_at=last_viol,
                    answers_count=ans_cnt,
                    total_questions=bank.total_questions,
                    score=scr,
                )
            )

        return ScheduleMonitoringResponse(
            schedule=schedule_detail,
            candidates=candidate_items,
            stats=stats,
        )

    @classmethod
    def unfreeze_candidate(
        cls, db: Session, schedule_id: str, applicant_id: str
    ) -> ExamAttempt:
        attempt = db.execute(
            select(ExamAttempt).where(
                ExamAttempt.schedule_id == schedule_id,
                ExamAttempt.applicant_id == applicant_id,
            )
        ).scalar_one_or_none()

        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sesi pengerjaan peserta tidak ditemukan.",
            )

        if attempt.status != "locked":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Peserta tidak dalam status Terkunci (Status saat ini: {attempt.status}).",
            )

        attempt.status = "in_progress"
        attempt.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(attempt)
        return attempt

    @classmethod
    def move_candidate_schedule(
        cls,
        db: Session,
        current_schedule_id: str,
        applicant_id: str,
        target_schedule_id: str,
        reason: str | None = None,
    ) -> dict[str, Any]:
        from src.core.config import settings
        from src.core.notif_service import send_notifications
        from src.models.ppdb import PPDBApplicant
        from src.models.selection import SelectionResult

        current_sched = db.execute(
            select(ExamSchedule).where(ExamSchedule.id == current_schedule_id)
        ).scalar_one_or_none()
        if not current_sched:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Jadwal saat ini tidak ditemukan.",
            )

        target_sched = db.execute(
            select(ExamSchedule).where(ExamSchedule.id == target_schedule_id)
        ).scalar_one_or_none()
        if not target_sched:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Jadwal target tidak ditemukan.",
            )

        applicant = db.execute(
            select(PPDBApplicant).where(PPDBApplicant.id == applicant_id)
        ).scalar_one_or_none()
        if not applicant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pendaftar tidak ditemukan.",
            )

        # Check existing attempt
        attempt = db.execute(
            select(ExamAttempt).where(
                ExamAttempt.schedule_id == current_schedule_id,
                ExamAttempt.applicant_id == applicant_id,
            )
        ).scalar_one_or_none()

        if attempt:
            if attempt.status == "completed":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Peserta sudah menyelesaikan ujian pada sesi ini, tidak dapat dipindahkan.",
                )
            attempt.schedule_id = target_schedule_id
            attempt.status = "not_started"
            attempt.started_at = None
            attempt.finished_at = None
            attempt.updated_at = datetime.utcnow()

        # Update note in selection_results
        s_res = db.execute(
            select(SelectionResult).where(SelectionResult.applicant_id == applicant_id)
        ).scalar_one_or_none()
        if s_res and reason:
            existing = s_res.notes or ""
            move_note = f"[Pindah Sesi CBT ke {target_sched.name}]: {reason}"
            s_res.notes = f"{existing}\n{move_note}".strip()
            if target_sched.batch_name:
                s_res.batch_name = target_sched.batch_name
            s_res.updated_at = datetime.utcnow()

        db.commit()

        # Kirim notifikasi WhatsApp ke pendaftar
        try:
            loc = (
                target_sched.meeting_url
                if target_sched.mode == "online"
                else (target_sched.location or "Laboratorium Komputer CBT")
            )
            send_notifications(
                [
                    (
                        "session_confirmed",
                        {
                            "nama_ujian": f"{target_sched.name} (Jadwal Baru)",
                            "tanggal": str(target_sched.session_date),
                            "jam_mulai": target_sched.start_time,
                            "jam_selesai": target_sched.end_time,
                            "lokasi_atau_link": loc,
                            "link_aplikasi": f"{settings.ppdb_frontend_url}/dashboard",
                        },
                    )
                ],
                applicant.user_id,
            )
        except Exception:
            pass

        return {
            "message": f"Berhasil memindahkan peserta {applicant.full_name} ke {target_sched.name}",
            "target_schedule_id": target_sched.id,
            "target_schedule_name": target_sched.name,
        }

    # ── 3. CBT Engine (Applicant Side) ────────────────────────────────────

    @staticmethod
    def _extract_user_id(user: User | dict) -> str:
        if isinstance(user, dict):
            return str(user.get("id") or "")
        return str(getattr(user, "id", "") or "")

    @classmethod
    def verify_applicant_access(
        cls, db: Session, user: User | dict, schedule_id: str, password: str, access_token: str
    ) -> dict:
        user_id = cls._extract_user_id(user)
        # 1. Fetch User ORM to reliably check password_hash
        user_obj = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
        if not user_obj or not user_obj.password_hash:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Akun pengguna tidak valid.",
            )

        if not bcrypt.checkpw(password.encode("utf-8"), user_obj.password_hash.encode("utf-8")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Password akun PPDB salah. Harap masukkan password login akun Anda.",
            )

        # 2. Verify Schedule & Access Token
        schedule_detail = cls.get_schedule_detail(db, schedule_id)
        if schedule_detail.access_token.strip().upper() != access_token.strip().upper():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token/PIN Sesi Ujian tidak valid. Silakan tanyakan PIN yang benar ke Pengawas Ujian.",
            )

        # 3. Verify Applicant belongs to Wave and is approved
        applicant = db.execute(
            select(PPDBApplicant).where(
                PPDBApplicant.user_id == user_id,
                PPDBApplicant.deleted_at == None,
            )
        ).scalar_one_or_none()
        if not applicant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Data pendaftar tidak ditemukan untuk akun ini.",
            )

        if applicant.wave_id != schedule_detail.wave_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda tidak terdaftar di gelombang pelaksanaan ujian ini.",
            )

        if applicant.status not in ["document_approved", "selection", "passed", "failed"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda belum menyelesaikan tahap Verifikasi Berkas. Hanya pendaftar yang berkasnya sudah disetujui yang dapat mengikuti ujian.",
            )

        # Check existing attempt
        attempt = db.execute(
            select(ExamAttempt).where(
                ExamAttempt.schedule_id == schedule_id,
                ExamAttempt.applicant_id == applicant.id,
            )
        ).scalar_one_or_none()

        bank = cls.get_bank_soal_detail(db, schedule_detail.bank_id)

        current_status = attempt.status if attempt else "not_started"
        remaining = attempt.remaining_seconds if (attempt and attempt.remaining_seconds is not None) else (bank.duration_minutes * 60)
        answers_count = attempt.answers_count if attempt else 0

        return {
            "valid": True,
            "applicant_id": applicant.id,
            "applicant_name": applicant.full_name,
            "schedule_id": schedule_id,
            "category": schedule_detail.category,
            "exam_title": schedule_detail.name,
            "duration_minutes": bank.duration_minutes,
            "status": current_status,
            "remaining_seconds": remaining,
            "answers_count": answers_count,
            "total_questions": bank.total_questions,
        }

    @classmethod
    def get_exam_sheet(cls, db: Session, user: User | dict, schedule_id: str) -> ExamSheetResponse:
        user_id = cls._extract_user_id(user)
        applicant = db.execute(
            select(PPDBApplicant).where(
                PPDBApplicant.user_id == user_id,
                PPDBApplicant.deleted_at == None,
            )
        ).scalar_one_or_none()
        if not applicant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Akses pendaftar tidak sah.",
            )

        schedule = db.execute(
            select(ExamSchedule).where(ExamSchedule.id == schedule_id)
        ).scalar_one_or_none()
        if not schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Jadwal ujian tidak ditemukan.",
            )

        bank = cls.get_bank_soal_detail(db, schedule.bank_id)

        # Ensure attempt exists
        attempt = db.execute(
            select(ExamAttempt).where(
                ExamAttempt.schedule_id == schedule_id,
                ExamAttempt.applicant_id == applicant.id,
            )
        ).scalar_one_or_none()

        if not attempt:
            # Create attempt
            now = datetime.utcnow()
            attempt = ExamAttempt(
                id=str(uuid4()),
                schedule_id=schedule_id,
                applicant_id=applicant.id,
                status="in_progress",
                started_at=now,
                remaining_seconds=bank.duration_minutes * 60,
                violations_count=0,
                answers_count=0,
                created_at=now,
                updated_at=now,
            )
            db.add(attempt)
            db.commit()
            db.refresh(attempt)
        else:
            if attempt.status == "locked":
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail="Ujian Anda sedang TERKUNCI karena terdeteksi meninggalkan layar ujian. Hubungi Pengawas untuk membuka kunci akun Anda.",
                )
            if attempt.status == "completed":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ujian ini sudah Anda selesaikan sebelumnya.",
                )
            if attempt.status == "not_started":
                attempt.status = "in_progress"
                attempt.started_at = datetime.utcnow()
                db.commit()
                db.refresh(attempt)

        # Load questions without is_correct
        questions_db = db.execute(
            select(ExamQuestion)
            .where(ExamQuestion.bank_id == bank.id)
            .order_by(ExamQuestion.question_number.asc())
        ).scalars().all()

        public_questions: list[QuestionPublic] = []
        for q in questions_db:
            opts_db = db.execute(
                select(ExamOption)
                .where(ExamOption.question_id == q.id)
                .order_by(ExamOption.option_key.asc())
            ).scalars().all()
            public_questions.append(
                QuestionPublic(
                    id=q.id,
                    question_number=q.question_number,
                    question_text=q.question_text,
                    points=q.points,
                    options=[
                        OptionPublic(
                            id=opt.id,
                            option_key=opt.option_key,
                            option_text=opt.option_text,
                        )
                        for opt in opts_db
                    ],
                )
            )

        # Load existing answers
        saved_answers_db = db.execute(
            select(ExamAnswer).where(ExamAnswer.attempt_id == attempt.id)
        ).scalars().all()
        saved_map = {ans.question_id: (ans.option_key or "") for ans in saved_answers_db}

        return ExamSheetResponse(
            schedule_id=schedule_id,
            exam_title=schedule.name,
            category=schedule.category,
            duration_minutes=bank.duration_minutes,
            remaining_seconds=attempt.remaining_seconds or (bank.duration_minutes * 60),
            status=attempt.status,
            questions=public_questions,
            saved_answers=saved_map,
        )

    @classmethod
    def save_answer(
        cls, db: Session, user: User | dict, schedule_id: str, payload: SaveAnswerRequest
    ) -> dict:
        user_id = cls._extract_user_id(user)
        applicant = db.execute(
            select(PPDBApplicant).where(
                PPDBApplicant.user_id == user_id,
                PPDBApplicant.deleted_at == None,
            )
        ).scalar_one_or_none()
        if not applicant:
            raise HTTPException(status_code=403, detail="Pendaftar tidak sah.")

        attempt = db.execute(
            select(ExamAttempt).where(
                ExamAttempt.schedule_id == schedule_id,
                ExamAttempt.applicant_id == applicant.id,
            )
        ).scalar_one_or_none()

        if not attempt:
            raise HTTPException(status_code=404, detail="Sesi ujian belum dimulai.")
        if attempt.status == "locked":
            raise HTTPException(
                status_code=423,
                detail="Ujian terkunci. Anda tidak dapat mengirim jawaban sampai pengawas membuka kunci Anda.",
            )
        if attempt.status == "completed":
            raise HTTPException(status_code=400, detail="Ujian sudah selesai.")

        # Verify Option & Question
        option = db.execute(
            select(ExamOption).where(
                ExamOption.id == payload.selected_option_id,
                ExamOption.question_id == payload.question_id,
            )
        ).scalar_one_or_none()
        if not option:
            raise HTTPException(status_code=400, detail="Pilihan jawaban tidak valid.")

        question = db.execute(
            select(ExamQuestion).where(ExamQuestion.id == payload.question_id)
        ).scalar_one_or_none()
        if not question:
            raise HTTPException(status_code=404, detail="Soal tidak ditemukan.")

        is_correct = option.is_correct
        score_awarded = question.points if is_correct else 0.0

        existing_answer = db.execute(
            select(ExamAnswer).where(
                ExamAnswer.attempt_id == attempt.id,
                ExamAnswer.question_id == payload.question_id,
            )
        ).scalar_one_or_none()

        if existing_answer:
            existing_answer.selected_option_id = option.id
            existing_answer.option_key = option.option_key
            existing_answer.is_correct = is_correct
            existing_answer.score_awarded = score_awarded
            existing_answer.answered_at = datetime.utcnow()
        else:
            new_answer = ExamAnswer(
                id=str(uuid4()),
                attempt_id=attempt.id,
                question_id=payload.question_id,
                selected_option_id=option.id,
                option_key=option.option_key,
                is_correct=is_correct,
                score_awarded=score_awarded,
                answered_at=datetime.utcnow(),
            )
            db.add(new_answer)

        # Update answers_count on attempt
        total_answers = db.execute(
            select(func.count(ExamAnswer.id)).where(ExamAnswer.attempt_id == attempt.id)
        ).scalar() or 0
        if not existing_answer:
            total_answers += 1
        attempt.answers_count = total_answers
        attempt.updated_at = datetime.utcnow()

        db.commit()

        return {
            "saved": True,
            "question_id": payload.question_id,
            "option_key": option.option_key,
            "answers_count": total_answers,
        }

    @classmethod
    def record_violation(cls, db: Session, user: User | dict, schedule_id: str) -> dict:
        user_id = cls._extract_user_id(user)
        applicant = db.execute(
            select(PPDBApplicant).where(
                PPDBApplicant.user_id == user_id,
                PPDBApplicant.deleted_at == None,
            )
        ).scalar_one_or_none()
        if not applicant:
            raise HTTPException(status_code=403, detail="Pendaftar tidak sah.")

        attempt = db.execute(
            select(ExamAttempt).where(
                ExamAttempt.schedule_id == schedule_id,
                ExamAttempt.applicant_id == applicant.id,
            )
        ).scalar_one_or_none()

        if not attempt:
            raise HTTPException(status_code=404, detail="Sesi ujian tidak ditemukan.")
        if attempt.status == "completed":
            return {"locked": False, "status": "completed", "violations_count": attempt.violations_count, "message": "Ujian sudah selesai."}

        # Lock attempt and increment violations
        attempt.status = "locked"
        attempt.violations_count += 1
        attempt.last_violation_at = datetime.utcnow()
        attempt.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(attempt)

        return {
            "locked": True,
            "status": "locked",
            "violations_count": attempt.violations_count,
            "message": "Ujian Anda telah dikunci oleh sistem karena terdeteksi meninggalkan layar ujian lebih dari 5 detik. Hubungi pengawas untuk membuka kunci akun Anda.",
        }

    @classmethod
    def update_timer(cls, db: Session, user: User | dict, schedule_id: str, remaining_seconds: int) -> dict:
        user_id = cls._extract_user_id(user)
        applicant = db.execute(
            select(PPDBApplicant).where(PPDBApplicant.user_id == user_id)
        ).scalar_one_or_none()
        if not applicant:
            return {"status": "error"}

        attempt = db.execute(
            select(ExamAttempt).where(
                ExamAttempt.schedule_id == schedule_id,
                ExamAttempt.applicant_id == applicant.id,
            )
        ).scalar_one_or_none()

        if attempt and attempt.status == "in_progress":
            attempt.remaining_seconds = max(0, remaining_seconds)
            attempt.updated_at = datetime.utcnow()
            db.commit()

        return {"status": attempt.status if attempt else "not_started"}

    @classmethod
    def finish_exam(cls, db: Session, user: User | dict, schedule_id: str) -> dict:
        user_id = cls._extract_user_id(user)
        applicant = db.execute(
            select(PPDBApplicant).where(
                PPDBApplicant.user_id == user_id,
                PPDBApplicant.deleted_at == None,
            )
        ).scalar_one_or_none()
        if not applicant:
            raise HTTPException(status_code=403, detail="Pendaftar tidak sah.")

        schedule = db.execute(
            select(ExamSchedule).where(ExamSchedule.id == schedule_id)
        ).scalar_one_or_none()
        if not schedule:
            raise HTTPException(status_code=404, detail="Jadwal ujian tidak ditemukan.")

        bank = cls.get_bank_soal_detail(db, schedule.bank_id)

        attempt = db.execute(
            select(ExamAttempt).where(
                ExamAttempt.schedule_id == schedule_id,
                ExamAttempt.applicant_id == applicant.id,
            )
        ).scalar_one_or_none()

        if not attempt:
            raise HTTPException(status_code=404, detail="Sesi ujian tidak ditemukan.")

        was_completed = attempt.status == "completed"

        # Calculate score
        answers = db.execute(
            select(ExamAnswer).where(ExamAnswer.attempt_id == attempt.id)
        ).scalars().all()

        total_earned = sum(ans.score_awarded for ans in answers if ans.is_correct)
        max_points = bank.total_points if bank.total_points > 0 else 100.0

        final_percentage = round((total_earned / max_points) * 100, 2)
        if final_percentage > 100.0:
            final_percentage = 100.0

        now = datetime.utcnow()
        attempt.status = "completed"
        attempt.finished_at = now
        attempt.remaining_seconds = 0
        attempt.score = final_percentage
        attempt.updated_at = now

        # Record or sync score to SelectionResult
        sel_result = db.execute(
            select(SelectionResult).where(SelectionResult.applicant_id == applicant.id)
        ).scalar_one_or_none()

        note_entry = f"Nilai Tes {schedule.category.title()}: {final_percentage} (Selesai pada {now.strftime('%d-%m-%Y %H:%M')})"
        if sel_result:
            if schedule.category == "akademik":
                sel_result.score = final_percentage  # Primary CBT score
            existing_notes = sel_result.notes or ""
            sel_result.notes = f"{existing_notes}\n{note_entry}".strip()
            sel_result.updated_at = now
        else:
            new_sel = SelectionResult(
                id=str(uuid4()),
                applicant_id=applicant.id,
                score=final_percentage if schedule.category == "akademik" else None,
                notes=note_entry,
                created_at=now,
                updated_at=now,
            )
            db.add(new_sel)

        db.commit()
        db.refresh(attempt)

        if not was_completed:
            already_notified = db.execute(
                select(NotificationLog.id).where(
                    NotificationLog.recipient_user_id == applicant.user_id,
                    NotificationLog.event_key == "assessment_stage_completed",
                    NotificationLog.status.in_(("queued", "sent")),
                    NotificationLog.body_sent.like(f"%{schedule.name}%"),
                )
            ).first()
            if not already_notified:
                try:
                    from src.core.config import settings
                    from src.core.notif_service import send_notifications

                    send_notifications(
                        [
                            (
                                "assessment_stage_completed",
                                {
                                    "nama_tahap": f"{schedule.name} ({schedule.category.title()})",
                                    "link_aplikasi": f"{settings.ppdb_frontend_url}/applicant/tes-seleksi",
                                },
                            )
                        ],
                        applicant.user_id,
                    )
                except Exception:
                    import logging

                    logging.getLogger("ptdarrahman.cbt").exception(
                        "Failed to notify applicant about completed assessment"
                    )

        return {
            "status": "completed",
            "score": final_percentage,
            "answers_count": attempt.answers_count,
            "total_questions": bank.total_questions,
            "finished_at": now.isoformat(),
        }

    @classmethod
    def get_attempt_status(cls, db: Session, user: User | dict, schedule_id: str) -> dict:
        user_id = cls._extract_user_id(user)
        applicant = db.execute(
            select(PPDBApplicant).where(PPDBApplicant.user_id == user_id)
        ).scalar_one_or_none()
        if not applicant:
            raise HTTPException(status_code=403, detail="Pendaftar tidak sah.")

        schedule = db.execute(
            select(ExamSchedule).where(ExamSchedule.id == schedule_id)
        ).scalar_one_or_none()
        if not schedule:
            raise HTTPException(status_code=404, detail="Jadwal ujian tidak ditemukan.")

        bank = cls.get_bank_soal_detail(db, schedule.bank_id)

        attempt = db.execute(
            select(ExamAttempt).where(
                ExamAttempt.schedule_id == schedule_id,
                ExamAttempt.applicant_id == applicant.id,
            )
        ).scalar_one_or_none()

        if not attempt:
            return {
                "status": "not_started",
                "remaining_seconds": bank.duration_minutes * 60,
                "violations_count": 0,
                "answers_count": 0,
                "total_questions": bank.total_questions,
                "score": None,
            }

        return {
            "status": attempt.status,
            "remaining_seconds": attempt.remaining_seconds or 0,
            "violations_count": attempt.violations_count,
            "answers_count": attempt.answers_count,
            "total_questions": bank.total_questions,
            "score": attempt.score,
        }
