from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from geoalchemy2.shape import to_shape
from shapely.geometry import mapping

from app.db.database import SessionLocal
from app.models.road_segment import RoadSegment

router = APIRouter(prefix="/api/segments", tags=["segments"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("")
def list_segments(db: Session = Depends(get_db)):
    segments = db.query(RoadSegment).all()
    result = []
    for s in segments:
        geom = mapping(to_shape(s.geometry)) if s.geometry is not None else None
        result.append({
            "id": s.id,
            "name": s.name,
            "geometry": geom,
            "sidewalk": s.sidewalk,
            "sidewalk_side": s.sidewalk_side,
            "width_m": s.width_m,
            "surface": s.surface,
            "curb_ramp": s.curb_ramp,
            "obstacles": s.obstacles,
            "stairs": s.stairs,
            "accessibility_score": s.accessibility_score,
            "confidence": s.confidence,
            "source": s.source,
        })
    return result
