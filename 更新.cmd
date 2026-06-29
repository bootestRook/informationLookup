@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set "LOCAL_NODE=%~dp0.local\nodejs"
if exist "%LOCAL_NODE%\node.exe" set "PATH=%LOCAL_NODE%;%PATH%"

where git >nul 2>nul || (
  echo [ERROR] Git not found.
  pause
  exit /b 1
)

where npm >nul 2>nul || (
  echo [ERROR] npm not found. Run 启动.cmd once to install local Node.js.
  pause
  exit /b 1
)

set has_remote=
for /f "delims=" %%r in ('git remote') do set has_remote=1

:retry
if defined has_remote (
  echo Pulling latest code...
  git pull --ff-only || goto retry_wait
) else (
  echo No git remote configured. Skipping pull.
)

echo Installing dependencies...
call npm install || goto retry_wait

echo Done.
exit /b 0

:retry_wait
echo.
echo [ERROR] Update failed. Retrying in 5 seconds...
timeout /t 5 /nobreak >nul
goto retry
