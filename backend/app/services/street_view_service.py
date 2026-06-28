"""
Street-level image fetching.

Priority order:
  1. Google Street View Static API  (GOOGLE_MAPS_API_KEY + billing enabled)
  2. Mapillary API                  (MAPILLARY_ACCESS_TOKEN, free)
"""
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def build_street_view_url(lat: float, lng: float, size: str = "640x480") -> str:
    if not settings.google_maps_api_key:
        return ""
    return (
        "https://maps.googleapis.com/maps/api/streetview"
        f"?size={size}&location={lat},{lng}&fov=90&heading=0&pitch=0"
        f"&key={settings.google_maps_api_key}"
    )


async def download_image(lat: float, lng: float) -> bytes | None:
    """Google Street View Static API. Returns None on 403 (billing disabled) or any error."""
    if not settings.google_maps_api_key:
        return None
    url = build_street_view_url(lat, lng)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            content_type = resp.headers.get("content-type", "")
            if resp.status_code == 200 and content_type.startswith("image/"):
                return resp.content
            if resp.status_code == 403:
                logger.warning("Street View 403 — enable billing at console.cloud.google.com")
    except Exception as exc:
        logger.warning("Street View download failed: %s", exc)
    return None


async def download_image_mapillary(lat: float, lng: float) -> bytes | None:
    """
    Fetch the nearest street-level image from Mapillary (free, requires MAPILLARY_ACCESS_TOKEN).

    Registration: https://www.mapillary.com/app/?signup=true
    Token:        https://www.mapillary.com/developer/api-documentation
    """
    token = settings.mapillary_access_token
    if not token:
        return None

    delta = 0.0004  # ~44 m search radius
    bbox = f"{lng - delta},{lat - delta},{lng + delta},{lat + delta}"
    search_url = (
        "https://graph.mapillary.com/images"
        f"?fields=id,thumb_1024_url,quality_score"
        f"&bbox={bbox}&is_pano=false&limit=5"
        f"&access_token={token}"
    )

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(search_url)
            if resp.status_code != 200:
                logger.warning("Mapillary search HTTP %d", resp.status_code)
                return None

            images = resp.json().get("data", [])
            if not images:
                logger.info("Mapillary: no images near %.5f, %.5f", lat, lng)
                return None

            best = max(images, key=lambda x: x.get("quality_score") or 0)
            img_url = best.get("thumb_1024_url")
            if not img_url:
                return None

            img_resp = await client.get(img_url, follow_redirects=True)
            ct = img_resp.headers.get("content-type", "")
            if img_resp.status_code == 200 and ct.startswith("image/"):
                logger.info("Mapillary: image found near %.5f, %.5f (id=%s)", lat, lng, best.get("id"))
                return img_resp.content
    except Exception as exc:
        logger.warning("Mapillary download failed: %s", exc)

    return None


async def download_image_any(lat: float, lng: float) -> bytes | None:
    """Try Google Street View, then Mapillary. Returns the first successful result."""
    image = await download_image(lat, lng)
    if image:
        return image
    image = await download_image_mapillary(lat, lng)
    return image
