from pydantic import BaseModel, field_validator


class Stage2DiscountItem(BaseModel):
    """Satu komponen biaya dengan diskon & cicilan per pendaftar."""

    fee_item_id: str
    discount_type: str | None = None
    discount_value: float | None = None
    installment_count: int = 0

    @field_validator("discount_type", mode="before")
    @classmethod
    def normalize_discount_type(cls, v: object) -> str | None:
        if v in (None, ""):
            return None
        if v not in ("percent", "nominal"):
            raise ValueError("Tipe diskon harus 'percent' atau 'nominal'.")
        return str(v)

    @field_validator("discount_value")
    @classmethod
    def validate_discount_value(cls, v: float | None, info: object) -> float | None:
        if v is None:
            return None
        data = getattr(info, "data", {}) or {}
        discount_type = data.get("discount_type")
        if discount_type == "percent" and v > 100:
            raise ValueError("Diskon persentase maksimal 100%.")
        if v < 0:
            raise ValueError("Nilai diskon tidak boleh negatif.")
        return v

    @field_validator("installment_count")
    @classmethod
    def validate_installment_count(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Jumlah cicilan tidak boleh negatif.")
        return v


class Stage2DiscountsPayload(BaseModel):
    items: list[Stage2DiscountItem] = []
