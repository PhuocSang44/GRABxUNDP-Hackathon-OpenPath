"""
Seed the demo route from manually curated checkpoint data.

Reads from:  scripts/demo_checkpoints_data.py
Images from: frontend/public/demo/checkpoints/

Produces:
  1. frontend/public/demo/demo_route.json   — loaded directly by the frontend
                                              (no API call during the demo)
  2. accessibility_checkpoints DB rows       — used if the live /api/route/analyze
                                              endpoint is ever called

Run from the backend/ directory:
    python scripts/seed_demo_manual.py
"""
import sys
import os
import uuid
import json
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.models.accessibility_checkpoint import AccessibilityCheckpoint
from app.services.accessibility_service import aggregate_route
from scripts.demo_checkpoints_data import CHECKPOINTS, DEMO_ORIGIN, DEMO_DEST

# ── Paths ──────────────────────────────────────────────────────────────────────
_BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR      = os.path.join(_BASE, "..", "frontend", "public", "demo", "checkpoints")
ROUTE_JSON   = os.path.join(_BASE, "..", "frontend", "public", "demo", "demo_route.json")

# Bounding box covering this route
ROUTE_LAT_MIN, ROUTE_LAT_MAX = 10.876, 10.880
ROUTE_LNG_MIN, ROUTE_LNG_MAX = 106.799, 106.804


# ── Helpers ────────────────────────────────────────────────────────────────────

def _cache_key(lat: float, lng: float) -> str:
    return f"{round(lat, 4)},{round(lng, 4)}"


def _haversine_m(lat1, lng1, lat2, lng2) -> float:
    import math
    R = 6371000
    p = math.pi / 180
    a = (math.sin((lat2 - lat1) * p / 2) ** 2
         + math.cos(lat1 * p) * math.cos(lat2 * p)
         * math.sin((lng2 - lng1) * p / 2) ** 2)
    return 2 * R * math.asin(math.sqrt(a))


def _route_distance_m(checkpoints: list) -> float:
    total = 0.0
    for i in range(1, len(checkpoints)):
        a, b = checkpoints[i - 1], checkpoints[i]
        total += _haversine_m(a["lat"], a["lng"], b["lat"], b["lng"])
    return total


def validate_data(cp: dict, idx: int) -> list[str]:
    valid_access = {"good", "moderate", "poor"}
    valid_cont   = {"continuous", "broken", "none"}
    valid_width  = {"narrow", "medium", "wide"}
    valid_surf   = {"smooth concrete", "rough concrete", "paving stones",
                    "asphalt", "mixed tiles", "gravel"}
    errors = []
    if cp.get("accessibility") not in valid_access:
        errors.append(f"accessibility must be one of {valid_access}")
    if cp.get("continuity") not in valid_cont:
        errors.append(f"continuity must be one of {valid_cont}")
    if cp.get("width") not in valid_width:
        errors.append(f"width must be one of {valid_width}")
    if cp.get("surface") not in valid_surf:
        errors.append(f"surface must be one of {valid_surf}")
    conf = cp.get("confidence", 0)
    if not (0.0 <= conf <= 1.0):
        errors.append(f"confidence must be 0.0–1.0, got {conf}")
    return [f"cp{idx + 1}: {e}" for e in errors]


def build_checkpoint_record(cp: dict, now: str) -> dict:
    """Build the AccessibilityCheckpoint dict for the JSON file."""
    fname = cp.get("image", "")
    img_path = os.path.join(IMG_DIR, fname) if fname else ""
    sv_url = f"/demo/checkpoints/{fname}" if fname and os.path.isfile(img_path) else ""
    return {
        "id": str(uuid.uuid4()),
        "lat": cp["lat"],
        "lng": cp["lng"],
        "accessibility": cp["accessibility"],
        "sidewalk": cp["sidewalk"],
        "width": cp["width"],
        "surface": cp["surface"],
        "curb_ramp": cp["curb_ramp"],
        "obstacles": cp.get("obstacles", []),
        "confidence": cp["confidence"],
        "analyzed_at": now,
        "street_view_url": sv_url,
    }


def build_route_geometry(origin: dict, dest: dict, checkpoints: list) -> dict:
    """Build a simple LineString that passes through all checkpoint locations."""
    coords = [[origin["lng"], origin["lat"]]]
    for cp in checkpoints:
        coords.append([cp["lng"], cp["lat"]])
    coords.append([dest["lng"], dest["lat"]])
    return {"type": "LineString", "coordinates": coords}


