"""
apps/api/src/modules/notifications/router.py

Notifications module router.

Endpoints:
  GET  /notifications/templates                — List all templates
  GET  /notifications/templates/{id}           — Get template by ID
  PUT  /notifications/templates/{id}           — Update template
  POST /notifications/send                     — Send custom notification
  GET  /notifications/logs                     — Get delivery logs (paginated)
  GET  /notifications/status                   — WA microservice health status (proxy)
  GET  /notifications/wa/session               — WA session status (proxy)
  POST /notifications/wa/session/init          — Init WA session (proxy)
  POST /notifications/wa/session/logout        — Logout WA session (proxy)
  DELETE /notifications/wa/session             — Destroy WA session (proxy)
  GET  /notifications/wa/session/qr            — QR code raw string (proxy, one-shot)
  GET  /notifications/wa/queue                 — Queue stats (proxy)
  GET  /notifications/wa/logs                  — WA delivery logs (proxy)
  POST /notifications/webhook/whatsapp         — Webhook callback dari WA microservice

  ── CRON / TRIGGER ──────────────────────────────────────────────────────────
  POST /notifications/cron/payment-reminder-monday — Cron pengingat
  bayar formulir (Senin)
  POST /notifications/cron/reminder-upload-docs-h3 — Pengingat dokumen H+3
  POST /notifications/trigger/wave-closed          — Trigger kuota
  penuh/penutupan gelombang

WA calls harus SELALU melalui FastAPI — frontend tidak boleh memanggil
WA microservice langsung karena itu akan mengekspos WA_API_KEY di browser.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import time
from datetime import datetime, timedelta
from typing import Any, cast
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import text

from src.core.config import settings
from src.core.database import execute_raw, get_by_id, get_raw_pool, update_record
from src.core.dependencies import (
    require_cron_auth,
    require_notification_admin,
    require_notification_read,
)
from src.core.notif_service import send_custom_notifications, send_notification

logger = logging.getLogger("ptdarrahman.notif")
router = APIRouter()


# ── Request/Response Models ───────────────────────────────────────────────────


class TemplateUpdate(BaseModel):
    label: str | None = None
    channel: str | None = None
    email_subject: str | None = None
    body: str | None = None
    is_active: bool | None = None


class CustomSend(BaseModel):
    recipient_user_ids: list[str]
    channel: str = "both"
    subject: str = ""
    body: str


# ── Template Endpoints ────────────────────────────────────────────────────────


@router.get("/templates")
def get_templates(user: dict = Depends(require_notification_read)):
    rows = execute_raw("SELECT * FROM notification_templates ORDER BY event_key ASC")
    return rows


@router.get("/templates/{id}")
def get_template(id: str, user: dict = Depends(require_notification_read)):
    row = get_by_id("notification_templates", id)
    if not row:
        raise HTTPException(status_code=404, detail="Template not found")
    return row


@router.put("/templates/{id}")
def update_template(
    id: str, body: TemplateUpdate, user: dict = Depends(require_notification_admin)
):
    data = {
        k: v
        for k, v in {
            "label": body.label,
            "channel": body.channel,
            "email_subject": body.email_subject,
            "body": body.body,
            "is_active": body.is_active,
        }.items()
        if v is not None
    }
    if not data:
        raise HTTPException(status_code=400, detail="Tidak ada field untuk diubah")
    updated = update_record("notification_templates", id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Template not found")
    return updated


# ── Send Endpoint ─────────────────────────────────────────────────────────────


@router.post("/send")
def send_custom(body: CustomSend, user: dict = Depends(require_notification_admin)):
    if not body.body.strip():
        raise HTTPException(status_code=400, detail="Body pesan tidak boleh kosong")
    if not body.recipient_user_ids:
        raise HTTPException(status_code=400, detail="Pilih minimal satu penerima")
    if body.channel not in ("email", "whatsapp", "both"):
        raise HTTPException(status_code=400, detail="Channel tidak valid")

    result = send_custom_notifications(
        recipient_user_ids=body.recipient_user_ids,
        channel=body.channel,
        subject=body.subject,
        body=body.body,
    )
    return {"message": "Notifikasi masuk antrian", **result}


# ── Logs Endpoint ─────────────────────────────────────────────────────────────


@router.get("/logs")
def get_logs(
    page: int = Query(1, ge=1),
    perPage: int = Query(20, ge=1, le=200),
    status: str | None = Query(None),
    event_key: str | None = Query(None),
    user: dict = Depends(require_notification_read),
):
    offset = (page - 1) * perPage
    where_parts: list[str] = ["1=1"]
    params: dict[str, Any] = {}

    if status:
        where_parts.append("status = :status")
        params["status"] = status
    if event_key:
        where_parts.append("event_key = :event_key")
        params["event_key"] = event_key

    where_clause = " AND ".join(where_parts)
    data_sql = (
        f"SELECT * FROM notification_logs WHERE {where_clause} "
        "ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
    )
    count_sql = f"SELECT COUNT(*) as cnt FROM notification_logs WHERE {where_clause}"
    params["limit"] = perPage
    params["offset"] = offset

    pool = get_raw_pool()
    with pool.connect() as conn:
        rows = conn.execute(text(data_sql), params).mappings().all()
        count_rows = (
            conn.execute(
                text(count_sql),
                {k: v for k, v in params.items() if k not in ("limit", "offset")},
            )
            .mappings()
            .all()
        )

    return {
        "data": [dict(r) for r in rows],
        "total": count_rows[0]["cnt"],
        "page": page,
        "perPage": perPage,
        "totalPages": -(-count_rows[0]["cnt"] // perPage),  # ceiling division
    }


# ── WA Service Status ─────────────────────────────────────────────────────────


@router.get("/status")
async def get_wa_status(user: dict = Depends(require_notification_read)):
    """Proxy ke WA microservice health check."""
    import httpx

    if not settings.wa_service_url or not settings.wa_service_api_key:
        return {
            "configured": False,
            "message": "WA_SERVICE_URL atau WA_SERVICE_API_KEY belum dikonfigurasi",
        }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{settings.wa_service_url}/health/detailed",
                headers={"Authorization": f"Bearer {settings.wa_service_api_key}"},
            )
            return {
                "configured": True,
                "httpStatus": resp.status_code,
                "data": resp.json(),
            }
    except httpx.ConnectError:
        return {
            "configured": True,
            "httpStatus": 503,
            "error": "WA microservice tidak dapat dihubungi",
        }
    except Exception as e:
        return {
            "configured": True,
            "httpStatus": 500,
            "error": str(e),
        }


# ── WA Microservice Proxy ─────────────────────────────────────────────────────
#
# Semua calls ke WA microservice harus lewat sini — frontend TIDAK BOLEH
# memanggil WA service langsung karena itu akan expose WA_API_KEY di browser.


async def _wa_proxy(
    method: str,
    path: str,
    params: dict[str, Any] | None = None,
    json_body: dict[str, Any] | None = None,
    timeout: float = 10.0,
) -> dict[str, Any]:
    """Helper: forward request ke WA microservice dengan API key dari server."""
    import httpx

    if not settings.wa_service_url or not settings.wa_service_api_key:
        raise HTTPException(
            status_code=503,
            detail="WA_SERVICE_URL atau WA_SERVICE_API_KEY belum dikonfigurasi",
        )

    url = f"{settings.wa_service_url.rstrip('/')}{path}"
    headers = {
        "Authorization": f"Bearer {settings.wa_service_api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                json=json_body,
            )
            data = resp.json() if resp.content else {}
            if not resp.is_success:
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=data.get("error")
                    or data.get("message")
                    or f"WA service error {resp.status_code}",
                )
            return cast(dict[str, Any], data)
    except HTTPException:
        raise
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503, detail="WA microservice tidak dapat dihubungi"
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/wa/session")
async def wa_get_session(user: dict = Depends(require_notification_read)):
    return await _wa_proxy("GET", "/api/session")


@router.post("/wa/session/init")
async def wa_init_session(user: dict = Depends(require_notification_admin)):
    return await _wa_proxy("POST", "/api/session/init")


@router.post("/wa/session/logout")
async def wa_logout_session(user: dict = Depends(require_notification_admin)):
    return await _wa_proxy("POST", "/api/session/logout")


@router.delete("/wa/session")
async def wa_destroy_session(user: dict = Depends(require_notification_admin)):
    return await _wa_proxy("DELETE", "/api/session")


@router.get("/wa/session/qr")
async def wa_get_qr_image(user: dict = Depends(require_notification_read)):
    """One-shot raw QR string (dirender frontend via QR JS library)."""
    return await _wa_proxy("GET", "/api/session/qr/raw", timeout=15.0)


@router.get("/wa/queue")
async def wa_get_queue(user: dict = Depends(require_notification_read)):
    return await _wa_proxy("GET", "/api/messages/queue")


@router.get("/wa/logs")
async def wa_get_logs(
    page: int = Query(1, ge=1),
    perPage: int = Query(20, ge=1, le=200),
    status: str | None = Query(None),
    user: dict = Depends(require_notification_read),
):
    params: dict[str, Any] = {"page": page, "perPage": perPage}
    if status:
        params["status"] = status
    return await _wa_proxy("GET", "/api/messages/logs", params=params)


# ── Webhook Endpoint (callback dari WA microservice) ─────────────────────────


def _verify_wa_webhook(body_bytes: bytes, timestamp: str, signature: str) -> bool:
    """
    Verifikasi HMAC-SHA256 signature dari WA microservice.

    FAIL-CLOSED: jika WA_WEBHOOK_SECRET tidak dikonfigurasi, TOLAK semua
    request (bukan terima). Ini mencegah spoofing webhook.
    """
    secret = settings.wa_webhook_secret
    if not secret:
        logger.error(
            "WA_WEBHOOK_SECRET tidak dikonfigurasi — menolak semua webhook. "
            "Set WA_WEBHOOK_SECRET di .env untuk mengaktifkan webhook."
        )
        return False  # FAIL-CLOSED

    try:
        ts_int = int(timestamp)
        if abs(time.time() - ts_int) > 300:
            logger.warning(
                "Webhook timestamp terlalu lama atau tidak valid",
                extra={"timestamp": timestamp},
            )
            return False
    except (ValueError, TypeError):
        return False

    try:
        message = f"{timestamp}.{body_bytes.decode('utf-8', errors='replace')}".encode()
        expected = hmac.new(
            secret.encode("utf-8"),
            message,
            hashlib.sha256,
        ).hexdigest()
    except Exception:
        logger.exception("Gagal menghitung HMAC signature")
        return False

    provided = signature.removeprefix("sha256=")
    if not provided:
        return False
    return hmac.compare_digest(expected, provided)


@router.post("/webhook/whatsapp")
async def wa_webhook(request: Request):
    """
    Menerima delivery status callback dari WA microservice.
    Update notification_logs berdasarkan event yang diterima.
    """
    try:
        body_bytes = await request.body()
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to read request body")

    signature = request.headers.get("X-WA-Signature", "")
    timestamp = request.headers.get("X-WA-Timestamp", "")

    if not _verify_wa_webhook(body_bytes, timestamp, signature):
        logger.warning(
            "Webhook ditolak: signature tidak valid atau secret belum dikonfigurasi",
            extra={"signature_present": bool(signature), "timestamp": timestamp},
        )
        raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        import json

        payload = json.loads(body_bytes.decode("utf-8", errors="replace"))
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {exc}")

    event = payload.get("event")
    data = payload.get("data", {})
    job_id = data.get("jobId")

    from src.core.cache import get_redis

    r = get_redis()
    idempotency_key = None
    if r is not None and (job_id or signature):
        idempotency_key = f"wa_hook_idempotency:{job_id or signature}:{event}"
        try:
            is_new = r.set(idempotency_key, "1", nx=True, ex=600)
            if not is_new:
                logger.info(
                    "Webhook WA diabaikan: event %s untuk job %s sudah diproses sebelumnya",
                    event,
                    job_id,
                )
                return {
                    "received": True,
                    "duplicate": True,
                    "status": "duplicate_suppressed",
                }
        except Exception as exc:
            logger.warning("Gagal memeriksa idempotency webhook di Redis: %s", exc)
            idempotency_key = None

    db_committed = False
    try:
        pool = get_raw_pool()
        with pool.connect() as conn:
            if event == "message.sent":
                job_id = data.get("jobId")
                wa_message_id = data.get("waMessageId")
                event_key = data.get("eventKey", "")
                recipient_user_id = data.get("recipientUserId", "")

                if job_id and event_key:
                    res = conn.execute(
                        text(
                            "UPDATE notification_logs "
                            "SET status = 'sent', "
                            "wa_message_id = COALESCE(:wa_id, wa_message_id), "
                            "sent_at = NOW() "
                            "WHERE wa_message_id = :job_id "
                            "AND status = 'queued' "
                            "LIMIT 1"
                        ),
                        {
                            "wa_id": wa_message_id or job_id,
                            "job_id": str(job_id),
                        },
                    )
                    if res.rowcount == 0:
                        conn.execute(
                            text(
                                "UPDATE notification_logs "
                                "SET status = 'sent', "
                                "wa_message_id = :wa_id, sent_at = NOW() "
                                "WHERE event_key = :event_key "
                                "AND recipient_user_id = :user_id "
                                "AND status = 'queued' "
                                "ORDER BY created_at DESC "
                                "LIMIT 1"
                            ),
                            {
                                "wa_id": wa_message_id or job_id,
                                "event_key": event_key,
                                "user_id": recipient_user_id,
                            },
                        )
                    conn.commit()
                    db_committed = True
                    logger.info("Webhook: message.sent — jobId=%s", job_id)

            elif event == "message.failed":
                job_id = data.get("jobId")
                error_code = data.get("errorCode", "unknown")
                error_msg = data.get("errorMessage", "")
                event_key = data.get("eventKey", "")
                recipient_user_id = data.get("recipientUserId", "")
                status = (
                    "invalid_number" if error_code == "invalid_number" else "failed"
                )

                if job_id and event_key:
                    res = conn.execute(
                        text(
                            "UPDATE notification_logs "
                            "SET status = :status, error_message = :msg "
                            "WHERE wa_message_id = :job_id "
                            "AND status = 'queued' "
                            "LIMIT 1"
                        ),
                        {
                            "status": status,
                            "msg": f"{error_code}: {error_msg}",
                            "job_id": str(job_id),
                        },
                    )
                    if res.rowcount == 0:
                        conn.execute(
                            text(
                                "UPDATE notification_logs "
                                "SET status = :status, error_message = :msg "
                                "WHERE event_key = :event_key "
                                "AND recipient_user_id = :user_id "
                                "AND status = 'queued' "
                                "ORDER BY created_at DESC "
                                "LIMIT 1"
                            ),
                            {
                                "status": status,
                                "msg": f"{error_code}: {error_msg}",
                                "event_key": event_key,
                                "user_id": recipient_user_id,
                            },
                        )
                    conn.commit()
                    db_committed = True
                    logger.info(
                        "Webhook: message.failed — jobId=%s, code=%s",
                        job_id,
                        error_code,
                    )

            elif event == "session.ready":
                logger.info("Webhook: WA session is ready")
            elif event == "session.disconnected":
                logger.warning(
                    "Webhook: WA session disconnected — reason=%s", data.get("reason")
                )
    except Exception as exc:
        if r is not None and idempotency_key and not db_committed:
            try:
                r.delete(idempotency_key)
            except Exception as del_err:
                logger.warning("Gagal membersihkan idempotency key: %s", del_err)
        raise exc

    return JSONResponse({"received": True, "event": event})


# ── CRON: Pengingat Bayar Formulir Setiap Senin ───────────────────────────────


class MondayReminderRequest(BaseModel):
    """Body opsional — semua field punya default (cron bisa POST tanpa body)."""

    dry_run: bool = False
    limit: int | None = None


class ScheduledReminderRequest(BaseModel):
    dry_run: bool = False
    limit: int | None = None


def _already_notified_users(event_key: str, user_ids: list[str]) -> set[str]:
    if not user_ids:
        return set()
    placeholders = ", ".join(f":uid{i}" for i in range(len(user_ids)))
    params = {f"uid{i}": user_id for i, user_id in enumerate(user_ids)}
    params["event_key"] = event_key
    rows = execute_raw(
        "SELECT DISTINCT recipient_user_id FROM notification_logs "
        f"WHERE event_key = :event_key AND recipient_user_id IN ({placeholders}) "
        "AND status IN ('queued', 'sent')",
        params,
    )
    return {str(row["recipient_user_id"]) for row in rows}


def _upload_docs_h3_candidates(limit: int | None) -> list[dict[str, Any]]:
    pool = get_raw_pool()
    cutoff = datetime.now(ZoneInfo("Asia/Jakarta")).replace(tzinfo=None) - timedelta(
        days=3
    )
    with pool.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT pa.id AS applicant_id, pa.user_id, pa.full_name
                FROM ppdb_applicants pa
                JOIN ppdb_payment_transactions tx ON tx.applicant_id = pa.id
                WHERE pa.payment_status = 'paid'
                  AND pa.deleted_at IS NULL
                  AND tx.status = 'success'
                  AND COALESCE(tx.confirmed_at, tx.updated_at, tx.created_at)
                      <= :cutoff
                  AND NOT EXISTS (
                      SELECT 1 FROM file_uploads fu
                      WHERE fu.entity_type LIKE 'ppdb_document:%'
                        AND fu.entity_id = pa.id
                  )
                GROUP BY pa.id, pa.user_id, pa.full_name
                ORDER BY MIN(COALESCE(tx.confirmed_at, tx.updated_at, tx.created_at))
                """
            ),
            {"cutoff": cutoff},
        ).mappings().all()
        candidates = [dict(row) for row in rows]
        if limit is not None:
            candidates = candidates[:limit]
        if not candidates:
            return []

        return candidates


