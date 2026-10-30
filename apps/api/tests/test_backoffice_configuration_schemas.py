from datetime import date

import pytest
from pydantic import ValidationError

from src.modules.ppdb.schemas import (
    WaveBase,
    WaveFeeDiscountUpdate,
)
from src.modules.selection.schemas import SessionCreate


def _wave_payload(**overrides):
    return {
        "name": "Gelombang 1",
        "registration_start_date": date(2026, 1, 1),
        "registration_end_date": date(2026, 1, 31),
        "document_upload_end_date": date(2026, 2, 5),
        "selection_date": date(2026, 2, 10),
        "quota": 100,
        "early_discount_quota": 10,
        **overrides,
    }


def test_wave_early_discount_quota_must_fit_wave_quota():
    assert WaveBase(**_wave_payload()).early_discount_quota == 10
    with pytest.raises(ValidationError, match="tidak boleh melebihi kuota"):
        WaveBase(**_wave_payload(early_discount_quota=101))


def test_wave_no_longer_holds_fee_components_or_dp():
    """Biaya formulir dan minimal DP diatur di master Periode; bukan di gelombang."""
    assert "registration_fee" not in WaveBase.model_fields
    assert "second_stage_fee" not in WaveBase.model_fields
    assert "minimum_dp" not in WaveBase.model_fields
    assert "early_discount_quota" in WaveBase.model_fields


def test_period_carries_form_fee_and_minimum_dp():
    from src.modules.ppdb.schemas import PeriodCreate

    p = PeriodCreate(
        name="Periode 2026/2027",
        academic_year="2026/2027",
        form_fee=350_000,
        minimum_dp=5_000_000,
    )
    assert p.form_fee == 350_000
    assert p.minimum_dp == 5_000_000

    with pytest.raises(ValidationError):
        PeriodCreate(name="Periode", academic_year="2026/2027", form_fee=-1)


def test_wave_discount_requires_matching_type_and_value():
    d = WaveFeeDiscountUpdate(discount_type="nominal", discount_value=100_000)
    assert d.discount_value == 100_000

    with pytest.raises(ValidationError):
        WaveFeeDiscountUpdate(discount_type="percent")

    with pytest.raises(ValidationError, match="maksimal 100%"):
        WaveFeeDiscountUpdate(discount_type="percent", discount_value=101)


def test_selection_session_requires_schedule_and_mode_details():
    session = SessionCreate(
        name="Tahfidz Pagi",
        session_type="tahfidz",
        session_date="2026-10-10",
        start_time="08:00",
        end_time="09:00",
        mode="offline",
        officer_name="Ustaz Ahmad",
        location="Ruang 1",
    )
    assert session.mode == "offline"

    with pytest.raises(ValidationError, match="Lokasi wajib diisi"):
        SessionCreate(
            name="Wawancara Online",
            session_type="interview",
            session_date="2026-10-10",
            start_time="08:00",
            end_time="09:00",
            mode="offline",
            officer_name="Ibu Siti",
        )

    with pytest.raises(ValidationError, match="Jam selesai harus setelah jam mulai"):
        SessionCreate(
            name="Wawancara",
            session_type="interview",
            session_date="2026-10-10",
            start_time="09:00",
            end_time="08:00",
            mode="online",
            officer_name="Ibu Siti",
            meeting_url="https://zoom.us/j/123",
        )


def test_period_create_supports_head_of_committee():
    from src.modules.ppdb.schemas import PeriodCreate

    p = PeriodCreate(
        name="Periode 2026/2027",
        academic_year="2026/2027",
        head_of_committee="Dr. H. Ahmad Dahlan, M.Pd.",
    )
    assert p.head_of_committee == "Dr. H. Ahmad Dahlan, M.Pd."
    assert p.name == "Periode 2026/2027"
    assert p.academic_year == "2026/2027"


def test_loa_signature_request_validation():
    from src.modules.ppdb.schemas import LoASignatureRequest

    req = LoASignatureRequest(
        signer_name="Budi Santoso",
        signer_relation="Ayah",
        signature_data="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    )
    assert req.signer_name == "Budi Santoso"
    assert req.signer_relation == "Ayah"
    assert req.signature_data.startswith("data:image/png")
