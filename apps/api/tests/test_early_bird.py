"""Perilaku slot early bird pendaftar dan perhitungan diskonasi gelombang pada LoA.

Semua kasus berjalan murni pada unit service dengan repository palsu,
tanpa menyentuh database, supaya aturan slot "X pembayar formulir awal"
dan angka diskon gelombang pada LoA bisa dites terisolasi.
"""

from types import SimpleNamespace
from typing import Any, cast

from src.services.payment_service import PaymentService
from src.services.ppdb_service import PPDBService


def make_fake_period_repo(items, discounts):
    class FakeRepo:
        def __init__(self):
            self.received_period_id = None
            self.received_wave_id = None

        def get_period_fee_items(self, period_id):
            self.received_period_id = period_id
            return items

        def get_wave_fee_discounts(self, wave_id):
            self.received_wave_id = wave_id
            return discounts

    return FakeRepo()


def fee_item(item_id: str, nominal: int):
    return SimpleNamespace(
        id=item_id, name=f"Item {item_id}", nominal=nominal, description=None
    )


def wave_discount(fee_item_id: str, discount=None, early=None):
    discount_type, discount_value = discount or (None, None)
    early_type, early_value = early or (None, None)
    return SimpleNamespace(
        fee_item_id=fee_item_id,
        discount_type=discount_type,
        discount_value=discount_value,
        early_discount_type=early_type,
        early_discount_value=early_value,
    )


class TestLoaFactorItems:
    def _service(self, items, discounts):
        repo = make_fake_period_repo(items, discounts)
        return PPDBService(repository=repo), repo

    def _wave(self, early_quota: int):
        return SimpleNamespace(
            id="wave-1", period_id="period-1", early_discount_quota=early_quota
        )

    def test_eligible_applicant_gets_early_discount(self):
        svc, repo = self._service(
            [fee_item("f1", 10_000_000)],
            [
                wave_discount(
                    "f1", discount=("percent", 5), early=("nominal", 2_000_000)
                )
            ],
        )
        applicant = {"wave_id": "wave-1", "early_discount_eligible": True}

        items = svc._calculate_loa_fee_items(self._wave(3), applicant)

        assert repo.received_period_id == "period-1"
        assert items[0]["standard_nominal"] == 10_000_000
        assert items[0]["discount_nominal"] == 2_000_000
        assert items[0]["nominal"] == 8_000_000
        assert "Early Bird" in items[0]["discount_description"]

    def test_applicant_without_slot_gets_regular_discount(self):
        svc, _ = self._service(
            [fee_item("f1", 10_000_000)],
            [
                wave_discount(
                    "f1", discount=("percent", 5), early=("nominal", 2_000_000)
                )
            ],
        )
        applicant = {"wave_id": "wave-1", "early_discount_eligible": False}

        items = svc._calculate_loa_fee_items(self._wave(3), applicant)

        assert items[0]["discount_nominal"] == 500_000
        assert items[0]["nominal"] == 9_500_000
        assert "Early Bird" not in items[0]["discount_description"]

    def test_default_false_stamps_regular_discount(self):
        svc, _ = self._service(
            [fee_item("f1", 1_000_000)],
            [wave_discount("f1", discount=("nominal", 100_000), early=None)],
        )

        items = svc._calculate_loa_fee_items(self._wave(1), {"wave_id": "wave-1"})

        assert items[0]["nominal"] == 900_000

    def test_percent_discount_floors_result(self):
        svc, _ = self._service(
            [fee_item("f1", 999_999)],
            [wave_discount("f1", discount=("percent", 10))],
        )

        items = svc._calculate_loa_fee_items(self._wave(0), {"wave_id": "wave-1"})

        assert items[0]["discount_nominal"] == int(999_999 * 0.10)
        assert items[0]["nominal"] == 999_999 - int(999_999 * 0.10)

    def test_period_without_master_items_returns_empty_list(self):
        svc, _ = self._service([], [])

        items = svc._calculate_loa_fee_items(self._wave(1), {"wave_id": "wave-1"})

        assert items == []


class TestEarlyBirdSlot:
    def _service(self, quota: int, prior_paid: int):
        repo = SimpleNamespace(
            get_wave_by_id=lambda wave_id: SimpleNamespace(
                id=wave_id, early_discount_quota=quota
            ),
            count_paid_form_payments_in_wave=lambda wave_id: prior_paid,
        )
        return PaymentService(repo=cast(Any, repo))

    def test_slot_available_marks_applicant_eligible(self):
        applicant = SimpleNamespace(wave_id="w", early_discount_eligible=False)
        svc = self._service(quota=10, prior_paid=4)

        assert svc._assign_early_bird_slot(applicant) is True
        assert applicant.early_discount_eligible is True

    def test_last_slot_still_assignable(self):
        applicant = SimpleNamespace(wave_id="w", early_discount_eligible=False)
        svc = self._service(quota=10, prior_paid=9)

        assert svc._assign_early_bird_slot(applicant) is True

    def test_slots_exhausted_leaves_flag_false(self):
        applicant = SimpleNamespace(wave_id="w", early_discount_eligible=False)
        svc = self._service(quota=10, prior_paid=10)

        assert svc._assign_early_bird_slot(applicant) is False
        assert applicant.early_discount_eligible is False

    def test_quota_zero_assigns_nothing(self):
        applicant = SimpleNamespace(wave_id="w", early_discount_eligible=False)
        svc = self._service(quota=0, prior_paid=0)

        assert svc._assign_early_bird_slot(applicant) is False
        assert applicant.early_discount_eligible is False

