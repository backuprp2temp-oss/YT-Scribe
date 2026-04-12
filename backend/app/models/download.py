"""Download history model."""

from sqlalchemy import Column, Integer, String, BigInteger, DateTime, Index
from sqlalchemy.sql import func
from app.database import Base


class DownloadHistory(Base):
    __tablename__ = "downloads"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    video_id = Column(String(50), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    url = Column(String(500), nullable=False)
    format = Column(String(20), nullable=False)
    quality = Column(String(20), nullable=True)
    file_path = Column(String(1000), nullable=True)
    file_size = Column(BigInteger, nullable=True)
    status = Column(String(20), nullable=False, default="pending", index=True)
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)
    completed_at = Column(DateTime, nullable=True)

    # Composite indexes for common queries
    __table_args__ = (
        Index("idx_status_created", "status", "created_at"),
        Index("idx_video_id_status", "video_id", "status"),
    )

    def __repr__(self):
        return f"<DownloadHistory(id={self.id}, title='{self.title}', status='{self.status}')>"
