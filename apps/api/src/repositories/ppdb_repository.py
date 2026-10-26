from datetime import date, datetime, timedelta
from typing import Any, cast

from sqlalchemy import case, func, or_, text
from sqlalchemy.orm import Session

from src.models.auth import User
from src.models.ppdb import (
    FileUpload,
    PPDBApplicant,
    PPDBApplicantDiscount,
    PPDBPaymentTransaction,
    PPDBPeriod,
    PPDBPeriodFeeItem,
    PPDBStage2Bill,
    PPDBWave,
    PPDBWaveFeeDiscount,
    PPDBWaveFeeItem,
)


class PPDBRepository:
    def __init__(self, db: Session):
        self.db = db

    # -------------------------------------------------------------------------
    # Periods
    # -------------------------------------------------------------------------
    def get_periods_paginated(
        self, search: str, page: int, per_page: int
    ) -> tuple[list[dict[str, Any]], int]:
        query = self.db.query(PPDBPeriod)
        if search:
            query = query.filter(PPDBPeriod.name.ilike(f"%{search}%"))

        total = query.count()
        periods = (
            query.order_by(PPDBPeriod.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )

        result = []
        for p in periods:
            wave_count = (
                self.db.query(PPDBWave).filter(PPDBWave.period_id == p.id).count()
            )
            fee_count = (
                self.db.query(PPDBPeriodFeeItem).filter(PPDBPeriodFeeItem.period_id == p.id).count()
            )
            d = {c.name: getattr(p, c.name) for c in p.__table__.columns}
            d["wave_count"] = wave_count
            d["fee_count"] = fee_count
            result.append(d)

        return result, total

    def get_all_periods(self) -> list[PPDBPeriod]:
        return cast(
            list[PPDBPeriod],
            self.db.query(PPDBPeriod).order_by(PPDBPeriod.created_at.desc()).all(),
        )

    def get_period_by_id(self, period_id: str) -> PPDBPeriod | None:
        return cast(
            PPDBPeriod | None,
            self.db.query(PPDBPeriod).filter(PPDBPeriod.id == period_id).first(),
        )

    def get_active_period(self) -> PPDBPeriod | None:
        return cast(
            PPDBPeriod | None,
            self.db.query(PPDBPeriod).filter(PPDBPeriod.status == "active").first(),
        )

    def create_period(self, period: PPDBPeriod) -> PPDBPeriod:
        self.db.add(period)
        self.db.commit()
        self.db.refresh(period)
        return period

    def update_period(self, period: PPDBPeriod) -> PPDBPeriod:
        self.db.commit()
        self.db.refresh(period)
        return period

    def delete_period(self, period: PPDBPeriod):
        self.db.delete(period)
        self.db.commit()

    def deactivate_all_periods(self):
        self.db.query(PPDBPeriod).update(
            {"status": "inactive"}, synchronize_session=False
        )
        self.db.commit()

    def activate_period(self, period_id: str):
        self.deactivate_all_periods()
        self.db.query(PPDBPeriod).filter(PPDBPeriod.id == period_id).update(
            {"status": "active"}, synchronize_session=False
        )
        self.db.commit()

    def deactivate_period(self, period_id: str):
        self.db.query(PPDBPeriod).filter(PPDBPeriod.id == period_id).update(
            {"status": "inactive"}, synchronize_session=False
        )
        self.db.query(PPDBWave).filter(PPDBWave.period_id == period_id).update(
            {"status": "inactive"}, synchronize_session=False
        )
        self.db.commit()

    # -------------------------------------------------------------------------
    # Period Fee Items (Master Komponen Biaya per Periode)
    # -------------------------------------------------------------------------
    def get_period_fee_items(self, period_id: str) -> list[PPDBPeriodFeeItem]:
        return cast(
            list[PPDBPeriodFeeItem],
            self.db.query(PPDBPeriodFeeItem)
            .filter(PPDBPeriodFeeItem.period_id == period_id)
            .order_by(
                PPDBPeriodFeeItem.order_index.asc(), PPDBPeriodFeeItem.created_at.asc()
            )
            .all(),
        )

    def get_period_fee_item(self, item_id: str) -> PPDBPeriodFeeItem | None:
        return cast(
            PPDBPeriodFeeItem | None,
            self.db.query(PPDBPeriodFeeItem)
            .filter(PPDBPeriodFeeItem.id == item_id)
            .first(),
        )

    def create_period_fee_item(self, item: PPDBPeriodFeeItem) -> PPDBPeriodFeeItem:
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def update_period_fee_item(self, item: PPDBPeriodFeeItem) -> PPDBPeriodFeeItem:
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def delete_period_fee_item(self, item: PPDBPeriodFeeItem):
        self.db.delete(item)
        self.db.commit()

    # -------------------------------------------------------------------------
    # Wave Fee Discounts (Diskonasi Gelombang terhadap Komponen Periode)
    # -------------------------------------------------------------------------
    def get_wave_fee_discounts(self, wave_id: str) -> list[PPDBWaveFeeDiscount]:
        return cast(
            list[PPDBWaveFeeDiscount],
            self.db.query(PPDBWaveFeeDiscount)
            .filter(PPDBWaveFeeDiscount.wave_id == wave_id)
            .all(),
        )

    def get_wave_fee_discount(
        self, wave_id: str, fee_item_id: str
    ) -> PPDBWaveFeeDiscount | None:
        return cast(
            PPDBWaveFeeDiscount | None,
            self.db.query(PPDBWaveFeeDiscount)
            .filter(
                PPDBWaveFeeDiscount.wave_id == wave_id,
                PPDBWaveFeeDiscount.fee_item_id == fee_item_id,
            )
            .first(),
        )

    def save_wave_fee_discount(
        self, discount: PPDBWaveFeeDiscount
    ) -> PPDBWaveFeeDiscount:
        self.db.add(discount)
        self.db.commit()
        self.db.refresh(discount)
        return discount

    # -------------------------------------------------------------------------
    # Waves
    # -------------------------------------------------------------------------
    def get_waves_by_period(self, period_id: str) -> list[dict[str, Any]]:
        waves = (
            self.db.query(PPDBWave)
            .filter(PPDBWave.period_id == period_id)
            .order_by(PPDBWave.wave_number.asc())
            .all()
        )
        result = []
        for w in waves:
            d = {c.name: getattr(w, c.name) for c in w.__table__.columns}
            d["total_applicants"] = self.count_applicants_in_wave(w.id)
            d["confirmed_applicants"] = self.count_paid_form_payments_in_wave(w.id)
            result.append(d)
        return result

    def get_wave_by_id(self, wave_id: str) -> PPDBWave | None:
        return cast(
            PPDBWave | None,
            self.db.query(PPDBWave).filter(PPDBWave.id == wave_id).first(),
        )

    def get_active_wave(self) -> PPDBWave | None:
        active_period = self.get_active_period()
        if not active_period:
            return None
        return cast(
            PPDBWave | None,
            self.db.query(PPDBWave)
            .filter(
                PPDBWave.period_id == active_period.id, PPDBWave.status == "active"
            )
            .first(),
        )

    def create_wave(self, wave: PPDBWave) -> PPDBWave:
        self.db.add(wave)
        self.db.commit()
        self.db.refresh(wave)
        return wave

    def update_wave(self, wave: PPDBWave) -> PPDBWave:
        self.db.commit()
        self.db.refresh(wave)
        return wave

    def delete_wave(self, wave: PPDBWave):
        self.db.delete(wave)
        self.db.commit()

    def get_max_wave_number(self, period_id: str) -> int:
        result = (
            self.db.query(func.max(PPDBWave.wave_number))
            .filter(PPDBWave.period_id == period_id)
            .scalar()
        )
        return result or 0

    def deactivate_all_waves_in_period(self, period_id: str):
        self.db.query(PPDBWave).filter(PPDBWave.period_id == period_id).update(
            {"status": "inactive"}, synchronize_session=False
        )
        self.db.commit()

    def deactivate_all_waves_globally(self):
        self.db.query(PPDBWave).update(
            {"status": "inactive"}, synchronize_session=False
        )
        self.db.commit()

    def activate_wave(self, wave_id: str, period_id: str | None = None):
        self.deactivate_all_waves_globally()
        self.db.query(PPDBWave).filter(PPDBWave.id == wave_id).update(
            {"status": "active"}, synchronize_session=False
        )
        self.db.commit()

    def deactivate_wave(self, wave_id: str):
        self.db.query(PPDBWave).filter(PPDBWave.id == wave_id).update(
            {"status": "inactive"}, synchronize_session=False
        )
        self.db.commit()

    # -------------------------------------------------------------------------
    # Legacy Wave fee items (Backward compatibility)
    # -------------------------------------------------------------------------
    def get_fee_items_by_wave(self, wave_id: str) -> list[PPDBWaveFeeItem]:
        return cast(
            list[PPDBWaveFeeItem],
            self.db.query(PPDBWaveFeeItem)
            .filter(PPDBWaveFeeItem.wave_id == wave_id)
            .order_by(
                PPDBWaveFeeItem.order_index.asc(), PPDBWaveFeeItem.created_at.asc()
            )
            .all(),
        )

    def get_fee_item(self, item_id: str) -> PPDBWaveFeeItem | None:
        return cast(
            PPDBWaveFeeItem | None,
            self.db.query(PPDBWaveFeeItem)
            .filter(PPDBWaveFeeItem.id == item_id)
            .first(),
        )

    def create_fee_item(self, item: PPDBWaveFeeItem) -> PPDBWaveFeeItem:
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def update_fee_item(self, item: PPDBWaveFeeItem) -> PPDBWaveFeeItem:
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def delete_fee_item(self, item: PPDBWaveFeeItem):
        self.db.delete(item)
        self.db.commit()

    def count_discounts_for_fee_item(self, fee_item_id: str) -> int:
        return cast(
            int,
            (
                self.db.query(PPDBApplicantDiscount)
                .filter(PPDBApplicantDiscount.fee_item_id == fee_item_id)
                .count()
            ),
        )

    def count_bills_for_fee_item(self, fee_item_id: str) -> int:
        return cast(
            int,
            (
                self.db.query(PPDBStage2Bill)
                .filter(PPDBStage2Bill.fee_item_id == fee_item_id)
                .count()
            ),
        )

    # -------------------------------------------------------------------------
    # Registration & Applicants
    # -------------------------------------------------------------------------
    def get_role_id_by_name(self, role_name: str) -> str | None:
        result = self.db.execute(
            text("SELECT id FROM roles WHERE name = :name LIMIT 1"), {"name": role_name}
        ).scalar()
        return cast(str | None, result)

    def get_user_by_username(self, username: str) -> User | None:
        return cast(
            User | None, self.db.query(User).filter(User.username == username).first()
        )

    def get_user_by_id(self, user_id: str) -> User | None:
        return cast(User | None, self.db.query(User).filter(User.id == user_id).first())

    def get_user_by_email(self, email: str) -> User | None:
        return cast(
            User | None, self.db.query(User).filter(User.email == email).first()
        )

    def get_applicant_by_email_active(self, email: str) -> PPDBApplicant | None:
        return cast(
            PPDBApplicant | None,
            self.db.query(PPDBApplicant)
            .filter(PPDBApplicant.email == email, PPDBApplicant.status != "expired")
            .first(),
        )

    def get_applicant_by_id(self, applicant_id: str) -> PPDBApplicant | None:
        return cast(
            PPDBApplicant | None,
            self.db.query(PPDBApplicant)
            .filter(PPDBApplicant.id == applicant_id)
            .first(),
        )

    def update_applicant(self, applicant: PPDBApplicant) -> PPDBApplicant:
        self.db.commit()
        self.db.refresh(applicant)
        return applicant

    def create_user_and_applicant(
        self, user: User, applicant: PPDBApplicant, transaction: PPDBPaymentTransaction
    ) -> tuple[User, PPDBApplicant]:
        self.db.add(user)
        self.db.add(applicant)
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(user)
        self.db.refresh(applicant)
        return user, applicant

    def get_applicants_paginated(
        self,
        wave_id: str | None,
        search: str,
        status: str | None,
        page: int,
        per_page: int,
        period_id: str | None = None,
        payment_status: str | None = None,
        sort: str | None = None,
    ) -> tuple[list[dict[str, Any]], int]:
        query = (
            self.db.query(
                PPDBApplicant,
                PPDBWave.name.label("wave_name"),
                PPDBWave.id.label("wave_id_joined"),
                PPDBPeriod.id.label("period_id_joined"),
                PPDBPeriod.name.label("period_name"),
                User.username,
            )
            .outerjoin(PPDBWave, PPDBApplicant.wave_id == PPDBWave.id)
            .outerjoin(PPDBPeriod, PPDBWave.period_id == PPDBPeriod.id)
            .outerjoin(User, PPDBApplicant.user_id == User.id)
        )

        if wave_id:
            query = query.filter(PPDBApplicant.wave_id == wave_id)
        if period_id:
            query = query.filter(PPDBWave.period_id == period_id)

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    PPDBApplicant.full_name.ilike(search_term),
                    PPDBApplicant.email.ilike(search_term),
                    PPDBApplicant.phone.ilike(search_term),
                    PPDBApplicant.nisn.ilike(search_term),
                    PPDBApplicant.nik.ilike(search_term),
                    PPDBApplicant.province.ilike(search_term),
                    PPDBApplicant.city.ilike(search_term),
                    PPDBApplicant.district.ilike(search_term),
                    PPDBApplicant.village.ilike(search_term),
                )
            )

        if status:
            query = query.filter(PPDBApplicant.status == status)

        if payment_status:
            query = query.filter(PPDBApplicant.payment_status == payment_status)

        total = query.count()
        if sort == "fifo_unverified" or status in ("document_uploaded", "document_uploaded_pending"):
            # FIFO untuk yang belum verifikasi: yang upload lebih dulu di atas (ASC)
            rows = (
                query.order_by(
                    case(
                        (PPDBApplicant.status.in_(["document_uploaded", "document_uploaded_pending"]), 0),
                        (PPDBApplicant.status == "document_rejected", 1),
                        else_=2,
                    ),
                    case(
                        (PPDBApplicant.status.in_(["document_uploaded", "document_uploaded_pending"]), PPDBApplicant.updated_at),
                        else_=None,
                    ).asc(),
                    PPDBApplicant.updated_at.desc(),
                    PPDBApplicant.created_at.desc(),
                )
                .offset((page - 1) * per_page)
                .limit(per_page)
                .all()
            )
        else:
            rows = (
                query.order_by(PPDBApplicant.created_at.desc())
                .offset((page - 1) * per_page)
                .limit(per_page)
                .all()
            )

        result = []
        for (
            app,
            wave_name,
            wave_id_joined,
            period_id_joined,
            period_name,
            username,
        ) in rows:
            app_dict = {c.name: getattr(app, c.name) for c in app.__table__.columns}
            app_dict["wave_name"] = wave_name
            app_dict["wave_id"] = wave_id_joined
            app_dict["period_id"] = period_id_joined
            app_dict["period_name"] = period_name
            app_dict["username"] = username
            result.append(app_dict)

        return result, total

    def get_applicant_detail(self, applicant_id: str) -> dict[str, Any] | None:
        row = (
            self.db.query(
                PPDBApplicant,
                PPDBWave.name.label("wave_name"),
                PPDBPeriod.id.label("period_id_joined"),
                PPDBPeriod.name.label("period_name"),
                User.username,
            )
            .outerjoin(PPDBWave, PPDBApplicant.wave_id == PPDBWave.id)
            .outerjoin(PPDBPeriod, PPDBWave.period_id == PPDBPeriod.id)
            .outerjoin(User, PPDBApplicant.user_id == User.id)
            .filter(PPDBApplicant.id == applicant_id)
            .first()
        )
        if not row:
            return None

        app, wave_name, period_id, period_name, username = row
        detail: dict[str, Any] = {
            c.name: getattr(app, c.name) for c in app.__table__.columns
        }
        detail["wave_name"] = wave_name
        detail["period_id"] = period_id
        detail["period_name"] = period_name
        detail["username"] = username
        return detail

    def delete_applicant_permanent(self, applicant: PPDBApplicant) -> None:
        user_id = applicant.user_id

        self.db.query(FileUpload).filter(
            FileUpload.entity_type.like("ppdb_document:%"),
            FileUpload.entity_id == applicant.id,
        ).delete(synchronize_session=False)

        self.db.query(PPDBPaymentTransaction).filter(
            PPDBPaymentTransaction.applicant_id == applicant.id
        ).delete(synchronize_session=False)
        self.db.query(PPDBApplicantDiscount).filter(
            PPDBApplicantDiscount.applicant_id == applicant.id
        ).delete(synchronize_session=False)
        self.db.query(PPDBStage2Bill).filter(
            PPDBStage2Bill.applicant_id == applicant.id
        ).delete(synchronize_session=False)

        self.db.execute(
            text("DELETE FROM `selection_results` WHERE `applicant_id` = :aid"),
            {"aid": applicant.id},
        )
        self.db.execute(
            text("DELETE FROM `selection_scores` WHERE `applicant_id` = :aid"),
            {"aid": applicant.id},
        )

        self.db.delete(applicant)
        if user_id:
            self.db.query(User).filter(User.id == user_id).delete(
                synchronize_session=False
            )

        self.db.commit()

    def get_applicant_document_files(self, applicant_id: str) -> list[str]:
        rows = (
            self.db.query(FileUpload.storage_path)
            .filter(
                FileUpload.entity_type.like("ppdb_document:%"),
                FileUpload.entity_id == applicant_id,
            )
            .all()
        )
        return [r[0] for r in rows]

    def get_applicant_by_user_id(self, user_id: str) -> PPDBApplicant | None:
        return cast(
            PPDBApplicant | None,
            (
                self.db.query(PPDBApplicant)
                .filter(
                    PPDBApplicant.user_id == user_id,
                    PPDBApplicant.deleted_at.is_(None),
                )
                .first()
            ),
        )

    def get_applicant_documents(self, applicant_id: str) -> list[dict[str, Any]]:
        rows = (
            self.db.query(
                FileUpload.id,
                FileUpload.original_name,
                FileUpload.mime_type,
                FileUpload.size_bytes,
                FileUpload.public_url,
                FileUpload.entity_type,
                FileUpload.created_at,
            )
            .filter(
                FileUpload.entity_type.like("ppdb_document:%"),
                FileUpload.entity_id == applicant_id,
            )
            .order_by(FileUpload.created_at.desc())
            .all()
        )
        return [
            {
                "id": r.id,
                "original_name": r.original_name,
                "mime_type": r.mime_type,
                "size_bytes": r.size_bytes,
                "public_url": r.public_url,
                "entity_type": r.entity_type,
                "doc_type": r.entity_type.split(":", 1)[1] if r.entity_type else None,
                "created_at": r.created_at,
            }
            for r in rows
        ]

    def replace_applicant_document(
        self,
        applicant_id: str,
        doc_type: str,
        upload: Any,
        file_id: str,
        uploaded_by: str,
        now: datetime,
    ) -> list[str]:
        entity_type = f"ppdb_document:{doc_type}"
        old = (
            self.db.query(FileUpload)
            .filter(
                FileUpload.entity_type == entity_type,
                FileUpload.entity_id == applicant_id,
            )
            .all()
        )

        for o in old:
            self.db.delete(o)

        record = FileUpload(
            id=file_id,
            uploaded_by=uploaded_by,
            original_name=upload.original_name,
            stored_name=str(upload.storage_path).split("/")[-1],
            mime_type=upload.mime_type,
            size_bytes=upload.size_bytes,
            storage_path=upload.storage_path,
            public_url=upload.public_url,
            entity_type=entity_type,
            entity_id=applicant_id,
            data=upload.data,
            created_at=now,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return [o.storage_path for o in old]

    def update_user_password(self, user: User, password_hash: str):
        user.password_hash = password_hash
        user.failed_login_attempts = 0
        user.locked_until = None
        self.db.commit()

    # -------------------------------------------------------------------------
    # Dashboard & Cron
    # -------------------------------------------------------------------------
    def count_applicants_in_period(self, period_id: str) -> int:
        return cast(
            int,
            self.db.query(PPDBApplicant)
            .join(PPDBWave, PPDBApplicant.wave_id == PPDBWave.id)
            .filter(PPDBWave.period_id == period_id)
            .count(),
        )

    def count_periods(self) -> int:
        return cast(int, self.db.query(PPDBPeriod).count())

    def count_waves(self) -> int:
        return cast(int, self.db.query(PPDBWave).count())

    def get_active_period_name(self) -> str | None:
        period = self.db.query(PPDBPeriod).filter(PPDBPeriod.status == "active").first()
        return period.name if period else None

    def count_applicants_in_wave(self, wave_id: str) -> int:
        return cast(
            int,
            (
                self.db.query(PPDBApplicant)
                .filter(PPDBApplicant.wave_id == wave_id)
                .count()
            ),
        )

    def count_paid_form_payments_in_wave(self, wave_id: str) -> int:
        return cast(
            int,
            self.db.query(
                func.count(func.distinct(PPDBPaymentTransaction.applicant_id))
            )
            .join(
                PPDBApplicant,
                PPDBApplicant.id == PPDBPaymentTransaction.applicant_id,
            )
            .filter(
                PPDBApplicant.wave_id == wave_id,
                PPDBPaymentTransaction.status == "success",
            )
            .scalar()
            or 0,
        )

    def count_applicants_by_status_in_wave(self, wave_id: str) -> dict[str, int]:
        rows = (
            self.db.query(PPDBApplicant.status, func.count(PPDBApplicant.id))
            .filter(PPDBApplicant.wave_id == wave_id)
            .group_by(PPDBApplicant.status)
            .all()
        )
        return {status: count for status, count in rows}

    def count_payments_by_status_in_wave(self, wave_id: str) -> dict[str, int]:
        rows = (
            self.db.query(
                PPDBPaymentTransaction.status, func.count(PPDBPaymentTransaction.id)
            )
            .join(
                PPDBApplicant,
                PPDBPaymentTransaction.applicant_id == PPDBApplicant.id,
            )
            .filter(PPDBApplicant.wave_id == wave_id)
            .group_by(PPDBPaymentTransaction.status)
            .all()
        )
        return {status: count for status, count in rows}

    def count_payments_by_method_in_wave(
        self, wave_id: str
    ) -> dict[str, dict[str, int]]:
        rows = (
            self.db.query(
                PPDBPaymentTransaction.method,
                PPDBPaymentTransaction.status,
                func.count(PPDBPaymentTransaction.id),
            )
            .join(
                PPDBApplicant,
                PPDBPaymentTransaction.applicant_id == PPDBApplicant.id,
            )
            .filter(PPDBApplicant.wave_id == wave_id)
            .group_by(PPDBPaymentTransaction.method, PPDBPaymentTransaction.status)
            .all()
        )
        result: dict[str, dict[str, int]] = {}
        for method, status, count in rows:
            result.setdefault(method, {})[status] = count
        return result

    def get_registration_trend(
        self, wave_id: str, days: int = 14
    ) -> list[dict[str, Any]]:
        start = datetime.combine(
            date.today() - timedelta(days=days - 1), datetime.min.time()
        )
        rows = (
            self.db.query(
                func.date(PPDBApplicant.created_at), func.count(PPDBApplicant.id)
            )
            .filter(
                PPDBApplicant.wave_id == wave_id,
                PPDBApplicant.created_at >= start,
            )
            .group_by(func.date(PPDBApplicant.created_at))
            .order_by(func.date(PPDBApplicant.created_at))
            .all()
        )
        counts = {str(d): c for d, c in rows}
        result: list[dict[str, Any]] = []
        for i in range(days):
            day = date.today() - timedelta(days=days - 1 - i)
            result.append(
                {"date": day.isoformat(), "count": counts.get(day.isoformat(), 0)}
            )
        return result

    def get_expired_pending_applicants(
        self, limit_time_str: str
    ) -> list[PPDBApplicant]:
        return cast(
            list[PPDBApplicant],
            self.db.query(PPDBApplicant)
            .filter(
                PPDBApplicant.payment_status == "pending",
                PPDBApplicant.payment_deadline <= limit_time_str,
                PPDBApplicant.deleted_at.is_(None),
            )
            .all(),
        )

    def soft_delete_applicants(self, applicants: list[PPDBApplicant], now_str: str):
        app_ids = [a.id for a in applicants]
        user_ids = [a.user_id for a in applicants]

        self.db.query(PPDBApplicant).filter(PPDBApplicant.id.in_(app_ids)).update(
            {"deleted_at": now_str, "payment_status": "expired", "status": "expired"},
            synchronize_session=False,
        )

        if user_ids:
            self.db.query(User).filter(User.id.in_(user_ids)).update(
                {"is_active": False}, synchronize_session=False
            )

        self.db.query(PPDBPaymentTransaction).filter(
            PPDBPaymentTransaction.applicant_id.in_(app_ids),
            PPDBPaymentTransaction.status == "pending",
        ).update(
            {"status": "expired", "updated_at": now_str}, synchronize_session=False
        )

        self.db.commit()

    def get_applicants_for_payment_reminder(
        self, now_str: str, tomorrow_str: str
    ) -> list[PPDBApplicant]:
        return cast(
            list[PPDBApplicant],
            self.db.query(PPDBApplicant)
            .filter(
                PPDBApplicant.payment_status == "pending",
                PPDBApplicant.payment_deadline > now_str,
                PPDBApplicant.payment_deadline <= tomorrow_str,
                PPDBApplicant.deleted_at.is_(None),
            )
            .all(),
        )

    # -------------------------------------------------------------------------
    # Documents
    # -------------------------------------------------------------------------
    def get_documents_by_applicant(self, applicant_id: str) -> list[FileUpload]:
        return cast(
            list[FileUpload],
            self.db.query(FileUpload)
            .filter(
                FileUpload.entity_type.like("ppdb_document:%"),
                FileUpload.entity_id == applicant_id,
            )
            .order_by(FileUpload.created_at.desc())
            .all(),
        )
