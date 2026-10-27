"""
FastAPI Router for CBT (Computer Based Test) module.
Handles:
  - Admin Bank Soal (Akademik & Psikologi) + Template Download
  - Admin Exam Schedules + Monitoring Room + Unfreeze Action
  - Applicant CBT Engine (Re-authentication, Sheet, Autosave, Violation, Submit)
"""

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.core.dependencies import (
    get_current_user,
    require_ppdb_admin,
    require_ppdb_read,
)
from src.models.auth import User
from src.models.cbt import ExamSchedule
from src.modules.cbt.schemas import (
    BankScheduleShareItem,
    BankSoalDetailResponse,
    BankSoalResponse,
    BankSoalUpdate,
    ExamSheetResponse,
    OptionAdmin,
    QuestionAdmin,
    QuestionUpsert,
    RescheduleCandidatePayload,
    SaveAnswerRequest,
    SaveAnswerResponse,
    ScheduleCreate,
    ScheduleMonitoringResponse,
    ScheduleResponse,
    ScheduleUpdate,
    VerifyExamAccessRequest,
    VerifyExamAccessResponse,
    ViolationReportRequest,
    ViolationReportResponse,
)
from src.modules.cbt.service import CBTService

router = APIRouter()


# ═══════════════════════════════════════════════════════════════════════════
# ADMIN: BANK SOAL
# ═══════════════════════════════════════════════════════════════════════════


@router.get("/banks/template/{category}", summary="Download Template CSV Soal")
def download_template(category: str):
    if category not in ["akademik", "psikologi"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kategori tidak valid (harus akademik atau psikologi).",
        )
    csv_data = CBTService.generate_csv_template(category)
    filename = f"Template_Bank_Soal_{category.title()}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/banks",
    response_model=list[BankSoalResponse],
    summary="List Bank Soal per Kategori (Periode Aktif)",
    dependencies=[Depends(require_ppdb_read)],
)
def list_bank_soal(
    category: str = Query(..., pattern=r"^(akademik|psikologi)$"),
    db: Session = Depends(get_db),
):
    return CBTService.list_bank_soal(db, category)


@router.get(
    "/banks/{bank_id}",
    response_model=BankSoalDetailResponse,
    summary="Detail Bank Soal dengan Soal & Kunci Jawaban",
    dependencies=[Depends(require_ppdb_read)],
)
def get_bank_soal_detail(bank_id: str, db: Session = Depends(get_db)):
    bank = CBTService.get_bank_soal_detail(db, bank_id)
    used_count = (
        db.execute(
            select(func.count(ExamSchedule.id)).where(ExamSchedule.bank_id == bank_id)
        ).scalar()
        or 0
    )
    schedules_rows = (
        db.execute(
            select(ExamSchedule)
            .where(ExamSchedule.bank_id == bank_id)
            .order_by(ExamSchedule.session_date.asc(), ExamSchedule.start_time.asc())
        )
        .scalars()
        .all()
    )
    schedules_data = [
        BankScheduleShareItem(
            id=s.id,
            name=s.name,
            batch_name=s.batch_name,
            session_date=s.session_date,
            start_time=s.start_time,
            mode=s.mode,
            access_token=s.access_token,
        )
        for s in schedules_rows
    ]
    questions_data = []
    for q in bank.questions:
        options_data = [
            OptionAdmin(
                id=opt.id,
                option_key=opt.option_key,
                option_text=opt.option_text,
                is_correct=opt.is_correct,
            )
            for opt in q.options
        ]
        questions_data.append(
            QuestionAdmin(
                id=q.id,
                question_number=q.question_number,
                question_text=q.question_text,
                points=q.points,
                options=options_data,
            )
        )
    return BankSoalDetailResponse(
        id=bank.id,
        period_id=bank.period_id,
        category=bank.category,
        title=bank.title,
        description=bank.description,
        duration_minutes=bank.duration_minutes,
        total_questions=bank.total_questions,
        total_points=bank.total_points,
        is_active=bank.is_active,
        in_use=used_count > 0,
        created_at=bank.created_at,
        updated_at=bank.updated_at,
        schedules=schedules_data,
        questions=questions_data,
    )


@router.post(
    "/banks/import",
    response_model=BankSoalResponse,
    summary="Import File Soal dan Generate Bank Soal",
    dependencies=[Depends(require_ppdb_admin)],
)
async def import_bank_soal(
    title: str = Form(..., min_length=3),
    category: str = Form(..., pattern=r"^(akademik|psikologi)$"),
    duration_minutes: int = Form(default=60, ge=5, le=300),
    description: str | None = Form(None),
    file: UploadFile | None = File(None),
    source_url: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file and file.filename:
        content = await file.read()
        filename = file.filename or "soal.csv"
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File yang diunggah kosong.",
            )
    elif source_url and source_url.strip():
        content, filename = CBTService.fetch_questions_from_url(source_url)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Sumber soal tidak ada. Harap unggah file (.csv / .json) "
                "atau tempel tautan publikasi CSV Google Sheets."
            ),
        )
    user_id = (
        current_user.get("id")
        if isinstance(current_user, dict)
        else getattr(current_user, "id", None)
    )
    bank = CBTService.import_bank_soal(
        db=db,
        title=title,
        category=category,
        duration_minutes=duration_minutes,
        description=description,
        file_content=content,
        filename=filename,
        user_id=user_id,
    )
    return bank


