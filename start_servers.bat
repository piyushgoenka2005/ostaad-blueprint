@echo off
TITLE BuildBharat ERP - Decoupled Architecture Launcher
echo =====================================================================
echo  BuildBharat ERP - Decoupled Full-Stack Architecture
echo  Backend: FastAPI (Port 8000) ^| Frontend: Next.js Turbopack (Port 3000)
echo =====================================================================
echo.

echo [1/2] Starting Python FastAPI Backend on http://127.0.0.1:8000 ...
start "BuildBharat-Backend" cmd /k "cd /d %~dp0backend && python run_server.py"

echo [2/2] Starting Next.js Frontend on http://localhost:3000 ...
start "BuildBharat-Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both services launched in separate terminal windows.
echo API Swagger Docs: http://127.0.0.1:8000/docs
echo Web Application:  http://localhost:3000/login
echo =====================================================================
pause
