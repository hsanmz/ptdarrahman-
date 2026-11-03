"""Idempotent database seeder.

Run from the `api/` directory:
    python -m scripts.seed

Creates (only if missing):
  - modules & pages for the permission system
  - default roles ("Superadmin", "Pendaftar", "Admin PPDB", "AdminCP")
  - default site_settings keys
  - default notification templates
  - a default superadmin account (only when none exists)

Permission-module model:
  - `ppdb`          — satu module yang mencakup seluruh sistem PPDB
    (dashboard admin, pendaftar, pembayaran, seleksi, notifikasi).
  - `companyprofile` — module terpisah untuk CMS konten website.

Safe to run repeatedly.
"""

import json
import os
import sys
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.core.config import settings  # noqa: E402
from src.core.database import (  # noqa: E402
    create_record,
    execute_raw,
    get_by_column,
    update_record,
)
from src.core.security import hash_password  # noqa: E402

MODULES = {
    "ppdb": "PPDB",
    "companyprofile": "Company Profile",
}

# Key halaman adalah kontrak antar app: harus SAMA dengan key yang
# diturunkan dari URL di app PPDB (href `/admin/<key>`) dan key tab di
# app Company Profile (`tab.key`). Jangan ubah tanpa menyesuaikan
# `apps/ppdb/src/layouts/AdminLayout.tsx` dan
# `apps/companyprofile/app/admin/dashboard/page.tsx`.
PAGES = {
    "ppdb": [
        ("dashboard", "Dashboard Admin", "LayoutDashboard", 5),
        ("data-pendaftar", "Data Pendaftar", "Users", 10),
        ("verifikasi-dokumen", "Verifikasi Dokumen", "ClipboardCheck", 20),
        ("pembayaran-formulir", "Pembayaran Formulir", "Wallet", 30),
        ("sessions", "Jadwal Seleksi", "Calendar", 40),
        ("penilaian", "Hasil Pendaftaran", "Award", 45),
        ("review-loa", "Review LoA", "FileCheck2", 50),
        ("periods", "Periode PPDB", "CalendarDays", 55),
        ("pengumuman", "Preview LoA", "FileText", 60),
        ("rubrik", "Rubrik Penilaian", "CheckSquare", 65),
        ("arsip", "Arsip Pendaftar", "Archive", 75),
        ("notifications", "Notifikasi", "Bell", 80),
    ],
    "companyprofile": [
        ("hero", "Hero Beranda", "Home", 5),
        ("news", "Berita", "Newspaper", 10),
        ("programs", "Program", "BookOpen", 20),
        ("facilities", "Fasilitas", "Building2", 30),
        ("staff", "Staff", "Users", 40),
        ("achievements", "Prestasi", "Trophy", 50),
        ("gallery", "Galeri", "ImageIcon", 60),
        ("testimonials", "Testimoni", "MessageSquare", 70),
        ("social", "Tautan Sosial", "LinkIcon", 80),
        ("contact", "Info Kontak", "Phone", 90),
        ("settings", "Pengaturan", "Settings", 100),
    ],
}

DEFAULT_ROLES = [
    {
        "name": "Superadmin",
        "description": "Full access to everything.",
        "is_superadmin": True,
        "is_system": True,
        "permissions": {},
    },
    {
        "name": "Pendaftar",
        "description": "Default role for PPDB applicants.",
        "is_superadmin": False,
        "is_system": True,
        "permissions": {
            "ppdb": "dashboard",
        },
    },
    {
        "name": "Admin PPDB",
        "description": (
            "Mengelola seluruh sistem PPDB (pendaftar, pembayaran, seleksi, "
            "notifikasi)."
        ),
        "is_superadmin": False,
        "is_system": False,
        "permissions": {
            "ppdb": "crud",
        },
    },
    {
        "name": "AdminCP",
        "description": "Mengelola konten website (Company Profile).",
        "is_superadmin": False,
        "is_system": False,
        "permissions": {
            "companyprofile": "crud",
        },
    },
]

# Akun superadmin default (hanya dibuat jika belum ada satupun user
# superadmin). Ganti password via env `SEED_SUPERADMIN_PASSWORD`.
DEFAULT_SUPERADMIN_USERNAME = "superadmin"
DEFAULT_SUPERADMIN_PASSWORD = os.getenv("SEED_SUPERADMIN_PASSWORD", "SuperAdmin123!.")

