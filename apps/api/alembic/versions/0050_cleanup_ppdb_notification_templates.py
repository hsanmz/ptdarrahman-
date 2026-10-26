"""Clean obsolete PPDB notifications and add the LoA completion notice.

Revision ID: 0050
Revises: 0049
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0050"
down_revision: str | None = "0049"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

LOA_EVENT_KEY = "loa_signed_skd_issued"
LOA_TEMPLATE_ID = "notiftmpl-1020-loa-signed-skd"
LOA_TEMPLATE_BODY = (
    "✅ *PENERIMAAN SANTRI BARU RESMI & SKD TERBIT!*\n\n"
    "Alhamdulillah, Halo *{nama_peserta}*,\n"
    "Letter of Acceptance (LoA) telah resmi ditandatangani oleh orang tua/wali. "
    "Anda kini *RESMI DITERIMA* sebagai bagian dari Pesantren Tahfidz Qur'an "
    "dan Digital Ar-Rahman.\n\n"
    "📄 Surat Keterangan Diterima (SKD) dan nomor registrasi "
    "*{nomor_registrasi}* sudah aktif dan dapat diunduh di dashboard pendaftar: "
    "{link_aplikasi}\n\n"
    "📱 *GRUP WHATSAPP RESMI CALON SANTRI BARU:*\n"
    "{link_grup_whatsapp}\n\n"
    "(Mohon tautan tidak disebarkan ke pihak luar.)"
)

OBSOLETE_EVENTS = (
    "welcome",
    "registration_welcome",
    "payment_reminder",
    "payment_reminder_d7",
    "payment_reminder_day7",
    "payment_success",
    "payment_failed",
    "document_reminder_d3",
    "document_reminder_d1",
    "document_reminder_3days",
    "document_reminder_1day",
    "document_rejected",
    "selection_reminder_d5",
    "selection_reminder_d1",
    "selection_reminder_5days",
    "selection_reminder_1day",
    "selection_reminder",
    "selection_result",
    "document_approved_non_tiu",
    "tiu_exam_instructions",
    "tiu_result_ready",
    "dp_payment_reminder",
    "dp_payment_success",
    "reminder_installment",
)


def upgrade() -> None:
    conn = op.get_bind()

    # Pembayaran tahap 2 dan cicilan tidak lagi menjadi bagian dari alur PPDB.
    conn.execute(
        sa.text(
            "DELETE FROM notification_templates "
            "WHERE event_key IN ("
            + ", ".join(f":event_{i}" for i in range(len(OBSOLETE_EVENTS)))
            + ")"
        ),
        {f"event_{i}": event for i, event in enumerate(OBSOLETE_EVENTS)},
    )

    # Selaraskan pesan lulus yang masih mengarahkan wali ke pembayaran tahap 2.
    conn.execute(
        sa.text(
            "UPDATE notification_templates SET label = :label, body = :body, "
            "channel = 'whatsapp', updated_at = CURRENT_TIMESTAMP "
            "WHERE event_key = 'selection_result_passed'"
        ),
        {
            "label": "Pengumuman Lulus dan Instruksi Tanda Tangan LoA",
            "body": (
                "🎉 *ALHAMDULILLAH, ANDA DINYATAKAN LULUS!*\n\n"
                "Selamat *{nama_peserta}*, Anda dinyatakan *LULUS* seleksi PPDB "
                "Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.\n\n"
                "Letter of Acceptance (LoA) dapat ditinjau di dashboard pendaftaran: "
                "{link_aplikasi}\n\n"
                "Silakan login dan bubuhkan tanda tangan digital orang tua/wali pada "
                "LoA untuk menyelesaikan alur PPDB. Setelah ditandatangani, data "
                "pendaftaran terkunci. Rincian biaya pendidikan tercantum pada LoA; "
                "penyetoran dilakukan di luar aplikasi melalui Rekening Resmi "
                "PTDARRAHMAN atau kantor bendahara pesantren."
            ),
        },
    )

    conn.execute(
        sa.text(
            "UPDATE notification_templates SET body = :body, "
            "channel = 'whatsapp', updated_at = CURRENT_TIMESTAMP "
            "WHERE event_key = 'payment_success_formulir'"
        ),
        {
            "body": (
                "✅ *Pembayaran Formulir Berhasil!*\n\n"
                "Halo *{nama_peserta}*, pembayaran formulir Anda telah kami terima. "
                "Terima kasih.\n\n"
                "Langkah selanjutnya adalah mengunggah 9 berkas wajib: NISN, Kartu "
                "Keluarga, Akta Kelahiran, Pas Foto, KTP Orang Tua/Wali, dan 4 Rapor "
                "Terakhir. Silakan login dan lengkapi dokumen di: {link_aplikasi}"
            )
        },
    )

    # Pastikan deployment yang sudah menjalankan migrasi lama mendapat template baru.
    template_values = {
        "id": LOA_TEMPLATE_ID,
        "event_key": LOA_EVENT_KEY,
        "label": "LoA Ditandatangani dan SKD Terbit",
        "body": LOA_TEMPLATE_BODY,
    }
    updated = conn.execute(
        sa.text(
            "UPDATE notification_templates SET label = :label, channel = 'whatsapp', "
            "body = :body, is_active = 1, updated_at = CURRENT_TIMESTAMP "
            "WHERE event_key = :event_key"
        ),
        template_values,
    )
    if not updated.rowcount:
        conn.execute(
            sa.text(
                "INSERT INTO notification_templates "
                "(id, event_key, label, channel, email_subject, body, is_active, "
                "created_at, updated_at) "
                "VALUES (:id, :event_key, :label, 'whatsapp', NULL, :body, 1, "
                "CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            ),
            template_values,
        )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text("DELETE FROM notification_templates WHERE event_key = :event_key"),
        {"event_key": LOA_EVENT_KEY},
    )
