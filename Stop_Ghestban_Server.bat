@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -Method POST -TimeoutSec 3 http://127.0.0.1:8765/__qestban/stop ^| Out-Null } catch {}"
exit /b 0