@router.delete(
    "/banks/{bank_id}",
    summary="Hapus Bank Soal",
    dependencies=[Depends(require_ppdb_admin)],
)
def delete_bank_soal(bank_id: str, db: Session = Depends(get_db)):
    CBTService.delete_bank_soal(db, bank_id)
    return {"message": "Bank Soal berhasil dihapus."}


@router.put(
    "/banks/{bank_id}",
    response_model=BankSoalResponse,
    summary="Update Data Bank Soal (Judul, Deskripsi, Durasi)",
    dependencies=[Depends(require_ppdb_admin)],
)
def update_bank_soal(
    bank_id: str, payload: BankSoalUpdate, db: Session = Depends(get_db)
):
    return CBTService.update_bank_soal(db, bank_id, payload)


@router.post(
    "/banks/{bank_id}/questions",
    response_model=QuestionAdmin,
    summary="Tambah Butir Soal Baru ke Bank Soal",
    dependencies=[Depends(require_ppdb_admin)],
)
def add_bank_question(
    bank_id: str, payload: QuestionUpsert, db: Session = Depends(get_db)
):
    question = CBTService.add_question(db, bank_id, payload)
    options_data = [
        OptionAdmin(
            id=opt.id,
            option_key=opt.option_key,
            option_text=opt.option_text,
            is_correct=opt.is_correct,
        )
        for opt in question.options
    ]
    return QuestionAdmin(
        id=question.id,
        question_number=question.question_number,
        question_text=question.question_text,
        points=question.points,
        options=options_data,
    )


@router.put(
    "/banks/{bank_id}/questions/{question_id}",
    response_model=QuestionAdmin,
    summary="Update Butir Soal (Teks, Poin, Opsi, Kunci Jawaban)",
    dependencies=[Depends(require_ppdb_admin)],
)
def update_bank_question(
    bank_id: str,
    question_id: str,
    payload: QuestionUpsert,
    db: Session = Depends(get_db),
):
    question = CBTService.update_question(db, bank_id, question_id, payload)
    options_data = [
        OptionAdmin(
            id=opt.id,
            option_key=opt.option_key,
            option_text=opt.option_text,
            is_correct=opt.is_correct,
        )
        for opt in question.options
    ]
    return QuestionAdmin(
        id=question.id,
        question_number=question.question_number,
        question_text=question.question_text,
        points=question.points,
        options=options_data,
    )


@router.delete(
    "/banks/{bank_id}/questions/{question_id}",
    summary="Hapus Butir Soal dari Bank Soal",
    dependencies=[Depends(require_ppdb_admin)],
)
def delete_bank_question(bank_id: str, question_id: str, db: Session = Depends(get_db)):
    CBTService.delete_question(db, bank_id, question_id)
    return {"message": "Soal berhasil dihapus dari Bank Soal."}


# ═══════════════════════════════════════════════════════════════════════════
# ADMIN: JADWAL UJIAN & PEMANTAUAN (MONITORING)
# ═══════════════════════════════════════════════════════════════════════════


