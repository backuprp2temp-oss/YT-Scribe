"""Transcript/subtitle API endpoints."""

import logging
import tempfile
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from app.services.transcript_service import TranscriptService
from app.schemas.transcript import (
    TranscriptLanguagesResponse,
    TranscriptDownloadRequest,
    TranscriptPreviewResponse,
)
from app.utils.validators import validate_youtube_url

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/transcript", tags=["transcript"])
transcript_service = TranscriptService()


@router.get("/{video_id}", response_model=TranscriptLanguagesResponse)
async def get_available_subtitles(
    video_id: str,
    url: str = Query(..., description="YouTube video URL"),
):
    """
    Get available subtitle languages for a video.
    
    Returns list of languages with manual and auto-generated options.
    """
    if not validate_youtube_url(url):
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")
    
    try:
        result = transcript_service.get_available_subtitles(url)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching subtitles: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch subtitles")


@router.post("/download")
async def download_subtitle(request: TranscriptDownloadRequest):
    """
    Download subtitle file.
    
    Returns the subtitle file as a download.
    """
    if not validate_youtube_url(request.url):
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")
    
    try:
        result = transcript_service.download_subtitle(
            request.url,
            request.language,
            request.format,
        )
        
        # Write to temp file and return as FileResponse
        with tempfile.NamedTemporaryFile(
            mode='w',
            suffix=f'.{request.format}',
            delete=False,
            encoding='utf-8',
        ) as f:
            f.write(result['content'])
            temp_path = f.name
        
        return FileResponse(
            path=temp_path,
            filename=f"{result['title']}_{result['language']}.{result['format']}",
            media_type='text/plain',
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error downloading subtitle: {e}")
        raise HTTPException(status_code=500, detail="Failed to download subtitle")


@router.get("/{video_id}/{lang}/preview", response_model=TranscriptPreviewResponse)
async def preview_subtitle(
    video_id: str,
    lang: str,
    url: str = Query(..., description="YouTube video URL"),
    format: str = Query(default='srt', pattern='^(srt|vtt|txt|json3)$'),
):
    """
    Preview subtitle content before downloading.
    
    Returns subtitle content as text for preview.
    """
    if not validate_youtube_url(url):
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")
    
    try:
        result = transcript_service.preview_subtitle(url, lang, format)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error previewing subtitle: {e}")
        raise HTTPException(status_code=500, detail="Failed to preview subtitle")
