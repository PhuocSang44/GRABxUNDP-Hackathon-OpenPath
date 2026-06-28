"""
Generate annotated demo checkpoint images for the OpenPath demo route.

Produces 6 JPEG images (640x400) that look like AI-processed street-view photos:
  good_1.jpg      — wide smooth sidewalk, curb ramp
  good_2.jpg      — concrete path, clear route
  moderate_1.jpg  — parked motorcycles blocking sidewalk
  moderate_2.jpg  — utility poles on narrow path
  poor_1.jpg      — broken/cracked pavement, no clear path
  poor_2.jpg      — stairs detected (inaccessible)

Saved to: frontend/public/demo/
"""
import os
import sys
import math
import random

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from PIL import Image, ImageDraw, ImageFont

W, H = 640, 400
OUT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "..", "frontend", "public", "demo",
)
os.makedirs(OUT_DIR, exist_ok=True)


# ── Colour palette ─────────────────────────────────────────────────────────────

SKY      = (180, 210, 235)
BUILDING = (160, 145, 130)
BUILDING2= (140, 125, 110)
ROAD_DARK= ( 80,  80,  80)
ROAD_MID = ( 95,  95,  95)
SIDEWALK = (210, 195, 175)
SIDEWALK2= (200, 185, 165)
CONCRETE = (195, 190, 185)
GRASS    = ( 95, 130,  80)

GREEN_BOX = (  0, 200,  80)
YELLOW_BOX= (240, 180,   0)
RED_BOX   = (220,  40,  40)
WHITE     = (255, 255, 255)
BLACK     = (  0,   0,   0)
DARK_GREY = ( 30,  30,  30)

# Horizon line — buildings end, road+sidewalk start
HORIZON = 150
SIDEWALK_TOP   = HORIZON + 20   # start of sidewalk strip
SIDEWALK_LEFT  = 60
SIDEWALK_RIGHT = 260
ROAD_LEFT  = SIDEWALK_RIGHT
ROAD_RIGHT = W


def _try_font(size: int):
    """Load a TTF font if available, else fall back to PIL default."""
    for name in [
        "arial.ttf", "Arial.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibri.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
    ]:
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            pass
    return ImageFont.load_default()


FONT_SM  = _try_font(11)
FONT_MED = _try_font(13)
FONT_LG  = _try_font(15)
FONT_XL  = _try_font(18)


# ── Base scene builder ─────────────────────────────────────────────────────────

def _draw_base_scene(draw: ImageDraw.ImageDraw, *, cracked=False, no_sidewalk=False):
    """Draw sky, buildings, road, and sidewalk."""
    # Sky
    draw.rectangle([0, 0, W, HORIZON], fill=SKY)

    # Buildings left side
    for i, (x0, x1, bh, col) in enumerate([
        (0,  80, 120, BUILDING),
        (75, 160, 105, BUILDING2),
        (150, 240, 115, BUILDING),
        (230, 310, 100, BUILDING2),
    ]):
        draw.rectangle([x0, HORIZON - bh, x1, HORIZON], fill=col)
        # Windows
        for wy in range(HORIZON - bh + 10, HORIZON - 10, 20):
            for wx in range(x0 + 8, x1 - 8, 20):
                lit = random.random() > 0.4
                draw.rectangle([wx, wy, wx+10, wy+12],
                                fill=(220, 210, 150) if lit else (80, 90, 110))

    # Buildings right side
    for x0, x1, bh, col in [
        (350, 480, 130, BUILDING2),
        (470, 580, 110, BUILDING),
        (570, 640, 125, BUILDING2),
    ]:
        draw.rectangle([x0, HORIZON - bh, x1, HORIZON], fill=col)
        for wy in range(HORIZON - bh + 10, HORIZON - 10, 20):
            for wx in range(x0 + 8, x1 - 8, 20):
                lit = random.random() > 0.4
                draw.rectangle([wx, wy, wx+10, wy+12],
                                fill=(220, 210, 150) if lit else (80, 90, 110))

    # Road
    draw.rectangle([ROAD_LEFT, HORIZON, W, H], fill=ROAD_MID)
    # Lane markings
    for y in range(HORIZON + 40, H, 30):
        draw.rectangle([ROAD_LEFT + 80, y, ROAD_LEFT + 100, y + 15], fill=(200, 200, 200))

    # Sidewalk strip
    if no_sidewalk:
        # Dirt / uneven ground
        draw.rectangle([SIDEWALK_LEFT, HORIZON, SIDEWALK_RIGHT, H], fill=(130, 110, 85))
        for _ in range(30):
            rx = random.randint(SIDEWALK_LEFT, SIDEWALK_RIGHT - 15)
            ry = random.randint(HORIZON + 5, H - 10)
            draw.rectangle([rx, ry, rx + 12, ry + 8], fill=(115, 95, 70))
    elif cracked:
        draw.rectangle([SIDEWALK_LEFT, HORIZON, SIDEWALK_RIGHT, H], fill=CONCRETE)
        # Crack lines
        rng = random.Random(42)
        for _ in range(12):
            x1 = rng.randint(SIDEWALK_LEFT + 5, SIDEWALK_RIGHT - 5)
            y1 = rng.randint(HORIZON + 10, H - 20)
            x2 = x1 + rng.randint(-25, 25)
            y2 = y1 + rng.randint(10, 35)
            draw.line([x1, y1, x2, y2], fill=(100, 95, 90), width=2)
        # Hole / missing chunk
        draw.polygon([
            (SIDEWALK_LEFT + 50, HORIZON + 80),
            (SIDEWALK_LEFT + 90, HORIZON + 75),
            (SIDEWALK_LEFT + 95, HORIZON + 115),
            (SIDEWALK_LEFT + 45, HORIZON + 118),
        ], fill=(90, 80, 70))
    else:
        draw.rectangle([SIDEWALK_LEFT, HORIZON, SIDEWALK_RIGHT, H], fill=SIDEWALK)
        # Tile lines
        for x in range(SIDEWALK_LEFT, SIDEWALK_RIGHT, 30):
            draw.line([x, HORIZON, x, H], fill=SIDEWALK2, width=1)
        for y in range(HORIZON, H, 25):
            draw.line([SIDEWALK_LEFT, y, SIDEWALK_RIGHT, y], fill=SIDEWALK2, width=1)

    # Kerb edge
    draw.rectangle([SIDEWALK_RIGHT - 4, HORIZON, SIDEWALK_RIGHT, H], fill=(100, 95, 90))

    # Tree trunk on sidewalk
    draw.rectangle([SIDEWALK_LEFT + 30, HORIZON + 30, SIDEWALK_LEFT + 38, H],
                   fill=(90, 65, 40))
    draw.ellipse([SIDEWALK_LEFT + 10, HORIZON + 10, SIDEWALK_LEFT + 60, HORIZON + 55],
                 fill=(60, 110, 55))


