"""File management utilities."""

import os
import time
from pathlib import Path
from typing import Optional
from app.config import DOWNLOAD_DIR


class FileManager:
    """Utilities for managing downloaded files."""

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Remove invalid characters from filename."""
        import re
        invalid_chars = r'[<>:"/\\|?*\x00-\x1f]'
        sanitized = re.sub(invalid_chars, '_', filename)
        sanitized = sanitized.strip()
        sanitized = sanitized[:200]
        return sanitized

    @staticmethod
    def generate_output_template() -> str:
        """Generate yt-dlp output template for file naming."""
        return str(DOWNLOAD_DIR / "%(title)s [%(id)s].%(ext)s")

    @staticmethod
    def get_file_size(file_path: str) -> Optional[int]:
        """Get file size in bytes."""
        try:
            path = Path(file_path)
            if path.exists():
                return path.stat().st_size
            return None
        except (OSError, ValueError):
            return None

    @staticmethod
    def cleanup_old_files(hours: int = 24) -> int:
        """Delete files older than specified hours."""
        cleaned = 0
        cutoff_time = time.time() - (hours * 3600)
        
        for file_path in DOWNLOAD_DIR.glob("*"):
            if file_path.is_file():
                file_age = file_path.stat().st_mtime
                if file_age < cutoff_time:
                    try:
                        file_path.unlink()
                        cleaned += 1
                    except OSError:
                        pass
        
        return cleaned

    @staticmethod
    def check_disk_space() -> dict:
        """Check available disk space."""
        try:
            usage = os.statvfs(DOWNLOAD_DIR)
            free_space = usage.f_frsize * usage.f_bavail
            total_space = usage.f_frsize * usage.f_blocks
            
            return {
                "free_bytes": free_space,
                "total_bytes": total_space,
                "free_gb": free_space / (1024 ** 3),
                "total_gb": total_space / (1024 ** 3),
                "sufficient": free_space > (100 * 1024 * 1024)  # 100MB minimum
            }
        except OSError:
            return {"free_bytes": 0, "total_bytes": 0, "free_gb": 0, "total_gb": 0, "sufficient": False}
