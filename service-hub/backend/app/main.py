import os
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.database import Base, engine, SessionLocal
from app.routers import requests as requests_router
from app.routers import auth as auth_router
from app.routers import admin as admin_router
from app.routers import catalog as catalog_router
from app.routers import complaints as complaints_router
from app.routers import notifications as notifications_router
from app.routers import jobcards as jobcards_router
from app.routers import support as support_router
from app.seed_catalog import seed_catalog_if_empty

logger = logging.getLogger("service_hub.errors")

Base.metadata.create_all(bind=engine)

with SessionLocal() as _db:
    seed_catalog_if_empty(_db)

app = FastAPI(
    title="Service.Hub API",
    description="Core service-request flow: customer request -> provider accept -> status tracking.",
    version="0.1.0",
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    Last line of defense: any bug we didn't anticipate becomes a generic
    500 to the client — never a raw Python traceback (which can leak
    file paths, table/column names, or other internals). The real error
    still goes to the server logs so it's actually debuggable.
    """
    logger.exception(f"Unhandled error on {request.method} {request.url.path}")
    return JSONResponse(status_code=500, content={"detail": "Something went wrong. Please try again."})


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    # Known, intentional errors (404, 403, our own raise HTTPException(...))
    # pass through with their real status and message — those are safe,
    # we wrote them ourselves.
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": "Invalid request data.", "errors": exc.errors()})

# ALLOWED_ORIGINS: comma-separated list of frontend URLs allowed to call this
# API, e.g. "https://service-hub.vercel.app,http://localhost:3000". Falls
# back to localhost-only if unset, so a forgotten env var fails safe (blocks
# everyone) rather than fails open (allows everyone, the old "*" default).
_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in _origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

app.include_router(auth_router.router)
app.include_router(requests_router.router)
app.include_router(admin_router.router)
app.include_router(catalog_router.router)
app.include_router(complaints_router.router)
app.include_router(notifications_router.router)
app.include_router(jobcards_router.router)
app.include_router(support_router.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
