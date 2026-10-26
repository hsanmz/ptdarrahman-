"""apps/api/src/services/selection_stage_service.py

Selection Stage & Schedule Orchestration Service.
Features:
1. Chronological Date-Stage grouping for mass selection schedules (CBT & Selection Sessions).
2. Same-day exam merging into a single consolidated notification.
3. H-1 cutoff rule: slots for a session close 24 hours before the earliest exam in that batch starts.
   Applicants verified after cutoff wait for the next session/batch.
4. Stage progression rule: subsequent stages are dispatched 3 hours after the previous stage's exam starts.
5. Automated reminders: H-2, H-1, and 1-hour before exams.
6. Anti-ban staggering & idempotency via NotificationLog.
"""

from __future__ import annotations

import logging
import random
import time
from datetime import date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from src.core.config import settings
from src.core.notif_service import send_notifications
from src.models.cbt import ExamSchedule
from src.models.notification import NotificationLog
from src.models.ppdb import PPDBApplicant, PPDBWave
from src.models.selection import SelectionResult, SelectionSession

logger = logging.getLogger("ptdarrahman.selection_stage")
WIB = ZoneInfo("Asia/Jakarta")


def now_wib() -> datetime:
    return datetime.now(WIB)


class SelectionStageService:
    def __init__(self, db: Session):
        self.db = db

    # ── 1. Batch & Schedule Lookup ───────────────────────────────────────────

    def get_all_schedules_for_wave(
        self, wave_id: str, batch_name: str | None = None
    ) -> list[dict[str, Any]]:
        """Mengambil seluruh jadwal CBT dan Sesi Seleksi untuk suatu gelombang,
        bisa difilter berdasarkan nama batch/kloter."""
        today = now_wib().date()

        # 1. CBT Schedules
        cbt_q = self.db.query(ExamSchedule).filter(
            ExamSchedule.wave_id == wave_id,
            ExamSchedule.status != "cancelled",
        )
        if batch_name:
            cbt_q = cbt_q.filter(
                or_(
                    ExamSchedule.batch_name == batch_name,
                    ExamSchedule.batch_name.is_(None),
                )
            )
        cbt_rows = cbt_q.all()

        # 2. Selection Sessions (Tahfidz, Wawancara Santri, Wawancara Ortu)
        sess_q = self.db.query(SelectionSession).filter(
            SelectionSession.wave_id == wave_id,
        )
        if batch_name:
            sess_q = sess_q.filter(
                or_(
                    SelectionSession.batch_name == batch_name,
                    SelectionSession.batch_name.is_(None),
                )
            )
        sess_rows = sess_q.all()

        results: list[dict[str, Any]] = []

        for c in cbt_rows:
            if not c.session_date or not c.start_time:
                continue
            loc = c.meeting_url if c.mode == "online" else (c.location or "Lab CBT PTDARRAHMAN")
            results.append({
                "id": c.id,
                "type": "cbt",
                "category": c.category,
                "name": c.name,
                "batch_name": c.batch_name,
                "session_date": c.session_date,
                "start_time": c.start_time,
                "end_time": c.end_time or "Selesai",
                "mode": c.mode,
                "location": loc,
            })

        for s in sess_rows:
            if not s.session_date or not s.start_time:
                continue
            loc = s.meeting_url if s.mode == "online" else (s.location or "Kampus PTDARRAHMAN")
            results.append({
                "id": s.id,
                "type": "selection_session",
                "category": s.session_type or "selection",
                "name": s.name,
                "batch_name": s.batch_name,
                "session_date": s.session_date,
                "start_time": s.start_time,
                "end_time": s.end_time or "Selesai",
                "mode": s.mode or "offline",
                "location": loc,
            })

        # Urutkan berdasarkan tanggal lalu jam mulai
        results.sort(key=lambda x: (x["session_date"], x["start_time"]))
        return results

    def get_batches_summary_for_wave(self, wave_id: str) -> list[dict[str, Any]]:
        """Mengelompokkan jadwal berdasarkan batch_name, menentukan cutoff H-1
        dan status apakah batch masih buka atau sudah ditutup."""
        schedules = self.get_all_schedules_for_wave(wave_id)
        if not schedules:
            return []

        batches: dict[str, list[dict[str, Any]]] = {}
        for s in schedules:
            b_name = s.get("batch_name") or "Sesi 1"
            batches.setdefault(b_name, []).append(s)

        now = now_wib()
        summary: list[dict[str, Any]] = []

        for b_name, items in batches.items():
            items.sort(key=lambda x: (x["session_date"], x["start_time"]))
            earliest = items[0]
            try:
                start_t = datetime.strptime(earliest["start_time"], "%H:%M").time()
            except ValueError:
                start_t = datetime.strptime("08:00", "%H:%M").time()

            earliest_dt = datetime.combine(earliest["session_date"], start_t, tzinfo=WIB)
            cutoff_dt = earliest_dt - timedelta(days=1)  # H-1 sebelum tes pertama dimulai

            is_open = now < cutoff_dt
            is_completed = now > datetime.combine(
                items[-1]["session_date"],
                datetime.strptime(items[-1].get("end_time") or "23:59", "%H:%M").time()
                if items[-1].get("end_time") and ":" in items[-1]["end_time"]
                else datetime.strptime("17:00", "%H:%M").time(),
                tzinfo=WIB,
            )

            # Stage dates in this batch
            stage_dates = sorted(list({x["session_date"] for x in items}))

            summary.append({
                "batch_name": b_name,
                "is_open": is_open,
                "is_completed": is_completed,
                "cutoff_datetime": cutoff_dt,
                "earliest_datetime": earliest_dt,
                "schedules": items,
                "stage_dates": stage_dates,
                "total_stages": len(stage_dates),
            })

        summary.sort(key=lambda x: x["earliest_datetime"])
        return summary

    def find_eligible_batch_for_applicant(
        self, wave_id: str, preferred_batch: str | None = None
    ) -> dict[str, Any] | None:
        """Cari batch yang masih terbuka (sebelum H-1 tes pertama) untuk pendaftar."""
        batches = self.get_batches_summary_for_wave(wave_id)
        if not batches:
            return None

        if preferred_batch:
            for b in batches:
                if b["batch_name"] == preferred_batch:
                    return b

        # Cari batch pertama yang masih open (belum melewati cutoff H-1)
        for b in batches:
            if b["is_open"]:
                return b

        return None

    # ── 2. Stage Grouping & Message Formatting ───────────────────────────────

    def group_schedules_into_stages(
        self, schedules: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """Kelompokkan jadwal berdasarkan tanggal. Jika beberapa ujian di hari yang sama,
        digabung menjadi 1 stage."""
        if not schedules:
            return []

        stages_dict: dict[date, list[dict[str, Any]]] = {}
        for s in schedules:
            stages_dict.setdefault(s["session_date"], []).append(s)

        stages: list[dict[str, Any]] = []
        stage_idx = 1
        for s_date in sorted(stages_dict.keys()):
            day_events = sorted(stages_dict[s_date], key=lambda x: x["start_time"])
            earliest_time = day_events[0]["start_time"]
            latest_time = day_events[-1]["end_time"]

            try:
                start_t = datetime.strptime(earliest_time, "%H:%M").time()
            except ValueError:
                start_t = datetime.strptime("08:00", "%H:%M").time()
            stage_start_dt = datetime.combine(s_date, start_t, tzinfo=WIB)

            if len(day_events) > 1:
                exam_name = " & ".join([e["name"] for e in day_events])
                time_range = f"{earliest_time} - {latest_time}"
                loc_list = [f"• {e['name']}: {e['location']}" for e in day_events]
                exam_loc = "\n".join(loc_list)
            else:
                exam_name = day_events[0]["name"]
                time_range = f"{earliest_time} - {latest_time}"
                exam_loc = day_events[0]["location"]

            stages.append({
                "stage_number": stage_idx,
                "session_date": s_date,
                "start_datetime": stage_start_dt,
                "earliest_time": earliest_time,
                "latest_time": latest_time,
                "time_range": time_range,
                "exam_name": exam_name,
                "location": exam_loc,
                "events": day_events,
            })
            stage_idx += 1

        return stages

    # ── 3. Dispatch Stage 1 (Initial / Upon Verification or Creation) ─────────

    def dispatch_stage_1_to_applicant(
        self, applicant_id: str, wave_id: str
    ) -> bool:
        """Kirim Stage 1 ke pendaftar jika ada batch yang valid dan terbuka.
        Jika belum ada jadwal atau sudah lewat H-1, pendaftar menunggu batch berikutnya."""
        applicant = self.db.query(PPDBApplicant).filter(PPDBApplicant.id == applicant_id).first()
        if not applicant or not applicant.user_id:
            return False

        # Pastikan atau buat SelectionResult
        s_res = self.db.query(SelectionResult).filter(SelectionResult.applicant_id == applicant_id).first()
        if not s_res:
            s_res = SelectionResult(
                id=f"selres-{applicant_id}",
                applicant_id=applicant_id,
                batch_name=None,
                current_stage=0,
                created_at=now_wib(),
                updated_at=now_wib(),
            )
            self.db.add(s_res)
            self.db.commit()

        # Cari batch terbuka
        batch = self.find_eligible_batch_for_applicant(wave_id, s_res.batch_name)
        if not batch:
            logger.info("Applicant %s waiting for selection schedule (no open batch)", applicant_id)
            return False

        stages = self.group_schedules_into_stages(batch["schedules"])
        if not stages:
            return False

        stage_1 = stages[0]

        # Cek apakah Stage 1 sudah pernah dikirim
        already_sent = (
            self.db.query(NotificationLog.id)
            .filter(
                NotificationLog.recipient_user_id == applicant.user_id,
                NotificationLog.event_key == "session_confirmed",
                NotificationLog.status.in_(("queued", "sent")),
                NotificationLog.body_sent.like(f"%{stage_1['session_date']}%"),
            )
            .first()
        )
        if already_sent:
            s_res.batch_name = batch["batch_name"]
            s_res.current_stage = max(s_res.current_stage or 0, 1)
            self.db.commit()
            return False

        # Kirim notifikasi Stage 1
        send_notifications(
            [
                (
                    "session_confirmed",
                    {
                        "nama_ujian": stage_1["exam_name"],
                        "tanggal": str(stage_1["session_date"]),
                        "jam_mulai": stage_1["earliest_time"],
                        "jam_selesai": stage_1["latest_time"],
                        "lokasi_atau_link": stage_1["location"],
                        "link_aplikasi": f"{settings.ppdb_frontend_url}/dashboard",
                    },
                )
            ],
            applicant.user_id,
        )

        s_res.batch_name = batch["batch_name"]
        s_res.current_stage = 1
        s_res.last_stage_sent_at = now_wib()
        s_res.updated_at = now_wib()
        self.db.commit()

        logger.info(
            "Stage 1 dispatched to applicant %s for batch %s date %s",
            applicant_id,
            batch["batch_name"],
            stage_1["session_date"],
        )
        return True

    # ── 4. Periodic Stage Progressor (3 Hours Rule) ──────────────────────────

    def check_and_advance_stages(self) -> int:
        """Dipanggil oleh background scheduler loop (setiap 60s).
        Mengecek pendaftar yang sedang di tahap seleksi:
        - Jika Stage 1 belum dikirim dan batch open: kirim Stage 1.
        - Jika Stage i sudah dikirim dan sekarang >= (waktu mulai Stage i + 3 jam):
          Kirim Stage i+1 jika ada jadwal di hari berikutnya!
        """
        now = now_wib()
        dispatched_count = 0

        # Cari semua pendaftar yang statusnya selection / document_approved
        applicants = (
            self.db.query(PPDBApplicant)
            .filter(
                PPDBApplicant.status.in_(("selection", "document_approved")),
                PPDBApplicant.deleted_at.is_(None),
            )
            .all()
        )

        for app in applicants:
            if not app.user_id or not app.wave_id:
                continue

            s_res = (
                self.db.query(SelectionResult)
                .filter(SelectionResult.applicant_id == app.id)
                .first()
            )
            if not s_res:
                s_res = SelectionResult(
                    id=f"selres-{app.id}",
                    applicant_id=app.id,
                    batch_name=None,
                    current_stage=0,
                    created_at=now,
                    updated_at=now,
                )
                self.db.add(s_res)
                self.db.commit()

            batch = self.find_eligible_batch_for_applicant(app.wave_id, s_res.batch_name)
            if not batch:
                continue

            stages = self.group_schedules_into_stages(batch["schedules"])
            if not stages:
                continue

            cur_stage_num = s_res.current_stage or 0

            # Jika belum dapat Stage 1 sama sekali
            if cur_stage_num == 0:
                # Pastikan batch masih open
                if batch["is_open"]:
                    if self.dispatch_stage_1_to_applicant(app.id, app.wave_id):
                        dispatched_count += 1
                        time.sleep(random.uniform(2.0, 4.0))  # Anti-ban throttle
                continue

            # Jika sudah di Stage k, cek apakah ada Stage k+1
            next_stage_num = cur_stage_num + 1
            if next_stage_num > len(stages):
                # Sudah di stage terakhir, tidak ada stage lanjutan
                continue

            prev_stage = stages[cur_stage_num - 1]
            next_stage = stages[next_stage_num - 1]

            # Aturan Bisnis 3 Jam:
            # Jadwal tahap selanjutnya dikirim 3 jam setelah jadwal ujian sebelumnya dimulai
            trigger_time = prev_stage["start_datetime"] + timedelta(hours=3)

            if now >= trigger_time:
                # Cek apakah next_stage sudah dikirim (idempotency check)
                already_sent = (
                    self.db.query(NotificationLog.id)
                    .filter(
                        NotificationLog.recipient_user_id == app.user_id,
                        NotificationLog.event_key == "session_confirmed",
                        NotificationLog.status.in_(("queued", "sent")),
                        NotificationLog.body_sent.like(f"%{next_stage['session_date']}%"),
                    )
                    .first()
                )

                if already_sent:
                    s_res.current_stage = next_stage_num
                    self.db.commit()
                    continue

                # Kirim jadwal Stage k+1
                send_notifications(
                    [
                        (
                            "session_confirmed",
                            {
                                "nama_ujian": next_stage["exam_name"],
                                "tanggal": str(next_stage["session_date"]),
                                "jam_mulai": next_stage["earliest_time"],
                                "jam_selesai": next_stage["latest_time"],
                                "lokasi_atau_link": next_stage["location"],
                                "link_aplikasi": f"{settings.ppdb_frontend_url}/dashboard",
                            },
                        )
                    ],
                    app.user_id,
                )

                s_res.current_stage = next_stage_num
                s_res.last_stage_sent_at = now
                s_res.updated_at = now
                self.db.commit()
                dispatched_count += 1

                logger.info(
                    "Advanced to Stage %d for applicant %s (%s) 3h post previous exam start",
                    next_stage_num,
                    app.id,
                    next_stage["exam_name"],
                )
                time.sleep(random.uniform(2.0, 4.0))  # Anti-ban throttle

        return dispatched_count

    # ── 5. Reminders: H-2, H-1, and 1-Hour ────────────────────────────────────

    def send_exam_reminders(self) -> dict[str, int]:
        """Kirim pengingat H-2, H-1, dan 1 jam sebelum ujian dimulai."""
        now = now_wib()
        sent_counts = {"h2": 0, "h1": 0, "1hour": 0}

        # Rentang waktu:
        # H-2: antara 47 jam sampai 49 jam sebelum mulai
        h2_start = now + timedelta(hours=47)
        h2_end = now + timedelta(hours=49)

        # H-1: antara 23 jam sampai 25 jam sebelum mulai
        h1_start = now + timedelta(hours=23)
        h1_end = now + timedelta(hours=25)

        # 1 Jam: antara 55 menit sampai 65 menit sebelum mulai
        h1h_start = now + timedelta(minutes=55)
        h1h_end = now + timedelta(minutes=65)

        # Ambil gelombang aktif
        waves = self.db.query(PPDBWave).filter(PPDBWave.is_active.is_(True)).all()
        for wave in waves:
            schedules = self.get_all_schedules_for_wave(wave.id)
            if not schedules:
                continue

            # Ambil pendaftar aktif di gelombang ini
            applicants = (
                self.db.query(PPDBApplicant)
                .filter(
                    PPDBApplicant.wave_id == wave.id,
                    PPDBApplicant.status.in_(("selection", "document_approved")),
                    PPDBApplicant.deleted_at.is_(None),
                )
                .all()
            )
            if not applicants:
                continue

            for s in schedules:
                try:
                    s_time = datetime.strptime(s["start_time"], "%H:%M").time()
                except ValueError:
                    continue

                exam_start_dt = datetime.combine(s["session_date"], s_time, tzinfo=WIB)

                # Cek target reminder
                target_type = None
                if h1h_start <= exam_start_dt <= h1h_end:
                    target_type = "1hour"
                    event_key = "reminder_exam_1hour"
                elif h1_start <= exam_start_dt <= h1_end:
                    target_type = "h1"
                    event_key = "reminder_exam_h1"
                elif h2_start <= exam_start_dt <= h2_end:
                    target_type = "h2"
                    event_key = "reminder_exam_h2"

                if not target_type:
                    continue

                # Kirim ke pendaftar
                for app in applicants:
                    if not app.user_id:
                        continue

                    # Idempotency check: jangan kirim duplicate reminder dalam 24 jam terakhir
                    already_sent = (
                        self.db.query(NotificationLog.id)
                        .filter(
                            NotificationLog.recipient_user_id == app.user_id,
                            NotificationLog.event_key == event_key,
                            NotificationLog.status.in_(("queued", "sent")),
                            NotificationLog.created_at >= now.replace(tzinfo=None) - timedelta(hours=24),
                            NotificationLog.body_sent.like(f"%{s['name']}%"),
                        )
                        .first()
                    )
                    if already_sent:
                        continue

                    send_notifications(
                        [
                            (
                                event_key,
                                {
                                    "nama_ujian": s["name"],
                                    "tanggal": str(s["session_date"]),
                                    "waktu": s["start_time"],
                                    "lokasi_atau_link": s["location"],
                                    "link_aplikasi": f"{settings.ppdb_frontend_url}/dashboard",
                                },
                            )
                        ],
                        app.user_id,
                    )
                    sent_counts[target_type] += 1
                    time.sleep(random.uniform(1.5, 3.0))  # Anti-ban stagger

        return sent_counts
