from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from uuid import UUID
from app.db.session import get_db
from app.schemas.resource import ResourceResponse, ResourcePageResponse, ResourceChunkResponse, ProcessingStatusResponse
from app.schemas.common import PaginatedResponse
from app.services import resource_service, course_service, resource_processing_service
from app.api.dependencies import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/courses/{course_id}/resources", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
async def upload_resource(
    course_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = course_service.get_course(db, course_id, current_user.id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    return await resource_service.process_resource_upload(db, course_id, current_user.id, file)

@router.get("/courses/{course_id}/resources", response_model=PaginatedResponse[ResourceResponse])
def get_course_resources(
    course_id: UUID,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = course_service.get_course(db, course_id, current_user.id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    resources = resource_service.get_resources_by_course(db, course_id, current_user.id, skip=offset, limit=limit)
    total = resource_service.get_resources_count_by_course(db, course_id, current_user.id)
    
    return {
        "items": resources,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.get("/resources/{resource_id}", response_model=ResourceResponse)
def get_resource(
    resource_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resource = resource_service.get_resource(db, resource_id, current_user.id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return resource

@router.get("/resources/{resource_id}/pages", response_model=PaginatedResponse[ResourcePageResponse])
def get_resource_pages(
    resource_id: UUID,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pages = resource_service.get_resource_pages(db, resource_id, current_user.id, skip=offset, limit=limit)
    if pages is None:
        raise HTTPException(status_code=404, detail="Resource not found")
        
    total = resource_service.get_resource_pages_count(db, resource_id, current_user.id)
    return {
        "items": pages,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.delete("/resources/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(
    resource_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resource = resource_service.get_resource(db, resource_id, current_user.id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
        
    resource_service.delete_resource(db, resource)

@router.post("/resources/{resource_id}/process", response_model=ResourceResponse)
def process_resource(
    resource_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return resource_processing_service.process_resource_text(db, resource_id, current_user.id)

@router.get("/resources/{resource_id}/chunks", response_model=PaginatedResponse[ResourceChunkResponse])
def get_resource_chunks(
    resource_id: UUID,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chunks = resource_processing_service.get_resource_chunks(db, resource_id, current_user.id, skip=offset, limit=limit)
    if chunks is None:
        raise HTTPException(status_code=404, detail="Resource not found")
        
    total = resource_processing_service.get_resource_chunks_count(db, resource_id, current_user.id)
    return {
        "items": chunks,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.get("/resources/{resource_id}/processing-status", response_model=ProcessingStatusResponse)
def get_processing_status(
    resource_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resource = resource_service.get_resource(db, resource_id, current_user.id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
        
    chunk_count = resource_processing_service.get_resource_chunks_count(db, resource_id, current_user.id)
    
    return {
        "resource_id": resource.id,
        "status": resource.processing_status,
        "error_details": resource.error_details,
        "chunk_count": chunk_count
    }
