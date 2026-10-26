"""Align PPDB notifications with fixed schedules and registration outcomes.

Revision ID: 0054
Revises: 0053
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0054"
down_revision: str | None = "0053"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

OBSOLETE_EVENTS = (
    "reminder_take_session_h2",
    "officer_session_booked",
    "tahfidz_score_recorded",
    "interview_completed",
    "selection_result_passed",
    "selection_result_failed",
    "stage2_installment_success",
)

TEMPLATES = (
    (
        "account_updated",
        "Username, Email, atau Nomor Telepon Diubah",
        "🔐 *DATA AKUN DIPERBARUI*\n\n"
        "Halo *{nama_peserta}*, username, email, atau nomor telepon akun Anda telah diubah.\n\n"
        "Username: *{username}*\nEmail: *{email}*\nNomor telepon: *{phone}*\n\n"
        "Jika Anda tidak melakukan atau menyetujui perubahan ini, segera hubungi admin.",
    ),
    (
        "password_changed",
        "Password Diubah oleh Pemilik Akun",
        "🔐 *PASSWORD AKUN BERHASIL DIUBAH*\n\n"
        "Halo *{nama_peserta}*, password akun Anda baru saja diubah. Pesan ini hanya "
        "sebagai konfirmasi dan tidak memuat password.\n\n"
        "Jika Anda tidak melakukan perubahan ini, segera hubungi admin.",
    ),
    (
        "session_confirmed",
        "Jadwal Seleksi Ditetapkan atau Diubah",
        "📅 *JADWAL SELEKSI DITETAPKAN / DIPERBARUI*\n\n"
        "Halo *{nama_peserta}*, jadwal *{nama_ujian}* Anda telah ditetapkan atau diperbarui.\n\n"
        "📆 Tanggal: *{tanggal}*\n⏰ Waktu: *{jam_mulai} - {jam_selesai}*\n"
        "📍 Lokasi/Link: *{lokasi_atau_link}*\n\n"
        "Jadwal ditetapkan oleh panitia; Anda tidak perlu memilih sesi. "
        "Harap hadir/bergabung 15 menit lebih awal. Detail tersedia di: {link_aplikasi}",
    ),
    (
        "assessment_stage_completed",
        "Tahap Penilaian Selesai",
        "✅ *TAHAP PENILAIAN SELESAI*\n\n"
        "Halo *{nama_peserta}*, tahap *{nama_tahap}* telah selesai dan dicatat.\n\n"
        "Pantau dashboard untuk informasi jadwal tahap berikutnya atau hasil pendaftaran: "
        "{link_aplikasi}",
    ),
    (
        "registration_result_passed",
        "Hasil Pendaftaran: Lulus",
        "🎉 *HASIL PENDAFTARAN: LULUS*\n\n"
        "Selamat *{nama_peserta}*, Anda dinyatakan *LULUS* dalam proses pendaftaran "
        "Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.\n\n"
        "Silakan buka laman Hasil Pendaftaran di {link_aplikasi} untuk melihat "
        "persetujuan, meninjau Letter of Acceptance (LoA), dan menyelesaikan tanda tangan. "
        "Rincian biaya pendidikan tercantum pada LoA; penyetoran dilakukan di luar aplikasi.",
    ),
    (
        "registration_result_failed",
        "Hasil Pendaftaran: Tidak Lulus",
        "📢 *HASIL PENDAFTARAN: TIDAK LULUS*\n\n"
        "Halo *{nama_peserta}*, terima kasih telah mengikuti seluruh tahapan penilaian "
        "PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.\n\n"
        "Dengan berat hati kami sampaikan bahwa hasil pendaftaran Anda saat ini "
        "*TIDAK LULUS*. Semoga tetap semangat dan memperoleh kesempatan terbaik.",
    ),
)


def _upsert_template(event_key: str, label: str, body: str) -> None:
    conn = op.get_bind()
    existing = conn.execute(
        sa.text(
            "SELECT id FROM notification_templates WHERE event_key = :event_key"
        ),
        {"event_key": event_key},
    ).first()
    if existing:
        conn.execute(
            sa.text(
                "UPDATE notification_templates SET label = :label, channel = 'whatsapp', "
                "email_subject = NULL, body = :body, is_active = 1, "
                "updated_at = CURRENT_TIMESTAMP WHERE event_key = :event_key"
            ),
            {"event_key": event_key, "label": label, "body": body},
        )
    else:
        conn.execute(
            sa.text(
                "INSERT INTO notification_templates "
                "(id, event_key, label, channel, email_subject, body, is_active, "
                "created_at, updated_at) VALUES "
                "(:id, :event_key, :label, 'whatsapp', NULL, :body, 1, "
                "CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            ),
            {
                "id": f"notiftmpl-0054-{event_key}",
                "event_key": event_key,
                "label": label,
                "body": body,
            },
        )


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "DELETE FROM notification_templates WHERE event_key IN ("
            + ", ".join(f":event_{i}" for i in range(len(OBSOLETE_EVENTS)))
            + ")"
        ),
        {f"event_{i}": event for i, event in enumerate(OBSOLETE_EVENTS)},
    )

    conn.execute(
        sa.text(
            "UPDATE notification_templates SET label = :label, body = :body, "
            "channel = 'whatsapp', updated_at = CURRENT_TIMESTAMP "
            "WHERE event_key = 'document_approved'"
        ),
        {
            "label": "Dokumen Disetujui — Jadwal Ditetapkan Panitia",
            "body": (
                "✅ *DOKUMEN PENDAFTARAN DISETUJUI*\n\n"
                "Halo *{nama_peserta}*, dokumen persyaratan Anda telah disetujui. "
                "Jadwal seleksi ditetapkan oleh panitia dan akan dikirim melalui "
                "WhatsApp serta dashboard. Anda tidak perlu memilih jadwal sendiri: "
                "{link_aplikasi}"
            ),
        },
    )

    for event_key, label, body in TEMPLATES:
        _upsert_template(event_key, label, body)


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "DELETE FROM notification_templates WHERE event_key IN ("
            "'assessment_stage_completed', 'registration_result_passed', "
            "'registration_result_failed')"
        )
    )
