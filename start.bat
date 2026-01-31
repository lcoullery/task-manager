@echo off
cd /d "%~dp0"
echo Starting server at http://localhost:4173 ...
call npm run preview
pause
