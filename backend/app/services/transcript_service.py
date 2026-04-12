"""Transcript/subtitle handling service."""

import os
import logging
import tempfile
from typing import Dict, List, Any, Optional
from pathlib import Path
import yt_dlp

from app.utils.validators import validate_youtube_url

logger = logging.getLogger(__name__)


# Language code to name mapping
LANGUAGE_NAMES = {
    'af': 'Afrikaans',
    'ar': 'Arabic',
    'az': 'Azerbaijani',
    'be': 'Belarusian',
    'bg': 'Bulgarian',
    'bn': 'Bengali',
    'bs': 'Bosnian',
    'ca': 'Catalan',
    'cs': 'Czech',
    'da': 'Danish',
    'de': 'German',
    'el': 'Greek',
    'en': 'English',
    'en-GB': 'English (UK)',
    'en-US': 'English (US)',
    'es': 'Spanish',
    'es-419': 'Spanish (Latin America)',
    'es-ES': 'Spanish (Spain)',
    'et': 'Estonian',
    'eu': 'Basque',
    'fa': 'Persian',
    'fi': 'Finnish',
    'fil': 'Filipino',
    'fr': 'French',
    'fr-CA': 'French (Canada)',
    'gl': 'Galician',
    'gu': 'Gujarati',
    'he': 'Hebrew',
    'hi': 'Hindi',
    'hr': 'Croatian',
    'hu': 'Hungarian',
    'hy': 'Armenian',
    'id': 'Indonesian',
    'is': 'Icelandic',
    'it': 'Italian',
    'ja': 'Japanese',
    'ka': 'Georgian',
    'kk': 'Kazakh',
    'km': 'Khmer',
    'kn': 'Kannada',
    'ko': 'Korean',
    'ky': 'Kyrgyz',
    'lo': 'Lao',
    'lt': 'Lithuanian',
    'lv': 'Latvian',
    'mk': 'Macedonian',
    'ml': 'Malayalam',
    'mn': 'Mongolian',
    'mr': 'Marathi',
    'ms': 'Malay',
    'my': 'Burmese',
    'ne': 'Nepali',
    'nl': 'Dutch',
    'no': 'Norwegian',
    'pa': 'Punjabi',
    'pl': 'Polish',
    'pt': 'Portuguese',
    'pt-BR': 'Portuguese (Brazil)',
    'pt-PT': 'Portuguese (Portugal)',
    'ro': 'Romanian',
    'ru': 'Russian',
    'si': 'Sinhala',
    'sk': 'Slovak',
    'sl': 'Slovenian',
    'sq': 'Albanian',
    'sr': 'Serbian',
    'sv': 'Swedish',
    'sw': 'Swahili',
    'ta': 'Tamil',
    'te': 'Telugu',
    'th': 'Thai',
    'tr': 'Turkish',
    'uk': 'Ukrainian',
    'ur': 'Urdu',
    'uz': 'Uzbek',
    'vi': 'Vietnamese',
    'zh': 'Chinese',
    'zh-CN': 'Chinese (Simplified)',
    'zh-HK': 'Chinese (Hong Kong)',
    'zh-TW': 'Chinese (Traditional)',
}


