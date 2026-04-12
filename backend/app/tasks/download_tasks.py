"""Background download task manager."""

import os
import json
import logging
import threading
from typing import Optional, Dict, Any
from datetime import datetime
from pathlib import Path
import yt_dlp

from app.database import SessionLocal
from app.models.download import DownloadHistory
from app.services.yt_dlp_service import YtDlpService
from app.config import DOWNLOAD_DIR, REDIS_URL
from app.utils.file_manager import FileManager

logger = logging.getLogger(__name__)

def get_redis():
    """Lazy Redis client creation."""
    import redis as _redis
    return _redis.from_url(REDIS_URL, decode_responses=True, socket_timeout=2, socket_connect_timeout=2)

yt_dlp_service = YtDlpService()
file_manager = FileManager()

# Store active download tasks
active_downloads: Dict[str, Dict[str, Any]] = {}


class ProgressHook:
    """Hook to track download progress and publish to Redis."""

    def __init__(self, task_id: str, download_id: int):
        self.task_id = task_id
        self.download_id = download_id
        self._redis = None
        self.channel = f"task_progress:{task_id}"

    @property
    def redis_client(self):
        if self._redis is None:
            self._redis = get_redis()
        return self._redis

    def __call__(self, d: dict):
        """Handle progress updates from yt-dlp."""
        if d['status'] == 'downloading':
            downloaded = d.get('downloaded_bytes', 0)
            total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
            speed = d.get('speed', 0)
            eta = d.get('eta', 0)

            progress = 0
            if total > 0:
                progress = int((downloaded / total) * 100)

            speed_mb = f"{speed / (1024 * 1024):.1f} MB/s" if speed else "N/A"
            
            update = {
                "status": "downloading",
                "progress": progress,
                "speed": speed_mb,
                "eta": eta,
                "downloaded_bytes": downloaded,
                "total_bytes": total,
            }
            
            self._publish(update)

        elif d['status'] == 'finished':
            update = {
                "status": "processing",
                "progress": 95,
                "message": "Post-processing...",
            }
            self._publish(update)

    def _publish(self, update: dict):
        """Publish update to Redis pub/sub."""
        try:
            self.redis_client.publish(self.channel, json.dumps(update))
            # Also store latest state for SSE retrieval
            self.redis_client.set(f"task_state:{self.task_id}", json.dumps(update), ex=3600)
        except Exception as e:
            logger.error(f"Failed to publish progress: {e}")


def download_video_sync(
    task_id: str,
    download_id: int,
    url: str,
    format: str = "mp4",
    quality: str = "1080p",
    subtitle_lang: Optional[str] = None,
):
    """
    Synchronous download function run in a background thread.
    
    Updates download history record and publishes progress to Redis.
    """
    db = SessionLocal()
    progress_hook = ProgressHook(task_id, download_id)
    
    try:
        # Update status to downloading
        record = db.query(DownloadHistory).filter(DownloadHistory.id == download_id).first()
        if not record:
            raise ValueError(f"Download record {download_id} not found")
        
        record.status = "downloading"
        db.commit()
        
        # Build download options
        output_template = str(DOWNLOAD_DIR / '%(title)s [%(id)s].%(ext)s')
        
        ydl_opts = {
            'outtmpl': output_template,
            'format': yt_dlp_service.build_format_string(format, quality),
            'merge_output_format': format,
            'quiet': False,
            'no_warnings': False,
            'socket_timeout': 60,
            'retries': 3,
            'fragment_retries': 3,
            'progress_hooks': [progress_hook],
        }
        
        if subtitle_lang:
            ydl_opts['writesubtitles'] = True
            ydl_opts['writeautomaticsub'] = True
            ydl_opts['subtitleslangs'] = [subtitle_lang]
            ydl_opts['subtitlesformat'] = 'srt'
        
        # Download video
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            
            # Find the downloaded file
            file_path = ydl.prepare_filename(info)
            file_size = file_manager.get_file_size(file_path)
            
            # Update record on success
            record.status = "completed"
            record.file_path = file_path
            record.file_size = file_size
            record.completed_at = datetime.utcnow()
            db.commit()
            
            # Publish completion event
            completion_update = {
                "status": "completed",
                "file_path": file_path,
                "file_size": file_size,
                "title": info.get('title'),
            }
            get_redis().publish(progress_hook.channel, json.dumps(completion_update))
            get_redis().set(f"task_state:{task_id}", json.dumps(completion_update), ex=3600)
            
            logger.info(f"Download completed: {file_path}")
            
    except Exception as e:
        logger.error(f"Download failed for task {task_id}: {e}", exc_info=True)
        
        # Update record on failure
        try:
            record = db.query(DownloadHistory).filter(DownloadHistory.id == download_id).first()
            if record:
                record.status = "failed"
                record.error_message = str(e)
                db.commit()
        except Exception as db_error:
            logger.error(f"Failed to update download record: {db_error}")
        
        # Publish failure event
        error_update = {
            "status": "failed",
            "error": str(e),
        }
        get_redis().publish(progress_hook.channel, json.dumps(error_update))
        get_redis().set(f"task_state:{task_id}", json.dumps(error_update), ex=3600)
    finally:
        db.close()
        
        # Remove from active downloads
        if task_id in active_downloads:
            del active_downloads[task_id]


