"""
AI Analysis Service — uses Claude Vision (Anthropic) as the primary engine.

Analysis priority per checkpoint:
  1. Real street-level image + Claude Vision   (source = "claude-vision")
  2. Coordinate-based estimate from Claude     (source = "claude-text",  confidence <= 0.65)
  3. Deterministic mock fallback               (source = "mock")

Cache is always checked first — the same location is never analyzed twice.

Image source priority (handled by street_view_service.download_image_any):
  1. Google Street View Static API  (GOOGLE_MAPS_API_KEY + billing enabled)
  2. Mapillary                      (MAPILLARY_ACCESS_TOKEN, free)
"""
import asyncio
import base64
import hashlib
import json
import logging
import random
import re
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.accessibility_checkpoint import AccessibilityCheckpoint
from app.services import street_view_service

logger = logging.getLogger(__name__)

# ── Prompts ───────────────────────────────────────────────────────────────────

_VISION_PROMPT = """
You are an accessibility analyst for wheelchair users. Analyze this street-level image
and assess the sidewalk/pedestrian path visible in it.

Return ONLY a valid JSON object — no markdown, no explanation:

{
  "sidewalk": true or false,
  "continuity": "continuous" | "broken" | "none",
  "width": "narrow" | "medium" | "wide",
  "surface": "smooth concrete" | "rough concrete" | "paving stones" | "asphalt" | "mixed tiles" | "gravel",
  "curbRamp": true or false,
  "stairs": true or false,
  "obstacles": ["utility pole", "parked motorcycle", ...],
  "confidence": 0.0 to 1.0
}

Width guide: narrow < 1.2 m · medium 1.2–2 m · wide > 2 m.
If stairs are present, set sidewalk to false.
Confidence = your certainty given image quality and visibility.
""".strip()

_TEXT_PROMPT_TPL = """
You are an accessibility analyst for wheelchair users in Ho Chi Minh City, Vietnam.
Estimate the sidewalk accessibility at this location based on your knowledge of the area:
  Latitude: {lat}, Longitude: {lng}

Return ONLY a valid JSON object — no markdown, no explanation:

{{
  "sidewalk": true or false,
  "continuity": "continuous" | "broken" | "none",
  "width": "narrow" | "medium" | "wide",
  "surface": "smooth concrete" | "rough concrete" | "paving stones" | "asphalt" | "mixed tiles" | "gravel",
  "curbRamp": true or false,
  "stairs": true or false,
  "obstacles": ["utility pole", "parked motorcycle", ...],
  "confidence": 0.0 to 0.65
}}

Width guide: narrow < 1.2 m · medium 1.2–2 m · wide > 2 m.
Confidence must not exceed 0.65 — this is a coordinate-only estimate.
""".strip()


# ── Claude API calls ──────────────────────────────────────────────────────────

def _get_anthropic_client():
    import anthropic
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


async def _analyze_with_claude_vision(image_bytes: bytes) -> dict | None:
    """Send a real image to Claude and get a structured accessibility assessment."""
    if not settings.anthropic_api_key:
        return None
    try:
        b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
        client = _get_anthropic_client()

        def _call() -> str:
            msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=1024,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": b64,
                            },
                        },
                        {"type": "text", "text": _VISION_PROMPT},
                    ],
                }],
            )
            return msg.content[0].text

        text = await asyncio.to_thread(_call)
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
        text = re.sub(r"\s*```\s*$", "", text, flags=re.MULTILINE)
        raw: dict = json.loads(text)
        return _parse_response(raw, source="claude-vision")
    except Exception as exc:
        logger.warning("Claude vision analysis failed: %s", exc)
        return None


async def _analyze_with_claude_text(lat: float, lng: float) -> dict | None:
    """Ask Claude to estimate accessibility from coordinates alone (no image)."""
    if not settings.anthropic_api_key:
        return None
    try:
        client = _get_anthropic_client()
        prompt = _TEXT_PROMPT_TPL.format(lat=round(lat, 5), lng=round(lng, 5))

        def _call() -> str:
            msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=512,
                messages=[{"role": "user", "content": prompt}],
            )
            return msg.content[0].text

        text = await asyncio.to_thread(_call)
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
        text = re.sub(r"\s*```\s*$", "", text, flags=re.MULTILINE)
        raw: dict = json.loads(text)
        return _parse_response(raw, source="claude-text")
    except Exception as exc:
        logger.warning("Claude text analysis failed: %s", exc)
        return None


