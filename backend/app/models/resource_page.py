import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base

class ResourcePage(Base):
    __tablename__ = "resource_pages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False, index=True)
    page_number = Column(Integer, nullable=False)
    extracted_text = Column(String, nullable=False)

    __table_args__ = (
        UniqueConstraint('resource_id', 'page_number', name='uix_resource_page'),
    )

    resource = relationship("Resource", back_populates="pages")
