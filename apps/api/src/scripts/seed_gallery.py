#!/usr/bin/env python3
"""Seed / update gallery items for PTDARRAHMAN Company Profile.

Run from the `apps/api` directory:
    python -m src.scripts.seed_gallery
"""

import json
import sys
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

# Adjust import path
sys.path.append(str(Path(__file__).resolve().parents[2]))

from src.core.database import get_engine  # noqa: E402
from src.models.content import GalleryItem  # noqa: E402

engine = get_engine()

import importlib

_seed_mod = importlib.import_module("alembic.versions.0072_seed_gallery_items")
GALLERY_SEEDS = _seed_mod.GALLERY_SEEDS


def upsert_gallery(session: Session, record: dict) -> None:
    existing = session.query(GalleryItem).filter(GalleryItem.id == record["id"]).first()
    content_json = json.dumps(record["content"], ensure_ascii=False)
    now = datetime.now()

    if existing:
        existing.image = record["image"]
        existing.category = record["category"]
        existing.content = content_json
        existing.updated_at = now
        session.add(existing)
    else:
        item = GalleryItem(
            id=record["id"],
            image=record["image"],
            category=record["category"],
            content=content_json,
            created_at=now,
            updated_at=now,
        )
        session.add(item)


def main() -> None:
    with Session(engine) as session:
        for rec in GALLERY_SEEDS:
            upsert_gallery(session, rec)
        session.commit()
        print(f"Successfully seeded {len(GALLERY_SEEDS)} gallery items.")


if __name__ == "__main__":
    main()
