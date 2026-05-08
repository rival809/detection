from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from loguru import logger

from app.db.session import get_db
from app.db.models import User
from app.db.schemas import UserRegister, UserLogin, TokenResponse, UserOut
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.config import settings
from app.core.limiter import limiter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, payload: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=payload.email, hashed_password=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info(f"New user registered: {user.email}")
    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit(settings.LOGIN_RATE_LIMIT)
def login(request: Request, payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        logger.warning(f"Failed login attempt for: {payload.email}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    logger.info(f"User logged in: {user.email}")
    return TokenResponse(
        access_token=create_access_token(user.email),
        refresh_token=create_refresh_token(user.email),
    )


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("30/minute")
def refresh(request: Request, refresh_token: str, db: Session = Depends(get_db)):
    email = decode_token(refresh_token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    return TokenResponse(
        access_token=create_access_token(user.email),
        refresh_token=create_refresh_token(user.email),
    )
