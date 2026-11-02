"""Merge duplicate CMS news rows created by the legacy seed and import scripts.

Revision ID: 0066
Revises: 0065
"""

from __future__ import annotations

import json
import re
from collections.abc import Sequence
from datetime import datetime
from typing import Any

import sqlalchemy as sa
from alembic import op

revision: str = "0066"
down_revision: str | None = "0065"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _content(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return dict(value)
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except (TypeError, ValueError):
            return {}
        return dict(parsed) if isinstance(parsed, dict) else {}
    return {}


def _gallery(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except (TypeError, ValueError):
            return []
        if isinstance(parsed, list):
            return [str(item) for item in parsed if str(item).strip()]
    return []


def _identity(title: str) -> str:
    """Return a stable identity for the known legacy/import title variants."""
    text = title.lower()
    compact = re.sub(r"[^a-z0-9]+", "", text)

    # These are the same three events written by the old content kit and by
    # the later article import. The wording differs, but the event is clear.
    if "sharing session" in text and "gojek" in text and "next" in text:
        return "event-sharing-session-gojek-nextjs"
    if "porseni" in text and "semangat juang" in text:
        return "event-porseni-semangat-juang"
    if "ramadhan" in text and (
        "gerakan lingkungan" in text
        or "bersihkan pesantren" in text
        or "ukhuwah" in text
    ):
        return "event-ramadhan-kebersamaan-santri"
    return compact


def _row_score(row: dict[str, Any]) -> tuple[int, int, int, int]:
    content = _content(row.get("content"))
    body = str(content.get("body") or "")
    image = bool(str(row.get("image") or "").strip())
    # Prefer imported rows with a full body and image over short legacy cards.
    return (
        int(bool(body)) * 2,
        len(body),
        int(image),
        int(not str(row.get("id") or "").startswith("news-kit-")),
    )


def _merge_content(rows: list[dict[str, Any]]) -> dict[str, Any]:
    merged: dict[str, Any] = {}
    for row in sorted(rows, key=_row_score, reverse=True):
        for key, value in _content(row.get("content")).items():
            if value is None or (isinstance(value, str) and not value.strip()):
                continue
            current = merged.get(key)
            # The longer title/body is the more descriptive variant. Other
            # fields only need the first non-empty value.
            if key in {"title", "body", "excerpt"} and isinstance(value, str):
                if not isinstance(current, str) or len(value) > len(current):
                    merged[key] = value
            elif current is None or (isinstance(current, str) and not current.strip()):
                merged[key] = value
    return merged


def upgrade() -> None:
    bind = op.get_bind()
    table = sa.table(
        "news_articles",
        sa.column("id", sa.String()),
        sa.column("slug", sa.String()),
        sa.column("image", sa.String()),
        sa.column("category", sa.String()),
        sa.column("date", sa.String()),
        sa.column("gallery", sa.Text()),
        sa.column("content", sa.Text()),
        sa.column("updated_at", sa.DateTime()),
    )
    rows = [dict(row) for row in bind.execute(sa.select(table)).mappings().all()]
    groups: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        title = str(_content(row.get("content")).get("title") or "").strip()
        if not title:
            continue
        groups.setdefault(_identity(title), []).append(row)

    for grouped in groups.values():
        if len(grouped) < 2:
            continue

        canonical = max(grouped, key=_row_score)
        duplicates = [row for row in grouped if row["id"] != canonical["id"]]
        merged_content = _merge_content(grouped)

        image = next(
            (str(row.get("image")).strip() for row in sorted(grouped, key=_row_score, reverse=True)
             if str(row.get("image") or "").strip()),
            None,
        )
        category = next(
            (
                str(row.get("category")).strip()
                for row in grouped
                if str(row.get("category") or "").strip().lower() not in {"", "news"}
            ),
        ) or str(canonical.get("category") or "news")
        article_date = next(
            (str(row.get("date")).strip() for row in grouped if str(row.get("date") or "").strip()),
            "",
        )
        gallery: list[str] = []
        for row in grouped:
            for item in _gallery(row.get("gallery")):
                if item not in gallery:
                    gallery.append(item)

        values: dict[str, Any] = {
            "content": json.dumps(merged_content, ensure_ascii=False),
            "category": category,
            "date": article_date,
            "updated_at": datetime.utcnow(),
        }
        if image is not None:
            values["image"] = image
        if gallery:
            values["gallery"] = json.dumps(gallery, ensure_ascii=False)
        bind.execute(
            sa.update(table).where(table.c.id == canonical["id"]).values(**values)
        )
        for duplicate in duplicates:
            bind.execute(sa.delete(table).where(table.c.id == duplicate["id"]))


def downgrade() -> None:
    # The migration intentionally consolidates records and cannot reconstruct
    # deleted duplicate rows without reintroducing stale content.
    pass
