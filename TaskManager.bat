@echo off
cd /d "%~dp0"
REM Task Manager - Quick Launcher

REM Kill any existing server on port 4173
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4173" ^| findstr "LISTENING"') do (
    echo Stopping existing server...
    taskkill /F /PID %%a >nul 2>&1
)

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo.
    echo Please install Node.js before running this script:
    echo   1. Visit: https://nodejs.org/
    echo   2. Download the LTS version for Windows
    echo   3. Run the installer
    echo   4. Restart this terminal and run TaskManager.bat again
    echo.
    echo After installing, verify with: node --version
    echo.
    pause
    exit /b 1
)

REM === CHECK FOR PENDING UPDATE ===
if exist ".update-pending.json" (
    echo Applying pending update...
    call :apply_update
    if %ERRORLEVEL% NEQ 0 (
        echo UPDATE FAILED! Starting with current version...
    )
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
exit /b 0

:apply_update
    echo Creating backup of current version...
    if exist ".backup" (
        rmdir /s /q ".backup"
    )
    mkdir ".backup"

    if exist "dist" (
        xcopy /E /I /Y "dist" ".backup\dist" >nul 2>&1
    )
    if exist "src" (
        xcopy /E /I /Y "src" ".backup\src" >nul 2>&1
    )
    if exist "server.js" (
        copy /Y "server.js" ".backup\" >nul 2>&1
    )
    if exist "package.json" (
        copy /Y "package.json" ".backup\" >nul 2>&1
    )
    if exist "config.json" (
        copy /Y "config.json" ".backup\" >nul 2>&1
    )

    echo Preserving local settings...
    if exist "config.json" (
        copy /Y "config.json" ".backup\config.json.local" >nul 2>&1
    )

    echo Extracting update files...
    REM Find the first (and should be only) zip file in .updates/
    for %%f in (.updates\*.zip) do (
        set "ZIPFILE=%%f"
        goto extract_found
    )
    :extract_found

    if not defined ZIPFILE (
        echo ERROR: No update ZIP file found!
        call :rollback
        exit /b 1
    )

    REM Use PowerShell to extract the ZIP
    powershell -Command "Expand-Archive -Path '%ZIPFILE%' -DestinationPath '.updates\extracted' -Force" >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to extract update!
        call :rollback
        exit /b 1
    )

    echo Applying update files...
    REM Copy extracted files to root (handles nested structure)
    for /d %%i in (.updates\extracted\*) do (
        xcopy /E /I /Y "%%i\*" "." >nul 2>&1
    )

    echo Installing dependencies...
    call npm install >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: npm install failed!
        call :rollback
        exit /b 1
    )

    echo Building application...
    call npm run build >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: npm run build failed!
        call :rollback
        exit /b 1
    )

    echo Restoring local settings...
    if exist ".backup\config.json.local" (
        copy /Y ".backup\config.json.local" "config.json" >nul 2>&1
    )

    echo Cleaning up update files...
    del /f /q ".update-pending.json" >nul 2>&1
    if exist ".updates" (
        rmdir /s /q ".updates" >nul 2>&1
    )
    if exist ".backup" (
        rmdir /s /q ".backup" >nul 2>&1
    )

    echo Update applied successfully!
    exit /b 0

:rollback
    echo ROLLING BACK to previous version...
    if exist ".backup\dist" (
        if exist "dist" (
            rmdir /s /q "dist"
        )
        xcopy /E /I /Y ".backup\dist" "dist" >nul 2>&1
    )
    if exist ".backup\src" (
        if exist "src" (
            rmdir /s /q "src"
        )
        xcopy /E /I /Y ".backup\src" "src" >nul 2>&1
    )
    if exist ".backup\server.js" (
        copy /Y ".backup\server.js" "server.js" >nul 2>&1
    )
    if exist ".backup\package.json" (
        copy /Y ".backup\package.json" "package.json" >nul 2>&1
    )
    if exist ".backup\config.json" (
        copy /Y ".backup\config.json" "config.json" >nul 2>&1
    )

    del /f /q ".update-pending.json" >nul 2>&1
    if exist ".backup" (
        rmdir /s /q ".backup" >nul 2>&1
    )
    if exist ".updates" (
        rmdir /s /q ".updates" >nul 2>&1
    )

    exit /b 1
