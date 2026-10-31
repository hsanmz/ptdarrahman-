"""Full System End-to-End Testing Suite for PPDB PTDARRAHMAN.

Tests the entire lifecycle across all actors (Applicant, Evaluator, Admin, Superadmin)
based on the official specifications and ASCII flows in docs/:
- docs/pendaftar-code-1790812852070.txt (Applicant Flow 14 Steps)
- docs/admin-code-1790812960259.txt (Admin Verification, CBT Monitoring,
  Evaluation & LoA)
- docs/backoffice-code-1790813618837.txt (Backoffice Configuration,
  Master Fee Items & Discounts)
- docs/REQUIREMENTS.md & docs/notifikasi-code-1790904241894.md
"""

import io
import uuid
import zipfile
from datetime import date, datetime, timedelta
from typing import Any
from unittest.mock import MagicMock, patch
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.core.pakasir import CreateTransactionResult
from src.core.security import create_access_token, hash_password
from src.main import app
from src.models.auth import Role, User
from src.models.ppdb import (
    PPDBApplicant,
    PPDBPeriod,
    PPDBWave,
)

WIB = ZoneInfo("Asia/Jakarta")


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db_session():
    generator = get_db()
    session = next(generator)
    try:
        yield session
    finally:
        try:
            next(generator)
        except StopIteration:
            pass


@pytest.fixture
def admin_token(db_session: Session):
    admin = db_session.query(User).filter(User.username == "superadmin").first()
    if not admin:
        admin_role = db_session.query(Role).filter(Role.name == "superadmin").first()
        if not admin_role:
            admin_role = Role(
                id=str(uuid.uuid4()), name="superadmin", description="Superadmin"
            )
            db_session.add(admin_role)
            db_session.commit()
        admin = User(
            id=str(uuid.uuid4()),
            username="superadmin",
            email="superadmin@ptdarrahman.sch.id",
            password_hash=hash_password("SuperAdmin123!"),
            full_name="Super Admin PTDARRAHMAN",
            role_id=admin_role.id,
            user_type="superadmin",
            is_active=True,
        )
        db_session.add(admin)
        db_session.commit()
    elif admin.user_type != "superadmin":
        admin.user_type = "superadmin"
        db_session.commit()
    return create_access_token(
        {
            "sub": admin.id,
            "user_id": admin.id,
            "username": admin.username,
            "role": "superadmin",
        }
    )


def _make_created_result(
    txn_id: str, order_id: str = "PPDB-FORM-001"
) -> CreateTransactionResult:
    return CreateTransactionResult(
        txn_id=txn_id,
        order_id=order_id,
        amount=350000,
        fee=0,
        total_payment=350000,
        payment_method="qris",
        qr_string="00020101021226590016ID.CO.PAKASIR...",
        payment_link="https://app.pakasir.com/pay/dummy",
        va_number=None,
        expired_at=datetime.now(WIB).isoformat(),
        is_sandbox=True,
        raw={},
    )


