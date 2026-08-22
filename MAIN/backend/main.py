import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from database import create_db_and_tables
from routers import (
    auth_routes,
    profile_routes,
    employee_routes,
    attendance_routes,
    leave_routes,
    dashboard_routes,
    payroll_routes,
    calendar_routes,
)

app = FastAPI(
    title="HRMS — Human Resource Management System",
    description="Dayflow HRMS — Every workday, perfectly aligned.",
    version="2.0.0",
)

# ---------------------------------------------------------------------------
# CORS — works for local dev AND production deploys (Render, Railway, Vercel)
# ---------------------------------------------------------------------------
# Set CORS_ORIGINS env to a comma-separated list of allowed origins in production.
# If unset, allow all origins (fine for hackathon demos).
cors_env = os.getenv("CORS_ORIGINS", "").strip()
if cors_env and cors_env != "*":
    allow_origins = [o.strip() for o in cors_env.split(",") if o.strip()]
    allow_origin_regex = None
else:
    # Hackathon / open demo mode
    allow_origins = ["*"]
    allow_origin_regex = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True if allow_origins != ["*"] else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    # Auto-seed demo accounts if database is empty (first deploy)
    try:
        from seed import seed_if_empty
        seed_if_empty()
    except Exception as e:
        print(f"[startup] Seed skipped or failed: {e}")

# Register API routers
app.include_router(auth_routes.router, prefix="/api")
app.include_router(profile_routes.router, prefix="/api")
app.include_router(employee_routes.router, prefix="/api")
app.include_router(attendance_routes.router, prefix="/api")
app.include_router(leave_routes.router, prefix="/api")
app.include_router(dashboard_routes.router, prefix="/api")
app.include_router(payroll_routes.router, prefix="/api")
app.include_router(calendar_routes.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "database": "connected", "app": "HRMS"}

# ---------------------------------------------------------------------------
# Serve React frontend (production build in frontend/dist)
# ---------------------------------------------------------------------------
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists() and (FRONTEND_DIST / "index.html").exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/")
    def serve_spa_root():
        return FileResponse(FRONTEND_DIST / "index.html")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        # Never intercept API / docs / OpenAPI
        if full_path.startswith(("api", "docs", "openapi", "redoc")):
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        candidate = FRONTEND_DIST / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        # SPA fallback for client-side routes
        return FileResponse(FRONTEND_DIST / "index.html")
else:
    @app.get("/")
    def api_only_root():
        return {
            "status": "online",
            "app": "HRMS",
            "tagline": "Every workday, perfectly aligned.",
            "version": "2.0.0",
            "docs": "/docs",
            "note": "Frontend build not found. API-only mode.",
        }
