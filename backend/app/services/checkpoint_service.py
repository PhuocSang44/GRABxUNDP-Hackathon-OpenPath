import math
from typing import Any


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _interpolate(lat1: float, lng1: float, lat2: float, lng2: float, t: float) -> tuple[float, float]:
    return (lat1 + t * (lat2 - lat1), lng1 + t * (lng2 - lng1))


def sample_checkpoints(
    geometry: dict[str, Any],
    interval_m: float = 75.0,
) -> list[tuple[float, float]]:
    """Return (lat, lng) tuples sampled every interval_m metres along a GeoJSON LineString."""
    coords = geometry["coordinates"]  # [[lng, lat], ...]

    if len(coords) < 2:
        return [(coords[0][1], coords[0][0])] if coords else []

    result: list[tuple[float, float]] = [(coords[0][1], coords[0][0])]

    accumulated = 0.0
    next_sample = interval_m

    for i in range(len(coords) - 1):
        lng1, lat1 = coords[i]
        lng2, lat2 = coords[i + 1]
        seg_len = haversine_m(lat1, lng1, lat2, lng2)
        if seg_len == 0:
            continue

        while accumulated + seg_len >= next_sample:
            t = (next_sample - accumulated) / seg_len
            lat, lng = _interpolate(lat1, lng1, lat2, lng2, t)
            result.append((round(lat, 6), round(lng, 6)))
            next_sample += interval_m

        accumulated += seg_len

    # Include endpoint if it is far enough from the last sampled point.
    last_lat, last_lng = result[-1]
    end_lat, end_lng = coords[-1][1], coords[-1][0]
    if haversine_m(last_lat, last_lng, end_lat, end_lng) > 20:
        result.append((round(end_lat, 6), round(end_lng, 6)))

    return result
