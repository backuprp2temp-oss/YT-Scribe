"""URL validation and sanitization utilities."""

import re
from urllib.parse import urlparse, parse_qs


def validate_youtube_url(url: str) -> bool:
    """Validate if a URL is a valid YouTube URL."""
    if not url:
        return False
    
    youtube_regex = (
        r'(https?://)?(www\.)?'
        r'(youtube\.com|youtu\.be|'
        r'youtube-nocookie\.com)/'
        r'(watch\?v=|embed/|v/|.+\?v=)?'
        r'([A-Za-z0-9_-]{11})'
    )
    
    return bool(re.match(youtube_regex, url))


def extract_video_id(url: str) -> str:
    """Extract video ID from YouTube URL."""
    if 'youtu.be/' in url:
        return url.split('youtu.be/')[-1].split('?')[0]
    
    parsed_url = urlparse(url)
    if parsed_url.query:
        query_params = parse_qs(parsed_url.query)
        if 'v' in query_params:
            return query_params['v'][0]
    
    if '/embed/' in url:
        return url.split('/embed/')[-1].split('?')[0]
    
    if '/v/' in url:
        return url.split('/v/')[-1].split('?')[0]
    
    return ''


def sanitize_filename(filename: str) -> str:
    """Remove invalid characters from filename."""
    invalid_chars = r'[<>:"/\\|?*\x00-\x1f]'
    sanitized = re.sub(invalid_chars, '_', filename)
    sanitized = sanitized.strip()
    sanitized = sanitized[:200]
    return sanitized