@router.post("/cron/reminder-upload-docs-h3")
def cron_reminder_upload_docs_h3(
    body: ScheduledReminderRequest = ScheduledReminderRequest(),
    _: dict = Depends(require_cron_auth),
):
    candidates = _upload_docs_h3_candidates(body.limit)
    user_ids = [str(row["user_id"]) for row in candidates]
    already_notified = _already_notified_users("reminder_upload_docs_h3", user_ids)
    sent = 0
    skipped = 0
    for row in candidates:
        user_id = str(row["user_id"])
        if user_id in already_notified:
            skipped += 1
            continue
        if not body.dry_run:
            send_notification(
                "reminder_upload_docs_h3",
                user_id,
                {"link_aplikasi": f"{settings.ppdb_frontend_url}/applicant/dokumen"},
            )
        sent += 1
    return {
        "event_key": "reminder_upload_docs_h3",
        "eligible": len(candidates),
        "sent": sent,
        "skipped_recent": skipped,
        "dry_run": body.dry_run,
    }


@router.post("/cron/payment-reminder-monday")
def cron_payment_reminder_monday(
    body: MondayReminderRequest = MondayReminderRequest(),
    _: dict = Depends(require_cron_auth),
):
    """
    Endpoint cron yang dipanggil setiap hari Senin.
    Mencari semua pendaftar yang belum menyelesaikan pembayaran formulir.
    """
    pool = get_raw_pool()
    with pool.connect() as conn:
        rows = (
            conn.execute(
                text(
                    """
                SELECT
                    pa.id            AS applicant_id,
                    pa.user_id,
                    pa.full_name,
                    pa.phone,
                    w.name           AS wave_name,
                    w.end_date       AS wave_end_date
                FROM ppdb_applicants pa
                JOIN ppdb_waves w ON w.id = pa.wave_id
                WHERE pa.status = 'pending_payment'
                  AND pa.payment_status = 'pending'
                  AND pa.deleted_at IS NULL
                  AND w.status = 'active'
                  AND (w.end_date IS NULL OR w.end_date >= CURDATE())
                ORDER BY pa.created_at ASC
                """
                )
            )
            .mappings()
            .all()
        )

    eligible = [dict(r) for r in rows]

    if body.limit is not None:
        eligible = eligible[: body.limit]

    if not eligible:
        return {
            "message": "Tidak ada pendaftar yang memenuhi syarat",
            "total_eligible": 0,
            "sent": 0,
            "skipped_recent": 0,
            "dry_run": body.dry_run,
        }

    user_ids_eligible = [r["user_id"] for r in eligible]
    sent_count = 0
    skipped_recent = 0

    with pool.connect() as conn:
        placeholders = ", ".join(f":uid{i}" for i in range(len(user_ids_eligible)))
        uid_params = {f"uid{i}": uid for i, uid in enumerate(user_ids_eligible)}
        recent_rows = (
            conn.execute(
                text(
                    f"""
                SELECT recipient_user_id
                FROM notification_logs
                WHERE event_key = 'payment_reminder_monday'
                  AND recipient_user_id IN ({placeholders})
                  AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                  AND status IN ('sent', 'queued')
                """
                ),
                uid_params,
            )
            .mappings()
            .all()
        )
        recently_notified = {str(r["recipient_user_id"]) for r in recent_rows}

    for r in eligible:
        user_id = str(r["user_id"])
        if user_id in recently_notified:
            skipped_recent += 1
            continue

        if not body.dry_run:
            wave_end = r.get("wave_end_date")
            tanggal_tutup = (
                wave_end.strftime("%d %B %Y") if wave_end else "sesuai jadwal"
            )

            send_notification(
                event_key="payment_reminder_monday",
                recipient_user_id=user_id,
                context={
                    "nama_gelombang": r.get("wave_name", ""),
                    "tanggal_tutup": tanggal_tutup,
                    "link_pembayaran": f"{settings.ppdb_frontend_url}/payment",
                },
            )
        sent_count += 1

    logger.info(
        "Cron payment_reminder_monday: eligible=%d, sent=%d, skipped=%d, dry_run=%s",
        len(eligible),
        sent_count,
        skipped_recent,
        body.dry_run,
    )

    return {
        "message": "Selesai"
        if not body.dry_run
        else "Dry run — tidak ada yang dikirim",
        "total_eligible": len(eligible),
        "sent": sent_count,
        "skipped_recent": skipped_recent,
        "dry_run": body.dry_run,
    }


