import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Text, Enum as SQLAlchemyEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import enum
from app.db.base import Base

class VideoSegmentType(str, enum.Enum):
    transcript = "transcript"
    frame = "frame"

class SegmentProcessingStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"

class ResourceVideoSegment(Base):
    __tablename__ = "resource_video_segments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    segment_type = Column(SQLAlchemyEnum(VideoSegmentType), nullable=False)
    
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    
    text_content = Column(Text, nullable=True)
    image_filename = Column(String, nullable=True)
    
    processing_status = Column(SQLAlchemyEnum(SegmentProcessingStatus), default=SegmentProcessingStatus.pending)
    error_details = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
