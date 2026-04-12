"""Settings-related Pydantic schemas."""

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class SettingsResponse(BaseModel):
    """Response schema for all settings."""
    settings: Dict[str, Any]


class SettingUpdateRequest(BaseModel):
    """Request schema for updating a single setting."""
    value: str = Field(..., min_length=1, max_length=500)


class SettingsResetResponse(BaseModel):
    """Response schema for settings reset."""
    message: str
    settings: Dict[str, Any]


# Default settings values
DEFAULT_SETTINGS = {
    "default_video_quality": "1080p",
    "default_video_format": "mp4",
    "default_audio_format": "mp3",
    "default_audio_bitrate": "320k",
    "default_subtitle_lang": "en",
    "auto_download_subtitles": "false",
    "cleanup_downloads_after_hours": "24",
}
