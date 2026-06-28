"""
Assign local demo images to the pre-seeded demo route checkpoints.

Maps each checkpoint to one of 6 annotated images based on its accessibility rating.
Good checkpoints alternate between good_1/good_2, moderate between moderate_1/moderate_2,
poor between poor_1/poor_2.

Run after seed_demo_route.py:
    python scripts/assign_demo_images.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.models.accessibility_checkpoint import AccessibilityCheckpoint

# Demo route bounding box
LAT_MIN, LAT_MAX = 10.876, 10.880
LNG_MIN, LNG_MAX = 106.799, 106.804

IMAGES = {
    "good":     ["/demo/good_1.jpg",     "/demo/good_2.jpg"],
    "moderate": ["/demo/moderate_1.jpg", "/demo/moderate_2.jpg"],
    "poor":     ["/demo/poor_1.jpg",     "/demo/poor_2.jpg"],
}

def main():
    db = SessionLocal()
    try:
        rows = (
            db.query(AccessibilityCheckpoint)
            .filter(
                AccessibilityCheckpoint.lat >= LAT_MIN,
                AccessibilityCheckpoint.lat <= LAT_MAX,
                AccessibilityCheckpoint.lng >= LNG_MIN,
                AccessibilityCheckpoint.lng <= LNG_MAX,
            )
            .order_by(AccessibilityCheckpoint.lat)
            .all()
        )

        if not rows:
            print("No demo route checkpoints found. Run seed_demo_route.py first.")
            return

        counters = {"good": 0, "moderate": 0, "poor": 0}
        updated = 0

        for cp in rows:
            rating = cp.accessibility
            options = IMAGES.get(rating, IMAGES["moderate"])
            idx = counters.get(rating, 0) % len(options)
            counters[rating] = idx + 1
            img_url = options[idx]

            cp.street_view_url = img_url
            updated += 1
            print(f"  {cp.cache_key:<18}  {rating:<9}  {img_url}")

        db.commit()
        print(f"\nUpdated {updated} checkpoints with demo images.")
    finally:
        db.close()

if __name__ == "__main__":
    main()
