# mypy: ignore-errors
"""Add CBT Exam and Bank Soal tables.

Revision ID: 0051
Revises: 0050
Create Date: 2026-10-26
"""

from collections.abc import Sequence
from datetime import datetime
from uuid import uuid4

import sqlalchemy as sa
from alembic import op

revision: str = "0051"
down_revision: str | None = "0050"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _table_exists(table: str) -> bool:
    insp = sa.inspect(op.get_bind())
    return table in insp.get_table_names()


def upgrade() -> None:
    # 1. ppdb_exam_banks
    if not _table_exists("ppdb_exam_banks"):
        op.create_table(
            "ppdb_exam_banks",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column(
                "period_id",
                sa.String(50),
                sa.ForeignKey("ppdb_periods.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("category", sa.String(20), nullable=False, index=True),
            sa.Column("title", sa.String(255), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="60"),
            sa.Column("total_questions", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("total_points", sa.Float(), nullable=False, server_default="100.0"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_by", sa.String(36), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )

    # 2. ppdb_exam_questions
    if not _table_exists("ppdb_exam_questions"):
        op.create_table(
            "ppdb_exam_questions",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column(
                "bank_id",
                sa.String(36),
                sa.ForeignKey("ppdb_exam_banks.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("question_number", sa.Integer(), nullable=False),
            sa.Column("question_text", sa.Text(), nullable=False),
            sa.Column("points", sa.Float(), nullable=False, server_default="1.0"),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )

    # 3. ppdb_exam_options
    if not _table_exists("ppdb_exam_options"):
        op.create_table(
            "ppdb_exam_options",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column(
                "question_id",
                sa.String(36),
                sa.ForeignKey("ppdb_exam_questions.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("option_key", sa.String(5), nullable=False),
            sa.Column("option_text", sa.Text(), nullable=False),
            sa.Column("is_correct", sa.Boolean(), nullable=False, server_default=sa.false()),
        )

    # 4. ppdb_exam_schedules
    if not _table_exists("ppdb_exam_schedules"):
        op.create_table(
            "ppdb_exam_schedules",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column(
                "period_id",
                sa.String(50),
                sa.ForeignKey("ppdb_periods.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column(
                "wave_id",
                sa.String(50),
                sa.ForeignKey("ppdb_waves.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column(
                "bank_id",
                sa.String(36),
                sa.ForeignKey("ppdb_exam_banks.id", ondelete="RESTRICT"),
                nullable=False,
                index=True,
            ),
            sa.Column("category", sa.String(20), nullable=False, index=True),
            sa.Column("name", sa.String(150), nullable=False),
            sa.Column("session_date", sa.Date(), nullable=False),
            sa.Column("start_time", sa.String(10), nullable=False),
            sa.Column("end_time", sa.String(10), nullable=False),
            sa.Column("officer_name", sa.String(150), nullable=True),
            sa.Column("mode", sa.String(20), nullable=False, server_default="offline"),
            sa.Column("location", sa.String(255), nullable=True),
            sa.Column("meeting_url", sa.String(500), nullable=True),
            sa.Column("access_token", sa.String(20), nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("status", sa.String(20), nullable=False, server_default="scheduled"),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )

    # 5. ppdb_exam_attempts
    if not _table_exists("ppdb_exam_attempts"):
        op.create_table(
            "ppdb_exam_attempts",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column(
                "schedule_id",
                sa.String(36),
                sa.ForeignKey("ppdb_exam_schedules.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column(
                "applicant_id",
                sa.String(64),
                sa.ForeignKey("ppdb_applicants.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("status", sa.String(20), nullable=False, server_default="not_started"),
            sa.Column("started_at", sa.DateTime(), nullable=True),
            sa.Column("finished_at", sa.DateTime(), nullable=True),
            sa.Column("remaining_seconds", sa.Integer(), nullable=True),
            sa.Column("violations_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("last_violation_at", sa.DateTime(), nullable=True),
            sa.Column("score", sa.Float(), nullable=True),
            sa.Column("answers_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("ip_address", sa.String(50), nullable=True),
            sa.Column("user_agent", sa.String(255), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )

    # 6. ppdb_exam_answers
    if not _table_exists("ppdb_exam_answers"):
        op.create_table(
            "ppdb_exam_answers",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column(
                "attempt_id",
                sa.String(36),
                sa.ForeignKey("ppdb_exam_attempts.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column(
                "question_id",
                sa.String(36),
                sa.ForeignKey("ppdb_exam_questions.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column(
                "selected_option_id",
                sa.String(36),
                sa.ForeignKey("ppdb_exam_options.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("option_key", sa.String(5), nullable=True),
            sa.Column("is_correct", sa.Boolean(), nullable=True, server_default=sa.false()),
            sa.Column("score_awarded", sa.Float(), nullable=False, server_default="0.0"),
            sa.Column("answered_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )

    # 7. Register pages if pages & modules table exist
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if "pages" in tables and "modules" in tables:
        modules = sa.Table("modules", sa.MetaData(), autoload_with=bind)
        pages = sa.Table("pages", sa.MetaData(), autoload_with=bind)
        module = bind.execute(
            sa.select(modules.c.id).where(modules.c.key == "ppdb")
        ).first()
        if module:
            page_defs = [
                ("bank-soal", "Bank Soal", "FileQuestion", 71),
                ("jadwal-seleksi", "Jadwal Seleksi", "Clock", 72),
            ]
            for key, label, icon, sort_order in page_defs:
                existing = bind.execute(
                    sa.select(pages.c.id).where(
                        pages.c.module_id == module.id,
                        pages.c.key == key,
                    )
                ).first()
                if not existing:
                    bind.execute(
                        pages.insert().values(
                            id=str(uuid4()),
                            module_id=module.id,
                            key=key,
                            label=label,
                            icon=icon,
                            sort_order=sort_order,
                            created_at=datetime.utcnow(),
                            updated_at=datetime.utcnow(),
                        )
                    )


def downgrade() -> None:
    for tbl in [
        "ppdb_exam_answers",
        "ppdb_exam_attempts",
        "ppdb_exam_schedules",
        "ppdb_exam_options",
        "ppdb_exam_questions",
        "ppdb_exam_banks",
    ]:
        if _table_exists(tbl):
            op.drop_table(tbl)

    bind = op.get_bind()
    if "pages" in sa.inspect(bind).get_table_names():
        pages = sa.Table("pages", sa.MetaData(), autoload_with=bind)
        for key in ["bank-soal", "jadwal-seleksi", "jadwal-ujian"]:
            bind.execute(pages.delete().where(pages.c.key == key))
