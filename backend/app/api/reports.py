import uuid
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.database import SessionLocal
from app.models.accessibility_point import AccessibilityPoint
from app.models.user import User
from app.core.supabase import supabase
from app.api.auth import get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("")
def create_report(
    lat: float = Form(...),
    lng: float = Form(...),
    category: str = Form(...),
    description: str = Form(None),
    photo: UploadFile = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    photo_url = None
    if photo:
        file_ext = photo.filename.split(".")[-1] if "." in photo.filename else "jpg"
        file_name = f"{uuid.uuid4()}.{file_ext}"
        
        file_bytes = photo.file.read()
        
        supabase.storage.from_("report-images").upload(
            path=file_name,
            file=file_bytes,
            file_options={"content-type": photo.content_type or "image/jpeg"}
        )
        
        photo_url = supabase.storage.from_("report-images").get_public_url(file_name)

    new_report = AccessibilityPoint(
        name="Community Report",
        category=category,
        lat=lat,
        lng=lng,
        description=description,
        accessibility_score=0, # or a default like 50 for reports? Let's use 0 to indicate unknown/issue
        is_community_report=True,
        photo_url=photo_url
    )
    
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    
    return {"message": "Report created successfully", "id": new_report.id}
