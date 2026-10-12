import os
import uuid
import shutil
from typing import Optional
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from app.core.config import settings
from app.models.resource import Resource, ProcessingStatus
from app.models.resource_page import ResourcePage
from app.models.resource_image import ResourceImage, ImageProcessingStatus
from app.services.pdf_extraction_service import extract_text_from_pdf, extract_images_from_pdf
from app.services.pptx_extraction_service import extract_from_pptx
from app.services.llm_provider import get_llm_provider

def get_resources_by_course(db: Session, course_id: UUID, owner_id: UUID, skip: int = 0, limit: int = 100):
    return db.query(Resource).filter(
        Resource.course_id == course_id, 
        Resource.owner_id == owner_id
    ).offset(skip).limit(limit).all()

def get_resources_count_by_course(db: Session, course_id: UUID, owner_id: UUID) -> int:
    return db.query(Resource).filter(
        Resource.course_id == course_id, 
        Resource.owner_id == owner_id
    ).count()

def get_resource(db: Session, resource_id: UUID, owner_id: UUID) -> Optional[Resource]:
    return db.query(Resource).filter(
        Resource.id == resource_id,
        Resource.owner_id == owner_id
    ).first()

def get_resource_pages(db: Session, resource_id: UUID, owner_id: UUID, skip: int = 0, limit: int = 100):
    resource = get_resource(db, resource_id, owner_id)
    if not resource:
        return None
    return db.query(ResourcePage).filter(
        ResourcePage.resource_id == resource_id
    ).order_by(ResourcePage.page_number).offset(skip).limit(limit).all()

def get_resource_pages_count(db: Session, resource_id: UUID, owner_id: UUID) -> int:
    resource = get_resource(db, resource_id, owner_id)
    if not resource:
        return 0
    return db.query(ResourcePage).filter(ResourcePage.resource_id == resource_id).count()

from app.services.qdrant_service import qdrant_service

