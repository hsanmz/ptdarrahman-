import logging
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    Query,
    Request,
    UploadFile,
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from src.core.config import settings
from src.core.database import audit_log, get_db
from src.core.dependencies import (
    get_current_user,
    require_ppdb_admin,
    require_ppdb_read,
)
from src.core.rate_limit import rate_limit_dependency

from src.modules.ppdb.schemas import (
    ApplicantAdminCreate,
    ApplicantAdminUpdate,
    ApplicantPasswordReset,
    ApplicantProfileUpdate,
    ApplicantRegister,
    DocumentSubmitRequest,
    DocumentVerify,
    LoASignatureRequest,
    PeriodCreate,
    PeriodFeeItemCreate,
    PeriodFeeItemUpdate,
    PeriodUpdate,
    WaveFeeDiscountUpdate,
    WaveCreate,
    WaveFeeItemCreate,
    WaveFeeItemUpdate,
    WaveUpdate,
)
from src.repositories.ppdb_repository import PPDBRepository
from src.services.ppdb_service import PPDBService

logger = logging.getLogger("ptdarrahman.ppdb")
router = APIRouter()
WIB = ZoneInfo("Asia/Jakarta")


def get_ppdb_service(db: Session = Depends(get_db)) -> PPDBService:
    return PPDBService(PPDBRepository(db))


