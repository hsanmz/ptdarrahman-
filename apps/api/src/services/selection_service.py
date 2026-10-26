from datetime import date, datetime, timedelta
from typing import Any
from uuid import uuid4
from zoneinfo import ZoneInfo

from fastapi import HTTPException

from src.core.notif_service import send_notifications
from src.models.ppdb import NotificationLog
from src.models.selection import (
    SelectionCategory,
    SelectionCriteria,
    SelectionScore,
    SelectionSession,
)
from src.modules.selection.schemas import (
    ApplicantScoreSave,
    ApplicantStatusUpdate,
    CategoryCreate,
    CriteriaCreate,
    CriteriaUpdate,
    SessionCreate,
    SessionUpdate,
)
from src.repositories.ppdb_scope import get_active_period, get_wave_ids_in_period
from src.repositories.selection_repository import SelectionRepository

WIB = ZoneInfo("Asia/Jakarta")


def _now_wib() -> datetime:
    return datetime.now(WIB).replace(tzinfo=None)


def _parse_session_date(raw: str | None) -> date | None:
    if not raw:
        return None
    try:
        return date.fromisoformat(raw)
    except ValueError as exc:
        raise HTTPException(
            status_code=400, detail="Format tanggal sesi tidak valid (YYYY-MM-DD)"
        ) from exc


def _notify_assessment_completed_once(db: Any, applicant: Any, stage_name: str) -> None:
    if not applicant.user_id or not stage_name:
        return
    already_notified = (
        db.query(NotificationLog.id)
        .filter(
            NotificationLog.recipient_user_id == applicant.user_id,
            NotificationLog.event_key == "assessment_stage_completed",
            NotificationLog.status.in_(("queued", "sent")),
            NotificationLog.body_sent.like(f"%{stage_name}%"),
        )
        .first()
    )
    if already_notified:
        return

    from src.core.config import settings

    send_notifications(
        [
            (
                "assessment_stage_completed",
                {
                    "nama_tahap": stage_name,
                    "link_aplikasi": f"{settings.ppdb_frontend_url}/applicant/tes-seleksi",
                },
            )
        ],
        applicant.user_id,
    )


def selection_score_gaps(db: Any, applicant: Any) -> list[str]:
    """Komponen nilai yang belum lengkap untuk sebuah pendaftar.

    Keputusan kelulusan (lulus/tidak lulus) hanya boleh ditetapkan setelah
    seluruh nilai wajib masuk:
    - rubrik Tahfidz,
    - rubrik Wawancara,
    - seluruh kriteria pada kategori rubrik lain milik gelombang/global.

    Mengembalikan daftar label komponen yang belum lengkap (kosong = lengkap).
    """
    from sqlalchemy import and_, or_, select

    wave_id = getattr(applicant, "wave_id", None)
    stmt = (
        select(SelectionCategory.name, SelectionScore.score)
        .join(SelectionCriteria, SelectionCriteria.category_id == SelectionCategory.id)
        .outerjoin(
            SelectionScore,
            and_(
                SelectionScore.criteria_id == SelectionCriteria.id,
                SelectionScore.applicant_id == applicant.id,
            ),
        )
        .where(
            or_(
                SelectionCategory.wave_id == "global",
                SelectionCategory.wave_id == wave_id,
            )
        )
        .order_by(SelectionCategory.created_at, SelectionCriteria.created_at)
    )
    rows = db.execute(stmt).all()

    scores_by_category: dict[str, list[Any]] = {}
    for category_name, score in rows:
        scores_by_category.setdefault(category_name, []).append(score)

    def _label(category_name: str) -> str:
        low = category_name.casefold()
        if "tahfidz" in low:
            return "ujian Tahfidz"
        if "wawancara" in low:
            return "ujian Wawancara"
        return f"rubrik {category_name}"

    gaps: list[str] = []

    # Seluruh kriteria tiap kategori rubrik harus terisi nilainya.
    for name, scores in scores_by_category.items():
        if not scores or any(score is None for score in scores):
            gaps.append(_label(name))
    if not any("tahfidz" in name.casefold() for name in scores_by_category):
        gaps.append("ujian Tahfidz")
    if not any("wawancara" in name.casefold() for name in scores_by_category):
        gaps.append("ujian Wawancara")

    deduped: list[str] = []
    for gap in gaps:
        if gap not in deduped:
            deduped.append(gap)
    return deduped


