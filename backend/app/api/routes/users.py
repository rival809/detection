import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_superadmin, get_current_user
from app.core.security import hash_password
from app.db.models import User
from app.db.schemas import UserCreate, UserListOut, UserOut, UserUpdate
from app.db.session import get_db

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=UserListOut)
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superadmin),
):
    items = db.query(User).order_by(User.created_at).all()
    return UserListOut(items=items, total=len(items))


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superadmin),
):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        is_superadmin=payload.is_superadmin,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_superadmin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.email is not None:
        if db.query(User).filter(User.email == payload.email, User.id != user_id).first():
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = payload.email
    if payload.password is not None:
        user.hashed_password = hash_password(payload.password)
    if payload.is_active is not None:
        # Jangan nonaktifkan diri sendiri
        if user.id == current_admin.id and not payload.is_active:
            raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
        user.is_active = payload.is_active
    if payload.is_superadmin is not None:
        user.is_superadmin = payload.is_superadmin
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_superadmin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    db.delete(user)
    db.commit()
