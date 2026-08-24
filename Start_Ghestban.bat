@echo off
setlocal
cd /d "%~dp0"
set "GH_PORT=8765"
start "Ghestban Local Server" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0local_server.ps1" -Port %GH_PORT%
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:%GH_PORT%/"
exit /b 0
