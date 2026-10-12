from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional, List
from pydantic import BaseModel
from app.db.session import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.services import course_service, embedding_service
from app.services.qdrant_service import qdrant_service
from app.models.resource_chunk import ResourceChunk

router = APIRouter()

class SearchRequest(BaseModel):
    query: str

class SearchResultPayload(BaseModel):
    chunk_id: UUID
    resource_id: UUID
    course_id: UUID
    owner_id: UUID
    chunk_index: int
    start_page: int
    end_page: int
    embedding_model: str

class SearchResult(BaseModel):
    chunk_id: UUID
    resource_id: UUID
    score: float
    text: str
    metadata: SearchResultPayload
    
    model_config = {"from_attributes": True}

@router.post("/courses/{course_id}/search", response_model=List[SearchResult])
def search_course_resources(
    course_id: UUID,
    request: SearchRequest,
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = course_service.get_course(db, course_id, current_user.id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    query_embedding = embedding_service.generate_embeddings([request.query])[0]
    
    qdrant_results = qdrant_service.search_chunks(
        course_id=str(course_id),
        owner_id=str(current_user.id),
        query_embedding=query_embedding,
        limit=limit
    )
    
    if not qdrant_results:
        return []
        
    # We must resolve the actual text from PostgreSQL
    # because Qdrant only stores metadata
    
    chunk_ids = [res["chunk_id"] for res in qdrant_results]
    
    db_chunks = db.query(ResourceChunk).filter(ResourceChunk.id.in_(chunk_ids)).all()
    db_chunks_map = {str(chunk.id): chunk for chunk in db_chunks}
    
    final_results = []
    for q_res in qdrant_results:
        chunk_id = q_res["chunk_id"]
        db_chunk = db_chunks_map.get(chunk_id)
        
        if db_chunk:
            final_results.append({
                "chunk_id": UUID(chunk_id),
                "resource_id": UUID(q_res["resource_id"]),
                "score": q_res["score"],
                "text": db_chunk.text,
                "metadata": q_res["payload"]
            })
            
    return final_results
