from typing import Any, List, Optional
from pydantic import BaseModel


class RoadSegmentOut(BaseModel):
    id: int
    name: Optional[str]
    geometry: Any  # GeoJSON dict
    sidewalk: Optional[bool]
    sidewalk_side: Optional[str]
    width_m: Optional[float]
    surface: Optional[str]
    curb_ramp: Optional[bool]
    obstacles: Optional[List[str]]
    stairs: Optional[bool]
    accessibility_score: Optional[int]
    confidence: Optional[float]
    source: Optional[str]

    class Config:
        from_attributes = True
