"""Pydantic schemas for transcript operations."""

from typing import List, Optional
from pydantic import BaseModel, Field


class SubtitleLanguage(BaseModel):
    """Information about a subtitle language."""
    code: str
    name: str
    auto_generated: bool
    formats: List[str] = []


class TranscriptLanguagesResponse(BaseModel):
    """Response for available subtitle languages."""
    video_id: str
    languages: List[SubtitleLanguage]


class TranscriptDownloadRequest(BaseModel):
    """Request for downloading a transcript."""
    url: str = Field(..., min_length=1)
    language: str = Field(default='en')
    format: str = Field(default='srt', pattern='^(srt|vtt|txt|json3)$')


class TranscriptPreviewResponse(BaseModel):
    """Response for transcript preview."""
    video_id: str
    title: str
    language: str
    format: str
    content: str
