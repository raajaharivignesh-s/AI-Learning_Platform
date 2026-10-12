from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.resource import Resource, ProcessingStatus
from app.models.resource_page import ResourcePage
from app.models.resource_chunk import ResourceChunk
from app.models.resource_image import ResourceImage, ImageProcessingStatus
from app.models.resource_video import ResourceVideoSegment, SegmentProcessingStatus
from app.services.chunking_service import chunk_text
from app.services.embedding_service import generate_embeddings, EmbeddingProvider
from app.services.qdrant_service import qdrant_service
from app.core.config import settings

def process_resource_text(db: Session, resource_id: UUID, owner_id: UUID, provider: EmbeddingProvider = None) -> Resource:
    resource = db.query(Resource).filter(
        Resource.id == resource_id,
        Resource.owner_id == owner_id
    ).first()
    
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
        
    pages = db.query(ResourcePage).filter(ResourcePage.resource_id == resource_id).order_by(ResourcePage.page_number).all()
    images = db.query(ResourceImage).filter(ResourceImage.resource_id == resource_id, ResourceImage.processing_status == ImageProcessingStatus.completed).all()
    video_segments = db.query(ResourceVideoSegment).filter(ResourceVideoSegment.resource_id == resource_id, ResourceVideoSegment.processing_status == SegmentProcessingStatus.completed).order_by(ResourceVideoSegment.start_time).all()
    
    if not pages and not images:
        if resource.processing_status != ProcessingStatus.failed:
            resource.processing_status = ProcessingStatus.failed
            resource.error_details = "No extractable text or images found in resource."
            db.commit()
        return resource
        
    try:
        db.query(ResourceChunk).filter(ResourceChunk.resource_id == resource_id).delete()
        db.commit()
        
        chunks_data = chunk_text(pages) if pages else []
        
        next_chunk_index = chunks_data[-1]["chunk_index"] + 1 if chunks_data else 0
        for img in images:
            if img.description:
                img_text = f"[Image: {img.image_filename} on Page {img.page_number}] {img.description}"
                chunks_data.append({
                    "chunk_index": next_chunk_index,
                    "text": img_text,
                    "start_page": img.page_number or 1,
                    "end_page": img.page_number or 1,
                    "start_time": None,
                    "end_time": None
                })
                next_chunk_index += 1
                
        for seg in video_segments:
            if seg.text_content:
                prefix = f"[Video Frame at {seg.start_time}s-{seg.end_time}s]" if seg.segment_type == "frame" else f"[Video Transcript at {seg.start_time}s-{seg.end_time}s]"
                seg_text = f"{prefix} {seg.text_content}"
                chunks_data.append({
                    "chunk_index": next_chunk_index,
                    "text": seg_text,
                    "start_page": None,
                    "end_page": None,
                    "start_time": seg.start_time,
                    "end_time": seg.end_time
                })
                next_chunk_index += 1
        
        if not chunks_data:
            resource.error_details = "No meaningful text could be chunked."
            db.commit()
            return resource
            
        texts_to_embed = [c["text"] for c in chunks_data]
        embeddings = generate_embeddings(texts_to_embed, provider=provider)
        
        if len(embeddings) != len(chunks_data):
            raise ValueError("Embedding count mismatch.")
            
        for i, chunk_d in enumerate(chunks_data):
            chunk = ResourceChunk(
                resource_id=resource.id,
                course_id=resource.course_id,
                owner_id=resource.owner_id,
                chunk_index=chunk_d["chunk_index"],
                text=chunk_d["text"],
                start_page=chunk_d.get("start_page"),
                end_page=chunk_d.get("end_page"),
                start_time=chunk_d.get("start_time"),
                end_time=chunk_d.get("end_time"),
                model_identifier=settings.EMBEDDING_MODEL,
                embedding_dimension=settings.EMBEDDING_DIMENSION,
                embedding=embeddings[i]
            )
            db.add(chunk)
            
        db.commit()
        
        saved_chunks = db.query(ResourceChunk).filter(ResourceChunk.resource_id == resource.id).all()
        qdrant_success = qdrant_service.upsert_chunks(saved_chunks)
        
        if qdrant_success:
            resource.processing_status = ProcessingStatus.completed
            resource.error_details = None
        else:
            resource.processing_status = ProcessingStatus.failed
            resource.error_details = "Vector indexing failed"
            
        db.commit()
        db.refresh(resource)
        
    except Exception as e:
        db.rollback()
        resource.processing_status = ProcessingStatus.failed
        resource.error_details = f"Processing failed: {str(e)}"
        db.add(resource)
        db.commit()
        db.refresh(resource)
        
    return resource

def get_resource_chunks(db: Session, resource_id: UUID, owner_id: UUID, skip: int = 0, limit: int = 100):
    resource = db.query(Resource).filter(
        Resource.id == resource_id,
        Resource.owner_id == owner_id
    ).first()
    if not resource:
        return None
        
    return db.query(ResourceChunk).filter(
        ResourceChunk.resource_id == resource_id
    ).order_by(ResourceChunk.chunk_index).offset(skip).limit(limit).all()

def get_resource_chunks_count(db: Session, resource_id: UUID, owner_id: UUID) -> int:
    resource = db.query(Resource).filter(
        Resource.id == resource_id,
        Resource.owner_id == owner_id
    ).first()
    if not resource:
        return 0
    return db.query(ResourceChunk).filter(ResourceChunk.resource_id == resource_id).count()