# ── TRIGGER: Gelombang Ditutup / Kuota Penuh ────────────────────────────────


class WaveClosedTriggerRequest(BaseModel):
    """Payload dikirim saat gelombang ditutup (kuota penuh atau tanggal berakhir)."""

    wave_id: str
    reason: str = "quota_full"


@router.post("/trigger/wave-closed")
async def trigger_wave_closed(
    body: WaveClosedTriggerRequest,
    _: dict = Depends(require_notification_admin),
):
    """
    Trigger notifikasi wave_closed_pending_payment ke semua pendaftar
    yang tagihan formulirnya masih pending saat gelombang ditutup.
    """
    if not body.wave_id:
        raise HTTPException(status_code=400, detail="wave_id tidak boleh kosong")

    pool = get_raw_pool()

    with pool.connect() as conn:
        wave_rows = (
            conn.execute(
                text("SELECT id, name, period_id FROM ppdb_waves WHERE id = :wid"),
                {"wid": body.wave_id},
            )
            .mappings()
            .all()
        )

    if not wave_rows:
        raise HTTPException(status_code=404, detail="Gelombang tidak ditemukan")
    wave = dict(wave_rows[0])

    with pool.connect() as conn:
        applicant_rows = (
            conn.execute(
                text(
                    """
                SELECT pa.id, pa.user_id, pa.full_name, pa.phone
                FROM ppdb_applicants pa
                WHERE pa.wave_id = :wid
                  AND pa.status = 'pending_payment'
                  AND pa.payment_status = 'pending'
                  AND pa.deleted_at IS NULL
                """
                ),
                {"wid": body.wave_id},
            )
            .mappings()
            .all()
        )

    applicants = [dict(r) for r in applicant_rows]
    cancelled_count = 0
    notified_count = 0

    if applicants:
        with pool.connect() as conn:
            for ap in applicants:
                conn.execute(
                    text(
                        """
                        UPDATE ppdb_payment_transactions
                        SET status = 'cancelled',
                            failure_reason = :reason,
                            updated_at = NOW()
                        WHERE applicant_id = :aid
                          AND status = 'pending'
                        """
                    ),
                    {
                        "aid": ap["id"],
                        "reason": f"Gelombang ditutup: {body.reason}",
                    },
                )

                conn.execute(
                    text(
                        """
                        UPDATE ppdb_applicants
                        SET status = 'expired',
                            payment_status = 'failed',
                            updated_at = NOW()
                        WHERE id = :aid
                          AND status = 'pending_payment'
                        """
                    ),
                    {"aid": ap["id"]},
                )
                cancelled_count += 1

            conn.commit()

        for ap in applicants:
            send_notification(
                event_key="wave_closed_pending_payment",
                recipient_user_id=str(ap["user_id"]),
                context={
                    "nama_gelombang": wave["name"],
                    "link_aplikasi": f"{settings.ppdb_frontend_url}/dashboard",
                },
            )
            notified_count += 1

    logger.info(
        "Trigger wave_closed: wave=%s, reason=%s, cancelled=%d, notified=%d",
        body.wave_id,
        body.reason,
        cancelled_count,
        notified_count,
    )

    return {
        "message": "Proses penutupan gelombang selesai",
        "wave_id": body.wave_id,
        "wave_name": wave["name"],
        "reason": body.reason,
        "cancelled_invoices": cancelled_count,
        "notified": notified_count,
    }
