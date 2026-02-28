"""
CA Client Management System — FastAPI Backend
Run with: uvicorn main:app --reload --port 8000
API docs at: http://localhost:8000/docs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, clients, gst, directors, shareholders, partners, bank_accounts, epf_esi, other_registrations

app = FastAPI(
    title="CA Client Management API",
    description="Backend for managing CA firm client database",
    version="1.0.0",
)

# Allow the React frontend (running on port 5173) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(gst.router)
app.include_router(directors.router)
app.include_router(shareholders.router)
app.include_router(partners.router)
app.include_router(bank_accounts.router)
app.include_router(epf_esi.router)
app.include_router(other_registrations.router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "CA Client Management API is running"}
