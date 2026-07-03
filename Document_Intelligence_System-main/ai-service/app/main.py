import os
import sys

# Workaround for Intel OpenMP double initialization conflict on Windows
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

# Import torch first to ensure its DLLs are loaded before Paddle/OpenCV
try:
    import torch
except ImportError:
    pass

# Add parent directory of 'app' to Python search path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import process, query, analyze

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Python FastAPI backend powering OCR, Classification, Summarization, and RAG",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(process.router)
app.include_router(query.router)
app.include_router(analyze.router)

@app.get("/health")
def health_check():
    return {"status": "OK", "service": "IntelliDoc AI Engine"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
