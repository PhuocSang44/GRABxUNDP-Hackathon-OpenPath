from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, JSON
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from app.db.database import Base


class RoadSegment(Base):
    __tablename__ = "road_segments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    geometry = Column(Geometry("LINESTRING", srid=4326), nullable=False)

    sidewalk = Column(Boolean, nullable=True)
    sidewalk_side = Column(String, nullable=True)  # left | right | both | none
    width_m = Column(Float, nullable=True)
    surface = Column(String, nullable=True)
    curb_ramp = Column(Boolean, nullable=True)
    obstacles = Column(JSON, nullable=True)  # list of strings
    stairs = Column(Boolean, nullable=True)

    accessibility_score = Column(Integer, nullable=True)  # 0–100
    confidence = Column(Float, nullable=True)  # 0.0–1.0
    source = Column(String, default="manual")  # ai | community | manual

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