def _draw_detection_box(draw, x0, y0, x1, y1, colour, label, conf=None, font=None):
    if font is None:
        font = FONT_MED
    # Box outline (2 px)
    for d in range(2):
        draw.rectangle([x0 - d, y0 - d, x1 + d, y1 + d], outline=colour)

    # Label background
    txt = f"{label}{f'  {conf}' if conf else ''}"
    bbox = draw.textbbox((x0, y0), txt, font=font)
    lw = bbox[2] - bbox[0] + 8
    lh = bbox[3] - bbox[1] + 4
    draw.rectangle([x0, y0 - lh - 2, x0 + lw, y0 - 2], fill=colour)
    draw.text((x0 + 4, y0 - lh - 1), txt, fill=WHITE, font=font)


def _draw_hud(draw, lines: list[tuple[str, tuple]], rating: str, conf: float):
    """Bottom HUD strip with analysis summary."""
    hud_h = 70
    draw.rectangle([0, H - hud_h, W, H], fill=(20, 20, 20, 220))

    rating_col = {"good": (0, 200, 80), "moderate": (240, 180, 0), "poor": (220, 40, 40)}.get(
        rating, (160, 160, 160)
    )

    # Rating pill
    draw.rounded_rectangle([10, H - hud_h + 10, 120, H - hud_h + 40],
                             radius=6, fill=rating_col)
    draw.text((22, H - hud_h + 15), f"  {rating.upper()}", fill=WHITE, font=FONT_LG)

    # Confidence bar
    draw.text((135, H - hud_h + 13), f"Confidence: {round(conf*100)}%", fill=(200, 200, 200), font=FONT_SM)
    bar_y = H - hud_h + 28
    draw.rectangle([135, bar_y, 300, bar_y + 8], fill=(60, 60, 60))
    draw.rectangle([135, bar_y, 135 + round(165 * conf), bar_y + 8], fill=rating_col)

    # Detail tags
    tag_x = 10
    for label, col in lines:
        bbox = draw.textbbox((tag_x, H - hud_h + 48), label, font=FONT_SM)
        tw = bbox[2] - bbox[0] + 10
        draw.rounded_rectangle([tag_x, H - hud_h + 46, tag_x + tw, H - hud_h + 62],
                                 radius=4, fill=col)
        draw.text((tag_x + 5, H - hud_h + 48), label, fill=WHITE, font=FONT_SM)
        tag_x += tw + 6

    # Gemini badge top-right
    draw.rounded_rectangle([W - 120, H - hud_h + 8, W - 8, H - hud_h + 32],
                             radius=6, fill=(80, 0, 160))
    draw.text((W - 112, H - hud_h + 12), "* Gemini 2.5 Flash", fill=WHITE, font=FONT_SM)


