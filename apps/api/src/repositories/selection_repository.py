from collections.abc import Sequence
from datetime import date, datetime
from typing import Any, cast
from uuid import uuid4

from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.orm import Session

from src.models.auth import User
from src.models.ppdb import PPDBApplicant, PPDBPeriod, PPDBWave
from src.models.selection import (
    SelectionCategory,
    SelectionCriteria,
    SelectionResult,
    SelectionScore,
    SelectionSession,
)


class SelectionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_user_by_id(self, user_id: str) -> User | None:
        return cast(User | None, self.db.get(User, user_id))

    def get_active_wave_id(self) -> str | None:
        # Gelombang hanya dianggap aktif bila periode induknya juga aktif.
        stmt = (
            select(PPDBWave.id)
            .join(PPDBPeriod, PPDBPeriod.id == PPDBWave.period_id)
            .where(PPDBWave.status == "active", PPDBPeriod.status == "active")
            .limit(1)
        )
        return cast(str | None, self.db.execute(stmt).scalar_one_or_none())

    def cleanup_expired_unbooked_sessions(
        self, wave_ids: str | list[str] | None = None
    ) -> int:
        """Jadwal seleksi sekarang bersifat global/massal per gelombang.
        Tidak lagi dihapus otomatis jika belum ada yang booking.
        """
        return 0

    def get_sessions(self, wave_id: str) -> Sequence[tuple]:
        # Returns tuples of (SelectionSession, wave_name, booked_count)
        self.cleanup_expired_unbooked_sessions(wave_id)
        stmt = (
            select(
                SelectionSession,
                PPDBWave.name.label("wave_name"),
                select(func.count())
                .where(
                    or_(
                        SelectionResult.session_id == SelectionSession.id,
                        SelectionResult.interview_session_id == SelectionSession.id,
                    )
                )
                .scalar_subquery()
                .label("booked_count"),
            )
            .outerjoin(PPDBWave, SelectionSession.wave_id == PPDBWave.id)
            .where(SelectionSession.wave_id == wave_id)
            .order_by(
                SelectionSession.session_date.asc(), SelectionSession.start_time.asc()
            )
        )
        return cast(Sequence[tuple[Any, ...]], self.db.execute(stmt).all())

    def get_sessions_with_booking_details(
        self, wave_ids: list[str], session_type: str | None = None
    ) -> list[dict[str, Any]]:
        """List sesi dengan info status warna (merah/kuning/hijau),
        data pendaftar booking, dan skor evaluasi.

        ``wave_ids`` adalah seluruh gelombang dalam periode aktif, sehingga
        halaman admin menampilkan sesi dari semua gelombang periode tersebut.
        """
        if not wave_ids:
            return []
        self.cleanup_expired_unbooked_sessions(wave_ids)

        stmt = (
            select(SelectionSession, PPDBWave.name.label("wave_name"))
            .outerjoin(PPDBWave, SelectionSession.wave_id == PPDBWave.id)
            .where(SelectionSession.wave_id.in_(wave_ids))
        )
        if session_type:
            st = session_type.lower()
            if st in ("interview", "wawancara"):
                stmt = stmt.where(
                    or_(
                        SelectionSession.session_type == "interview",
                        SelectionSession.session_type == "wawancara",
                    )
                )
            elif st in ("tahfidz", "tahfiz"):
                stmt = stmt.where(
                    or_(
                        SelectionSession.session_type == "tahfidz",
                        SelectionSession.session_type == "tahfiz",
                    )
                )
            else:
                stmt = stmt.where(SelectionSession.session_type == session_type)
        stmt = stmt.order_by(
            SelectionSession.session_date.asc(), SelectionSession.start_time.asc()
        )
        session_rows = self.db.execute(stmt).all()
        if not session_rows:
            return []

        # Ambil pendaftar yang mengambil sesi di gelombang-gelombang periode aktif
        bookings_stmt = (
            select(
                SelectionResult,
                PPDBApplicant.id.label("app_id"),
                PPDBApplicant.full_name.label("app_name"),
                PPDBApplicant.phone.label("app_phone"),
                PPDBApplicant.nisn.label("app_nisn"),
                PPDBApplicant.status.label("app_status"),
                PPDBApplicant.parent_name.label("app_parent_name"),
                PPDBApplicant.parent_phone.label("app_parent_phone"),
                PPDBApplicant.father_name.label("app_father_name"),
                PPDBApplicant.mother_name.label("app_mother_name"),
                PPDBApplicant.guardian_name.label("app_guardian_name"),
            )
            .join(PPDBApplicant, SelectionResult.applicant_id == PPDBApplicant.id)
            .where(PPDBApplicant.wave_id.in_(wave_ids))
        )
        booking_rows = self.db.execute(bookings_stmt).all()

        session_bookings: dict[str, list[dict[str, Any]]] = {}
        applicant_ids_booked: set[str] = set()
        for b_row in booking_rows:
            (
                res,
                app_id,
                app_name,
                app_phone,
                app_nisn,
                app_status,
                app_parent_name,
                app_parent_phone,
                app_father_name,
                app_mother_name,
                app_guardian_name,
            ) = b_row
            resolved_parent = (
                app_parent_name
                or app_father_name
                or app_mother_name
                or app_guardian_name
                or "-"
            )
            app_dict = {
                "id": app_id,
                "full_name": app_name,
                "phone": app_phone,
                "nisn": app_nisn,
                "status": app_status,
                "notes": res.notes,
                "parent_name": resolved_parent,
                "parent_phone": app_parent_phone or app_phone or "-",
                "father_name": app_father_name,
                "mother_name": app_mother_name,
            }
            if res.session_id:
                session_bookings.setdefault(res.session_id, []).append(app_dict)
                applicant_ids_booked.add(app_id)
            if hasattr(res, "interview_session_id") and res.interview_session_id:
                session_bookings.setdefault(res.interview_session_id, []).append(
                    app_dict
                )
                applicant_ids_booked.add(app_id)
            if (
                hasattr(res, "interview_parent_session_id")
                and res.interview_parent_session_id
            ):
                session_bookings.setdefault(res.interview_parent_session_id, []).append(
                    app_dict
                )
                applicant_ids_booked.add(app_id)

        # Cek apakah pendaftar sudah dinilai untuk kategori sesi terkait
        evaluated_map: dict[tuple[str, str], tuple[bool, float | None]] = {}
        if applicant_ids_booked:
            scores_stmt = (
                select(
                    SelectionScore.applicant_id,
                    SelectionScore.score,
                    SelectionCategory.name.label("category_name"),
                )
                .join(
                    SelectionCriteria,
                    SelectionScore.criteria_id == SelectionCriteria.id,
                )
                .join(
                    SelectionCategory,
                    SelectionCriteria.category_id == SelectionCategory.id,
                )
                .where(SelectionScore.applicant_id.in_(applicant_ids_booked))
            )
            score_rows = self.db.execute(scores_stmt).all()
            temp_scores: dict[tuple[str, str], list[float]] = {}
            for s_app_id, sc, cat_name in score_rows:
                c_name = (cat_name or "").lower()
                if "tahfidz" in c_name or "quran" in c_name:
                    stype_key = "tahfidz"
                elif "orang tua" in c_name or "ortu" in c_name or "wali" in c_name:
                    stype_key = "interview_ortu"
                else:
                    stype_key = "interview_santri"

                key = (s_app_id, stype_key)
                if key not in temp_scores:
                    temp_scores[key] = []
                if sc is not None:
                    temp_scores[key].append(float(sc))

                # Kunci general interview
                if "tahfidz" not in stype_key:
                    gen_key = (s_app_id, "interview")
                    if gen_key not in temp_scores:
                        temp_scores[gen_key] = []
                    if sc is not None:
                        temp_scores[gen_key].append(float(sc))

            for key, score_list in temp_scores.items():
                if score_list:
                    avg = sum(score_list) / len(score_list)
                    evaluated_map[key] = (True, round(avg, 1))

        results = []
        for s_row, wave_name in session_rows:
            d = s_row.__dict__.copy()
            d.pop("_sa_instance_state", None)
            d["wave_name"] = wave_name
            d["batch_name"] = getattr(s_row, "batch_name", None)
            stype = (s_row.session_type or "tahfidz").lower()
            stype_key = (
                "interview"
                if "wawancara" in stype or "interview" in stype
                else "tahfidz"
            )

            booked_apps = session_bookings.get(s_row.id, [])
            for a in booked_apps:
                a_id = a["id"]
                a["is_tahfidz_evaluated"] = evaluated_map.get(
                    (a_id, "tahfidz"), (False, None)
                )[0]
                a["tahfidz_score"] = evaluated_map.get(
                    (a_id, "tahfidz"), (False, None)
                )[1]
                a["is_santri_evaluated"] = evaluated_map.get(
                    (a_id, "interview_santri"), (False, None)
                )[0]
                a["santri_score"] = evaluated_map.get(
                    (a_id, "interview_santri"), (False, None)
                )[1]
                a["is_ortu_evaluated"] = evaluated_map.get(
                    (a_id, "interview_ortu"), (False, None)
                )[0]
                a["ortu_score"] = evaluated_map.get(
                    (a_id, "interview_ortu"), (False, None)
                )[1]

            d["booked_count"] = len(booked_apps)
            d["booked_applicants"] = booked_apps
            d["booked_applicant"] = booked_apps[0] if booked_apps else None

            evaluated_count = sum(
                1
                for a in booked_apps
                if evaluated_map.get((a["id"], stype_key), (False, None))[0]
            )
            d["evaluated_count"] = evaluated_count
            d["is_evaluated"] = (
                (evaluated_count == len(booked_apps)) if booked_apps else False
            )
            d["evaluated_score"] = (
                evaluated_map.get((booked_apps[0]["id"], stype_key), (False, None))[1]
                if booked_apps
                else None
            )
            d["status_color"] = (
                "green"
                if d["is_evaluated"] and booked_apps
                else ("yellow" if booked_apps else "red")
            )

            results.append(d)

        return results

    def create_session(self, session: SelectionSession) -> SelectionSession:
        self.db.add(session)
        self.db.flush()
        return session

    def get_session_by_id(self, session_id: str) -> SelectionSession | None:
        return cast(SelectionSession | None, self.db.get(SelectionSession, session_id))

    def get_session_with_booked_count(self, session_id: str) -> tuple | None:
        stmt = select(
            SelectionSession,
            select(func.count())
            .where(
                or_(
                    SelectionResult.session_id == SelectionSession.id,
                    SelectionResult.interview_session_id == SelectionSession.id,
                )
            )
            .scalar_subquery()
            .label("booked_count"),
        ).where(SelectionSession.id == session_id)
        return cast(tuple[Any, ...] | None, self.db.execute(stmt).first())

    def update_session(self, session: SelectionSession) -> SelectionSession:
        self.db.add(session)
        self.db.flush()
        return session

    def delete_session(self, session_id: str):
        # Set session_id to NULL in selection_results
        stmt_res = (
            update(SelectionResult)
            .where(
                or_(
                    SelectionResult.session_id == session_id,
                    SelectionResult.interview_session_id == session_id,
                    SelectionResult.interview_parent_session_id == session_id,
                )
            )
            .values(session_id=None)
        )
        self.db.execute(stmt_res)

        stmt_del = delete(SelectionSession).where(SelectionSession.id == session_id)
        self.db.execute(stmt_del)
        self.db.flush()

    def get_applicants_in_session(
        self, session_id: str, session_type: str = "tahfidz"
    ) -> Sequence[PPDBApplicant]:
        if session_type.lower() in ("interview", "wawancara"):
            stmt = (
                select(PPDBApplicant)
                .join(SelectionResult, SelectionResult.applicant_id == PPDBApplicant.id)
                .where(
                    or_(
                        SelectionResult.interview_session_id == session_id,
                        SelectionResult.interview_parent_session_id == session_id,
                    )
                )
            )
        else:
            stmt = (
                select(PPDBApplicant)
                .join(SelectionResult, SelectionResult.applicant_id == PPDBApplicant.id)
                .where(SelectionResult.session_id == session_id)
            )
        return cast(Sequence[PPDBApplicant], self.db.scalars(stmt).all())

    def get_categories(self, wave_id: str) -> Sequence[SelectionCategory]:
        stmt = (
            select(SelectionCategory)
            .where(SelectionCategory.wave_id == wave_id)
            .order_by(SelectionCategory.created_at.asc())
        )
        return cast(Sequence[SelectionCategory], self.db.scalars(stmt).all())

    def get_criteria_by_category(self, category_id: str) -> Sequence[SelectionCriteria]:
        stmt = (
            select(SelectionCriteria)
            .where(SelectionCriteria.category_id == category_id)
            .order_by(SelectionCriteria.created_at.asc())
        )
        return cast(Sequence[SelectionCriteria], self.db.scalars(stmt).all())

    def get_category_by_id(self, category_id: str) -> SelectionCategory | None:
        stmt = select(SelectionCategory).where(SelectionCategory.id == category_id)
        return cast(SelectionCategory | None, self.db.scalar(stmt))

    def get_criteria_by_id(self, criteria_id: str) -> SelectionCriteria | None:
        stmt = select(SelectionCriteria).where(SelectionCriteria.id == criteria_id)
        return cast(SelectionCriteria | None, self.db.scalar(stmt))

    def get_active_wave_info(self) -> dict[str, Any] | None:
        # Gelombang hanya dianggap aktif bila periode induknya juga aktif.
        stmt = (
            select(PPDBWave.id, PPDBWave.name)
            .join(PPDBPeriod, PPDBPeriod.id == PPDBWave.period_id)
            .where(PPDBWave.status == "active", PPDBPeriod.status == "active")
            .limit(1)
        )
        row = self.db.execute(stmt).first()
        if not row:
            return None
        return {"id": row[0], "name": row[1]}

    def ensure_selection_result(
        self, applicant_id: str, now: datetime
    ) -> SelectionResult:
        """Ambil baris hasil seleksi pendaftar, buat jika belum ada.

        Tanpa ini, UPDATE notes/session menyentuh 0 baris dan booking
        terlihat sukses padahal tidak tersimpan.
        """
        existing = self.get_selection_result_by_applicant(applicant_id)
        if existing:
            return existing
        row = SelectionResult(
            id=str(uuid4()),
            applicant_id=applicant_id,
            session_id=None,
            score=None,
            notes=None,
            graduation_status=None,
            graduation_notes=None,
            created_at=now,
            updated_at=now,
        )
        self.db.add(row)
        self.db.flush()
        return row

    def create_category(self, category: SelectionCategory) -> SelectionCategory:
        self.db.add(category)
        self.db.flush()
        return category

    def create_criteria(self, criteria: SelectionCriteria) -> SelectionCriteria:
        self.db.add(criteria)
        self.db.flush()
        return criteria

    def delete_category(self, category_id: str):
        # Delete scores for criteria in this category
        subq = select(SelectionCriteria.id).where(
            SelectionCriteria.category_id == category_id
        )
        stmt_scores = delete(SelectionScore).where(SelectionScore.criteria_id.in_(subq))
        self.db.execute(stmt_scores)

        # Delete criteria
        stmt_crit = delete(SelectionCriteria).where(
            SelectionCriteria.category_id == category_id
        )
        self.db.execute(stmt_crit)

        # Delete category
        stmt_cat = delete(SelectionCategory).where(SelectionCategory.id == category_id)
        self.db.execute(stmt_cat)
        self.db.flush()

    def delete_criteria(self, criteria_id: str):
        stmt_scores = delete(SelectionScore).where(
            SelectionScore.criteria_id == criteria_id
        )
        self.db.execute(stmt_scores)

        stmt_crit = delete(SelectionCriteria).where(SelectionCriteria.id == criteria_id)
        self.db.execute(stmt_crit)
        self.db.flush()

    def get_results(self, wave_id: str) -> Sequence[tuple]:
        # Mulai dari pendaftar (LEFT JOIN hasil) agar pendaftar yang belum
        # punya baris selection_results tetap muncul di list admin.
        stmt = (
            select(
                SelectionResult,
                PPDBApplicant,
                SelectionSession,
                PPDBWave.name.label("wave_name"),
            )
            .select_from(PPDBApplicant)
            .outerjoin(
                SelectionResult, SelectionResult.applicant_id == PPDBApplicant.id
            )
            .outerjoin(
                SelectionSession, SelectionResult.session_id == SelectionSession.id
            )
            .outerjoin(PPDBWave, PPDBApplicant.wave_id == PPDBWave.id)
            .where(PPDBApplicant.wave_id == wave_id)
            .order_by(PPDBApplicant.full_name.asc())
        )
        return cast(Sequence[tuple[Any, ...]], self.db.execute(stmt).all())

    def get_applicant_scores(self, applicant_id: str) -> Sequence[SelectionScore]:
        stmt = select(SelectionScore).where(SelectionScore.applicant_id == applicant_id)
        return cast(Sequence[SelectionScore], self.db.scalars(stmt).all())

    def get_applicant_by_id(self, applicant_id: str) -> PPDBApplicant | None:
        stmt = select(PPDBApplicant).where(
            PPDBApplicant.id == applicant_id, PPDBApplicant.deleted_at.is_(None)
        )
        return cast(PPDBApplicant | None, self.db.scalar(stmt))

    def get_applicant_by_user_id(self, user_id: str) -> PPDBApplicant | None:
        stmt = select(PPDBApplicant).where(PPDBApplicant.user_id == user_id).limit(1)
        return cast(PPDBApplicant | None, self.db.scalar(stmt))

    def get_selection_result_by_applicant(
        self, applicant_id: str
    ) -> SelectionResult | None:
        stmt = select(SelectionResult).where(
            SelectionResult.applicant_id == applicant_id
        )
        return cast(SelectionResult | None, self.db.scalar(stmt))

    def update_selection_result_notes(
        self, applicant_id: str, notes: str | None, now: datetime
    ):
        row = self.ensure_selection_result(applicant_id, now)
        row.notes = notes
        row.updated_at = now
        self.db.add(row)
        self.db.flush()

    def get_selection_score(
        self, applicant_id: str, criteria_id: str
    ) -> SelectionScore | None:
        stmt = select(SelectionScore).where(
            SelectionScore.applicant_id == applicant_id,
            SelectionScore.criteria_id == criteria_id,
        )
        return cast(SelectionScore | None, self.db.scalar(stmt))

    def add_selection_score(self, score: SelectionScore):
        self.db.add(score)
        self.db.flush()

    def update_selection_score(self, score: SelectionScore):
        self.db.add(score)
        self.db.flush()

    def update_applicant(self, applicant: PPDBApplicant):
        self.db.add(applicant)
        self.db.flush()

    def update_selection_result_session(
        self,
        applicant_id: str,
        session_id: str,
        now: datetime,
        session_type: str | None = None,
    ):
        row = self.ensure_selection_result(applicant_id, now)
        if (session_type or "").lower() == "wawancara":
            row.interview_session_id = session_id
        else:
            row.session_id = session_id
        row.updated_at = now
        self.db.add(row)
        self.db.flush()

    def get_applicant_scores_with_details(self, applicant_id: str) -> Sequence[tuple]:
        stmt = (
            select(
                SelectionScore.score,
                SelectionCriteria.name.label("criteria_name"),
                SelectionCategory.name.label("category_name"),
            )
            .join(SelectionCriteria, SelectionScore.criteria_id == SelectionCriteria.id)
            .join(
                SelectionCategory, SelectionCriteria.category_id == SelectionCategory.id
            )
            .where(SelectionScore.applicant_id == applicant_id)
            .order_by(SelectionCategory.created_at, SelectionCriteria.created_at)
        )
        return cast(Sequence[tuple[Any, ...]], self.db.execute(stmt).all())

    def get_applicant_scores_full(self, applicant_id: str) -> Sequence[tuple]:
        stmt = (
            select(
                SelectionScore.score,
                SelectionCriteria.name.label("criteria_name"),
                SelectionCategory.name.label("category_name"),
                SelectionCriteria.weight.label("weight"),
                SelectionCategory.id.label("category_id"),
                SelectionCriteria.id.label("criteria_id"),
            )
            .join(SelectionCriteria, SelectionScore.criteria_id == SelectionCriteria.id)
            .join(
                SelectionCategory, SelectionCriteria.category_id == SelectionCategory.id
            )
            .where(SelectionScore.applicant_id == applicant_id)
            .order_by(SelectionCategory.created_at, SelectionCriteria.created_at)
        )
        return cast(Sequence[tuple[Any, ...]], self.db.execute(stmt).all())

    def get_earliest_session_date(self, wave_id: str, today_iso: str) -> date | None:
        stmt = (
            select(SelectionSession.session_date)
            .where(
                SelectionSession.wave_id == wave_id,
                SelectionSession.session_date.isnot(None),
                SelectionSession.session_date >= today_iso,
            )
            .order_by(SelectionSession.session_date.asc())
            .limit(1)
        )
        return cast(date | None, self.db.scalar(stmt))

    def get_unassigned_applicants(self, wave_id: str) -> Sequence[str]:
        stmt = (
            select(SelectionResult.applicant_id)
            .join(PPDBApplicant, SelectionResult.applicant_id == PPDBApplicant.id)
            .where(
                PPDBApplicant.wave_id == wave_id,
                SelectionResult.session_id.is_(None),
                PPDBApplicant.status == "selection",
            )
        )
        return cast(Sequence[str], self.db.scalars(stmt).all())

    def get_available_sessions(self, wave_id: str, today_iso: str) -> Sequence[tuple]:
        stmt = (
            select(
                SelectionSession,
                select(func.count())
                .where(
                    or_(
                        SelectionResult.session_id == SelectionSession.id,
                        SelectionResult.interview_session_id == SelectionSession.id,
                    )
                )
                .scalar_subquery()
                .label("booked_count"),
            )
            .where(
                SelectionSession.wave_id == wave_id,
                (SelectionSession.session_date >= today_iso)
                | (SelectionSession.session_date.is_(None)),
            )
            .order_by(
                SelectionSession.session_date.asc(), SelectionSession.start_time.asc()
            )
        )
        return cast(Sequence[tuple[Any, ...]], self.db.execute(stmt).all())

    def get_sessions_by_date(
        self, wave_id: str, target_date: str
    ) -> Sequence[SelectionSession]:
        stmt = select(SelectionSession).where(
            SelectionSession.wave_id == wave_id,
            SelectionSession.session_date == target_date,
        )
        return cast(Sequence[SelectionSession], self.db.scalars(stmt).all())

    def get_sessions_by_dates(
        self, target_dates: Sequence[str]
    ) -> Sequence[SelectionSession]:
        if not target_dates:
            return []
        stmt = (
            select(SelectionSession)
            .where(SelectionSession.session_date.in_(target_dates))
            .order_by(
                SelectionSession.session_date.asc(), SelectionSession.start_time.asc()
            )
        )
        return cast(Sequence[SelectionSession], self.db.scalars(stmt).all())
