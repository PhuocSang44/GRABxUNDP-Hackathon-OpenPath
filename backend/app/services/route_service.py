from typing import Any
import httpx

OSRM_BASE = "http://router.project-osrm.org/route/v1/foot"


async def get_walking_route(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
) -> dict[str, Any]:
    url = f"{OSRM_BASE}/{origin_lng},{origin_lat};{dest_lng},{dest_lat}"
    params = {"geometries": "geojson", "overview": "full", "steps": "false"}

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    if data.get("code") != "Ok" or not data.get("routes"):
        raise ValueError("No route found between the given coordinates")

    route = data["routes"][0]
    return {
        "geometry": route["geometry"],
        "distance_km": round(route["distance"] / 1000, 2),
        "duration_min": round(route["duration"] / 60, 1),
    }