# ── Image generators ───────────────────────────────────────────────────────────

def make_good_1():
    """Wide smooth sidewalk, curb ramp, no obstacles."""
    rng = random.Random(1)
    img = Image.new("RGB", (W, H), SKY)
    draw = ImageDraw.Draw(img)
    _draw_base_scene(draw)

    # Curb ramp depression at bottom of frame
    draw.polygon([
        (SIDEWALK_RIGHT - 4, H - 40),
        (SIDEWALK_RIGHT + 20, H - 25),
        (SIDEWALK_RIGHT + 20, H),
        (SIDEWALK_RIGHT - 4, H),
    ], fill=(180, 170, 155))

    # Detection: sidewalk
    _draw_detection_box(draw, SIDEWALK_LEFT + 5, HORIZON + 5,
                        SIDEWALK_RIGHT - 8, H - 72,
                        GREEN_BOX, "SIDEWALK", "97%")
    # Detection: curb ramp
    _draw_detection_box(draw, SIDEWALK_RIGHT - 10, H - 72,
                        SIDEWALK_RIGHT + 25, H - 5,
                        GREEN_BOX, "CURB RAMP", "91%")

    _draw_hud(draw, [
        ("Sidewalk: Wide (>2m)", (0, 140, 60)),
        ("Surface: Smooth concrete", (0, 140, 60)),
        ("Curb Ramp: YES", (0, 140, 60)),
        ("Obstacles: None", (0, 100, 50)),
    ], "good", 0.93)
    return img


def make_good_2():
    """Concrete path, trees, clear route — good."""
    img = Image.new("RGB", (W, H), SKY)
    draw = ImageDraw.Draw(img)
    _draw_base_scene(draw)

    # Extra tree
    draw.rectangle([SIDEWALK_LEFT + 130, HORIZON + 30, SIDEWALK_LEFT + 138, H],
                   fill=(90, 65, 40))
    draw.ellipse([SIDEWALK_LEFT + 110, HORIZON + 12, SIDEWALK_LEFT + 160, HORIZON + 58],
                 fill=(55, 105, 50))

    _draw_detection_box(draw, SIDEWALK_LEFT + 5, HORIZON + 5,
                        SIDEWALK_RIGHT - 8, H - 72,
                        GREEN_BOX, "SIDEWALK", "88%")

    _draw_hud(draw, [
        ("Sidewalk: Medium (1.8m)", (0, 140, 60)),
        ("Surface: Concrete", (0, 140, 60)),
        ("Continuity: Continuous", (0, 140, 60)),
    ], "good", 0.88)
    return img


def make_moderate_1():
    """Parked motorcycles blocking part of sidewalk."""
    img = Image.new("RGB", (W, H), SKY)
    draw = ImageDraw.Draw(img)
    _draw_base_scene(draw)

    # Motorcycle 1
    mx, my = SIDEWALK_LEFT + 55, H - 100
    draw.ellipse([mx - 18, my - 5, mx - 2, my + 10], fill=(50, 50, 50))   # wheel
    draw.ellipse([mx + 30, my - 5, mx + 46, my + 10], fill=(50, 50, 50))
    draw.rectangle([mx - 5, my - 20, mx + 40, my + 5], fill=(180, 30, 30))  # body
    draw.rectangle([mx + 15, my - 30, mx + 30, my - 20], fill=(160, 25, 25))  # seat

    # Motorcycle 2
    mx2, my2 = SIDEWALK_LEFT + 100, H - 95
    draw.ellipse([mx2 - 18, my2 - 5, mx2 - 2, my2 + 10], fill=(50, 50, 50))
    draw.ellipse([mx2 + 30, my2 - 5, mx2 + 46, my2 + 10], fill=(50, 50, 50))
    draw.rectangle([mx2 - 5, my2 - 20, mx2 + 40, my2 + 5], fill=(30, 60, 180))
    draw.rectangle([mx2 + 15, my2 - 30, mx2 + 30, my2 - 20], fill=(25, 50, 160))

    # Detection: sidewalk (partial)
    _draw_detection_box(draw, SIDEWALK_LEFT + 5, HORIZON + 5,
                        SIDEWALK_LEFT + 50, H - 72,
                        YELLOW_BOX, "SIDEWALK (NARROW)", "79%")
    # Detection: obstacle motorcycles
    _draw_detection_box(draw, mx - 22, my - 35, mx2 + 50, my + 15,
                        RED_BOX, "OBSTACLE: Parked motorcycle x2", "94%")

    _draw_hud(draw, [
        ("Sidewalk: Narrow (<1.2m)", (180, 120, 0)),
        ("Obstacle: Parked motorcycles", (180, 40, 40)),
        ("Passable width: ~0.8m", (160, 80, 0)),
    ], "moderate", 0.79)
    return img


