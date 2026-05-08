from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import SystemConfig
from app.db.session import get_db

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


def verify_admin(x_admin_secret: str = Header(...)):
    if not settings.ADMIN_SECRET or x_admin_secret != settings.ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")


class ConfigUpdate(BaseModel):
    key: str
    value: str


@router.get("/config", dependencies=[Depends(verify_admin)])
def get_config(db: Session = Depends(get_db)):
    rows = db.query(SystemConfig).all()
    return {r.key: r.value for r in rows}


@router.put("/config", dependencies=[Depends(verify_admin)])
def set_config(body: ConfigUpdate, db: Session = Depends(get_db)):
    row = db.query(SystemConfig).filter(SystemConfig.key == body.key).first()
    if row:
        row.value = body.value
    else:
        row = SystemConfig(key=body.key, value=body.value)
        db.add(row)
    db.commit()
    return {"key": body.key, "updated": True}
