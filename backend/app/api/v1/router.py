from fastapi import APIRouter
from app.api.v1.endpoints import health, auth, courses, resources, search, chat, knowledge

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(courses.router, prefix="/courses", tags=["courses"])
api_router.include_router(resources.router, tags=["resources"])
api_router.include_router(search.router, tags=["search"])
api_router.include_router(chat.router, tags=["chat"])
api_router.include_router(knowledge.router, prefix="/courses", tags=["knowledge"])
