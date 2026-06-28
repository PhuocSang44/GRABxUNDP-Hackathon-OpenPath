"""
Seed the DEMO ROUTE with real Claude Vision analysis.

Pipeline per checkpoint:
  1. OSRM walking route
  2. Sample checkpoints every 75 m
  3. Download street-level image (Street View or Mapillary)
  4. Send image to Claude Vision -> structured accessibility JSON
  5. Upload image to Supabase Storage (frontend shows real photos)
  6. Cache result in accessibility_checkpoints table

Pre-requisites in backend/.env:
  ANTHROPIC_API_KEY=...          (required for AI analysis)
  GOOGLE_MAPS_API_KEY=...        (Street View — needs billing enabled)
  MAPILLARY_ACCESS_TOKEN=...     (free alternative for images)

Run from the backend/ directory:
    python scripts/seed_demo_route.py
"""
import sys
import os
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(level=logging.WARNING, format="[%(levelname)s] %(name)s: %(message)s")

import asyncio
from app.core.config import settings
from app.db.database import SessionLocal
from app.models.accessibility_checkpoint import AccessibilityCheckpoint
from app.services import route_service, checkpoint_service
from app.services.ai_analysis_service import precompute_checkpoint

# ── Demo route ─────────────────────────────────────────────────────────────────
DEMO_ORIGIN_LAT = 10.877073
DEMO_ORIGIN_LNG = 106.800561
DEMO_DEST_LAT   = 10.874746
DEMO_DEST_LNG   = 106.800004

CHECKPOINT_INTERVAL_M = 75

# Bounding box for this route (used to clear old records)
ROUTE_LAT_MIN = 10.873
ROUTE_LAT_MAX = 10.880
ROUTE_LNG_MIN = 106.798
ROUTE_LNG_MAX = 106.803


async def clear_old_checkpoints(db):
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
    db.commit()
    return deleted


async def main() -> None:
    has_claude  = bool(settings.anthropic_api_key)
    has_sv      = bool(settings.google_maps_api_key)
    has_mly     = bool(settings.mapillary_access_token)

    print("=" * 62)
    print("  OpenPath - Demo Route Seed  (Claude Vision)")
    print("=" * 62)
    print(f"  Claude API key        : {'FOUND' if has_claude else 'MISSING (will use mock)'}")
    print(f"  Street View key       : {'FOUND' if has_sv     else 'MISSING'}")
    print(f"  Mapillary token       : {'FOUND' if has_mly    else 'MISSING'}")
    if not has_sv and not has_mly:
        print("  [!] No image source configured.")
        print("      Add GOOGLE_MAPS_API_KEY (enable billing) OR MAPILLARY_ACCESS_TOKEN.")
        print("      Analysis will fall back to Claude text-only (coordinate estimate).")
    print(f"  Route origin          : {DEMO_ORIGIN_LAT}, {DEMO_ORIGIN_LNG}")
    print(f"  Route dest            : {DEMO_DEST_LAT}, {DEMO_DEST_LNG}")
    print()

    db = SessionLocal()
    try:
        # Clear any previous seed for this route
        deleted = await clear_old_checkpoints(db)
        if deleted:
            print(f"  Cleared {deleted} existing checkpoint(s) for this route.")
            print()

        # Get walking route from OSRM
        print("Fetching walking route from OSRM...")
        try:
            route = await route_service.get_walking_route(
                DEMO_ORIGIN_LAT, DEMO_ORIGIN_LNG,
                DEMO_DEST_LAT, DEMO_DEST_LNG,
            )
        except Exception as exc:
            print(f"  ERROR: {exc}")
            return

        coords = checkpoint_service.sample_checkpoints(route["geometry"], CHECKPOINT_INTERVAL_M)
        print(f"  Distance    : {route['distance_km']} km")
        print(f"  Est. time   : {route['duration_min']:.0f} min walk")
        print(f"  Checkpoints : {len(coords)}")
        print()

        # Process checkpoints
        print("Processing checkpoints:")
        print(f"  {'#':<4} {'LAT':>10} {'LNG':>11}   {'STATUS':<10} {'RATING':<9} {'CONF':>5}  IMG")
        print("  " + "-" * 62)

        new_count = 0
        cached_count = 0

        for i, (lat, lng) in enumerate(coords, 1):
            result = await precompute_checkpoint(lat, lng, db)
            status  = result["status"]
            rating  = result["accessibility"].upper()
            conf    = f"{round(result['confidence'] * 100)}%"
            source  = result.get("source", "?")
            has_img = result.get("has_image", False)

            if status == "cached":
                cached_count += 1
                label = "CACHED"
            elif source == "claude-vision":
                new_count += 1
                label = "CLAUDE+IMG"
            elif source == "claude-text":
                new_count += 1
                label = "CLAUDE-TXT"
            else:
                new_count += 1
                label = "MOCK"

            img_col = "[photo]" if has_img else "-"
            print(f"  {i:<4} {lat:>10.6f} {lng:>11.6f}   {label:<10} {rating:<9} {conf:>5}  {img_col}")

    finally:
        db.close()

    print()
    print("=" * 62)
    print(f"  Done: {new_count} new  -  {cached_count} already cached")
    if not has_claude:
        print("  [!] Add ANTHROPIC_API_KEY to .env for real AI analysis.")
    if not has_sv and not has_mly:
        print("  [!] Add an image source key to get real street photos.")
    print()
    print("  Start the app and click 'Demo Route' to visualize.")
    print("=" * 62)


if __name__ == "__main__":
    asyncio.run(main())
