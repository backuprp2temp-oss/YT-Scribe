"""Video API endpoints."""

import logging
import uuid
import tempfile
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
import httpx

from app.database import get_db
from app.models.download import DownloadHistory
from app.schemas.video import (
    VideoInfoResponse,
    VideoDownloadRequest,
    DownloadResponse,
)
from app.services.yt_dlp_service import YtDlpService
from app.utils.validators import validate_youtube_url
from app.tasks.download_tasks import start_download_task
from app.config import DOWNLOAD_DIR

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/video", tags=["video"])
yt_dlp_service = YtDlpService()


@router.get("/info", response_model=VideoInfoResponse)
async def get_video_info(url: str = Query(..., description="YouTube video URL")):
    """
    Fetch video metadata without downloading.
    
    Returns video information including available formats and subtitles.
    """
    if not validate_youtube_url(url):
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")
    
    try:
        info = yt_dlp_service.get_video_info(url)
        return info
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching video info: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch video information")


@router.post("/download", response_model=DownloadResponse)
async def download_video(
    request: VideoDownloadRequest,
    db: Session = Depends(get_db)
):
    """
    Initiate video download (background task).
    
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
        quality=request.quality,
        status="pending",
    )
    db.add(download_record)
    db.commit()
    db.refresh(download_record)
    
    start_download_task(
        task_id=task_id,
        download_id=download_record.id,
        url=request.url,
        format=request.format,
        quality=request.quality,
        subtitle_lang=request.subtitle_lang if request.download_subtitles else None,
    )
    
    return DownloadResponse(
        task_id=task_id,
        status="pending",
        status_url=f"/api/tasks/{task_id}/progress",
    )


@router.get("/download/{download_id}")
async def get_download_status(download_id: int, db: Session = Depends(get_db)):
    """Get download status by ID."""
    record = db.query(DownloadHistory).filter(DownloadHistory.id == download_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Download not found")

    return {
        "id": record.id,
        "video_id": record.video_id,
        "title": record.title,
        "status": record.status,
        "file_path": record.file_path,
        "file_size": record.file_size,
        "error_message": record.error_message,
        "created_at": record.created_at,
        "completed_at": record.completed_at,
    }


@router.get("/{video_id}/thumbnail")
async def download_thumbnail(
    video_id: str,
    url: str = Query(..., description="YouTube video URL"),
):
    """
    Download video thumbnail image.
    
    Returns the highest quality thumbnail available.
    """
    if not validate_youtube_url(url):
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")
    
    try:
        info = yt_dlp_service.get_video_info(url)
        thumbnail_url = info.get('thumbnail_url')
        
        if not thumbnail_url:
            raise HTTPException(status_code=404, detail="Thumbnail not available")
        
        # Download thumbnail
        async with httpx.AsyncClient() as client:
            response = await client.get(thumbnail_url, timeout=10)
            response.raise_for_status()
        
        # Save to temp file and return
        import tempfile
        with tempfile.NamedTemporaryFile(
            mode='wb',
            suffix='.jpg',
            delete=False,
        ) as f:
            f.write(response.content)
            temp_path = f.name
        
        return FileResponse(
            path=temp_path,
            filename=f"{info['title']}_{video_id}_thumbnail.jpg",
            media_type='image/jpeg',
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading thumbnail: {e}")
        raise HTTPException(status_code=500, detail="Failed to download thumbnail")


@router.get("/{video_id}/metadata")
async def export_metadata(
    video_id: str,
    url: str = Query(..., description="YouTube video URL"),
):
    """
    Export video metadata as JSON file.
    
    Returns complete metadata including title, description, tags, etc.
    """
    if not validate_youtube_url(url):
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")
    
    try:
        info = yt_dlp_service.get_video_info(url)
        
        import json
        import tempfile
        
        # Create metadata dict
        metadata = {
            'video_id': info.get('video_id'),
            'title': info.get('title'),
            'description': info.get('description'),
            'uploader': info.get('uploader'),
            'upload_date': info.get('upload_date'),
            'duration': info.get('duration'),
            'view_count': info.get('view_count'),
            'like_count': info.get('like_count'),
            'thumbnail_url': info.get('thumbnail_url'),
            'tags': info.get('tags', []),
            'categories': info.get('categories', []),
            'available_formats_count': len(info.get('available_formats', [])),
            'available_subtitles_count': len(info.get('available_subtitles', {})),
        }
        
        # Write to temp file
        with tempfile.NamedTemporaryFile(
            mode='w',
            suffix='.json',
            delete=False,
            encoding='utf-8',
        ) as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
            temp_path = f.name
        
        return FileResponse(
            path=temp_path,
            filename=f"{info['title']}_{video_id}_metadata.json",
            media_type='application/json',
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting metadata: {e}")
        raise HTTPException(status_code=500, detail="Failed to export metadata")
