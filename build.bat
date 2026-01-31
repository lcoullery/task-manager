@echo off
cd /d "%~dp0"
echo Installing dependencies...
call npm install
echo.
echo Building the app...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)
echo.
echo Starting server at http://localhost:4173 ...
call npm run preview
pause
