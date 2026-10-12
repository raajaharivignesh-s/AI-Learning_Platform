from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models.resource import ProcessingStatus

class ResourceBase(BaseModel):
    original_filename: str
    mime_type: str
    file_size: int

class ResourceResponse(ResourceBase):
    id: UUID
    course_id: UUID
    owner_id: UUID
    processing_status: ProcessingStatus
    error_details: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class ResourcePageResponse(BaseModel):
    id: UUID
    resource_id: UUID
    page_number: int
    extracted_text: str

    model_config = {"from_attributes": True}

class ResourceChunkResponse(BaseModel):
    id: UUID
    resource_id: UUID
    chunk_index: int
    text: str
    start_page: Optional[int] = None
    end_page: Optional[int] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    model_identifier: str
    embedding_dimension: int

    model_config = {"from_attributes": True}

class ProcessingStatusResponse(BaseModel):
    resource_id: UUID
    status: ProcessingStatus
    error_details: Optional[str] = None
    chunk_count: int
