"""Early bird eligibility per applicant + stage 2 fee items reference.

Flag ``early_discount_eligible`` menyimpan keputusan final "X pendaftar awal"
pering pendaftar: diset saat pembayaran formulir sukses. Baris lama di-backfill
dengan urutan pembayaran formulir sukses per gelombang. Master komponen biaya
periode dibuat bila belum ada (tabel ini belum pernah dibuat migrasi sebelumnya),
dan seluruh FK ``fee_item_id`` mengarah ke tabel master periode, bukan lagi
tabel wave fee items legacy.

Revision ID: 0062
Revises: 0060
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0062"
down_revision: str | None = "0061"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_LEGACY_FEE_ITEM_TABLE = "ppdb_wave_fee_items"
_PERIOD_FEE_ITEM_TABLE = "ppdb_period_fee_items"
_FEE_ITEM_TABLES = (
    "ppdb_applicant_discounts",
    "ppdb_stage2_bills",
    "ppdb_wave_fee_discounts",
)


def _table_names(conn: sa.Connection) -> set[str]:
    return set(sa.inspect(conn).get_table_names())


def _column_names(conn: sa.Connection, table: str) -> set[str]:
    return {c["name"] for c in sa.inspect(conn).get_columns(table)}


def _drop_fks(conn: sa.Connection, table: str, referred_table: str) -> None:
    """Lepas FK pada ``table`` yang menunjuk ``referred_table`` (legacy)."""
    if table not in _table_names(conn):
        return
    inspector = sa.inspect(conn)
    wanted = inspector.get_foreign_keys(table)
    for fk in wanted:
        name = fk.get("name")
        constrained = fk.get("constrained_columns") or []
        if (
            fk.get("referred_table") == referred_table
            and "fee_item_id" in constrained
            and name
        ):
            with op.batch_alter_table(table) as batch:
                batch.drop_constraint(name, type_="foreignkey")


def _point_fks_to(conn: sa.Connection, target_table: str) -> None:
    """Buat ulang FK ``fee_item_id`` menuju tabel target."""
    for table in _FEE_ITEM_TABLES:
        if table not in _table_names(conn) or target_table not in _table_names(conn):
            continue
        with op.batch_alter_table(table) as batch:
            batch.create_foreign_key(
                f"fk_{table}_fee_item",
                target_table,
                ["fee_item_id"],
                ["id"],
            )


def _backfill_sqlite(conn: sa.Connection) -> None:
    """Versi backfill untuk SQLite (tanpa UPDATE ... JOIN)."""
    tx_rows = conn.execute(
        sa.text(
            "SELECT ap.wave_id, t.applicant_id, "
            "COALESCE(t.paid_at, t.created_at) AS confirmed_at, t.id "
            "FROM ppdb_payment_transactions t "
            "JOIN ppdb_applicants ap ON ap.id = t.applicant_id "
            "WHERE ap.wave_id IS NOT NULL AND t.status = 'success'"
        )
    ).all()
    quota_rows = conn.execute(
        sa.text(
            "SELECT id, early_discount_quota FROM ppdb_waves "
            "WHERE early_discount_quota > 0"
        )
    ).all()
    quotas: dict[str, int] = {wave_id: int(q) for wave_id, q in quota_rows}

    per_wave: dict[str, list[tuple]] = {}
    for wave_id, applicant_id, confirmed_at, tx_id in tx_rows:
        if wave_id not in quotas:
            continue
        per_wave.setdefault(wave_id, []).append((confirmed_at, tx_id, applicant_id))

    eligible: set[str] = set()
    for wave_id, rows in per_wave.items():
        rows.sort(key=lambda r: (r[0] is not None, r[0] or "", r[1]))
        ranked: set[str] = set()
        for _confirmed_at, _tx_id, applicant_id in rows:
            if applicant_id in ranked:
                continue
            rank = len(ranked) + 1
            ranked.add(applicant_id)
            if rank <= quotas[wave_id]:
                eligible.add(applicant_id)
    for applicant_id in eligible:
        conn.execute(
            sa.text(
                "UPDATE ppdb_applicants SET early_discount_eligible = 1 "
                "WHERE id = :aid"
            ),
            {"aid": applicant_id},
        )


def upgrade() -> None:
    conn = op.get_bind()
    tables = _table_names(conn)
    if "ppdb_applicants" not in tables:
        return

    # ── 0. Master komponen biaya periode (belum pernah ada di migrasi lama).
    if _PERIOD_FEE_ITEM_TABLE not in tables:
        op.create_table(
            _PERIOD_FEE_ITEM_TABLE,
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column(
                "period_id",
                sa.String(50),
                sa.ForeignKey("ppdb_periods.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("nominal", sa.BigInteger(), nullable=False, server_default="0"),
            sa.Column("description", sa.String(500), nullable=True),
            sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        )

    applicant_cols = _column_names(conn, "ppdb_applicants")
    if "early_discount_eligible" not in applicant_cols:
        op.add_column(
            "ppdb_applicants",
            sa.Column(
                "early_discount_eligible",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("0"),
            ),
        )

    # ── 1. Backfill: X pembayar formulir pertama per gelombang ────────────────
    if {"ppdb_payment_transactions", "ppdb_waves"} <= tables:
        if conn.dialect.name == "sqlite":
            _backfill_sqlite(conn)
        else:
            conn.execute(
                sa.text(
                    """
                    UPDATE ppdb_applicants a
                    JOIN (
                        SELECT t.applicant_id,
                               ROW_NUMBER() OVER (
                                   PARTITION BY ap.wave_id
                                   ORDER BY COALESCE(t.paid_at, t.created_at), t.id
                               ) AS rk
                        FROM ppdb_payment_transactions t
                        JOIN ppdb_applicants ap ON ap.id = t.applicant_id
                        WHERE ap.wave_id IS NOT NULL
                          AND t.status = 'success'
                    ) r ON r.applicant_id = a.id
                    JOIN ppdb_waves w
                      ON w.id = a.wave_id AND w.early_discount_quota > 0
                    SET a.early_discount_eligible = 1
                    WHERE r.rk <= w.early_discount_quota
                    """
                )
            )

    # ── 2. FK fee_item_id mengarah ke master komponen biaya periode ──────────
    for table in _FEE_ITEM_TABLES:
        _drop_fks(conn, table, _LEGACY_FEE_ITEM_TABLE)
    _point_fks_to(conn, _PERIOD_FEE_ITEM_TABLE)


def downgrade() -> None:
    conn = op.get_bind()
    tables = _table_names(conn)

    # Kembalikan FK ke tabel legacy (hanya jika tabel legacy memang ada).
    for table in _FEE_ITEM_TABLES:
        _drop_fks(conn, table, _PERIOD_FEE_ITEM_TABLE)
    _point_fks_to(conn, _LEGACY_FEE_ITEM_TABLE)

    if _PERIOD_FEE_ITEM_TABLE in tables and not _has_period_fee_item_rows(conn):
        op.drop_table(_PERIOD_FEE_ITEM_TABLE)

    cols = _column_names(conn, "ppdb_applicants")
    if "early_discount_eligible" in cols:
        op.drop_column("ppdb_applicants", "early_discount_eligible")


def _has_period_fee_item_rows(conn: sa.Connection) -> bool:
    if _PERIOD_FEE_ITEM_TABLE not in _table_names(conn):
        return False
    count = conn.execute(
        sa.text(f"SELECT COUNT(*) FROM {_PERIOD_FEE_ITEM_TABLE}")  # noqa: S608
    ).scalar()
    return bool((count or 0) > 0)
