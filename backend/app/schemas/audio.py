"""Pydantic schemas for audio download."""

from typing import Optional
from pydantic import BaseModel, Field


class AudioDownloadRequest(BaseModel):
    """Request schema for audio-only download."""
    url: str = Field(..., min_length=1)
    format: str = Field(default="mp3", pattern="^(mp3|m4a|wav|flac|ogg|aac)$")
    bitrate: str = Field(default="320k", pattern="^(320k|256k|192k|128k|96k|64k)$")

    class Config:
        json_schema_extra = {
            "example": {
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "format": "mp3",
                "bitrate": "320k"
            }
        }