SITE_SETTINGS = [
    (
        "site_description",
        "Membentuk generasi Qurani yang tangguh dan adaptif di era digital.",
    ),
    (
        "favicon",
        "https://res.cloudinary.com/dunynusuh/image/upload/v1782693726/download_cxdfqr.png",
    ),
    (
        "logo",
        "https://res.cloudinary.com/dunynusuh/image/upload/v1755771459/Logo-Ar-Rahman_fm4mgg.png",
    ),
    ("whatsapp", ""),
    ("whatsapp_number", ""),
    ("whatsapp_message", ""),
    ("whatsapp_message_id", ""),
    ("whatsapp_message_en", ""),
    ("to_email", ""),
]

NOTIF_TEMPLATES: list[dict[str, str | None]] = [
    {
        "event_key": "account_updated",
        "label": "Data Akun Diperbarui",
        "channel": "both",
        "email_subject": "Data Akun Anda Telah Diperbarui",
        "body": (
            "Halo {nama_peserta},\n\n"
            "Data kontak akun Anda telah diperbarui oleh admin:\n"
            "  Username: {username}\n"
            "  Email: {email}\n"
            "  No. WhatsApp: {phone}\n\n"
            "Bila Anda tidak merasa melakukan perubahan ini, segera hubungi admin.\n\n"
            "Terima kasih,\nAdmin PTDARRAHMAN"
        ),
    },
    {
        "event_key": "password_reset",
        "label": "Password Direset (Kredensial Baru)",
        "channel": "both",
        "email_subject": "Password Akun Anda Telah Direset",
        "body": (
            "Halo {nama_peserta},\n\n"
            "Password akun Anda telah direset oleh admin. Berikut kredensial "
            "login terbaru:\n"
            "  Username: {username}\n"
            "  Password: {password}\n"
            "  Link Login: {link_login}\n\n"
            "Segera login dan ganti password Anda jika diperlukan.\n\n"
            "Terima kasih,\nAdmin PTDARRAHMAN"
        ),
    },
    {
        "event_key": "payment_expired",
        "label": "Pembayaran Formulir Kedaluwarsa",
        "channel": "both",
        "email_subject": "Pembayaran Formulir Kedaluwarsa",
        "body": (
            "Halo {nama_peserta},\n\n"
            "Tagihan pembayaran formulir Anda telah kedaluwarsa dan dibatalkan. "
            "Tagihan ini tidak dapat dibayar lagi. Silakan mendaftar kembali "
            "jika gelombang berikutnya tersedia.\n\n"
            "Terima kasih,\nPanitia PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman"
        ),
    },
    {
        "event_key": "selection_session_broadcast",
        "label": "Informasi Tambahan Sesi Seleksi",
        "channel": "whatsapp",
        "email_subject": None,
        "body": (
            "Halo {nama_peserta},\n\n"
            "Informasi untuk sesi {session_name}:\n{custom_message}\n\n"
            "Terima kasih,\nPanitia PPDB PTDARRAHMAN"
        ),
    },
    {
        "event_key": "document_approved",
        "label": "Dokumen Disetujui",
        "channel": "both",
        "email_subject": "Dokumen PPDB Anda Disetujui",
        "body": (
            "Halo {nama_peserta},\n\n"
            "Selamat! Dokumen persyaratan Anda telah disetujui. Kami akan "
            "menginformasikan jadwal "
            "seleksi melalui email dan WhatsApp.\n\n"
            "Terima kasih,\nPanitia PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman"
        ),
    },
]


def _now() -> str:
    from src.core.database import utcnow

    return str(utcnow())


def ensure_modules_and_pages() -> None:
    now = _now()
    for key, name in MODULES.items():
        mod = get_by_column("modules", "key", key)
        if not mod:
            mod = create_record(
                "modules",
                {
                    "id": str(uuid4()),
                    "key": key,
                    "name": name,
                    "created_at": now,
                    "updated_at": now,
                },
            )
            print(f"  module created: {key}")
        else:
            print(f"  module exists:   {key}")

        for page_key, label, icon, sort_order in PAGES.get(key, []):
            existing = execute_raw(
                "SELECT id FROM pages WHERE module_id = :mid AND `key` = :k",
                {"mid": mod["id"], "k": page_key},
            )
            if not existing:
                create_record(
                    "pages",
                    {
                        "id": str(uuid4()),
                        "module_id": mod["id"],
                        "key": page_key,
                        "label": label,
                        "icon": icon,
                        "sort_order": sort_order,
                        "has_crud": True,
                        "created_at": now,
                        "updated_at": now,
                    },
                )
                print(f"  page created:    {page_key}")