def make_moderate_2():
    """Utility pole on narrow sidewalk."""
    img = Image.new("RGB", (W, H), SKY)
    draw = ImageDraw.Draw(img)
    _draw_base_scene(draw)

    # Utility pole
    px = SIDEWALK_LEFT + 90
    draw.rectangle([px - 5, HORIZON - 60, px + 5, H], fill=(70, 60, 50))
    # Cross arm
    draw.rectangle([px - 35, HORIZON - 50, px + 35, HORIZON - 44], fill=(70, 60, 50))
    # Wires
    for wx in [px - 30, px + 30]:
        draw.line([wx, HORIZON - 47, wx + 80, HORIZON - 20], fill=(40, 40, 40), width=1)

    # Detection: sidewalk
    _draw_detection_box(draw, SIDEWALK_LEFT + 5, HORIZON + 5,
                        SIDEWALK_RIGHT - 8, H - 72,
                        YELLOW_BOX, "SIDEWALK (MEDIUM)", "82%")
    # Detection: utility pole
    _draw_detection_box(draw, px - 12, HORIZON, px + 12, H - 72,
                        RED_BOX, "OBSTACLE: Utility pole", "96%")

    _draw_hud(draw, [
        ("Sidewalk: Medium (1.5m)", (180, 120, 0)),
        ("Obstacle: Utility pole", (180, 40, 40)),
        ("Surface: Paving stones", (120, 100, 0)),
    ], "moderate", 0.82)
    return img


def make_poor_1():
    """Broken/cracked pavement — poor accessibility."""
    img = Image.new("RGB", (W, H), SKY)
    draw = ImageDraw.Draw(img)
    _draw_base_scene(draw, cracked=True)

    # Detection: broken surface
    _draw_detection_box(draw, SIDEWALK_LEFT + 5, HORIZON + 5,
                        SIDEWALK_RIGHT - 8, H - 72,
                        RED_BOX, "BROKEN PAVEMENT", "87%")
    _draw_detection_box(draw, SIDEWALK_LEFT + 42, HORIZON + 72,
                        SIDEWALK_LEFT + 100, HORIZON + 124,
                        RED_BOX, "HAZARD: Missing chunk", "91%")

    _draw_hud(draw, [
        ("Sidewalk: Damaged", (180, 40, 40)),
        ("Surface: Broken concrete", (180, 40, 40)),
        ("Hazard: Uneven surface", (180, 40, 40)),
    ], "poor", 0.87)
    return img


def make_poor_2():
    """Stairs — not wheelchair accessible."""
    img = Image.new("RGB", (W, H), SKY)
    draw = ImageDraw.Draw(img)
    _draw_base_scene(draw, no_sidewalk=True)

    # Stairs replacing sidewalk
    step_w = SIDEWALK_RIGHT - SIDEWALK_LEFT - 10
    for i in range(6):
        sy = HORIZON + 30 + i * 30
        sx = SIDEWALK_LEFT + 5 + i * 8
        draw.rectangle([sx, sy, sx + step_w - i * 8, sy + 28],
                       fill=(160, 150, 140))
        draw.line([sx, sy, sx + step_w - i * 8, sy], fill=(120, 110, 100), width=2)

    # Detection: stairs
    _draw_detection_box(draw, SIDEWALK_LEFT + 2, HORIZON + 25,
                        SIDEWALK_RIGHT - 5, H - 72,
                        RED_BOX, "STAIRS DETECTED", "95%")

    _draw_hud(draw, [
        ("STAIRS: Not wheelchair accessible", (180, 40, 40)),
        ("No alternative ramp found", (180, 40, 40)),
    ], "poor", 0.95)
    return img


# ── Main ───────────────────────────────────────────────────────────────────────

IMAGES = [
    ("good_1.jpg",     make_good_1),
    ("good_2.jpg",     make_good_2),
    ("moderate_1.jpg", make_moderate_1),
    ("moderate_2.jpg", make_moderate_2),
    ("poor_1.jpg",     make_poor_1),
    ("poor_2.jpg",     make_poor_2),
]


def main():
    print(f"Generating {len(IMAGES)} demo checkpoint images...")
    for name, fn in IMAGES:
        random.seed(name)  # deterministic per image
        img = fn()
        path = os.path.join(OUT_DIR, name)
        img.save(path, "JPEG", quality=88)
        size = os.path.getsize(path)
        print(f"  {name:<20} {size // 1024:>4} KB")
    print("Done.")


if __name__ == "__main__":
    main()
