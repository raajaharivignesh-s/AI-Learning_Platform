from uuid import UUID
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.knowledge import KnowledgeMapStatus

class ConceptSourceSchema(BaseModel):
    id: UUID
    concept_id: UUID
    resource_id: UUID
    chunk_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True

class ConceptBase(BaseModel):
    title: str
    definition: str

class ConceptSchema(ConceptBase):
    id: UUID
    course_id: UUID
    topic_id: UUID
    sources: List[ConceptSourceSchema] = []
    created_at: datetime
    
    class Config:
        from_attributes = True

class PrerequisiteRelationshipSchema(BaseModel):
    id: UUID
    course_id: UUID
    source_concept_id: UUID
    target_concept_id: UUID
    is_inferred: bool
    confidence: float
    evidence: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TopicBase(BaseModel):
    title: str
    description: Optional[str] = None
    parent_id: Optional[UUID] = None

class TopicSchema(TopicBase):
    id: UUID
    course_id: UUID
    concepts: List[ConceptSchema] = []
    subtopics: List["TopicSchema"] = []
    created_at: datetime

    class Config:
        from_attributes = True

TopicSchema.model_rebuild()

class CourseKnowledgeMapSchema(BaseModel):
    id: UUID
    course_id: UUID
    status: KnowledgeMapStatus
    error_details: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- LLM Output Schemas ---
# Used for structured generation with Pydantic and JSON output

class LLMConceptSource(BaseModel):
    chunk_id: UUID = Field(..., description="The ID of the chunk this concept is extracted from")
    
class LLMConcept(BaseModel):
    title: str = Field(..., description="The title or name of the concept")
    definition: str = Field(..., description="A clear definition or explanation of the concept")
    sources: List[LLMConceptSource] = Field(..., description="Chunks that provide evidence for this concept")
    
class LLMTopic(BaseModel):
    title: str = Field(..., description="The title of the major topic")
    description: str = Field(..., description="A short description of the topic")
    concepts: List[LLMConcept] = Field(..., description="Concepts related to this topic")

class LLMExtractionResponse(BaseModel):
    topics: List[LLMTopic] = Field(..., description="Topics and concepts extracted from the provided text chunks")

class LLMPrerequisite(BaseModel):
    source_concept_title: str = Field(..., description="The concept that must be understood first")
    target_concept_title: str = Field(..., description="The concept that builds upon or requires the source concept")
    is_inferred: bool = Field(..., description="True if inferred by the model, False if explicitly stated in text")
    confidence: float = Field(..., description="Confidence score from 0.0 to 1.0")
    evidence: str = Field(..., description="Explanation of why this prerequisite exists based on the provided text")

class LLMRelationshipResponse(BaseModel):
    prerequisites: List[LLMPrerequisite] = Field(..., description="Prerequisite relationships between the provided concepts")