# ---------------------------------------------------------------------------
# Periods
# ---------------------------------------------------------------------------
@router.get("/periods")
def get_periods(
    page: int = Query(1),
    perPage: int = Query(20),
    search: str = Query(""),
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_periods(page, perPage, search)


@router.get("/periods/all")
def get_all_periods(
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_all_periods()


@router.get("/periods/{id}")
def get_period_by_id(
    id: str,
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_period_by_id(id)


@router.post("/periods", status_code=201)
def create_period(
    body: PeriodCreate,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.create_period(body)


@router.put("/periods/{id}")
def update_period(
    id: str,
    body: PeriodUpdate,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.update_period(id, body)


@router.put("/periods/{id}/activate")
def activate_period(
    id: str,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    result = service.activate_period(id)
    audit_log(
        user_id=user.get("id"),
        user_username=user.get("username"),
        action="activate",
        entity_type="ppdb_periods",
        entity_id=id,
    )
    return result


@router.put("/periods/{id}/deactivate")
def deactivate_period(
    id: str,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    result = service.deactivate_period(id)
    audit_log(
        user_id=user.get("id"),
        user_username=user.get("username"),
        action="deactivate",
        entity_type="ppdb_periods",
        entity_id=id,
    )
    return result


@router.delete("/periods/{id}")
# ---------------------------------------------------------------------------
# Period Fee Items (Master Komponen Biaya per Periode)
# ---------------------------------------------------------------------------
@router.get("/periods/{id}/fee-items")
def get_period_fee_items(
    id: str,
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_period_fee_items(id)


@router.post("/periods/{id}/fee-items", status_code=201)
def create_period_fee_item(
    id: str,
    body: PeriodFeeItemCreate,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    result = service.create_period_fee_item(id, body)
    audit_log(
        user_id=user.get("id"),
        user_username=user.get("username"),
        action="create_fee_item",
        entity_type="ppdb_period_fee_items",
        entity_id=result.get("id"),
    )
    return result


@router.put("/periods/{id}/fee-items/{item_id}")
def update_period_fee_item(
    id: str,
    item_id: str,
    body: PeriodFeeItemUpdate,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    result = service.update_period_fee_item(id, item_id, body)
    audit_log(
        user_id=user.get("id"),
        user_username=user.get("username"),
        action="update_fee_item",
        entity_type="ppdb_period_fee_items",
        entity_id=item_id,
    )
    return result


@router.delete("/periods/{id}/fee-items/{item_id}")
def delete_period_fee_item(
    id: str,
    item_id: str,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    result = service.delete_period_fee_item(id, item_id)
    audit_log(
        user_id=user.get("id"),
        user_username=user.get("username"),
        action="delete_fee_item",
        entity_type="ppdb_period_fee_items",
        entity_id=item_id,
    )
    return result


def delete_period_endpoint(
    id: str,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.delete_period(id)


# ---------------------------------------------------------------------------
# Waves
# ---------------------------------------------------------------------------
@router.get("/waves")
def get_waves(
    period_id: str | None = Query(None),
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_waves(period_id)


@router.get("/waves/all")
def get_all_waves(
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_all_waves()


@router.get("/waves/active-public")
def get_active_wave_public(service: PPDBService = Depends(get_ppdb_service)):
    return service.get_active_wave_public()


@router.get("/waves/{id}")
def get_wave_by_id(
    id: str,
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_wave_by_id(id)


@router.post("/waves", status_code=201)
def create_wave(
    body: WaveCreate,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.create_wave(body)


@router.put("/waves/{id}")
def update_wave(
    id: str,
    body: WaveUpdate,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.update_wave(id, body)


@router.put("/waves/{id}/activate")
def activate_wave(
    id: str,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    result = service.activate_wave(id)
    audit_log(
        user_id=user.get("id"),
        user_username=user.get("username"),
        action="activate",
        entity_type="ppdb_waves",
        entity_id=id,
    )
    return result


@router.put("/waves/{id}/deactivate")
def deactivate_wave(
    id: str,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    result = service.deactivate_wave(id)
    audit_log(
        user_id=user.get("id"),
        user_username=user.get("username"),
        action="deactivate",
        entity_type="ppdb_waves",
        entity_id=id,
    )
    return result


@router.delete("/waves/{id}")
def delete_wave_endpoint(
    id: str,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.delete_wave(id)


# ---------------------------------------------------------------------------
# Wave fee items (Biaya Tahap 2 per gelombang)
# ---------------------------------------------------------------------------
@router.get("/waves/{id}/fee-items")
def get_wave_fee_items(
    id: str,
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_wave_fee_items(id)


@router.post("/waves/{id}/fee-items", status_code=201)
def create_wave_fee_item(
    id: str,
    body: WaveFeeItemCreate,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.create_wave_fee_item(id, body)


@router.delete("/waves/{id}/fee-items/{item_id}")
def delete_wave_fee_item(
    id: str,
    item_id: str,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.delete_wave_fee_item(id, item_id)


@router.put("/waves/{id}/fee-items/{item_id}")
@router.put("/waves/{id}/fee-discounts/{fee_item_id}")
def update_wave_fee_discount(
    id: str,
    fee_item_id: str,
    body: WaveFeeDiscountUpdate,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    result = service.update_wave_fee_discount(id, fee_item_id, body)
    audit_log(
        user_id=user.get("id"),
        user_username=user.get("username"),
        action="update_wave_fee_discount",
        entity_type="ppdb_wave_fee_discounts",
        entity_id=f"{id}_{fee_item_id}",
    )
    return result


def update_wave_fee_item(
    id: str,
    item_id: str,
    body: WaveFeeItemUpdate,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.update_wave_fee_item(id, item_id, body)


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------
@router.post("/register", status_code=201)
def register_applicant(
    body: ApplicantRegister,
    service: PPDBService = Depends(get_ppdb_service),
    _: None = Depends(rate_limit_dependency("register")),
):
    return service.register_applicant(body)


# ---------------------------------------------------------------------------
# Applicants & dashboard
# ---------------------------------------------------------------------------
@router.get("/applicants")
def get_applicants(
    page: int = Query(1),
    perPage: int = Query(20),
    search: str = Query(""),
    wave_id: str | None = Query(None),
    status: str | None = Query(None),
    period_id: str | None = Query(None),
    payment_status: str | None = Query(None),
    sort: str | None = Query(None),
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    """Daftar pendaftar.

    Tanpa filter, seluruh pendaftar dari semua periode & gelombang dikembalikan.
    ``period_id="active"`` membatasi ke periode aktif (semua gelombang di
    dalamnya) — scope halaman operasional admin. ``wave_id="active"`` untuk
    membatasi ke gelombang aktif saja (kompatibilitas).
    """
    return service.get_applicants(
        page, perPage, search, wave_id, status, period_id, payment_status, sort
    )


@router.post("/applicants", status_code=201)
def create_applicant(
    body: ApplicantAdminCreate,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    """Buat pendaftar dari panel admin. Kredensial dibuat sistem."""
    return service.create_applicant(body)


@router.get("/applicants/me")
def get_my_applicant(
    user: dict[str, Any] = Depends(get_current_user),
    service: PPDBService = Depends(get_ppdb_service),
):
    """Ambil data formulir pendaftar untuk user calon santri yang sedang login."""
    return service.get_my_applicant_profile(user["id"])


@router.put("/applicants/me")
def update_my_applicant(
    body: ApplicantProfileUpdate,
    user: dict[str, Any] = Depends(get_current_user),
    service: PPDBService = Depends(get_ppdb_service),
):
    """Pembaruan mandiri formulir pendaftaran oleh calon santri.

    Dapat diubah selama proses seleksi hingga lulus tes / LoA resmi diterbitkan.
    """
    return service.update_my_applicant_profile(user["id"], body)


@router.get("/applicants/{id}")
def get_applicant(
    id: str,
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_applicant(id)


@router.put("/applicants/{id}")
def update_applicant(
    id: str,
    body: ApplicantAdminUpdate,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.update_applicant(id, body)


@router.delete("/applicants/{id}")
def delete_applicant(
    id: str,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.delete_applicant(id)


@router.put("/applicants/{id}/password")
def reset_applicant_password(
    id: str,
    body: ApplicantPasswordReset,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.reset_applicant_password(id, body.password)


# ─────────────────────────────────────────────────────────────────────────────
# Dokumen Pendaftar
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/documents")
def get_my_documents(
    user: dict[str, Any] = Depends(get_current_user),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_my_documents(user["id"])


@router.post("/documents/upload")
async def upload_ppdb_document(
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    user: dict[str, Any] = Depends(get_current_user),
    service: PPDBService = Depends(get_ppdb_service),
):
    return await service.upload_document(user, doc_type, file)


@router.post("/documents/submit")
def submit_ppdb_documents(
    payload: DocumentSubmitRequest | None = None,
    user: dict[str, Any] = Depends(get_current_user),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.submit_documents(user, payload)


@router.get("/applicants/{id}/documents")
def get_applicant_documents(
    id: str,
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_applicant_documents_admin(id)


@router.post("/applicants/{id}/documents/verify")
def verify_applicant_documents(
    id: str,
    body: DocumentVerify,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.verify_applicant_documents(id, body.status, body.rejection_reason)


@router.get("/applicants/{id}/transcript")
def get_applicant_transcript(
    id: str,
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_applicant_transcript(id)


# Rute /applicants/me/* HARUS didaftarkan SEBELUM /applicants/{id} agar "me"
# tidak ditangkap sebagai id oleh route {id} di bawah ini.
@router.get("/applicants/me/loa")
def get_my_loa(
    user: dict[str, Any] = Depends(get_current_user),
    service: PPDBService = Depends(get_ppdb_service),
):
    applicant = service.repository.get_applicant_by_user_id(user["id"])
    if not applicant:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")
    return service.get_applicant_loa(applicant.id)


@router.get("/applicants/{id}/loa")
def get_applicant_loa(
    id: str,
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_applicant_loa(id)


# ─────────────────────────────────────────────────────────────────────────────
# Arsip / Dossier Pendaftar (Lintas Periode & Gelombang)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/archive/applicants")
def get_archive_applicants(
    period_id: str | None = Query(None),
    wave_id: str | None = Query(None),
    search: str | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1),
    perPage: int = Query(20),
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_archive_applicants(
        period_id=period_id,
        wave_id=wave_id,
        search=search,
        status=status,
        page=page,
        per_page=perPage,
    )


@router.get("/archive/applicants/{id}/dossier")
def get_applicant_dossier(
    id: str,
    request: Request,
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    ip_addr = request.client.host if request.client else None
    return service.get_applicant_dossier(id, admin_user=user, ip_address=ip_addr)


@router.get("/archive/applicants/{id}/dossier/zip")
def download_applicant_dossier_zip(
    id: str,
    request: Request,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    import io

    ip_addr = request.client.host if request.client else None
    zip_bytes, zip_filename = service.export_applicant_dossier_zip(
        id, admin_user=user, ip_address=ip_addr
    )
    return StreamingResponse(
        io.BytesIO(zip_bytes),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{zip_filename}"'},
    )


@router.post("/applicants/me/sign-loa")
def sign_my_loa(
    body: LoASignatureRequest,
    user: dict[str, Any] = Depends(get_current_user),
    service: PPDBService = Depends(get_ppdb_service),
):
    applicant = service.repository.get_applicant_by_user_id(user["id"])
    if not applicant:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")
    return service.sign_applicant_loa(applicant.id, body)


@router.get("/signed-loa-applicants")
def get_signed_loa_applicants(
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_signed_loa_applicants(
        search=search, page=page, per_page=per_page
    )


@router.get("/loa/{registration_or_id}")
def get_loa_by_registration_or_id(
    registration_or_id: str,
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_loa_by_registration_or_id(registration_or_id)


@router.get("/dashboard/stats")
def get_ppdb_dashboard(
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_dashboard_stats()


def _verify_cron_secret(provided: str | None) -> None:
    """
    Verifikasi cron secret dengan constant-time comparison (mencegah timing attack).
    Raises HTTP 401 jika secret tidak valid atau belum dikonfigurasi.
    """
    import hmac as _hmac

    expected = settings.cron_secret
    if not expected:
        raise HTTPException(status_code=401, detail="Cron secret belum dikonfigurasi")
    if not provided:
        raise HTTPException(status_code=401, detail="Unauthorized cron request")
    # constant-time compare — mencegah timing side-channel
    if not _hmac.compare_digest(provided.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Unauthorized cron request")


@router.post("/cron/soft-delete-expired")
def soft_delete_expired_applicants(
    x_cron_secret: str = Header(None), service: PPDBService = Depends(get_ppdb_service)
):
    _verify_cron_secret(x_cron_secret)
    return service.soft_delete_expired_applicants()


@router.post("/cron/reminders")
def run_reminders(
    x_cron_secret: str = Header(None), service: PPDBService = Depends(get_ppdb_service)
):
    _verify_cron_secret(x_cron_secret)
    return service.run_reminders()
