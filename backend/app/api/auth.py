from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.db.database import SessionLocal
from app.core.config import settings
from app.models.user import User
from app.schemas.auth import UserRegister, UserLogin, UserResponse, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_access_token(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "role": user.role,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=JWT_ALGORITHM)


def get_current_user(
    authorization: str = Header(...),
    db: Session = Depends(get_db),
) -> User:
    """Dependency that requires a valid JWT and returns the User."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header prefix")

    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[JWT_ALGORITHM]
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    sub_val = payload.get("sub")
    if sub_val is None:
        raise HTTPException(status_code=401, detail="Invalid token payload: no sub")
    
    try:
        user_id = int(sub_val)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token payload: sub is not an integer")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail=f"User not found for id {user_id}")

    return user


def get_optional_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
) -> User | None:
    """Dependency that returns User if a valid JWT is present, else None."""
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[JWT_ALGORITHM]
        )
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None

    sub_val = payload.get("sub")
    if sub_val is None:
        return None
        
    try:
        user_id = int(sub_val)
    except ValueError:
        return None

    return db.query(User).filter(User.id == user_id).first()


@router.post("/register", response_model=TokenResponse)
def register(data: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    hashed = pwd_context.hash(data.password)
    user = User(username=data.username, name=data.name, hashed_password=hashed, role="user")
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user)
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not pwd_context.verify(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token(user)
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user
