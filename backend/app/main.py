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

from fastapi.responses import RedirectResponse

@app.get("/docs", include_in_schema=False)
def redirect_docs():
    return RedirectResponse(url=f"{settings.API_V1_PREFIX}/docs")

@app.get("/redoc", include_in_schema=False)
def redirect_redoc():
    return RedirectResponse(url=f"{settings.API_V1_PREFIX}/redoc")
