"""Audio download API endpoints."""

import logging
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.download import DownloadHistory
from app.schemas.video import DownloadResponse
from app.schemas.audio import AudioDownloadRequest
from app.services.yt_dlp_service import YtDlpService
from app.utils.validators import validate_youtube_url
from app.tasks.download_tasks import start_audio_download_task

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/audio", tags=["audio"])
yt_dlp_service = YtDlpService()


@router.post("/download", response_model=DownloadResponse)
async def download_audio(
    request: AudioDownloadRequest,
    db: Session = Depends(get_db)
):
    """
    Initiate audio-only download (background task).
    
    Extracts audio from video and converts to specified format.
    Returns task ID for tracking progress via SSE.
    """
    if not validate_youtube_url(request.url):
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")
    
    try:
        video_info = yt_dlp_service.get_video_info(request.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching video info: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch video information")
    
    task_id = str(uuid.uuid4())
    
    download_record = DownloadHistory(
        video_id=video_info['video_id'],
        title=video_info['title'],
        url=request.url,
        format=request.format,
        quality=request.bitrate,
        status="pending",
    )
    db.add(download_record)
    db.commit()
    db.refresh(download_record)
    
    start_audio_download_task(
        task_id=task_id,
        download_id=download_record.id,
        url=request.url,
        format=request.format,
        bitrate=request.bitrate,
    )
    
    return DownloadResponse(
        task_id=task_id,
        status="pending",
        status_url=f"/api/tasks/{task_id}/progress",
    )
