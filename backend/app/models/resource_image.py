from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Text, Enum as SQLAlchemyEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum
from app.db.base import Base

class ImageProcessingStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"
    skipped = "skipped"

class ResourceImage(Base):
    __tablename__ = "resource_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    page_number = Column(Integer, nullable=True) # PDF page or Slide number
    image_filename = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    processing_status = Column(SQLAlchemyEnum(ImageProcessingStatus), default=ImageProcessingStatus.pending)
    error_details = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