def main():
    print("=" * 60)
    print("  OpenPath - Demo Route Manual Seed")
    print("=" * 60)
    print(f"  Checkpoints : {len(CHECKPOINTS)}")
    print(f"  Origin      : {DEMO_ORIGIN['lat']}, {DEMO_ORIGIN['lng']}")
    print(f"  Dest        : {DEMO_DEST['lat']}, {DEMO_DEST['lng']}")
    print()

    # ── Validate ──────────────────────────────────────────────────────────────
    errors = []
    for i, cp in enumerate(CHECKPOINTS):
        errors.extend(validate_data(cp, i))
    if errors:
        print("DATA ERRORS — fix in demo_checkpoints_data.py:")
        for e in errors:
            print(f"  [!] {e}")
        return

    # ── Image check ───────────────────────────────────────────────────────────
    print("Image status:")
    for i, cp in enumerate(CHECKPOINTS):
        fname = cp.get("image", "")
        if fname:
            path = os.path.join(IMG_DIR, fname)
            exists = os.path.isfile(path)
            size_kb = os.path.getsize(path) // 1024 if exists else 0
            status = f"OK  ({size_kb} KB)" if exists else "MISSING"
        else:
            status = "no image"
        print(f"  cp{i + 1:<3} {fname or '(none)':<12}  {status}")
    print()

    now_str = datetime.now(timezone.utc).isoformat()

    # ── Build checkpoint records ───────────────────────────────────────────────
    records = [build_checkpoint_record(cp, now_str) for cp in CHECKPOINTS]

    # ── Compute route summary ─────────────────────────────────────────────────
    summary = aggregate_route(records)

    # ── Compute distance ──────────────────────────────────────────────────────
    dist_m = _route_distance_m(CHECKPOINTS)
    dist_km = round(dist_m / 1000, 2)
    duration_min = round(dist_m / 80, 1)  # ~80 m/min wheelchair pace

    # ── Build route geometry through checkpoint locations ─────────────────────
    geometry = build_route_geometry(DEMO_ORIGIN, DEMO_DEST, CHECKPOINTS)

    # ── Write demo_route.json ─────────────────────────────────────────────────
    route_result = {
        "route": {
            "geometry": geometry,
            "distance_km": dist_km,
            "duration_min": duration_min,
        },
        "checkpoints": records,
        "summary": summary,
    }

    os.makedirs(os.path.dirname(ROUTE_JSON), exist_ok=True)
    with open(ROUTE_JSON, "w", encoding="utf-8") as f:
        json.dump(route_result, f, ensure_ascii=False, indent=2)
    print(f"Written: frontend/public/demo/demo_route.json")
    print(f"  Distance    : {dist_km} km")
    print(f"  Duration    : {duration_min} min (wheelchair pace)")
    print(f"  Checkpoints : {len(records)}")
    print(f"  Rating      : {summary['accessibility_rating']}")
    print()

    # ── Upsert into DB (for live API calls) ───────────────────────────────────
    db = SessionLocal()
    try:
        deleted = (
            db.query(AccessibilityCheckpoint)
            .filter(
                AccessibilityCheckpoint.lat >= ROUTE_LAT_MIN,
                AccessibilityCheckpoint.lat <= ROUTE_LAT_MAX,
                AccessibilityCheckpoint.lng >= ROUTE_LNG_MIN,
                AccessibilityCheckpoint.lng <= ROUTE_LNG_MAX,
            )
            .delete()
        )
        if deleted:
            print(f"Cleared {deleted} existing DB checkpoint(s).")

        print("Inserting checkpoints:")
        print(f"  {'#':<4} {'CACHE KEY':<22} {'ACCESS':<10} {'CONF':>5}  IMG")
        print("  " + "-" * 52)

        for i, (cp, rec) in enumerate(zip(CHECKPOINTS, records)):
            key = _cache_key(cp["lat"], cp["lng"])
            row = AccessibilityCheckpoint(
                id=rec["id"],
                cache_key=key,
                lat=cp["lat"],
                lng=cp["lng"],
                accessibility=cp["accessibility"],
                sidewalk=cp["sidewalk"],
                width=cp["width"],
                surface=cp["surface"],
                curb_ramp=cp["curb_ramp"],
                obstacles=cp.get("obstacles", []),
                confidence=cp["confidence"],
                street_view_url=rec["street_view_url"],
                analyzed_at=datetime.now(timezone.utc),
            )
            db.add(row)
            img_col = "[photo]" if rec["street_view_url"] else "-"
            print(f"  {i+1:<4} {key:<22} {cp['accessibility']:<10} {round(cp['confidence']*100)}%  {img_col}")

        db.commit()
    finally:
        db.close()

    print()
    missing = [
        f"cp{i+1}.jpg"
        for i, cp in enumerate(CHECKPOINTS)
        if cp.get("image") and not os.path.isfile(os.path.join(IMG_DIR, cp["image"]))
    ]
    if missing:
        print("Still missing images:")
        for m in missing:
            print(f"  {m}  ->  frontend/public/demo/checkpoints/{m}")
        print()

    print("=" * 60)
    print("  Done. Start the app and click 'Demo Route (Claude AI)'")
    print("=" * 60)


if __name__ == "__main__":
    main()