def ensure_roles() -> None:
    """Create or reconcile every default role to match the seed definition."""
    for role in DEFAULT_ROLES:
        existing = get_by_column("roles", "name", role["name"])
        if existing:
            stored_perms = json.loads(existing.get("permissions") or "{}")
            if (
                stored_perms != role["permissions"]
                or existing.get("description") != role["description"]
                or bool(existing.get("is_superadmin")) != role["is_superadmin"]
                or bool(existing.get("is_system")) != role.get("is_system", False)
            ):
                update_record(
                    "roles",
                    existing["id"],
                    {
                        "description": role["description"],
                        "is_superadmin": 1 if role["is_superadmin"] else 0,
                        "is_system": 1 if role.get("is_system", False) else 0,
                        "permissions": json.dumps(
                            role["permissions"], ensure_ascii=False
                        ),
                    },
                )
                print(f"  role updated:    {role['name']}")
            else:
                print(f"  role exists:     {role['name']}")
            continue
        create_record(
            "roles",
            {
                "id": str(uuid4()),
                "name": role["name"],
                "description": role["description"],
                "is_superadmin": 1 if role["is_superadmin"] else 0,
                "is_system": 1 if role.get("is_system", False) else 0,
                "permissions": json.dumps(role["permissions"], ensure_ascii=False),
            },
        )
        print(f"  role created:    {role['name']}")


def ensure_applicant_roles() -> None:
    """Assign the default 'Pendaftar' role to applicant users missing a role."""
    role = get_by_column("roles", "name", "Pendaftar")
    if not role:
        return
    rows = execute_raw(
        "SELECT id FROM users WHERE user_type = 'applicant' AND role_id IS NULL"
    )
    for row in rows:
        update_record("users", row["id"], {"role_id": role["id"]})
        print(f"  applicant role:  {row['id']} -> Pendaftar")


def ensure_site_settings() -> None:
    defaults = dict(SITE_SETTINGS)
    for key, value in SITE_SETTINGS:
        existing = get_by_column("site_settings", "key", key)
        if not existing:
            create_record("site_settings", {"key": key, "value": value})
            print(f"  setting created: {key}")
        elif not (existing.get("value") or "").strip() and defaults.get(key):
            update_record("site_settings", existing["key"], {"value": value})
            print(f"  setting backfilled: {key}")


def ensure_notification_templates() -> None:
    now = _now()
    for tpl in NOTIF_TEMPLATES:
        existing = get_by_column(
            "notification_templates", "event_key", tpl["event_key"]
        )
        if existing:
            print(f"  template exists:  {tpl['event_key']}")
            continue
        create_record(
            "notification_templates",
            {
                "id": str(uuid4()),
                "event_key": tpl["event_key"],
                "label": tpl["label"],
                "channel": tpl["channel"],
                "email_subject": tpl["email_subject"],
                "body": tpl["body"],
                "is_active": 1,
                "created_at": now,
                "updated_at": now,
            },
        )
        print(f"  template created: {tpl['event_key']}")


def ensure_default_superadmin() -> None:
    """Create a default superadmin account if none exists."""
    existing = execute_raw(
        "SELECT id FROM users WHERE user_type = 'superadmin' LIMIT 1"
    )
    if existing:
        print("  superadmin exists (kept as-is)")
        return
    role = get_by_column("roles", "name", "Superadmin")
    role_id = role["id"] if role else None
    now = _now()
    user_id = str(uuid4())
    create_record(
        "users",
        {
            "id": user_id,
            "username": DEFAULT_SUPERADMIN_USERNAME,
            "full_name": "Superadmin",
            "password_hash": hash_password(DEFAULT_SUPERADMIN_PASSWORD),
            "email": "",
            "phone": "",
            "user_type": "superadmin",
            "role_id": role_id,
            "avatar_url": "",
            "is_active": 1,
            "failed_login_attempts": 0,
            "created_at": now,
            "updated_at": now,
        },
    )
    print(f"  superadmin created: '{DEFAULT_SUPERADMIN_USERNAME}'")


def main() -> None:
    print("Seeding database...")
    print("  Using DATABASE_URL:", settings.database_url)
    ensure_modules_and_pages()
    ensure_roles()
    ensure_applicant_roles()
    ensure_site_settings()
    ensure_notification_templates()
    ensure_default_superadmin()
    print("Done.")


if __name__ == "__main__":
    main()
