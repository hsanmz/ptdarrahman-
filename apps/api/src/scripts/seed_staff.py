#!/usr/bin/env python3
"""Seed / update staff data for Ar‑Rahman.

This script upserts the staff table with the latest positions.
It uses the existing SQLAlchemy models defined in ``src.models.content``.
Run it from the repository root (or ``apps/api``) after activating the
virtual environment or ``uv`` environment.

    cd apps/api
    uv run python -m src.scripts.seed_staff

The script is idempotent – running it multiple times will not create
duplicate rows.  ``level`` is stored in the JSON ``content`` field as
``{"level": <int>}`` so that the UI can display the hierarchy.
"""

import json
import uuid
import sys
from pathlib import Path
from datetime import datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

# Adjust the import path if you run the script from another location
sys.path.append(str(Path(__file__).resolve().parents[2]))

from src.models.content import Staff  # noqa: E402
from src.models.base import Base  # noqa: E402

# ---------------------------------------------------------------------------
# Configuration – read DB connection from the .env file used by the API.
# ---------------------------------------------------------------------------
from src.core.database import get_engine  # noqa: E402

engine = get_engine()

# ---------------------------------------------------------------------------
# New staff data (Position, Name, Level)
# ---------------------------------------------------------------------------
NEW_STAFF = [
    {"role": "Mudir", "name": "Ustadz Ziyad Khairy", "level": 1},
    {"role": "Administrator", "name": "Ustadz Mahrozal Mizan", "level": 2},
    {"role": "Kepala Kepegawaian", "name": "Ustadz Murtadho Tumari", "level": 2},
    {"role": "Guru", "name": "Ustadz Ian", "level": 3},
    {"role": "Musrif & Pegajar BA", "name": "Ustadz Nur Fatoni", "level": 3},
]


def upsert_staff(session: Session, record: dict) -> None:
    """Insert a new ``Staff`` row or update the existing one.

    The ``name`` field is stored inside the JSON ``content`` column, so we
    query by the exact ``name`` value to avoid duplicates.
    """
    existing = session.query(Staff).filter(Staff.role == record["role"]).first()
    content = {"name": record["name"], "level": record["level"]}
    if existing:
        # Update role and content only if something changed.
        if existing.role != record["role"] or existing.content != json.dumps(content):
            existing.role = record["role"]
            existing.content = json.dumps(content)
            session.add(existing)
    else:
        now = datetime.utcnow()
        staff = Staff(
            id=str(uuid.uuid4()),
            role=record["role"],
            content=json.dumps(content),
            created_at=now,
            updated_at=now,
        )
        session.add(staff)


def main() -> None:
    with Session(engine) as session:
        for rec in NEW_STAFF:
            upsert_staff(session, rec)
        session.commit()
        print("Staff data upserted successfully.")


if __name__ == "__main__":
    main()
