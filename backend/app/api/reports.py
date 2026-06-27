import uuid
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.database import SessionLocal
from app.models.accessibility_point import AccessibilityPoint
from app.models.user import User
from app.core.supabase import supabase
from app.api.auth import get_current_user, get_admin_user

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

@router.get("/unverified")
def list_unverified_reports(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    points = db.query(AccessibilityPoint).filter(
        AccessibilityPoint.is_community_report == True,
        AccessibilityPoint.verified == False
    ).order_by(AccessibilityPoint.last_updated.desc()).all()
    
    return [
        {
            "id": p.id,
            "category": p.category,
            "description": p.description,
            "photo_url": p.photo_url,
            "lat": p.lat,
            "lng": p.lng,
            "last_updated": p.last_updated.isoformat() if p.last_updated else None,
        }
        for p in points
    ]

@router.patch("/{report_id}/verify")
def verify_report(
    report_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    report = db.query(AccessibilityPoint).filter(AccessibilityPoint.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    report.verified = True
    db.commit()
    return {"message": "Report verified successfully"}

@router.delete("/{report_id}")
def reject_report(
    report_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    report = db.query(AccessibilityPoint).filter(AccessibilityPoint.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    db.delete(report)
    db.commit()
    return {"message": "Report rejected and deleted successfully"}

@router.get("/verified")
def list_verified_reports(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    points = db.query(AccessibilityPoint).filter(
        AccessibilityPoint.is_community_report == True,
        AccessibilityPoint.verified == True
    ).order_by(AccessibilityPoint.last_updated.desc()).all()
    
    return [
        {
            "id": p.id,
            "category": p.category,
            "description": p.description,
            "photo_url": p.photo_url,
            "lat": p.lat,
            "lng": p.lng,
            "last_updated": p.last_updated.isoformat() if p.last_updated else None,
        }
        for p in points
    ]

@router.patch("/{report_id}/hide")
def hide_report(
    report_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    report = db.query(AccessibilityPoint).filter(AccessibilityPoint.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    report.verified = False
    db.commit()
    return {"message": "Report hidden successfully"}
