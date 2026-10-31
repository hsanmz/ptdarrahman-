"""apps/api/src/core/scheduler.py

Automated Scheduler Service for PPDB PTDARRAHMAN.
Features:
- Background worker thread with Asia/Jakarta timezone.
- Periodic cleanup of expired / revoked auth tokens & sessions.
- Concurrency-safe execution.
"""

from __future__ import annotations

import datetime
import logging
import threading
import time
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from src.core.database import get_sessionmaker

logger = logging.getLogger("ptdarrahman.scheduler")
WIB = ZoneInfo("Asia/Jakarta")

_scheduler_running = False
_scheduler_thread: threading.Thread | None = None


def cleanup_expired_sessions(db: Session | None = None) -> int:
    """Hapus semua refresh token yang sudah kedaluwarsa atau dicabut dari database
    agar tidak menumpuk."""
    from src.models.auth import RefreshToken

    should_close = False
    if db is None:
        db = get_sessionmaker()()
        should_close = True
    try:
        now = datetime.datetime.now(WIB)
        deleted = int(
            db.query(RefreshToken)
            .filter((RefreshToken.revoked.is_(True)) | (RefreshToken.expires_at <= now))
            .delete(synchronize_session=False)
        )
        db.commit()
        if deleted > 0:
            logger.info(
                "Scheduler: %d sesi kedaluwarsa/revoked berhasil dibersihkan dari DB.",
                deleted,
            )
        return deleted
    except Exception as exc:
        db.rollback()
        logger.warning("Scheduler: Gagal membersihkan sesi kedaluwarsa: %s", exc)
        return 0
    finally:
        if should_close:
            db.close()


def _scheduler_loop():
    """Run maintenance and PPDB reminder jobs in Asia/Jakarta time."""
    global _scheduler_running
    logger.info("PPDB Maintenance Scheduler background runner started (WIB).")

    last_cleanup_hour: int | None = None
    last_daily_notification_run: datetime.date | None = None
    last_monday_notification_run: datetime.date | None = None

    # Bersihkan sesi kedaluwarsa sekali saat scheduler pertama kali aktif
    try:
        cleanup_expired_sessions()
    except Exception as exc:
        logger.warning("Pembersihan awal sesi kedaluwarsa gagal: %s", exc)

    while _scheduler_running:
        try:
            now_wib = datetime.datetime.now(WIB)

            # Pembersihan berkala setiap jam agar database tidak menumpuk token usang
            if last_cleanup_hour != now_wib.hour:
                cleanup_expired_sessions()
                last_cleanup_hour = now_wib.hour

            # Reminder endpoints remain available for an external scheduler, while
            # this in-process runner ensures the standard PPDB reminders are active
            # in the regular API deployment too.
            if now_wib.hour >= 8 and last_daily_notification_run != now_wib.date():
                from src.modules.notifications.router import (
                    ScheduledReminderRequest,
                    cron_reminder_upload_docs_h3,
                )

                cron_reminder_upload_docs_h3(ScheduledReminderRequest(), {})
                last_daily_notification_run = now_wib.date()

            if (
                now_wib.weekday() == 0
                and now_wib.hour >= 8
                and last_monday_notification_run != now_wib.date()
            ):
                from src.modules.notifications.router import (
                    MondayReminderRequest,
                    cron_payment_reminder_monday,
                )

                cron_payment_reminder_monday(MondayReminderRequest(), {})
                last_monday_notification_run = now_wib.date()

            from src.services.selection_stage_service import SelectionStageService

            db = get_sessionmaker()()
            try:
                stage_svc = SelectionStageService(db)
                stage_svc.check_and_advance_stages()
                stage_svc.send_exam_reminders()
            finally:
                db.close()

        except Exception as exc:
            logger.error("Error in scheduler background loop: %s", exc)

        # Sleep for 60 seconds
        time.sleep(60)


def start_scheduler():
    global _scheduler_running, _scheduler_thread
    if not _scheduler_running:
        _scheduler_running = True
        _scheduler_thread = threading.Thread(
            target=_scheduler_loop, daemon=True, name="ppdb-scheduler"
        )
        _scheduler_thread.start()


def stop_scheduler():
    global _scheduler_running
    _scheduler_running = False
