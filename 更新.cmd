@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

where git >nul 2>nul || (
  echo [ERROR] Git not found.
  pause
  exit /b 1
)

where npm >nul 2>nul || (
  echo [ERROR] npm not found. Install Node.js LTS first: https://nodejs.org/
  pause
  exit /b 1
)

set has_remote=
for /f "delims=" %%r in ('git remote') do set has_remote=1

if defined has_remote (
  echo Pulling latest code...
  git pull --ff-only || goto fail
) else (
  echo No git remote configured. Skipping pull.
)

echo Installing dependencies...
call npm install || goto fail

echo Done.
pause
exit /b 0

:fail
echo.
echo [ERROR] Update failed.
pause
exit /b 1
