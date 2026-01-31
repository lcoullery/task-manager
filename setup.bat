@echo off
REM Task Manager - Setup/Update Script
REM Run this when you pull new code or want to rebuild

echo ========================================
echo   Task Manager - Setup
echo ========================================
echo.
echo Installing dependencies...
call npm install

echo.
echo Building production version...
call npm run build

echo.
echo ========================================
echo   Setup complete!
echo   Run start.bat to launch the app
echo ========================================
echo.
pause
