from collections import Counter
from typing import Any


def aggregate_route(checkpoints: list[dict[str, Any]]) -> dict[str, Any]:
    n = len(checkpoints)
    if n == 0:
        return {
            "accessibility_rating": "unknown",
            "sidewalk_coverage": 0.0,
            "dominant_surface": "unknown",
            "has_curb_ramps": False,
            "total_obstacles": [],
            "has_narrow_sections": False,
            "good_count": 0,
            "moderate_count": 0,
            "poor_count": 0,
            "total_checkpoints": 0,
        }

    good = sum(1 for c in checkpoints if c.get("accessibility") == "good")
    moderate = sum(1 for c in checkpoints if c.get("accessibility") == "moderate")
    poor = sum(1 for c in checkpoints if c.get("accessibility") == "poor")

    sidewalk_pct = sum(1 for c in checkpoints if c.get("sidewalk")) / n

    surfaces = [c["surface"] for c in checkpoints if c.get("surface")]
    dominant_surface = Counter(surfaces).most_common(1)[0][0] if surfaces else "unknown"

    has_curb_ramps = any(c.get("curb_ramp") for c in checkpoints)

    all_obstacles: set[str] = set()
    for c in checkpoints:
        all_obstacles.update(c.get("obstacles") or [])

    has_narrow = any(c.get("width") == "narrow" for c in checkpoints)

    if good >= n * 0.65:
        overall = "good"
    elif poor >= n * 0.30:
        overall = "poor"
    else:
        overall = "moderate"

    return {
        "accessibility_rating": overall,
        "sidewalk_coverage": round(sidewalk_pct, 2),
        "dominant_surface": dominant_surface,
        "has_curb_ramps": has_curb_ramps,
        "total_obstacles": sorted(all_obstacles),
        "has_narrow_sections": has_narrow,
        "good_count": good,
        "moderate_count": moderate,
        "poor_count": poor,
        "total_checkpoints": n,
    }
