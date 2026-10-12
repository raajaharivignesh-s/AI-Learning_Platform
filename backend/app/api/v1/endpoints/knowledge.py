from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.db.session import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.course import Course
from app.schemas.knowledge import CourseKnowledgeMapSchema, TopicSchema
from app.services.knowledge_service import knowledge_service

router = APIRouter()

def verify_course_ownership(db: Session, course_id: UUID, user_id: UUID):
    course = db.query(Course).filter(Course.id == course_id, Course.owner_id == user_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

@router.post("/{course_id}/knowledge-map/build", response_model=CourseKnowledgeMapSchema, status_code=status.HTTP_202_ACCEPTED)
def build_knowledge_map(
    course_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_course_ownership(db, course_id, current_user.id)
    
    # Initialize the map entry so we can return pending/processing state immediately
    # We call build_knowledge_map directly as background task might not get the correct context if db is closed.
    # To run in background, we need a new session. We'll spawn a background task with a fresh session manually or just run synchronously for simplicity if testing.
    # The spec allows sync or async. We will use background task with fresh session.
    
    k_map = knowledge_service.get_map_status(db, course_id)
    if k_map and k_map.status in ["pending", "processing"]:
        return k_map
        
    # Start it synchronous for now so it's simpler and tests are stable.
    # In a real heavy production system, this should be a Celery task or BackgroundTask with independent session.
    try:
        knowledge_service.build_knowledge_map(db, course_id, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    final_map = knowledge_service.get_map_status(db, course_id)
    return final_map


@router.get("/{course_id}/knowledge-map/status", response_model=CourseKnowledgeMapSchema)
def get_knowledge_map_status(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_course_ownership(db, course_id, current_user.id)
    k_map = knowledge_service.get_map_status(db, course_id)
    if not k_map:
        raise HTTPException(status_code=404, detail="Knowledge map not found")
    return k_map


@router.get("/{course_id}/knowledge-map", response_model=List[TopicSchema])
def get_knowledge_map(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_course_ownership(db, course_id, current_user.id)
    topics = knowledge_service.get_topics(db, course_id)
    return topics

@router.get("/{course_id}/topics/{topic_id}", response_model=TopicSchema)
def get_topic(
    course_id: UUID,
    topic_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_course_ownership(db, course_id, current_user.id)
    topic = knowledge_service.get_topic_by_id(db, course_id, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic
