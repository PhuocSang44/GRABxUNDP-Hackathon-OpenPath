from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.accessibility_point import AccessibilityPoint

router = APIRouter(prefix="/api/points", tags=["points"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("")
def list_points(db: Session = Depends(get_db)):
    points = db.query(AccessibilityPoint).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "category": p.category,
            "lat": p.lat,
            "lng": p.lng,
            "accessibility_score": p.accessibility_score,
            "address": p.address,
            "description": p.description,
            "features": p.features or [],
            "issues": p.issues or [],
            "verified": p.verified,
            "has_ramp": p.has_ramp,
            "has_toilet": p.has_toilet,
            "has_parking": p.has_parking,
            "has_elevator": p.has_elevator,
            "is_community_report": p.is_community_report,
            "photo_url": p.photo_url,
            "last_updated": p.last_updated.isoformat() if p.last_updated else None,
        }
        for p in points
    ]
