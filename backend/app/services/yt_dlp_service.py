"""yt-dlp wrapper service for video operations."""

import os
import logging
from typing import Optional, Dict, Any, List
from pathlib import Path
import yt_dlp
from app.config import DOWNLOAD_DIR
from app.utils.validators import extract_video_id

logger = logging.getLogger(__name__)


class YtDlpService:
    """Service for interacting with yt-dlp library."""

    def __init__(self):
        self.download_dir = DOWNLOAD_DIR

    def get_video_info(self, url: str) -> Dict[str, Any]:
        """
        Extract video metadata without downloading.
        
        Returns:
            Dict with video metadata including formats and subtitles.
            
        Raises:
            Exception: If video info extraction fails.
        """
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'socket_timeout': 30,
            'retries': 3,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                if not info:
                    raise ValueError("Could not extract video information")
                
                video_id = info.get('id', extract_video_id(url))
                
                formats = self._parse_formats(info.get('formats', []))
                subtitles = self._parse_subtitles(info.get('subtitles', {}), info.get('automatic_captions', {}))
                
                return {
                    'video_id': video_id,
                    'title': info.get('title', 'Unknown Title'),
                    'description': info.get('description'),
                    'duration': info.get('duration'),
                    'uploader': info.get('uploader') or info.get('channel'),
                    'upload_date': info.get('upload_date'),
                    'view_count': info.get('view_count'),
                    'thumbnail_url': info.get('thumbnail'),
                    'available_formats': formats,
                    'available_subtitles': subtitles,
                }
        except yt_dlp.utils.DownloadError as e:
            error_msg = str(e)
            if 'private' in error_msg.lower() or 'members-only' in error_msg.lower():
                raise ValueError("This video is private or members-only")
            elif 'unavailable' in error_msg.lower():
                raise ValueError("This video is unavailable")
            else:
                raise ValueError(f"Failed to extract video info: {error_msg}")
        except Exception as e:
            logger.error(f"Error extracting video info: {e}")
            raise ValueError(f"Failed to extract video info: {str(e)}")

    def _parse_formats(self, formats: List[Dict]) -> List[Dict[str, Any]]:
        """Parse and filter video formats."""
        parsed = []
        seen = set()
        
        for fmt in formats:
            format_id = str(fmt.get('format_id', ''))
            ext = fmt.get('ext', 'unknown')
            resolution = fmt.get('resolution') or fmt.get('height')
            filesize = fmt.get('filesize') or fmt.get('filesize_approx')
            
            if resolution and isinstance(resolution, int):
                resolution = f"{resolution}p"
            
            key = f"{ext}-{resolution or format_id}"
            if key in seen:
                continue
            seen.add(key)
            
            parsed.append({
                'format_id': format_id,
                'ext': ext,
                'resolution': resolution,
                'filesize': filesize,
                'filesize_approx': fmt.get('filesize_approx'),
                'fps': fmt.get('fps'),
                'vcodec': fmt.get('vcodec'),
                'acodec': fmt.get('acodec'),
            })
        
        return parsed

    def _parse_subtitles(self, subtitles: Dict, auto_captions: Dict) -> Dict[str, List[Dict]]:
        """Parse available subtitle languages."""
        parsed = {}
        
        all_subs = {**auto_captions}
        for lang in subtitles:
            if lang not in all_subs:
                all_subs[lang] = []
            all_subs[lang].extend(subtitles.get(lang, []))
        
        for lang, subs in all_subs.items():
            if not subs:
                continue
            
            is_auto = lang in auto_captions and lang not in subtitles
            formats = [{'ext': sub.get('ext', 'vtt')} for sub in subs if sub.get('ext')]
            
            if not formats:
                formats = [{'ext': 'vtt'}]
            
            parsed[lang] = formats
        
        return parsed

    def build_format_string(self, format: str = 'mp4', quality: str = '1080p') -> str:
        """
        Build yt-dlp format string based on user preferences.
        
        Args:
            format: Desired container format (mp4, webm, etc.)
            quality: Desired quality (360p, 480p, 720p, 1080p, best)
            
        Returns:
            Format string for yt-dlp -f option.
        """
        quality_map = {
            '360p': '360',
            '480p': '480',
            '720p': '720',
            '1080p': '1080',
            'best': 'best',
        }
        
        height = quality_map.get(quality, '1080')
        
        if height == 'best':
            return f'bestvideo[ext={format}]+bestaudio[ext=m4a]/best[ext={format}]/best'
        
        return f'bestvideo[height<={height}][ext={format}]+bestaudio[ext=m4a]/best[height<={height}][ext={format}]/best[ext={format}]/best'

    def get_download_options(self, url: str, format: str = 'mp4', quality: str = '1080p',
                             subtitle_lang: Optional[str] = None) -> Dict[str, Any]:
        """
        Build yt-dlp options for downloading.
        
        Returns:
            Dict with yt-dlp options and output template.
        """
        output_template = str(self.download_dir / '%(title)s [%(id)s].%(ext)s')
        
        ydl_opts = {
            'outtmpl': output_template,
            'format': self.build_format_string(format, quality),
            'merge_output_format': format,
            'quiet': False,
            'no_warnings': False,
            'socket_timeout': 30,
            'retries': 3,
            'fragment_retries': 3,
        }
        
        if subtitle_lang:
            ydl_opts['writesubtitles'] = True
            ydl_opts['writeautomaticsub'] = True
            ydl_opts['subtitleslangs'] = [subtitle_lang]
            ydl_opts['subtitlesformat'] = 'srt'
        
        return ydl_opts
