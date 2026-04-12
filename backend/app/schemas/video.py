"""Video-related Pydantic schemas."""

from typing import Optional, List, Dict
from pydantic import BaseModel, HttpUrl, Field


class FormatInfo(BaseModel):
    """Information about a video format."""
    format_id: str
    ext: str
    resolution: Optional[str] = None
    filesize: Optional[int] = None
    filesize_approx: Optional[int] = None
    fps: Optional[float] = None
    vcodec: Optional[str] = None
    acodec: Optional[str] = None


class SubtitleInfo(BaseModel):
    """Information about available subtitles."""
    ext: str
    url: Optional[str] = None


class SubtitleLanguage(BaseModel):
    """Information about subtitles in a specific language."""
    code: str
    name: str
    auto_generated: bool
    formats: List[SubtitleInfo] = []


class VideoInfoResponse(BaseModel):
    """Response schema for video info."""
    video_id: str
    title: str
    description: Optional[str] = None
    duration: Optional[int] = None
    uploader: Optional[str] = None
    upload_date: Optional[str] = None
    view_count: Optional[int] = None
    thumbnail_url: Optional[str] = None
    available_formats: List[FormatInfo] = []
    available_subtitles: Dict[str, List[SubtitleInfo]] = {}


class VideoDownloadRequest(BaseModel):
    """Request schema for video download."""
    url: str = Field(..., min_length=1)
    format: str = Field(default="mp4", pattern="^(mp4|webm|mkv|avi)$")
    quality: Optional[str] = Field(default="1080p")
    download_subtitles: bool = Field(default=False)
    subtitle_lang: Optional[str] = Field(default="en")

    class Config:
        json_schema_extra = {
            "example": {
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "format": "mp4",
                "quality": "1080p",
                "download_subtitles": False,
                "subtitle_lang": "en"
            }
        }


class DownloadResponse(BaseModel):
    """Response schema for download initiation."""
    task_id: str
    status: str
    status_url: str
