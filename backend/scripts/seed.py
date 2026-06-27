"""
Seed ~20 road segments in District 1, Ho Chi Minh City with precomputed
accessibility scores. Safe to run multiple times (clears existing rows first).

Usage:
  cd backend
  python scripts/seed.py
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from geoalchemy2 import WKTElement
from app.db.database import SessionLocal
from app.models.road_segment import RoadSegment

# Each entry: (name, WKT linestring lon/lat, sidewalk, sidewalk_side,
#              width_m, surface, curb_ramp, obstacles, stairs,
#              accessibility_score, confidence)
SEGMENTS = [
    (
        "Nguyen Hue Boulevard (North)",
        "LINESTRING(106.7031 10.7769, 106.7031 10.7750)",
        True, "both", 4.0, "smooth concrete", True, [], False, 92, 0.95,
    ),
    (
        "Nguyen Hue Boulevard (South)",
        "LINESTRING(106.7031 10.7750, 106.7031 10.7731)",
        True, "both", 3.5, "smooth concrete", True, [], False, 88, 0.93,
    ),
    (
        "Le Loi Street (West)",
        "LINESTRING(106.6972 10.7721, 106.7010 10.7721)",
        True, "both", 1.5, "uneven tiles", False, ["parked motorcycles"], False, 55, 0.87,
    ),
    (
        "Le Loi Street (East)",
        "LINESTRING(106.7010 10.7721, 106.7043 10.7721)",
        True, "both", 1.8, "rough concrete", True, ["parked motorcycles"], False, 60, 0.85,
    ),
    (
        "Ham Nghi Street",
        "LINESTRING(106.7005 10.7712, 106.7080 10.7712)",
        True, "right", 1.2, "broken tiles", False, ["construction", "parked motorcycles"], False, 42, 0.82,
    ),
    (
        "Dong Khoi Street (North)",
        "LINESTRING(106.7043 10.7750, 106.7046 10.7769)",
        True, "both", 2.5, "smooth concrete", True, [], False, 78, 0.91,
    ),
    (
        "Dong Khoi Street (South)",
        "LINESTRING(106.7041 10.7721, 106.7043 10.7750)",
        True, "both", 2.2, "smooth tiles", True, ["parked motorcycles"], False, 72, 0.89,
    ),
    (
        "Pasteur Street",
        "LINESTRING(106.6994 10.7731, 106.6999 10.7769)",
        True, "left", 1.0, "cracked concrete", False, ["parked motorcycles"], False, 35, 0.80,
    ),
    (
        "Nam Ky Khoi Nghia Street",
        "LINESTRING(106.6975 10.7769, 106.6972 10.7800)",
        True, "both", 1.5, "rough concrete", False, ["parked motorcycles"], False, 50, 0.84,
    ),
    (
        "Le Thanh Ton Street",
        "LINESTRING(106.7007 10.7750, 106.7043 10.7750)",
        True, "both", 2.0, "smooth tiles", True, [], False, 65, 0.88,
    ),
    (
        "Hai Ba Trung Street",
        "LINESTRING(106.7050 10.7731, 106.7054 10.7769)",
        True, "right", 1.3, "uneven concrete", False, ["parked motorcycles", "street vendors"], False, 48, 0.83,
    ),
    (
        "Tran Hung Dao Street",
        "LINESTRING(106.6986 10.7680, 106.7060 10.7680)",
        True, "both", 1.8, "rough concrete", True, ["parked motorcycles"], False, 55, 0.86,
    ),
    (
        "Pham Ngu Lao Street",
        "LINESTRING(106.6950 10.7660, 106.6990 10.7660)",
        True, "right", 0.8, "broken tiles", False, ["parked motorcycles", "street vendors"], False, 30, 0.79,
    ),
    (
        "Bui Vien Walking Street",
        "LINESTRING(106.6963 10.7647, 106.6990 10.7647)",
        False, "none", None, "uneven pavement", False, ["parked motorcycles", "street vendors"], True, 20, 0.77,
    ),
    (
        "De Tham Street",
        "LINESTRING(106.6960 10.7655, 106.6960 10.7680)",
        True, "left", 0.9, "cracked concrete", False, ["parked motorcycles"], False, 25, 0.78,
    ),
    (
        "Vo Van Tan Street",
        "LINESTRING(106.6944 10.7700, 106.7010 10.7700)",
        True, "both", 1.6, "smooth concrete", True, [], False, 58, 0.85,
    ),
    (
        "Dien Bien Phu Street (West)",
        "LINESTRING(106.6960 10.7769, 106.7000 10.7769)",
        True, "both", 1.7, "rough concrete", False, ["parked motorcycles"], False, 52, 0.83,
    ),
    (
        "Nguyen Thai Hoc Street",
        "LINESTRING(106.6948 10.7693, 106.6990 10.7693)",
        True, "right", 1.1, "cracked tiles", False, ["construction"], False, 42, 0.81,
    ),
    (
        "Co Giang Street",
        "LINESTRING(106.6978 10.7669, 106.7010 10.7669)",
        True, "left", 1.0, "broken concrete", False, ["parked motorcycles"], False, 38, 0.80,
    ),
    (
        "Ly Tu Trong Street",
        "LINESTRING(106.7005 10.7740, 106.7043 10.7740)",
        True, "both", 2.0, "smooth concrete", True, [], False, 68, 0.90,
    ),
]


def run():
    db = SessionLocal()
    try:
        deleted = db.query(RoadSegment).delete()
        print(f"Cleared {deleted} existing segment(s).")

        for (name, wkt, sidewalk, sidewalk_side, width_m, surface,
             curb_ramp, obstacles, stairs, score, confidence) in SEGMENTS:
            seg = RoadSegment(
                name=name,
                geometry=WKTElement(wkt, srid=4326),
                sidewalk=sidewalk,
                sidewalk_side=sidewalk_side,
                width_m=width_m,
                surface=surface,
                curb_ramp=curb_ramp,
                obstacles=obstacles,
                stairs=stairs,
                accessibility_score=score,
                confidence=confidence,
                source="ai",
            )
            db.add(seg)

        db.commit()
        print(f"Seeded {len(SEGMENTS)} road segments.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
