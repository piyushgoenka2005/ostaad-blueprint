"""
BuildBharat ERP - Backend Service Entrypoint
Runs FastAPI on http://127.0.0.1:8000 with CORS and auto-reload.
"""
import sys
import os

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import uvicorn

def main():
    print("=" * 60)
    print("Starting BuildBharat ERP Backend Service")
    print("API Base URL: http://127.0.0.1:8000")
    print("Swagger Docs: http://127.0.0.1:8000/docs")
    print("CORS Allowed: http://localhost:3000, http://127.0.0.1:3000")
    print("=" * 60)
    uvicorn.run("ostaad_boq.app:app", host="127.0.0.1", port=8000, reload=True)

if __name__ == "__main__":
    main()
