@echo off
setlocal

cd /d "%~dp0frontend"

echo ========================================
echo Genetic Risk Prediction - Frontend
echo ========================================
echo.

if not exist "package.json" (
    echo ERROR: frontend package.json not found.
    pause
    exit /b 1
)

echo Installing frontend dependencies...
call npm install

if errorlevel 1 (
    echo.
    echo ERROR: npm install failed.
    pause
    exit /b 1
)

echo.
echo Starting frontend...
echo.

call npm run dev

pause