class SelectionService:
    def __init__(self, repo: SelectionRepository):
        self.repo = repo

    def _get_active_wave_id_or_400(self) -> str:
        wave_id = self.repo.get_active_wave_id()
        if not wave_id:
            raise HTTPException(
                status_code=400, detail="Tidak ada gelombang yang sedang aktif."
            )
        return wave_id

    def get_sessions(self, session_type: str | None = None) -> list[dict[str, Any]]:
        """Daftar sesi admin dari seluruh gelombang dalam PERIODE aktif.

        Bila tidak ada periode aktif, hasilnya kosong (bukan lintas periode).
        """
        active_period = get_active_period(self.repo.db)
        if not active_period:
            return []
        wave_ids = get_wave_ids_in_period(self.repo.db, active_period.id)
        return self.repo.get_sessions_with_booking_details(
            wave_ids, session_type=session_type
        )

    def _require_active_wave_session(self, session_id: str):
        """Ambil sesi dan pastikan milik gelombang aktif (404 jika tidak)."""
        wave_id = self._get_active_wave_id_or_400()
        session = self.repo.get_session_by_id(session_id)
        if not session or session.wave_id != wave_id:
            raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")
        return session

    def create_session(
        self, body: SessionCreate, creator_user_id: str | None = None
    ) -> dict[str, Any]:
        now = _now_wib()
        sess_date = _parse_session_date(body.session_date)
        wave_id = getattr(body, "wave_id", None) or self._get_active_wave_id_or_400()
        sid = str(uuid4())
        quota = body.quota  # 0 = massal / seluruh pendaftar gelombang
        session = SelectionSession(
            id=sid,
            wave_id=wave_id,
            name=body.name,
            session_type=body.session_type,
            batch_name=getattr(body, "batch_name", None),
            session_date=sess_date,
            start_time=body.start_time,
            end_time=body.end_time,
            mode=body.mode,
            officer_name=body.officer_name,
            location=body.location,
            meeting_url=str(body.meeting_url) if body.meeting_url else None,
            description=body.description,
            quota=quota,
            created_by=creator_user_id,
            created_at=now,
            updated_at=now,
        )
        self.repo.create_session(session)
        self.repo.db.commit()

        # Otomatis cek dan jalankan stage progression / pengiriman jadwal bertahap dengan anti-ban delay
        try:
            from src.services.selection_stage_service import SelectionStageService

            SelectionStageService(self.repo.db).check_and_advance_stages()
        except Exception:
            pass

        return {"id": sid, "message": "Jadwal seleksi berhasil dibuat"}

    def get_session_evaluation_detail(
        self, session_id: str, applicant_id: str | None = None
    ) -> dict[str, Any]:
        from sqlalchemy import or_

        from src.models.selection import SelectionResult
        from src.repositories.ppdb_repository import PPDBRepository

        session = self.repo.get_session_by_id(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")

        # Cari pendaftar yang terdaftar pada sesi ini
        query = self.repo.db.query(SelectionResult).filter(
            or_(
                SelectionResult.session_id == session_id,
                SelectionResult.interview_session_id == session_id,
                SelectionResult.interview_parent_session_id == session_id,
            )
        )
        if applicant_id:
            s_res = query.filter(SelectionResult.applicant_id == applicant_id).first()
            if not s_res:
                s_res = self.repo.db.query(SelectionResult).filter(
                    SelectionResult.applicant_id == applicant_id
                ).first()
        else:
            s_res = query.first()

        if not s_res or not s_res.applicant_id:
            raise HTTPException(
                status_code=400,
                detail="Belum ada pendaftar yang terdaftar di sesi seleksi ini.",
            )

        ppdb_repo = PPDBRepository(self.repo.db)
        applicant_detail = ppdb_repo.get_applicant_detail(s_res.applicant_id)
        if not applicant_detail:
            raise HTTPException(
                status_code=404, detail="Data pendaftar tidak ditemukan."
            )

        # Dokumen pendaftar
        applicant_detail["documents"] = ppdb_repo.get_applicant_documents(
            s_res.applicant_id
        )

        # Nilai Tahfidz yang sudah ada
        tahfidz_scores = []
        scores_rows = self.repo.get_applicant_scores_with_details(s_res.applicant_id)
        for sc, c_name, cat_name in scores_rows:
            if "tahfidz" in (cat_name or "").lower():
                tahfidz_scores.append(
                    {
                        "score": sc,
                        "criteria_name": c_name,
                        "category_name": cat_name,
                    }
                )

        # Ambil rubrik sesuai jenis sesi (Tahfidz atau Wawancara)
        stype = (session.session_type or "tahfidz").lower()
        target_keyword = (
            "wawancara" if ("wawancara" in stype or "interview" in stype) else "tahfidz"
        )

        all_categories = list(self.repo.get_categories("global")) + list(
            self.repo.get_categories(session.wave_id)
        )
        seen_cat_ids = set()
        matched_categories = []

        for cat in all_categories:
            if cat.id in seen_cat_ids:
                continue
            seen_cat_ids.add(cat.id)
            if target_keyword in (cat.name or "").lower():
                crit_list = self.repo.get_criteria_by_category(cat.id)
                matched_categories.append(
                    {
                        "id": cat.id,
                        "name": cat.name,
                        "criteria": [
                            {
                                "id": cr.id,
                                "name": cr.name,
                                "description": cr.description,
                                "weight": cr.weight,
                            }
                            for cr in crit_list
                        ],
                    }
                )

        if not matched_categories:
            for cat in all_categories:
                if cat.id in seen_cat_ids:
                    continue
                seen_cat_ids.add(cat.id)
                crit_list = self.repo.get_criteria_by_category(cat.id)
                matched_categories.append(
                    {
                        "id": cat.id,
                        "name": cat.name,
                        "criteria": [
                            {
                                "id": cr.id,
                                "name": cr.name,
                                "description": cr.description,
                                "weight": cr.weight,
                            }
                            for cr in crit_list
                        ],
                    }
                )

        existing_scores = {}
        for sc, c_name, cat_name in scores_rows:
            for m_cat in matched_categories:
                for cr in m_cat["criteria"]:
                    if cr["name"] == c_name and m_cat["name"] == cat_name:
                        existing_scores[cr["id"]] = sc

        sess_dict = session.__dict__.copy()
        sess_dict.pop("_sa_instance_state", None)

        return {
            "session": sess_dict,
            "applicant": applicant_detail,
            "categories": matched_categories,
            "existing_scores": existing_scores,
            "evaluator_notes": s_res.notes or "",
            "tahfidz_scores": tahfidz_scores,
            "graduation_status": s_res.graduation_status,
        }

    def update_session(self, session_id: str, body: SessionUpdate) -> dict[str, Any]:
        now = _now_wib()
        session = self._require_active_wave_session(session_id)
        old_schedule = (
            session.name,
            session.session_date,
            session.start_time,
            session.end_time,
            session.mode,
            session.location,
            session.meeting_url,
        )
        assigned_applicants = self.repo.get_applicants_in_session(
            session_id, session_type=session.session_type or "tahfidz"
        )

        session.name = body.name
        session.session_type = body.session_type
        if getattr(body, "wave_id", None):
            session.wave_id = body.wave_id
        if hasattr(session, "batch_name"):
            session.batch_name = getattr(body, "batch_name", None)
        session.session_date = _parse_session_date(body.session_date)
        session.start_time = body.start_time
        session.end_time = body.end_time
        session.mode = body.mode
        session.officer_name = body.officer_name
        session.location = body.location
        session.meeting_url = str(body.meeting_url) if body.meeting_url else None
        session.description = body.description
        session.quota = body.quota
        session.updated_at = now

        self.repo.update_session(session)
        self.repo.db.commit()

        new_schedule = (
            session.name,
            session.session_date,
            session.start_time,
            session.end_time,
            session.mode,
            session.location,
            session.meeting_url,
        )
        if old_schedule != new_schedule:
            from src.core.config import settings

            location_or_link = session.meeting_url or session.location or "-"
            for applicant in assigned_applicants:
                if not applicant.user_id:
                    continue
                try:
                    send_notifications(
                        [
                            (
                                "session_confirmed",
                                {
                                    "nama_ujian": f"{session.name} (Jadwal Diperbarui)",
                                    "tanggal": str(session.session_date or "-"),
                                    "jam_mulai": session.start_time or "-",
                                    "jam_selesai": session.end_time or "-",
                                    "lokasi_atau_link": location_or_link,
                                    "link_aplikasi": f"{settings.ppdb_frontend_url}/applicant/tes-seleksi",
                                },
                            )
                        ],
                        applicant.user_id,
                    )
                except Exception:
                    import logging

                    logging.getLogger("ptdarrahman.selection").exception(
                        "Failed to notify applicant about updated selection schedule"
                    )
        return {"message": "Sesi berhasil diperbarui"}

    def delete_session(self, session_id: str) -> dict[str, Any]:
        self._require_active_wave_session(session_id)
        self.repo.delete_session(session_id)
        self.repo.db.commit()
        return {"message": "Sesi berhasil dihapus"}

    def broadcast_session(self, session_id: str, message: str) -> dict[str, Any]:
        session = self._require_active_wave_session(session_id)

        applicants = self.repo.get_applicants_in_session(session_id)
        for app in applicants:
            send_notifications(
                [
                    (
                        "selection_session_broadcast",
                        {"custom_message": message, "session_name": session.name},
                    )
                ],
                app.user_id,
            )
        return {"message": f"Notifikasi berhasil dikirim ke {len(applicants)} peserta."}

    def get_categories(self) -> list[dict[str, Any]]:
        now = _now_wib()
        required_cats = ["Tahfidz", "Wawancara Santri", "Wawancara Orang Tua"]

        # Kategori bersifat global (tidak terikat gelombang aktif)
        existing = (
            self.repo.db.query(SelectionCategory)
            .filter(SelectionCategory.wave_id == "global")
            .all()
        )
        existing_map = {c.name: c for c in existing}

        # Jika ada kategori lama bernama "Wawancara", ubah menjadi "Wawancara Santri" jika belum ada
        if "Wawancara" in existing_map and "Wawancara Santri" not in existing_map:
            w_cat = existing_map["Wawancara"]
            w_cat.name = "Wawancara Santri"
            w_cat.updated_at = now
            self.repo.db.commit()
            existing = (
                self.repo.db.query(SelectionCategory)
                .filter(SelectionCategory.wave_id == "global")
                .all()
            )
            existing_map = {c.name: c for c in existing}

        default_criteria_seed = {
            "Tahfidz": [
                ("Kelancaran Hafalan Al-Qur'an", 40.0, "Kelancaran hafalan surah & juz yang diujikan"),
                ("Tajwid, Tartil & Makhorijul Huruf", 60.0, "Kaidah tajwid, makhraj, dan kefasihan tilawah"),
            ],
            "Wawancara Santri": [
                ("Motivasi Belajar & Adab Santri", 50.0, "Kemauan kuat menuntut ilmu dan kesantunan akhlak"),
                ("Kemandirian & Kesiapan Mondok", 50.0, "Kesiapan tinggal mandiri di asrama pesantren"),
            ],
            "Wawancara Orang Tua": [
                ("Komitmen Pembinaan & Kerjasama", 50.0, "Dukungan orang tua terhadap program pesantren"),
                ("Dukungan Moral & Tata Tertib", 50.0, "Keselarasan visi pendidikan dan kepatuhan aturan"),
            ],
        }

        has_new = False
        for name in required_cats:
            if name not in existing_map:
                has_new = True
                new_cat = SelectionCategory(
                    id=str(uuid4()),
                    wave_id="global",
                    name=name,
                    created_at=now,
                    updated_at=now,
                )
                self.repo.db.add(new_cat)
                self.repo.db.flush()
                for cr_name, cr_weight, cr_desc in default_criteria_seed.get(name, []):
                    new_crit = SelectionCriteria(
                        id=str(uuid4()),
                        category_id=new_cat.id,
                        name=cr_name,
                        description=cr_desc,
                        weight=cr_weight,
                        created_at=now,
                        updated_at=now,
                    )
                    self.repo.db.add(new_crit)

        if has_new:
            self.repo.db.commit()
            existing = (
                self.repo.db.query(SelectionCategory)
                .filter(SelectionCategory.wave_id == "global")
                .all()
            )

        valid_categories = [c for c in existing if c.name in required_cats]
        order_map = {"Tahfidz": 0, "Wawancara Santri": 1, "Wawancara Orang Tua": 2}
        valid_categories.sort(key=lambda c: order_map.get(c.name, 99))

        result = []
        for c in valid_categories:
            c_dict = c.__dict__.copy()
            c_dict.pop("_sa_instance_state", None)
            crits = self.repo.get_criteria_by_category(c.id)
            c_dict["criteria"] = [cr.__dict__.copy() for cr in crits]
            for cr in c_dict["criteria"]:
                cr.pop("_sa_instance_state", None)
            result.append(c_dict)
        return result

    def create_category(self, body: CategoryCreate) -> dict[str, Any]:
        now = _now_wib()
        cid = str(uuid4())
        cat = SelectionCategory(
            id=cid, wave_id="global", name=body.name, created_at=now, updated_at=now
        )
        self.repo.create_category(cat)
        self.repo.db.commit()
        return {"id": cid, "message": "Kategori berhasil dibuat"}

    def create_criteria(self, category_id: str, body: CriteriaCreate) -> dict[str, Any]:
        now = _now_wib()
        category = self.repo.get_category_by_id(category_id)
        if not category:
            raise HTTPException(status_code=404, detail="Kategori tidak ditemukan")
        current_weight = sum(
            float(item.weight or 0)
            for item in self.repo.get_criteria_by_category(category_id)
        )
        if current_weight + body.weight > 100.000001:
            raise HTTPException(
                status_code=400, detail="Total bobot kriteria tidak boleh melebihi 100%"
            )
        crid = str(uuid4())
        crit = SelectionCriteria(
            id=crid,
            category_id=category_id,
            name=body.name,
            description=body.description,
            weight=body.weight,
            created_at=now,
            updated_at=now,
        )
        self.repo.create_criteria(crit)
        self.repo.db.commit()
        return {"id": crid, "message": "Kriteria berhasil ditambahkan"}

    def update_criteria(self, criteria_id: str, body: CriteriaUpdate) -> dict[str, Any]:
        now = _now_wib()
        criteria = self.repo.get_criteria_by_id(criteria_id)
        if not criteria:
            raise HTTPException(status_code=404, detail="Kriteria tidak ditemukan")
        category = self.repo.get_category_by_id(criteria.category_id)
        if not category:
            raise HTTPException(status_code=404, detail="Kategori tidak ditemukan")
        other_weight = sum(
            float(item.weight or 0)
            for item in self.repo.get_criteria_by_category(category.id)
            if item.id != criteria_id
        )
        if other_weight + body.weight > 100.000001:
            raise HTTPException(
                status_code=400, detail="Total bobot kriteria tidak boleh melebihi 100%"
            )
        criteria.name = body.name
        criteria.description = body.description
        criteria.weight = body.weight
        criteria.updated_at = now
        self.repo.db.commit()
        return {"message": "Kriteria berhasil diperbarui"}

    def delete_category(self, id: str) -> dict[str, Any]:
        category = self.repo.get_category_by_id(id)
        if not category:
            raise HTTPException(status_code=404, detail="Kategori tidak ditemukan")
        self.repo.delete_category(id)
        self.repo.db.commit()
        return {"message": "Kategori dihapus"}

    def delete_criteria(self, id: str) -> dict[str, Any]:
        criteria = self.repo.get_criteria_by_id(id)
        if not criteria:
            raise HTTPException(status_code=404, detail="Kriteria tidak ditemukan")
        self.repo.delete_criteria(id)
        self.repo.db.commit()
        return {"message": "Kriteria dihapus"}

    def get_results(self) -> list[dict[str, Any]]:
        wave_id = self._get_active_wave_id_or_400()
        rows = self.repo.get_results(wave_id)
        results = []
        for s_res, app, s_ses, wave_name in rows:
            rd = {
                "result_id": s_res.id if s_res else None,
                "applicant_id": s_res.applicant_id if s_res else app.id,
                "session_id": s_res.session_id if s_res else None,
                "notes": s_res.notes if s_res else None,
                "full_name": app.full_name,
                "email": app.email,
                "phone": app.phone,
                "applicant_status": app.status,
                "session_name": s_ses.name if s_ses else None,
                "session_date": s_ses.session_date if s_ses else None,
                "location": s_ses.location if s_ses else None,
                "wave_name": wave_name,
            }
            scores = self.repo.get_applicant_scores(app.id)
            rd["scores"] = [
                {"criteria_id": sc.criteria_id, "score": sc.score} for sc in scores
            ]
            results.append(rd)
        return results

    def get_result_by_applicant(self, applicant_id: str) -> dict[str, Any]:
        app = self.repo.get_applicant_by_id(applicant_id)
        if not app:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")
        s_res = self.repo.get_selection_result_by_applicant(applicant_id)
        scores = self.repo.get_applicant_scores(applicant_id)
        return {
            "result_id": s_res.id if s_res else None,
            "applicant_id": applicant_id,
            "session_id": s_res.session_id if s_res else None,
            "notes": s_res.notes if s_res else None,
            "scores": [
                {"criteria_id": sc.criteria_id, "score": sc.score} for sc in scores
            ],
        }

    def save_result(self, body: ApplicantScoreSave) -> dict[str, Any]:
        import math

        now = _now_wib()
        wave_id = self._get_active_wave_id_or_400()
        app = self.repo.get_applicant_by_id(body.applicant_id)
        if not app:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")

        # Catatan evaluasi per santri wajib diisi sebelum menyimpan nilai
        if not body.notes or not body.notes.strip():
            raise HTTPException(
                status_code=400,
                detail="Catatan evaluasi wajib diisi sebelum menyimpan nilai.",
            )

        # Pastikan baris hasil ada dulu agar notes/skor tersimpan.
        self.repo.ensure_selection_result(body.applicant_id, now)
        self.repo.update_selection_result_notes(body.applicant_id, body.notes.strip(), now)

        for sc in body.scores:
            if not math.isfinite(sc.score) or sc.score < 0 or sc.score > 100:
                raise HTTPException(
                    status_code=400, detail="Nilai harus berada di antara 0 dan 100"
                )
            criteria = self.repo.get_criteria_by_id(sc.criteria_id)
            if not criteria:
                raise HTTPException(status_code=400, detail="Kriteria tidak ditemukan")
            category = self.repo.get_category_by_id(criteria.category_id)
            # Kategori global (wave_id="global") valid untuk semua gelombang
            if not category or (
                category.wave_id != "global" and category.wave_id != wave_id
            ):
                raise HTTPException(
                    status_code=400, detail="Kriteria tidak ditemukan atau tidak valid"
                )
            existing = self.repo.get_selection_score(body.applicant_id, sc.criteria_id)
            if existing:
                existing.score = sc.score
                existing.updated_at = now
                self.repo.update_selection_score(existing)
            else:
                new_score = SelectionScore(
                    id=str(uuid4()),
                    applicant_id=body.applicant_id,
                    criteria_id=sc.criteria_id,
                    score=sc.score,
                    created_at=now,
                    updated_at=now,
                )
                self.repo.add_selection_score(new_score)

        self.repo.db.commit()

        # Notifikasi berdasarkan tipe sesi yang diassign ke pendaftar (Fase 3 spec).
        try:
            app = self.repo.get_applicant_by_id(body.applicant_id)
            if app:
                first_crit = (
                    self.repo.get_criteria_by_id(body.scores[0].criteria_id)
                    if body.scores
                    else None
                )
                cat = (
                    self.repo.get_category_by_id(first_crit.category_id)
                    if first_crit
                    else None
                )
                cat_name = (cat.name or "").lower() if cat else ""

                if cat_name:
                    _notify_assessment_completed_once(
                        self.repo.db, app, cat.name
                    )
        except Exception:
            import logging

            logging.getLogger("ptdarrahman.selection").exception(
                "score-recorded notification failed; continuing"
            )

        return {"message": "Nilai berhasil disimpan"}

    def save_results_bulk(
        self, items: list[ApplicantScoreSave]
    ) -> dict[str, Any]:
        if not items:
            return {"message": "Tidak ada data nilai yang disimpan", "count": 0}
        for item in items:
            self.save_result(item)
        return {
            "message": f"Berhasil menyimpan {len(items)} penilaian peserta",
            "count": len(items),
        }

    def update_applicant_status(
        self, applicant_id: str, body: ApplicantStatusUpdate
    ) -> dict[str, Any]:
        now = _now_wib()
        app = self.repo.get_applicant_by_id(applicant_id)
        if not app:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")
        previous_status = app.status

        if body.status not in ["passed", "failed", "selection"]:
            raise HTTPException(status_code=400, detail="Status tidak valid")

        # Keputusan lulus/tidak lulus baru boleh ditetapkan (atau diubah)
        # setelah seluruh nilai wajib masuk.
        if body.status in ("passed", "failed"):
            gaps = selection_score_gaps(self.repo.db, app)
            if gaps:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Keputusan kelulusan belum dapat ditetapkan karena "
                        "nilai belum lengkap: "
                        + ", ".join(gaps)
                        + ". Lengkapi seluruh nilai terlebih dahulu."
                    ),
                )

        app.status = body.status
        app.updated_at = now
        self.repo.update_applicant(app)

        # Sinkronkan graduation_status agar filter pendaftar lulus
        # (Kelulusan / LoA) ikut terisi.
        result_row = self.repo.ensure_selection_result(applicant_id, now)
        result_row.graduation_status = {"passed": "passed", "failed": "failed"}.get(
            body.status
        )
        result_row.updated_at = now
        self.repo.db.add(result_row)

        if body.reason is not None:
            self.repo.update_selection_result_notes(applicant_id, body.reason, now)

        self.repo.db.commit()

        # Notify the applicant of the registration outcome, not the assessment results.
        if body.status == "passed" and previous_status != "passed":
            from src.core.config import settings

            send_notifications(
                [
                    (
                        "registration_result_passed",
                        {
                            "nama_peserta": app.full_name,
                            "link_aplikasi": f"{settings.ppdb_frontend_url}/applicant/pengumuman",
                        },
                    ),
                ],
                app.user_id,
            )
        elif body.status == "failed" and previous_status != "failed":
            send_notifications(
                [
                    (
                        "registration_result_failed",
                        {
                            "nama_peserta": app.full_name,
                        },
                    ),
                ],
                app.user_id,
            )

        return {"message": f"Status pendaftar diubah menjadi {body.status}"}

    def applicant_get_my_session(self, user_id: str) -> dict[str, Any]:
        app = self.repo.get_applicant_by_user_id(user_id)
        if not app:
            raise HTTPException(status_code=404, detail="Bukan pendaftar")

        s_res = self.repo.get_selection_result_by_applicant(app.id)
        tahfidz_session = None
        interview_session = None
        interview_parent_session = None
        if s_res:
            if s_res.session_id:
                s_row = self.repo.get_session_by_id(s_res.session_id)
                if s_row:
                    tahfidz_session = s_row.__dict__.copy()
                    tahfidz_session.pop("_sa_instance_state", None)
            if hasattr(s_res, "interview_session_id") and s_res.interview_session_id:
                i_row = self.repo.get_session_by_id(s_res.interview_session_id)
                if i_row:
                    interview_session = i_row.__dict__.copy()
                    interview_session.pop("_sa_instance_state", None)
            if hasattr(s_res, "interview_parent_session_id") and s_res.interview_parent_session_id:
                p_row = self.repo.get_session_by_id(s_res.interview_parent_session_id)
                if p_row:
                    interview_parent_session = p_row.__dict__.copy()
                    interview_parent_session.pop("_sa_instance_state", None)

        scores = self.repo.get_applicant_scores_with_details(app.id)
        has_tahfidz = any(
            "tahfidz" in (row[2] or "").lower() or "tahfidz" in (row[1] or "").lower()
            for row in scores
        )
        has_interview = any(
            "wawancara" in (row[2] or "").lower()
            or "wawancara" in (row[1] or "").lower()
            or "interview" in (row[2] or "").lower()
            for row in scores
        )

        av_rows = self.repo.get_sessions(app.wave_id)
        available_tahfidz = []
        available_interview = []
        available_parent_interview = []
        available = []
        for s, _, booked_count in av_rows:
            sd = s.__dict__.copy()
            sd.pop("_sa_instance_state", None)
            sd["booked_count"] = booked_count or 0
            stype = (s.session_type or "").lower()
            if "ortu" in stype or "parent" in stype:
                available_parent_interview.append(sd)
                available.append(sd)
            elif "wawancara" in stype or "interview" in stype:
                available_interview.append(sd)
                available.append(sd)
            else:
                available_tahfidz.append(sd)
                available.append(sd)

        # Fallback ke jadwal gelombang jika belum di-assign spesifik
        if not tahfidz_session and available_tahfidz:
            tahfidz_session = available_tahfidz[0]
        if not interview_session and available_interview:
            interview_session = available_interview[0]
        if not interview_parent_session and available_parent_interview:
            interview_parent_session = available_parent_interview[0]

        # Ambil Jadwal CBT (Akademik & Psikologi) untuk gelombang ini
        cbt_schedules = []
        try:
            from src.models.cbt import ExamSchedule
            cbt_rows = (
                self.repo.db.query(ExamSchedule)
                .filter(ExamSchedule.wave_id == app.wave_id)
                .order_by(ExamSchedule.session_date.asc(), ExamSchedule.start_time.asc())
                .all()
            )
            for cs in cbt_rows:
                c_dict = cs.__dict__.copy()
                c_dict.pop("_sa_instance_state", None)
                cbt_schedules.append(c_dict)
        except Exception:
            pass

        # Gabungkan semua jadwal dan urutkan secara kronologis
        all_schedules = []
        for cs in cbt_schedules:
            all_schedules.append({
                "id": cs["id"],
                "name": cs["name"],
                "category": cs.get("category", "akademik"),
                "type": "cbt",
                "session_date": str(cs["session_date"]) if cs.get("session_date") else None,
                "start_time": cs.get("start_time"),
                "end_time": cs.get("end_time"),
                "mode": cs.get("mode", "offline"),
                "location": cs.get("location"),
                "meeting_url": cs.get("meeting_url"),
                "officer_name": cs.get("officer_name"),
            })
        if tahfidz_session:
            all_schedules.append({
                "id": tahfidz_session["id"],
                "name": tahfidz_session["name"],
                "category": "tahfidz",
                "type": "tahfidz",
                "session_date": str(tahfidz_session["session_date"]) if tahfidz_session.get("session_date") else None,
                "start_time": tahfidz_session.get("start_time"),
                "end_time": tahfidz_session.get("end_time"),
                "mode": tahfidz_session.get("mode", "offline"),
                "location": tahfidz_session.get("location"),
                "meeting_url": tahfidz_session.get("meeting_url"),
                "officer_name": tahfidz_session.get("officer_name"),
            })
        if interview_session:
            all_schedules.append({
                "id": interview_session["id"],
                "name": interview_session["name"],
                "category": "wawancara_santri",
                "type": "interview",
                "session_date": str(interview_session["session_date"]) if interview_session.get("session_date") else None,
                "start_time": interview_session.get("start_time"),
                "end_time": interview_session.get("end_time"),
                "mode": interview_session.get("mode", "offline"),
                "location": interview_session.get("location"),
                "meeting_url": interview_session.get("meeting_url"),
                "officer_name": interview_session.get("officer_name"),
            })
        if interview_parent_session:
            all_schedules.append({
                "id": interview_parent_session["id"],
                "name": interview_parent_session["name"],
                "category": "wawancara_ortu",
                "type": "interview_parent",
                "session_date": str(interview_parent_session["session_date"]) if interview_parent_session.get("session_date") else None,
                "start_time": interview_parent_session.get("start_time"),
                "end_time": interview_parent_session.get("end_time"),
                "mode": interview_parent_session.get("mode", "offline"),
                "location": interview_parent_session.get("location"),
                "meeting_url": interview_parent_session.get("meeting_url"),
                "officer_name": interview_parent_session.get("officer_name"),
            })

        all_schedules.sort(key=lambda x: (x.get("session_date") or "9999-99-99", x.get("start_time") or "99:99"))

        today_iso = datetime.now(WIB).date().isoformat()
        upcoming = [s for s in all_schedules if s.get("session_date") and s["session_date"] >= today_iso]
        next_upcoming = upcoming[0] if upcoming else (all_schedules[0] if all_schedules else None)
        same_day_exams = (
            [s for s in upcoming if s.get("session_date") == next_upcoming["session_date"]]
            if next_upcoming
            else []
        )

        return {
            "session": tahfidz_session or interview_session,
            "tahfidz_session": tahfidz_session,
            "interview_session": interview_session,
            "interview_parent_session": interview_parent_session,
            "cbt_schedules": cbt_schedules,
            "all_schedules": all_schedules,
            "next_upcoming_exam": next_upcoming,
            "same_day_exams": same_day_exams,
            "available_sessions": available,
            "available_tahfidz_sessions": available_tahfidz,
            "available_interview_sessions": available_interview,
            "available_parent_interview_sessions": available_parent_interview,
            "has_tahfidz_score": has_tahfidz,
            "has_interview_score": has_interview,
        }

    def applicant_book_session(self, user_id: str, session_id: str) -> dict[str, Any]:
        now = _now_wib()
        app = self.repo.get_applicant_by_user_id(user_id)
        if not app:
            raise HTTPException(status_code=404, detail="Bukan pendaftar")

        s_data = self.repo.get_session_with_booked_count(session_id)
        if not s_data:
            raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")

        session, booked_count = s_data
        booked_count = booked_count or 0
        if session.wave_id != app.wave_id:
            raise HTTPException(
                status_code=400, detail="Sesi bukan dari gelombang Anda"
            )
        if session.quota > 0 and booked_count >= session.quota:
            raise HTTPException(status_code=400, detail="Kuota sesi ini sudah penuh")

        stype = (session.session_type or "").lower()
        if "wawancara" in stype or "interview" in stype:
            scores = self.repo.get_applicant_scores_with_details(app.id)
            has_tahfidz = any(
                "tahfidz" in (row[2] or "").lower()
                or "tahfidz" in (row[1] or "").lower()
                for row in scores
            )
            if not has_tahfidz:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Anda harus memiliki nilai ujian Tahfidz sebelum memilih "
                        "jadwal wawancara."
                    ),
                )
            self.repo.update_selection_result_session(
                app.id, session_id, now, session_type="wawancara"
            )
        else:
            self.repo.update_selection_result_session(
                app.id, session_id, now, session_type="tahfidz"
            )

        self.repo.db.commit()

        # Notifikasi ke pendaftar: jadwal terkonfirmasi (Fase 3 spec)
        try:
            from src.core.config import settings

            location_or_link = session.meeting_url or session.location or "-"
            send_notifications(
                [
                    (
                        "session_confirmed",
                        {
                            "nama_ujian": session.name,
                            "tanggal": str(session.session_date)
                            if session.session_date
                            else "-",
                            "jam_mulai": session.start_time or "-",
                            "jam_selesai": session.end_time or "-",
                            "lokasi_atau_link": location_or_link,
                            "link_aplikasi": f"{settings.ppdb_frontend_url}/dashboard",
                        },
                    )
                ],
                app.user_id,
            )
        except Exception:
            import logging

            logging.getLogger("ptdarrahman.selection").exception(
                "session_confirmed notification failed; continuing"
            )

        return {"message": f"Berhasil memilih {session.name}"}

    def applicant_get_my_results(self, user_id: str) -> dict[str, Any]:
        app = self.repo.get_applicant_by_user_id(user_id)
        if not app:
            raise HTTPException(status_code=404, detail="Bukan pendaftar")

        s_res = self.repo.get_selection_result_by_applicant(app.id)
        notes = s_res.notes if s_res else None

        scores_rows = self.repo.get_applicant_scores_full(app.id)
        scores = []
        categories_map: dict[str, dict[str, Any]] = {}

        for row in scores_rows:
            sc, c_name, cat_name, weight_raw, *_ = row
            weight = float(weight_raw or 0.0)

            # Flat score for backwards compatibility
            scores.append(
                {
                    "score": sc,
                    "criteria_name": c_name,
                    "category_name": cat_name,
                    "weight": weight,
                }
            )

            if cat_name not in categories_map:
                categories_map[cat_name] = {
                    "category_name": cat_name,
                    "criteria": [],
                    "total_weight": 0.0,
                    "subtotal_score": 0.0,
                }

            weighted_contrib = round((sc * weight) / 100.0, 2) if weight > 0 else sc
            categories_map[cat_name]["criteria"].append(
                {
                    "criteria_name": c_name,
                    "weight": weight,
                    "score": sc,
                    "weighted_score": weighted_contrib,
                }
            )
            categories_map[cat_name]["total_weight"] += weight

        # Calculate subtotal for each category
        categories_list = []
        category_averages = []

        for cat_name, cat_data in categories_map.items():
            tot_w = cat_data["total_weight"]
            crit_list = cat_data["criteria"]
            if tot_w > 0:
                # Weighted sum based on weights
                cat_subtotal = round(
                    sum((c["score"] * c["weight"]) / 100.0 for c in crit_list), 2
                )
            else:
                # Simple average if weights not set
                cat_subtotal = (
                    round(sum(c["score"] for c in crit_list) / len(crit_list), 2)
                    if crit_list
                    else 0.0
                )

            cat_data["subtotal_score"] = cat_subtotal
            categories_list.append(cat_data)
            category_averages.append(cat_subtotal)

        # Total / Final score
        if s_res and s_res.score is not None:
            final_total_score = round(s_res.score, 2)
        else:
            all_component_scores = list(category_averages)

            if all_component_scores:
                final_total_score = round(
                    sum(all_component_scores) / len(all_component_scores), 2
                )
            else:
                final_total_score = None

        # CBT Attempts (Akademik & Psikologi)
        cbt_results = {}
        try:
            from src.models.cbt import ExamAttempt, ExamSchedule

            cbt_attempts = (
                self.repo.db.query(ExamAttempt, ExamSchedule)
                .join(ExamSchedule, ExamAttempt.schedule_id == ExamSchedule.id)
                .filter(ExamAttempt.applicant_id == app.id)
                .all()
            )
            for att, sched in cbt_attempts:
                cbt_results[sched.category] = {
                    "schedule_id": sched.id,
                    "schedule_name": sched.name,
                    "category": sched.category,
                    "status": att.status,
                    "score": att.score,
                    "finished_at": att.finished_at.isoformat() if att.finished_at else None,
                }
        except Exception:
            pass

        tahfidz_score = None
        for cat in categories_list:
            if "tahfidz" in cat["category_name"].lower():
                tahfidz_score = cat["subtotal_score"]
                break

        return {
            "notes": notes,
            "graduation_status": s_res.graduation_status if s_res else app.status,
            "graduation_notes": s_res.graduation_notes if s_res else None,
            "categories": categories_list,
            "total_score": final_total_score,
            "scores": scores,
            "cbt_results": cbt_results,
            "tahfidz_score": tahfidz_score,
        }

    def auto_assign_sessions(self) -> dict[str, Any]:
        now_wib = _now_wib()
        wave_id = self.repo.get_active_wave_id()
        if not wave_id:
            return {"message": "No active wave", "assigned": 0}

        today_iso = datetime.now(ZoneInfo("Asia/Jakarta")).date().isoformat()
        earliest_session = self.repo.get_earliest_session_date(wave_id, today_iso)

        if not earliest_session:
            return {"message": "No upcoming sessions found.", "assigned": 0}

        if isinstance(earliest_session, str):
            s_date = datetime.strptime(earliest_session, "%Y-%m-%d").date()
        else:
            s_date = earliest_session

        today = datetime.now(ZoneInfo("Asia/Jakarta")).date()

        if (s_date - today).days > 3:
            return {
                "message": f"Earliest session is {s_date}, >3 days away. Skip.",
                "assigned": 0,
            }

        unassigned = self.repo.get_unassigned_applicants(wave_id)
        if not unassigned:
            return {"message": "All assigned", "assigned": 0}

        avail_sessions_rows = self.repo.get_available_sessions(wave_id, today_iso)
        avail_sessions = []
        for s, count in avail_sessions_rows:
            avail_sessions.append(
                {"id": s.id, "quota": s.quota, "booked_count": count or 0}
            )

        assigned_count = 0
        for app_id in unassigned:
            target_session = None
            for s in avail_sessions:
                if s["quota"] == 0 or s["booked_count"] < s["quota"]:
                    target_session = s
                    break

            if target_session:
                self.repo.update_selection_result_session(
                    app_id, target_session["id"], now_wib
                )
                target_session["booked_count"] += 1
                assigned_count += 1

        self.repo.db.commit()
        return {
            "message": f"Successfully auto-assigned {assigned_count} applicants",
            "assigned": assigned_count,
        }

    def send_h1_reminders(self) -> dict[str, Any]:
        now = datetime.now(WIB)
        reminder_window_start = now + timedelta(minutes=55)
        reminder_window_end = now + timedelta(minutes=65)
        dates = {now.date(), reminder_window_end.date()}
        sessions = self.repo.get_sessions_by_dates(
            [target_date.isoformat() for target_date in dates]
        )

        sent_count = 0
        skipped_count = 0
        for s in sessions:
            if not s.session_date or not s.start_time:
                continue
            try:
                start_time = datetime.strptime(s.start_time, "%H:%M").time()
            except ValueError:
                continue
            starts_at = datetime.combine(s.session_date, start_time, tzinfo=WIB)
            if not reminder_window_start <= starts_at <= reminder_window_end:
                continue

            apps = self.repo.get_applicants_in_session(s.id, s.session_type or "")
            if not apps:
                continue

            for app in apps:
                if not app.user_id:
                    continue

                already_notified = (
                    self.repo.db.query(NotificationLog.id)
                    .filter(
                        NotificationLog.event_key == "reminder_exam_1hour",
                        NotificationLog.recipient_user_id == app.user_id,
                        NotificationLog.status.in_(("queued", "sent")),
                        NotificationLog.created_at
                        >= now.replace(tzinfo=None) - timedelta(hours=24),
                        NotificationLog.body_sent.like(f"%{s.name}%"),
                    )
                    .first()
                )
                if already_notified:
                    skipped_count += 1
                    continue

                send_notifications(
                    [
                        (
                            "reminder_exam_1hour",
                            {
                                "nama_ujian": s.name,
                                "waktu": s.start_time,
                                "lokasi_atau_link": s.meeting_url or s.location or "-",
                            },
                        )
                    ],
                    app.user_id,
                )
                sent_count += 1

        return {
            "message": f"Sent {sent_count} one-hour session reminders",
            "sent": sent_count,
            "skipped_recent": skipped_count,
        }

    def move_applicant_session(
        self, applicant_id: str, target_session_id: str, reason: str | None = None
    ) -> dict[str, Any]:
        from src.core.config import settings

        now = _now_wib()
        app = self.repo.get_applicant_by_id(applicant_id)
        if not app:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")

        target_session = self.repo.get_session_by_id(target_session_id)
        if not target_session:
            from src.models.cbt import ExamSchedule
            from src.modules.cbt.service import CBTService

            target_exam = self.repo.db.query(ExamSchedule).filter(ExamSchedule.id == target_session_id).first()
            if target_exam:
                return CBTService.move_candidate_schedule(
                    self.repo.db,
                    current_schedule_id=target_exam.id,
                    applicant_id=applicant_id,
                    target_schedule_id=target_exam.id,
                    reason=reason,
                )
            raise HTTPException(status_code=404, detail="Sesi target tidak ditemukan")

        s_res = self.repo.ensure_selection_result(applicant_id, now)
        stype = (target_session.session_type or "tahfidz").lower()
        if "ortu" in stype or "parent" in stype:
            s_res.interview_parent_session_id = target_session.id
        elif "wawancara" in stype or "interview" in stype:
            s_res.interview_session_id = target_session.id
        else:
            s_res.session_id = target_session.id

        if target_session.batch_name:
            s_res.batch_name = target_session.batch_name
            s_res.current_stage = 1

        if reason:
            existing_notes = s_res.notes or ""
            move_note = f"[Pindah Sesi ke {target_session.name}]: {reason}"
            s_res.notes = f"{existing_notes}\n{move_note}".strip()

        s_res.updated_at = now
        self.repo.db.commit()

        # Kirim notifikasi WhatsApp perubahan jadwal
        try:
            location_or_link = target_session.meeting_url or target_session.location or "-"
            send_notifications(
                [
                    (
                        "session_confirmed",
                        {
                            "nama_ujian": f"{target_session.name} (Jadwal Baru)",
                            "tanggal": str(target_session.session_date) if target_session.session_date else "-",
                            "jam_mulai": target_session.start_time or "-",
                            "jam_selesai": target_session.end_time or "-",
                            "lokasi_atau_link": location_or_link,
                            "link_aplikasi": f"{settings.ppdb_frontend_url}/dashboard",
                        },
                    )
                ],
                app.user_id,
            )
        except Exception:
            pass

        return {
            "message": f"Berhasil memindahkan jadwal {app.full_name} ke {target_session.name}",
            "session_id": target_session.id,
            "session_name": target_session.name,
        }
