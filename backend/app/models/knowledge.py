import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, ForeignKey, DateTime, Float, Boolean, UniqueConstraint, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum
from app.db.base import Base

class KnowledgeMapStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"

class CourseKnowledgeMap(Base):
    __tablename__ = "course_knowledge_maps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, unique=True)
    status = Column(SQLEnum(KnowledgeMapStatus), default=KnowledgeMapStatus.pending, nullable=False)
    error_details = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    course = relationship("Course", backref="knowledge_map")


class Topic(Base):
    __tablename__ = "topics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("topics.id", ondelete="CASCADE"), nullable=True)
    
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint('course_id', 'title', name='uix_topic_course_title'),
    )

    course = relationship("Course", backref="topics")
    parent = relationship("Topic", remote_side=[id], backref="subtopics")


class Concept(Base):
    __tablename__ = "concepts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = Column(UUID(as_uuid=True), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    
    title = Column(String, nullable=False)
    definition = Column(String, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint('course_id', 'title', name='uix_concept_course_title'),
    )

    course = relationship("Course", backref="concepts")
    topic = relationship("Topic", backref="concepts")


class ConceptSource(Base):
    __tablename__ = "concept_sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    concept_id = Column(UUID(as_uuid=True), ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False, index=True)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    chunk_id = Column(UUID(as_uuid=True), ForeignKey("resource_chunks.id", ondelete="CASCADE"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    concept = relationship("Concept", backref="sources")
    resource = relationship("Resource")
    chunk = relationship("ResourceChunk")


class PrerequisiteRelationship(Base):
    __tablename__ = "prerequisite_relationships"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    source_concept_id = Column(UUID(as_uuid=True), ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False)
    target_concept_id = Column(UUID(as_uuid=True), ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False)
    
    is_inferred = Column(Boolean, nullable=False, default=False)
    confidence = Column(Float, nullable=False, default=1.0)
    evidence = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint('source_concept_id', 'target_concept_id', name='uix_prerequisite_source_target'),
    )

    course = relationship("Course")
    source_concept = relationship("Concept", foreign_keys=[source_concept_id], backref="prerequisites_for")
    target_concept = relationship("Concept", foreign_keys=[target_concept_id], backref="prerequisites")
