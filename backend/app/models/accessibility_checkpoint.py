import uuid
from sqlalchemy import Boolean, Column, DateTime, Float, String, JSON
from sqlalchemy.sql import func
from app.db.database import Base


class AccessibilityCheckpoint(Base):
    __tablename__ = "accessibility_checkpoints"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    cache_key = Column(String, unique=True, nullable=False, index=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    accessibility = Column(String, nullable=False)  # good | moderate | poor
    sidewalk = Column(Boolean, nullable=True)
    width = Column(String, nullable=True)            # narrow | medium | wide
    surface = Column(String, nullable=True)
    curb_ramp = Column(Boolean, nullable=True)
    obstacles = Column(JSON, nullable=True)
    confidence = Column(Float, nullable=True)
    street_view_url = Column(String, nullable=True)
    analyzed_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