class TestFullSystemEndToEnd:
    """Complete E2E lifecycle test covering all phases and actors."""

    @patch("src.core.notif_service.send_notifications", return_value=True)
    @patch("src.core.notif_service.send_notification", return_value=True)
    @patch("src.core.notif_service.send_custom_notifications", return_value=True)
    def test_full_system_lifecycle(
        self,
        mock_notif_custom,
        mock_notif_single,
        mock_notif_multi,
        client: TestClient,
        db_session: Session,
        admin_token: str,
    ):
        admin_headers = {"Cookie": f"access_token={admin_token}"}
        today = date.today()
        now = datetime.now(WIB)

        # =====================================================================
        # 1. BACKOFFICE: Setup Period, Master Fee Items & Wave Discounts
        # =====================================================================
        # Pastikan period dan wave sebelumnya diinaktifkan
        db_session.query(PPDBWave).update({"status": "inactive"})
        db_session.query(PPDBPeriod).update({"status": "inactive"})
        db_session.commit()

        # 1a. Buat Periode Aktif
        period_res = client.post(
            "/ppdb/periods",
            headers=admin_headers,
            json={
                "name": "Tahun Ajaran 2026/2027",
                "academic_year": "2026/2027",
                "description": (
                    "Periode PPDB Baru Pesantren Tahfidz Qur'an dan Digital "
                    "Ar-Rahman"
                ),
                "wa_group_link": "https://chat.whatsapp.com/PTD-Official-2026",
                "head_of_committee": "Ustadz H. Abdullah S.Pd.I",
                "form_fee": 350000,
                "minimum_dp": 2500000,
            },
        )
        assert period_res.status_code == 201, period_res.text
        period_data = period_res.json()
        period_id = period_data["id"]

        # Aktifkan periode
        client.put(f"/ppdb/periods/{period_id}/activate", headers=admin_headers)

        # 1b. Master Komponen Biaya Periode
        item1_res = client.post(
            f"/ppdb/periods/{period_id}/fee-items",
            headers=admin_headers,
            json={
                "name": "Uang Pangkal Masuk",
                "nominal": 15000000,
                "description": "Biaya masuk gedung dan sarana",
                "order_index": 1,
            },
        )
        assert item1_res.status_code == 201, item1_res.text
        item1_id = item1_res.json()["id"]

        item2_res = client.post(
            f"/ppdb/periods/{period_id}/fee-items",
            headers=admin_headers,
            json={
                "name": "SPP Bulan Juli",
                "nominal": 1500000,
                "description": "SPP bulan pertama",
                "order_index": 2,
            },
        )
        assert item2_res.status_code == 201, item2_res.text

        # 1c. Buat Gelombang Pendaftaran dengan Kuota = 2, Early Bird Quota = 1
        wave_res = client.post(
            "/ppdb/waves",
            headers=admin_headers,
            json={
                "period_id": period_id,
                "name": "Gelombang 1 Istimewa",
                "registration_start_date": today.isoformat(),
                "registration_end_date": (today + timedelta(days=30)).isoformat(),
                "quota": 2,  # Kuota bayar sukses 2 pendaftar
                "early_discount_quota": 1,  # Early bird hanya 1 pendaftar pertama
            },
        )
        assert wave_res.status_code == 201, wave_res.text
        wave_data = wave_res.json()
        wave_id = wave_data["id"]

        # Aktifkan gelombang
        client.put(f"/ppdb/waves/{wave_id}/activate", headers=admin_headers)

        # Atur Diskonasi per Komponen di Gelombang
        disc_res = client.put(
            f"/ppdb/waves/{wave_id}/fee-discounts/{item1_id}",
            headers=admin_headers,
            json={
                "discount_type": "percent",
                "discount_value": 10.0,  # Diskon reguler 10%
                "early_discount_type": "percent",
                "early_discount_value": 20.0,  # Early bird diskon 20%
            },
        )
        assert disc_res.status_code == 200, disc_res.text

        # =====================================================================
        # 2. CBT BANK SOAL & JADWAL SELEKSI (AKADEMIK & PSIKOLOGI)
        # =====================================================================
        # 2a. Buat Bank Soal Akademik
        csv_akademik = (
            b"No,Pertanyaan,Pilihan A,Pilihan B,Pilihan C,Pilihan D,Pilihan E,"
            b"Kunci Jawaban,Poin\n"
            b"1,Berapa 15 x 10?,100,120,150,180,200,C,50\n"
            b"2,Siapa khalifah pertama umat Islam?,Umar,Abu Bakar,Utsman,Ali,"
            b"Muawiyah,B,50\n"
        )

        import_akad_res = client.post(
            "/cbt/banks/import",
            headers=admin_headers,
            data={"category": "akademik", "title": "Bank Soal Akademik Batch 1"},
            files={"file": ("soal_akademik.csv", csv_akademik, "text/csv")},
        )
        assert import_akad_res.status_code == 200, import_akad_res.text
        bank_akademik_id = import_akad_res.json()["id"]

        # 2b. Buat Bank Soal Psikologi
        csv_psikologi = (
            b"No,Pertanyaan,Pilihan A,Pilihan B,Pilihan C,Pilihan D,Pilihan E,"
            b"Kunci Jawaban,Poin\n"
            b"1,Ketika menghadapi masalah baru apa yang dilakukan?,Menghindar,"
            b"Mencoba mandiri,Putus asa,Menangis,Diam,B,50\n"
            b"2,Bagaimana sikap terhadap teman yang membutuhkan?,Apatis,"
            b"Membantu ikhlas,Mengejek,Mengabaikan,Menertawakan,B,50\n"
        )

        import_psik_res = client.post(
            "/cbt/banks/import",
            headers=admin_headers,
            data={"category": "psikologi", "title": "Bank Soal Psikologi Batch 1"},
            files={"file": ("soal_psikologi.csv", csv_psikologi, "text/csv")},
        )
        assert import_psik_res.status_code == 200, import_psik_res.text
        bank_psikologi_id = import_psik_res.json()["id"]

        # 2c. Buat Jadwal CBT Akademik & CBT Psikologi
        sched_akad_res = client.post(
            "/cbt/schedules",
            headers=admin_headers,
            json={
                "wave_id": wave_id,
                "bank_id": bank_akademik_id,
                "category": "akademik",
                "name": "Ujian CBT Akademik Batch 1",
                "batch_name": "Batch 1 - Gelombang 1",
                "session_date": today.isoformat(),
                "start_time": "00:00",
                "end_time": "23:59",
                "mode": "online",
            },
        )
        assert sched_akad_res.status_code == 200, sched_akad_res.text
        sched_akad_data = sched_akad_res.json()
        cbt_akad_schedule_id = sched_akad_data["id"]
        cbt_akad_pin = sched_akad_data["access_token"]

        sched_psik_res = client.post(
            "/cbt/schedules",
            headers=admin_headers,
            json={
                "wave_id": wave_id,
                "bank_id": bank_psikologi_id,
                "category": "psikologi",
                "name": "Ujian CBT Psikologi Batch 1",
                "batch_name": "Batch 1 - Gelombang 1",
                "session_date": today.isoformat(),
                "start_time": "00:00",
                "end_time": "23:59",
                "mode": "online",
            },
        )
        assert sched_psik_res.status_code == 200, sched_psik_res.text
        sched_psik_data = sched_psik_res.json()
        cbt_psik_schedule_id = sched_psik_data["id"]
        cbt_psik_pin = sched_psik_data["access_token"]

        # 2d. Buat Kategori & Rubrik Tahfidz dan Wawancara Terpadu
        cat_tahfidz_res = client.post(
            "/selection/categories",
            headers=admin_headers,
            json={"name": "Tahfidz Al-Qur'an"},
        )
        assert cat_tahfidz_res.status_code in (200, 201), cat_tahfidz_res.text
        cat_tahfidz_id = cat_tahfidz_res.json()["id"]

        crit_tahfidz_res = client.post(
            f"/selection/categories/{cat_tahfidz_id}/criteria",
            headers=admin_headers,
            json={
                "name": "Kelancaran & Makharijul Huruf",
                "weight": 100.0,
                "description": "Ketepatan bacaan",
            },
        )
        assert crit_tahfidz_res.status_code in (200, 201), crit_tahfidz_res.text
        crit_tahfidz_id = crit_tahfidz_res.json()["id"]

        cat_interview_res = client.post(
            "/selection/categories",
            headers=admin_headers,
            json={"name": "Wawancara Terpadu"},
        )
        assert cat_interview_res.status_code in (200, 201), cat_interview_res.text
        cat_interview_id = cat_interview_res.json()["id"]

        crit_interview_res = client.post(
            f"/selection/categories/{cat_interview_id}/criteria",
            headers=admin_headers,
            json={
                "name": "Kesiapan Santri & Komitmen Orang Tua",
                "weight": 100.0,
                "description": "Komitmen belajar",
            },
        )
        assert crit_interview_res.status_code in (200, 201), crit_interview_res.text
        crit_interview_id = crit_interview_res.json()["id"]

        # 2e. Buat Sesi Seleksi Tahfidz & Wawancara Terpadu
        tahfidz_sess_res = client.post(
            "/selection/sessions",
            headers=admin_headers,
            json={
                "wave_id": wave_id,
                "name": "Seleksi Tahfidz Batch 1",
                "session_type": "tahfidz",
                "session_date": today.isoformat(),
                "start_time": "00:00",
                "end_time": "23:59",
                "quota": 10,
                "mode": "online",
                "officer_name": "Ustadz Hafizh Al-Mubarak",
                "meeting_url": "https://zoom.us/j/tahfidz-ptdarrahman",
                "batch_name": "Batch 1 - Gelombang 1",
            },
        )
        assert tahfidz_sess_res.status_code == 201, tahfidz_sess_res.text

        interview_sess_res = client.post(
            "/selection/sessions",
            headers=admin_headers,
            json={
                "wave_id": wave_id,
                "name": "Wawancara Terpadu Santri & Ortu Batch 1",
                "session_type": "wawancara",
                "session_date": today.isoformat(),
                "start_time": "00:00",
                "end_time": "23:59",
                "quota": 10,
                "mode": "online",
                "officer_name": "Ustadz H. Lukman M.Pd.I",
                "meeting_url": "https://zoom.us/j/interview-ptdarrahman",
                "batch_name": "Batch 1 - Gelombang 1",
            },
        )
        assert interview_sess_res.status_code == 201, interview_sess_res.text

        # =====================================================================
        # 3. PENDAFTAR 1: Registrasi Akun (Wizard 6 Bagian + 10 Soal Kesehatan)
        # =====================================================================
        pendaftar1_payload: dict[str, Any] = {
            "full_name": "Budi Santoso",
            "gender": "L",
            "nisn": "1234567890",
            "nik": "3201010101010001",
            "birth_place": "Bogor",
            "birth_date": "2012-05-15",
            "previous_school": "SD IT Al-Hikmah",
            # Ortu lengkap
            "father_name": "Ahmad Subarjo",
            "father_job": "PNS",
            "father_phone": "081234567890",
            "mother_name": "Siti Aminah",
            "mother_job": "Ibu Rumah Tangga",
            "mother_phone": "081234567891",
            "parent_email": "subarjo.family@example.com",
            "parent_income": "5000000-10000000",
            # Kontak pendaftar
            "phone": "081234567899",
            "email": "budi.santoso@example.com",
            # Domisili
            "address": "Jl. Pesantren Digital No. 7, Sukamaju",
            "province": "Jawa Barat",
            "city": "Bogor",
            "district": "Ciawi",
            "village": "Bendungan",
            "postal_code": "16720",
            # Identifikasi Kesehatan 10 Pertanyaan
            "health_form": {
                "chronic_disease": False,
                "chronic_disease_description": None,
                "diagnosed_conditions": [],
                "diagnosed_conditions_other": None,
                "diagnosed_conditions_description": None,
                "allergies": True,
                "allergy_types": ["Debu"],
                "allergy_other": None,
                "allergy_description": "Bersin jika terkena debu tebal",
                "regular_medication": False,
                "regular_medication_description": None,
                "physical_limitation": False,
                "physical_limitation_description": None,
                "hospitalization_history": False,
                "hospitalization_history_description": None,
                "special_needs": False,
                "special_needs_description": None,
                "emergency_contact_name": "Ahmad Subarjo",
                "emergency_contact_relation": "Ayah Kandung",
                "emergency_contact_phone": "081234567890",
                "health_declaration_confirmed": True,
            },
            # Pernyataan 4 persetujuan
            "agreement_confirmed": True,
        }

        reg_res = client.post("/ppdb/register", json=pendaftar1_payload)
        assert reg_res.status_code == 201, reg_res.text
        reg_data = reg_res.json()
        applicant1_id = reg_data["applicant_id"]
        applicant1_username = reg_data["credentials"]["username"]
        applicant1_temp_password = reg_data["credentials"]["password"]

        # =====================================================================
        # 4. PENDAFTAR 1: Login & Profil Mandiri
        # =====================================================================
        login_res = client.post(
            "/auth/login",
            json={
                "username": applicant1_username,
                "password": applicant1_temp_password,
            },
        )
        assert login_res.status_code == 200, login_res.text
        pendaftar1_token = login_res.json()["access_token"]
        p1_headers = {"Cookie": f"access_token={pendaftar1_token}"}

        # Periksa data profil mandiri
        me_res = client.get("/ppdb/applicants/me", headers=p1_headers)
        assert me_res.status_code == 200, me_res.text
        p1_profile = me_res.json()["applicant"]
        assert p1_profile["full_name"] == "Budi Santoso"
        assert p1_profile["wave_id"] == wave_id
        assert p1_profile["is_locked"] is False

        # Update mandiri profil selama is_locked = False
        update_res = client.put(
            "/ppdb/applicants/me",
            headers=p1_headers,
            json={"previous_school": "SD IT Al-Hikmah Unggulan"},
        )
        assert update_res.status_code == 200, update_res.text
        assert (
            update_res.json()["applicant"]["previous_school"]
            == "SD IT Al-Hikmah Unggulan"
        )

        # =====================================================================
        # 5. PEMBAYARAN FORMULIR PAKASIR v2 QRIS & EARLY BIRD QUALIFICATION
        # =====================================================================
        fake_txn_id = f"tx_{uuid.uuid4().hex[:8]}"
        with patch(
            "src.services.payment_service.get_pakasir_client"
        ) as mock_get_client:
            mock_client = MagicMock()
            mock_client.create_transaction.return_value = _make_created_result(
                fake_txn_id
            )
            mock_get_client.return_value = mock_client

            qris_res = client.post(
                "/payment/create-qris",
                headers=p1_headers,
                json={"payment_type": "form"},
            )
            assert qris_res.status_code in (200, 201), qris_res.text
            qris_data = qris_res.json()
            txn_id = qris_data["id"]
            order_id = qris_data["order_id"]

        # Webhook Pakasir v2 masuk (Lunas)
        webhook_payload = {
            "order_id": order_id,
            "txn_id": fake_txn_id,
            "amount": 350000,
            "status": "completed",
            "payment_method": "qris",
            "completed_at": now.isoformat(),
        }

        webhook_res = client.post(
            "/payment/webhook",
            headers={"X-Secret": ""},
            json=webhook_payload,
        )
        assert webhook_res.status_code == 200, webhook_res.text

        # Verifikasi Pendaftar 1 mendapat Early Bird
        db_session.expire_all()
        app1_db = (
            db_session.query(PPDBApplicant)
            .filter(PPDBApplicant.id == applicant1_id)
            .first()
        )
        assert (
            app1_db.early_discount_eligible is True
        ), "Pendaftar 1 harus mendapat early discount flag"
        assert app1_db.payment_status == "paid"
        assert app1_db.status == "document_uploaded_pending"

        # Kuitansi resmi terbit
        receipt_res = client.get(f"/payment/receipt/{txn_id}", headers=p1_headers)
        assert receipt_res.status_code == 200, receipt_res.text
        receipt_data = receipt_res.json()
        assert receipt_data["status"] == "success"

        # Verifikasi kuitansi publik tanpa login
        public_receipt_res = client.get(f"/payment/public-receipt/{txn_id}")
        assert public_receipt_res.status_code == 200, public_receipt_res.text

        # =====================================================================
        # 6. UNGGAH & SUBMIT DOKUMEN PERSYARATAN
        # =====================================================================
        dummy_file = (
            "kartu_keluarga.pdf",
            io.BytesIO(b"%PDF-1.4 Dummy Document Content"),
            "application/pdf",
        )
        upload_res = client.post(
            "/ppdb/documents/upload",
            headers=p1_headers,
            data={"doc_type": "Kartu Keluarga (KK)"},
            files={"file": dummy_file},
        )
        assert upload_res.status_code == 200, upload_res.text

        # Admin dapat memverifikasi dokumen langsung
        verify_res = client.post(
            f"/ppdb/applicants/{applicant1_id}/documents/verify",
            headers=admin_headers,
            json={"status": "document_approved"},
        )
        assert verify_res.status_code == 200, verify_res.text

        db_session.expire_all()
        app1_db = (
            db_session.query(PPDBApplicant)
            .filter(PPDBApplicant.id == applicant1_id)
            .first()
        )
        assert (
            app1_db.status == "selection"
        ), "Status harus beralih ke selection setelah dokumen disetujui"

        # =====================================================================
        # 7. UJIAN SELEKSI CBT MANDIRI (AKADEMIK & PSIKOLOGI)
        # =====================================================================
        # 7a. Ujian Akademik: Dual Auth (Password + PIN Sesi)
        cbt_access_res = client.post(
            f"/cbt/verify-access/{cbt_akad_schedule_id}",
            headers=p1_headers,
            json={"password": applicant1_temp_password, "access_token": cbt_akad_pin},
        )
        assert cbt_access_res.status_code == 200, cbt_access_res.text
        assert cbt_access_res.json()["valid"] is True

        # Ambil Lembar Ujian Akademik
        sheet_akad_res = client.get(
            f"/cbt/exam-sheet/{cbt_akad_schedule_id}", headers=p1_headers
        )
        assert sheet_akad_res.status_code == 200, sheet_akad_res.text
        questions_akad = sheet_akad_res.json()["questions"]
        assert len(questions_akad) == 2

        # Autosave Jawaban Akademik
        for q in questions_akad:
            opt_id = q["options"][0]["id"]
            opt_key = q["options"][0]["option_key"]
            ans_res = client.post(
                f"/cbt/save-answer/{cbt_akad_schedule_id}",
                headers=p1_headers,
                json={
                    "question_id": q["id"],
                    "selected_option_id": opt_id,
                    "option_key": opt_key,
                },
            )
            assert ans_res.status_code == 200

        # Anti-Cheating Monitor: Tab switch violation
        violation_res = client.post(
            f"/cbt/violation/{cbt_akad_schedule_id}",
            headers=p1_headers,
            json={"reason": "Pindah jendela > 5 detik"},
        )
        assert violation_res.status_code == 200
        assert violation_res.json()["violations_count"] == 1

        # Selesaikan Ujian Akademik
        finish_akad_res = client.post(
            f"/cbt/finish/{cbt_akad_schedule_id}", headers=p1_headers
        )
        assert finish_akad_res.status_code == 200, finish_akad_res.text
        assert finish_akad_res.json()["status"] == "completed"

        # 7b. Ujian Psikologi: Dual Auth & Pengerjaan
        cbt_psik_access_res = client.post(
            f"/cbt/verify-access/{cbt_psik_schedule_id}",
            headers=p1_headers,
            json={"password": applicant1_temp_password, "access_token": cbt_psik_pin},
        )
        assert cbt_psik_access_res.status_code == 200, cbt_psik_access_res.text
        assert cbt_psik_access_res.json()["valid"] is True

        sheet_psik_res = client.get(
            f"/cbt/exam-sheet/{cbt_psik_schedule_id}", headers=p1_headers
        )
        assert sheet_psik_res.status_code == 200, sheet_psik_res.text
        for q in sheet_psik_res.json()["questions"]:
            client.post(
                f"/cbt/save-answer/{cbt_psik_schedule_id}",
                headers=p1_headers,
                json={
                    "question_id": q["id"],
                    "selected_option_id": q["options"][0]["id"],
                    "option_key": q["options"][0]["option_key"],
                },
            )

        finish_psik_res = client.post(
            f"/cbt/finish/{cbt_psik_schedule_id}", headers=p1_headers
        )
        assert finish_psik_res.status_code == 200, finish_psik_res.text
        assert finish_psik_res.json()["status"] == "completed"

        # =====================================================================
        # 8. EVALUASI TAHFIDZ & WAWANCARA TERPADU
        # =====================================================================
        # Simpan nilai Tahfidz
        tahfidz_score_res = client.post(
            "/selection/results",
            headers=admin_headers,
            json={
                "applicant_id": applicant1_id,
                "scores": [{"criteria_id": crit_tahfidz_id, "score": 85.0}],
                "notes": "Hafalan lancar dan makharijul huruf sangat baik",
            },
        )
        assert tahfidz_score_res.status_code in (200, 201), tahfidz_score_res.text

        # Simpan nilai Wawancara Terpadu
        interview_score_res = client.post(
            "/selection/results",
            headers=admin_headers,
            json={
                "applicant_id": applicant1_id,
                "scores": [{"criteria_id": crit_interview_id, "score": 90.0}],
                "notes": (
                    "Anak sangat santun, orang tua berkomitmen penuh mendukung "
                    "program pesantren"
                ),
            },
        )
        assert interview_score_res.status_code in (200, 201), interview_score_res.text

        # =====================================================================
        # 9. REKAPITULASI & PENETAPAN KEPUTUSAN FINAL (VERDICT GATE)
        # =====================================================================
        # 9a. Verdict tanpa catatan evaluator wajib DITOLAK
        verdict_empty_notes_res = client.put(
            f"/selection/applicants/{applicant1_id}/status",
            headers=admin_headers,
            json={"status": "passed", "reason": "   "},
        )
        assert (
            verdict_empty_notes_res.status_code == 400
        ), "Verdict tanpa catatan evaluator harus ditolak 400"

        # 9b. Verdict dengan catatan lengkap -> SUKSES
        verdict_res = client.put(
            f"/selection/applicants/{applicant1_id}/status",
            headers=admin_headers,
            json={
                "status": "passed",
                "reason": "Lulus murni dengan nilai akademik dan tahfidz sangat baik",
            },
        )
        assert verdict_res.status_code == 200, verdict_res.text

        # =====================================================================
        # 10. PENGUMUMAN & PENANDATANGANAN LoA DIGITAL (ALUR PPDB TUNTAS)
        # =====================================================================
        # Pendaftar melihat pengumuman
        p1_announcement = client.get("/ppdb/applicants/me", headers=p1_headers)
        assert p1_announcement.status_code == 200
        assert p1_announcement.json()["applicant"]["status"] == "passed"

        # Pendaftar & Orang Tua tanda tangani LoA
        sign_res = client.post(
            "/ppdb/applicants/me/sign-loa",
            headers=p1_headers,
            json={
                "signer_name": "Ahmad Subarjo",
                "signer_relation": "Ayah Kandung",
                "signature_data": (
                    "data:image/png;base64,"
                    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ"
                    "AAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                ),
            },
        )
        assert sign_res.status_code == 200, sign_res.text
        sign_data = sign_res.json()
        reg_number = sign_data["registration_number"]
        assert reg_number.startswith(
            "REG-"
        ), f"Nomor registrasi format harus REG-YYYYMMDD-XXXX: {reg_number}"

        # Verifikasi status terkunci permanen
        p1_final = client.get("/ppdb/applicants/me", headers=p1_headers).json()[
            "applicant"
        ]
        assert (
            p1_final["is_locked"] is True
        ), "is_locked harus permanen True setelah LoA ditandatangani"
        assert p1_final["registration_number"] == reg_number

        # Verifikasi bahwa perubahan profil mandiri DITOLAK setelah is_locked = True
        locked_update_res = client.put(
            "/ppdb/applicants/me",
            headers=p1_headers,
            json={"previous_school": "Mencoba Mengubah Sekolah Setelah Locked"},
        )
        assert locked_update_res.status_code in (
            400,
            403,
        ), "Update saat is_locked=True harus ditolak"

        # Verifikasi LoA publik via nomor registrasi (QR code destination)
        public_loa_res = client.get(f"/ppdb/loa/{reg_number}")
        assert public_loa_res.status_code == 200, public_loa_res.text
        loa_doc = public_loa_res.json()
        assert loa_doc["applicant"]["full_name"] == "Budi Santoso"
        assert loa_doc["is_loa_signed"] is True

        # =====================================================================
        # 11. PENDAFTAR 2 & KUOTA ATOMIK GELOMBANG TERTUTUP
        # =====================================================================
        pendaftar2_payload: dict[str, Any] = dict(pendaftar1_payload)
        pendaftar2_payload["full_name"] = "Ahmad Dani"
        pendaftar2_payload["nisn"] = "9876543210"
        pendaftar2_payload["nik"] = "3201010101010002"
        pendaftar2_payload["phone"] = "081299998888"
        pendaftar2_payload["email"] = "ahmad.dani@example.com"
        pendaftar2_payload["health_form"]["emergency_contact_phone"] = "081299998888"

        reg2_res = client.post("/ppdb/register", json=pendaftar2_payload)
        assert reg2_res.status_code == 201, reg2_res.text
        p2_id = reg2_res.json()["applicant_id"]
        p2_user = reg2_res.json()["credentials"]["username"]
        p2_pass = reg2_res.json()["credentials"]["password"]

        login2_res = client.post(
            "/auth/login", json={"username": p2_user, "password": p2_pass}
        )
        p2_headers = {"Cookie": f"access_token={login2_res.json()['access_token']}"}

        # Bayar formulir pendaftar 2
        fake_p2_txn_id = f"tx_{uuid.uuid4().hex[:8]}"
        with patch(
            "src.services.payment_service.get_pakasir_client"
        ) as mock_get_client2:
            mock_client2 = MagicMock()
            mock_client2.create_transaction.return_value = _make_created_result(
                fake_p2_txn_id, order_id="PPDB-FORM-002"
            )
            mock_get_client2.return_value = mock_client2

            qris2_res = client.post(
                "/payment/create-qris",
                headers=p2_headers,
                json={"payment_type": "form"},
            )
            assert qris2_res.status_code in (200, 201), qris2_res.text
            p2_order_id = qris2_res.json()["order_id"]

        # Webhook pembayaran pendaftar 2 berhasil
        client.post(
            "/payment/webhook",
            headers={"X-Secret": ""},
            json={
                "order_id": p2_order_id,
                "txn_id": fake_p2_txn_id,
                "amount": 350000,
                "status": "completed",
                "payment_method": "qris",
                "completed_at": now.isoformat(),
            },
        )

        # Verifikasi Pendaftar 2 TIDAK mendapat Early Bird karena kuota early bird = 1
        db_session.expire_all()
        app2_db = (
            db_session.query(PPDBApplicant).filter(PPDBApplicant.id == p2_id).first()
        )
        assert (
            app2_db.early_discount_eligible is False
        ), "Pendaftar 2 tidak boleh mendapat early bird karena kuota=1"

        # Verifikasi kuota gelombang penuh (2/2) sehingga gelombang otomatis
        # DITUTUP (status = inactive)
        wave_db = db_session.query(PPDBWave).filter(PPDBWave.id == wave_id).first()
        assert (
            wave_db.status == "inactive"
        ), "Gelombang harus otomatis ditutup (inactive) saat kuota pembayaran tercapai"

        # Pendaftar 3 mencoba mendaftar setelah gelombang tutup -> DITOLAK
        pendaftar3_payload: dict[str, Any] = dict(pendaftar1_payload)
        pendaftar3_payload["full_name"] = "Citra Lestari"
        pendaftar3_payload["nisn"] = "1122334455"
        pendaftar3_payload["phone"] = "081277776666"
        pendaftar3_payload["email"] = "citra@example.com"
        pendaftar3_payload["health_form"]["emergency_contact_phone"] = "081277776666"

        reg3_res = client.post("/ppdb/register", json=pendaftar3_payload)
        assert reg3_res.status_code in (
            400,
            422,
        ), "Pendaftaran saat gelombang tutup harus ditolak"

        # =====================================================================
        # 12. ARSIP DOSSIER & AUDIT LOG
        # =====================================================================
        # Admin akses dossier ZIP pendaftar 1
        zip_res = client.get(
            f"/ppdb/archive/applicants/{applicant1_id}/dossier/zip",
            headers=admin_headers,
        )
        assert zip_res.status_code == 200, zip_res.text
        assert zip_res.headers["content-type"] == "application/zip"

        # Validasi isi bundle ZIP
        zip_bytes = io.BytesIO(zip_res.content)
        with zipfile.ZipFile(zip_bytes, "r") as zf:
            file_list = zf.namelist()
            assert any(
                f.endswith(".json") or "biodata" in f.lower() or "dossier" in f.lower()
                for f in file_list
            )

        print("\n\n>>> ALL E2E PHASES AND SCENARIOS COMPLETED 100% SUCCESSFULLY! <<<\n")
