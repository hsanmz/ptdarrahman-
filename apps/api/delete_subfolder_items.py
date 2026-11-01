from sqlalchemy import create_engine, text
from src.core.config import settings

eng = create_engine(settings.database_url)
conn = eng.connect()

# Delete TA 1 items (title contains "Pemanasan Persiapan Training")
r = conn.execute(text("DELETE FROM gallery_items WHERE content LIKE '%Pemanasan Persiapan Training%'"))
ta_count = r.rowcount
conn.commit()
print(f"Deleted {ta_count} TA 1 items")

# Delete pemberian Alquran items (title contains "Pemberian")
r = conn.execute(text("DELETE FROM gallery_items WHERE content LIKE '%Pemberian%'"))
alquran_count = r.rowcount
conn.commit()
print(f"Deleted {alquran_count} pemberian Alquran items")

# Verify
r = conn.execute(text("SELECT COUNT(*) FROM gallery_items"))
total = r.fetchone()[0]
print(f"Total remaining: {total}")

conn.close()
