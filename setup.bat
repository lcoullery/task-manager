@echo off
cd /d "%~dp0"
REM Task Manager - Setup/Update Script
REM Run this when you pull new code or want to rebuild

echo ========================================
echo   Task Manager - Setup
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo.
    echo Please install Node.js before running this script:
    echo   1. Visit: https://nodejs.org/
    echo   2. Download the LTS version for Windows
    echo   3. Run the installer
    echo   4. Restart this terminal and run setup.bat again
    echo.
    echo After installing, verify with: node --version
    echo.
    pause
    exit /b 1
)

echo Node.js detected:
node --version
echo.

echo Installing dependencies...
call npm install

echo.
echo Building production version...
call npm run build

echo.
echo ========================================
echo   Setup complete!
echo   Run TaskManager.bat to launch the app
echo ========================================
echo.
pause
