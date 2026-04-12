"""Download history API endpoints."""

import logging
import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from datetime import datetime

from app.database import get_db
from app.models.download import DownloadHistory
from app.schemas.video import DownloadResponse, VideoDownloadRequest
from app.services.yt_dlp_service import YtDlpService
from app.utils.validators import validate_youtube_url
from app.tasks.download_tasks import start_download_task

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/history", tags=["history"])
yt_dlp_service = YtDlpService()


@router.get("/")
async def get_history(
    limit: int = Query(default=20, ge=1, le=100, description="Number of items per page"),
    offset: int = Query(default=0, ge=0, description="Offset for pagination"),
    status: Optional[str] = Query(default=None, description="Filter by status"),
    db: Session = Depends(get_db)
):
    """
    Get download history with pagination.
    
    Returns paginated list of downloads ordered by creation date descending.
    """
    query = db.query(DownloadHistory)
    
    if status:
        query = query.filter(DownloadHistory.status == status)
    
    # Get total count for pagination
    total = query.count()
    
    # Get paginated results
    items = query.order_by(desc(DownloadHistory.created_at)).offset(offset).limit(limit).all()
    
    return {
        "items": [
            {
                "id": item.id,
                "video_id": item.video_id,
                "title": item.title,
                "url": item.url,
                "format": item.format,
                "quality": item.quality,
                "file_path": item.file_path,
                "file_size": item.file_size,
                "status": item.status,
                "error_message": item.error_message,
                "created_at": item.created_at,
                "completed_at": item.completed_at,
            }
            for item in items
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_more": offset + limit < total,
    }


@router.get("/{history_id}")
async def get_history_item(history_id: int, db: Session = Depends(get_db)):
    """Get a single download history item by ID."""
    item = db.query(DownloadHistory).filter(DownloadHistory.id == history_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Download not found")
    
    return {
        "id": item.id,
        "video_id": item.video_id,
        "title": item.title,
        "url": item.url,
        "format": item.format,
        "quality": item.quality,
        "file_path": item.file_path,
        "file_size": item.file_size,
        "status": item.status,
        "error_message": item.error_message,
        "created_at": item.created_at,
        "completed_at": item.completed_at,
    }


@router.delete("/{history_id}")
async def delete_history_item(history_id: int, db: Session = Depends(get_db)):
    """
    Delete a download history item.
    
    Optionally deletes the associated file if it exists.
    """
    item = db.query(DownloadHistory).filter(DownloadHistory.id == history_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Download not found")
    
    # Delete associated file if it exists
    if item.file_path and os.path.exists(item.file_path):
        try:
            os.remove(item.file_path)
        except OSError as e:
            logger.warning(f"Failed to delete file {item.file_path}: {e}")
    
    db.delete(item)
    db.commit()
    
    return {"message": "Download deleted successfully"}


@router.delete("/")
async def clear_history(
    delete_files: bool = Query(default=True, description="Also delete associated files"),
    db: Session = Depends(get_db)
):
    """
    Clear all download history.
    
    Optionally deletes all associated files.
    """
    items = db.query(DownloadHistory).all()
    
    deleted_count = 0
    for item in items:
        if delete_files and item.file_path and os.path.exists(item.file_path):
            try:
                os.remove(item.file_path)
            except OSError as e:
                logger.warning(f"Failed to delete file {item.file_path}: {e}")
        
        db.delete(item)
        deleted_count += 1
    
    db.commit()
    
    return {"message": f"Cleared {deleted_count} history items"}


@router.post("/{history_id}/redownload", response_model=DownloadResponse)
async def redownload(history_id: int, db: Session = Depends(get_db)):
    """
    Re-download a previously downloaded item with the same parameters.
    
    Creates a new download task and returns task ID for tracking.
    """
    import uuid
    
    item = db.query(DownloadHistory).filter(DownloadHistory.id == history_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Download not found")
    
    if not validate_youtube_url(item.url):
        raise HTTPException(status_code=400, detail="Original URL is no longer valid")
    
    # Create new history record for this download
    task_id = str(uuid.uuid4())
    
    new_record = DownloadHistory(
        video_id=item.video_id,
        title=item.title,
        url=item.url,
        format=item.format,
        quality=item.quality,
        status="pending",
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    
    # Start download task with same parameters
    start_download_task(
        task_id=task_id,
        download_id=new_record.id,
        url=item.url,
        format=item.format,
        quality=item.quality,
    )
    
    return DownloadResponse(
        task_id=task_id,
        status="pending",
        status_url=f"/api/tasks/{task_id}/progress",
    )


@router.get("/stats")
async def get_history_stats(db: Session = Depends(get_db)):
    """Get download history statistics."""
    total = db.query(DownloadHistory).count()
    completed = db.query(DownloadHistory).filter(DownloadHistory.status == "completed").count()
    failed = db.query(DownloadHistory).filter(DownloadHistory.status == "failed").count()
    downloading = db.query(DownloadHistory).filter(DownloadHistory.status == "downloading").count()
    
    # Calculate total size of completed downloads
    total_size_result = db.query(func.sum(DownloadHistory.file_size)).filter(
        DownloadHistory.status == "completed",
        DownloadHistory.file_size.isnot(None)
    ).first()
    total_size = total_size_result[0] or 0
    
    return {
        "total": total,
        "completed": completed,
        "failed": failed,
        "downloading": downloading,
        "pending": total - completed - failed - downloading,
        "total_size_bytes": total_size,
    }
