from sqlalchemy import Boolean, Column, DateTime, Float, Integer, JSON, String
from sqlalchemy.sql import func
from app.db.database import Base


class AccessibilityPoint(Base):
    __tablename__ = "accessibility_points"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    accessibility_score = Column(Integer, nullable=False)
    address = Column(String, nullable=True)
    description = Column(String, nullable=True)
    features = Column(JSON, default=list)
    issues = Column(JSON, default=list)
    verified = Column(Boolean, default=False)
    has_ramp = Column(Boolean, default=False)
    has_toilet = Column(Boolean, default=False)
    has_parking = Column(Boolean, default=False)
    has_elevator = Column(Boolean, default=False)
    is_community_report = Column(Boolean, default=False)
    last_updated = Column(DateTime(timezone=True), server_default=func.now())
