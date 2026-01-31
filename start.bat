@echo off
REM Task Manager - Quick Launcher

REM Check if dist folder exists (production build)
if not exist "dist" (
    echo First time setup detected...
    echo Installing dependencies...
    call npm install
    echo.
    echo Building production version...
    call npm run build
    echo.
) else (
    echo Starting server...
)

REM Open browser
start http://localhost:4173

REM Start server
echo ========================================
echo   Server running at http://localhost:4173
echo ========================================
echo.
echo CLOSE THIS WINDOW to stop the server
echo.

node server.js
