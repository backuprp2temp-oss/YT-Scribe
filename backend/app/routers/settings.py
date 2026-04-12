"""Settings API endpoints."""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models.settings import UserSettings
from app.schemas.settings import (
    SettingsResponse,
    SettingUpdateRequest,
    SettingsResetResponse,
    DEFAULT_SETTINGS,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["settings"])


def seed_default_settings(db: Session) -> None:
    """Insert default settings if they don't exist."""
    for key, value in DEFAULT_SETTINGS.items():
        existing = db.query(UserSettings).filter(UserSettings.key == key).first()
        if not existing:
            default_setting = UserSettings(key=key, value=value)
            db.add(default_setting)
    db.commit()


def get_all_settings(db: Session) -> dict:
    """Get all settings as a dictionary."""
    settings = db.query(UserSettings).all()
    return {s.key: s.value for s in settings}


@router.get("/", response_model=SettingsResponse)
async def get_settings(db: Session = Depends(get_db)):
    """
    Get all current settings.
    
    Seeds default settings on first call if none exist.
    """
    # Check if settings table is empty and seed if needed
    count = db.query(UserSettings).count()
    if count == 0:
        seed_default_settings(db)
    
    settings = get_all_settings(db)
    return {"settings": settings}


@router.get("/{key}")
async def get_setting(key: str, db: Session = Depends(get_db)):
    """Get a single setting by key."""
    setting = db.query(UserSettings).filter(UserSettings.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")
    
    return {"key": setting.key, "value": setting.value}


@router.put("/{key}")
async def update_setting(
    key: str,
    request: SettingUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Update a specific setting.
    
    Creates the setting if it doesn't exist.
    """
    # Validate known setting keys
    if key not in DEFAULT_SETTINGS:
        raise HTTPException(status_code=400, detail=f"Unknown setting key: {key}")
    
    # Validate value based on key
    if key in ("default_video_quality",):
        valid_values = ["360p", "480p", "720p", "1080p", "best"]
        if request.value not in valid_values:
            raise HTTPException(status_code=400, detail=f"Invalid quality. Must be one of: {', '.join(valid_values)}")
    
    elif key in ("default_video_format",):
        valid_values = ["mp4", "webm", "mkv", "avi"]
        if request.value not in valid_values:
            raise HTTPException(status_code=400, detail=f"Invalid format. Must be one of: {', '.join(valid_values)}")
    
    elif key in ("default_audio_format",):
        valid_values = ["mp3", "m4a", "wav", "flac", "ogg", "aac"]
        if request.value not in valid_values:
            raise HTTPException(status_code=400, detail=f"Invalid audio format. Must be one of: {', '.join(valid_values)}")
    
    elif key in ("default_audio_bitrate",):
        valid_values = ["320k", "256k", "192k", "128k", "96k", "64k"]
        if request.value not in valid_values:
            raise HTTPException(status_code=400, detail=f"Invalid bitrate. Must be one of: {', '.join(valid_values)}")
    
    elif key in ("auto_download_subtitles",):
        valid_values = ["true", "false"]
        if request.value.lower() not in valid_values:
            raise HTTPException(status_code=400, detail="Value must be 'true' or 'false'")
        request.value = request.value.lower()
    
    elif key in ("cleanup_downloads_after_hours",):
        try:
            hours = int(request.value)
            if hours < 1 or hours > 720:
                raise ValueError
            request.value = str(hours)
        except ValueError:
            raise HTTPException(status_code=400, detail="Must be a number between 1 and 720")
    
    # Update or create the setting
    setting = db.query(UserSettings).filter(UserSettings.key == key).first()
    if setting:
        setting.value = request.value
        setting.updated_at = datetime.utcnow()
    else:
        setting = UserSettings(key=key, value=request.value)
        db.add(setting)
    
    db.commit()
    db.refresh(setting)
    
    return {"key": setting.key, "value": setting.value}


@router.post("/reset", response_model=SettingsResetResponse)
async def reset_settings(db: Session = Depends(get_db)):
    """
    Reset all settings to their default values.
    
    Updates existing settings and creates any missing defaults.
    """
    for key, value in DEFAULT_SETTINGS.items():
        setting = db.query(UserSettings).filter(UserSettings.key == key).first()
        if setting:
            setting.value = value
            setting.updated_at = datetime.utcnow()
        else:
            setting = UserSettings(key=key, value=value)
            db.add(setting)
    
    db.commit()
    
    return {
        "message": "Settings reset to defaults",
        "settings": DEFAULT_SETTINGS,
    }


@router.get("/defaults")
async def get_default_settings():
    """Get the default settings without modifying the database."""
    return {"defaults": DEFAULT_SETTINGS}
