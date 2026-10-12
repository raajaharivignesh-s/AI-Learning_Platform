from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional, List
from pydantic import BaseModel, Field
from app.db.session import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.services import course_service
from app.services.rag_service import rag_service

router = APIRouter()

class ChatRequest(BaseModel):
    question: str = Field(..., max_length=2000, description="The student's question")
    source_only: bool = Field(True, description="If True, strictly answer from course materials.")

class Citation(BaseModel):
    chunk_id: UUID
    resource_id: UUID
    start_page: Optional[int] = None
    end_page: Optional[int] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    score: float
    
class ChatResponse(BaseModel):
    answer: Optional[str]
    citations: List[Citation]
    insufficient_evidence: bool

@router.post("/courses/{course_id}/chat", response_model=ChatResponse)
def chat_with_course(
    course_id: UUID,
    request: ChatRequest,
    limit: int = Query(5, ge=1, le=10),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = course_service.get_course(db, course_id, current_user.id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    try:
        result = rag_service.get_answer(
            db=db,
            course_id=course_id,
            owner_id=current_user.id,
            question=request.question,
            limit=limit,
            source_only=request.source_only
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="An error occurred during generation.")