class TranscriptService:
    """Service for handling transcript/subtitle operations."""

    def get_available_subtitles(self, url: str) -> Dict[str, Any]:
        """
        Get available subtitle languages for a video.
        
        Returns:
            Dict with video_id and list of available subtitle languages.
        """
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                subtitles = info.get('subtitles', {})
                auto_captions = info.get('automatic_captions', {})
                
                languages = []
                seen_codes = set()
                
                # Process manual subtitles first
                for lang_code in subtitles:
                    if lang_code in seen_codes:
                        continue
                    seen_codes.add(lang_code)
                    
                    subs = subtitles[lang_code]
                    formats = [s.get('ext', 'vtt') for s in subs if s.get('ext')]
                    
                    languages.append({
                        'code': lang_code,
                        'name': LANGUAGE_NAMES.get(lang_code, lang_code),
                        'auto_generated': False,
                        'formats': list(set(formats)) if formats else ['vtt'],
                    })
                
                # Add auto-generated captions
                for lang_code in auto_captions:
                    if lang_code in seen_codes:
                        continue
                    seen_codes.add(lang_code)
                    
                    subs = auto_captions[lang_code]
                    formats = [s.get('ext', 'vtt') for s in subs if s.get('ext')]
                    
                    languages.append({
                        'code': lang_code,
                        'name': LANGUAGE_NAMES.get(lang_code, lang_code),
                        'auto_generated': True,
                        'formats': list(set(formats)) if formats else ['vtt'],
                    })
                
                # Sort: manual first, then alphabetical
                languages.sort(key=lambda x: (x['auto_generated'], x['name']))
                
                return {
                    'video_id': info.get('id', ''),
                    'languages': languages,
                }
                
        except Exception as e:
            logger.error(f"Error fetching subtitles: {e}")
            raise ValueError(f"Failed to fetch subtitle information: {str(e)}")

    def download_subtitle(
        self,
        url: str,
        language: str = 'en',
        format: str = 'srt',
    ) -> Dict[str, Any]:
        """
        Download subtitle file for a video.
        
        Returns:
            Dict with file content and metadata.
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            output_template = str(Path(temp_dir) / '%(title)s [%(id)s].%(ext)s')
            
            ydl_opts = {
                'skip_download': True,
                'writesubtitles': True,
                'writeautomaticsub': True,
                'subtitleslangs': [language],
                'subtitlesformat': format,
                'outtmpl': output_template,
                'quiet': True,
                'no_warnings': True,
            }

            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=False)
                    
                    # Check if subtitles are available
                    subtitles = info.get('subtitles', {})
                    auto_captions = info.get('automatic_captions', {})
                    
                    if language not in subtitles and language not in auto_captions:
                        raise ValueError(f"Subtitles not available for language: {language}")
                    
                    # Download subtitle
                    ydl.params['writesubtitles'] = True
                    ydl.params['writeautomaticsub'] = True
                    
                    # Re-extract with subtitle download
                    info = ydl.extract_info(url, download=False)
                    
                    # Get subtitle file path
                    subtitle_path = None
                    temp_path = Path(temp_dir)
                    for f in temp_path.glob('*.srt'):
                        subtitle_path = f
                        break
                    if not subtitle_path:
                        for f in temp_path.glob('*.vtt'):
                            subtitle_path = f
                            break
                    
                    if subtitle_path and subtitle_path.exists():
                        content = subtitle_path.read_text(encoding='utf-8')
                    else:
                        # Fallback: try to get from URL
                        content = self._extract_subtitle_from_url(
                            url, language, format, ydl_opts
                        )
                    
                    return {
                        'video_id': info.get('id', ''),
                        'title': info.get('title', ''),
                        'language': language,
                        'format': format,
                        'content': content,
                    }
                    
            except ValueError:
                raise
            except Exception as e:
                logger.error(f"Error downloading subtitle: {e}")
                raise ValueError(f"Failed to download subtitle: {str(e)}")

    def preview_subtitle(
        self,
        url: str,
        language: str = 'en',
        format: str = 'srt',
    ) -> Dict[str, Any]:
        """
        Preview subtitle content without saving file.
        
        Returns:
            Dict with subtitle content and metadata.
        """
        result = self.download_subtitle(url, language, format)
        return result

    def _extract_subtitle_from_url(
        self,
        url: str,
        language: str,
        format: str,
        ydl_opts: Dict,
    ) -> str:
        """Extract subtitle content from yt-dlp info."""
        import httpx
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            subtitles = info.get('subtitles', {})
            auto_captions = info.get('automatic_captions', {})
            
            all_subs = {**auto_captions, **subtitles}
            
            if language in all_subs:
                subs = all_subs[language]
                # Find subtitle with matching format
                for sub in subs:
                    if sub.get('ext') == format and sub.get('url'):
                        # Download subtitle from URL
                        response = httpx.get(sub['url'], timeout=10)
                        return response.text
            
            raise ValueError(f"Subtitle content not available for language: {language}")
