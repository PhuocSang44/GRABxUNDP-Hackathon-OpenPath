import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.services import (
    route_service,
    checkpoint_service,
    ai_analysis_service,
    accessibility_service,
)
from app.services.checkpoint_service import haversine_m

router = APIRouter(prefix="/api/route", tags=["route"])

MAX_DISTANCE_M = 2500  # straight-line guard; actual route may be slightly longer


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class RouteRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    dest_lat: float
    dest_lng: float


@router.post("/analyze")
async def analyze_route(req: RouteRequest, db: Session = Depends(get_db)):
    straight_line = haversine_m(req.origin_lat, req.origin_lng, req.dest_lat, req.dest_lng)
    if straight_line > MAX_DISTANCE_M:
        raise HTTPException(status_code=400, detail="Destination must be within 2 km")

    try:
        route = await route_service.get_walking_route(
            req.origin_lat, req.origin_lng,
            req.dest_lat, req.dest_lng,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Routing service unavailable: {exc}")

    checkpoint_coords = checkpoint_service.sample_checkpoints(route["geometry"])

    checkpoints = []
    for lat, lng in checkpoint_coords:
        analysis = await ai_analysis_service.get_analysis(lat, lng, db)
        checkpoints.append({"id": str(uuid.uuid4()), "lat": lat, "lng": lng, **analysis})

    summary = accessibility_service.aggregate_route(checkpoints)

    return {"route": route, "checkpoints": checkpoints, "summary": summary}