def _parse_response(raw: dict, source: str) -> dict:
    obstacles = list(raw.get("obstacles") or [])
    if raw.get("stairs"):
        obstacles = ["stairs detected"] + [o for o in obstacles if o.lower() != "stairs"]
    return {
        "sidewalk": bool(raw.get("sidewalk", False)),
        "continuity": str(raw.get("continuity", "none")),
        "width": str(raw.get("width", "narrow")),
        "surface": str(raw.get("surface", "unknown")),
        "curb_ramp": bool(raw.get("curbRamp", False)),
        "obstacles": obstacles,
        "confidence": float(raw.get("confidence", 0.5)),
        "source": source,
    }


# ── Accessibility rating ──────────────────────────────────────────────────────

def _derive_accessibility(fields: dict) -> str:
    score = 0
    if fields.get("sidewalk"):
        score += 3
    continuity = fields.get("continuity", "")
    if continuity == "continuous":
        score += 2
    elif continuity == "broken":
        score += 1
    width = fields.get("width", "")
    if width == "wide":
        score += 2
    elif width == "medium":
        score += 1
    surface = fields.get("surface", "")
    if surface in ("smooth concrete", "asphalt"):
        score += 2
    elif surface in ("paving stones", "mixed tiles"):
        score += 1
    if fields.get("curb_ramp"):
        score += 1
    obstacles = fields.get("obstacles") or []
    if any("stairs" in o.lower() for o in obstacles):
        score -= 3
    score -= len(obstacles)

    if score >= 7:
        return "good"
    if score >= 4:
        return "moderate"
    return "poor"


# ── Supabase image upload (seed scripts only) ─────────────────────────────────

def _upload_to_supabase(lat: float, lng: float, image_bytes: bytes) -> str:
    """Upload a street-level JPEG to Supabase Storage; return the public URL."""
    try:
        from app.core.supabase import supabase
        file_name = f"streetview/{round(lat, 4)}_{round(lng, 4)}.jpg"
        try:
            supabase.storage.from_("report-images").upload(
                path=file_name,
                file=image_bytes,
                file_options={"contentType": "image/jpeg"},
            )
        except Exception:
            pass  # already exists — get_public_url still works
        return supabase.storage.from_("report-images").get_public_url(file_name)
    except Exception as exc:
        logger.warning("Supabase upload failed: %s", exc)
        return ""


# ── Deterministic mock fallback ───────────────────────────────────────────────

def _cache_key(lat: float, lng: float) -> str:
    return f"{round(lat, 4)},{round(lng, 4)}"


def _mock_analysis(lat: float, lng: float) -> dict:
    seed = int(hashlib.md5(f"{round(lat, 4)},{round(lng, 4)}".encode()).hexdigest(), 16) % (2**32)
    rng = random.Random(seed)

    sidewalk = rng.random() > 0.12
    width = rng.choice(["wide", "medium", "medium", "narrow"]) if sidewalk else "narrow"
    continuity = rng.choice(["continuous", "continuous", "broken"]) if sidewalk else "none"
    surface = rng.choices(
        ["smooth concrete", "rough concrete", "paving stones", "asphalt", "mixed tiles"],
        weights=[35, 20, 20, 15, 10],
    )[0]
    curb_ramp = rng.random() > 0.35
    all_obstacles = [
        "utility pole", "parked motorcycle", "street vendor stall",
        "tree root", "construction debris", "sign post",
    ]
    obstacles = rng.sample(all_obstacles, rng.choices([0, 1, 2], weights=[55, 35, 10])[0])
    confidence = round(rng.uniform(0.55, 0.75), 2)

    return {
        "sidewalk": sidewalk,
        "continuity": continuity,
        "width": width,
        "surface": surface,
        "curb_ramp": curb_ramp,
        "obstacles": obstacles,
        "confidence": confidence,
        "source": "mock",
    }


# ── Public interface ──────────────────────────────────────────────────────────

