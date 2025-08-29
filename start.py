#!/usr/bin/env python3
"""
Simple startup script for Railway deployment
"""
import os
import uvicorn
from app.main import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    
    print(f"Starting server on {host}:{port}")
    print(f"Environment variables: PORT={os.environ.get('PORT')}, CFBD_API_KEY={'SET' if os.environ.get('CFBD_API_KEY') else 'NOT SET'}")
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=False,
        log_level="info"
    )
