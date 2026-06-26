@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

where node >nul 2>nul || (
  echo [ERROR] Node.js not found. Install Node.js LTS first: https://nodejs.org/
  pause
  exit /b 1
)

where npm >nul 2>nul || (
  echo [ERROR] npm not found. Reinstall Node.js LTS first: https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing dependencies...
  call npm install || goto fail
)

powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5178/' -TimeoutSec 1; if ($r.StatusCode -ge 200) { exit 0 } } catch { exit 1 }"
if "%ERRORLEVEL%"=="0" (
  echo Server is already running.
  start "" "http://127.0.0.1:5178/"
  exit /b 0
)

echo Starting dev server...
start "InformationLookup" cmd /k "cd /d ""%~dp0"" && npm run dev -- --host 127.0.0.1 --port 5178 --strictPort"
powershell -NoProfile -Command "Start-Sleep -Seconds 3"
start "" "http://127.0.0.1:5178/"
exit /b 0

:fail
echo.
echo [ERROR] Startup failed.
pause
exit /b 1
