from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID
from app.db.session import get_db
from app.schemas.course import CourseCreate, CourseUpdate, CourseResponse
from app.schemas.common import PaginatedResponse
from app.services import course_service
from app.api.dependencies import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    course_in: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = course_service.create_course(db, course_in, current_user.id)
    return course

@router.get("", response_model=PaginatedResponse[CourseResponse])
def get_courses(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    courses = course_service.get_courses(db, current_user.id, skip=offset, limit=limit)
    total = course_service.get_courses_count(db, current_user.id)
    return {
        "items": courses,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.get("/{course_id}", response_model=CourseResponse)
def get_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = course_service.get_course(db, course_id, current_user.id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

@router.patch("/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: UUID,
    course_in: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = course_service.get_course(db, course_id, current_user.id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if not course_in.model_dump(exclude_unset=True):
        raise HTTPException(status_code=422, detail="No fields to update")

    updated_course = course_service.update_course(db, course, course_in)
    return updated_course

@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = course_service.get_course(db, course_id, current_user.id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course_service.delete_course(db, course)