def delete_resource(db: Session, db_resource: Resource) -> None:
    file_path = os.path.join(settings.STORAGE_ROOT, db_resource.stored_filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass
            
    images = db.query(ResourceImage).filter(ResourceImage.resource_id == db_resource.id).all()
    for img in images:
        img_path = os.path.join(settings.STORAGE_ROOT, img.image_filename)
        if os.path.exists(img_path):
            try:
                os.remove(img_path)
            except OSError:
                pass
    file_path = os.path.join(settings.STORAGE_ROOT, db_resource.stored_filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass
            
    frames_dir = os.path.join(settings.STORAGE_ROOT, f"{db_resource.id}_frames")
    if os.path.exists(frames_dir):
        try:
            shutil.rmtree(frames_dir)
        except OSError:
            pass
            
    # Try to delete vectors from Qdrant, but continue with DB deletion even if it fails
    qdrant_service.delete_resource_chunks(str(db_resource.id))
    
    db.delete(db_resource)
    db.commit()

async def process_resource_upload(db: Session, course_id: UUID, owner_id: UUID, file: UploadFile) -> Resource:
    supported_types = {
        "application/pdf": ".pdf",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "video/mp4": ".mp4",
        "video/webm": ".webm"
    }
    
    if file.content_type not in supported_types:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")
    
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    max_size = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file_size > max_size:
        raise HTTPException(status_code=400, detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB.")
    
    if file_size == 0:
        raise HTTPException(status_code=400, detail="File is empty.")
    
    header = file.file.read(5)
    if file.content_type == "application/pdf" and header != b"%PDF-":
        raise HTTPException(status_code=400, detail="Invalid PDF file signature.")
    if file.content_type == "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        if not header.startswith(b"PK"):
            raise HTTPException(status_code=400, detail="Invalid PPTX file signature.")
    if file.content_type == "video/mp4":
        if header[4:8] != b"ftyp":
            pass # Relaxed check for mp4 files
    file.file.seek(0)

    ext = supported_types[file.content_type]
    stored_filename = f"{uuid.uuid4()}{ext}"
    
    os.makedirs(settings.STORAGE_ROOT, exist_ok=True)
    file_path = os.path.join(settings.STORAGE_ROOT, stored_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to save file.")

    db_resource = Resource(
        course_id=course_id,
        owner_id=owner_id,
        original_filename=file.filename,
        stored_filename=stored_filename,
        mime_type=file.content_type,
        file_size=file_size,
        processing_status=ProcessingStatus.processing
    )
    db.add(db_resource)
    
    try:
        db.commit()
        db.refresh(db_resource)
    except Exception as e:
        db.rollback()
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail="Failed to save resource record.")
    
    try:
        provider = get_llm_provider()
        has_text = False
        
        if file.content_type == "application/pdf":
            pages_data = extract_text_from_pdf(file_path)
            has_text = any(len(p['text']) > 0 for p in pages_data)
            for p in pages_data:
                db.add(ResourcePage(resource_id=db_resource.id, page_number=p["page_number"], extracted_text=p["text"]))
                
            images_data = extract_images_from_pdf(file_path)
            for img in images_data:
                img_path = os.path.join(settings.STORAGE_ROOT, img["image_filename"])
                description, status, error_details = "", ImageProcessingStatus.failed, None
                try:
                    description = provider.generate_image_description(img_path)
                    status = ImageProcessingStatus.completed if description else ImageProcessingStatus.failed
                    has_text = True
                except Exception as e:
                    error_details = str(e)
                db.add(ResourceImage(
                    resource_id=db_resource.id, page_number=img["page_number"],
                    image_filename=img["image_filename"], description=description,
                    processing_status=status, error_details=error_details
                ))
                
        elif file.content_type == "application/vnd.openxmlformats-officedocument.presentationml.presentation":
            extracted = extract_from_pptx(file_path)
            pages_data = extracted["pages"]
            has_text = any(len(p['text']) > 0 for p in pages_data)
            for p in pages_data:
                db.add(ResourcePage(resource_id=db_resource.id, page_number=p["page_number"], extracted_text=p["text"]))
                
            for img in extracted["images"]:
                img_path = os.path.join(settings.STORAGE_ROOT, img["image_filename"])
                description, status, error_details = "", ImageProcessingStatus.failed, None
                try:
                    description = provider.generate_image_description(img_path)
                    status = ImageProcessingStatus.completed if description else ImageProcessingStatus.failed
                    has_text = True
                except Exception as e:
                    error_details = str(e)
                db.add(ResourceImage(
                    resource_id=db_resource.id, page_number=img["page_number"],
                    image_filename=img["image_filename"], description=description,
                    processing_status=status, error_details=error_details
                ))
                
        elif file.content_type in ["video/mp4", "video/webm"]:
            from app.services.video_extraction_service import process_video_resource
            process_video_resource(db, db_resource)
                
        else: # Images
            description, status, error_details = "", ImageProcessingStatus.failed, None
            try:
                description = provider.generate_image_description(file_path)
                status = ImageProcessingStatus.completed if description else ImageProcessingStatus.failed
                has_text = True
            except Exception as e:
                error_details = str(e)
            db.add(ResourceImage(
                resource_id=db_resource.id, page_number=1,
                image_filename=stored_filename, description=description,
                processing_status=status, error_details=error_details
            ))
            
        if file.content_type not in ["video/mp4", "video/webm"]:
            db_resource.processing_status = ProcessingStatus.completed
            if not has_text:
                db_resource.error_details = "No extractable text or visual description found."
            db.commit()
            db.refresh(db_resource)

    except Exception as e:
        db.rollback()
        db_resource.processing_status = ProcessingStatus.failed
        db_resource.error_details = str(e)
        db.add(db_resource)
        db.commit()
        db.refresh(db_resource)
        
    return db_resource

