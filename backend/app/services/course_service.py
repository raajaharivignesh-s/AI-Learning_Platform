from sqlalchemy.orm import Session
from uuid import UUID
from app.models.course import Course
from app.schemas.course import CourseCreate, CourseUpdate

def create_course(db: Session, course_in: CourseCreate, owner_id: UUID) -> Course:
    db_course = Course(
        owner_id=owner_id,
        title=course_in.title,
        description=course_in.description,
        subject=course_in.subject
    )
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course

def get_courses(db: Session, owner_id: UUID, skip: int = 0, limit: int = 100):
    return db.query(Course).filter(Course.owner_id == owner_id).offset(skip).limit(limit).all()

def get_courses_count(db: Session, owner_id: UUID) -> int:
    return db.query(Course).filter(Course.owner_id == owner_id).count()

def get_course(db: Session, course_id: UUID, owner_id: UUID) -> Course | None:
    return db.query(Course).filter(Course.id == course_id, Course.owner_id == owner_id).first()

def update_course(db: Session, db_course: Course, course_in: CourseUpdate) -> Course:
    update_data = course_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_course, field, value)
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course

def delete_course(db: Session, db_course: Course) -> None:
    db.delete(db_course)
    db.commit()