@router.get(
    "/schedules",
    response_model=list[ScheduleResponse],
    summary="List Jadwal Seleksi (Card / List)",
)
def list_schedules(
    category: str = Query(..., pattern=r"^(akademik|psikologi)$"),
    wave_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    is_applicant = current_user.get("user_type") == "applicant"
    if is_applicant:
        from src.models.ppdb import PPDBApplicant

        app_record = db.execute(
            select(PPDBApplicant).where(
                PPDBApplicant.user_id == current_user.get("id"),
                PPDBApplicant.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        target_wave = app_record.wave_id if app_record else wave_id
        items = CBTService.list_schedules(db, category=category, wave_id=target_wave)
        # Mask PIN for applicants (PIN is shared manually by proctor at exam time)
        masked = []
        for it in items:
            it_dict = it.model_dump()
            it_dict["access_token"] = ""
            masked.append(ScheduleResponse(**it_dict))
        return masked

    # Admin access check
    user_perms = current_user.get("permissions") or {}
    if current_user.get("user_type") != "superadmin" and not current_user.get(
        "is_superadmin"
    ):
        if user_perms.get("ppdb", "none") == "none":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
            )

    return CBTService.list_schedules(db, category=category, wave_id=wave_id)


@router.post(
    "/schedules",
    response_model=ScheduleResponse,
    summary="Buat Jadwal Ujian Massal per Gelombang",
    dependencies=[Depends(require_ppdb_admin)],
)
def create_schedule(payload: ScheduleCreate, db: Session = Depends(get_db)):
    sched = CBTService.create_schedule(db, payload)
    return CBTService.get_schedule_detail(db, sched.id)


@router.get(
    "/schedules/{schedule_id}",
    response_model=ScheduleResponse,
    summary="Detail Jadwal Ujian",
    dependencies=[Depends(require_ppdb_read)],
)
def get_schedule(schedule_id: str, db: Session = Depends(get_db)):
    return CBTService.get_schedule_detail(db, schedule_id)


@router.put(
    "/schedules/{schedule_id}",
    response_model=ScheduleResponse,
    summary="Update Jadwal Ujian",
    dependencies=[Depends(require_ppdb_admin)],
)
def update_schedule(
    schedule_id: str, payload: ScheduleUpdate, db: Session = Depends(get_db)
):
    CBTService.update_schedule(db, schedule_id, payload)
    return CBTService.get_schedule_detail(db, schedule_id)


@router.delete(
    "/schedules/{schedule_id}",
    summary="Hapus Jadwal Ujian",
    dependencies=[Depends(require_ppdb_admin)],
)
def delete_schedule(schedule_id: str, db: Session = Depends(get_db)):
    CBTService.delete_schedule(db, schedule_id)
    return {"message": "Jadwal Ujian berhasil dihapus."}


@router.get(
    "/schedules/{schedule_id}/monitoring",
    response_model=ScheduleMonitoringResponse,
    summary="Halaman Pemantauan Ujian Real-time (Status, Pelanggaran, Nilai)",
    dependencies=[Depends(require_ppdb_read)],
)
def get_monitoring(schedule_id: str, db: Session = Depends(get_db)):
    return CBTService.get_monitoring_data(db, schedule_id)


@router.post(
    "/schedules/{schedule_id}/unfreeze/{applicant_id}",
    summary="Buka Kunci (Unfreeze) Peserta yang Terkunci",
    dependencies=[Depends(require_ppdb_admin)],
)
def unfreeze_candidate(
    schedule_id: str, applicant_id: str, db: Session = Depends(get_db)
):
    attempt = CBTService.unfreeze_candidate(db, schedule_id, applicant_id)
    return {
        "success": True,
        "message": "Kunci peserta berhasil dibuka. Peserta dapat login kembali untuk "
        "melanjutkan ujian.",
        "status": attempt.status,
    }


@router.post(
    "/schedules/{schedule_id}/move-candidate/{applicant_id}",
    summary="Pindahkan Peserta Ujian CBT ke Jadwal / Sesi Lain (Reschedule)",
    dependencies=[Depends(require_ppdb_admin)],
)
def move_candidate_schedule(
    schedule_id: str,
    applicant_id: str,
    payload: RescheduleCandidatePayload,
    db: Session = Depends(get_db),
):
    return CBTService.move_candidate_schedule(
        db,
        current_schedule_id=schedule_id,
        applicant_id=applicant_id,
        target_schedule_id=payload.target_schedule_id,
        reason=payload.reason,
    )


# ═══════════════════════════════════════════════════════════════════════════
# APPLICANT: CBT ENGINE (ANTI-CURANG & AUTOSAVE)
# ═══════════════════════════════════════════════════════════════════════════


@router.post(
    "/verify-access/{schedule_id}",
    response_model=VerifyExamAccessResponse,
    summary="Gerbang Re-Authentication Peserta (Password PPDB + Session PIN)",
)
def verify_access(
    schedule_id: str,
    payload: VerifyExamAccessRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return CBTService.verify_applicant_access(
        db=db,
        user=current_user,
        schedule_id=schedule_id,
        password=payload.password,
        access_token=payload.access_token,
    )


@router.get(
    "/exam-sheet/{schedule_id}",
    response_model=ExamSheetResponse,
    summary="Ambil Lembar Soal CBT & Jawaban Tersimpan",
)
def get_exam_sheet(
    schedule_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return CBTService.get_exam_sheet(db, current_user, schedule_id)


@router.post(
    "/save-answer/{schedule_id}",
    response_model=SaveAnswerResponse,
    summary="Autosave Jawaban Peserta per Klik Opsi",
)
def save_answer(
    schedule_id: str,
    payload: SaveAnswerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return CBTService.save_answer(db, current_user, schedule_id, payload)


@router.post(
    "/violation/{schedule_id}",
    response_model=ViolationReportResponse,
    summary="Lapor Pelanggaran Keluar Tab > 5 Detik (Trigger Terkunci)",
)
def report_violation(
    schedule_id: str,
    payload: ViolationReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return CBTService.record_violation(
        db, current_user, schedule_id, payload.reason or "tab_switch_or_blur"
    )


@router.post(
    "/timer/{schedule_id}",
    summary="Sinkronisasi Timer Sisa Waktu Ujian",
)
def sync_timer(
    schedule_id: str,
    remaining_seconds: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return CBTService.update_timer(db, current_user, schedule_id, remaining_seconds)


@router.post(
    "/finish/{schedule_id}",
    summary="Selesai Ujian & Auto-Grading Otomatis",
)
def finish_exam(
    schedule_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return CBTService.finish_exam(db, current_user, schedule_id)


@router.get(
    "/status/{schedule_id}",
    summary="Cek Status Pengerjaan Ujian Peserta",
)
def get_attempt_status(
    schedule_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return CBTService.get_attempt_status(db, current_user, schedule_id)
