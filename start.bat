@echo off
REM Task Manager - Quick Launcher

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo.
    echo Please install Node.js before running this script:
    echo   1. Visit: https://nodejs.org/
    echo   2. Download the LTS version for Windows
    echo   3. Run the installer
    echo   4. Restart this terminal and run start.bat again
    echo.
    echo After installing, verify with: node --version
    echo.
    pause
    exit /b 1
)

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