def start_download_task(
    task_id: str,
    download_id: int,
    url: str,
    format: str = "mp4",
    quality: str = "1080p",
    subtitle_lang: Optional[str] = None,
):
    """Start a download task in a background thread."""
    active_downloads[task_id] = {
        "download_id": download_id,
        "url": url,
        "status": "pending",
    }

    thread = threading.Thread(
        target=download_video_sync,
        args=(task_id, download_id, url, format, quality, subtitle_lang),
        daemon=True,
    )
    thread.start()

    return thread


def download_audio_sync(
    task_id: str,
    download_id: int,
    url: str,
    format: str = "mp3",
    bitrate: str = "320k",
):
    """
    Synchronous audio-only download function run in a background thread.
    
    Extracts audio from video and converts to specified format.
    Updates download history record and publishes progress to Redis.
    """
    db = SessionLocal()
    progress_hook = ProgressHook(task_id, download_id)

    try:
        # Update status to downloading
        record = db.query(DownloadHistory).filter(DownloadHistory.id == download_id).first()
        if not record:
            raise ValueError(f"Download record {download_id} not found")

        record.status = "downloading"
        db.commit()

        # Build output template with audio extension
        output_template = str(DOWNLOAD_DIR / '%(title)s [%(id)s].%(ext)s')

        # Build yt-dlp options for audio extraction
        ydl_opts = {
            'outtmpl': output_template,
            'format': 'bestaudio/best',
            'quiet': False,
            'no_warnings': False,
            'socket_timeout': 60,
            'retries': 3,
            'fragment_retries': 3,
            'progress_hooks': [progress_hook],
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': format,
                'preferredquality': bitrate.replace('k', ''),
            }],
        }

        # Download and extract audio
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)

            # Find the downloaded file (yt-dlp changes extension for audio)
            base_path = ydl.prepare_filename(info)
            # Change extension to match audio format
            audio_ext = {
                'mp3': 'mp3',
                'm4a': 'm4a',
                'wav': 'wav',
                'flac': 'flac',
                'ogg': 'ogg',
                'aac': 'aac',
            }.get(format, 'mp3')
            
            file_path = str(Path(base_path).with_suffix(f'.{audio_ext}'))
            
            # If file doesn't exist with expected extension, try to find it
            if not Path(file_path).exists():
                # Try searching in download directory
                base_name = Path(base_path).stem
                for f in DOWNLOAD_DIR.glob(f"{base_name}.*"):
                    if f.suffix.lower() == f'.{audio_ext}':
                        file_path = str(f)
                        break
            
            file_size = file_manager.get_file_size(file_path)

            # Update record on success
            record.status = "completed"
            record.file_path = file_path
            record.file_size = file_size
            record.completed_at = datetime.utcnow()
            db.commit()

            # Publish completion event
            completion_update = {
                "status": "completed",
                "file_path": file_path,
                "file_size": file_size,
                "title": info.get('title'),
            }
            get_redis().publish(progress_hook.channel, json.dumps(completion_update))
            get_redis().set(f"task_state:{task_id}", json.dumps(completion_update), ex=3600)

            logger.info(f"Audio download completed: {file_path}")

    except Exception as e:
        logger.error(f"Audio download failed for task {task_id}: {e}", exc_info=True)

        # Update record on failure
        try:
            record = db.query(DownloadHistory).filter(DownloadHistory.id == download_id).first()
            if record:
                record.status = "failed"
                record.error_message = str(e)
                db.commit()
        except Exception as db_error:
            logger.error(f"Failed to update download record: {db_error}")

        # Publish failure event
        error_update = {
            "status": "failed",
            "error": str(e),
        }
        get_redis().publish(progress_hook.channel, json.dumps(error_update))
        get_redis().set(f"task_state:{task_id}", json.dumps(error_update), ex=3600)
    finally:
        db.close()

        # Remove from active downloads
        if task_id in active_downloads:
            del active_downloads[task_id]


def start_audio_download_task(
    task_id: str,
    download_id: int,
    url: str,
    format: str = "mp3",
    bitrate: str = "320k",
):
    """Start an audio download task in a background thread."""
    active_downloads[task_id] = {
        "download_id": download_id,
        "url": url,
        "status": "pending",
        "type": "audio",
    }

    thread = threading.Thread(
        target=download_audio_sync,
        args=(task_id, download_id, url, format, bitrate),
        daemon=True,
    )
    thread.start()

    return thread
