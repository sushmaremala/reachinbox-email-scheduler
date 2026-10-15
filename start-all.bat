@echo off
TITLE ReachInbox Distributed Email Scheduler Launcher
echo ========================================================
echo   REACHINBOX OUTREACH ENGINE & EMAIL SCHEDULER
echo ========================================================
echo.

REM 1. Start Redis Server
echo [1/3] Starting Redis server...
start "Redis Server" cmd /k "redis-server || ""%LOCALAPPDATA%\Microsoft\WinGet\Packages\taizod1024.redis-windows-fork_Microsoft.Winget.Source_8wekyb3d8bbwe\Redis-8.10.2-Windows-x64-msys2\redis-server.exe"""
timeout /t 2 >nul

REM 2. Start Backend & BullMQ Worker
echo [2/3] Starting Backend API Server & BullMQ Worker...
start "Backend API & Worker" cmd /k "cd backend && npm run dev"
timeout /t 3 >nul

REM 3. Start Frontend Dashboard
echo [3/3] Starting Frontend React UI...
start "Frontend Dashboard" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo   SERVICES LAUNCHED!
echo   - Backend API:       http://localhost:5000
echo   - Frontend UI:       http://localhost:3000
echo   - Ethereal Web Mail: https://ethereal.email/messages
echo ========================================================
echo.
timeout /t 2 >nul
start http://localhost:3000
pause