async def get_analysis(lat: float, lng: float, db: Session) -> dict:
    """Return cached or freshly-computed accessibility analysis for a checkpoint."""
    key = _cache_key(lat, lng)

    cached = (
        db.query(AccessibilityCheckpoint)
        .filter(AccessibilityCheckpoint.cache_key == key)
        .first()
    )
    if cached:
        return {
            "accessibility": cached.accessibility,
            "sidewalk": cached.sidewalk,
            "width": cached.width,
            "surface": cached.surface,
            "curb_ramp": cached.curb_ramp,
            "obstacles": cached.obstacles or [],
            "confidence": cached.confidence,
            "analyzed_at": cached.analyzed_at.isoformat() if cached.analyzed_at else None,
            "street_view_url": cached.street_view_url or "",
        }

    image_bytes: bytes | None = await street_view_service.download_image_any(lat, lng)

    fields: dict | None = None
    if image_bytes:
        fields = await _analyze_with_claude_vision(image_bytes)

    if fields is None:
        fields = await _analyze_with_claude_text(lat, lng)

    if fields is None:
        fields = _mock_analysis(lat, lng)

    accessibility = _derive_accessibility(fields)
    now = datetime.now(timezone.utc)

    checkpoint = AccessibilityCheckpoint(
        id=str(uuid.uuid4()),
        cache_key=key,
        lat=lat,
        lng=lng,
        accessibility=accessibility,
        sidewalk=fields["sidewalk"],
        width=fields["width"],
        surface=fields["surface"],
        curb_ramp=fields["curb_ramp"],
        obstacles=fields["obstacles"],
        confidence=fields["confidence"],
        street_view_url="",  # live API path: don't expose Google key to frontend
        analyzed_at=now,
    )
    db.add(checkpoint)
    db.commit()

    return {
        "accessibility": accessibility,
        "sidewalk": fields["sidewalk"],
        "width": fields["width"],
        "surface": fields["surface"],
        "curb_ramp": fields["curb_ramp"],
        "obstacles": fields["obstacles"],
        "confidence": fields["confidence"],
        "analyzed_at": now.isoformat(),
        "street_view_url": "",
    }


async def precompute_checkpoint(lat: float, lng: float, db: Session) -> dict:
    """
    Seed-script entry point.

    Downloads a real street-level image (Street View or Mapillary), sends it to
    Claude Vision, uploads the image to Supabase Storage for frontend display,
    and caches the result. Falls back to Claude text-only, then mock.
    Skips if already cached.
    """
    key = _cache_key(lat, lng)

    existing = (
        db.query(AccessibilityCheckpoint)
        .filter(AccessibilityCheckpoint.cache_key == key)
        .first()
    )
    if existing:
        return {
            "status": "cached",
            "accessibility": existing.accessibility,
            "confidence": existing.confidence or 0,
            "source": "cached",
            "has_image": bool(existing.street_view_url),
            "street_view_url": existing.street_view_url or "",
        }

    image_bytes: bytes | None = await street_view_service.download_image_any(lat, lng)

    fields: dict | None = None
    if image_bytes:
        fields = await _analyze_with_claude_vision(image_bytes)

    if fields is None:
        fields = await _analyze_with_claude_text(lat, lng)

    if fields is None:
        fields = _mock_analysis(lat, lng)

    accessibility = _derive_accessibility(fields)

    sv_url = ""
    if image_bytes:
        sv_url = _upload_to_supabase(lat, lng, image_bytes)

    now = datetime.now(timezone.utc)
    checkpoint = AccessibilityCheckpoint(
        id=str(uuid.uuid4()),
        cache_key=key,
        lat=lat,
        lng=lng,
        accessibility=accessibility,
        sidewalk=fields["sidewalk"],
        width=fields["width"],
        surface=fields["surface"],
        curb_ramp=fields["curb_ramp"],
        obstacles=fields["obstacles"],
        confidence=fields["confidence"],
        street_view_url=sv_url,
        analyzed_at=now,
    )
    db.add(checkpoint)
    db.commit()

    return {
        "status": "new",
        "accessibility": accessibility,
        "confidence": fields["confidence"],
        "source": fields.get("source", "mock"),
        "has_image": bool(sv_url),
        "street_view_url": sv_url,
    }
