"""Move form fee & minimum DP from wave to period master.

Biaya formulir (pembayaran QRIS saat pendaftaran) dan minimal uang muka (DP)
yang selama ini diatur per gelombang naik ke level Periode sebagai master —
gelombang kini hanya mengatur diskon per komponen biaya periode.

Revision ID: 0061
Revises: 0059
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0061"
down_revision: str | None = "0060"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _table_names(conn: sa.Connection) -> set[str]:
    return set(sa.inspect(conn).get_table_names())


def _column_names(conn: sa.Connection, table: str) -> set[str]:
    return {c["name"] for c in sa.inspect(conn).get_columns(table)}


def upgrade() -> None:
    conn = op.get_bind()
    tables = _table_names(conn)
    if "ppdb_periods" not in tables or "ppdb_waves" not in tables:
        return

    period_cols = _column_names(conn, "ppdb_periods")

    # 1. Master baru di level periode.
    if "form_fee" not in period_cols:
        op.add_column(
            "ppdb_periods",
            sa.Column("form_fee", sa.BigInteger(), nullable=False, server_default="0"),
        )
    if "minimum_dp" not in period_cols:
        op.add_column(
            "ppdb_periods",
            sa.Column(
                "minimum_dp", sa.BigInteger(), nullable=False, server_default="0"
            ),
        )

    # 2. Semai nilainya dari gelombang terakhir tiap periode (gelombang aktif
    #    lebih diutamakan) agar konfigurasi panitia tidak hilang.
    wave_cols = _column_names(conn, "ppdb_waves")
    if "registration_fee" in wave_cols or "minimum_dp" in wave_cols:
        periods = conn.execute(sa.text("SELECT id FROM ppdb_periods")).all()
        for (period_id,) in periods:
            row = conn.execute(
                sa.text(
                    "SELECT registration_fee, minimum_dp FROM ppdb_waves "
                    "WHERE period_id = :pid "
                    "ORDER BY (status = 'active') DESC, wave_number DESC LIMIT 1"
                ),
                {"pid": period_id},
            ).first()
            if not row:
                continue
            conn.execute(
                sa.text(
                    "UPDATE ppdb_periods "
                    "SET form_fee = :fee, minimum_dp = :dp WHERE id = :pid"
                ),
                {"fee": int(row[0] or 0), "dp": int(row[1] or 0), "pid": period_id},
            )

    # 3. Gelombang tidak lagi menyimpan biaya.
    wave_cols = _column_names(conn, "ppdb_waves")
    for name in ("registration_fee", "second_stage_fee", "minimum_dp"):
        if name in wave_cols:
            op.drop_column("ppdb_waves", name)


def downgrade() -> None:
    conn = op.get_bind()
    tables = _table_names(conn)
    if "ppdb_periods" not in tables or "ppdb_waves" not in tables:
        return

    period_cols = _column_names(conn, "ppdb_periods")
    wave_cols = _column_names(conn, "ppdb_waves")

    # Kembalikan kolom gelombang; nilai formulir & DP disalin dari master
    # periode. `second_stage_fee` sudah tidak dipakai — cukup diisi 0.
    if "registration_fee" not in wave_cols:
        op.add_column(
            "ppdb_waves",
            sa.Column(
                "registration_fee", sa.BigInteger(), nullable=False, server_default="0"
            ),
        )
    if "minimum_dp" not in wave_cols:
        op.add_column(
            "ppdb_waves",
            sa.Column(
                "minimum_dp", sa.BigInteger(), nullable=False, server_default="0"
            ),
        )
    if "second_stage_fee" not in wave_cols:
        op.add_column(
            "ppdb_waves",
            sa.Column(
                "second_stage_fee", sa.BigInteger(), nullable=False, server_default="0"
            ),
        )

    if "form_fee" in period_cols:
        conn.execute(
            sa.text(
                "UPDATE ppdb_waves w JOIN ppdb_periods p ON p.id = w.period_id "
                "SET w.registration_fee = p.form_fee"
            )
        )
    if "minimum_dp" in period_cols:
        conn.execute(
            sa.text(
                "UPDATE ppdb_waves w JOIN ppdb_periods p ON p.id = w.period_id "
                "SET w.minimum_dp = p.minimum_dp"
            )
        )

    for name in ("form_fee", "minimum_dp"):
        if name in period_cols:
            op.drop_column("ppdb_periods", name)
