from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging
from app.core.exceptions import AppException, app_exception_handler, global_exception_handler
from app.api.v1.router import api_router

setup_logging(settings.LOG_LEVEL)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc"
)

# CORS
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.CORS_ORIGINS] if isinstance(settings.CORS_ORIGINS, list) else settings.CORS_ORIGINS.split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)

@app.on_event("startup")
def init_db():
    try:
        from app.db.session import SessionLocal
        from app.services import auth_service
        from app.schemas.auth import UserCreate
        db = SessionLocal()
        try:
            demo_email = "demo@cognify.ai"
            if not auth_service.get_user_by_email(db, email=demo_email):
                auth_service.create_user(
                    db,
                    UserCreate(
                        email=demo_email,
                        password="CognifySecure2026!",
                        full_name="Demo Learner"
                    )
                )
        finally:
            db.close()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Startup demo user check skipped: {e}")

from fastapi.responses import RedirectResponse

@app.get("/", tags=["root"])
def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "version": settings.APP_VERSION,
        "status": "online",
        "docs_url": f"{settings.API_V1_PREFIX}/docs",
        "health_check": f"{settings.API_V1_PREFIX}/health"
    }

@app.get("/docs", include_in_schema=False)
def redirect_docs():
    return RedirectResponse(url=f"{settings.API_V1_PREFIX}/docs")

@app.get("/redoc", include_in_schema=False)
def redirect_redoc():
    return RedirectResponse(url=f"{settings.API_V1_PREFIX}/redoc")
