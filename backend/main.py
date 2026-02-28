"""
CA Client Management System — FastAPI Backend
Run with: uvicorn main:app --reload --port 8000
API docs at: http://localhost:8000/docs
"""
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from routers import auth, clients, gst, directors, shareholders, partners, bank_accounts, epf_esi, other_registrations

app = FastAPI(
    title="CA Client Management API",
    description="Backend for managing CA firm client database",
    version="1.0.0",
)

# Allow requests from any origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers under /api prefix (matches frontend's baseURL: '/api')
app.include_router(auth.router, prefix="/api")
app.include_router(clients.router, prefix="/api")
app.include_router(gst.router, prefix="/api")
app.include_router(directors.router, prefix="/api")
app.include_router(shareholders.router, prefix="/api")
app.include_router(partners.router, prefix="/api")
app.include_router(bank_accounts.router, prefix="/api")
app.include_router(epf_esi.router, prefix="/api")
app.include_router(other_registrations.router, prefix="/api")


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "message": "CA Client Management API is running"}


# Serve React frontend static files
# Check ./dist first (Railway/production), then ../frontend/dist (local dev)
_base = os.path.dirname(__file__)
DIST_DIR = (
    os.path.join(_base, "dist")
    if os.path.isdir(os.path.join(_base, "dist"))
    else os.path.join(_base, "..", "frontend", "dist")
)

if os.path.isdir(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        return FileResponse(os.path.join(DIST_DIR, "index.html"))
