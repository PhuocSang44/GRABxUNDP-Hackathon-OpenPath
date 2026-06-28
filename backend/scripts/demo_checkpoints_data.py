"""
Demo route checkpoint data — edit this file to update the demo.

HOW TO USE
----------
1. Walk the route and capture a photo at each checkpoint location.
2. Name the photos cp1.jpg, cp2.jpg, ... and copy to:
       frontend/public/demo/checkpoints/
3. Update the lat/lng below to where you actually took each photo.
4. Fill in the properties based on what you observed.
5. Run:
       cd backend
       python scripts/seed_demo_manual.py

Fields
------
lat / lng    : where you took the photo (update after walking the route)
image        : filename inside frontend/public/demo/checkpoints/  e.g. "cp1.jpg"
               Leave "" to show no photo in the popup.
accessibility: "good" | "moderate" | "poor"
sidewalk     : True / False
continuity   : "continuous" | "broken" | "none"
width        : "narrow" (<1.2 m) | "medium" (1.2–2 m) | "wide" (>2 m)
surface      : "smooth concrete" | "rough concrete" | "paving stones"
               "asphalt" | "mixed tiles" | "gravel"
curb_ramp    : True / False
obstacles    : list of strings  e.g. ["parked motorcycle", "utility pole"]
confidence   : 0.0–1.0  (use 0.90 for on-site observation)
note         : your own reference note (not shown in the UI)
"""

# ── Route endpoints ────────────────────────────────────────────────────────────
DEMO_ORIGIN = {"lat": 10.877073, "lng": 106.800561}
DEMO_DEST   = {"lat": 10.877044, "lng": 106.802880}

# ── Checkpoints ────────────────────────────────────────────────────────────────
# Default coordinates are spaced ~63 m apart along the direct east path.
# UPDATE THESE after walking the route — change lat/lng to where you actually
# stood when you took the photo.

CHECKPOINTS = [
    # ── Checkpoint 1 ── near origin ───────────────────────────────────────────
    {
        "lat": 10.877073,
        "lng": 106.800561,
        "image": "cp1.jpg",
        "accessibility": "good",
        "sidewalk": True,
        "continuity": "continuous",
        "width": "wide",
        "surface": "smooth concrete",
        "curb_ramp": True,
        "obstacles": [],
        "confidence": 0.90,
        "note": "",
    },
    # ── Checkpoint 2 ── ~63 m east ────────────────────────────────────────────
    {
        "lat": 10.876761,
        "lng": 106.800657,
        "image": "cp2.jpg",
        "accessibility": "good",
        "sidewalk": True,
        "continuity": "continuous",
        "width": "medium",
        "surface": "smooth concrete",
        "curb_ramp": False,
        "obstacles": [],
        "confidence": 0.90,
        "note": "",
    },
    # ── Checkpoint 3 ── ~127 m east ───────────────────────────────────────────
    {
        "lat": 10.876457,
        "lng": 106.800775,
        "image": "cp3.jpg",
        "accessibility": "moderate",
        "sidewalk": True,
        "continuity": "broken",
        "width": "wide",
        "surface": "smooth concrete",
        "curb_ramp": False,
        "obstacles": ["parked motorcycle"],
        "confidence": 0.90,
        "note": "",
    },
    # ── Checkpoint 4 ── near destination ─────────────────────────────────────
    {
        "lat": 10.876538, 
        "lng": 106.801164,
        "image": "cp4.jpg",
        "accessibility": "good",
        "sidewalk": True,
        "continuity": "continuous",
        "width": "medium",
        "surface": "smooth concrete",
        "curb_ramp": True,
        "obstacles": [],
        "confidence": 0.90,
        "note": "",
    },
    # ── Checkpoint 6 ── near destination ─────────────────────────────────────
    {
        "lat": 10.876620,
        "lng": 106.801820,
        "image": "cp6.jpg",
        "accessibility": "good",
        "sidewalk": True,
        "continuity": "continuous",
        "width": "medium",
        "surface": "smooth concrete",
        "curb_ramp": True,
        "obstacles": [],
        "confidence": 0.90,
        "note": "",
    },
    # ── Checkpoint 5 ── near destination ─────────────────────────────────────
    {
        "lat": 10.876575, 
        "lng": 106.801480,
        "image": "cp5.jpg",
        "accessibility": "good",
        "sidewalk": True,
        "continuity": "continuous",
        "width": "medium",
        "surface": "smooth concrete",
        "curb_ramp": True,
        "obstacles": [],
        "confidence": 0.90,
        "note": "",
    },
    # ── Checkpoint 7 ── near destination ─────────────────────────────────────
    {
        "lat": 10.876642, 
        "lng": 106.802226,
        "image": "cp7.jpg",
        "accessibility": "good",
        "sidewalk": True,
        "continuity": "continuous",
        "width": "medium",
        "surface": "smooth concrete",
        "curb_ramp": True,
        "obstacles": [],
        "confidence": 0.90,
        "note": "",
    },
    # ── Checkpoint 8 ── near destination ─────────────────────────────────────
    {
        "lat": 10.876635, 
        "lng": 106.802666,
        "image": "cp8.jpg",
        "accessibility": "good",
        "sidewalk": True,
        "continuity": "continuous",
        "width": "medium",
        "surface": "smooth concrete",
        "curb_ramp": True,
        "obstacles": [],
        "confidence": 0.90,
        "note": "",
    },
    # ── Checkpoint 9 ── near destination ─────────────────────────────────────
    {
        "lat": 10.876590,
        "lng": 106.803034,
        "image": "cp9.jpg",
        "accessibility": "good",
        "sidewalk": True,
        "continuity": "continuous",
        "width": "medium",
        "surface": "smooth concrete",
        "curb_ramp": True,
        "obstacles": [],
        "confidence": 0.90,
        "note": "",
    },
    # ── Checkpoint 10 ── near destination ─────────────────────────────────────
    {
        "lat": 10.876899,
        "lng": 106.802950,
        "image": "cp10.jpg",
        "accessibility": "good",
        "sidewalk": True,
        "continuity": "continuous",
        "width": "medium",
        "surface": "smooth concrete",
        "curb_ramp": True,
        "obstacles": [],
        "confidence": 0.90,
        "note": "",
    },
    # ── Checkpoint 11 ── near destination ─────────────────────────────────────
    {
        "lat": 10.877048,
        "lng": 106.802886,
        "image": "cp11.jpg",
        "accessibility": "good",
        "sidewalk": True,
        "continuity": "continuous",
        "width": "medium",
        "surface": "smooth concrete",
        "curb_ramp": True,
        "obstacles": [],
        "confidence": 0.90,
        "note": "",
    },
]
